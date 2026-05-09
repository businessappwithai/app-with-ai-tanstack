/* eslint-disable @typescript-eslint/no-explicit-any -- template context objects are dynamically shaped */
/**
 * Option 2: OData V4 Server (jaystack) Backend Generator
 *
 * Generates a complete OData V4 backend with:
 * - jaystack/odata-v4-server for OData protocol
 * - SQLite/PostgreSQL database support
 * - sys_ prefixed Application Dictionary tables
 * - bus_ prefixed business entity tables
 * - Full OData CRUD with $metadata, $filter, $orderby, etc.
 * - ETag-based optimistic concurrency control
 *
 * Generated from templates in openui5-odatav4/backend/
 */

import {
  type Entity,
  entityToBusEntity,
  generateEntityDictionary,
  type Relationship,
} from "@erdwithai/core/types";
import {
  tableNameToControllerName,
  tableNameToEntitySetName,
} from "@erdwithai/core/utils/table-naming";
import * as fs from "fs/promises";
import * as path from "path";
import { BaseGenerator } from "../base.generator";

export interface ODataBackendOptions {
  projectName: string;
  projectVersion: string;
  projectDescription: string;
  databaseType: "postgresql" | "sqlite";
  port: number;
  odataPath: string;
}

export class ODataBackendGenerator extends BaseGenerator {
  private options: ODataBackendOptions;

  constructor(options: ODataBackendOptions) {
    super(path.join(__dirname, "../../../templates/openui5-odatav4/backend"));
    this.options = options;
  }

  async generate(
    entities: Entity[],
    relationships: Relationship[],
    outputDir: string
  ): Promise<void> {
    // Create output directory structure
    await this.createDirectoryStructure(outputDir);

    // Prepare context for templates
    const context = this.prepareContext(entities, relationships);

    // Generate core server files
    await this.generateCoreFiles(outputDir, context);

    // Generate controller generation scripts (jaystack approach)
    await this.generateControllerGenerators(outputDir, context);

    // Generate database and migrations
    await this.generateDatabase(outputDir, context);

    // Generate configuration files
    await this.generateConfigFiles(outputDir, context);

    // Generate test files
    await this.generateTestFiles(outputDir, context);
  }

  private async createDirectoryStructure(outputDir: string): Promise<void> {
    const dirs = [
      "src/controllers/generated",
      "src/models",
      "src/services",
      "src/hooks",
      "src/middleware",
      "src/utils",
      "src/database",
      "src/config",
      "data",
      "migrations",
      "seeds",
      "test",
    ];

    for (const dir of dirs) {
      await fs.mkdir(path.join(outputDir, dir), { recursive: true });
    }

    // Create .gitkeep for generated controllers (will be populated at runtime)
    await fs.writeFile(path.join(outputDir, "src/controllers/generated/.gitkeep"), "");
  }

  private prepareContext(
    entities: Entity[],
    relationships: Relationship[]
  ): Record<string, unknown> {
    // Convert entities to bus_ prefixed entities with OData annotations
    const busEntities = entities.map((entity) => {
      const busEntity = entityToBusEntity(entity);
      return {
        ...busEntity,
        entitySetName: tableNameToEntitySetName(busEntity.tableName),
        controllerName: tableNameToControllerName(busEntity.tableName),
      };
    });

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

    // System entity sets for OData
    const sysEntitySets = [
      { name: "SysTables", entityType: "SysTable", description: "Application Dictionary tables" },
      { name: "SysColumns", entityType: "SysColumn", description: "Table columns" },
      { name: "SysWindows", entityType: "SysWindow", description: "UI windows" },
      { name: "SysTabs", entityType: "SysTab", description: "Window tabs" },
      { name: "SysFields", entityType: "SysField", description: "Tab fields" },
      { name: "SysReferences", entityType: "SysReference", description: "Reference lists" },
      { name: "SysValRules", entityType: "SysValRule", description: "Validation rules" },
      { name: "SysUsers", entityType: "SysUser", description: "System users" },
      { name: "SysRoles", entityType: "SysRole", description: "User roles" },
      { name: "SysAccess", entityType: "SysAccess", description: "Access permissions" },
    ];

    // Add multiplicity to relationships for OData metadata
    const relationshipsWithMultiplicity = relationships.map((rel) => {
      // Determine multiplicity based on cardinality
      // For OData navigation properties:
      // - oneToMany: source has 'collection', target has 'single'
      // - manyToOne: source has 'single', target has 'collection'
      // - oneToOne: both sides have 'single'
      // - manyToMany: both sides have 'collection'
      let multiplicity: "single" | "collection";
      switch (rel.cardinality) {
        case "oneToMany":
          multiplicity = "collection";
          break;
        case "manyToOne":
          multiplicity = "single";
          break;
        case "oneToOne":
          multiplicity = "single";
          break;
        case "manyToMany":
          multiplicity = "collection";
          break;
        default:
          multiplicity = "single";
      }
      return {
        ...rel,
        multiplicity,
        referencedKey: "id", // Default PK name
      };
    });

    return {
      project: {
        name: this.options.projectName,
        version: this.options.projectVersion,
        description: this.options.projectDescription,
      },
      config: {
        databaseType: this.options.databaseType,
        port: this.options.port,
        odataPath: this.options.odataPath,
      },
      entities: busEntities,
      relationships: relationshipsWithMultiplicity,
      sysTables,
      sysColumns,
      sysFields,
      sysEntitySets,
      now: new Date().toISOString(),
    };
  }

