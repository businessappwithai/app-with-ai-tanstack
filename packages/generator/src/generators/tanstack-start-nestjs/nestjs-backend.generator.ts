/* eslint-disable @typescript-eslint/no-explicit-any -- template context objects are dynamically shaped */
/**
 * Option 1: NestJS + Fastify + Kysely Backend Generator
 *
 * Two-phase generation process:
 * 1. Scaffold using NestJS CLI (nest new)
 * 2. Overlay custom generator templates on top
 *
 * Generates a complete NestJS backend with:
 * - Fastify adapter for high performance
 * - Kysely for type-safe database operations
 * - sys_ prefixed Application Dictionary tables
 * - bus_ prefixed business entity tables
 * - Full CRUD operations with ETag concurrency
 *
 * Generated from templates in tanstack-start-nestjs/backend/
 */

import {
  type Entity,
  entityToBusEntity,
  generateEntityDictionary,
  type Relationship,
} from "@erdwithai/core/types";
import * as fs from "fs/promises";
import * as path from "path";
import { CliExecutor } from "../../utils/cli-executor";
import { BaseGenerator } from "../base.generator";

/**
 * Resolve template directory path, handling both dev and bundled environments
 */
function resolveTemplateDir(subpath: string): string {
  const cwd = process.cwd();
  const possiblePaths = [
    // Dev mode: running from project root
    path.join(cwd, "packages/generator/templates", subpath),
    // Bundled mode: running from anywhere, find generator package
    path.join(cwd, "../../../packages/generator/templates", subpath),
    path.join(cwd, "../../packages/generator/templates", subpath),
    // Fallback: current __dirname relative
    path.join(__dirname, "../../../templates", subpath),
  ];

  for (const possiblePath of possiblePaths) {
    try {
      const stat = require("fs").statSync(possiblePath);
      if (stat.isDirectory()) {
        return possiblePath;
      }
    } catch {
      // Continue to next path
    }
  }

  // If no path found, return the __dirname relative path and let it fail with a clear error
  const fallbackPath = path.join(__dirname, "../../../templates", subpath);
  console.error(`Template directory not found. Tried paths:`);
  possiblePaths.forEach((p) => console.error(`  - ${p}`));
  console.error(`Using fallback: ${fallbackPath}`);
  return fallbackPath;
}

/**
 * Clean up JSON content by fixing trailing commas and formatting issues
 * from Handlebars template rendering
 */
/**
 * Normalize JDM decision tables for GoRules zen-engine: every rule row must
 * contain a cell for every input column ("" = wildcard). Rows with missing
 * cells silently never match, so fill any gaps with the wildcard.
 */
function normalizeJdmDecisionTables(jdm: any): any {
  if (!Array.isArray(jdm?.nodes)) return jdm;
  for (const node of jdm.nodes) {
    if (node?.type !== "decisionTableNode" || !node.content) continue;
    const inputIds: string[] = (node.content.inputs ?? []).map((input: any) => input.id);
    for (const rule of node.content.rules ?? []) {
      for (const inputId of inputIds) {
        if (rule[inputId] === undefined) {
          rule[inputId] = "";
        }
      }
    }
  }
  return jdm;
}

function cleanJsonContent(jsonStr: string): string {
  try {
    // Remove trailing commas before } and ]
    let cleaned = jsonStr.replace(/,(\s*[}\]])/g, "$1");
    // Remove leading commas after [ and {
    cleaned = cleaned.replace(/(\[\s*),/g, "$1");
    cleaned = cleaned.replace(/(\{\s*),/g, "$1");
    // Parse and reformat to ensure valid JSON
    const parsed = JSON.parse(cleaned);
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    // If parsing fails, return original but still try to fix obvious issues
    return jsonStr.replace(/,(\s*[}\]])/g, "$1").replace(/(\[\s*),/g, "$1");
  }
}

export interface NestJsBackendOptions {
  projectName: string;
  projectVersion: string;
  projectDescription: string;
  databaseType: "postgresql" | "mysql" | "sqlite";
  port: number;
  frontendPort?: number;
  enableSwagger: boolean;
  enableCors: boolean;
}

export class NestJsBackendGenerator extends BaseGenerator {
  private options: NestJsBackendOptions;
  private resolvedTemplateDir: string;

  constructor(options: NestJsBackendOptions) {
    // Resolve template directory correctly regardless of bundling
    const templateDir = resolveTemplateDir("tanstack-start-nestjs/backend");
    super(templateDir);
    this.options = options;
    this.resolvedTemplateDir = templateDir;
  }

  async generate(
    entities: Entity[],
    relationships: Relationship[],
    outputDir: string
  ): Promise<void> {
    console.log(`\n📦 Phase 1: Scaffolding NestJS project...`);
    await this.scaffoldNestJsProject(outputDir);

    console.log(`\n🎨 Phase 2: Overlaying custom templates...`);
    // Prepare context for templates
    const context = this.prepareContext(entities, relationships);

    // Create additional directories needed for generated code
    await this.createAdditionalDirectories(outputDir);

    // Generate core application files
    await this.generateCoreFiles(outputDir, context);

    // Generate sys_ dictionary infrastructure
    await this.generateSysTables(outputDir, context);

    // Generate Electric shape proxy module
    await this.generateElectricModule(outputDir, context);

    // Generate bus_ business entities
    await this.generateBusEntities(outputDir, context);

    // Generate audit module (static files)
    await this.generateAuditModule(outputDir);

    // Generate workflow-definitions module (static files)
    await this.generateWorkflowDefinitionsModule(outputDir);

    // Generate migrations and seeds
    await this.generateMigrations(outputDir, context);

    // Update/enhance configuration files
    await this.updateConfigFiles(outputDir, context);

    // Generate test files
    await this.generateTestFiles(outputDir, context);

    console.log(`\n✅ NestJS backend generation complete!`);
  }

