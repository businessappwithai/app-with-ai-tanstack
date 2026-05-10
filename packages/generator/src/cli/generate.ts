#!/usr/bin/env node

/**
 * ERDwithAI Code Generator CLI
 *
 * Generates full-stack applications from Mermaid ERD diagrams.
 * Supports two stack options:
 * - tanstackjs-nestjs: TanStack Start + NestJS (Modern Web)
 * - openui5-odatav4: OData + OpenUI5 (Enterprise SAP)
 *
 * Features:
 * - Compiere-style Application Dictionary (sys_ tables)
 * - Runtime UI configuration via sys_field.seq_no
 * - bus_ prefixed business entity tables
 */

import type { Entity, Relationship } from "@erdwithai/core/types";
import { Command } from "commander";
import { promises as fs } from "fs";
import * as path from "path";
import * as readline from "readline";
import { FullStackGenerator, type StackOption } from "../generators/full-stack.generator";
import { NestJsBackendGenerator } from "../generators/tanstack-start-nestjs/nestjs-backend.generator";
import { TanStackStartFrontendGenerator } from "../generators/tanstack-start-nestjs/tanstack-start-frontend.generator";
import { ODataBackendGenerator } from "../generators/openui5-odatav4/odata-backend.generator";
import { OpenUI5FrontendGenerator } from "../generators/openui5-odatav4/openui5-frontend.generator";
import { MermaidParser } from "../parsers/mermaid.parser";

// When run via `bun --filter`, cwd is the package directory but INIT_CWD is
// the workspace root where the user invoked bun. Use INIT_CWD so that relative
// paths in --input / --output are resolved from the user's working directory.
const resolvePath = (p: string) =>
  path.isAbsolute(p) ? p : path.resolve(process.env.INIT_CWD || process.cwd(), p);

const program = new Command();

program
  .name("erdwithai")
  .description("Generate full-stack applications from ERD diagrams")
  .version("5.1.0");

/**
 * Main generate command
 */
