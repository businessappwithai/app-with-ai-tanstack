/**
 * Full Stack Generator
 *
 * Orchestrates generation of complete full-stack applications:
 * - tanstackjs-nestjs: NestJS + TanStack Start (Modern Web Stack)
 *
 * Generates both backend and frontend with Application Dictionary
 * infrastructure and runtime UI configuration support.
 */

import type { Entity, Relationship } from "@erdwithai/core/types";
import * as fs from "fs/promises";
import * as path from "path";
import type { EntityCategory } from "../parsers/category.parser";
import {
  NestJsBackendGenerator,
  type NestJsBackendOptions,
} from "./tanstack-start-nestjs/nestjs-backend.generator";
import {
  TanStackStartFrontendGenerator,
  type TanStackStartFrontendOptions,
} from "./tanstack-start-nestjs/tanstack-start-frontend.generator";
import { BunE2ETestGenerator } from "./tests/bun-e2e.generator";

export type StackOption = "tanstackjs-nestjs" | "tanstack-start-nestjs";
export type AIAddonOption = "none" | "basic" | "advanced";

export interface FullStackGeneratorOptions {
  stackOption: StackOption;
  projectName: string;
  projectVersion: string;
  projectDescription: string;
  outputDir: string;
  port: number;
  frontendPort?: number;

  // AI Natural Language Add-on (optional)
  aiNlAddon?: AIAddonOption;
  aiNlProvider?: "anthropic" | "openai";
  aiNlModel?: string;

  // Skip network CLI scaffolding; generate purely from bundled templates.
  skipCliScaffold?: boolean;

  // tanstackjs-nestjs specific
  tanstackStartNestjs?: {
    backend: Partial<NestJsBackendOptions>;
    frontend: Partial<TanStackStartFrontendOptions>;
  };

  skipFrontend?: boolean;
  skipBackend?: boolean;

  /** Skip generation of the bun:test E2E suite in <outputDir>/tests. */
  skipTests?: boolean;
  /**
   * Application Dictionary entity categories parsed from the model's
   * `%%category` directives. Falls back to a single "General" default.
   */
  categories?: EntityCategory[];
  /** Records the bulk-seed suite creates per entity (default 1000). */
  recordsPerEntity?: number;
}

export class FullStackGenerator {
  private options: FullStackGeneratorOptions;

  constructor(options: FullStackGeneratorOptions) {
    this.options = options;
  }

  /**
   * Generate complete full-stack application
   */
  async generate(entities: Entity[], relationships: Relationship[]): Promise<void> {
    const outputDir = this.options.outputDir;

    // Create root directory
    await fs.mkdir(outputDir, { recursive: true });

    // Generate based on stack option
    await this.generateTanStackStartNestjs(entities, relationships, outputDir);

    // Generate shared files
    await this.generateSharedFiles(outputDir);

    console.log(`\n✅ Full-stack application generated at: ${outputDir}`);
    console.log(`   Stack: ${this.getStackDescription()}`);
    console.log(`   Entities: ${entities.length}`);
    console.log(`   Relationships: ${relationships.length}`);
    if (this.options.aiNlAddon && this.options.aiNlAddon !== "none") {
      console.log(
        `   AI NL Add-on: ${this.options.aiNlAddon} (${this.options.aiNlProvider || "anthropic"})`
      );
    }

    // Run mandatory linting checks
    console.log("\n🔍 Running mandatory linting checks...");
    await this.runLintingChecks(outputDir);
  }

