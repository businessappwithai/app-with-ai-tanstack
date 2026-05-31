/* eslint-disable @typescript-eslint/no-explicit-any -- template context objects are dynamically shaped */
/**
 * TanStack Start + Shadcn UI Frontend Generator
 *
 * Two-phase generation process:
 * 1. Scaffold using TanStack Start CLI (bun create tanstack-start)
 * 2. Overlay custom generator templates on top
 *
 * Generates a complete TanStack Start frontend with:
 * - File-based routing with Vite + Vinxi
 * - Shadcn UI components
 * - TanStack Query for data fetching
 * - TanStack Table for data grids
 * - TanStack Form for forms
 * - Runtime UI layout modification via sys_field.seq_no
 *
 * Generated from templates in tanstack-start-nestjs/frontend/
 */

import { type Entity, entityToBusEntity, type Relationship } from "@erdwithai/core/types";
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

export interface TanStackStartFrontendOptions {
  projectName: string;
  projectVersion: string;
  projectDescription: string;
  apiBaseUrl: string;
  enableDarkMode: boolean;
  stackOption?: "tanstackjs-nestjs" | "tanstack-start-nestjs";
}

export class TanStackStartFrontendGenerator extends BaseGenerator {
  private options: TanStackStartFrontendOptions;
  private resolvedTemplateDir: string;

  constructor(options: TanStackStartFrontendOptions) {
    // All frontend templates live in tanstack-start-nestjs/frontend/ as the
    // single canonical source. tanstackjs-nestjs/frontend/ is kept only for
    // legacy scaffold scaffolding differences; Electric/TanStack DB templates
    // are not duplicated there.
    const templateDir = resolveTemplateDir("tanstack-start-nestjs/frontend");
    super(templateDir);
    this.options = options;
    this.resolvedTemplateDir = templateDir;
  }

  async generate(
    entities: Entity[],
    relationships: Relationship[],
    outputDir: string
  ): Promise<void> {
    console.log(`\n📦 Phase 1: Scaffolding TanStack Start project...`);
    await this.scaffoldTanStackProject(outputDir);

    console.log(`\n🎨 Phase 2: Overlaying custom templates...`);
    // Prepare context for templates
    const context = this.prepareContext(entities, relationships);

    // Create additional directories beyond TanStack Start scaffolding
    await this.createAdditionalDirectories(outputDir);

    // Generate core application files
    await this.generateCoreFiles(outputDir, context);

    // Generate API client and hooks
    await this.generateApiLayer(outputDir, context);

    // Generate UI components
    await this.generateComponents(outputDir, context);

    // Generate entity pages
    await this.generateEntityPages(outputDir, context);

    // Generate admin pages for field layout
    await this.generateAdminPages(outputDir, context);

    // Update configuration files
    await this.updateConfigFiles(outputDir, context);

    // Generate test files
    await this.generateTestFiles(outputDir, context);

    console.log(`\n✅ TanStack Start frontend generation complete!`);
  }

  /**
   * Phase 1: Scaffold base TanStack Start project using CLI
   */
  private async scaffoldTanStackProject(outputDir: string): Promise<void> {
    const parentDir = path.dirname(outputDir);
    const projectName = path.basename(outputDir);

    // Create parent directory if it doesn't exist
    await fs.mkdir(parentDir, { recursive: true });

    try {
      // Run: bun create tanstack-start@latest [projectName]
      // This creates the base TanStack Start scaffolding
      console.log(`  Creating TanStack Start project: ${projectName}`);
      try {
        // Try with --yes flag first (works with npm/pnpm)
        await CliExecutor.executeAsync(
          "bun",
          ["create", "tanstack-start@latest", projectName, "--yes"],
          {
            cwd: parentDir,
            stdio: "inherit",
            timeout: 600000,
          }
        );
      } catch {
        // If --yes fails, try without it (some bun versions don't support --yes)
        console.log(`  Retrying scaffolding without --yes flag...`);
        await CliExecutor.executeAsync("bun", ["create", "tanstack-start@latest", projectName], {
          cwd: parentDir,
          stdio: "inherit",
          timeout: 600000,
          // Provide empty stdin to accept defaults
          env: { ...process.env, BUN_CREATE_NONINTERACTIVE: "1" },
        });
      }

      console.log(`  ✅ TanStack Start scaffolding complete`);
    } catch (error) {
      console.error(`Error during TanStack Start scaffolding:`, error);
      // Continue anyway - user may have a custom setup
      console.warn(`  Proceeding without CLI scaffolding - will use template generation`);
    }
  }