program
  .command("generate")
  .description("Generate a full-stack application from Mermaid ERD")
  .option("-i, --input <file>", "Input Mermaid ERD file (single file mode)")
  .option("--sys-file <file>", "System entities mermaid file (sys_ tables)")
  .option("--bus-file <file>", "Business entities mermaid file (bus_ tables)")
  .option("--ref-file <file>", "Reference entities mermaid file (REF_ tables)")
  .requiredOption("-o, --output <dir>", "Output directory")
  .option("-n, --name <name>", "Project name", "my-app")
  .option("-v, --version <version>", "Project version", "1.0.0")
  .option("-d, --description <desc>", "Project description", "Generated application")
  .option(
    "-s, --stack <stack>",
    "Stack option: tanstackjs-nestjs (TanStack Start+NestJS) or openui5-odatav4 (OData+OpenUI5)",
    "tanstackjs-nestjs"
  )
  .option("--db <type>", "Database type: postgresql or sqlite", "postgresql")
  .option("--port <port>", "Backend port", "3000")
  .option("--no-interactive", "Skip interactive prompts")
  .action(async (options) => {
    console.log("\n🚀 ERDwithAI Code Generator");
    console.log("═══════════════════════════════════════════\n");

    try {
      // Determine if using single file or multiple files mode
      const isMultiFileMode = options.sysFile || options.busFile || options.refFile;

      if (isMultiFileMode && options.input) {
        throw new Error(
          "Cannot use both --input and separate file options (--sys-file, --bus-file, --ref-file). Use one or the other."
        );
      }

      if (!isMultiFileMode && !options.input) {
        throw new Error(
          "Either --input or at least one of --sys-file, --bus-file, --ref-file must be specified."
        );
      }

      let allEntities: Entity[] = [];
      let allRelationships: Relationship[] = [];

      if (isMultiFileMode) {
        // Multi-file mode: parse each file separately
        const parser = new MermaidParser();

        // Parse sys_ file if provided
        if (options.sysFile) {
          const sysPath = resolvePath(options.sysFile);
          await fs.access(sysPath);
          console.log(`📄 Reading system entities from: ${sysPath}`);
          const sysContent = await fs.readFile(sysPath, "utf-8");
          const { entities: sysEntities, relationships: sysRelationships } =
            parser.parse(sysContent);
          allEntities.push(...sysEntities);
          allRelationships.push(...sysRelationships);
          console.log(`   ✓ Parsed ${sysEntities.length} sys_ entities`);
        }

        // Parse bus_ file if provided
        if (options.busFile) {
          const busPath = resolvePath(options.busFile);
          await fs.access(busPath);
          console.log(`📄 Reading business entities from: ${busPath}`);
          const busContent = await fs.readFile(busPath, "utf-8");
          const { entities: busEntities, relationships: busRelationships } =
            parser.parse(busContent);
          allEntities.push(...busEntities);
          allRelationships.push(...busRelationships);
          console.log(`   ✓ Parsed ${busEntities.length} bus_ entities`);
        }

        // Parse REF_ file if provided
        if (options.refFile) {
          const refPath = resolvePath(options.refFile);
          await fs.access(refPath);
          console.log(`📄 Reading reference entities from: ${refPath}`);
          const refContent = await fs.readFile(refPath, "utf-8");
          const { entities: refEntities, relationships: refRelationships } =
            parser.parse(refContent);
          allEntities.push(...refEntities);
          allRelationships.push(...refRelationships);
          console.log(`   ✓ Parsed ${refEntities.length} REF_ entities`);
        }

        console.log(
          `   ✓ Total: ${allEntities.length} entities, ${allRelationships.length} relationships`
        );
      } else {
        // Single file mode: parse one combined file
        const inputPath = resolvePath(options.input);
        await fs.access(inputPath);

        console.log(`📄 Reading ERD from: ${inputPath}`);
        const erdContent = await fs.readFile(inputPath, "utf-8");

        const parser = new MermaidParser();
        const { entities, relationships } = parser.parse(erdContent);
        allEntities = entities;
        allRelationships = relationships;

        console.log(`   ✓ Parsed ${entities.length} entities`);
        console.log(`   ✓ Parsed ${relationships.length} relationships`);
      }

      // Display parsed entities
      console.log("\n📊 Entities found:");
      allEntities.forEach((e) => {
        console.log(`   • ${e.name} (${e.attributes.length} attributes)`);
      });

      // Validate stack option
      const stackOption = options.stack as StackOption;
      if (!["tanstackjs-nestjs", "openui5-odatav4"].includes(stackOption)) {
        throw new Error('Invalid stack option. Use "tanstackjs-nestjs" or "openui5-odatav4"');
      }

      // Create output directory
      const outputDir = resolvePath(options.output);
      await fs.mkdir(outputDir, { recursive: true });

      // Display generation info
      console.log("\n⚙️  Generation Configuration:");
      console.log(`   • Stack: ${getStackDescription(stackOption)}`);
      console.log(`   • Project: ${options.name} v${options.version}`);
      console.log(`   • Database: ${options.db}`);
      console.log(`   • Output: ${outputDir}`);

      // Generate full-stack application
      console.log("\n📦 Generating application...\n");

      const generator = new FullStackGenerator({
        stackOption,
        projectName: options.name,
        projectVersion: options.version,
        projectDescription: options.description,
        outputDir,
        port: parseInt(options.port, 10),
        tanstackStartNestjs:
          stackOption === "tanstackjs-nestjs"
            ? {
                backend: {
                  databaseType: options.db as "postgresql" | "sqlite",
                  port: parseInt(options.port, 10),
                  enableSwagger: true,
                  enableCors: true,
                },
                frontend: {
                  apiBaseUrl: `http://localhost:${options.port}`,
                  enableDarkMode: true,
                },
              }
            : undefined,
        openui5Odatav4:
          stackOption === "openui5-odatav4"
            ? {
                backend: {
                  databaseType: options.db as "postgresql" | "sqlite",
                  port: parseInt(options.port, 10),
                  odataPath: "/odata",
                },
                frontend: {
                  odataBaseUrl: `http://localhost:${options.port}`,
                  ui5Theme: "sap_horizon",
                },
              }
            : undefined,
      });

      await generator.generate(allEntities, allRelationships);

      // Display success message
      console.log("\n═══════════════════════════════════════════");
      console.log("✅ Generation complete!\n");
      console.log("Next steps:");
      console.log(`   1. cd ${outputDir}`);
      console.log("   2. npm install");
      console.log("   3. cp backend/.env.example backend/.env");
      console.log("   4. npm run db:migrate");
      console.log("   5. npm run db:seed");
      console.log("   6. npm run dev\n");
    } catch (error: unknown) {
      console.error("\n❌ Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Backend-only generation command
 */
program
  .command("generate:backend")
  .description("Generate backend only")
  .requiredOption("-i, --input <file>", "Input Mermaid ERD file")
  .requiredOption("-o, --output <dir>", "Output directory")
  .option("-n, --name <name>", "Project name", "my-backend")
  .option("-s, --stack <stack>", "Backend stack: nestjs or odata", "nestjs")
  .option("--db <type>", "Database type: postgresql or sqlite", "postgresql")
  .option("--port <port>", "Backend port", "3000")
  .action(async (options) => {
    console.log("\n🚀 Generating Backend...\n");

    try {
      const inputPath = path.resolve(options.input);
      const erdContent = await fs.readFile(inputPath, "utf-8");

      const parser = new MermaidParser();
      const { entities, relationships } = parser.parse(erdContent);

      const outputDir = resolvePath(options.output);
      await fs.mkdir(outputDir, { recursive: true });

      if (options.stack === "nestjs") {
        const generator = new NestJsBackendGenerator({
          projectName: options.name,
          projectVersion: "1.0.0",
          projectDescription: "Generated NestJS backend",
          databaseType: options.db,
          port: parseInt(options.port, 10),
          enableSwagger: true,
          enableCors: true,
        });
        await generator.generate(entities, relationships, outputDir);
      } else if (options.stack === "odata") {
        const generator = new ODataBackendGenerator({
          projectName: options.name,
          projectVersion: "1.0.0",
          projectDescription: "Generated OData backend",
          databaseType: options.db,
          port: parseInt(options.port, 10),
          odataPath: "/odata",
        });
        await generator.generate(entities, relationships, outputDir);
      } else {
        throw new Error('Invalid backend stack. Use "nestjs" or "odata"');
      }

      console.log(`\n✅ Backend generated at: ${outputDir}`);
    } catch (error: unknown) {
      console.error("\n❌ Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Frontend-only generation command
 */
program
  .command("generate:frontend")
  .description("Generate frontend only")
  .requiredOption("-i, --input <file>", "Input Mermaid ERD file")
  .requiredOption("-o, --output <dir>", "Output directory")
  .option("-n, --name <name>", "Project name", "my-frontend")
  .option("-s, --stack <stack>", "Frontend stack: tanstack or openui5", "tanstack")
  .option("--api-url <url>", "Backend API URL", "http://localhost:3000")
  .action(async (options) => {
    console.log("\n🚀 Generating Frontend...\n");

    try {
      const inputPath = path.resolve(options.input);
      const erdContent = await fs.readFile(inputPath, "utf-8");

      const parser = new MermaidParser();
      const { entities, relationships } = parser.parse(erdContent);

      const outputDir = resolvePath(options.output);
      await fs.mkdir(outputDir, { recursive: true });

      if (options.stack === "tanstack" || options.stack === "nextjs") {
        const generator = new TanStackStartFrontendGenerator({
          projectName: options.name,
          projectVersion: "1.0.0",
          projectDescription: "Generated TanStack Start frontend",
          apiBaseUrl: options.apiUrl,
          enableDarkMode: true,
        });
        await generator.generate(entities, relationships, outputDir);
      } else if (options.stack === "openui5") {
        const generator = new OpenUI5FrontendGenerator({
          projectName: options.name,
          projectVersion: "1.0.0",
          projectDescription: "Generated OpenUI5 frontend",
          odataBaseUrl: options.apiUrl,
          ui5Theme: "sap_horizon",
        });
        await generator.generate(entities, relationships, outputDir);
      } else {
        throw new Error('Invalid frontend stack. Use "tanstack" or "openui5"');
      }

      console.log(`\n✅ Frontend generated at: ${outputDir}`);
    } catch (error: unknown) {
      console.error("\n❌ Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Interactive wizard command
 */
program
  .command("wizard")
  .description("Interactive project generation wizard")
  .action(async () => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = (prompt: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(prompt, resolve);
      });
    };

    console.log("\n🧙 ERDwithAI Project Wizard");
    console.log("═══════════════════════════════════════════\n");

    try {
      // Gather project info
      const name = (await question("Project name [my-app]: ")) || "my-app";
      const description =
        (await question("Description [Generated application]: ")) || "Generated application";
      const inputFile = await question("ERD file path: ");
      const outputDir = (await question("Output directory [./generated]: ")) || "./generated";

      // Stack selection
      console.log("\nSelect your stack:");
      console.log("  1. tanstackjs-nestjs: TanStack Start + NestJS (Modern Web)");
      console.log("  2. openui5-odatav4: OData + OpenUI5 (Enterprise SAP)");
      const stackChoice = (await question("Choice [1]: ")) || "1";
      const stack = stackChoice === "2" ? "openui5-odatav4" : "tanstackjs-nestjs";

      // Database selection
      console.log("\nSelect database:");
      console.log("  1. PostgreSQL (recommended for production)");
      console.log("  2. SQLite (for development/testing)");
      const dbChoice = (await question("Choice [1]: ")) || "1";
      const db = dbChoice === "2" ? "sqlite" : "postgresql";

      rl.close();

      // Generate
      console.log("\n📦 Generating project...\n");

      const args = [
        "generate",
        "-i",
        inputFile,
        "-o",
        outputDir,
        "-n",
        name,
        "-d",
        description,
        "-s",
        stack,
        "--db",
        db,
      ];

      // Re-run with gathered options
      await program.parseAsync(["node", "erdwithai", ...args]);
    } catch (error: unknown) {
      rl.close();
      console.error("\n❌ Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * List available templates command
 */
program
  .command("list")
  .description("List available generation options")
  .action(() => {
    console.log("\n📋 Available Generation Options\n");
    console.log("═══════════════════════════════════════════\n");

    console.log("🔷 tanstackjs-nestjs: Modern Web Stack");
    console.log("   Backend:  NestJS + Fastify + Knex.js");
    console.log("   Frontend: TanStack Start + Shadcn UI + TanStack Query/Table/Form");
    console.log("   Best for: Modern web applications, SPAs\n");

    console.log("🔶 openui5-odatav4: Enterprise SAP Stack");
    console.log("   Backend:  OData V4 Server (jaystack)");
    console.log("   Frontend: OpenUI5 Flexible Column Layout");
    console.log("   Best for: Enterprise apps, SAP integration\n");

    console.log("📊 Common Features:");
    console.log("   • Compiere-style Application Dictionary");
    console.log("   • sys_ prefixed system tables");
    console.log("   • bus_ prefixed business entities");
    console.log("   • Runtime UI configuration");
    console.log("   • ETag-based concurrency control");
    console.log("   • Field ordering via seq_no\n");
  });

/**
 * Get human-readable stack description
 */
function getStackDescription(stack: StackOption): string {
  return stack === "tanstackjs-nestjs"
    ? "tanstackjs-nestjs - Modern Web (TanStack Start + NestJS)"
    : "openui5-odatav4 - Enterprise SAP (OData + OpenUI5)";
}

// Parse CLI arguments
program.parse();

export { program };
