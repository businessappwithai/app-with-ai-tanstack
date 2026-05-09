/* eslint-disable @typescript-eslint/no-explicit-any -- template context objects are dynamically shaped */
/**
 * Option 2: OpenUI5 Flexible Column Layout Frontend Generator
 *
 * Generates a complete OpenUI5 frontend with:
 * - SAP Fiori 3-column layout (FCL)
 * - OData V4 model integration
 * - Entity-specific List and Detail views
 * - MetadataService for dynamic entity discovery
 * - OPA5 integration tests
 *
 * Generated from templates in openui5-odatav4/frontend/
 */

import {
  attributeToBusAttribute,
  type Entity,
  entityToBusEntity,
  type Relationship,
} from "@erdwithai/core/types";
import { tableNameToEntitySetName } from "@erdwithai/core/utils/table-naming";
import * as fs from "fs/promises";
import * as path from "path";
import { BaseGenerator } from "../base.generator";

export interface OpenUI5FrontendOptions {
  projectName: string;
  projectVersion: string;
  projectDescription: string;
  odataBaseUrl: string;
  ui5Theme: "sap_horizon" | "sap_horizon_dark" | "sap_fiori_3";
}

export class OpenUI5FrontendGenerator extends BaseGenerator {
  private options: OpenUI5FrontendOptions;

  constructor(options: OpenUI5FrontendOptions) {
    super(path.join(__dirname, "../../../templates/openui5-odatav4/frontend"));
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

    // Generate webapp files
    await this.generateWebappFiles(outputDir, context);

    // Generate service files (MetadataService)
    await this.generateServiceFiles(outputDir, context);

    // Generate views (FCL structure)
    await this.generateViews(outputDir, context);

    // Generate controllers (FCL structure)
    await this.generateControllers(outputDir, context);

    // Generate i18n resources
    await this.generateI18n(outputDir, context);

    // Generate configuration files
    await this.generateConfigFiles(outputDir, context);

    // Generate per-entity views and controllers
    await this.generatePerEntityFiles(outputDir, context);

    // Generate fragment files
    await this.generateFragments(outputDir, context);

    // Generate OPA5 test files
    await this.generateTestFiles(outputDir, context);
  }

  private async createDirectoryStructure(outputDir: string): Promise<void> {
    const dirs = [
      "webapp/controller",
      "webapp/controller/entity",
      "webapp/utils",
      "webapp/view",
      "webapp/view/entity",
      "webapp/fragment",
      "webapp/service",
      "webapp/i18n",
      "webapp/css",
      "webapp/model",
      "webapp/localService",
      "webapp/test/integration",
      "webapp/test/integration/pages",
      "webapp/test/unit",
    ];

    for (const dir of dirs) {
      await fs.mkdir(path.join(outputDir, dir), { recursive: true });
    }
  }

  private prepareContext(
    entities: Entity[],
    relationships: Relationship[]
  ): Record<string, unknown> {
    // Convert entities to bus_ prefixed with OData annotations
    const busEntities = entities.map((entity) => {
      const busEntity = entityToBusEntity(entity);
      const busAttributes = entity.attributes.map((attr, index) =>
        attributeToBusAttribute(attr, index)
      );
      return {
        ...busEntity,
        attributes: busAttributes,
        entitySetName: tableNameToEntitySetName(busEntity.tableName),
      };
    });

    return {
      project: {
        name: this.options.projectName,
        version: this.options.projectVersion,
        description: this.options.projectDescription,
      },
      config: {
        baseUrl: this.options.odataBaseUrl,
        theme: this.options.ui5Theme,
      },
      entities: busEntities,
      relationships,
      now: new Date().toISOString(),
    };
  }

  private async generateWebappFiles(outputDir: string, context: any): Promise<void> {
    // index.html
    const indexContent = await this.renderTemplate("webapp/index.html.hbs", context);
    await fs.writeFile(path.join(outputDir, "webapp/index.html"), indexContent);

    // Component.js (will be converted to TypeScript later)
    try {
      const componentContent = await this.renderTemplate("webapp/Component.ts.hbs", context);
      await fs.writeFile(path.join(outputDir, "webapp/Component.ts"), componentContent);
    } catch (e) {
      // Fallback to .js if .ts not found
      const componentContent = await this.renderTemplate("webapp/Component.js.hbs", context);
      await fs.writeFile(path.join(outputDir, "webapp/Component.js"), componentContent);
    }

    // manifest.json
    const manifestContent = await this.renderTemplate("webapp/manifest.json.hbs", context);
    await fs.writeFile(path.join(outputDir, "webapp/manifest.json"), manifestContent);

    // CSS
    const cssContent = await this.renderTemplate("webapp/css/style.css.hbs", context);
    await fs.writeFile(path.join(outputDir, "webapp/css/style.css"), cssContent);

    // MessageHelper utility (TypeScript)
    try {
      const messageHelperContent = await this.renderTemplate(
        "webapp/utils/MessageHelper.ts.hbs",
        context
      );
      await fs.writeFile(
        path.join(outputDir, "webapp/utils/MessageHelper.ts"),
        messageHelperContent
      );
    } catch (e) {
      console.warn("MessageHelper.ts template not found, skipping");
    }
  }

