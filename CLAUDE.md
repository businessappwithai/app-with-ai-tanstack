# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

**Install gstack** (one-time setup per developer):
```bash
bun run setup:gstack
```

Available gstack skills:
- `/office-hours` - Brainstorming and idea exploration
- `/plan-ceo-review` - Strategic plan review
- `/plan-eng-review` - Architecture/engineering plan review
- `/plan-design-review` - Design plan review
- `/design-consultation` - Creating a design system
- `/design-shotgun` - Rapid design exploration
- `/design-html` - HTML/CSS design prototyping
- `/review` - Code review before merge
- `/ship` - Ready to deploy / create PR
- `/land-and-deploy` - Land PR and deploy
- `/canary` - Canary deployment
- `/benchmark` - Performance benchmarking
- `/browse` - Headless browser for web browsing and QA testing
- `/connect-chrome` - Connect to a running Chrome instance
- `/qa` - Full QA testing of the app
- `/qa-only` - QA testing without code changes
- `/design-review` - Visual design audit
- `/setup-browser-cookies` - Configure browser cookies
- `/setup-deploy` - Configure deployment pipeline
- `/setup-gbrain` - Configure gstack brain
- `/retro` - Weekly retrospective
- `/investigate` - Debugging errors
- `/document-release` - Post-ship doc updates
- `/codex` - Adversarial code review / second opinion
- `/cso` - Chief Security Officer review
- `/autoplan` - Automated planning
- `/plan-devex-review` - Developer experience plan review
- `/devex-review` - Developer experience review
- `/careful` - Working with production or live systems
- `/freeze` - Scope edits to one module/directory
- `/guard` - Maximum safety mode
- `/unfreeze` - Remove edit restrictions
- `/gstack-upgrade` - Upgrade gstack to latest version
- `/learn` - Learn from codebase patterns

### Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review

---

# ERDwithAI - AI Coding Assistant Guide

