/**
 * Business rules authored in EML.
 *
 * A `%%rule` section is a decision flowchart. These compile it to a GoRules JDM
 * decision graph — the same representation the generated application's rules
 * engine evaluates and its admin editor edits — so a rule drawn in the design
 * phase is the rule that runs.
 *
 * The flowchart parser and JDM converter live here rather than in the web app
 * because the generator is what consumes them; the web app re-exports these.
 */

export * from "./flowchart-parser";
export * from "./jdm-converter";

import type { EmlRuleSection } from "../eml";
import { parseMermaidFlowchart } from "./flowchart-parser";
import { convertToJdm } from "./jdm-converter";

/** A rule compiled from EML, ready to seed into `sys_rule_definitions`. */
export interface CompiledRule {
  /** Directive name, used as the seeded rule's identity. */
  name: string;
  /** Table the rule is bound to, e.g. `bus_sample`. */
  tableName: string;
  entity: string;
  /** Lifecycle event from the directive, e.g. `beforeCreate`. */
  event: string;
  /** CRUD operation the rules engine keys on: CREATE / UPDATE / DELETE / ALL. */
  operation: "CREATE" | "UPDATE" | "DELETE" | "ALL";
  priority: number;
  /** The JDM decision graph, serialised. */
  jdmContent: string;
}

/** Map a lifecycle event onto the operation the rules engine evaluates against. */
export function eventToOperation(event: string): CompiledRule["operation"] {
  const normalized = event.toLowerCase();
  if (normalized.includes("create")) return "CREATE";
  if (normalized.includes("update")) return "UPDATE";
  if (normalized.includes("delete")) return "DELETE";
  return "ALL";
}

/** `Sample` → `bus_sample`, matching the ERD's table naming. */
function toTableName(entity: string): string {
  const snake = entity
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
  return snake.startsWith("bus_") || snake.startsWith("sys_") ? snake : `bus_${snake}`;
}

/**
 * Compile the `%%rule` sections of a model into seedable JDM.
 *
 * A section whose flowchart cannot be parsed is skipped with a warning rather
 * than failing the build: one malformed rule should not stop an application
 * from being generated, and the checker already reports the syntax problem.
 */
export function compileRules(
  sections: EmlRuleSection[],
  onWarn: (message: string) => void = () => {}
): CompiledRule[] {
  const compiled: CompiledRule[] = [];

  for (const section of sections) {
    if (!section.entity) {
      onWarn(`Rule "${section.name}" declares no entity; skipping.`);
      continue;
    }

    try {
      const ast = parseMermaidFlowchart(section.flowchart);
      if (!ast.nodes.size) {
        onWarn(`Rule "${section.name}" has no nodes; skipping.`);
        continue;
      }

      const jdm = convertToJdm(ast);
      compiled.push({
        name: section.name,
        entity: section.entity,
        tableName: toTableName(section.entity),
        event: section.event,
        operation: eventToOperation(section.event),
        priority: section.priority ?? 100,
        jdmContent: JSON.stringify(jdm),
      });
    } catch (error) {
      onWarn(
        `Rule "${section.name}" could not be compiled: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return compiled;
}