  /**
   * Phase 1: Scaffold base NestJS project using CLI
   */
  private async scaffoldNestJsProject(outputDir: string): Promise<void> {
    const parentDir = path.dirname(outputDir);
    const projectName = path.basename(outputDir);

    // Check if nest CLI is available
    if (!CliExecutor.isCommandAvailable("nest")) {
      console.warn(`\n⚠️  NestJS CLI not found globally. Attempting to use npx...`);
    }

    // Create parent directory if it doesn't exist
    await fs.mkdir(parentDir, { recursive: true });

    try {
      // Run nest new with --package-manager bun and --skip-git flag
      // This creates the base scaffolding structure
      console.log(`  Creating NestJS project: ${projectName}`);
      await CliExecutor.executeAsync(
        "bun",
        ["x", "nest", "new", projectName, "--package-manager", "bun", "--skip-git"],
        {
          cwd: parentDir,
          stdio: "inherit",
          timeout: 300000,
        }
      );

      console.log(`  ✅ NestJS scaffolding complete`);
    } catch (error) {
      console.error(`Error during NestJS scaffolding:`, error);
      // Continue anyway - user may have a custom setup
      console.warn(`  Proceeding without CLI scaffolding - will use template generation`);
    }
  }

  /**
   * Create additional directories beyond what NestJS CLI scaffolds
   */
  private async createAdditionalDirectories(outputDir: string): Promise<void> {
    const dirs = [
      "src/common/decorators",
      "src/common/filters",
      "src/common/guards",
      "src/common/interceptors",
      "src/common/pipes",
      "src/config",
      "src/database",
      "src/lib",
      "src/modules/auth/decorators",
      "src/modules/auth/guards",
      "src/modules/hooks",
      "src/modules/sys",
      "src/modules/bus",
      "src/modules/jobs",
      "src/modules/rules/dto",
      "src/modules/rules/jdm",
      "src/modules/audit",
      "src/modules/workflow",
      "src/modules/workflow-definitions",
      "src/trigger",
      "src/migrations",
      "seeds",
      "test/modules/auth",
      "test/modules/jobs",
      "test/trigger",
    ];

    for (const dir of dirs) {
      await fs.mkdir(path.join(outputDir, dir), { recursive: true });
    }
  }

  private prepareContext(
    entities: Entity[],
    relationships: Relationship[]
  ): Record<string, unknown> {
    // Convert entities to bus_ prefixed entities
    const busEntities = entities.map((entity) => entityToBusEntity(entity));

    // Generate dictionary entries using the proper helper function
    const dictionaryEntries = entities.map((entity) => generateEntityDictionary(entity));

    // Extract sys_table entries from dictionary
    const sysTables = dictionaryEntries.map((entry) => entry.dictionaryPlaceholders.table);

    // Generate sys_column entries from bus attributes
    const sysColumns = dictionaryEntries.flatMap((entry, entityIndex) => {
      const busAttrs = entry.busAttributes;
      return busAttrs.map((attr, _index) => ({
        sys_table_id: `table_${entityIndex}`, // Placeholder ID
        column_name: attr.columnName,
        name: attr.displayName,
        sys_reference_id: attr.referenceId,
        is_key: attr.name === entry.busEntity.primaryKey,
        is_mandatory: attr.required,
        is_updateable: attr.name !== entry.busEntity.primaryKey,
        seq_no: attr.seqNo,
        is_active: true,
        created_by: "System",
        updated_by: "System",
      }));
    });

    // Generate sys_field entries with randomized seq_no
    const sysFields = dictionaryEntries.flatMap((entry, entityIndex) => {
      return entry.busAttributes.map((attr, index) => ({
        sys_tab_id: `tab_${entityIndex}`, // Placeholder ID
        sys_column_id: `column_${entityIndex}_${index}`, // Placeholder ID
        name: attr.displayName,
        seq_no: (index + 1) * 10,
        seq_no_grid: (index + 1) * 10,
        is_displayed: true,
        is_displayed_grid: true,
        is_active: true,
        created_by: "System",
        updated_by: "System",
      }));
    });

    // Detect current database user (for PostgreSQL)
    const dbUser =
      this.options.databaseType === "postgresql"
        ? process.env.USER || process.env.USERNAME || "postgres"
        : "postgres";

    return {
      project: {
        name: this.options.projectName,
        version: this.options.projectVersion,
        description: this.options.projectDescription,
        id: this.options.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        snake: this.options.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      },
      config: {
        databaseType: this.options.databaseType,
        port: this.options.port,
        frontendPort: this.options.frontendPort ?? this.options.port + 1,
        enableSwagger: this.options.enableSwagger,
        enableCors: this.options.enableCors,
        dbUser: dbUser,
        corsOrigin: `http://localhost:${this.options.frontendPort ?? this.options.port + 1}`,
      },
      databaseType: this.options.databaseType,
      projectName: this.options.projectName,
      projectSnake: this.options.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      projectKebab: this.options.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      entities: busEntities,
      relationships,
      sysTables,
      sysColumns,
      sysFields,
      now: new Date().toISOString(),
    };
  }

