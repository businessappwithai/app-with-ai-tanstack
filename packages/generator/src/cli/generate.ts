#!/usr/bin/env node

/**
 * ERDwithAI Code Generator CLI
 *
 * Generates full-stack applications from Mermaid ERD / EML diagrams.
 * Supports two stack options:
 * - tanstackjs-nestjs: TanStack Start + NestJS (Modern Web)
 * - openui5-odatav4: OData + OpenUI5 (Enterprise SAP)
 */

import type { Entity, Relationship } from "@erdwithai/core/types";
import { Command } from "commander";
import { promises as fs } from "fs";
import * as path from "path";
import * as readline from "readline";
import { FullStackGenerator, type StackOption } from "../generators/full-stack.generator";
import { NestJsBackendGenerator } from "../generators/tanstack-start-nestjs/nestjs-backend.generator";
import { TanStackStartFrontendGenerator } from "../generators/tanstack-start-nestjs/tanstack-start-frontend.generator";
import { MermaidParser } from "../parsers/mermaid.parser";

// Resolve relative paths from the workspace root (INIT_CWD) when called via bun --filter
const resolvePath = (p: string) =>
  path.isAbsolute(p) ? p : path.resolve(process.env.INIT_CWD || process.cwd(), p);

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function log(msg: string, quiet: boolean) {
  if (!quiet) console.log(msg);
}

function getStackDescription(stack: StackOption): string {
  return stack === "tanstackjs-nestjs"
    ? "tanstackjs-nestjs - Modern Web (TanStack Start + NestJS)"
    : "openui5-odatav4 - Enterprise SAP (OData + OpenUI5)";
}

/** Parse an ERD / EML / Mermaid file and return entities + relationships. */
async function parseFile(
  filePath: string
): Promise<{ entities: Entity[]; relationships: Relationship[] }> {
  const absPath = resolvePath(filePath);
  await fs.access(absPath);
  const content = await fs.readFile(absPath, "utf-8");
  const parser = new MermaidParser();
  return parser.parse(content);
}

/** Save a generation manifest so `erdwithai info` can read it later. */
async function writeManifest(outputDir: string, meta: Record<string, unknown>) {
  try {
    await fs.writeFile(
      path.join(outputDir, ".erdwithai.json"),
      JSON.stringify({ ...meta, generatedAt: new Date().toISOString() }, null, 2)
    );
  } catch {
    // non-fatal
  }
}