  /**
   * Create additional directories beyond TanStack Start scaffolding
   */
  private async createAdditionalDirectories(outputDir: string): Promise<void> {
    const dirs = [
      "src/routes",
      "src/routes/admin",
      "src/routes/auth",
      "src/components/ui",
      "src/components/admin",
      "src/components/forms",
      "src/components/tables",
      "src/components/layout",
      "src/contexts",
      "src/hooks",
      "src/i18n",
      "src/lib",
      "src/messages",
      "src/providers",
      "src/styles",
      "src/types",
      "test",
    ];

    for (const dir of dirs) {
      await fs.mkdir(path.join(outputDir, dir), { recursive: true });
    }
  }

  private prepareContext(
    entities: Entity[],
    relationships: Relationship[]
  ): Record<string, unknown> {
    const busEntities = entities.map((entity) => entityToBusEntity(entity));

    // Prepare main entities for sidebar navigation (top-level entities only)
    const mainEntities = busEntities
      .filter((e) => !e.tableName.includes("_") || e.tableName.match(/^bus_[a-z]+$/))
      .slice(0, 10) // Limit to top 10 main entities
      .map((entity) => ({
        ...entity,
        title: entity.displayName || entity.name,
        description: `Manage ${entity.displayName || entity.name}`,
        icon: this.getIconForEntity(entity.tableName),
      }));

    return {
      project: {
        name: this.options.projectName,
        version: this.options.projectVersion,
        description: this.options.projectDescription,
        id: this.options.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        snake: this.options.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      },
      config: {
        baseUrl: this.options.apiBaseUrl,
        backendPort: (() => {
          try {
            return new URL(this.options.apiBaseUrl || 'http://localhost:3001').port || '3001';
          } catch {
            return '3001';
          }
        })(),
        enableDarkMode: this.options.enableDarkMode,
      },
      projectName: this.options.projectName,
      projectSnake: this.options.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      projectKebab: this.options.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      entities: busEntities,
      mainEntities,
      relationships,
      now: new Date().toISOString(),
    };
  }

  private getIconForEntity(tableName: string): string {
    // Map entity table names to appropriate Lucide icons
    const iconMap: Record<string, string> = {
      bus_patient: "UserCircle",
      bus_patient_insurance: "FileCheck",
      bus_patient_document: "FileText",
      bus_patient_allergy: "Activity",
      bus_insurance_provider: "Building2",
      bus_insurance_claim: "FileCheck",
      bus_appointment: "Calendar",
      bus_admission: "ClipboardList",
      bus_prescription: "Pill",
      bus_medication: "Pill",
      bus_lab_order: "TestTube",
      bus_lab_result: "FileCheck",
      bus_radiology_order: "Activity",
      bus_radiology_report: "FileText",
      bus_department: "Building2",
      bus_staff: "Users",
      bus_customer: "Building2",
      bus_product: "Package",
      bus_order: "ShoppingCart",
      bus_sales_order: "Receipt",
    };
    return iconMap[tableName] || "FileText";
  }