  private async generateCoreFiles(outputDir: string, context: any): Promise<void> {
    // Main entry point
    const mainContent = await this.renderTemplate("src/main.ts.hbs", context);
    await fs.writeFile(path.join(outputDir, "src/main.ts"), mainContent);

    // App module
    const appModuleContent = await this.renderTemplate("src/app.module.ts.hbs", context);
    await fs.writeFile(path.join(outputDir, "src/app.module.ts"), appModuleContent);

    // Standard NestJS scaffolded files (static, no templating needed)
    const staticAppFiles = ["src/app.controller.ts", "src/app.controller.spec.ts", "src/app.service.ts"];
    for (const file of staticAppFiles) {
      try {
        await fs.copyFile(
          path.join(this.resolvedTemplateDir,file),
          path.join(outputDir, file)
        );
      } catch (e) {
        console.warn(`Static app file not found: ${file}`);
      }
    }

    // Common components
    const commonFiles = [
      "src/common/decorators/etag.decorator.ts",
      "src/common/filters/http-exception.filter.ts",
      "src/common/guards/etag.guard.ts",
      "src/common/interceptors/transform.interceptor.ts",
      "src/common/pipes/zod-validation.pipe.ts",
    ];

    for (const file of commonFiles) {
      try {
        const content = await this.renderTemplate(`${file}.hbs`, context);
        await fs.writeFile(path.join(outputDir, file), content);
      } catch (e) {
        // Template may not exist, skip
      }
    }

    // Auth module decorators and guards (in module path for BetterAuth integration)
    try {
      const publicDecoratorContent = await this.renderTemplate(
        "src/modules/auth/decorators/public.decorator.ts.hbs",
        context
      );
      await fs.writeFile(
        path.join(outputDir, "src/modules/auth/decorators/public.decorator.ts"),
        publicDecoratorContent
      );
    } catch (e) {
      console.warn("Public decorator template not found");
    }

    try {
      const rolesDecoratorContent = await this.renderTemplate(
        "src/modules/auth/decorators/roles.decorator.ts.hbs",
        context
      );
      await fs.writeFile(
        path.join(outputDir, "src/modules/auth/decorators/roles.decorator.ts"),
        rolesDecoratorContent
      );
    } catch (e) {
      console.warn("Roles decorator template not found");
    }

    try {
      const currentUserDecoratorContent = await this.renderTemplate(
        "src/modules/auth/decorators/current-user.decorator.ts.hbs",
        context
      );
      await fs.writeFile(
        path.join(outputDir, "src/modules/auth/decorators/current-user.decorator.ts"),
        currentUserDecoratorContent
      );
    } catch (e) {
      console.warn("Current user decorator template not found");
    }

    try {
      const jwtGuardContent = await this.renderTemplate(
        "src/modules/auth/guards/jwt-auth.guard.ts.hbs",
        context
      );
      await fs.writeFile(
        path.join(outputDir, "src/modules/auth/guards/jwt-auth.guard.ts"),
        jwtGuardContent
      );
    } catch (e) {
      console.warn("JWT auth guard template not found");
    }

    try {
      const sessionAuthGuardContent = await this.renderTemplate(
        "src/modules/auth/guards/session-auth.guard.ts.hbs",
        context
      );
      await fs.writeFile(
        path.join(outputDir, "src/modules/auth/guards/session-auth.guard.ts"),
        sessionAuthGuardContent
      );
    } catch (e) {
      console.warn("Session auth guard template not found");
    }

    try {
      const rolesGuardContent = await this.renderTemplate(
        "src/modules/auth/guards/roles.guard.ts.hbs",
        context
      );
      await fs.writeFile(
        path.join(outputDir, "src/modules/auth/guards/roles.guard.ts"),
        rolesGuardContent
      );
    } catch (e) {
      console.warn("Roles guard template not found");
    }

    // Auth controller and module
    try {
      const authControllerContent = await this.renderTemplate(
        "src/modules/auth/auth.controller.ts.hbs",
        context
      );
      await fs.writeFile(
        path.join(outputDir, "src/modules/auth/auth.controller.ts"),
        authControllerContent
      );
    } catch (e) {
      console.warn("Auth controller template not found");
    }

    try {
      const authModuleContent = await this.renderTemplate(
        "src/modules/auth/auth.module.ts.hbs",
        context
      );
      await fs.writeFile(
        path.join(outputDir, "src/modules/auth/auth.module.ts"),
        authModuleContent
      );
    } catch (e) {
      console.warn("Auth module template not found");
    }

    // Better-auth lib
    try {
      const betterAuthContent = await this.renderTemplate("src/lib/better-auth.ts.hbs", context);
      await fs.writeFile(path.join(outputDir, "src/lib/better-auth.ts"), betterAuthContent);
    } catch (e) {
      console.warn("Better-auth lib template not found");
    }

    // Hook system (standalone)
    const hookFiles = [
      { tpl: "src/modules/hooks/hook.types.ts.hbs", out: "src/modules/hooks/hook.types.ts" },
      { tpl: "src/modules/hooks/hook-registry.ts.hbs", out: "src/modules/hooks/hook-registry.ts" },
      { tpl: "src/modules/hooks/hook-executor.ts.hbs", out: "src/modules/hooks/hook-executor.ts" },
      { tpl: "src/modules/hooks/index.ts.hbs", out: "src/modules/hooks/index.ts" },
    ];

    for (const { tpl, out } of hookFiles) {
      try {
        const content = await this.renderTemplate(tpl, context);
        await fs.writeFile(path.join(outputDir, out), content);
      } catch (e) {
        console.warn(`Hook template not found: ${tpl}`);
      }
    }

    // Trigger.dev configuration
    try {
      const triggerConfigContent = await this.renderTemplate("trigger.config.ts.hbs", context);
      await fs.writeFile(path.join(outputDir, "trigger.config.ts"), triggerConfigContent);
    } catch (e) {
      console.warn("Trigger.dev config template not found");
    }

    // Trigger.dev tasks
    const triggerTasks = ["email", "report", "sync", "entity-lifecycle-workflow"];
    for (const task of triggerTasks) {
      try {
        const taskContent = await this.renderTemplate(`src/trigger/${task}.task.ts.hbs`, context);
        await fs.writeFile(path.join(outputDir, `src/trigger/${task}.task.ts`), taskContent);
      } catch (e) {
        console.warn(`Trigger task template not found: ${task}`);
      }
    }

    // Job queue module
    const jobQueueFiles = [
      {
        tpl: "src/modules/jobs/job-queue.module.ts.hbs",
        out: "src/modules/jobs/job-queue.module.ts",
      },
      {
        tpl: "src/modules/jobs/job-queue.service.ts.hbs",
        out: "src/modules/jobs/job-queue.service.ts",
      },
      {
        tpl: "src/modules/jobs/job-queue.controller.ts.hbs",
        out: "src/modules/jobs/job-queue.controller.ts",
      },
    ];

    for (const { tpl, out } of jobQueueFiles) {
      try {
        const content = await this.renderTemplate(tpl, context);
        await fs.writeFile(path.join(outputDir, out), content);
      } catch (e) {
        console.warn(`Job queue template not found: ${tpl}`);
      }
    }

    // Rules module
    const rulesFiles = [
      { tpl: "src/modules/rules/dto/rules.dto.ts.hbs", out: "src/modules/rules/dto/rules.dto.ts" },
      { tpl: "src/modules/rules/rules.module.ts.hbs", out: "src/modules/rules/rules.module.ts" },
      { tpl: "src/modules/rules/rules.service.ts.hbs", out: "src/modules/rules/rules.service.ts" },
      {
        tpl: "src/modules/rules/rules.controller.ts.hbs",
        out: "src/modules/rules/rules.controller.ts",
      },
      {
        tpl: "src/modules/rules/rules-engine.service.ts.hbs",
        out: "src/modules/rules/rules-engine.service.ts",
      },
    ];

    for (const { tpl, out } of rulesFiles) {
      try {
        const content = await this.renderTemplate(tpl, context);
        await fs.writeFile(path.join(outputDir, out), content);
      } catch (e) {
        console.warn(`Rules template not found: ${tpl}`);
      }
    }

    // Workflow module
    const workflowFiles = [
      {
        tpl: "src/modules/workflow/workflow.module.ts.hbs",
        out: "src/modules/workflow/workflow.module.ts",
      },
      {
        tpl: "src/modules/workflow/workflow.service.ts.hbs",
        out: "src/modules/workflow/workflow.service.ts",
      },
      {
        tpl: "src/modules/workflow/workflow.controller.ts.hbs",
        out: "src/modules/workflow/workflow.controller.ts",
      },
    ];

    for (const { tpl, out } of workflowFiles) {
      try {
        const content = await this.renderTemplate(tpl, context);
        await fs.writeFile(path.join(outputDir, out), content);
      } catch (e) {
        console.warn(`Workflow template not found: ${tpl}`);
      }
    }

    // Copy static bpmn-executor.service.ts (no Handlebars, copy verbatim)
    try {
      const bpmnExecutorSrc = path.join(
        resolveTemplateDir("tanstack-start-nestjs/backend"),
        "src/modules/workflow/bpmn-executor.service.ts"
      );
      await fs.copyFile(
        bpmnExecutorSrc,
        path.join(outputDir, "src/modules/workflow/bpmn-executor.service.ts")
      );
    } catch (e) {
      console.warn("bpmn-executor.service.ts template not found, skipping:", (e as Error).message);
    }

    // JDM rule files per entity
    for (const entity of context.entities) {
      try {
        const entityContext = { ...entity };
        let jdmContent = await this.renderTemplate(
          "src/modules/rules/jdm/entity.jdm.json.hbs",
          entityContext
        );
        // Clean up JSON formatting (fix trailing commas, etc.)
        jdmContent = cleanJsonContent(jdmContent);
        // Fill missing decision-table cells with wildcards (zen-engine requirement)
        jdmContent = JSON.stringify(
          normalizeJdmDecisionTables(JSON.parse(jdmContent)),
          null,
          2
        );
        await fs.writeFile(
          path.join(outputDir, `src/modules/rules/jdm/${entity.tableName}.jdm.json`),
          jdmContent
        );
      } catch (e) {
        console.warn(`JDM template not found for entity: ${entity.tableName}`);
      }
    }
  }