**Project**: ERDwithAI - AI-Powered Entity Relationship Design & Code Generation Platform
**Version**: 5.1.0
**Runtime**: Bun.js 1.3+ (primary package manager; `pnpm-workspace.yaml` also present but `bun.lock` is authoritative)
**Node**: v20+ compatible

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `bun install` | Install dependencies |
| `bun run dev` | Start web app (http://localhost:3000) |
| `bun run dev:mastra` | Start Mastra AI service (http://localhost:4111) |
| `bun run build` | Build all packages (lint → core → generator → ai → web) |
| `bun run type-check` | TypeScript validation (root tsconfig, no emit) |
| `bun run lint` | ESLint check (.ts, .tsx files) |
| `bun run lint:fix` | ESLint auto-fix |
| `bun run format` | Prettier format all files |
| `bun run migrate` | Run database migrations |
| `bun run generate:tanstack` | Generate TanStack Start/NestJS app |
| `bun run generate:odata` | Generate OData V4 service |
| `bun run convert` | Run AI conversion CLI |
| `bun run test` | Run unit tests (Vitest, via `@erdwithai/web`) |
| `bun run test:e2e:server` | Run E2E tests with auto server startup |
| `bun run test:playwright` | Run Playwright E2E tests |
| `bun run clean` | Remove all node_modules and dist directories |

**Run a single Vitest test file:**
```bash
bun --filter @erdwithai/web test -- path/to/file.spec.ts
```

**Run a single Playwright test file:**
```bash
playwright test tests/e2e/specific.e2e.spec.ts
```

---

## Project Overview

ERDwithAI transforms natural language descriptions into production-ready full-stack applications. It features:
- AI-powered entity extraction using Claude Sonnet 4 (via Mastra.ai agents)
- Human-in-the-loop (HITL) approval workflow for ERD design
- Visual ERD designer with Mermaid diagram rendering
- Multi-stack code generation: TanStack Start/NestJS and OpenUI5/OData V4
- Dictionary-driven architecture inspired by Compiere ERP
- CopilotKit integration for AI-assisted UI interactions
- E2B sandbox for code execution in generated projects

### Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun.js 1.3+ |
| AI Orchestration | Mastra.ai v1.10+, CopilotKit v1.53+ |
| AI Model | Anthropic Claude (claude-sonnet-4-20250514) |
| Frontend | TanStack Start v1.x, Vite 5+, React 18+, Shadcn UI, TailwindCSS, Zustand |
| Backend | NestJS 10+, Fastify, Kysely (type-safe SQL) |
| Database | PostgreSQL (production), SQLite (Mastra state/dev) |
| Templates | Handlebars 4.7+ |
| Testing | Playwright v1.57+, Vitest, Testing Library |
| Code Sandbox | E2B Code Interpreter |
| Linter/Formatter | Biome (unified ESLint + Prettier) |

---

## Monorepo Structure

```
app-with-ai-tanstack/
├── packages/
│   ├── core/          # Core business logic, types, hooks, RBAC, validation
│   ├── generator/     # Code generation engine, CLI, Handlebars templates
│   ├── ai/            # Mastra.ai agents, CopilotKit, AI workflows, CLI
│   └── web/           # TanStack Start v1 web application (Vite + Vinxi)
├── database/          # Knex migrations, knexfile.ts, generator.sql
├── docs/              # Architecture, development, testing, roadmap docs
├── generated-projects/# Output directory for generated applications
├── tests/             # Playwright E2E test suites
├── scripts/           # Shell scripts for setup and test automation
├── examples/          # Sample ERD files (.mmd) for CRM, ecommerce, etc.
├── webapp/            # Pre-built OpenUI5 HMS reference app
└── backups/           # Database backups
```

Root-level docs: `DESIGN.md` (architecture decisions), `HOOKS_GUIDE.md` (hook system), `READEME.md` (feature overview / quick start), `TODOS.md` (current work items).

### Package Aliases (workspace:*)

| Alias | Package | Purpose |
|-------|---------|---------|
| `@erdwithai/core` | packages/core | Core logic, types, services |
| `@erdwithai/core/types` | packages/core | Type definitions |
| `@erdwithai/core/hooks` | packages/core | Hook system |
| `@erdwithai/core/services` | packages/core | Base service classes |
| `@erdwithai/core/utils` | packages/core | Utility functions |
| `@erdwithai/generator` | packages/generator | Code generation |
| `@erdwithai/ai` | packages/ai | AI agents & workflows |
| `@erdwithai/web` | packages/web | Web application |

---

## Package Details

### @erdwithai/core (`packages/core/`)

Core business logic shared by all other packages.

```
src/
├── generators/
│   └── hook-translator/   # Translates hooks to generated code
├── hooks/
│   ├── hook-builder.ts    # Fluent builder for hook definitions
│   ├── hook-executor.ts   # Executes hooks (globalHookExecutor singleton)
│   └── hook-registry.ts   # Registry of registered hooks
├── services/
│   ├── base.service.ts        # Abstract base service with hook integration
│   ├── database.service.ts    # Knex database connection management
│   ├── entity.service.ts      # CRUD service for entities
│   └── process-manager.service.ts
├── types/
│   ├── api.types.ts           # API request/response types
│   ├── bus-entity.types.ts    # Business entity types
│   ├── dictionary.types.ts    # Compiere-style dictionary types
│   ├── entity.types.ts        # Core entity definitions
│   ├── hook.types.ts          # Hook system types
│   └── rbac.types.ts          # Role-based access control types
├── utils/
│   ├── formatting.ts          # String/data formatting
│   ├── naming.ts              # Naming convention utilities
│   └── table-naming.ts        # Database table naming
└── validation/
    ├── entity.validation.ts   # Entity validation logic
    └── schemas.ts             # Zod schemas
```

### @erdwithai/generator (`packages/generator/`)

Code generation engine with CLI and Handlebars template system.

**CLI**: `erdwithai` / `erdwithai-generate` binaries

```
src/
├── cli/
│   └── generate.ts        # CLI entry point (Commander.js)
├── generators/
│   ├── base.generator.ts      # Abstract base generator
│   ├── dictionary.generator.ts
│   ├── full-stack.generator.ts
│   ├── orchestrator.ts        # Coordinates multi-stack generation
│   ├── tanstack-start-nestjs/ # TanStack Start frontend + NestJS backend stack
│   ├── openui5-odatav4/       # OpenUI5 frontend + OData V4 backend stack
│   └── tests/                 # E2E test generators per stack
├── parsers/
│   └── mermaid.parser.ts      # Parses Mermaid ERD diagrams
└── templates/
    └── loader.ts              # Handlebars template loader
templates/
├── common/            # Shared: migrations, seeds, AI agents, services
├── tanstack-start-nestjs/ # Full-stack: NestJS backend + TanStack Start frontend
│   ├── backend/       # Controllers, DTOs, Services, Guards, Auth, DB, Tests
│   └── frontend/      # Routes, Components (Admin/Forms/Tables/UI), Hooks, i18n
└── openui5-odatav4/   # OpenUI5 + OData V4 stack
    ├── backend/       # OData config, Controllers, Database, Middleware, Tests
    └── frontend/      # Controllers, Views (XML), Fragments, i18n, Manifest
```

### @erdwithai/ai (`packages/ai/`)

AI orchestration using Mastra.ai framework and Anthropic Claude.

**CLI**: `erdwithai-convert` binary

```
src/
├── agents/
│   ├── domain-agent.ts        # Analyzes business domain from natural language
│   ├── entity-agent.ts        # Extracts entity definitions
│   ├── mermaid-agent.ts       # Converts entities to Mermaid ERD diagrams
│   └── relationship-agent.ts  # Identifies entity relationships
├── mastra/
│   ├── agents/
│   │   └── code-agent.ts      # Code generation agent (with E2B tools)
│   ├── tools/
│   │   └── e2b.ts             # E2B code sandbox tool
│   └── index.ts               # Mastra instance (LibSQLStore, PinoLogger)
├── workflows/
│   └── erd-design-workflow.ts # HITL workflow for ERD design approval
├── converter/
│   ├── index.ts               # Main AI converter
│   └── openai-fallback.ts     # OpenAI fallback converter
├── cli/
│   └── convert.ts             # CLI entry point
└── mastra.ts                  # Legacy Mastra entry point
```

**Mastra Configuration** (`packages/ai/src/mastra/index.ts`):
- Storage: LibSQL (SQLite at `mastra.db`)
- Logger: Pino (debug in dev, info in production)
- Observability: enabled by default
- Port: `MASTRA_PORT=4111`

### @erdwithai/web (`packages/web/`)

TanStack Start v1 full-stack application using Vite + Vinxi, with file-based routing and server functions.

**Key differences from Next.js:**
- Routes use `$` prefix for dynamic segments: `$id` instead of `[id]`
- Route parameters accessed via `Route.useParams()` instead of `useParams()`
- Navigation via `useNavigate({ to: '/path', params: {} })` instead of `useRouter().push()`
- Environment variables use `import.meta.env.VITE_*` instead of `process.env.NEXT_PUBLIC_*`
- API routes use `createAPIFileRoute()` instead of `NextResponse`
- Server functions (RPC-style calls) available via TanStack Start's server function pattern

```
src/
├── routes/
│   ├── __root.tsx             # Root layout (replaces app/layout.tsx + app/providers.tsx)
│   ├── index.tsx              # Root → redirects to /projects
│   ├── projects/
│   │   ├── index.tsx          # Projects list (Zustand store)
│   │   └── $id/
│   │       ├── init.tsx       # Project initialization step
│   │       ├── design.tsx     # ERD design step (HITL approval)
│   │       ├── generate.tsx   # Code generation step
│   │       ├── enhance/
│   │       │   └── $serviceName.tsx
│   │       └── deploy.tsx     # Deployment step
│   └── api/
│       ├── copilotkit.ts                # CopilotKit runtime endpoint
│       ├── generate.ts
│       ├── deploy.ts
│       ├── ai/
│       │   ├── convert.ts               # AI conversion endpoint
│       │   ├── convert-stream.ts        # Streaming AI conversion
│       │   ├── code-agent.ts            # Code agent endpoint
│       │   └── code-agent-stream.ts
│       └── projects/
│           ├── index.ts                 # CRUD for projects
│           └── $id/
│               ├── index.ts             # Single project CRUD
│               ├── erd-versions/
│               │   ├── index.ts         # ERD version history
│               │   └── $versionId/restore.ts
│               └── workflows/$serviceName/
│                   ├── index.ts         # Workflow management
│                   ├── draft.ts
│                   ├── apply.ts
│                   ├── validate.ts
│                   ├── generate.ts
│                   ├── gorules.ts
│                   └── files/
├── components/
│   ├── ProgressStepper.tsx    # Multi-step project wizard
│   ├── approval/              # HITL entity approval cards
│   ├── code-agent/            # Code agent panel UI
│   ├── error-boundary/        # React error boundaries
│   ├── project/               # Project creation modal
│   └── workflow/              # Flowchart preview component
├── hooks/
│   └── useHumanInTheLoop.ts   # HITL state management hook
├── store/
│   └── projectStore.ts        # Zustand project state store
└── types/
    ├── project.ts             # Project type definitions
    └── workflow.ts            # Workflow type definitions
```

---

## Code Style Guidelines

### TypeScript Configuration

```json
{
  "target": "ES2022",
  "module": "ESNext",
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "isolatedModules": true
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Functions | camelCase | `analyzeDomain()`, `convertToMermaid()` |
| Types/Interfaces | PascalCase | `EntityAttribute`, `DomainAnalysis` |
| Classes | PascalCase | `AIToMermaidConverter`, `EntityService` |
| Constants (primitives) | UPPER_SNAKE_CASE | `MAX_RETRY_ATTEMPTS` |
| Constants (instances) | camelCase | `globalHookExecutor`, `domainAgent` |
| Files | kebab-case | `domain-agent.ts`, `hook-executor.ts` |

### Import Order

1. External dependencies (React, TanStack, etc.)
2. Internal package imports (`@erdwithai/*`)
3. Relative imports (`./types`, `../utils`)
4. Type-only imports (`import type`)

```typescript
import React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Database } from "lucide-react";

import { mastra } from "@erdwithai/ai";
import type { EntityDefinition } from "@erdwithai/core/types";

import { analyzeDomain } from "../agents/domain-agent";
```

### Error Handling Pattern

```typescript
async convert(input: ConverterInput): Promise<ConverterOutput> {
  try {
    const result = await someOperation();

    if (!result) {
      return { success: false, error: 'Operation returned empty result' };
    }

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

---

## Architecture Patterns

### Hook System

Cross-cutting concerns (validation, audit, business rules) are handled by hooks:

```typescript
// Register a hook
hookRegistry.register({
  entity: 'Patient',
  event: 'beforeCreate',
  handler: async (data) => { /* validate/transform */ return data; }
});