  private async generateCoreFiles(outputDir: string, context: any): Promise<void> {
    const templateDir = this.resolvedTemplateDir;

    // Entry files (client.tsx, ssr.tsx, router.tsx) - always generated to fix missing scaffolding
    const clientEntryContent = await this.renderTemplate("src/client.tsx.hbs", context);
    await fs.writeFile(path.join(outputDir, "src/client.tsx"), clientEntryContent);

    const ssrEntryContent = await this.renderTemplate("src/ssr.tsx.hbs", context);
    await fs.writeFile(path.join(outputDir, "src/ssr.tsx"), ssrEntryContent);

    const routerContent = await this.renderTemplate("src/router.tsx.hbs", context);
    await fs.writeFile(path.join(outputDir, "src/router.tsx"), routerContent);

    // Root layout (__root.tsx)
    const layoutContent = await this.renderTemplate("src/routes/__root.tsx.hbs", context);
    await fs.writeFile(path.join(outputDir, "src/routes/__root.tsx"), layoutContent);

    // Index page (redirects to dashboard)
    const homePageContent = await this.renderTemplate("src/routes/index.tsx.hbs", context);
    await fs.writeFile(path.join(outputDir, "src/routes/index.tsx"), homePageContent);

    // Dashboard page (flat route file)
    const dashboardPageContent = await this.renderTemplate("src/routes/dashboard.tsx.hbs", context);
    await fs.writeFile(path.join(outputDir, "src/routes/dashboard.tsx"), dashboardPageContent);

    // Providers index (rendered template)
    const providersContent = await this.renderTemplate("src/providers/index.tsx.hbs", context);
    await fs.writeFile(path.join(outputDir, "src/providers/index.tsx"), providersContent);

    // ElectricProvider (static file — JSX double-braces conflict with Handlebars)
    try {
      await fs.copyFile(
        path.join(this.resolvedTemplateDir, "src/providers/electric-provider.tsx"),
        path.join(outputDir, "src/providers/electric-provider.tsx")
      );
    } catch (e) {
      console.warn("electric-provider static file not found, skipping:", (e as Error).message);
    }

    // Copy provider files
    const providerFiles = [
      "src/providers/query-provider.tsx",
      "src/providers/browser-router-provider.tsx",
      "src/providers/index.ts",
    ];

    for (const file of providerFiles) {
      try {
        await fs.copyFile(path.join(templateDir, file), path.join(outputDir, file));
      } catch (e) {
        console.warn(`Provider file not found: ${file}`);
      }
    }

    // Copy contexts directory
    await fs.mkdir(path.join(outputDir, "src/contexts"), { recursive: true });
    try {
      await fs.copyFile(
        path.join(templateDir, "src/contexts/auth-context.tsx"),
        path.join(outputDir, "src/contexts/auth-context.tsx")
      );
    } catch (e) {
      console.warn("Auth context file not found");
    }

    // Global styles
    const stylesContent = await this.renderTemplate("src/styles/globals.css.hbs", context);
    await fs.writeFile(path.join(outputDir, "src/styles/globals.css"), stylesContent);

    // Auth pages (login and signup)
    try {
      const loginPageContent = await this.renderTemplate("src/routes/auth/login.tsx.hbs", context);
      await fs.writeFile(path.join(outputDir, "src/routes/auth/login.tsx"), loginPageContent);
    } catch (e) {
      console.warn("Login page template not found");
    }

    try {
      const signupPageContent = await this.renderTemplate(
        "src/routes/auth/signup.tsx.hbs",
        context
      );
      await fs.writeFile(path.join(outputDir, "src/routes/auth/signup.tsx"), signupPageContent);
    } catch (e) {
      console.warn("Signup page template not found");
    }

    // Auth lib file (static)
    try {
      await fs.copyFile(
        path.join(templateDir, "src/lib/auth.ts"),
        path.join(outputDir, "src/lib/auth.ts")
      );
    } catch (e) {
      console.warn("Auth lib file not found");
    }
  }

  private async generateApiLayer(outputDir: string, context: any): Promise<void> {
    const templateDir = this.resolvedTemplateDir;

    // API client (rendered template)
    const apiClientContent = await this.renderTemplate("src/lib/api-client.ts.hbs", context);
    await fs.writeFile(path.join(outputDir, "src/lib/api-client.ts"), apiClientContent);

    // ElectricSQL + PGlite setup (local-first sys_ entity sync)
    try {
      const electricContent = await this.renderTemplate("src/lib/electric.ts.hbs", context);
      await fs.writeFile(path.join(outputDir, "src/lib/electric.ts"), electricContent);
    } catch (e) {
      console.warn("Electric template not found, skipping:", (e as Error).message);
    }

    // TanStack DB collections backed by PGlite
    try {
      const collectionsContent = await this.renderTemplate("src/lib/sys-collections.ts.hbs", context);
      await fs.writeFile(path.join(outputDir, "src/lib/sys-collections.ts"), collectionsContent);
    } catch (e) {
      console.warn("sys-collections template not found, skipping:", (e as Error).message);
    }

    // i18n translation utilities (static files, copy directly)
    const i18nFiles = [
      "src/lib/translations.tsx",
      "src/lib/i18n-fields.ts",
      "src/i18n/config.ts",
      "src/messages/en.json",
      "src/messages/de.json",
    ];

    for (const file of i18nFiles) {
      try {
        await fs.copyFile(path.join(templateDir, file), path.join(outputDir, file));
      } catch (e) {
        console.warn(`i18n file not found: ${file}`);
      }
    }

    // Entity hooks using TanStack Query
    const hooksContent = await this.renderTemplate("src/hooks/use-entities.ts.hbs", context);
    await fs.writeFile(path.join(outputDir, "src/hooks/use-entities.ts"), hooksContent);

    // Field metadata hooks (HTTP-based, kept for backwards compat)
    const fieldHooksContent = await this.renderTemplate(
      "src/hooks/use-field-metadata.ts.hbs",
      context
    );
    await fs.writeFile(path.join(outputDir, "src/hooks/use-field-metadata.ts"), fieldHooksContent);

    // Local-first sys_ hooks via TanStack DB + ElectricSQL
    try {
      const sysElectricContent = await this.renderTemplate(
        "src/hooks/use-sys-electric.ts.hbs",
        context
      );
      await fs.writeFile(path.join(outputDir, "src/hooks/use-sys-electric.ts"), sysElectricContent);
    } catch (e) {
      console.warn("use-sys-electric template not found, skipping:", (e as Error).message);
    }
  }