  /**
   * Generate tanstackjs-nestjs: TanStack Start + NestJS
   */
  private async generateTanStackStartNestjs(
    entities: Entity[],
    relationships: Relationship[],
    outputDir: string
  ): Promise<void> {
    const backendDir = path.join(outputDir, "backend");
    const frontendDir = path.join(outputDir, "frontend");

    // AI NL Add-on config (passed to templates)
    const aiConfig = {
      aiNlAddon: this.options.aiNlAddon || "none",
      aiNlProvider: this.options.aiNlProvider || "anthropic",
      aiNlModel: this.options.aiNlModel || "claude-sonnet-4-20250514",
    };

    // Backend options
    const backendOptions: NestJsBackendOptions = {
      projectName: this.options.projectName,
      projectVersion: this.options.projectVersion,
      projectDescription: this.options.projectDescription,
      databaseType: "postgresql",
      port: this.options.port,
      frontendPort: this.options.frontendPort ?? this.options.port + 1,
      enableSwagger: true,
      enableCors: true,
      skipCliScaffold: this.options.skipCliScaffold,
      categories: this.options.categories,
      ...aiConfig,
      ...this.options.tanstackStartNestjs?.backend,
    };

    if (!this.options.skipBackend) {
      console.log("📦 Generating NestJS backend...");
      const backendGenerator = new NestJsBackendGenerator(backendOptions);
      await backendGenerator.generate(entities, relationships, backendDir);
    }

    if (!this.options.skipFrontend) {
      const frontendOptions: TanStackStartFrontendOptions = {
        projectName: this.options.projectName,
        projectVersion: this.options.projectVersion,
        projectDescription: this.options.projectDescription,
        apiBaseUrl: `http://localhost:${this.options.port}`,
        enableDarkMode: false,
        stackOption: this.options.stackOption as "tanstackjs-nestjs" | "tanstack-start-nestjs",
        skipCliScaffold: this.options.skipCliScaffold,
        ...aiConfig,
        ...this.options.tanstackStartNestjs?.frontend,
      };

      console.log("📦 Generating TanStack Start frontend...");
      const frontendGenerator = new TanStackStartFrontendGenerator(frontendOptions);
      await frontendGenerator.generate(entities, relationships, frontendDir);
    }

    if (!this.options.skipTests) {
      console.log("🧪 Generating bun:test E2E suite...");
      const testGenerator = new BunE2ETestGenerator({
        projectName: this.options.projectName,
        projectVersion: this.options.projectVersion,
        projectDescription: this.options.projectDescription,
        port: this.options.port,
        frontendPort: this.options.frontendPort ?? this.options.port + 1,
        recordsPerEntity: this.options.recordsPerEntity,
      });
      await testGenerator.generate(entities, relationships, outputDir);
    }
  }

  /**
   * Generate shared configuration files
   */
  private async generateSharedFiles(outputDir: string): Promise<void> {
    // Root package.json for monorepo
    const rootPackageJson = {
      name: this.options.projectName,
      version: this.options.projectVersion,
      description: this.options.projectDescription,
      private: true,
      workspaces: this.options.skipTests
        ? ["backend", "frontend"]
        : ["backend", "frontend", "tests"],
      scripts: {
        dev: 'concurrently "bun run dev:backend" "bun run dev:frontend"',
        "dev:backend": "cd backend && bun run start:dev",
        "dev:frontend": "cd frontend && bun run dev",
        build: "bun run build:backend && bun run build:frontend",
        "build:backend": "cd backend && bun run build",
        "build:frontend": "cd frontend && bun run build",
        "db:migrate": "cd backend && bun run migrate",
        "db:seed": "cd backend && bun run seed",
        "db:setup": "cd backend && bun run db:setup",
        test: "bun run test:backend && bun run test:frontend",
        "test:backend": "cd backend && bun run test",
        "test:frontend": "cd frontend && bun run test",
        // End-to-end suites run on bun:test and start the backend themselves.
        "test:e2e": "cd tests && bun run test",
        "test:e2e:fast": "cd tests && bun run test:fast",
        "test:e2e:attach": "cd tests && bun run test:attach",
        "test:all": "bun run test && bun run test:e2e",
      },
      devDependencies: {
        concurrently: "^8.2.0",
      },
      overrides: {
        "@tanstack/router-generator": "1.97.1",
        "@tanstack/router-plugin": "1.97.1",
        "@tanstack/start-plugin": "1.97.19",
        "@tanstack/server-functions-plugin": "1.97.19",
        "@tanstack/react-cross-context": "1.97.18",
        "@tanstack/directive-functions-plugin": "1.97.19",
        "@tanstack/virtual-file-routes": "1.97.8",
      },
    };

    await fs.writeFile(
      path.join(outputDir, "package.json"),
      JSON.stringify(rootPackageJson, null, 2)
    );

    // README.md
    const readme = this.generateReadme();
    await fs.writeFile(path.join(outputDir, "README.md"), readme);

    // .gitignore
    const gitignore = `# Dependencies
node_modules/

# Build output
dist/
.next/
out/

# Generated by TanStack Router on dev/build — never edit or commit
frontend/src/routeTree.gen.ts

# Environment files
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Database
*.db
*.sqlite
`;
    await fs.writeFile(path.join(outputDir, ".gitignore"), gitignore);

    // docker-compose.yml
    try {
      const templateDir = await this.findTemplatesDir();
      const dockerComposeTpl = path.join(
        templateDir,
        "tanstack-start-nestjs/docker-compose.yml.hbs"
      );
      const tplContent = await fs.readFile(dockerComposeTpl, "utf-8");
      const backendPort = this.options.port;
      const frontendPort = this.options.frontendPort ?? this.options.port + 1;
      const projectId = this.options.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const projectSnake = this.options.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      const dockerCompose = tplContent
        .replace(/\{\{project\.name\}\}/g, this.options.projectName)
        .replace(/\{\{project\.id\}\}/g, projectId)
        .replace(/\{\{project\.name \| replace '-' '_'\}\}/g, projectSnake)
        .replace(/\{\{project\.backendPort\}\}/g, String(backendPort))
        .replace(/\{\{project\.frontendPort\}\}/g, String(frontendPort));
      await fs.writeFile(path.join(outputDir, "docker-compose.yml"), dockerCompose);
    } catch (e) {
      console.warn(`docker-compose.yml generation skipped: ${(e as Error).message}`);
    }

    // Copy GitHub Actions workflows
    await this.copyGitHubWorkflows(outputDir);
  }