  private async generateCoreFiles(outputDir: string, context: any): Promise<void> {
    // Database connection
    const dbConnectionContent = await this.renderTemplate(
      "src/database/connection.ts.hbs",
      context
    );
    await fs.writeFile(path.join(outputDir, "src/database/connection.ts"), dbConnectionContent);

    // Dynamic schema discovery (reads tables/columns from DB at runtime)
    const dynamicSchemaContent = await this.renderTemplate(
      "src/utils/dynamic-schema.ts.hbs",
      context
    );
    await fs.writeFile(path.join(outputDir, "src/utils/dynamic-schema.ts"), dynamicSchemaContent);

    // OData $filter parser (converts OData expressions to SQL WHERE clauses)
    const odataFilterContent = await this.renderTemplate("src/utils/odata-filter.ts.hbs", context);
    await fs.writeFile(path.join(outputDir, "src/utils/odata-filter.ts"), odataFilterContent);

    // OData response formatter (formats DB values to OData V4 spec)
    const odataFormatterContent = await this.renderTemplate(
      "src/utils/odata-formatter.ts.hbs",
      context
    );
    await fs.writeFile(path.join(outputDir, "src/utils/odata-formatter.ts"), odataFormatterContent);

    // Hook system (standalone)
    const hookFiles = [
      { tpl: "src/hooks/hook.types.ts.hbs", out: "src/hooks/hook.types.ts" },
      { tpl: "src/hooks/hook-registry.ts.hbs", out: "src/hooks/hook-registry.ts" },
      { tpl: "src/hooks/hook-executor.ts.hbs", out: "src/hooks/hook-executor.ts" },
      { tpl: "src/hooks/index.ts.hbs", out: "src/hooks/index.ts" },
    ];

    for (const { tpl, out } of hookFiles) {
      try {
        const content = await this.renderTemplate(tpl, context);
        await fs.writeFile(path.join(outputDir, out), content);
      } catch (e) {
        console.warn(`Hook template not found: ${tpl}`);
      }
    }
  }

  private async generateControllerGenerators(outputDir: string, context: any): Promise<void> {
    // Generate the controller generation script (dynamically creates all controllers)
    const generateControllersContent = await this.renderTemplate(
      "src/generate-controllers.ts.hbs",
      context
    );
    await fs.writeFile(
      path.join(outputDir, "src/generate-controllers.ts"),
      generateControllersContent
    );

    // Generate the server class generation script (creates server.ts with all decorators)
    const createServerClassContent = await this.renderTemplate(
      "src/create-server-class.ts.hbs",
      context
    );
    await fs.writeFile(
      path.join(outputDir, "src/create-server-class.ts"),
      createServerClassContent
    );
  }

  private async generateDatabase(outputDir: string, context: any): Promise<void> {
    const timestamp = Date.now();

    // sys tables migration
    const sysMigrationContent = await this.renderTemplate(
      "../../common/migrations/sys-tables.migration.ts.hbs",
      context
    );
    await fs.writeFile(
      path.join(outputDir, `migrations/${timestamp}_create_sys_tables.ts`),
      sysMigrationContent
    );

    // bus tables migration
    const busMigrationContent = await this.renderTemplate(
      "../../common/migrations/bus-tables.migration.ts.hbs",
      context
    );
    await fs.writeFile(
      path.join(outputDir, `migrations/${timestamp + 1}_create_bus_tables.ts`),
      busMigrationContent
    );

    // Seeds
    const sysRefContent = await this.renderTemplate(
      "../../common/seeds/sys-references.ts.hbs",
      context
    );
    await fs.writeFile(path.join(outputDir, "seeds/01_sys_references.ts"), sysRefContent);

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

  private async generateConfigFiles(outputDir: string, context: any): Promise<void> {
    // package.json
    const packageJsonContent = await this.renderTemplate("package.json.hbs", context);
    await fs.writeFile(path.join(outputDir, "package.json"), packageJsonContent);

    // tsconfig.json
    const tsconfigContent = await this.renderTemplate("tsconfig.json.hbs", context);
    await fs.writeFile(path.join(outputDir, "tsconfig.json"), tsconfigContent);

    // knexfile.js
    const knexfileContent = await this.renderTemplate("knexfile.js.hbs", context);
    await fs.writeFile(path.join(outputDir, "knexfile.js"), knexfileContent);

    // .env.example
    const envContent = await this.renderTemplate(".env.example.hbs", context);
    await fs.writeFile(path.join(outputDir, ".env.example"), envContent);

    // Copy .env.example to .env for development
    await fs.writeFile(path.join(outputDir, ".env"), envContent);

    // ESLint configuration
    try {
      const eslintContent = await this.renderTemplate(".eslintrc.cjs.hbs", context);
      await fs.writeFile(path.join(outputDir, ".eslintrc.cjs"), eslintContent);
    } catch (e) {
      console.warn("ESLint config template not found");
    }

    // Prettier configuration
    try {
      const prettierContent = await this.renderTemplate(".prettierrc.hbs", context);
      await fs.writeFile(path.join(outputDir, ".prettierrc"), prettierContent);
    } catch (e) {
      console.warn("Prettier config template not found");
    }
  }

  private async generateTestFiles(outputDir: string, context: any): Promise<void> {
    try {
      // Test setup
      const setupContent = await this.renderTemplate("test/setup.ts.hbs", context);
      await fs.writeFile(path.join(outputDir, "test/setup.ts"), setupContent);

      // CRUD tests for OData endpoints
      const crudTestContent = await this.renderTemplate("test/crud.test.ts.hbs", context);
      await fs.writeFile(path.join(outputDir, "test/crud.test.ts"), crudTestContent);

      // Vitest config
      const vitestContent = await this.renderTemplate("vitest.config.ts.hbs", context);
      await fs.writeFile(path.join(outputDir, "vitest.config.ts"), vitestContent);
    } catch (e) {
      // Test templates not found, skip test generation
      console.warn("Test templates not found, skipping test generation");
    }
  }
}