  private async generateComponents(outputDir: string, _context: any): Promise<void> {
    const templateDir = this.resolvedTemplateDir;

    // Copy Shadcn UI components (static files, no templating needed)
    const uiComponents = [
      "button",
      "input",
      "textarea",
      "checkbox",
      "select",
      "label",
      "skeleton",
      "table",
      "card",
      "tabs",
      "switch",
      "badge",
      "dropdown-menu",
      "avatar",
      "scroll-area",
      "alert-dialog",
      "dialog",
      "icon",
      "slider",
    ];

    for (const component of uiComponents) {
      try {
        await fs.copyFile(
          path.join(templateDir, `src/components/ui/${component}.tsx`),
          path.join(outputDir, `src/components/ui/${component}.tsx`)
        );
      } catch (e) {
        console.warn(`UI component not found: ${component}`);
      }
    }

    // Copy utils for cn function
    try {
      await fs.copyFile(
        path.join(templateDir, "src/lib/utils.ts"),
        path.join(outputDir, "src/lib/utils.ts")
      );
    } catch (e) {
      console.warn("Utils file not found");
    }

    // Copy layout components
    await fs.mkdir(path.join(outputDir, "src/components/layout"), { recursive: true });

    // Copy static layout components
    const staticLayoutComponents = [
      "src/components/layout/app-layout.tsx",
      "src/components/layout/header.tsx",
      "src/components/layout/index.ts",
    ];

    for (const component of staticLayoutComponents) {
      try {
        await fs.copyFile(path.join(templateDir, component), path.join(outputDir, component));
      } catch (e) {
        console.warn(`Layout component not found: ${component}`);
      }
    }

    // Generate sidebar from template
    try {
      const sidebarContent = await this.renderTemplate(
        "src/components/layout/sidebar.tsx.hbs",
        _context
      );
      await fs.writeFile(path.join(outputDir, "src/components/layout/sidebar.tsx"), sidebarContent);
    } catch (e) {
      console.warn("Sidebar template generation failed:", (e as Error).message);
      // Fallback to copying static file if template doesn't exist
      try {
        await fs.copyFile(
          path.join(templateDir, "src/components/layout/sidebar.tsx"),
          path.join(outputDir, "src/components/layout/sidebar.tsx")
        );
      } catch (e2) {
        console.warn("Sidebar fallback also failed:", (e2 as Error).message);
      }
    }

    // Copy static React components (these have complex JSX that doesn't work well with Handlebars)
    const staticComponents = [
      {
        src: "src/components/forms/dynamic-form.tsx",
        dest: "src/components/forms/dynamic-form.tsx",
      },
      {
        src: "src/components/forms/master-detail-tabs.tsx",
        dest: "src/components/forms/master-detail-tabs.tsx",
      },
      {
        src: "src/components/tables/dynamic-table.tsx",
        dest: "src/components/tables/dynamic-table.tsx",
      },
      {
        src: "src/components/admin/field-layout-editor.tsx",
        dest: "src/components/admin/field-layout-editor.tsx",
      },
      {
        src: "src/components/admin/field-group-manager.tsx",
        dest: "src/components/admin/field-group-manager.tsx",
      },
    ];

    for (const component of staticComponents) {
      try {
        await fs.copyFile(
          path.join(templateDir, component.src),
          path.join(outputDir, component.dest)
        );
      } catch (e) {
        console.warn(`Static component not found: ${component.src}`);
      }
    }
  }