  private async generateSysTables(outputDir: string, context: any): Promise<void> {
    // sys module
    const sysModuleContent = await this.renderTemplate(
      "src/modules/sys/sys.module.ts.hbs",
      context
    );
    await fs.writeFile(path.join(outputDir, "src/modules/sys/sys.module.ts"), sysModuleContent);

    // sys controller
    const sysControllerContent = await this.renderTemplate(
      "src/modules/sys/sys.controller.ts.hbs",
      context
    );
    await fs.writeFile(
      path.join(outputDir, "src/modules/sys/sys.controller.ts"),
      sysControllerContent
    );

    // sys service
    const sysServiceContent = await this.renderTemplate(
      "src/modules/sys/sys.service.ts.hbs",
      context
    );
    await fs.writeFile(path.join(outputDir, "src/modules/sys/sys.service.ts"), sysServiceContent);
  }

  private async generateElectricModule(outputDir: string, context: any): Promise<void> {
    const electricDir = path.join(outputDir, "src/modules/electric");
    await fs.mkdir(electricDir, { recursive: true });

    try {
      const controllerContent = await this.renderTemplate(
        "src/modules/electric/electric.controller.ts.hbs",
        context
      );
      await fs.writeFile(path.join(electricDir, "electric.controller.ts"), controllerContent);

      const moduleContent = await this.renderTemplate(
        "src/modules/electric/electric.module.ts.hbs",
        context
      );
      await fs.writeFile(path.join(electricDir, "electric.module.ts"), moduleContent);
    } catch (e) {
      console.warn("Electric module templates not found, skipping:", (e as Error).message);
    }
  }