// Base service uses globalHookExecutor automatically
export abstract class BaseService<T> {
  protected abstract entityName: string;

  async create(data: Partial<T>): Promise<T> {
    const processed = await globalHookExecutor.execute(
      this.entityName, "beforeCreate", data,
    );
    return this.performCreate(processed);
  }

  protected abstract performCreate(data: Partial<T>): Promise<T>;
}
```

### AI Agent Pattern (Mastra.ai)

```typescript
export const domainAgent = new Agent({
  id: "domain-agent",
  name: "Domain Analyzer",
  instructions: `Your instructions here`,
  model: "anthropic/claude-sonnet-4-20250514",
});

export async function analyzeDomain(description: string) {
  const response = await domainAgent.generate(description, {
    structuredOutput: { schema: domainAnalysisSchema },
  });
  return response.object;
}
```

### User-Facing AI Flow (Project Wizard)

```
/projects → New Project → /projects/$id/init
  → Natural language description
  → AI agents extract entities (domain → entity → relationship → mermaid)
  → /projects/$id/design (HITL approval of ERD)
  → /projects/$id/generate (select stack, trigger code generation)
  → /projects/$id/enhance/$serviceName (AI-assisted enhancements)
  → /projects/$id/deploy
```

---

## TanStack Start Patterns

### File-Based Routing

TanStack Start uses file-based routing with Vite/Vinxi. Key differences from Next.js:
- Dynamic segments use `$` prefix: `$id`, `$serviceName`, etc. (not `[id]`)
- API routes go in `routes/api/` with `index.ts` or specific method files
- Route files must export `export const Route = createFileRoute('/path')({ component })`

### Page Route Example

```typescript
// routes/projects/$id/design.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/projects/$id/design")({
  component: DesignPage,
});

function DesignPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  return (
    <div>
      <button onClick={() => navigate({ to: "/projects" })}>
        Back to Projects
      </button>
      <p>Project ID: {id}</p>
    </div>
  );
}
```

### API Route Example (createAPIFileRoute)

```typescript
// routes/api/projects/$id/index.ts
import { createAPIFileRoute } from "@tanstack/start/api";
import type { Project } from "@erdwithai/core/types";

export const Route = createAPIFileRoute("/api/projects/$id")({
  GET: async ({ request, params }) => {
    const projectId = params.id;
    // Fetch from database using Kysely
    const project = await db
      .selectFrom("projects")
      .selectAll()
      .where("id", "=", projectId)
      .executeTakeFirst();

    return new Response(JSON.stringify(project), {
      headers: { "Content-Type": "application/json" },
    });
  },

  PUT: async ({ request, params }) => {
    const projectId = params.id;
    const data = await request.json();
    // Update logic here
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  },
});
```

### Streaming API Route Example (SSE)

```typescript
// routes/api/generate.ts
import { createAPIFileRoute } from "@tanstack/start/api";

export const Route = createAPIFileRoute("/api/generate")({
  POST: async ({ request }) => {
    const { projectId } = await request.json();

    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            // Generate code in chunks
            const chunks = await generateProject(projectId);
            for (const chunk of chunks) {
              controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      }
    );
  },
});
```

### Navigation Patterns

| Pattern | Next.js | TanStack Start |
|---------|---------|---|
| Navigate to route | `router.push('/path')` | `navigate({ to: '/path' })` |
| Navigate with params | `router.push('/path/123')` | `navigate({ to: '/path/$id', params: { id: '123' } })` |
| Get URL params | `useParams()` returns `{ id }` | `Route.useParams()` returns `{ id }` |
| Link component | `<Link href="/path">` | `<Link to="/path">` |
| Get search params | `useSearchParams()` | `useSearch()` |

### Environment Variables in Routes

**Client-side (routes/*.tsx):**
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
const mastraUrl = import.meta.env.VITE_MASTRA_URL;
```