/** Check whether the output directory already contains files. */
async function outputDirHasContent(outputDir: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(outputDir);
    return entries.filter((e) => !e.startsWith(".")).length > 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// CLI setup
// ---------------------------------------------------------------------------

const program = new Command();

program
  .name("erdwithai")
  .description("Generate full-stack applications from EML / Mermaid ERD diagrams")
  .version("5.2.0");

// ---------------------------------------------------------------------------
// generate — main full-stack generation command
// ---------------------------------------------------------------------------

program
  .command("generate")
  .description("Generate a full-stack application from a Mermaid ERD or EML file")
  // Input sources
  .option("-i, --input <file>", "Input Mermaid ERD / EML file (single-file mode)")
  .option("--sys-file <file>", "System entities file (sys_ tables, multi-file mode)")
  .option("--bus-file <file>", "Business entities file (bus_ tables, multi-file mode)")
  .option("--ref-file <file>", "Reference entities file (REF_ tables, multi-file mode)")
  // Output
  .requiredOption("-o, --output <dir>", "Output directory")
  .option("--force", "Overwrite existing output directory without prompting")
  .option("--dry-run", "Preview files that would be generated without writing them")
  // Project metadata
  .option("-n, --name <name>", "Project name", "my-app")
  .option("-v, --version <version>", "Project version", "1.0.0")
  .option("-d, --description <desc>", "Project description", "Generated application")
  // Stack & database
  .option("-s, --stack <stack>", "Stack: tanstackjs-nestjs", "tanstackjs-nestjs")
  .option("--db <type>", "Database type: postgresql | sqlite", "postgresql")
  // Ports & URLs
  .option("--port <port>", "Backend port", "3000")
  .option("--frontend-port <port>", "Frontend dev-server port (default: backend port + 1)")
  .option("--api-url <url>", "Backend API URL used by the frontend (overrides --port default)")
  .option("--cors-origin <origin>", "CORS allowed origin (default: http://localhost:<frontend-port>)")
  // Frontend options
  .option("--dark-mode", "Enable dark mode in the generated frontend")
  // Backend options
  .option("--no-swagger", "Disable Swagger / OpenAPI UI in the backend")
  .option("--no-cors", "Disable CORS in the backend")
  // Scope
  .option("--skip-frontend", "Generate backend only (shorthand for generate:backend)")
  .option("--skip-backend", "Generate frontend only (shorthand for generate:frontend)")
  // Package manager
  .option("--package-manager <pm>", "Package manager: bun | npm | pnpm | yarn", "bun")
  // Output verbosity
  .option("--verbose", "Print each file as it is written")
  .option("--quiet", "Suppress all non-error output")
  .action(async (options) => {
    const quiet: boolean = !!options.quiet;

    if (!quiet) {
      console.log("\n🚀 ERDwithAI Code Generator");
      console.log("═══════════════════════════════════════════\n");
    }

    try {
      // ── Input validation ────────────────────────────────────────────────
      const isMultiFileMode = options.sysFile || options.busFile || options.refFile;

      if (isMultiFileMode && options.input) {
        throw new Error(
          "Cannot combine --input with --sys-file / --bus-file / --ref-file. Use one or the other."
        );
      }
      if (!isMultiFileMode && !options.input) {
        throw new Error(
          "Specify --input <file> or at least one of --sys-file / --bus-file / --ref-file."
        );
      }

      // ── Parse ERD ───────────────────────────────────────────────────────
      let allEntities: Entity[] = [];
      let allRelationships: Relationship[] = [];

      if (isMultiFileMode) {
        for (const [flag, label] of [
          [options.sysFile, "sys_"],
          [options.busFile, "bus_"],
          [options.refFile, "REF_"],
        ] as [string | undefined, string][]) {
          if (!flag) continue;
          log(`📄 Reading ${label} entities from: ${resolvePath(flag)}`, quiet);
          const { entities, relationships } = await parseFile(flag);
          allEntities.push(...entities);
          allRelationships.push(...relationships);
          log(`   ✓ Parsed ${entities.length} ${label} entities`, quiet);
        }
        log(`   ✓ Total: ${allEntities.length} entities, ${allRelationships.length} relationships`, quiet);
      } else {
        const inputPath = resolvePath(options.input);
        log(`📄 Reading ERD from: ${inputPath}`, quiet);
        const { entities, relationships } = await parseFile(options.input);
        allEntities = entities;
        allRelationships = relationships;
        log(`   ✓ Parsed ${entities.length} entities, ${relationships.length} relationships`, quiet);
      }

      // ── Entity summary ──────────────────────────────────────────────────
      if (!quiet) {
        console.log("\n📊 Entities found:");
        for (const e of allEntities) {
          console.log(`   • ${e.name} (${e.attributes.length} attributes)`);
        }
      }

      // ── Stack validation ────────────────────────────────────────────────
      const stackOption = options.stack as StackOption;
      if (!["tanstackjs-nestjs"].includes(stackOption)) {
        throw new Error('Invalid stack. Use "tanstackjs-nestjs"');
      }

      // ── Port / URL resolution ───────────────────────────────────────────
      const backendPort = parseInt(options.port, 10);
      const frontendPort = options.frontendPort
        ? parseInt(options.frontendPort, 10)
        : backendPort + 1;
      const apiUrl = options.apiUrl || `http://localhost:${backendPort}`;
      const corsOrigin = options.corsOrigin || `http://localhost:${frontendPort}`;

      // ── Output directory ────────────────────────────────────────────────
      const outputDir = resolvePath(options.output);

      if (!options.dryRun) {
        const hasContent = await outputDirHasContent(outputDir);
        if (hasContent && !options.force) {
          throw new Error(
            `Output directory "${outputDir}" already contains files.\n` +
            `  Use --force to overwrite, or choose a different --output path.`
          );
        }
        await fs.mkdir(outputDir, { recursive: true });
      }

      // ── Configuration summary ───────────────────────────────────────────
      if (!quiet) {
        console.log("\n⚙️  Generation Configuration:");
        console.log(`   • Stack:            ${getStackDescription(stackOption)}`);
        console.log(`   • Project:          ${options.name} v${options.version}`);
        console.log(`   • Database:         ${options.db}`);
        console.log(`   • Backend port:     ${backendPort}`);
        console.log(`   • Frontend port:    ${frontendPort}`);
        console.log(`   • API URL:          ${apiUrl}`);
        console.log(`   • CORS origin:      ${corsOrigin}`);
        console.log(`   • Dark mode:        ${options.darkMode ? "yes" : "no"}`);
        console.log(`   • Swagger:          ${options.swagger !== false ? "yes" : "no"}`);
        console.log(`   • Package manager:  ${options.packageManager}`);
        console.log(`   • Output:           ${outputDir}`);
        if (options.dryRun) console.log("   • Mode:             DRY RUN (no files written)");
        if (options.skipFrontend) console.log("   • Scope:            backend only");
        if (options.skipBackend) console.log("   • Scope:            frontend only");
      }

      // ── Dry-run: list expected output files from templates ──────────────
      if (options.dryRun) {
        console.log("\n📂 Files that would be generated:\n");
        const templateRoot = path.resolve(__dirname, "../../templates/tanstack-start-nestjs");
        await listTemplateFiles(templateRoot, "", options.skipFrontend, options.skipBackend);
        console.log("\n✅ Dry run complete — no files were written.");
        return;
      }

      // ── Generate ────────────────────────────────────────────────────────
      log("\n📦 Generating application...\n", quiet);

      const generator = new FullStackGenerator({
        stackOption,
        projectName: options.name,
        projectVersion: options.version,
        projectDescription: options.description,
        outputDir,
        port: backendPort,
        tanstackStartNestjs:
          stackOption === "tanstackjs-nestjs"
            ? {
                backend: {
                  databaseType: options.db as "postgresql" | "sqlite",
                  port: backendPort,
                  enableSwagger: options.swagger !== false,
                  enableCors: options.cors !== false,
                },
                frontend: {
                  apiBaseUrl: apiUrl,
                  enableDarkMode: !!options.darkMode,
                },
              }
            : undefined,
        skipFrontend: !!options.skipFrontend,
        skipBackend: !!options.skipBackend,
      });

      await generator.generate(allEntities, allRelationships);

      // ── Save manifest ───────────────────────────────────────────────────
      await writeManifest(outputDir, {
        name: options.name,
        version: options.version,
        description: options.description,
        stack: stackOption,
        database: options.db,
        input: options.input || { sysFile: options.sysFile, busFile: options.busFile, refFile: options.refFile },
        backendPort,
        frontendPort,
        apiUrl,
        entities: allEntities.map((e) => e.name),
        packageManager: options.packageManager,
      });

      // ── Success ─────────────────────────────────────────────────────────
      if (!quiet) {
        const pm = options.packageManager;
        console.log("\n═══════════════════════════════════════════");
        console.log("✅ Generation complete!\n");
        console.log("Next steps:");
        console.log(`   1. cd ${outputDir}`);
        console.log(`   2. ${pm} install`);
        console.log("   3. cp backend/.env.example backend/.env");
        console.log(`   4. ${pm} run db:migrate`);
        console.log(`   5. ${pm} run db:seed`);
        console.log(`   6. ${pm} run dev\n`);
      }
    } catch (error: unknown) {
      console.error("\n❌ Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// inspect — parse and display ERD without generating
// ---------------------------------------------------------------------------

program
  .command("inspect")
  .description("Parse an ERD / EML file and display entities, relationships and statistics")
  .argument("<file>", "Mermaid ERD or EML file to inspect")
  .option("-f, --format <format>", "Output format: table | json | tree", "table")
  .action(async (file, options) => {
    try {
      const { entities, relationships } = await parseFile(file);

      if (options.format === "json") {
        console.log(JSON.stringify({ entities, relationships }, null, 2));
        return;
      }

      console.log("\n🔍 ERD Inspection Report");
      console.log("═══════════════════════════════════════════\n");

      // Entities table
      console.log(`📊 Entities (${entities.length})\n`);
      const header = padRow(["Entity", "Table", "PK", "Attributes", "FKs", "Unique"]);
      console.log(header);
      console.log("─".repeat(header.length));
      for (const e of entities) {
        const fks = e.attributes.filter((a) => a.name.endsWith("_id") && a.name !== "id").length;
        const uniq = e.attributes.filter((a) => a.unique && a.name !== "id").length;
        console.log(padRow([
          e.name,
          `bus_${e.tableName}`,
          e.primaryKey ?? "id",
          String(e.attributes.length),
          String(fks),
          String(uniq),
        ]));
      }

      // Relationships
      if (relationships.length > 0) {
        console.log(`\n🔗 Relationships (${relationships.length})\n`);
        const relHeader = padRow(["From", "Cardinality", "To", "Via"]);
        console.log(relHeader);
        console.log("─".repeat(relHeader.length));
        for (const r of relationships) {
          console.log(padRow([
            r.sourceEntity,
            cardinalityLabel(r.cardinality),
            r.targetEntity,
            r.foreignKey ?? "",
          ]));
        }
      }

      // Statistics
      const totalAttrs = entities.reduce((s, e) => s + e.attributes.length, 0);
      const totalFKs = entities.reduce(
        (s, e) => s + e.attributes.filter((a) => a.name.endsWith("_id") && a.name !== "id").length,
        0
      );
      console.log("\n📈 Statistics");
      console.log(`   • Total entities:      ${entities.length}`);
      console.log(`   • Total attributes:    ${totalAttrs}`);
      console.log(`   • Total relationships: ${relationships.length}`);
      console.log(`   • Total FK columns:    ${totalFKs}`);
      console.log(`   • Avg attrs/entity:    ${(totalAttrs / Math.max(entities.length, 1)).toFixed(1)}\n`);

      if (options.format === "tree") {
        console.log("🌳 Entity Tree\n");
        for (const e of entities) {
          console.log(`  ${e.name}`);
          for (const a of e.attributes) {
            const flags = [
              a.name === e.primaryKey ? "PK" : "",
              a.name.endsWith("_id") && a.name !== "id" ? "FK" : "",
              a.unique && a.name !== "id" ? "UK" : "",
              a.required ? "" : "optional",
            ].filter(Boolean);
            console.log(`    ├─ ${a.name} : ${a.type}${flags.length ? ` [${flags.join(", ")}]` : ""}`);
          }
        }
        console.log();
      }
    } catch (error: unknown) {
      console.error("❌ Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// validate — check ERD for common problems
// ---------------------------------------------------------------------------

program
  .command("validate")
  .description("Validate an ERD / EML file for structural correctness")
  .argument("<file>", "Mermaid ERD or EML file to validate")
  .option("--strict", "Fail on warnings in addition to errors")
  .action(async (file, options) => {
    try {
      const { entities, relationships } = await parseFile(file);

      const errors: string[] = [];
      const warnings: string[] = [];

      const entityNames = new Set(entities.map((e) => e.name));

      // Duplicate entity names
      const seen = new Set<string>();
      for (const e of entities) {
        if (seen.has(e.name)) errors.push(`Duplicate entity name: "${e.name}"`);
        else seen.add(e.name);
      }

      // Each entity must have at least one attribute
      for (const e of entities) {
        if (e.attributes.length === 0) {
          errors.push(`Entity "${e.name}" has no attributes`);
        }
      }

      // Every FK field should reference a real entity
      for (const e of entities) {
        for (const a of e.attributes) {
          if (a.name.endsWith("_id") && a.name !== "id") {
            const referencedEntity = a.name.replace(/_id$/, "");
            const exists = [...entityNames].some(
              (n) => n.toLowerCase() === referencedEntity.toLowerCase()
            );
            if (!exists) {
              warnings.push(
                `Entity "${e.name}": FK column "${a.name}" — no entity named "${referencedEntity}" found`
              );
            }
          }
        }
      }

      // Relationship source/target must exist
      for (const r of relationships) {
        if (!entityNames.has(r.sourceEntity)) {
          errors.push(`Relationship source "${r.sourceEntity}" is not a known entity`);
        }
        if (!entityNames.has(r.targetEntity)) {
          errors.push(`Relationship target "${r.targetEntity}" is not a known entity`);
        }
      }

      // Self-referencing relationships
      for (const r of relationships) {
        if (r.sourceEntity === r.targetEntity) {
          warnings.push(`Self-referencing relationship on entity "${r.sourceEntity}"`);
        }
      }

      // Entities with no relationships
      const entitiesInRelationships = new Set([
        ...relationships.map((r) => r.sourceEntity),
        ...relationships.map((r) => r.targetEntity),
      ]);
      for (const e of entities) {
        if (!entitiesInRelationships.has(e.name)) {
          warnings.push(`Entity "${e.name}" has no relationships (isolated entity)`);
        }
      }

      // Report
      console.log("\n✅ ERD Validation Report");
      console.log("═══════════════════════════════════════════\n");
      console.log(`   File:     ${resolvePath(file)}`);
      console.log(`   Entities: ${entities.length}`);
      console.log(`   Rels:     ${relationships.length}\n`);

      if (errors.length === 0 && warnings.length === 0) {
        console.log("✅ No issues found — ERD is valid.\n");
        return;
      }

      if (errors.length > 0) {
        console.log(`❌ Errors (${errors.length}):`);
        for (const e of errors) console.log(`   • ${e}`);
        console.log();
      }

      if (warnings.length > 0) {
        console.log(`⚠️  Warnings (${warnings.length}):`);
        for (const w of warnings) console.log(`   • ${w}`);
        console.log();
      }

      if (errors.length > 0 || (options.strict && warnings.length > 0)) {
        process.exit(1);
      }
    } catch (error: unknown) {
      console.error("❌ Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// diff — compare two ERD / EML files
// ---------------------------------------------------------------------------

program
  .command("diff")
  .description("Compare two ERD / EML files and report what changed")
  .argument("<from>", "Original ERD file")
  .argument("<to>", "Updated ERD file")
  .option("--no-attributes", "Show only entity-level diffs (skip attribute details)")
  .action(async (fromFile, toFile, options) => {
    try {
      const [fromParsed, toParsed] = await Promise.all([parseFile(fromFile), parseFile(toFile)]);

      const fromMap = new Map(fromParsed.entities.map((e) => [e.name, e]));
      const toMap = new Map(toParsed.entities.map((e) => [e.name, e]));

      const added = [...toMap.keys()].filter((n) => !fromMap.has(n));
      const removed = [...fromMap.keys()].filter((n) => !toMap.has(n));
      const common = [...fromMap.keys()].filter((n) => toMap.has(n));

      console.log("\n🔀 ERD Diff");
      console.log("═══════════════════════════════════════════\n");
      console.log(`   From: ${resolvePath(fromFile)}`);
      console.log(`   To:   ${resolvePath(toFile)}\n`);

      if (added.length === 0 && removed.length === 0) {
        let hasAttrChanges = false;
        if (options.attributes) {
          for (const name of common) {
            const attrDiffs = diffAttributes(fromMap.get(name)!, toMap.get(name)!);
            if (attrDiffs.length > 0) { hasAttrChanges = true; break; }
          }
        }
        if (!hasAttrChanges) {
          console.log("✅ No entity changes detected.\n");
        }
      }

      for (const name of added) {
        const e = toMap.get(name)!;
        console.log(`  + [ADDED]   ${name} (${e.attributes.length} attrs)`);
        if (options.attributes) {
          for (const a of e.attributes) console.log(`      + ${a.name}: ${a.type}`);
        }
      }

      for (const name of removed) {
        const e = fromMap.get(name)!;
        console.log(`  - [REMOVED] ${name} (${e.attributes.length} attrs)`);
      }

      for (const name of common) {
        const fromEntity = fromMap.get(name)!;
        const toEntity = toMap.get(name)!;
        if (!options.attributes) continue;
        const attrDiffs = diffAttributes(fromEntity, toEntity);
        if (attrDiffs.length === 0) continue;
        console.log(`  ~ [CHANGED] ${name}`);
        for (const d of attrDiffs) console.log(`    ${d}`);
      }

      // Relationship diffs
      const fromRels = new Set(fromParsed.relationships.map((r) => `${r.sourceEntity}->${r.targetEntity}`));
      const toRels = new Set(toParsed.relationships.map((r) => `${r.sourceEntity}->${r.targetEntity}`));
      const addedRels = [...toRels].filter((r) => !fromRels.has(r));
      const removedRels = [...fromRels].filter((r) => !toRels.has(r));

      if (addedRels.length > 0 || removedRels.length > 0) {
        console.log("\n  Relationship changes:");
        for (const r of addedRels) console.log(`    + ${r}`);
        for (const r of removedRels) console.log(`    - ${r}`);
      }

      console.log(
        `\n  Summary: +${added.length} added, -${removed.length} removed, ` +
        `~${common.length - (common.length - added.length)} unchanged entities\n`
      );
    } catch (error: unknown) {
      console.error("❌ Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// info — read .erdwithai.json manifest from a generated project
// ---------------------------------------------------------------------------

program
  .command("info")
  .description("Show metadata about a previously generated project")
  .argument("<dir>", "Path to a generated project directory")
  .action(async (dir) => {
    try {
      const manifestPath = path.join(resolvePath(dir), ".erdwithai.json");
      const raw = await fs.readFile(manifestPath, "utf-8");
      const meta = JSON.parse(raw);

      console.log("\n📋 Generated Project Info");
      console.log("═══════════════════════════════════════════\n");
      console.log(`   Name:          ${meta.name ?? "—"}`);
      console.log(`   Version:       ${meta.version ?? "—"}`);
      console.log(`   Description:   ${meta.description ?? "—"}`);
      console.log(`   Stack:         ${meta.stack ?? "—"}`);
      console.log(`   Database:      ${meta.database ?? "—"}`);
      console.log(`   Backend port:  ${meta.backendPort ?? "—"}`);
      console.log(`   Frontend port: ${meta.frontendPort ?? "—"}`);
      console.log(`   API URL:       ${meta.apiUrl ?? "—"}`);
      console.log(`   Package mgr:   ${meta.packageManager ?? "—"}`);
      console.log(`   Generated at:  ${meta.generatedAt ?? "—"}`);
      if (meta.entities?.length) {
        console.log(`   Entities:      ${(meta.entities as string[]).join(", ")}`);
      }
      if (meta.input) {
        const inp = typeof meta.input === "string" ? meta.input : JSON.stringify(meta.input);
        console.log(`   Input:         ${inp}`);
      }
      console.log();
    } catch {
      console.error(`❌ No .erdwithai.json found in "${dir}". Was this project generated by erdwithai?`);
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// generate:backend — backend-only generation
// ---------------------------------------------------------------------------

program
  .command("generate:backend")
  .description("Generate backend only")
  .requiredOption("-i, --input <file>", "Input Mermaid ERD file")
  .requiredOption("-o, --output <dir>", "Output directory")
  .option("-n, --name <name>", "Project name", "my-backend")
  .option("-s, --stack <stack>", "Backend stack: nestjs", "nestjs")
  .option("--db <type>", "Database type: postgresql | sqlite", "postgresql")
  .option("--port <port>", "Backend port", "3000")
  .option("--no-swagger", "Disable Swagger UI")
  .option("--no-cors", "Disable CORS")
  .option("--cors-origin <origin>", "CORS allowed origin")
  .option("--force", "Overwrite existing output directory")
  .action(async (options) => {
    console.log("\n🚀 Generating Backend...\n");

    try {
      const { entities, relationships } = await parseFile(options.input);
      const outputDir = resolvePath(options.output);

      const hasContent = await outputDirHasContent(outputDir);
      if (hasContent && !options.force) {
        throw new Error(`Output dir "${outputDir}" already has content. Use --force to overwrite.`);
      }
      await fs.mkdir(outputDir, { recursive: true });

      if (options.stack === "nestjs") {
        const generator = new NestJsBackendGenerator({
          projectName: options.name,
          projectVersion: "1.0.0",
          projectDescription: "Generated NestJS backend",
          databaseType: options.db,
          port: parseInt(options.port, 10),
          enableSwagger: options.swagger !== false,
          enableCors: options.cors !== false,
        });
        await generator.generate(entities, relationships, outputDir);
      } else {
        throw new Error('Invalid backend stack. Use "nestjs"');
      }

      console.log(`\n✅ Backend generated at: ${outputDir}\n`);
    } catch (error: unknown) {
      console.error("\n❌ Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// generate:frontend — frontend-only generation
// ---------------------------------------------------------------------------

program
  .command("generate:frontend")
  .description("Generate frontend only")
  .requiredOption("-i, --input <file>", "Input Mermaid ERD file")
  .requiredOption("-o, --output <dir>", "Output directory")
  .option("-n, --name <name>", "Project name", "my-frontend")
  .option("-s, --stack <stack>", "Frontend stack: tanstack", "tanstack")
  .option("--api-url <url>", "Backend API URL", "http://localhost:3000")
  .option("--dark-mode", "Enable dark mode")
  .option("--force", "Overwrite existing output directory")
  .action(async (options) => {
    console.log("\n🚀 Generating Frontend...\n");

    try {
      const { entities, relationships } = await parseFile(options.input);
      const outputDir = resolvePath(options.output);

      const hasContent = await outputDirHasContent(outputDir);
      if (hasContent && !options.force) {
        throw new Error(`Output dir "${outputDir}" already has content. Use --force to overwrite.`);
      }
      await fs.mkdir(outputDir, { recursive: true });

      if (options.stack === "tanstack") {
        const generator = new TanStackStartFrontendGenerator({
          projectName: options.name,
          projectVersion: "1.0.0",
          projectDescription: "Generated TanStack Start frontend",
          apiBaseUrl: options.apiUrl,
          enableDarkMode: !!options.darkMode,
        });
        await generator.generate(entities, relationships, outputDir);
      } else {
        throw new Error('Invalid frontend stack. Use "tanstack"');
      }

      console.log(`\n✅ Frontend generated at: ${outputDir}\n`);
    } catch (error: unknown) {
      console.error("\n❌ Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// wizard — interactive project generation wizard
// ---------------------------------------------------------------------------

program
  .command("wizard")
  .description("Interactive guided project generation wizard")
  .action(async () => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (prompt: string): Promise<string> =>
      new Promise((resolve) => rl.question(prompt, resolve));

    console.log("\n🧙 ERDwithAI Project Wizard");
    console.log("═══════════════════════════════════════════\n");

    try {
      const name = (await ask("Project name [my-app]: ")) || "my-app";
      const description = (await ask("Description [Generated application]: ")) || "Generated application";
      const inputFile = await ask("ERD / EML file path: ");
      if (!inputFile) throw new Error("ERD file path is required.");
      const outputDir = (await ask("Output directory [./generated]: ")) || "./generated";

      console.log("\nSelect database:");
      console.log("  1. PostgreSQL (recommended for production)");
      console.log("  2. SQLite (for development / testing)");
      const dbChoice = (await ask("Choice [1]: ")) || "1";
      const db = dbChoice === "2" ? "sqlite" : "postgresql";

      const portStr = (await ask("Backend port [3000]: ")) || "3000";
      const port = parseInt(portStr, 10);
      const frontendPortStr = (await ask(`Frontend port [${port + 1}]: `)) || String(port + 1);

      const darkModeInput = (await ask("Enable dark mode? [y/N]: ")).toLowerCase();
      const darkMode = darkModeInput === "y" || darkModeInput === "yes";

      const swaggerInput = (await ask("Enable Swagger UI? [Y/n]: ")).toLowerCase();
      const noSwagger = swaggerInput === "n" || swaggerInput === "no";

      console.log("\nSelect package manager:");
      console.log("  1. bun (recommended)");
      console.log("  2. npm");
      console.log("  3. pnpm");
      console.log("  4. yarn");
      const pmChoice = (await ask("Choice [1]: ")) || "1";
      const pmMap: Record<string, string> = { "1": "bun", "2": "npm", "3": "pnpm", "4": "yarn" };
      const packageManager = pmMap[pmChoice] ?? "bun";

      rl.close();
      console.log("\n📦 Generating project...\n");

      const args = [
        "generate",
        "-i", inputFile,
        "-o", outputDir,
        "-n", name,
        "-d", description,
        "--db", db,
        "--port", portStr,
        "--frontend-port", frontendPortStr,
        "--package-manager", packageManager,
        "--force",
      ];
      if (darkMode) args.push("--dark-mode");
      if (noSwagger) args.push("--no-swagger");

      await program.parseAsync(["node", "erdwithai", ...args]);
    } catch (error: unknown) {
      rl.close();
      console.error("\n❌ Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// list — show available stacks and features
// ---------------------------------------------------------------------------

program
  .command("list")
  .description("List available stacks, themes and options")
  .action(() => {
    console.log("\n📋 ERDwithAI — Available Options\n");
    console.log("═══════════════════════════════════════════\n");

    console.log("🔷 Stack\n");
    console.log("  tanstackjs-nestjs   Modern Web Stack");
    console.log("    Backend:   NestJS 10 + Fastify + Kysely + PostgreSQL/SQLite");
    console.log("    Frontend:  TanStack Start v1 + Shadcn UI + TanStack Query/Table");
    console.log("    Auth:      better-auth (session-based)");
    console.log("    Best for:  Modern web apps, SPAs, real-time dashboards\n");

    console.log("🗄️  Databases\n");
    console.log("  postgresql     — Production-grade (default)");
    console.log("  sqlite         — Zero-config for development\n");

    console.log("📦 Package Managers\n");
    console.log("  bun (default), npm, pnpm, yarn\n");

    console.log("🔑 Key Features\n");
    console.log("  • Compiere-style Application Dictionary (sys_ tables)");
    console.log("  • Business entities with bus_ prefix");
    console.log("  • Runtime UI configuration via sys_field.seq_no");
    console.log("  • GoRules JDM decision-table business rules engine");
    console.log("  • Workflow definitions + BPMN executor");
    console.log("  • Audit trail (ImmuDB-backed)");
    console.log("  • Role-based access control (RBAC)");
    console.log("  • ETag-based optimistic concurrency");
    console.log("  • E2E test suite (Playwright)\n");

    console.log("🛠️  CLI Commands\n");
    console.log("  generate          Full-stack generation");
    console.log("  generate:backend  Backend only");
    console.log("  generate:frontend Frontend only");
    console.log("  inspect <file>    Parse & display ERD");
    console.log("  validate <file>   Validate ERD for errors");
    console.log("  diff <a> <b>      Compare two ERD files");
    console.log("  info <dir>        Show generated project metadata");
    console.log("  wizard            Interactive guided wizard\n");
  });

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

function padRow(cols: string[]): string {
  const widths = [22, 26, 8, 12, 6, 8];
  return cols.map((c, i) => c.padEnd(widths[i] ?? 10)).join(" ");
}

function cardinalityLabel(c: string): string {
  const map: Record<string, string> = {
    oneToOne: "||--||",
    oneToMany: "||--o{",
    manyToOne: "}o--||",
    manyToMany: "}o--o{",
  };
  return map[c] ?? c;
}

function diffAttributes(from: Entity, to: Entity): string[] {
  const fromMap = new Map(from.attributes.map((a) => [a.name, a]));
  const toMap = new Map(to.attributes.map((a) => [a.name, a]));
  const diffs: string[] = [];
  for (const [name, attr] of toMap) {
    if (!fromMap.has(name)) diffs.push(`    + ${name}: ${attr.type}`);
    else if (fromMap.get(name)!.type !== attr.type)
      diffs.push(`    ~ ${name}: ${fromMap.get(name)!.type} → ${attr.type}`);
  }
  for (const name of fromMap.keys()) {
    if (!toMap.has(name)) diffs.push(`    - ${name}`);
  }
  return diffs;
}

async function listTemplateFiles(
  dir: string,
  prefix: string,
  skipFrontend?: boolean,
  skipBackend?: boolean
): Promise<void> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (skipFrontend && rel.startsWith("frontend")) continue;
      if (skipBackend && rel.startsWith("backend")) continue;
      if (entry.isDirectory()) {
        console.log(`  📁 ${rel}/`);
        await listTemplateFiles(path.join(dir, entry.name), rel, skipFrontend, skipBackend);
      } else {
        const displayName = entry.name.endsWith(".hbs")
          ? entry.name.slice(0, -4)
          : entry.name;
        console.log(`     ${displayName}`);
      }
    }
  } catch {
    // directory may not exist for this stack variant
  }
}

// ---------------------------------------------------------------------------
program.parse();
export { program };