  private async findTemplatesDir(): Promise<string> {
    const cwd = process.cwd();
    const candidates = [
      // When cwd is the generator package (bun --filter mode)
      path.join(cwd, "templates"),
      // When cwd is workspace root
      path.join(cwd, "packages/generator/templates"),
      // Navigate up 3 from packages/generator to workspace root, then back
      path.join(cwd, "../../../packages/generator/templates"),
      path.join(cwd, "../../packages/generator/templates"),
      // __dirname relative (dist/cli/ → up to package root → templates)
      path.join(__dirname, "../../templates"),
      path.join(__dirname, "../../../templates"),
    ];
    for (const c of candidates) {
      try {
        const s = await fs.stat(c);
        if (s.isDirectory()) return c;
      } catch {
        /* continue */
      }
    }
    return candidates[0]!;
  }

  /**
   * Copy GitHub Actions workflow templates to the output directory
   */
  private async copyGitHubWorkflows(outputDir: string): Promise<void> {
    const workflowsDir = path.join(outputDir, ".github", "workflows");
    await fs.mkdir(workflowsDir, { recursive: true });

    if (this.options.stackOption === "tanstackjs-nestjs") {
      console.log("📋 Setting up GitHub Actions workflows...");

      // Find the templates directory by traversing up from the dist directory
      let templatesDir = path.resolve(__dirname, "../../../templates");

      // If __dirname doesn't point to the right place, try to find the root
      if (!(await this.directoryExists(templatesDir))) {
        // Try alternate paths
        const currentDir = process.cwd();
        const possiblePaths = [
          path.join(currentDir, "packages/generator/templates"),
          path.join(currentDir, "../packages/generator/templates"),
          path.join(currentDir, "../../packages/generator/templates"),
        ];

        for (const possiblePath of possiblePaths) {
          if (await this.directoryExists(possiblePath)) {
            templatesDir = possiblePath;
            break;
          }
        }
      }

      // Copy frontend workflows
      try {
        const frontendWorkflowsSource = path.join(
          templatesDir,
          "tanstack-start-nestjs/frontend/.github/workflows"
        );

        if (await this.directoryExists(frontendWorkflowsSource)) {
          const entries = await fs.readdir(frontendWorkflowsSource);
          for (const entry of entries) {
            if (entry.endsWith(".hbs")) {
              const source = path.join(frontendWorkflowsSource, entry);
              const destName = entry.replace(".hbs", "");
              const dest = path.join(workflowsDir, destName);
              const content = await fs.readFile(source, "utf-8");
              const rendered = this.renderWorkflowTemplate(content);
              await fs.writeFile(dest, rendered);
              console.log(`   ✓ Created frontend workflow: ${destName}`);
            }
          }
        }
      } catch (e) {
        // Workflows may not exist yet
      }

      // Copy backend workflows
      try {
        const backendWorkflowsSource = path.join(
          templatesDir,
          "tanstack-start-nestjs/backend/.github/workflows"
        );

        if (await this.directoryExists(backendWorkflowsSource)) {
          const entries = await fs.readdir(backendWorkflowsSource);
          for (const entry of entries) {
            if (entry.endsWith(".hbs")) {
              const source = path.join(backendWorkflowsSource, entry);
              const destName = `backend-${entry.replace(".hbs", "")}`;
              const dest = path.join(workflowsDir, destName);
              const content = await fs.readFile(source, "utf-8");
              const rendered = this.renderWorkflowTemplate(content);
              await fs.writeFile(dest, rendered);
              console.log(`   ✓ Created backend workflow: ${destName}`);
            }
          }
        }
      } catch (e) {
        // Workflows may not exist yet
      }
    }
  }

