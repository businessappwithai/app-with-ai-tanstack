#!/usr/bin/env bun
/**
 * EML Language Checker
 * ====================
 * Comprehensive validator for ERDwithAI Modeling Language (.mmd) files.
 * Checks every document against erdwithai-language.json and the EML spec.
 *
 * Usage:
 *   bun language/checker.ts <file.mmd> [options]
 *
 * Options:
 *   --strict          Treat warnings as errors (exit 1)
 *   --json            Machine-readable JSON output
 *   --no-color        Disable ANSI colour
 *   --no-hint         Suppress inline hints
 *   --summary         Print summary line only (no per-diagnostic detail)
 *   -h, --help        Show this help
 *
 * Exit codes:
 *   0  clean (no errors; warnings allowed unless --strict)
 *   1  one or more errors (or warnings in --strict mode)
 *   2  bad invocation / file not found
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadLanguageDefinition, stepNodeTypes } from "./index.ts";
import type { EmlAttribute, EmlEntity, EmlModel, EmlRule, EmlWorkflow } from "./cli/src/model.ts";
import { parseEml } from "./cli/src/parser.ts";

// ---------------------------------------------------------------------------
// Diagnostic types
// ---------------------------------------------------------------------------

type Severity = "error" | "warning" | "info";

interface Issue {
  severity: Severity;
  code: string;
  message: string;
  /** Source line number (1-based) when known. */
  line?: number;
  /** Short actionable fix suggestion. */
  hint?: string;
  /** Extra context line to show below the message. */
  context?: string;
}

interface CheckResult {
  issues: Issue[];
  errors: number;
  warnings: number;
  infos: number;
  ok: boolean; // no errors
}

// ---------------------------------------------------------------------------
// ANSI colour helpers
// ---------------------------------------------------------------------------

const useColor = !process.env.NO_COLOR && process.stdout.isTTY && !hasFlag("--no-color");

const c = {
  reset: (s: string) => (useColor ? `\x1b[0m${s}\x1b[0m` : s),
  dim: (s: string) => (useColor ? `\x1b[2m${s}\x1b[0m` : s),
  bold: (s: string) => (useColor ? `\x1b[1m${s}\x1b[0m` : s),
  red: (s: string) => (useColor ? `\x1b[31m${s}\x1b[0m` : s),
  yellow: (s: string) => (useColor ? `\x1b[33m${s}\x1b[0m` : s),
  green: (s: string) => (useColor ? `\x1b[32m${s}\x1b[0m` : s),
  cyan: (s: string) => (useColor ? `\x1b[36m${s}\x1b[0m` : s),
  magenta: (s: string) => (useColor ? `\x1b[35m${s}\x1b[0m` : s),
  blue: (s: string) => (useColor ? `\x1b[34m${s}\x1b[0m` : s),
};

function sevColor(s: Severity): (str: string) => string {
  return s === "error" ? c.red : s === "warning" ? c.yellow : c.cyan;
}

function sevLabel(s: Severity): string {
  return s === "error" ? "error" : s === "warning" ? "warn " : "info ";
}

// ---------------------------------------------------------------------------
// Argument helpers
// ---------------------------------------------------------------------------

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function flagValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// ---------------------------------------------------------------------------
// Source line tracking (for accurate line numbers in checks that re-parse raw)
// ---------------------------------------------------------------------------

class SourceIndex {
  private lines: string[];

  constructor(source: string) {
    this.lines = source.split("\n");
  }

  /** Find the 1-based line number of the first occurrence of a pattern. */
  findLine(pattern: string | RegExp, startLine = 1): number | undefined {
    for (let i = startLine - 1; i < this.lines.length; i++) {
      const line = this.lines[i]!;
      if (typeof pattern === "string" ? line.includes(pattern) : pattern.test(line)) {
        return i + 1;
      }
    }
    return undefined;
  }

  /** Return the text of a line (1-based). */
  getLine(n: number): string {
    return this.lines[n - 1] ?? "";
  }

  /** Lines containing a token, returning {lineNo, text} pairs. */
  findAll(pattern: string | RegExp): Array<{ lineNo: number; text: string }> {
    const results: Array<{ lineNo: number; text: string }> = [];
    for (let i = 0; i < this.lines.length; i++) {
      const text = this.lines[i]!;
      if (typeof pattern === "string" ? text.includes(pattern) : pattern.test(text)) {
        results.push({ lineNo: i + 1, text });
      }
    }
    return results;
  }
}

// ---------------------------------------------------------------------------
// Foreign key naming
// ---------------------------------------------------------------------------

/**
 * FK column names that carry no suffix but still name a person by role.
 * Mirrors `foreignKeys.personRoleColumns.names` in erdwithai-language.json.
 */
const PERSON_ROLE_COLUMN_NAMES = new Set([
  "assigned_to",
  "author_id",
  "lab_manager_id",
  "manager_id",
  "owner_id",
  "pi_id",
  "remediation_owner",
  "remediation_owner_id",
  "user_id",
]);

/**
 * Whether an FK column names a person by the role they played rather than by
 * entity — `reported_by_id`, `pi_id`, `assigned_to`. These resolve to the user
 * entity, not to a table derived from the column name: there is no
 * `bus_reported_by`.
 */
export function isPersonRoleColumn(columnName: string): boolean {
  return (
    columnName.endsWith("_by") ||
    columnName.endsWith("_by_id") ||
    PERSON_ROLE_COLUMN_NAMES.has(columnName)
  );
}

// ---------------------------------------------------------------------------
// Check engine
// ---------------------------------------------------------------------------

class CheckEngine {
  private issues: Issue[] = [];
  private src: SourceIndex;
  private def = loadLanguageDefinition();
  private validHookTypes: Set<string>;
  private validCardinalities: Set<string>;
  private validModifiers = new Set(["PK", "FK", "UK", "UNIQUE", "OPTIONAL", "NULL"]);
  private validEntityKeys = new Set(["audited", "softDelete", "prefix", "label", "icon"]);
  private validFieldKeys = new Set(["enum", "ui", "default", "min", "max", "help", "format"]);
  private validMetaKeys = new Set(["name", "kind", "version", "entity", "stack"]);
  private validWorkflowKinds = new Set(["hook", "state", "saga"]);
  private validTriggerSources = /^(cron:|webhook:|message:)/;
  // role:name1|name2 or role:name1|role:name2 are both valid per spec
  private validRoleExpr = /^role:[A-Za-z][A-Za-z0-9_]*(\|(?:role:)?[A-Za-z][A-Za-z0-9_]*)*$/;
  private identRe = /^[A-Za-z][A-Za-z0-9_]*$/;
  private slugRe = /^[a-z][a-z0-9_]*$/;

  constructor(
    private model: EmlModel,
    source: string
  ) {
    this.src = new SourceIndex(source);
    this.validHookTypes = new Set(this.def.hooks.types.map((h) => h.type));
    this.validCardinalities = new Set(this.def.cardinalities.map.map((c) => c.operator));
  }

  private add(issue: Issue): void {
    this.issues.push(issue);
  }

  private error(
    code: string,
    message: string,
    opts: Partial<Omit<Issue, "severity" | "code" | "message">> = {}
  ): void {
    this.add({ severity: "error", code, message, ...opts });
  }

  private warn(
    code: string,
    message: string,
    opts: Partial<Omit<Issue, "severity" | "code" | "message">> = {}
  ): void {
    this.add({ severity: "warning", code, message, ...opts });
  }

  private info(
    code: string,
    message: string,
    opts: Partial<Omit<Issue, "severity" | "code" | "message">> = {}
  ): void {
    this.add({ severity: "info", code, message, ...opts });
  }

  // -------------------------------------------------------------------------
  // Run all checks
  // -------------------------------------------------------------------------

