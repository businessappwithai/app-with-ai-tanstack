/* eslint-disable @typescript-eslint/no-explicit-any -- template context objects are dynamically shaped */
/**
 * Option 1: TanStack Start + Shadcn UI Frontend Generator
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
 * Generated from templates in nextjs-nestjs/frontend/
 */

import { type Entity, entityToBusEntity, type Relationship } from "@erdwithai/core/types";
import * as fs from "fs/promises";
import * as path from "path";
import { BaseGenerator } from "../base.generator";
import { CliExecutor } from "../../utils/cli-executor";

export interface NextJsFrontendOptions {
  projectName: string;
  projectVersion: string;
  projectDescription: string;
  apiBaseUrl: string;
  enableDarkMode: boolean;
}

export class NextJsFrontendGenerator extends BaseGenerator {
  private options: NextJsFrontendOptions;

  constructor(options: NextJsFrontendOptions) {
    // Find the template directory
    // After bun bundles the code, the class is in dist/cli/generate.js or dist/index.js
    // We need to navigate from there to packages/generator/templates/nextjs-nestjs/frontend/

    super(path.join(__dirname, "../../../templates/nextjs-nestjs/frontend"));
    this.options = options;
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
      await CliExecutor.executeAsync("bun", [
        "create",
        "tanstack-start@latest",
        projectName,
        "--yes",
      ], {
        cwd: parentDir,
        stdio: "inherit",
        timeout: 600000, // 10 minutes for TanStack setup
      });

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
      "src/app",
      "src/app/(entities)",
      "src/app/admin",
      "src/app/auth/login",
      "src/app/auth/signup",
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
      },
      config: {
        baseUrl: this.options.apiBaseUrl,
        enableDarkMode: this.options.enableDarkMode,
      },
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
    const templateDir = path.join(__dirname, "../../../templates/nextjs-nestjs/frontend");

    // Root layout
    const layoutContent = await this.renderTemplate("src/app/layout.tsx.hbs", context);
    await fs.writeFile(path.join(outputDir, "src/app/layout.tsx"), layoutContent);

    // Root page (redirects to dashboard)
    const homePageContent = await this.renderTemplate("src/app/page.tsx.hbs", context);
    await fs.writeFile(path.join(outputDir, "src/app/page.tsx"), homePageContent);

    // Dashboard page
    await fs.mkdir(path.join(outputDir, "src/app/dashboard"), { recursive: true });
    const dashboardPageContent = await this.renderTemplate(
      "src/app/dashboard/page.tsx.hbs",
      context
    );
    await fs.writeFile(path.join(outputDir, "src/app/dashboard/page.tsx"), dashboardPageContent);

    // Providers index (rendered template)
    const providersContent = await this.renderTemplate("src/providers/index.tsx.hbs", context);
    await fs.writeFile(path.join(outputDir, "src/providers/index.tsx"), providersContent);