  private async generateBusEntities(outputDir: string, context: any): Promise<void> {
    // Generate hooks module first (bus.service depends on it)
    const hooksDir = path.join(outputDir, "src/modules/hooks");
    await fs.mkdir(hooksDir, { recursive: true });

    // Generate hooks.ts file
    const hooksContent = `/**
 * Hooks Index
 *
 * This file exports all hook functions for an entity.
 * It's automatically generated when workflows are applied.
 *
 * @generated
 */

// Hook files will be generated here when workflows are applied
// Example:
// export { hashPasswordUser } from './User/beforeCreate.hashPassword';
// export { sendWelcomeEmailUser } from './User/afterCreate.sendWelcomeEmail';

export interface HookRegistry {
  beforeCreate?: Record<string, (...args: unknown[]) => unknown>;
  afterCreate?: Record<string, (...args: unknown[]) => unknown>;
  beforeUpdate?: Record<string, (...args: unknown[]) => unknown>;
  afterUpdate?: Record<string, (...args: unknown[]) => unknown>;
  beforeDelete?: Record<string, (...args: unknown[]) => unknown>;
  afterDelete?: Record<string, (...args: unknown[]) => unknown>;
  beforeQuery?: Record<string, (...args: unknown[]) => unknown>;
  afterQuery?: Record<string, (...args: unknown[]) => unknown>;
  customValidate?: Record<string, (...args: unknown[]) => unknown>;
  beforeRead?: Record<string, (...args: unknown[]) => unknown>;
  afterRead?: Record<string, (...args: unknown[]) => unknown>;
  beforeList?: Record<string, (...args: unknown[]) => unknown>;
  afterList?: Record<string, (...args: unknown[]) => unknown>;
}

/**
 * Get all registered hooks for an entity
 */
export function getHooks(_entity: string): HookRegistry {
  // Hook functions will be dynamically imported here
  return {};
}

/**
 * Execute beforeCreate hooks for an entity
 */
export async function executeBeforeCreateHooks(
  entity: string,
  data: any
): Promise<any> {
  const hooks = getHooks(entity);
  const beforeHooks = hooks.beforeCreate || {};

  let result = data;
  for (const hookName of Object.keys(beforeHooks)) {
    const hookFn = beforeHooks[hookName];
    result = await hookFn(result);
  }
  return result;
}

/**
 * Execute afterCreate hooks for an entity
 */
export async function executeAfterCreateHooks(
  entity: string,
  data: any
): Promise<void> {
  const hooks = getHooks(entity);
  const afterHooks = hooks.afterCreate || {};

  for (const hookName of Object.keys(afterHooks)) {
    const hookFn = afterHooks[hookName];
    await hookFn(data);
  }
}

/**
 * Execute beforeUpdate hooks for an entity
 */
export async function executeBeforeUpdateHooks(
  entity: string,
  data: any
): Promise<any> {
  const hooks = getHooks(entity);
  const beforeHooks = hooks.beforeUpdate || {};

  let result = data;
  for (const hookName of Object.keys(beforeHooks)) {
    const hookFn = beforeHooks[hookName];
    result = await hookFn(result);
  }
  return result;
}

/**
 * Execute afterUpdate hooks for an entity
 */
export async function executeAfterUpdateHooks(
  entity: string,
  data: any
): Promise<void> {
  const hooks = getHooks(entity);
  const afterHooks = hooks.afterUpdate || {};

  for (const hookName of Object.keys(afterHooks)) {
    const hookFn = afterHooks[hookName];
    await hookFn(data);
  }
}

/**
 * Execute beforeDelete hooks for an entity
 */
export async function executeBeforeDeleteHooks(
  entity: string,
  id: string
): Promise<boolean> {
  const hooks = getHooks(entity);
  const beforeHooks = hooks.beforeDelete || {};

  for (const hookName of Object.keys(beforeHooks)) {
    const hookFn = beforeHooks[hookName];
    const result = await hookFn(id);
    if (result === false) return false;
  }
  return true;
}

/**
 * Execute afterDelete hooks for an entity
 */
export async function executeAfterDeleteHooks(
  entity: string,
  data: any
): Promise<void> {
  const hooks = getHooks(entity);
  const afterHooks = hooks.afterDelete || {};

  for (const hookName of Object.keys(afterHooks)) {
    const hookFn = afterHooks[hookName];
    await hookFn(data);
  }
}

/**
 * Execute beforeRead hooks for an entity
 */
export async function executeBeforeReadHooks(
  entity: string,
  params: any
): Promise<any> {
  const hooks = getHooks(entity);
  const beforeHooks = hooks.beforeRead || {};

  let result = params;
  for (const hookName of Object.keys(beforeHooks)) {
    const hookFn = beforeHooks[hookName];
    result = await hookFn(result);
  }
  return result;
}

/**
 * Execute afterRead hooks for an entity
 */
export async function executeAfterReadHooks(
  entity: string,
  data: any
): Promise<void> {
  const hooks = getHooks(entity);
  const afterHooks = hooks.afterRead || {};

  for (const hookName of Object.keys(afterHooks)) {
    const hookFn = afterHooks[hookName];
    await hookFn(data);
  }
}

/**
 * Execute beforeList hooks for an entity
 */
export async function executeBeforeListHooks(
  entity: string,
  params: any
): Promise<any> {
  const hooks = getHooks(entity);
  const beforeHooks = hooks.beforeList || {};

  let result = params;
  for (const hookName of Object.keys(beforeHooks)) {
    const hookFn = beforeHooks[hookName];
    result = await hookFn(result);
  }
  return result;
}

/**
 * Execute afterList hooks for an entity
 */
export async function executeAfterListHooks(
  entity: string,
  data: any[]
): Promise<void> {
  const hooks = getHooks(entity);
  const afterHooks = hooks.afterList || {};

  for (const hookName of Object.keys(afterHooks)) {
    const hookFn = afterHooks[hookName];
    await hookFn(data);
  }
}
`;

    await fs.writeFile(path.join(hooksDir, "hooks.ts"), hooksContent);

    // Generate single generic bus controller and service that handles all entities dynamically
    const controllerContent = await this.renderTemplate(
      "src/modules/bus/bus.controller.ts.hbs",
      context
    );
    await fs.writeFile(
      path.join(outputDir, "src/modules/bus/bus.controller.ts"),
      controllerContent
    );

    const serviceContent = await this.renderTemplate("src/modules/bus/bus.service.ts.hbs", context);
    await fs.writeFile(path.join(outputDir, "src/modules/bus/bus.service.ts"), serviceContent);

    // Bus module
    const busModuleContent = await this.renderTemplate(
      "src/modules/bus/bus.module.ts.hbs",
      context
    );
    await fs.writeFile(path.join(outputDir, "src/modules/bus/bus.module.ts"), busModuleContent);
  }