**Server-side (routes/api/*):**
```typescript
const databaseUrl = process.env.DATABASE_URL;
const apiKey = process.env.ANTHROPIC_API_KEY;
```

### CopilotKit Integration

Update from Next.js `copilotRuntimeNextJSAppRouterEndpoint` to generic HTTP endpoint:

```typescript
// routes/api/copilotkit.ts
import { createAPIFileRoute } from "@tanstack/start/api";
import { copilotRuntimeGenericHTTPEndpoint } from "@copilotkit/runtime";

export const Route = createAPIFileRoute("/api/copilotkit")({
  POST: async ({ request }) => {
    const handler = copilotRuntimeGenericHTTPEndpoint({
      runtime: yourCopilotRuntime,
      serviceAdapter: yourServiceAdapter,
      endpoint: "/api/copilotkit",
    });
    return handler(request);
  },
});
```

---

## Environment Variables

**Required:**
- `ANTHROPIC_API_KEY` - Anthropic API key (Claude claude-sonnet-4-20250514)
- `DATABASE_URL` - PostgreSQL connection string

**Web Application (TanStack Start):**
- `VITE_APP_URL` - Application URL (default: `http://localhost:3000`)
- `VITE_API_URL` - API URL (default: `http://localhost:3000/api`)
- `VITE_MASTRA_URL` - Mastra service URL (default: `http://localhost:4111`)
- `VITE_ERD_DESIGN_AUTO_RETRY_COUNT` - Auto-retry count for ERD design (default: `3`)
- `COPILOTKIT_API_KEY` - CopilotKit API key

**Note**: TanStack Start uses Vite, so environment variables must be prefixed with `VITE_` for client-side access via `import.meta.env.VITE_*`. Server-side API routes access them via `process.env.*`.

**Mastra AI Service:**
- `MASTRA_DATABASE_URL` - Mastra state database (default: SQLite `mastra.db`)
- `MASTRA_PORT` - Mastra server port (default: `4111`)
- `MASTRA_LOG_LEVEL` - Log level: `debug` | `info` | `warn` | `error`

**Database:**
- `DATABASE_POOL_MIN` / `DATABASE_POOL_MAX` - Connection pool size (default: 2/10)

**Security:**
- `SESSION_SECRET` / `JWT_SECRET` - Authentication secrets
- `CORS_ORIGIN` - CORS allowed origins (default: `http://localhost:3000`)

**Feature Flags:**
- `ENABLE_AI_FEATURES=true`
- `ENABLE_DICTIONARY_FEATURES=true`
- `ENABLE_CODE_GENERATION=true`

**Code Generation:**
- `DEFAULT_OUTPUT_DIR=./generated`
- `TEMPLATE_DIR=./packages/generator/templates`

See `.env.example` for the full list.

---

## Testing

### Unit Tests (Vitest)

```bash
bun run test                  # Run all tests
bun run test:watch            # Watch mode
bun run test:coverage         # With coverage (80% threshold)
bun --filter @erdwithai/web test -- path/to/file.spec.ts  # Single file
```

Config: `vitest.config.ts` — jsdom environment, forks pool, 10s timeout, setup file at `./test/setup.ts`.

### E2E Tests (Playwright)

```bash
bun run test:playwright              # Headless Chromium/Firefox/WebKit
bun run test:playwright:ui           # Interactive UI mode
bun run test:playwright:debug        # Debug mode
bun run test:e2e:server              # Auto-starts server, then runs E2E
playwright test tests/e2e/foo.e2e.spec.ts  # Single file
```

Config: `playwright.config.ts` — base URL `http://localhost:5000`, 3-minute timeout, sequential workers, HTML/JSON/JUnit reporters.

Test files: `tests/e2e/**/*.e2e.spec.ts`

---

## Database

**Engine**: Kysely (type-safe SQL query builder) with PostgreSQL (production) / SQLite (development)

**Migrations**: Handled via Kysely schema builder in `packages/core/src/services/database.service.ts`
- No separate migration files — schema is defined in TypeScript with `database.schema.createTable()`
- Run migrations via the service initialization

**Database Service** (`packages/core/src/services/database.service.ts`):
- Provides `SafeDatabase` wrapper for type-safe queries
- All operations use Kysely query builder: `db.selectFrom('table')`, `db.insertInto('table')`, etc.
- Key methods: `projectDb`, `erdVersionDb`, `workflowDb`, `generationHistoryDb`, `deploymentDb`, `entityDb`, `settingsDb`

**Kysely Query Examples**:
```typescript
// SELECT
const projects = await db.selectFrom('projects').selectAll().execute();

// INSERT
await db.insertInto('projects').values({ id, name, description }).execute();

// UPDATE
await db.updateTable('projects').set({ name: 'updated' }).where('id', '=', id).execute();

// DELETE
await db.deleteFrom('projects').where('id', '=', id).execute();
```

---

## Git Workflow

1. Create feature branch from `main`
2. Make changes with descriptive commits
3. Run `bun run type-check` and `bun run lint` before pushing
4. Target `main` branch for pull requests

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `package.json` | Monorepo root, all scripts, key dependencies |
| `tsconfig.json` | Root TypeScript config with path aliases |
| `bunfig.toml` | Bun runtime config, test coverage settings |
| `playwright.config.ts` | E2E test configuration |
| `vitest.config.ts` | Unit test configuration |
| `.env.example` | All environment variable templates |
| `packages/core/src/hooks/hook-executor.ts` | Global hook executor singleton |
| `packages/core/src/services/base.service.ts` | Abstract base service |
| `packages/core/src/types/` | All shared TypeScript types |
| `packages/ai/src/agents/domain-agent.ts` | Domain analysis (NL → entities) |
| `packages/ai/src/agents/mermaid-agent.ts` | Mermaid ERD generation |
| `packages/ai/src/mastra/index.ts` | Mastra instance configuration |
| `packages/ai/src/workflows/erd-design-workflow.ts` | HITL ERD design workflow |
| `packages/generator/src/parsers/mermaid.parser.ts` | Mermaid ERD parser |
| `packages/generator/src/generators/orchestrator.ts` | Generation orchestrator |
| `packages/generator/templates/tanstackjs-nestjs/` | TanStack Start/NestJS templates |
| `packages/generator/templates/openui5-odatav4/` | OpenUI5/OData templates |
| `packages/web/src/routes/__root.tsx` | Root layout (replaces Next.js layout.tsx) |
| `packages/web/src/routes/api/copilotkit.ts` | CopilotKit runtime endpoint |
| `packages/web/src/hooks/useHumanInTheLoop.ts` | HITL React hook |
| `packages/core/src/services/database.service.ts` | Kysely database service (replaces Knex) |
| `webapp/` | Pre-built OpenUI5 HMS reference application |
| `docs/architecture.md` | System architecture deep-dive |
| `docs/DEVELOPMENT.md` | Build system details |
| `docs/TESTING.md` | E2E test generation guide |
| `docs/ROADMAP.md` | Version 6.0 plans |

---

## Additional Documentation

| Document | Description |
|----------|-------------|
| [docs/architecture.md](docs/architecture.md) | System architecture, package details |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Build system, commands |
| [docs/TESTING.md](docs/TESTING.md) | E2E test generation |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Version 6.0 plans |
| [docs/HMS-OPENUI5-ODATAV4.md](docs/HMS-OPENUI5-ODATAV4.md) | Hospital HMS OpenUI5 guide |

---

## Common Tasks

### Adding a New AI Agent

1. Create agent file in `packages/ai/src/agents/` (e.g., `data-agent.ts`)
2. Export from `packages/ai/src/agents/index.ts`
3. Optionally add to workflow in `packages/ai/src/workflows/erd-design-workflow.ts`

### Adding a New Code Generation Template

1. Add Handlebars `.hbs` template to `packages/generator/templates/<stack>/`
2. Register in `packages/generator/src/templates/loader.ts`
3. Add context data generation in the appropriate generator class

### Adding a New API Route (Web)

1. Create `index.ts` in the appropriate `packages/web/src/routes/api/` subdirectory
2. Use `createAPIFileRoute()` to define route handlers
3. Export `GET`, `POST`, `PUT`, `DELETE` handlers as needed using Response API

### Modifying RBAC

1. Update types in `packages/core/src/types/rbac.types.ts`
2. Modify base service in `packages/core/src/services/base.service.ts`
3. Update hook handlers in `packages/core/src/hooks/`

### Running the Full Stack Locally

```bash
# Terminal 1: Web app
bun run dev

# Terminal 2: Mastra AI service
bun run dev:mastra

# App available at http://localhost:3000
# Mastra dashboard at http://localhost:4111
```