    // Copy provider files (Note: browser-router-provider is not needed for Next.js App Router)
    const providerFiles = ["src/providers/query-provider.tsx"];

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
      const loginPageContent = await this.renderTemplate(
        "src/app/auth/login/page.tsx.hbs",
        context
      );
      await fs.writeFile(path.join(outputDir, "src/app/auth/login/page.tsx"), loginPageContent);
    } catch (e) {
      console.warn("Login page template not found");
    }

    try {
      const signupPageContent = await this.renderTemplate(
        "src/app/auth/signup/page.tsx.hbs",
        context
      );
      await fs.writeFile(path.join(outputDir, "src/app/auth/signup/page.tsx"), signupPageContent);
    } catch (e) {
      console.warn("Signup page template not found");
    }

    // Better-auth client lib (static file)
    try {
      await fs.copyFile(
        path.join(templateDir, "src/lib/auth.ts"),
        path.join(outputDir, "src/lib/auth.ts")
      );
    } catch (e) {
      console.warn("Auth lib file not found");
    }

    // Next.js middleware for authentication (static file)
    try {
      await fs.copyFile(
        path.join(templateDir, "src/middleware.ts"),
        path.join(outputDir, "src/middleware.ts")
      );
    } catch (e) {
      console.warn("Middleware file not found");
    }
  }

  private async generateApiLayer(outputDir: string, context: any): Promise<void> {
    const templateDir = path.join(__dirname, "../../../templates/nextjs-nestjs/frontend");

    // API client (static file, copy directly)
    await fs.copyFile(
      path.join(templateDir, "src/lib/api-client.ts"),
      path.join(outputDir, "src/lib/api-client.ts")
    );

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

    // Field metadata hooks
    const fieldHooksContent = await this.renderTemplate(
      "src/hooks/use-field-metadata.ts.hbs",
      context
    );
    await fs.writeFile(path.join(outputDir, "src/hooks/use-field-metadata.ts"), fieldHooksContent);
  }

  private async generateComponents(outputDir: string, _context: any): Promise<void> {
    const templateDir = path.join(__dirname, "../../../templates/nextjs-nestjs/frontend");

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
      const entityDir = path.join(outputDir, `src/app/(entities)/${entity.tableName}`);

      await fs.mkdir(entityDir, { recursive: true });
      await fs.mkdir(path.join(entityDir, "[id]"), { recursive: true });

      // List page
      const listPageContent = await this.renderTemplate(
        "src/app/(entities)/[entity]/page.tsx.hbs",
        entityContext
      );
      await fs.writeFile(path.join(entityDir, "page.tsx"), listPageContent);

      // Detail page
      const detailPageContent = await this.renderTemplate(
        "src/app/(entities)/[entity]/[id]/page.tsx.hbs",
        entityContext
      );
      await fs.writeFile(path.join(entityDir, "[id]/page.tsx"), detailPageContent);
    }
  }

  private async generateAdminPages(outputDir: string, context: any): Promise<void> {
    const adminDir = path.join(outputDir, "src/app/admin");
    await fs.mkdir(path.join(adminDir, "fields"), { recursive: true });
    await fs.mkdir(path.join(adminDir, "rules"), { recursive: true });
    await fs.mkdir(path.join(adminDir, "workflows"), { recursive: true });

    // Admin dashboard
    const dashboardContent = await this.renderTemplate("src/app/admin/page.tsx.hbs", context);
    await fs.writeFile(path.join(adminDir, "page.tsx"), dashboardContent);

    // Field layout management
    const fieldsContent = await this.renderTemplate("src/app/admin/fields/page.tsx.hbs", context);
    await fs.writeFile(path.join(adminDir, "fields/page.tsx"), fieldsContent);

    // Business rules management
    try {
      const rulesContent = await this.renderTemplate("src/app/admin/rules/page.tsx.hbs", context);
      await fs.writeFile(path.join(adminDir, "rules/page.tsx"), rulesContent);
    } catch (e) {
      console.warn("Admin rules page template not found");
    }

    // Workflow monitoring
    try {
      const workflowsContent = await this.renderTemplate(
        "src/app/admin/workflows/page.tsx.hbs",
        context
      );
      await fs.writeFile(path.join(adminDir, "workflows/page.tsx"), workflowsContent);
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
      const tanStackConfigContent = await this.renderTemplate("vite.config.ts.hbs", context);
      await fs.writeFile(path.join(outputDir, "vite.config.ts"), tanStackConfigContent);
    } catch (e) {
      console.warn("Custom vite config template not found, keeping TanStack Start default");
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

    // Update ESLint configuration
    try {
      const eslintContent = await this.renderTemplate(".eslintrc.cjs.hbs", context);
      await fs.writeFile(path.join(outputDir, ".eslintrc.cjs"), eslintContent);
    } catch (e) {
      console.warn("Custom ESLint config template not found, keeping TanStack Start default");
    }

    // Update Prettier configuration
    try {
      const prettierContent = await this.renderTemplate(".prettierrc.hbs", context);
      await fs.writeFile(path.join(outputDir, ".prettierrc"), prettierContent);
    } catch (e) {
      console.warn("Custom Prettier config template not found, keeping TanStack Start default");
    }

    // Generate environment configuration for TanStack Start
    const envLocalContent = `VITE_API_URL=${context.config.baseUrl}
VITE_MASTRA_URL=http://localhost:4111
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