  private async generateMigrations(outputDir: string, context: any): Promise<void> {
    const migrationsDir = path.join(outputDir, "src/migrations");
    const timestamp = Date.now();

    // Remove any existing generated migration files to avoid duplicates on re-generation
    try {
      const existingFiles = await fs.readdir(migrationsDir);
      for (const file of existingFiles) {
        if (
          file.endsWith("_create_auth_tables.ts") ||
          file.endsWith("_create_sys_tables.ts") ||
          file.endsWith("_create_bus_tables.ts")
        ) {
          await fs.unlink(path.join(migrationsDir, file));
        }
      }
    } catch (_e) {
      // Directory may not exist yet, that's fine
    }

    // Select database-specific migration templates
    const dbType = this.options.databaseType;
    const sysMigrationTemplate =
      dbType === "sqlite"
        ? "../../common/migrations/sys-tables.sqlite.migration.ts.hbs"
        : "../../common/migrations/sys-tables.migration.ts.hbs";
    const busMigrationTemplate =
      dbType === "sqlite"
        ? "../../common/migrations/bus-tables.sqlite.migration.ts.hbs"
        : "../../common/migrations/bus-tables.migration.ts.hbs";

    // auth tables migration (must run before sys/bus tables)
    const authMigrationContent = await this.renderTemplate(
      "src/migrations/000_create_auth_tables.ts.hbs",
      context
    );
    await fs.writeFile(
      path.join(outputDir, `src/migrations/${timestamp - 1}_create_auth_tables.ts`),
      authMigrationContent
    );

    // sys tables migration
    const sysMigrationContent = await this.renderTemplate(sysMigrationTemplate, context);
    await fs.writeFile(
      path.join(outputDir, `src/migrations/${timestamp}_create_sys_tables.ts`),
      sysMigrationContent
    );

    // bus tables migration - creates all business entity tables
    const busMigrationContent = await this.renderTemplate(busMigrationTemplate, context);
    await fs.writeFile(
      path.join(outputDir, `src/migrations/${timestamp + 1}_create_bus_tables.ts`),
      busMigrationContent
    );

    // workflow support migration - adds sys_workflow_runs + doc_status columns to bus tables
    try {
      const workflowSupportContent = await this.renderTemplate(
        "src/migrations/003_add_workflow_support.ts.hbs",
        context
      );
      await fs.writeFile(
        path.join(outputDir, `src/migrations/${timestamp + 2}_add_workflow_support.ts`),
        workflowSupportContent
      );
    } catch (e) {
      console.warn("Workflow support migration template not found, skipping:", (e as Error).message);
    }

    // workflow definitions migration - creates sys_workflow_definitions table
    try {
      const workflowDefsContent = await this.renderTemplate(
        "src/migrations/004_create_workflow_definitions.ts.hbs",
        context
      );
      await fs.writeFile(
        path.join(outputDir, `src/migrations/${timestamp + 3}_create_workflow_definitions.ts`),
        workflowDefsContent
      );
    } catch (e) {
      console.warn("Workflow definitions migration template not found, skipping:", (e as Error).message);
    }

    // Seed sys_reference data
    const sysRefContent = await this.renderTemplate(
      "../../common/seeds/sys-references.ts.hbs",
      context
    );
    await fs.writeFile(path.join(outputDir, "seeds/01_sys_references.ts"), sysRefContent);

    // Seed sys_dictionary data (sys_table, sys_column, sys_field)
    const sysDictContent = await this.renderTemplate(
      "../../common/seeds/sys-dictionary.ts.hbs",
      context
    );
    await fs.writeFile(path.join(outputDir, "seeds/02_sys_dictionary.ts"), sysDictContent);

    // Seed business data for E2E testing
    const businessDataContent = await this.renderTemplate(
      "../../common/seeds/business-data.ts.hbs",
      context
    );
    await fs.writeFile(path.join(outputDir, "seeds/03_business_data.ts"), businessDataContent);

    // Seed business rules (JDM decision models) into sys_rule_definitions
    try {
      const businessRulesContent = await this.renderTemplate(
        "../../common/seeds/business-rules.ts.hbs",
        context
      );
      await fs.writeFile(path.join(outputDir, "seeds/04_business_rules.ts"), businessRulesContent);
    } catch (e) {
      console.warn("Business rules seed template failed, skipping:", (e as Error).message);
    }
  }

