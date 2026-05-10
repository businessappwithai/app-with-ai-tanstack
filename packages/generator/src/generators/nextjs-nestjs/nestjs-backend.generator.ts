/* eslint-disable @typescript-eslint/no-explicit-any -- template context objects are dynamically shaped */
/**
 * Option 1: NestJS + Fastify + Knex.js Backend Generator
 *
 * Two-phase generation process:
 * 1. Scaffold using NestJS CLI (nest new)
 * 2. Overlay custom generator templates on top
 *
 * Generates a complete NestJS backend with:
 * - Fastify adapter for high performance
 * - Knex.js for database operations
 * - sys_ prefixed Application Dictionary tables
 * - bus_ prefixed business entity tables
 * - Full CRUD operations with ETag concurrency
 *
 * Generated from templates in nextjs-nestjs/backend/
 */

import {
  type Entity,
  entityToBusEntity,
  generateEntityDictionary,
  type Relationship,
} from "@erdwithai/core/types";
import * as fs from "fs/promises";
import * as path from "path";
import { BaseGenerator } from "../base.generator";
import { CliExecutor } from "../../utils/cli-executor";

export interface NestJsBackendOptions {
  projectName: string;
  projectVersion: string;
  projectDescription: string;
  databaseType: "postgresql" | "mysql" | "sqlite";
  port: number;
  enableSwagger: boolean;
  enableCors: boolean;
}

export class NestJsBackendGenerator extends BaseGenerator {
  private options: NestJsBackendOptions;

  constructor(options: NestJsBackendOptions) {
    super(path.join(__dirname, "../../../templates/nextjs-nestjs/backend"));
    this.options = options;
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

    // Generate bus_ business entities
    await this.generateBusEntities(outputDir, context);

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
      await CliExecutor.executeAsync("bun", [
        "x",
        "nest",
        "new",
        projectName,
        "--package-manager",
        "bun",
        "--skip-git",
      ], {
        cwd: parentDir,
        stdio: "inherit",
        timeout: 300000,
      });

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
      "src/modules/rules/jdm",
      "src/modules/workflow",
      "src/trigger",
      "migrations",
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
      },
      config: {
        databaseType: this.options.databaseType,
        port: this.options.port,
        enableSwagger: this.options.enableSwagger,
        enableCors: this.options.enableCors,
        dbUser: dbUser,
      },
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

    // Common components
    const commonFiles = [
      "src/common/decorators/etag.decorator.ts",
      "src/common/filters/http-exception.filter.ts",
      "src/common/guards/etag.guard.ts",
      "src/common/interceptors/transform.interceptor.ts",
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

    // JDM rule files per entity
    for (const entity of context.entities) {
      try {
        const entityContext = { ...entity };
        const jdmContent = await this.renderTemplate(
          "src/modules/rules/jdm/entity.jdm.json.hbs",
          entityContext
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
    const migrationsDir = path.join(outputDir, "migrations");
    const timestamp = Date.now();

    // Remove any existing generated migration files to avoid duplicates on re-generation
    try {
      const existingFiles = await fs.readdir(migrationsDir);
      for (const file of existingFiles) {
        if (file.endsWith("_create_sys_tables.ts") || file.endsWith("_create_bus_tables.ts")) {
          await fs.unlink(path.join(migrationsDir, file));
        }
      }
    } catch (_e) {
      // Directory may not exist yet, that's fine
    }

    // sys tables migration
    const sysMigrationContent = await this.renderTemplate(
      "../../common/migrations/sys-tables.migration.ts.hbs",
      context
    );
    await fs.writeFile(
      path.join(outputDir, `migrations/${timestamp}_create_sys_tables.ts`),
      sysMigrationContent
    );

    // bus tables migration - creates all business entity tables
    const busMigrationContent = await this.renderTemplate(
      "../../common/migrations/bus-tables.migration.ts.hbs",
      context
    );
    await fs.writeFile(
      path.join(outputDir, `migrations/${timestamp + 1}_create_bus_tables.ts`),
      busMigrationContent
    );

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

    // Generate knexfile.ts
    const knexfileContent = await this.renderTemplate("knexfile.ts.hbs", context);
    await fs.writeFile(path.join(outputDir, "knexfile.ts"), knexfileContent);

    // Generate/update environment files
    const envContent = await this.renderTemplate(".env.example.hbs", context);
    await fs.writeFile(path.join(outputDir, ".env.example"), envContent);
    await fs.writeFile(path.join(outputDir, ".env"), envContent);

    // Update ESLint configuration
    try {
      const eslintContent = await this.renderTemplate(".eslintrc.cjs.hbs", context);
      await fs.writeFile(path.join(outputDir, ".eslintrc.cjs"), eslintContent);
    } catch (e) {
      console.warn("Custom ESLint config template not found, keeping NestJS default");
    }

    // Update Prettier configuration
    try {
      const prettierContent = await this.renderTemplate(".prettierrc.hbs", context);
      await fs.writeFile(path.join(outputDir, ".prettierrc"), prettierContent);
    } catch (e) {
      console.warn("Custom Prettier config template not found, keeping NestJS default");
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
      // Test templates may not exist, skip silently
      console.warn("Test templates not found, skipping test generation");
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
}