  /**
   * Check if a directory exists
   */
  private async directoryExists(dir: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dir);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Render template variables in workflow files
   */
  private renderWorkflowTemplate(content: string): string {
    return content
      .replace(/\{\{project\.name\}\}/g, this.options.projectName)
      .replace(
        /\{\{project\.id\}\}/g,
        this.options.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      )
      .replace(/\{\{project\.version\}\}/g, this.options.projectVersion)
      .replace(/\{\{project\.description\}\}/g, this.options.projectDescription);
  }

  /**
   * Generate README content
   */
  private generateReadme(): string {
    const stackInfo =
      "- **Backend**: NestJS + Fastify + Kysely\n- **Frontend**: TanStack Start + Shadcn UI + TanStack Query/Table/Form";

    return `# ${this.options.projectName}

${this.options.projectDescription}

## Tech Stack

${stackInfo}

## Features

- **Compiere-style Application Dictionary**: Runtime-configurable UI via sys_field metadata
- **sys_ Tables**: System/dictionary tables for configuration
- **bus_ Tables**: Business entity tables generated from ERD
- **Dynamic UI**: Form and table layouts driven by seq_no ordering
- **Admin Interface**: Drag-drop field reordering with immediate effect
- **ETag Concurrency**: Optimistic locking for safe concurrent edits

## Getting Started

### Prerequisites

- **Bun.js 1.1.0+** (REQUIRED runtime)
- PostgreSQL 14+ (or SQLite for development)

### Installation

\`\`\`bash
# Install dependencies
bun install

# Setup environment
cp backend/.env.example backend/.env
# Edit .env with your database credentials

# Run migrations
bun run db:migrate

# Seed initial data (sys_reference, sys_table, sys_column, sys_field)
bun run db:seed
\`\`\`

### Development

\`\`\`bash
# Start both backend and frontend
bun run dev

# Or start individually
bun run dev:backend   # Backend on http://localhost:3000
bun run dev:frontend  # Frontend on http://localhost:3001
\`\`\`

### Production Build

\`\`\`bash
bun run build
\`\`\`

## Project Structure

\`\`\`
${this.options.projectName}/
├── backend/           # NestJS API
│   ├── src/
│   │   ├── modules/
│   │   │   ├── sys/   # Application Dictionary modules
│   │   │   └── bus/   # Business entity modules
│   │   └── ...
│   ├── migrations/    # Database migrations
│   └── seeds/         # Seed data
├── frontend/          # TanStack Start App
│   ├── src/routes/
│   └── ...
└── package.json       # Root workspace config
\`\`\`

## Runtime UI Configuration

The UI layout can be modified at runtime through the admin interface:

1. Navigate to /admin
2. Select an entity to configure
3. Drag and drop fields to reorder
4. Changes take effect immediately

Field ordering is controlled by:
- \`seq_no\`: Order in detail forms
- \`seq_no_grid\`: Order in list/table views

## License

MIT
`;
  }

  /**
   * Run mandatory linting checks after generation
   */
  private async runLintingChecks(outputDir: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { execFileSync } = require("child_process") as typeof import("child_process");

    const runLint = (command: string, args: string[], cwd: string): boolean => {
      try {
        execFileSync(command, args, { cwd, stdio: "pipe", timeout: 60000 });
        return true;
      } catch (_error: unknown) {
        return false;
      }
    };

    try {
      if (!this.options.skipBackend) {
        console.log("\n  📋 Linting NestJS backend...");
        const backendLintPassed = runLint("npm", ["run", "lint"], path.join(outputDir, "backend"));
        if (backendLintPassed) {
          console.log("  ✅ Backend linting passed");
        } else {
          console.warn(
            '  ⚠️  Backend linting found issues (run "cd backend && npm run lint:fix" to auto-fix)'
          );
        }
      }

      if (!this.options.skipFrontend) {
        console.log("\n  📋 Linting TanStack Start frontend...");
        const frontendLintPassed = runLint(
          "npm",
          ["run", "lint"],
          path.join(outputDir, "frontend")
        );
        if (frontendLintPassed) {
          console.log("  ✅ Frontend linting passed");
        } else {
          console.warn(
            '  ⚠️  Frontend linting found issues (run "cd frontend && npm run lint:fix" to auto-fix)'
          );
        }
      }

      console.log("\n✨ Linting checks completed!");
      console.log(
        '   Tip: Run "npm run lint:fix" in backend/frontend directories to auto-fix issues'
      );
    } catch (error) {
      console.warn("  ⚠️  Linting could not be completed (dependencies not installed?)");
      console.log('   Tip: Run "bun install" first, then run linting manually');
    }
  }

  /**
   * Get human-readable stack description
   */
  private getStackDescription(): string {
    return "tanstackjs-nestjs - Modern Web (TanStack Start + NestJS)";
  }
}

export default FullStackGenerator;