  /**
   * Update/enhance configuration files created by NestJS CLI
   */
  private async updateConfigFiles(outputDir: string, context: any): Promise<void> {
    // Update package.json with additional dependencies
    const packageJsonContent = await this.renderTemplate("package.json.hbs", context);
    await fs.writeFile(
      path.join(outputDir, "package.json"),
      typeof packageJsonContent === "string"
        ? packageJsonContent
        : JSON.stringify(packageJsonContent, null, 2)
    );

    // Update tsconfig.json
    try {
      const tsconfigContent = await this.renderTemplate("tsconfig.json.hbs", context);
      await fs.writeFile(path.join(outputDir, "tsconfig.json"), tsconfigContent);
    } catch (e) {
      console.warn("Custom tsconfig template not found, keeping NestJS default");
    }

    // nest-cli.json — ensures JDM rule files are copied to dist as build assets
    try {
      const nestCliContent = await this.renderTemplate("nest-cli.json.hbs", context);
      await fs.writeFile(path.join(outputDir, "nest-cli.json"), nestCliContent);
    } catch (e) {
      console.warn("nest-cli.json template not found, keeping NestJS default");
    }

    // .prettierrc — render from template (static content, no Handlebars vars)
    try {
      const prettierContent = await this.renderTemplate(".prettierrc.hbs", context);
      await fs.writeFile(path.join(outputDir, ".prettierrc"), prettierContent);
    } catch (e) {
      console.warn(".prettierrc template not found, skipping");
    }

    // Static NestJS boilerplate config files (not project-specific)
    const staticConfigFiles = [
      "tsconfig.build.json",
      "eslint.config.mjs",
      "test/jest-e2e.json",
      "test/app.e2e-spec.ts",
    ];
    await fs.mkdir(path.join(outputDir, "test"), { recursive: true });
    for (const file of staticConfigFiles) {
      try {
        await fs.copyFile(
          path.join(this.resolvedTemplateDir,file),
          path.join(outputDir, file)
        );
      } catch (e) {
        console.warn(`Static config file not found: ${file}`);
      }
    }

    // Generate src/migrate.ts (Kysely migration runner)
    const migrateContent = await this.renderTemplate("src/migrate.ts.hbs", context);
    await fs.writeFile(path.join(outputDir, "src", "migrate.ts"), migrateContent);

    // Generate src/seed.ts (Kysely seed runner)
    const seedRunnerContent = await this.renderTemplate("src/seed.ts.hbs", context);
    await fs.writeFile(path.join(outputDir, "src", "seed.ts"), seedRunnerContent);

    // Generate/update environment files
    const envContent = await this.renderTemplate(".env.example.hbs", context);
    await fs.writeFile(path.join(outputDir, ".env.example"), envContent);
    await fs.writeFile(path.join(outputDir, ".env"), envContent);

    // Update Biome configuration
    try {
      const biomeContent = await this.renderTemplate("biome.json.hbs", context);
      await fs.writeFile(path.join(outputDir, "biome.json"), biomeContent);
    } catch (e) {
      console.warn("Custom Biome config template not found, using defaults");
    }

    // Database module
    const dbModuleContent = await this.renderTemplate(
      "src/database/database.module.ts.hbs",
      context
    );
    await fs.writeFile(path.join(outputDir, "src/database/database.module.ts"), dbModuleContent);

    // Database constants
    const dbConstantsContent = await this.renderTemplate(
      "src/database/database.constants.ts.hbs",
      context
    );
    await fs.writeFile(
      path.join(outputDir, "src/database/database.constants.ts"),
      dbConstantsContent
    );

    // Database service
    try {
      const dbServiceContent = await this.renderTemplate(
        "src/database/database.service.ts.hbs",
        context
      );
      await fs.writeFile(
        path.join(outputDir, "src/database/database.service.ts"),
        dbServiceContent
      );
    } catch (e) {
      console.warn("Database service template not found");
    }

    // Database service decorator
    try {
      const dbServiceDecoratorContent = await this.renderTemplate(
        "src/database/database.service.decorator.ts.hbs",
        context
      );
      await fs.writeFile(
        path.join(outputDir, "src/database/database.service.decorator.ts"),
        dbServiceDecoratorContent
      );
    } catch (e) {
      console.warn("Database service decorator template not found");
    }
  }