  private async generateEntityPages(outputDir: string, context: any): Promise<void> {
    for (const entity of context.entities) {
      const entityContext = { ...context, entity };
      const entityDir = path.join(outputDir, `src/routes/$entity`);
      // Create the directory for this entity's routes
      await fs.mkdir(entityDir, { recursive: true });

      // List page - renders to src/routes/$entity/index.tsx per entity
      const listPageFilename = `${entity.tableName}.tsx`;
      const listPageContent = await this.renderTemplate(
        "src/routes/$entity/index.tsx.hbs",
        entityContext
      );
      await fs.writeFile(path.join(outputDir, "src/routes", listPageFilename), listPageContent);

      // Detail page - renders to src/routes/$entity.$id.tsx per entity
      const detailPageFilename = `${entity.tableName}.$id.tsx`;
      const detailPageContent = await this.renderTemplate(
        "src/routes/$entity/$id.tsx.hbs",
        entityContext
      );
      await fs.writeFile(path.join(outputDir, "src/routes", detailPageFilename), detailPageContent);
    }
  }

  private async generateAdminPages(outputDir: string, context: any): Promise<void> {
    const adminDir = path.join(outputDir, "src/routes/admin");
    await fs.mkdir(adminDir, { recursive: true });

    // Admin dashboard - renders as /admin via admin/index.tsx
    const dashboardContent = await this.renderTemplate("src/routes/admin/index.tsx.hbs", context);
    await fs.writeFile(path.join(adminDir, "index.tsx"), dashboardContent);

    // Field layout management - renders as /admin/fields via admin/fields.tsx
    const fieldsContent = await this.renderTemplate("src/routes/admin/fields.tsx.hbs", context);
    await fs.writeFile(path.join(adminDir, "fields.tsx"), fieldsContent);

    // Reference types - renders as /admin/references via admin/references.tsx
    try {
      const referencesContent = await this.renderTemplate(
        "src/routes/admin/references.tsx.hbs",
        context
      );
      await fs.writeFile(path.join(adminDir, "references.tsx"), referencesContent);
    } catch (e) {
      console.warn("Admin references page template not found");
    }

    // Table browser - renders as /admin/tables via admin/tables.tsx
    try {
      const tablesContent = await this.renderTemplate("src/routes/admin/tables.tsx.hbs", context);
      await fs.writeFile(path.join(adminDir, "tables.tsx"), tablesContent);
    } catch (e) {
      console.warn("Admin tables page template not found");
    }

    // Table detail - renders as /admin/tables/$tableName via admin/tables.$tableName.tsx
    try {
      const tableDetailContent = await this.renderTemplate(
        "src/routes/admin/tables.$tableName.tsx.hbs",
        context
      );
      await fs.writeFile(path.join(adminDir, "tables.$tableName.tsx"), tableDetailContent);
    } catch (e) {
      console.warn("Admin table detail template not found");
    }

    // Business rules management - renders as /admin/rules via admin/rules.tsx
    try {
      const rulesContent = await this.renderTemplate("src/routes/admin/rules.tsx.hbs", context);
      await fs.writeFile(path.join(adminDir, "rules.tsx"), rulesContent);
    } catch (e) {
      console.warn("Admin rules page template not found");
    }

    // Workflow monitoring - renders as /admin/workflows via admin/workflows.tsx
    try {
      const workflowsContent = await this.renderTemplate(
        "src/routes/admin/workflows.tsx.hbs",
        context
      );
      await fs.writeFile(path.join(adminDir, "workflows.tsx"), workflowsContent);
    } catch (e) {
      console.warn("Admin workflows page template not found");
    }
  }

  /**
   * Update/enhance configuration files created by TanStack Start CLI
   */
  private async updateConfigFiles(outputDir: string, context: any): Promise<void> {
    // Update package.json with additional dependencies and custom config
    const packageJsonContent = await this.renderTemplate("package.json.hbs", context);
    await fs.writeFile(
      path.join(outputDir, "package.json"),
      typeof packageJsonContent === "string"
        ? packageJsonContent
        : JSON.stringify(packageJsonContent, null, 2)
    );

    // Update/generate TanStack Start config if template exists
    try {
      const tanStackConfigContent = await this.renderTemplate("app.config.ts.hbs", context);
      await fs.writeFile(path.join(outputDir, "app.config.ts"), tanStackConfigContent);
    } catch (e) {
      console.warn("Custom app.config.ts template not found, keeping TanStack Start default");
    }

    // Update tailwind.config.js
    try {
      const tailwindContent = await this.renderTemplate("tailwind.config.js.hbs", context);
      await fs.writeFile(path.join(outputDir, "tailwind.config.js"), tailwindContent);
    } catch (e) {
      console.warn("Custom tailwind config template not found, keeping TanStack Start default");
    }

    // Update tsconfig.json
    try {
      const tsconfigContent = await this.renderTemplate("tsconfig.json.hbs", context);
      await fs.writeFile(path.join(outputDir, "tsconfig.json"), tsconfigContent);
    } catch (e) {
      console.warn("Custom tsconfig template not found, keeping TanStack Start default");
    }

    // Update Biome configuration
    try {
      const biomeContent = await this.renderTemplate("biome.json.hbs", context);
      await fs.writeFile(path.join(outputDir, "biome.json"), biomeContent);
    } catch (e) {
      console.warn("Custom Biome config template not found, using defaults");
    }

    // Generate environment configuration for TanStack Start
    const envLocalContent = `VITE_API_URL=${context.config.baseUrl}
VITE_MASTRA_URL=http://localhost:4111
VITE_ELECTRIC_URL=${context.config.baseUrl}/v1/shape
PORT=3001
`;
    await fs.writeFile(path.join(outputDir, ".env.local"), envLocalContent);
  }