  run(): CheckResult {
    // Surface parse-time diagnostics from the parser
    for (const d of this.model.diagnostics) {
      this.add({
        severity: d.severity === "info" ? "info" : d.severity,
        code: d.code,
        message: d.message,
        line: d.line,
      });
    }

    this.checkDocument();
    this.checkEntities();
    this.checkRelationships();
    this.checkEnums();
    this.checkFieldDirectives();
    this.checkIndexDirectives();
    this.checkEntityDirectives();
    this.checkHooks();
    this.checkGuards();
    this.checkTriggers();
    this.checkWorkflowDirectives();
    this.checkStepDirectives();
    this.checkActionDirectives();
    this.checkRuleDirectives();
    this.checkRules();
    this.checkWorkflows();
    this.checkCrossDocument();

    const errors = this.issues.filter((i) => i.severity === "error").length;
    const warnings = this.issues.filter((i) => i.severity === "warning").length;
    const infos = this.issues.filter((i) => i.severity === "info").length;
    return { issues: this.issues, errors, warnings, infos, ok: errors === 0 };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /** Convert an entity name (PascalCase) to the expected FK column name. */
  private entityToFkName(entityName: string): string {
    const snake = entityName
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
      .toLowerCase()
      .replace(/^bus_/, "");
    return `${snake}_id`;
  }

  /** Convert a FK column name back to the candidate parent entity name. */
  private fkToEntityName(fkAttr: string): string {
    // A person-role column names the role, not a table: reported_by_id points at
    // a user, not at a "ReportedBy" entity. See foreignKeys.personRoleColumns in
    // erdwithai-language.json.
    if (isPersonRoleColumn(fkAttr)) return "User";
    const base = fkAttr.slice(0, -3); // strip _id
    // Convert snake_case to PascalCase
    return base.replace(/(^|_)([a-z])/g, (_, _sep, ch) => ch.toUpperCase());
  }

  // -------------------------------------------------------------------------
  // EML001-EML009: Document-level checks
  // -------------------------------------------------------------------------

  private checkDocument(): void {
    const { meta } = this.model;

    if (!meta.name) {
      this.warn("EML001", "Missing document name.", {
        hint: "Add  %%meta name: <YourModelName>  before the first section.",
      });
    }

    if (meta.kind && !["erd", "rules", "workflow"].includes(meta.kind)) {
      this.warn("EML002", `Unknown %%meta kind: "${meta.kind}".`, {
        hint: "Valid values: erd, rules, workflow",
        line: this.src.findLine(`%%meta kind: ${meta.kind}`),
      });
    }

    if (meta.stack && !["tanstack-start-nestjs", "openui5-odatav4"].includes(meta.stack)) {
      this.warn("EML003", `Unknown %%meta stack: "${meta.stack}".`, {
        hint: "Valid values: tanstack-start-nestjs, openui5-odatav4",
        line: this.src.findLine(`%%meta stack:`),
      });
    }

    if (
      this.model.entities.length === 0 &&
      this.model.rules.length === 0 &&
      this.model.workflows.length === 0
    ) {
      this.error("EML004", "Empty document: no entities, rules, or workflows found.", {
        hint: "Add an erDiagram section with at least one entity block.",
      });
    }
  }

  // -------------------------------------------------------------------------
  // EML100-EML119: Entity checks
  // -------------------------------------------------------------------------

  private checkEntities(): void {
    const seenNames = new Map<string, number>(); // name → first occurrence line

    for (const entity of this.model.entities) {
      const entityLine = this.src.findLine(new RegExp(`^\\s*${entity.name}\\s*\\{`));

      // EML100: Entity name must be a valid identifier
      if (!this.identRe.test(entity.name)) {
        this.error(
          "EML100",
          `Invalid entity name "${entity.name}": must match ^[A-Za-z][A-Za-z0-9_]*$.`,
          {
            line: entityLine,
            hint: "Use PascalCase for entity names (e.g. CustomerOrder).",
          }
        );
      }

      // EML101: Unique entity names
      const prev = seenNames.get(entity.name);
      if (prev !== undefined) {
        this.error("EML101", `Duplicate entity declaration "${entity.name}".`, {
          line: entityLine,
          hint: `First declared on line ${prev}. Merge both blocks into one.`,
        });
      } else {
        seenNames.set(entity.name, entityLine ?? 0);
      }

      // EML102: At least one attribute
      if (entity.attributes.length === 0) {
        this.warn("EML102", `Entity "${entity.name}" has no attributes.`, {
          line: entityLine,
          hint: "The generator will auto-add  string id PK  if no id is present.",
        });
      }

      this.checkAttributes(entity, entityLine);
    }
  }

  private checkAttributes(entity: EmlEntity, entityLine?: number): void {
    const seenAttrNames = new Map<string, number>();
    let pkCount = 0;

    for (const attr of entity.attributes) {
      const attrLine = this.src.findLine(new RegExp(`\\b${attr.name}\\b`), entityLine);

      // EML110: Attribute name format
      if (!this.identRe.test(attr.name)) {
        this.error(
          "EML110",
          `Invalid attribute name "${entity.name}.${attr.name}": must match ^[A-Za-z][A-Za-z0-9_]*$.`,
          {
            line: attrLine,
            hint: "Use snake_case for attribute names (e.g. first_name, order_id).",
          }
        );
      }

      // EML111: Attribute name style recommendation
      if (
        this.identRe.test(attr.name) &&
        !this.slugRe.test(attr.name) &&
        attr.name !== attr.name.toUpperCase()
      ) {
        this.info("EML111", `Attribute "${entity.name}.${attr.name}" is not snake_case.`, {
          line: attrLine,
          hint: "snake_case is recommended for attribute names per the EML spec.",
        });
      }

      // EML112: Duplicate attribute names
      if (seenAttrNames.has(attr.name)) {
        this.warn("EML112", `Duplicate attribute "${entity.name}.${attr.name}".`, {
          line: attrLine,
          hint: `First occurrence on line ${seenAttrNames.get(attr.name)}. Remove the duplicate.`,
        });
      } else {
        seenAttrNames.set(attr.name, attrLine ?? 0);
      }

      // EML113: Multiple primary keys
      if (attr.isPrimaryKey) {
        pkCount++;
        if (pkCount > 1) {
          this.error(
            "EML113",
            `Entity "${entity.name}" declares more than one PK (found "${attr.name}").`,
            {
              line: attrLine,
              hint: "Each entity may have exactly one primary key. Remove the extra PK modifier.",
            }
          );
        }
      }

      // EML114: FK naming convention. The generator derives an FK's target from
      // the column name alone, so a name that does not end in _id resolves to
      // nothing and the column degrades to a plain string — the raw UUID renders
      // in grids and forms with no lookup.
      if (attr.isForeignKey && !attr.name.endsWith("_id")) {
        const isPersonRole = attr.name.endsWith("_by");
        this.warn("EML114", `Foreign key "${entity.name}.${attr.name}" does not end with "_id".`, {
          line: attrLine,
          hint: isPersonRole
            ? `Rename to "${attr.name}_id" — a _by column names a person by role, so it resolves to the user entity. Run  bun language/fixer.ts  to apply this automatically.`
            : `Convention: rename to "${attr.name}_id" so the generator can derive the referenced table. Run  bun language/fixer.ts  to apply this automatically.`,
        });
      }

      // EML115: Unknown raw type (falls back to string)
      const def = this.def;
      const rawBase = attr.rawType?.replace(/\(\d+\)/, "").toLowerCase();
      if (rawBase && rawBase !== "string" && !(rawBase in def.types.map)) {
        this.warn(
          "EML115",
          `Unknown type "${attr.rawType}" on "${entity.name}.${attr.name}"; mapped to "string".`,
          {
            line: attrLine,
            hint: `Valid types: ${def.types.canonical.join(", ")} (plus aliases listed in erdwithai-language.json).`,
          }
        );
      }

      // EML116: PK should not be OPTIONAL (check raw source — parser sets required:false for all PKs by design)
      if (attr.isPrimaryKey && attrLine) {
        const rawLine = this.src.getLine(attrLine).toUpperCase();
        if (
          rawLine.includes("OPTIONAL") ||
          rawLine.includes(" NULL ") ||
          rawLine.endsWith(" NULL")
        ) {
          this.error("EML116", `Primary key "${entity.name}.${attr.name}" is marked OPTIONAL.`, {
            line: attrLine,
            hint: "Remove OPTIONAL from the PK attribute — primary keys are always required.",
          });
        }
      }
    }

    // EML117: No primary key
    if (pkCount === 0 && entity.attributes.length > 0) {
      this.warn("EML117", `Entity "${entity.name}" has no primary key (PK modifier).`, {
        line: entityLine,
        hint: "Add  string id PK  as the first attribute or mark one existing attribute with PK.",
      });
    }
  }

  // -------------------------------------------------------------------------
  // EML120-EML129: Relationship checks
  // -------------------------------------------------------------------------

  private checkRelationships(): void {
    const entityNames = new Set(this.model.entities.map((e) => e.name));
    const seenRels = new Map<string, number>(); // "A|op|B" → lineNo

    for (const rel of this.model.relationships) {
      const relLine = this.src.findLine(new RegExp(`\\b${rel.source}\\b.+\\b${rel.target}\\b`));

      // EML120: Source entity must exist
      if (!entityNames.has(rel.source)) {
        this.error("EML120", `Relationship references undeclared entity "${rel.source}".`, {
          line: relLine,
          hint: `Add an entity block for "${rel.source}" in the erDiagram section.`,
        });
      }

      // EML121: Target entity must exist
      if (!entityNames.has(rel.target)) {
        this.error("EML121", `Relationship references undeclared entity "${rel.target}".`, {
          line: relLine,
          hint: `Add an entity block for "${rel.target}" in the erDiagram section.`,
        });
      }

      // EML122: Cardinality operator is valid
      if (rel.operator && !this.validCardinalities.has(rel.operator)) {
        this.error(
          "EML122",
          `Unknown cardinality operator "${rel.operator}" between "${rel.source}" and "${rel.target}".`,
          {
            line: relLine,
            hint: `Valid operators: ${[...this.validCardinalities].join("  ")}.`,
          }
        );
      }

      // EML123: Self-referential relationship (info only)
      if (rel.source === rel.target) {
        this.info("EML123", `Self-referential relationship on "${rel.source}".`, {
          line: relLine,
          hint: "Self-references are valid (e.g. Category ||--o{ Category). Ensure parent_id is modelled.",
        });
      }

      // EML124: Duplicate relationship
      const key = `${rel.source}|${rel.operator}|${rel.target}`;
      if (seenRels.has(key)) {
        this.warn(
          "EML124",
          `Duplicate relationship: "${rel.source}" ${rel.operator} "${rel.target}".`,
          {
            line: relLine,
            hint: `First declared on line ${seenRels.get(key)}. Remove the duplicate.`,
          }
        );
      } else {
        seenRels.set(key, relLine ?? 0);
      }

      // EML125: FK attribute exists in many-side entity (FK is named after the ONE-side entity)
      if (
        (rel.cardinality === "manyToOne" || rel.cardinality === "oneToMany") &&
        entityNames.has(rel.source) &&
        entityNames.has(rel.target)
      ) {
        const manySideName = rel.cardinality === "manyToOne" ? rel.source : rel.target;
        const oneSideName = rel.cardinality === "manyToOne" ? rel.target : rel.source;
        const manySide = this.model.entities.find((e) => e.name === manySideName);
        if (manySide && manySide.attributes.length > 0) {
          const expectedFk = this.entityToFkName(oneSideName);
          const fkExists = manySide.attributes.some((a) => a.isForeignKey || a.name === expectedFk);
          if (!fkExists) {
            this.info(
              "EML125",
              `No FK attribute found in "${manySideName}" for relationship to "${oneSideName}".`,
              {
                line: relLine,
                hint: `Add  string ${expectedFk} FK  to "${manySideName}".`,
              }
            );
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // EML130-EML139: Enum checks
  // -------------------------------------------------------------------------

  private checkEnums(): void {
    const seenEnumNames = new Map<string, number>();

    for (const em of this.model.enums) {
      const enumLine = this.src.findLine(new RegExp(`%%enum\\s+${em.name}\\s*:`));

      // EML130: Enum name format
      if (!this.identRe.test(em.name)) {
        this.error(
          "EML130",
          `Invalid enum name "${em.name}": must match ^[A-Za-z][A-Za-z0-9_]*$.`,
          {
            line: enumLine,
            hint: "Use PascalCase for enum names (e.g. OrderStatus).",
          }
        );
      }

      // EML131: Duplicate enum name
      if (seenEnumNames.has(em.name)) {
        this.warn("EML131", `Duplicate enum declaration "%%enum ${em.name}".`, {
          line: enumLine,
          hint: `First declared on line ${seenEnumNames.get(em.name)}. Merge values into one %%enum directive.`,
        });
      } else {
        seenEnumNames.set(em.name, enumLine ?? 0);
      }

      // EML132: Enum must have at least one value
      if (em.values.length === 0) {
        this.error("EML132", `Enum "${em.name}" has no values.`, {
          line: enumLine,
          hint: `Syntax: %%enum ${em.name}: value1, value2, value3`,
        });
      }

      // EML133: Duplicate enum values
      const seenValues = new Set<string>();
      for (const v of em.values) {
        if (seenValues.has(v)) {
          this.warn("EML133", `Duplicate value "${v}" in enum "${em.name}".`, {
            line: enumLine,
            hint: "Remove the duplicate value.",
          });
        }
        seenValues.add(v);
      }

      // EML134: Enum values should be slug-like (warn)
      for (const v of em.values) {
        if (!/^[A-Za-z0-9_-]+$/.test(v)) {
          this.warn("EML134", `Enum "${em.name}" value "${v}" contains special characters.`, {
            line: enumLine,
            hint: "Use alphanumeric, underscore, or hyphen values for safe serialization.",
          });
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // EML140-EML149: %%field directive checks
  // -------------------------------------------------------------------------

  private checkFieldDirectives(): void {
    const entityNames = new Set(this.model.entities.map((e) => e.name));
    const enumNames = new Set(this.model.enums.map((e) => e.name));
    const entityAttrMap = new Map<string, Set<string>>();
    for (const e of this.model.entities) {
      entityAttrMap.set(e.name, new Set(e.attributes.map((a) => a.name)));
    }

    // Re-scan source for %%field directives (model doesn't expose them directly)
    const fieldLines = this.src.findAll(/^%%field\b/);
    for (const { lineNo, text } of fieldLines) {
      const m = text.trim().match(/^%%field\s+(\w+)\.(\w+)\s+([A-Za-z_]\w*)\s*:\s*(.+)$/);
      if (!m) {
        this.error("EML140", `Invalid %%field syntax: "${text.trim()}"`, {
          line: lineNo,
          hint: "Syntax: %%field <Entity>.<attr> <key>: <value>",
          context: text.trim(),
        });
        continue;
      }
      const [, entityName, attrName, key, value] = m;

      // EML141: Entity must be declared
      if (!entityNames.has(entityName)) {
        this.error("EML141", `%%field references undeclared entity "${entityName}".`, {
          line: lineNo,
          hint: `Declare "${entityName}" in the erDiagram section first.`,
        });
        continue;
      }

      // EML142: Attribute must exist on entity
      const attrs = entityAttrMap.get(entityName);
      if (attrs && !attrs.has(attrName)) {
        this.error(
          "EML142",
          `%%field references undeclared attribute "${entityName}.${attrName}".`,
          {
            line: lineNo,
            hint: `Add "${attrName}" to the "${entityName}" entity block, or check for a typo.`,
          }
        );
      }

      // EML143: Key must be a known %%field key
      if (!this.validFieldKeys.has(key)) {
        this.warn("EML143", `Unknown %%field key "${key}" on "${entityName}.${attrName}".`, {
          line: lineNo,
          hint: `Known keys: ${[...this.validFieldKeys].join(", ")}.`,
        });
      }

      // EML144: enum: value must reference a declared %%enum
      if (key === "enum" && !enumNames.has(value.trim())) {
        this.error(
          "EML144",
          `%%field "${entityName}.${attrName}" references undeclared enum "${value.trim()}".`,
          {
            line: lineNo,
            hint: `Add  %%enum ${value.trim()}: value1, value2  before the erDiagram block.`,
          }
        );
      }

      // EML145: min/max values should be numeric
      if ((key === "min" || key === "max") && Number.isNaN(Number(value.trim()))) {
        this.warn(
          "EML145",
          `%%field "${entityName}.${attrName}" has non-numeric ${key}: "${value.trim()}".`,
          {
            line: lineNo,
            hint: `${key}: should be a number, e.g.  ${key}: 0`,
          }
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // EML150-EML159: %%index directive checks
  // -------------------------------------------------------------------------

  private checkIndexDirectives(): void {
    const entityNames = new Set(this.model.entities.map((e) => e.name));
    const entityAttrMap = new Map<string, Set<string>>();
    for (const e of this.model.entities) {
      entityAttrMap.set(e.name, new Set(e.attributes.map((a) => a.name)));
    }

    for (const idx of this.model.indexes) {
      const idxLine = this.src.findLine(new RegExp(`%%index\\s+${idx.entity}\\s*\\(`));

      // EML150: Entity must be declared
      if (!entityNames.has(idx.entity)) {
        this.error("EML150", `%%index references undeclared entity "${idx.entity}".`, {
          line: idxLine,
          hint: `Declare "${idx.entity}" in the erDiagram section.`,
        });
        continue;
      }

      // EML151: Columns must exist on entity
      const attrs = entityAttrMap.get(idx.entity);
      for (const col of idx.columns) {
        if (attrs && !attrs.has(col)) {
          this.error(
            "EML151",
            `%%index on "${idx.entity}" references undeclared column "${col}".`,
            {
              line: idxLine,
              hint: `Add "${col}" to the "${idx.entity}" entity, or check for a typo.`,
            }
          );
        }
      }

      // EML152: Index on no columns
      if (idx.columns.length === 0) {
        this.error("EML152", `%%index on "${idx.entity}" has no columns.`, {
          line: idxLine,
          hint: "Syntax: %%index Entity(col1, col2) [unique]",
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // EML160-EML169: %%entity directive checks
  // -------------------------------------------------------------------------

  private checkEntityDirectives(): void {
    const entityNames = new Set(this.model.entities.map((e) => e.name));
    const entityLines = this.src.findAll(/^%%entity\b/);

    for (const { lineNo, text } of entityLines) {
      const m = text.trim().match(/^%%entity\s+(\w+)\s+([A-Za-z_]\w*)\s*:\s*(.+)$/);
      if (!m) {
        this.error("EML160", `Invalid %%entity syntax: "${text.trim()}"`, {
          line: lineNo,
          hint: "Syntax: %%entity <EntityName> <key>: <value>",
        });
        continue;
      }
      const [, entityName, key] = m;

      // EML161: Entity must be declared
      if (!entityNames.has(entityName)) {
        this.warn("EML161", `%%entity references undeclared entity "${entityName}".`, {
          line: lineNo,
          hint: `Declare "${entityName}" in the erDiagram section, or check the spelling.`,
        });
      }

      // EML162: Key must be a known %%entity key
      if (!this.validEntityKeys.has(key)) {
        this.warn("EML162", `Unknown %%entity key "${key}" on "${entityName}".`, {
          line: lineNo,
          hint: `Known keys: ${[...this.validEntityKeys].join(", ")}.`,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // EML200-EML219: %%hook directive checks
  // -------------------------------------------------------------------------

  private checkHooks(): void {
    const entityNames = new Set(this.model.entities.map((e) => e.name));
    const entityAttrMap = new Map<string, Set<string>>();
    for (const e of this.model.entities) {
      entityAttrMap.set(e.name, new Set(e.attributes.map((a) => a.name)));
    }
    const seenHooks = new Map<string, number>(); // "entity|type|handler" → line

    for (const hook of this.model.hooks) {
      const hookLine = this.src.findLine(
        new RegExp(`%%hook\\s+${hook.type}\\s+${hook.handler}\\s+on\\s+${hook.entity}`)
      );

      // EML200: Hook type must be valid
      if (!this.validHookTypes.has(hook.type)) {
        this.error("EML200", `Unknown hook type "${hook.type}" in %%hook.`, {
          line: hookLine,
          hint: `Valid hook types: ${[...this.validHookTypes].join(", ")}.`,
        });
      }

      // EML201: Handler name must be a valid identifier
      if (!this.identRe.test(hook.handler)) {
        this.error("EML201", `Invalid hook handler name "${hook.handler}".`, {
          line: hookLine,
          hint: "Handler names must match ^[A-Za-z_][A-Za-z0-9_]*$ (camelCase recommended).",
        });
      }

      // EML202: Entity must be declared
      if (!entityNames.has(hook.entity)) {
        this.warn(
          "EML202",
          `%%hook "${hook.handler}" references undeclared entity "${hook.entity}".`,
          {
            line: hookLine,
            hint: `Declare "${hook.entity}" in the erDiagram section.`,
          }
        );
      }

      // EML203: Field params must reference declared attributes
      if (hook.fields.length > 0 && entityNames.has(hook.entity)) {
        const attrs = entityAttrMap.get(hook.entity);
        for (const field of hook.fields) {
          if (attrs && !attrs.has(field)) {
            this.warn(
              "EML203",
              `%%hook "${hook.handler}" references undeclared field "${hook.entity}.${field}".`,
              {
                line: hookLine,
                hint: `Add "${field}" to "${hook.entity}", or check for a typo.`,
              }
            );
          }
        }
      }

      // EML204: Duplicate hooks (same entity + type + handler)
      const hookKey = `${hook.entity}|${hook.type}|${hook.handler}`;
      if (seenHooks.has(hookKey)) {
        this.warn("EML204", `Duplicate hook: "${hook.type} ${hook.handler} on ${hook.entity}".`, {
          line: hookLine,
          hint: `Already declared on line ${seenHooks.get(hookKey)}. Remove the duplicate.`,
        });
      } else {
        seenHooks.set(hookKey, hookLine ?? 0);
      }
    }
  }

  // -------------------------------------------------------------------------
  // EML220-EML229: %%guard directive checks
  // -------------------------------------------------------------------------

  private checkGuards(): void {
    const entityNames = new Set(this.model.entities.map((e) => e.name));

    for (const guard of this.model.guards) {
      const guardLine = this.src.findLine(
        new RegExp(`%%guard.+on\\s+${guard.entity}\\.${guard.op}`)
      );

      // EML220: Role expression syntax
      const guardText = guardLine ? this.src.getLine(guardLine).trim() : "";
      const roleExprMatch = guardText.match(/^%%guard\s+(\S+)\s+on/);
      if (roleExprMatch && !this.validRoleExpr.test(roleExprMatch[1])) {
        this.warn("EML220", `%%guard role expression "${roleExprMatch[1]}" may be malformed.`, {
          line: guardLine,
          hint: "Format: role:<name> or role:<name>|role:<name>  (e.g. role:admin|role:manager)",
        });
      }

      // EML221: Entity must be declared
      if (!entityNames.has(guard.entity)) {
        this.warn("EML221", `%%guard references undeclared entity "${guard.entity}".`, {
          line: guardLine,
          hint: `Declare "${guard.entity}" in the erDiagram section.`,
        });
      }

      // EML222: No roles declared
      if (guard.roles.length === 0) {
        this.warn("EML222", `%%guard on "${guard.entity}.${guard.op}" has no roles.`, {
          line: guardLine,
          hint: "Add at least one role, e.g. %%guard role:admin on Entity.op",
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // EML230-EML239: %%trigger directive checks
  // -------------------------------------------------------------------------

  private checkTriggers(): void {
    const entityNames = new Set(this.model.entities.map((e) => e.name));

    for (const trigger of this.model.triggers) {
      const triggerLine = this.src.findLine(new RegExp(`%%trigger.+on\\s+${trigger.entity}`));

      // EML230: Source format
      if (!this.validTriggerSources.test(trigger.source)) {
        this.error("EML230", `%%trigger source "${trigger.source}" is not a valid format.`, {
          line: triggerLine,
          hint: "Valid formats: cron:<expr>  webhook:<name>  message:<topic>",
        });
      }

      // EML231: Cron expression should have 5 or 6 fields
      if (trigger.source.startsWith("cron:")) {
        const expr = trigger.source.slice(5).trim();
        const parts = expr.split(/\s+/);
        if (parts.length < 5 || parts.length > 6) {
          this.warn(
            "EML231",
            `%%trigger cron expression "${expr}" has ${parts.length} field(s); expected 5 or 6.`,
            {
              line: triggerLine,
              hint: "Standard cron: minute hour day-of-month month day-of-week  (e.g. 0 9 * * *)",
            }
          );
        }
      }

      // EML232: Entity must be declared
      if (!entityNames.has(trigger.entity)) {
        this.warn("EML232", `%%trigger references undeclared entity "${trigger.entity}".`, {
          line: triggerLine,
          hint: `Declare "${trigger.entity}" in the erDiagram section.`,
        });
      }

      // EML233: Handler name validity
      if (!this.identRe.test(trigger.handler)) {
        this.error("EML233", `%%trigger handler "${trigger.handler}" is not a valid identifier.`, {
          line: triggerLine,
          hint: "Handler names must match ^[A-Za-z][A-Za-z0-9_]*$ (camelCase recommended).",
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // EML240-EML249: %%workflow directive checks
  // -------------------------------------------------------------------------

  private checkWorkflowDirectives(): void {
    const entityNames = new Set(this.model.entities.map((e) => e.name));
    const workflowLines = this.src.findAll(/^%%workflow\b/);

    for (const { lineNo, text } of workflowLines) {
      const m = text.trim().match(/^%%workflow\s+(\w+)\s+entity:\s*(\w+)\s+kind:\s*(\w+)/);
      if (!m) {
        this.error("EML240", `Invalid %%workflow syntax: "${text.trim()}"`, {
          line: lineNo,
          hint: "Syntax: %%workflow <name> entity: <Entity> kind: <hook|state|saga>",
        });
        continue;
      }
      const [, name, entityName, kind] = m;

      // EML241: Kind must be valid
      if (!this.validWorkflowKinds.has(kind)) {
        this.error("EML241", `%%workflow "${name}" has unknown kind "${kind}".`, {
          line: lineNo,
          hint: "Valid kinds: hook, state, saga",
        });
      }

      // EML242: Entity must be declared
      if (!entityNames.has(entityName)) {
        this.warn("EML242", `%%workflow "${name}" references undeclared entity "${entityName}".`, {
          line: lineNo,
          hint: `Declare "${entityName}" in the erDiagram section.`,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // EML280-EML289: %%action directive checks (rule actions)
  // -------------------------------------------------------------------------

  /**
   * Validate the side-effecting actions a rules section declares.
   *
   * An action the engine cannot execute is dropped silently at evaluation time,
   * so a rule appears to be wired up and does nothing. These checks move that
   * to the model — particularly the workflow name, which is the join between a
   * rule and the saga it is supposed to start.
   */
  private checkActionDirectives(): void {
    const actionTypes = new Map(
      (this.def.ruleNodes.actions?.types ?? []).map((action) => [action.name, action])
    );
    const workflowNames = new Set(this.model.workflows.map((wf) => wf.name));

    for (const { lineNo, text } of this.src.findAll(/^\s*%%action\b/)) {
      const match = text.trim().match(/^%%action\s+([A-Za-z_][\w-]*)\s+([A-Za-z][\w-]*)\s*(.*)$/);
      if (!match) {
        this.error("EML280", `Invalid %%action syntax: "${text.trim()}"`, {
          line: lineNo,
          hint: "Syntax: %%action <name> <actionType> when: <expr> <key>: <value> ...",
        });
        continue;
      }

      const [, name, typeName, rest] = match as unknown as [string, string, string, string];
      const contract = actionTypes.get(typeName);

      // EML281: an unknown action type is dropped by the engine.
      if (!contract) {
        this.error("EML281", `%%action "${name}" has unknown type "${typeName}".`, {
          line: lineNo,
          hint: `Valid action types: ${[...actionTypes.keys()].join(", ")}.`,
        });
        continue;
      }

      const props = this.parseStepProps(rest ?? "");
      const has = (key: string) => (props[key] ?? "").trim().length > 0;

      // EML282: no condition means the action fires on every write, which is
      // almost never what someone writing a conditional rule intended.
      if (!has("when")) {
        this.warn("EML282", `%%action "${name}" has no "when" — it fires on every write.`, {
          line: lineNo,
          hint: 'Add a condition, e.g. when: severity == "critical". Use when: true to say "always" on purpose.',
        });
      }

      // EML283: properties the action cannot run without.
      const missing = contract.required.filter((key) => !has(key));
      if (missing.length > 0) {
        this.error(
          "EML283",
          `%%action "${name}" (${typeName}) is missing: ${missing.join(", ")}.`,
          {
            line: lineNo,
            hint: `${typeName} requires ${contract.required.join(", ")}.`,
          }
        );
      }

      // EML284: the workflow a trigger-workflow names has to exist, or the run
      // logs "No active workflow named …" and nothing happens.
      const workflow = props.workflow?.trim();
      if (typeName === "trigger-workflow" && workflow && !workflowNames.has(workflow)) {
        this.warn(
          "EML284",
          `%%action "${name}" triggers workflow "${workflow}", which this document does not declare.`,
          {
            line: lineNo,
            hint: `Declare it with %%workflow ${workflow} entity: <Entity> kind: saga trigger: rule, or correct the name.`,
          }
        );
      }

      // EML285: an unknown key is ignored, so the action runs without it.
      const known = new Set(["when", ...contract.required, ...(contract.optional ?? [])]);
      for (const key of Object.keys(props)) {
        if (!known.has(key)) {
          this.warn("EML285", `%%action "${name}" has unknown property "${key}".`, {
            line: lineNo,
            hint: `${typeName} understands: ${[...known].sort().join(", ")}.`,
          });
        }
      }
    }

    // EML286: a saga declared trigger: rule that no action ever names never
    // runs at all — the definition is seeded and nothing reaches it.
    const triggered = new Set(
      this.src
        .findAll(/^\s*%%action\b/)
        .map(({ text }) => text.match(/\bworkflow:\s*(\S+)/)?.[1])
        .filter((name): name is string => !!name)
    );
    for (const { lineNo, text } of this.src.findAll(/^%%workflow\b/)) {
      const m = text.match(/^%%workflow\s+(\w+)[^\n]*kind:\s*saga/);
      if (!m || !/\btrigger:\s*rule\b/.test(text)) continue;
      if (triggered.has(m[1]!)) continue;
      this.warn("EML286", `Saga "${m[1]}" is rule-triggered but no %%action names it.`, {
        line: lineNo,
        hint: `Add %%action <name> trigger-workflow when: <condition> workflow: ${m[1]} to a %%rule section, or change it to trigger: automatic.`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // EML260-EML279: %%step directive checks (saga workflows)
  // -------------------------------------------------------------------------

  /**
   * Validate the executable steps of every `kind: saga` workflow.
   *
   * A step the executor cannot run is skipped at runtime with a log line, which
   * is a bad place to discover that a workflow has quietly been doing nothing.
   * These checks move that discovery to the model.
   *
   * The vocabulary comes from `workflowConstructs.stepNodes` in
   * erdwithai-language.json, so a new step type is declared in one place.
   */
  private checkStepDirectives(): void {
    const stepTypes = new Map(stepNodeTypes().map((step) => [step.name, step]));
    const entitySpellings = this.entitySpellings();

    for (const section of this.sagaSections()) {
      // Variables a step can read: every entity column is in scope, plus
      // whatever an earlier step published.
      const published = new Set<string>();
      const bound = new Set<string>();

      for (const { lineNo, text } of section.steps) {
        const match = text.trim().match(/^%%step\s+([A-Za-z_]\w*)\s+([A-Za-z]\w*)\s*(.*)$/);
        if (!match) {
          this.error("EML260", `Invalid %%step syntax: "${text.trim()}"`, {
            line: lineNo,
            hint: "Syntax: %%step <nodeId> <StepType> <key>: <value> ...",
          });
          continue;
        }

        const [, nodeId, typeName, rest] = match as unknown as [string, string, string, string];
        const contract = stepTypes.get(typeName);

        // EML261: the step type has to be one the executor knows.
        if (!contract) {
          this.error("EML261", `%%step on node ${nodeId} has unknown type "${typeName}".`, {
            line: lineNo,
            hint: `Valid step types: ${[...stepTypes.keys()].join(", ")}.`,
          });
          continue;
        }

        // EML270: the compiler keeps the first binding, so the second is dead
        // text that reads as though it were doing something.
        if (bound.has(nodeId)) {
          this.error("EML270", `Node "${nodeId}" has more than one %%step.`, {
            line: lineNo,
            hint: "Only the first binding runs. Give the second step its own node.",
          });
          continue;
        }
        bound.add(nodeId);

        // EML263: a step bound to a node that is not on the canvas runs at the
        // end, detached from the order the author drew — almost never intended.
        if (!section.nodeIds.has(nodeId)) {
          this.warn("EML263", `%%step binds node "${nodeId}", which is not in the flowchart.`, {
            line: lineNo,
            hint: `Add a node "${nodeId}" to the flowchart, or bind the step to an existing one.`,
          });
        }

        const props = this.parseStepProps(rest ?? "");
        const has = (key: string) => (props[key] ?? "").trim().length > 0;

        // EML262: properties the step cannot run without.
        const missing: string[] = [];
        for (const key of contract.required) {
          if (!has(key)) missing.push(key);
        }
        for (const group of contract.oneOf ?? []) {
          if (!group.some((key) => has(key))) missing.push(`one of ${group.join(" / ")}`);
        }
        if (typeName === "Formula" && has("operation")) {
          const extra = contract.perOperation?.[props.operation!.trim()]?.required ?? [];
          for (const key of extra) {
            if (!has(key)) missing.push(key);
          }
        }
        if (missing.length > 0) {
          this.error(
            "EML262",
            `%%step ${nodeId} (${typeName}) is missing: ${missing.join(", ")}.`,
            {
              line: lineNo,
              hint: `${typeName} requires ${contract.required.join(", ") || "no fixed properties"}. See spec/03-workflows.md.`,
            }
          );
        }

        // EML268: a misspelt key is silently ignored by the executor, so the
        // step runs without the property the author thought they had set.
        const known = new Set([
          ...contract.required,
          ...(contract.optional ?? []),
          ...(contract.oneOf ?? []).flat(),
          ...(typeName === "Formula" ? ["source", "operand", "value"] : []),
        ]);
        for (const key of Object.keys(props)) {
          if (!known.has(key)) {
            this.warn("EML268", `%%step ${nodeId} (${typeName}) has unknown property "${key}".`, {
              line: lineNo,
              hint: `${typeName} understands: ${[...known].sort().join(", ")}.`,
            });
          }
        }

        // EML266: the target entity has to exist.
        const entityProp = props.entity?.trim();
        if (entityProp && !entitySpellings.has(entityProp.toLowerCase())) {
          this.warn(
            "EML266",
            `%%step ${nodeId} targets entity "${entityProp}", which the model does not declare.`,
            {
              line: lineNo,
              hint: "Use the entity name from the erDiagram, or its bus_ table name.",
            }
          );
        }

        // EML267: an unparseable field map means the whole step is skipped.
        if (typeName === "CreateEntity" && has("fields")) {
          try {
            const parsed = JSON.parse(props.fields!);
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
              throw new Error("not an object");
            }
            if (Object.keys(parsed).length === 0) {
              this.error("EML267", `%%step ${nodeId} (CreateEntity) sets no fields.`, {
                line: lineNo,
                hint: 'Give at least one column, e.g. fields: {"status":"open"}.',
              });
            }
          } catch {
            this.error("EML267", `%%step ${nodeId} (CreateEntity) has an invalid "fields" map.`, {
              line: lineNo,
              hint: '`fields` must be a JSON object and the last key on the line, e.g. fields: {"status":"open"}.',
            });
          }
        }

        // EML265: the executor refuses a cross-entity write it cannot aim.
        if (
          (typeName === "UpdateEntity" || typeName === "DeleteEntity") &&
          entityProp &&
          !has("targetSource") &&
          (props.targetField ?? "id").trim() === "id"
        ) {
          this.error(
            "EML265",
            `%%step ${nodeId} (${typeName}) targets "${entityProp}" without saying which row.`,
            {
              line: lineNo,
              hint: "Set targetSource to a context key holding the row id, or targetField to a foreign key column. The executor refuses this rather than guessing a row.",
            }
          );
        }

        // EML264: reading a variable nothing has published yet. Entity columns
        // are also in scope, so this is a warning: the checker cannot know the
        // target entity's columns from here.
        const reference = props.targetSource?.trim();
        if (reference && !published.has(reference)) {
          this.warn(
            "EML264",
            `%%step ${nodeId} reads "${reference}", which no earlier step publishes.`,
            {
              line: lineNo,
              hint: `Publish it with \`as: ${reference}\` on a CreateEntity step or \`target: ${reference}\` on a Formula step — unless it is a column of the triggering record.`,
            }
          );
        }

        const publishes =
          typeName === "CreateEntity"
            ? props.as?.trim() || (entityProp ? `${entityProp.replace(/^bus_/, "")}Id` : undefined)
            : typeName === "Formula"
              ? props.target?.trim()
              : undefined;
        if (publishes) published.add(publishes);
      }
    }

    // EML269: a %%step outside a saga does nothing at all.
    for (const { lineNo, text } of this.src.findAll(/^\s*%%step\b/)) {
      if (this.sagaStepLines.has(lineNo)) continue;
      this.warn("EML269", `%%step is only read inside a "kind: saga" workflow: "${text.trim()}"`, {
        line: lineNo,
        hint: "Move it into a %%workflow ... kind: saga section, or delete it.",
      });
    }
  }

  /** Line numbers of every %%step the saga scan claimed. */
  private sagaStepLines = new Set<number>();

  /**
   * Split the document into its `kind: saga` sections.
   *
   * Sections run from a `%%workflow ... kind: saga` directive to the next
   * `%%workflow`/`%%rule` directive, which mirrors how the composer's extractor
   * carves the document up.
   */
  private sagaSections(): Array<{
    name: string;
    nodeIds: Set<string>;
    steps: Array<{ lineNo: number; text: string }>;
  }> {
    const sections: Array<{
      name: string;
      nodeIds: Set<string>;
      steps: Array<{ lineNo: number; text: string }>;
    }> = [];

    let current: {
      name: string;
      nodeIds: Set<string>;
      steps: Array<{ lineNo: number; text: string }>;
    } | null = null;

    const nodeRef =
      /([A-Za-z_]\w*)\s*(?:\(\[[^\]]*\]\)|\(\([^)]*\)\)|\[[^\]]*\]|\{[^}]*\}|\([^)]*\))?/g;
    const edge = /(?:-->|---|-\.->|==>)/;

    const all = this.src.findAll(/.*/);
    for (const { lineNo, text } of all) {
      const trimmed = text.trim();

      const workflow = trimmed.match(/^%%workflow\s+(\w+)\s+entity:\s*\w+\s+kind:\s*(\w+)/);
      if (workflow) {
        if (current) sections.push(current);
        current =
          workflow[2] === "saga"
            ? { name: workflow[1]!, nodeIds: new Set<string>(), steps: [] }
            : null;
        continue;
      }
      if (trimmed.startsWith("%%rule ")) {
        if (current) sections.push(current);
        current = null;
        continue;
      }
      if (!current) continue;

      if (trimmed.startsWith("%%step")) {
        current.steps.push({ lineNo, text });
        this.sagaStepLines.add(lineNo);
        continue;
      }
      if (!trimmed || trimmed.startsWith("%%")) continue;

      // Any bare identifier on a diagram line is a node reference — either end
      // of an edge, or a standalone node definition.
      if (edge.test(trimmed) || /[[({]/.test(trimmed)) {
        nodeRef.lastIndex = 0;
        let m: RegExpExecArray | null;
        // Not matchAll: the body advances lastIndex past zero-length matches.
        // biome-ignore lint/suspicious/noAssignInExpressions: standard exec-loop idiom
        while ((m = nodeRef.exec(trimmed)) !== null) {
          if (m[0].trim()) current.nodeIds.add(m[1]!);
          if (m.index === nodeRef.lastIndex) nodeRef.lastIndex++;
        }
      }
    }
    if (current) sections.push(current);
    return sections;
  }

  /** Every spelling of a declared entity a %%step's `entity:` may use. */
  private entitySpellings(): Set<string> {
    const spellings = new Set<string>();
    for (const entity of this.model.entities) {
      const snake = entity.name
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/-/g, "_")
        .toLowerCase();
      const bare = snake.replace(/^bus_/, "");
      spellings.add(entity.name.toLowerCase());
      spellings.add(snake);
      spellings.add(bare);
      spellings.add(`bus_${bare}`);
    }
    return spellings;
  }

  /** `key: value` pairs, each value running to the next `key:` token. */
  private parseStepProps(rest: string): Record<string, string> {
    const props: Record<string, string> = {};
    const trimmed = rest.trim();
    if (!trimmed) return props;
    for (const chunk of trimmed.split(/\s+(?=[A-Za-z_]\w*:)/)) {
      const at = chunk.indexOf(":");
      if (at <= 0) continue;
      const key = chunk.slice(0, at).trim();
      if (key) props[key] = chunk.slice(at + 1).trim();
    }
    return props;
  }

  // -------------------------------------------------------------------------
  // EML250-EML259: %%rule directive checks
  // -------------------------------------------------------------------------

  private checkRuleDirectives(): void {
    const entityNames = new Set(this.model.entities.map((e) => e.name));
    const ruleLines = this.src.findAll(/^%%rule\b/);

    for (const { lineNo, text } of ruleLines) {
      const m = text
        .trim()
        .match(/^%%rule\s+(\w+)\s+on\s+(\w+)(?:\s+event:\s*(\w+))?(?:\s+priority:\s*(\d+))?/);
      if (!m) {
        this.error("EML250", `Invalid %%rule syntax: "${text.trim()}"`, {
          line: lineNo,
          hint: "Syntax: %%rule <name> on <Entity> event: <hookType> priority: <n>",
        });
        continue;
      }
      const [, name, entityName, event] = m;

      // EML251: Entity must be declared
      if (!entityNames.has(entityName)) {
        this.warn("EML251", `%%rule "${name}" references undeclared entity "${entityName}".`, {
          line: lineNo,
          hint: `Declare "${entityName}" in the erDiagram section.`,
        });
      }

      // EML252: Event must be a valid hook type (if provided)
      if (event && !this.validHookTypes.has(event)) {
        this.error("EML252", `%%rule "${name}" has unknown event "${event}".`, {
          line: lineNo,
          hint: `Valid event values: ${[...this.validHookTypes].join(", ")}.`,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // EML300-EML349: Business rule (flowchart) checks
  // -------------------------------------------------------------------------

  private checkRules(): void {
    const entityNames = new Set(this.model.entities.map((e) => e.name));

    for (const rule of this.model.rules) {
      // EML300: Must have at least one inputNode
      const inputs = rule.nodes.filter((n) => n.jdmType === "inputNode");
      if (inputs.length === 0) {
        this.error("EML300", `Rule "${rule.name}" has no start (input) node.`, {
          hint: "Add a stadium node as the start:  A([Start: description]) --> ...  as the first step.",
        });
      } else if (inputs.length > 1) {
        this.warn("EML301", `Rule "${rule.name}" has ${inputs.length} input nodes; expected 1.`, {
          hint: "A well-formed rule has exactly one start stadium. Merge extra start nodes.",
        });
      }

      // EML302: Must have at least one outputNode
      const outputs = rule.nodes.filter((n) => n.jdmType === "outputNode");
      if (outputs.length === 0) {
        this.error("EML302", `Rule "${rule.name}" has no end (output) node.`, {
          hint: "Add a terminal stadium node with only incoming edges:  ... --> Z([End: description])",
        });
      }

      // EML303: Decision nodes should have at least 2 outgoing edges
      const edgeSources = new Map<string, number>();
      for (const e of rule.edges) {
        edgeSources.set(e.source, (edgeSources.get(e.source) ?? 0) + 1);
      }
      for (const node of rule.nodes) {
        if (node.shape === "diamond") {
          const outCount = edgeSources.get(node.id) ?? 0;
          if (outCount < 2) {
            this.warn(
              "EML303",
              `Rule "${rule.name}": decision node "${node.id}" (${node.label}) has only ${outCount} outgoing edge(s).`,
              {
                hint: "Decision (diamond) nodes should branch at least Yes/No — add a second outgoing edge.",
              }
            );
          }
        }
      }

      // EML304: Decision node edges should be labeled
      for (const edge of rule.edges) {
        const srcNode = rule.nodes.find((n) => n.id === edge.source);
        if (srcNode?.shape === "diamond" && !edge.label) {
          this.warn(
            "EML304",
            `Rule "${rule.name}": unlabeled edge from decision node "${srcNode.id}".`,
            {
              hint: `Add a condition label:  ${edge.source} -->|Yes| ${edge.target}  or  ${edge.source} -->|condition| ${edge.target}`,
            }
          );
        }
      }

      // EML305: Disconnected nodes (no incoming or outgoing edges from start)
      if (rule.nodes.length > 0 && rule.edges.length > 0) {
        const reachable = this.reachableNodes(rule);
        for (const node of rule.nodes) {
          if (!reachable.has(node.id) && node.jdmType !== "inputNode") {
            this.warn(
              "EML305",
              `Rule "${rule.name}": node "${node.id}" (${node.label}) is unreachable from the start node.`,
              {
                hint: "Add an edge from the start or another reachable node to this node.",
              }
            );
          }
        }
      }

      // EML306: Empty rule (no nodes)
      if (rule.nodes.length === 0) {
        this.warn("EML306", `Rule "${rule.name}" has no nodes.`, {
          hint: "Add flowchart nodes using the shapes documented in spec/02-business-rules.md.",
        });
      }

      // EML307: Rule entity must be declared
      if (rule.entity && !entityNames.has(rule.entity)) {
        this.warn("EML307", `Rule "${rule.name}" bound to undeclared entity "${rule.entity}".`, {
          hint: `Declare "${rule.entity}" in the erDiagram section or check the %%rule directive.`,
        });
      }
    }
  }

  private reachableNodes(rule: EmlRule): Set<string> {
    const startNode = rule.nodes.find((n) => n.jdmType === "inputNode");
    if (!startNode) return new Set();
    const visited = new Set<string>();
    const queue = [startNode.id];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      for (const e of rule.edges) {
        if (e.source === id && !visited.has(e.target)) queue.push(e.target);
      }
    }
    return visited;
  }

  // -------------------------------------------------------------------------
  // EML400-EML449: Workflow checks
  // -------------------------------------------------------------------------

  private checkWorkflows(): void {
    const entityNames = new Set(this.model.entities.map((e) => e.name));
    const enumNames = new Set(this.model.enums.map((e) => e.name));

    for (const wf of this.model.workflows) {
      // EML400: Entity must be declared
      if (wf.entity && !entityNames.has(wf.entity)) {
        this.warn("EML400", `Workflow "${wf.name}" bound to undeclared entity "${wf.entity}".`, {
          hint: `Declare "${wf.entity}" in the erDiagram section.`,
        });
      }

      if (wf.kind === "hook") {
        this.checkHookWorkflow(wf);
      } else if (wf.kind === "state") {
        this.checkStateWorkflow(wf, enumNames);
      } else if (wf.kind === "saga") {
        this.checkSagaWorkflow(wf);
      }
    }
  }

  private checkHookWorkflow(wf: EmlWorkflow): void {
    // EML410: Hook workflow should have %%hook directives
    if (wf.hooks.length === 0 && wf.entity) {
      this.warn(
        "EML410",
        `Hook workflow "${wf.name}" (entity: ${wf.entity}) has no %%hook directives.`,
        {
          hint: `Add  %%hook <type> <handler> on ${wf.entity}  inside or before the flowchart section.`,
        }
      );
    }
  }

  private checkStateWorkflow(wf: EmlWorkflow, enumNames: Set<string>): void {
    // EML420: Must have transitions
    if (wf.transitions.length === 0) {
      this.warn("EML420", `State workflow "${wf.name}" has no transitions.`, {
        hint: "Add state transitions:  StateA --> StateB : eventName",
      });
      return;
    }

    // EML421: Must have an initial state ([*] --> FirstState)
    const hasInitial = wf.transitions.some((t) => t.from === "[*]");
    if (!hasInitial) {
      this.error(
        "EML421",
        `State workflow "${wf.name}" has no initial transition ([*] --> FirstState).`,
        {
          hint: "Add  [*] --> <firstStateName>  as the first transition.",
        }
      );
    }

    // EML422: Must have at least one final state (<state> --> [*])
    const hasFinal = wf.transitions.some((t) => t.to === "[*]");
    if (!hasFinal) {
      this.warn(
        "EML422",
        `State workflow "${wf.name}" has no final state (no transition to [*]).`,
        {
          hint: "Add  <TerminalState> --> [*]  to mark a terminal state.",
        }
      );
    }

    // EML423: All states should be reachable from initial
    const reachableStates = this.reachableStates(wf);
    for (const state of wf.states) {
      if (!reachableStates.has(state) && state !== "[*]") {
        this.warn(
          "EML423",
          `State workflow "${wf.name}": state "${state}" is not reachable from [*].`,
          {
            hint: `Add a transition to "${state}" from a reachable state, or remove it.`,
          }
        );
      }
    }

    // EML424: All states should eventually reach [*]
    const canReachFinal = this.statesReachingFinal(wf);
    for (const state of wf.states) {
      if (!canReachFinal.has(state)) {
        this.warn(
          "EML424",
          `State workflow "${wf.name}": state "${state}" has no path to a terminal state ([*]).`,
          {
            hint: `Add a transition from "${state}" to [*] or to a state that eventually reaches [*].`,
          }
        );
      }
    }

    // EML425: Transition events should be valid identifiers
    for (const t of wf.transitions) {
      if (t.event && !this.identRe.test(t.event.replace(/[- ]/g, "_"))) {
        this.warn(
          "EML425",
          `State workflow "${wf.name}": transition event "${t.event}" may not be a valid identifier.`,
          {
            hint: "Use snake_case or camelCase event names (e.g. submit, mark_paid, close_won).",
          }
        );
      }
    }

    // EML426: If a %%enum matches this workflow's states, check alignment
    if (wf.entity) {
      for (const em of this.model.enums) {
        const stateSet = new Set(wf.states);
        const enumSet = new Set(em.values);
        const overlap = [...stateSet].filter((s) => enumSet.has(s));
        if (overlap.length === wf.states.length && wf.states.length > 0) {
          // This enum looks like the status enum for this workflow
          const missingInEnum = [...stateSet].filter((s) => !enumSet.has(s));
          const extraInEnum = [...enumSet].filter((v) => !stateSet.has(v));
          if (missingInEnum.length > 0) {
            this.warn(
              "EML426",
              `State workflow "${wf.name}": states [${missingInEnum.join(", ")}] are not in enum "${em.name}".`,
              {
                hint: `Add these values to  %%enum ${em.name}: ...`,
              }
            );
          }
          if (extraInEnum.length > 0) {
            this.info(
              "EML427",
              `Enum "${em.name}" has values [${extraInEnum.join(", ")}] not present as states in workflow "${wf.name}".`,
              {
                hint: "These may be future states or unreachable values — remove if not needed.",
              }
            );
          }
          break;
        }
      }
    }
  }

  private reachableStates(wf: EmlWorkflow): Set<string> {
    const visited = new Set<string>();
    const queue = wf.transitions.filter((t) => t.from === "[*]").map((t) => t.to);
    while (queue.length > 0) {
      const s = queue.shift()!;
      if (visited.has(s) || s === "[*]") continue;
      visited.add(s);
      for (const t of wf.transitions) {
        if (t.from === s && !visited.has(t.to)) queue.push(t.to);
      }
    }
    return visited;
  }

  private statesReachingFinal(wf: EmlWorkflow): Set<string> {
    // Reverse reachability: which states can reach [*]?
    const canReach = new Set<string>();
    // Seed: direct transitions to [*]
    for (const t of wf.transitions) {
      if (t.to === "[*]") canReach.add(t.from);
    }
    // Propagate backwards
    let changed = true;
    while (changed) {
      changed = false;
      for (const t of wf.transitions) {
        if (canReach.has(t.to) && !canReach.has(t.from) && t.from !== "[*]") {
          canReach.add(t.from);
          changed = true;
        }
      }
    }
    return canReach;
  }

  private checkSagaWorkflow(wf: EmlWorkflow): void {
    // EML430: a saga's steps come from %%step directives. It used to be checked
    // for %%hook directives instead, from when saga was a documented-but-unbuilt
    // kind — a saga with steps and no hooks is the normal case now.
    const declared = this.sagaSections().find((section) => section.name === wf.name);
    if (declared && declared.steps.length === 0 && wf.hooks.length === 0) {
      this.warn("EML430", `Saga workflow "${wf.name}" declares no steps.`, {
        hint: "Bind its flowchart nodes with %%step directives, e.g. %%step B UpdateEntity field: status value: escalated.",
      });
    }
  }

  // -------------------------------------------------------------------------
  // EML500-EML529: Cross-document consistency checks
  // -------------------------------------------------------------------------

  private checkCrossDocument(): void {
    const entityNames = new Set(this.model.entities.map((e) => e.name));
    const enumNames = new Set(this.model.enums.map((e) => e.name));
    const entityAttrMap = new Map<string, Map<string, EmlAttribute>>();
    for (const e of this.model.entities) {
      const m = new Map<string, EmlAttribute>();
      for (const a of e.attributes) m.set(a.name, a);
      entityAttrMap.set(e.name, m);
    }

    // EML500: State workflow entity should have a status/state field
    for (const wf of this.model.workflows) {
      if (wf.kind === "state" && wf.entity && entityNames.has(wf.entity)) {
        const attrs = entityAttrMap.get(wf.entity);
        const hasStatusField =
          attrs && (attrs.has("status") || attrs.has("state") || attrs.has("stage"));
        if (!hasStatusField) {
          this.warn(
            "EML500",
            `State workflow "${wf.name}" is bound to "${wf.entity}" which has no "status", "state", or "stage" field.`,
            {
              hint: `Add  string status  to "${wf.entity}" — the state machine needs a field to track the current state.`,
            }
          );
        }
      }
    }

    // EML501: %%field enum references — check they exist
    // (done already in checkFieldDirectives, but also check attributes with enumRef from parser)
    for (const entity of this.model.entities) {
      for (const attr of entity.attributes) {
        if (attr.enumRef && !enumNames.has(attr.enumRef)) {
          this.warn(
            "EML501",
            `Attribute "${entity.name}.${attr.name}" has enum reference "${attr.enumRef}" but no matching %%enum is declared.`,
            {
              hint: `Add  %%enum ${attr.enumRef}: value1, value2  to the document.`,
            }
          );
        }
      }
    }

    // EML502: FK attributes — verify a relationship exists between this entity and the referenced entity
    for (const entity of this.model.entities) {
      for (const attr of entity.attributes) {
        if (attr.isForeignKey && attr.name.endsWith("_id")) {
          // Derive the expected parent entity name from the FK attribute name
          const parentEntityName = this.fkToEntityName(attr.name);
          const hasRelationship = this.model.relationships.some(
            (r) =>
              (r.source === entity.name || r.target === entity.name) &&
              (r.source === parentEntityName || r.target === parentEntityName)
          );
          if (!hasRelationship) {
            this.info(
              "EML502",
              `FK attribute "${entity.name}.${attr.name}" has no relationship to "${parentEntityName}".`,
              {
                hint: `Add:  ${parentEntityName} ||--o{ ${entity.name} : "..."  (or reverse for manyToOne).`,
              }
            );
          }
        }
      }
    }

    // EML503: Entities with no relationships at all (isolated)
    if (this.model.entities.length > 1) {
      const connectedEntities = new Set<string>();
      for (const r of this.model.relationships) {
        connectedEntities.add(r.source);
        connectedEntities.add(r.target);
      }
      for (const e of this.model.entities) {
        if (!connectedEntities.has(e.name)) {
          this.info("EML503", `Entity "${e.name}" has no relationships to other entities.`, {
            hint: "Is this intentional? Isolated entities are valid but may indicate a missing relationship.",
          });
        }
      }
    }

    // EML504: Duplicate rule names
    const ruleNames = new Set<string>();
    for (const rule of this.model.rules) {
      if (ruleNames.has(rule.name)) {
        this.warn("EML504", `Duplicate rule name "${rule.name}".`, {
          hint: "Give each business rule a unique name in its %%rule directive.",
        });
      }
      ruleNames.add(rule.name);
    }

    // EML505: Duplicate workflow names
    const workflowNames = new Set<string>();
    for (const wf of this.model.workflows) {
      if (workflowNames.has(wf.name)) {
        this.warn("EML505", `Duplicate workflow name "${wf.name}".`, {
          hint: "Give each workflow a unique name in its %%workflow directive.",
        });
      }
      workflowNames.add(wf.name);
    }

    // EML506: Rules with no entity binding have limited generator impact
    for (const rule of this.model.rules) {
      if (!rule.entity) {
        this.info("EML506", `Rule "${rule.name}" has no entity binding.`, {
          hint: "Add  %%rule ${rule.name} on <Entity> event: <hookType>  to bind this rule to an entity lifecycle.",
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Auto-fixable error codes — the fixer knows how to repair these
// ---------------------------------------------------------------------------

/** Issues the fixer.ts can repair automatically. */
export const AUTO_FIXABLE_CODES = new Set([
  "EML117", // no PK → add string id PK
  "EML421", // no initial state → add [*] --> firstState
  "EML422", // no terminal state → add lastState --> [*]
  "EML001", // missing meta name → add %%meta name:
  "EML114", // FK not ending in _id → append the suffix (_by columns then resolve to bus_user)
]);

/** Structured output written to <file>.error for the fixer to consume. */
interface ErrorFileContent {
  /** The .mmd file that was checked. */
  file: string;
  /** ISO timestamp of this check run. */
  checkedAt: string;
  /** Language spec version the checker ran against. */
  languageVersion: string;
  summary: { errors: number; warnings: number; infos: number; ok: boolean };
  issues: Array<
    Issue & {
      /** Whether fixer.ts can repair this automatically. */
      autoFixable: boolean;
    }
  >;
}

function buildErrorFile(
  result: CheckResult,
  filePath: string,
  languageVersion: string
): ErrorFileContent {
  return {
    file: path.resolve(filePath),
    checkedAt: new Date().toISOString(),
    languageVersion,
    summary: {
      errors: result.errors,
      warnings: result.warnings,
      infos: result.infos,
      ok: result.ok,
    },
    issues: result.issues.map((issue) => ({
      ...issue,
      autoFixable: AUTO_FIXABLE_CODES.has(issue.code),
    })),
  };
}

function writeErrorFile(filePath: string, content: ErrorFileContent): void {
  const errorFilePath = `${filePath.replace(/\.mmd$/, "")}.mmd.error`;
  writeFileSync(errorFilePath, JSON.stringify(content, null, 2), "utf8");
}

// ---------------------------------------------------------------------------
// Formatter
// ---------------------------------------------------------------------------

function formatIssues(issues: Issue[], filePath: string, showHints: boolean): string {
  if (issues.length === 0) return "";
  const lines: string[] = [];
  for (const issue of issues) {
    const col = sevColor(issue.severity);
    const label = sevLabel(issue.severity);
    const loc = issue.line ? c.dim(`:${issue.line}`) : "";
    const filePart = c.dim(`${path.basename(filePath)}${loc}`);
    const code = c.dim(`[${issue.code}]`);
    lines.push(`  ${col(label)} ${code} ${filePart}  ${issue.message}`);
    if (showHints && issue.hint) {
      lines.push(`         ${c.dim("→")} ${c.dim(issue.hint)}`);
    }
    if (issue.context) {
      lines.push(`         ${c.dim(issue.context)}`);
    }
  }
  return lines.join("\n");
}

function formatSummary(result: CheckResult, filePath: string): string {
  const parts: string[] = [];
  if (result.errors > 0) parts.push(c.red(`${result.errors} error(s)`));
  else parts.push(c.green("0 errors"));
  if (result.warnings > 0) parts.push(c.yellow(`${result.warnings} warning(s)`));
  else parts.push("0 warnings");
  if (result.infos > 0) parts.push(c.cyan(`${result.infos} info`));
  return `${c.dim(path.basename(filePath))}  ${parts.join(c.dim(" · "))}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function printHelp(): void {
  console.log(`${c.bold("eml-check")} — EML language checker

${c.bold("USAGE")}
  bun language/checker.ts <file.mmd> [options]
  bun language/checker.ts <dir/>         # Check all .mmd files in a directory

${c.bold("OPTIONS")}
  --strict     Treat warnings as errors (exit 1)
  --json       Machine-readable JSON output
  --no-color   Disable ANSI colour
  --no-hint    Suppress inline hints
  --summary    Print summary line only
  -h, --help   Show this help

${c.bold("EXAMPLES")}
  bun language/checker.ts examples/crm.eml.mmd
  bun language/checker.ts examples/crm.eml.mmd --strict
  bun language/checker.ts examples/ --json
  bun language/checker.ts examples/drug-discovery.eml.mmd --no-hint

${c.bold("EXIT CODES")}
  0  No errors (warnings allowed unless --strict)
  1  One or more errors (or warnings with --strict)
  2  Bad invocation / file not found
`);
}

async function checkFile(
  filePath: string,
  opts: { strict: boolean; showHints: boolean; quiet: boolean },
  languageVersion: string
): Promise<{ result: CheckResult; file: string; errorFilePath: string }> {
  const source = readFileSync(filePath, "utf8");
  const model = parseEml(source);
  const engine = new CheckEngine(model, source);
  const result = engine.run();

  // Always write the .error file (overwrites previous run)
  const errorContent = buildErrorFile(result, filePath, languageVersion);
  writeErrorFile(filePath, errorContent);
  const errorFilePath = `${filePath.replace(/\.mmd$/, "")}.mmd.error`;

  return { result, file: filePath, errorFilePath };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--") && a !== "-h");
  const flags = {
    strict: hasFlag("--strict"),
    json: hasFlag("--json"),
    showHints: !hasFlag("--no-hint"),
    summary: hasFlag("--summary"),
    help: hasFlag("--help") || hasFlag("-h") || process.argv.includes("-h"),
  };

  if (flags.help || process.argv.length < 3) {
    printHelp();
    process.exit(0);
  }

  const inputArg = args[0];
  if (!inputArg) {
    console.error(c.red("Error: No input file or directory specified."));
    printHelp();
    process.exit(2);
  }

  if (!existsSync(inputArg)) {
    console.error(c.red(`Error: File or directory not found: ${inputArg}`));
    process.exit(2);
  }

  // Collect files to check
  let files: string[] = [];
  const { statSync, readdirSync } = await import("node:fs");
  const stat = statSync(inputArg);
  if (stat.isDirectory()) {
    const entries = readdirSync(inputArg, { withFileTypes: true });
    files = entries
      .filter((e) => e.isFile() && e.name.endsWith(".mmd"))
      .map((e) => path.join(inputArg, e.name));
    if (files.length === 0) {
      console.error(c.yellow(`No .mmd files found in: ${inputArg}`));
      process.exit(0);
    }
  } else {
    files = [inputArg];
  }

  // Language version (for .error file metadata)
  let languageVersion = "1.0.0";
  try {
    const { loadLanguageDefinition } = await import("./index.ts");
    languageVersion = loadLanguageDefinition().language.version;
  } catch {
    /* ignore */
  }

  // Run checks
  const allResults: Array<{ result: CheckResult; file: string; errorFilePath: string }> = [];
  for (const file of files) {
    try {
      const r = await checkFile(
        file,
        { strict: flags.strict, showHints: flags.showHints, quiet: flags.summary },
        languageVersion
      );
      allResults.push(r);
    } catch (err) {
      console.error(
        c.red(`Error reading ${file}: ${err instanceof Error ? err.message : String(err)}`)
      );
      process.exit(2);
    }
  }

  // Output
  if (flags.json) {
    const output = allResults.map(({ result, file }) => ({
      file,
      ok: flags.strict
        ? result.issues.filter((i) => i.severity !== "info").length === 0
        : result.ok,
      errors: result.errors,
      warnings: result.warnings,
      infos: result.infos,
      issues: result.issues,
    }));
    console.log(JSON.stringify(output.length === 1 ? output[0] : output, null, 2));
  } else {
    let totalErrors = 0;
    let totalWarnings = 0;

    for (const { result, file, errorFilePath } of allResults) {
      const effectiveErrors = flags.strict ? result.errors + result.warnings : result.errors;

      if (!flags.summary) {
        const header = `\n${c.bold("Checking")} ${c.cyan(file)}`;
        console.log(header);
        const formatted = formatIssues(result.issues, file, flags.showHints);
        if (formatted) {
          console.log(formatted);
        } else {
          console.log(c.green("  ✓ No issues found."));
        }
        // Always report where the error file was written
        const autoFixCount = result.issues.filter(
          (i) => AUTO_FIXABLE_CODES.has(i.code) && i.severity === "error"
        ).length;
        const fixHint =
          autoFixCount > 0
            ? c.cyan(
                ` (${autoFixCount} auto-fixable — run: bun language/fixer.ts ${path.basename(errorFilePath)})`
              )
            : "";
        console.log(c.dim(`  → wrote ${path.relative(process.cwd(), errorFilePath)}${fixHint}`));
      }

      console.log(`  ${formatSummary(result, file)}`);
      totalErrors += effectiveErrors;
      totalWarnings += result.warnings;
    }

    if (allResults.length > 1) {
      console.log();
      console.log(
        c.bold("Total: ") +
          (totalErrors > 0 ? c.red(`${totalErrors} error(s)`) : c.green("0 errors")) +
          c.dim("  ·  ") +
          (totalWarnings > 0 ? c.yellow(`${totalWarnings} warning(s)`) : "0 warnings")
      );
    }
  }

  // Exit code
  const anyErrors = allResults.some(({ result }) =>
    flags.strict ? result.errors > 0 || result.warnings > 0 : result.errors > 0
  );
  process.exit(anyErrors ? 1 : 0);
}

main().catch((err) => {
  console.error(c.red(`Fatal: ${err instanceof Error ? err.message : String(err)}`));
  if (process.env.EML_DEBUG) console.error(err);
  process.exit(2);
});