  private async generateTestFiles(outputDir: string, context: any): Promise<void> {
    try {
      // Test setup file
      const setupContent = await this.renderTemplate("test/setup.ts.hbs", context);
      await fs.writeFile(path.join(outputDir, "test/setup.ts"), setupContent);

      // CRUD test file
      const crudTestContent = await this.renderTemplate("test/crud.test.ts.hbs", context);
      await fs.writeFile(path.join(outputDir, "test/crud.test.ts"), crudTestContent);

      // Vitest configuration
      const vitestContent = await this.renderTemplate("vitest.config.ts.hbs", context);
      await fs.writeFile(path.join(outputDir, "vitest.config.ts"), vitestContent);
    } catch (e) {
      // Test templates may not exist, skip — but surface the actual reason so
      // template rendering errors are not silently swallowed
      console.warn(
        `Test generation skipped: ${e instanceof Error ? e.message : String(e)}`
      );
    }

    // Auth tests
    const authTestFiles = [
      {
        tpl: "test/modules/auth/auth.controller.test.ts.hbs",
        out: "test/modules/auth/auth.controller.test.ts",
      },
      {
        tpl: "test/modules/auth/jwt-auth.guard.test.ts.hbs",
        out: "test/modules/auth/jwt-auth.guard.test.ts",
      },
    ];

    for (const { tpl, out } of authTestFiles) {
      try {
        const content = await this.renderTemplate(tpl, context);
        await fs.writeFile(path.join(outputDir, out), content);
      } catch (e) {
        console.warn(`Auth test template not found: ${tpl}`);
      }
    }

    // Rules engine tests
    try {
      const rulesEngineTestContent = await this.renderTemplate(
        "test/rules-engine.test.ts.hbs",
        context
      );
      await fs.writeFile(
        path.join(outputDir, "test/rules-engine.test.ts"),
        rulesEngineTestContent
      );
    } catch (e) {
      console.warn("Rules engine test template not found");
    }

    // Trigger-workflow integration tests
    try {
      const triggerWorkflowTestContent = await this.renderTemplate(
        "test/rules-workflow-trigger.test.ts.hbs",
        context
      );
      await fs.writeFile(
        path.join(outputDir, "test/rules-workflow-trigger.test.ts"),
        triggerWorkflowTestContent
      );
    } catch (e) {
      console.warn("Trigger-workflow test template not found");
    }

    // Job queue tests
    try {
      const jobQueueTestContent = await this.renderTemplate(
        "test/modules/jobs/job-queue.service.test.ts.hbs",
        context
      );
      await fs.writeFile(
        path.join(outputDir, "test/modules/jobs/job-queue.service.test.ts"),
        jobQueueTestContent
      );
    } catch (e) {
      console.warn("Job queue test template not found");
    }

    // Trigger task tests
    const triggerTestFiles = [
      { tpl: "test/trigger/email.task.test.ts.hbs", out: "test/trigger/email.task.test.ts" },
      { tpl: "test/trigger/report.task.test.ts.hbs", out: "test/trigger/report.task.test.ts" },
      { tpl: "test/trigger/sync.task.test.ts.hbs", out: "test/trigger/sync.task.test.ts" },
    ];

    for (const { tpl, out } of triggerTestFiles) {
      try {
        const content = await this.renderTemplate(tpl, context);
        await fs.writeFile(path.join(outputDir, out), content);
      } catch (e) {
        console.warn(`Trigger test template not found: ${tpl}`);
      }
    }
  }

  /**
   * Copy static audit module files from templates (no Handlebars variables).
   */
  private async generateAuditModule(outputDir: string): Promise<void> {
    const auditTemplateDir = path.join(
      resolveTemplateDir("tanstack-start-nestjs/backend"),
      "src/modules/audit"
    );
    const auditOutputDir = path.join(outputDir, "src/modules/audit");

    const auditFiles = [
      "audit.controller.ts",
      "audit.interceptor.ts",
      "audit.module.ts",
      "audit.service.ts",
      "audit.types.ts",
      "immudb.service.ts",
    ];

    for (const file of auditFiles) {
      try {
        await fs.copyFile(
          path.join(auditTemplateDir, file),
          path.join(auditOutputDir, file)
        );
      } catch (e) {
        console.warn(`Audit module file not found, skipping: ${file} — ${(e as Error).message}`);
      }
    }
  }

  /**
   * Copy static workflow-definitions module files from templates (no Handlebars variables).
   */
  private async generateWorkflowDefinitionsModule(outputDir: string): Promise<void> {
    const wdTemplateDir = path.join(
      resolveTemplateDir("tanstack-start-nestjs/backend"),
      "src/modules/workflow-definitions"
    );
    const wdOutputDir = path.join(outputDir, "src/modules/workflow-definitions");

    const wdFiles = [
      "workflow-definitions.controller.ts",
      "workflow-definitions.module.ts",
      "workflow-definitions.service.ts",
    ];

    for (const file of wdFiles) {
      try {
        await fs.copyFile(
          path.join(wdTemplateDir, file),
          path.join(wdOutputDir, file)
        );
      } catch (e) {
        console.warn(`Workflow-definitions file not found, skipping: ${file} — ${(e as Error).message}`);
      }
    }
  }
}