  private async generateServiceFiles(_outputDir: string, _context: unknown): Promise<void> {
    // No separate service files needed - OData model configured in Component.js
    // Service files are generated dynamically based on metadata
  }

  private async generateViews(outputDir: string, context: any): Promise<void> {
    // Base views - using SAP Fiori Flexible Column Layout pattern
    const baseViews = [
      "App.view.xml",
      "Master.view.xml",
      "Detail.view.xml",
      "Create.view.xml",
      "List.view.xml",
      "Admin.view.xml",
      "NotFound.view.xml",
    ];

    for (const view of baseViews) {
      try {
        const viewContent = await this.renderTemplate(`webapp/view/${view}.hbs`, context);
        await fs.writeFile(
          path.join(outputDir, `webapp/view/${view.replace(".hbs", "")}`),
          viewContent
        );
      } catch (e) {
        console.warn(`View template not found: ${view}`);
      }
    }
  }

  private async generateControllers(outputDir: string, context: any): Promise<void> {
    // Base controllers - try TypeScript first, fallback to JavaScript
    const baseControllers = [
      "App.controller",
      "Master.controller",
      "Detail.controller",
      "Create.controller",
      "List.controller",
      "Admin.controller",
      "NotFound.controller",
    ];

    for (const controller of baseControllers) {
      // Try TypeScript first
      try {
        const controllerContent = await this.renderTemplate(
          `webapp/controller/${controller}.ts.hbs`,
          context
        );
        await fs.writeFile(
          path.join(outputDir, `webapp/controller/${controller}.ts`),
          controllerContent
        );
      } catch (_e) {
        // Fallback to JavaScript
        try {
          const controllerContent = await this.renderTemplate(
            `webapp/controller/${controller}.js.hbs`,
            context
          );
          await fs.writeFile(
            path.join(outputDir, `webapp/controller/${controller}.js`),
            controllerContent
          );
        } catch (_e2) {
          console.warn(`Controller template not found: ${controller}`);
        }
      }
    }
  }

  private async generateI18n(outputDir: string, context: any): Promise<void> {
    const i18nContent = await this.renderTemplate("webapp/i18n/i18n.properties.hbs", context);
    await fs.writeFile(path.join(outputDir, "webapp/i18n/i18n.properties"), i18nContent);
  }

  private async generateConfigFiles(outputDir: string, context: any): Promise<void> {
    // package.json
    const packageJsonContent = await this.renderTemplate("package.json.hbs", context);
    await fs.writeFile(path.join(outputDir, "package.json"), packageJsonContent);

    // tsconfig.json (TypeScript)
    try {
      const tsconfigContent = await this.renderTemplate("tsconfig.json.hbs", context);
      await fs.writeFile(path.join(outputDir, "tsconfig.json"), tsconfigContent);
    } catch (e) {
      console.warn("tsconfig.json template not found, skipping");
    }

    // ui5.yaml
    const ui5YamlContent = await this.renderTemplate("ui5.yaml.hbs", context);
    await fs.writeFile(path.join(outputDir, "ui5.yaml"), ui5YamlContent);

    // ui5-local.yaml for development
    const ui5LocalContent = await this.renderTemplate("ui5-local.yaml.hbs", context);
    await fs.writeFile(path.join(outputDir, "ui5-local.yaml"), ui5LocalContent);

    // UI5 linter configuration
    const ui5LintContent = await this.renderTemplate("ui5lint.yaml.hbs", context);
    await fs.writeFile(path.join(outputDir, "ui5lint.yaml"), ui5LintContent);

    // ESLint configuration for UI5
    const eslintContent = await this.renderTemplate(".eslintrc.json.hbs", context);
    await fs.writeFile(path.join(outputDir, ".eslintrc.json"), eslintContent);
  }