  private async generateTestFiles(outputDir: string, context: any): Promise<void> {
    try {
      // Test setup
      const setupContent = await this.renderTemplate("test/setup.tsx.hbs", context);
      await fs.writeFile(path.join(outputDir, "test/setup.tsx"), setupContent);

      // Component tests
      const componentsTestContent = await this.renderTemplate(
        "test/components.test.tsx.hbs",
        context
      );
      await fs.writeFile(path.join(outputDir, "test/components.test.tsx"), componentsTestContent);

      // Vitest config
      const vitestContent = await this.renderTemplate("vitest.config.ts.hbs", context);
      await fs.writeFile(path.join(outputDir, "vitest.config.ts"), vitestContent);
    } catch (e) {
      // Test templates not found, skip test generation
      console.warn("Unit test templates not found, skipping unit test generation");
    }

    // Generate E2E tests
    await this.generateE2ETests(outputDir, context);
  }

  private async generateE2ETests(outputDir: string, context: any): Promise<void> {
    try {
      // Create E2E directory structure
      const e2eDir = path.join(outputDir, "e2e/pages");
      await fs.mkdir(e2eDir, { recursive: true });

      // Playwright config
      try {
        const playwrightConfig = await this.renderTemplate("playwright.config.ts.hbs", context);
        await fs.writeFile(path.join(outputDir, "playwright.config.ts"), playwrightConfig);
      } catch (e) {
        console.warn("Playwright config template not found");
      }

      // E2E package.json
      try {
        const e2ePackageJson = await this.renderTemplate("e2e/package.json.hbs", context);
        await fs.writeFile(path.join(outputDir, "e2e", "package.json"), e2ePackageJson);
      } catch (e) {
        console.warn("E2E package.json template not found");
      }

      // Test data fixtures
      try {
        const testData = await this.renderTemplate("e2e/test-data.ts.hbs", context);
        await fs.writeFile(path.join(outputDir, "e2e", "test-data.ts"), testData);
      } catch (e) {
        console.warn("Test data template not found");
      }

      // Navigation tests
      try {
        const navigationTests = await this.renderTemplate(
          "e2e/pages/navigation.spec.ts.hbs",
          context
        );
        await fs.writeFile(path.join(e2eDir, "navigation.spec.ts"), navigationTests);
      } catch (e) {
        console.warn("Navigation test template not found");
      }

      // Generate CRUD tests for each entity
      for (const entity of context.entities) {
        try {
          const entityTest = await this.renderTemplate("e2e/pages/entity.spec.ts.hbs", {
            ...context,
            name: entity.name,
            tableName: entity.tableName,
            attributes: entity.attributes,
          });
          await fs.writeFile(path.join(e2eDir, `${entity.name.toLowerCase()}.spec.ts`), entityTest);
        } catch (e) {
          console.warn(`Entity test template not found for ${entity.name}:`, e);
        }
      }

      // Generate comprehensive domain E2E test (all entities, API health, workflows)
      try {
        const projectSlug = (this.options.projectName || "app")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        const completeTest = await this.renderTemplate("e2e/complete.e2e-test.ts.hbs", context);
        await fs.writeFile(path.join(outputDir, "e2e", `${projectSlug}.e2e-test.ts`), completeTest);
      } catch (e) {
        console.warn("Complete E2E test template not found:", e);
      }
    } catch (e) {
      console.warn("E2E test generation failed:", e);
    }
  }
}