  private async generateTestFiles(outputDir: string, context: any): Promise<void> {
    try {
      // OPA5 test HTML runner
      const opaTestsHtml = await this.renderTemplate(
        "webapp/test/integration/opaTests.qunit.html.hbs",
        context
      );
      await fs.writeFile(
        path.join(outputDir, "webapp/test/integration/opaTests.qunit.html"),
        opaTestsHtml
      );

      // OPA5 test JS runner
      const opaTestsJs = await this.renderTemplate(
        "webapp/test/integration/opaTests.qunit.js.hbs",
        context
      );
      await fs.writeFile(
        path.join(outputDir, "webapp/test/integration/opaTests.qunit.js"),
        opaTestsJs
      );

      // AllJourneys
      const allJourneys = await this.renderTemplate(
        "webapp/test/integration/AllJourneys.js.hbs",
        context
      );
      await fs.writeFile(
        path.join(outputDir, "webapp/test/integration/AllJourneys.js"),
        allJourneys
      );

      // Navigation Journey
      const navigationJourney = await this.renderTemplate(
        "webapp/test/integration/NavigationJourney.js.hbs",
        context
      );
      await fs.writeFile(
        path.join(outputDir, "webapp/test/integration/NavigationJourney.js"),
        navigationJourney
      );

      // Entity CRUD Journey
      const crudJourney = await this.renderTemplate(
        "webapp/test/integration/EntityCRUDJourney.js.hbs",
        context
      );
      await fs.writeFile(
        path.join(outputDir, "webapp/test/integration/EntityCRUDJourney.js"),
        crudJourney
      );

      // Page objects
      const appPage = await this.renderTemplate(
        "webapp/test/integration/pages/App.js.hbs",
        context
      );
      await fs.writeFile(path.join(outputDir, "webapp/test/integration/pages/App.js"), appPage);

      const listPage = await this.renderTemplate(
        "webapp/test/integration/pages/List.js.hbs",
        context
      );
      await fs.writeFile(path.join(outputDir, "webapp/test/integration/pages/List.js"), listPage);

      const detailPage = await this.renderTemplate(
        "webapp/test/integration/pages/Detail.js.hbs",
        context
      );
      await fs.writeFile(
        path.join(outputDir, "webapp/test/integration/pages/Detail.js"),
        detailPage
      );

      console.log(`Generated OPA5 tests for ${context.entities.length} entities`);
    } catch (e) {
      console.error("Failed to generate OPA5 tests:", e);
    }
  }

  private async generatePerEntityFiles(outputDir: string, context: any): Promise<void> {
    for (const entity of context.entities) {
      const entityContext = { ...context, entity };
      const entityPascal = this.toPascalCase(entity.originalName || entity.name);

      // Create entity-specific directories
      await fs.mkdir(path.join(outputDir, `webapp/controller/entity`), { recursive: true });
      await fs.mkdir(path.join(outputDir, `webapp/view/entity`), { recursive: true });

      // Entity-specific controllers - try TypeScript first, fallback to JavaScript
      const controllerBases = [
        { base: "EntityList.controller", output: `${entityPascal}List.controller` },
        { base: "EntityDetail.controller", output: `${entityPascal}Detail.controller` },
        { base: "EntityCreate.controller", output: `${entityPascal}Create.controller` },
      ];

      for (const { base, output } of controllerBases) {
        // Try TypeScript first
        try {
          const content = await this.renderTemplate(
            `webapp/controller/entity/${base}.ts.hbs`,
            entityContext
          );
          await fs.writeFile(
            path.join(outputDir, `webapp/controller/entity/${output}.ts`),
            content
          );
        } catch (_e) {
          // Fallback to JavaScript
          try {
            const content = await this.renderTemplate(
              `webapp/controller/entity/${base}.js.hbs`,
              entityContext
            );
            await fs.writeFile(
              path.join(outputDir, `webapp/controller/entity/${output}.js`),
              content
            );
          } catch (_e2) {
            console.warn(`Per-entity controller template not found: ${base}`);
          }
        }
      }

      // Entity-specific views
      const viewTemplates = [
        {
          template: "webapp/view/entity/EntityList.view.xml.hbs",
          output: `${entityPascal}List.view.xml`,
        },
        {
          template: "webapp/view/entity/EntityDetail.view.xml.hbs",
          output: `${entityPascal}Detail.view.xml`,
        },
        {
          template: "webapp/view/entity/EntityCreate.view.xml.hbs",
          output: `${entityPascal}Create.view.xml`,
        },
      ];

      for (const { template, output } of viewTemplates) {
        try {
          const content = await this.renderTemplate(template, entityContext);
          await fs.writeFile(path.join(outputDir, `webapp/view/entity/${output}`), content);
        } catch (e) {
          console.warn(`Per-entity view template not found: ${template}`);
        }
      }
    }

    console.log(`Generated per-entity views/controllers for ${context.entities.length} entities`);
  }

  private async generateFragments(outputDir: string, context: any): Promise<void> {
    const fragments = [
      "DeleteDialog.fragment.xml",
      "QuickSearch.fragment.xml",
      "AdvancedSearch.fragment.xml",
    ];

    for (const fragment of fragments) {
      try {
        const content = await this.renderTemplate(`webapp/fragment/${fragment}.hbs`, context);
        await fs.writeFile(path.join(outputDir, `webapp/fragment/${fragment}`), content);
      } catch (e) {
        console.warn(`Fragment template not found: ${fragment}`);
      }
    }
  }

  private toPascalCase(name: string): string {
    return name
      .replace(/[_-](\w)/g, (_, c) => c.toUpperCase())
      .replace(/^\w/, (c) => c.toUpperCase());
  }
}
