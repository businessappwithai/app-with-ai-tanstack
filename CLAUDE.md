# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager Rule

**CRITICAL**: Always use `bun` or `bun.js` for all package management and script execution. NEVER use `npm` or `pnpm`.

- Use `bun install` instead of `npm install`
- Use `bun run <script>` instead of `npm run <script>`
- Use `bun --filter @package build` for monorepo packages
- Use `bunx` instead of `npx`; use `#!/usr/bin/env bun` shebangs
- Generated projects must also use bun exclusively

See `.claude/custom-rules.md` for the full Bun-only policy.

---

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
- `/document-generate` - Generate documentation
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
**Version**: 5.1.0 (`@erdwithai/web` is 5.1.1)
**Runtime**: Bun.js >= 1.3.14 (`bun.lock` is authoritative; `pnpm-workspace.yaml` / `pnpm-lock.yaml` are vestigial — ignore them)

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `bun install` | Install dependencies |
| `bun run dev` | Start web app (http://localhost:3000) |
| `bun run dev:mastra` | Start Mastra AI service (http://localhost:4111) |
| `bun run build` | Build all packages (lint → core → generator → ai → web) |
| `bun run type-check` | TypeScript validation (root tsconfig, `--noEmit`) |
| `bun run lint` | Biome lint |
| `bun run lint:fix` | Biome check + autofix (`biome check --write .`) |
| `bun run format` | Biome format (`biome format --write .`) |
| `bun run generate:tanstack` | Generate a TanStack Start + NestJS app |
| `bun run convert` | Run the AI conversion CLI |
| `bun run test` | Unit tests (Vitest, via `@erdwithai/web`) |
| `bun run test:playwright` | Playwright E2E tests |
| `bun run test:e2e:server` | E2E with automatic server startup |
| `bun run seed:admin -- --email you@example.com` | Run migrations + promote a user to admin |
| `bun run clean` | Remove all `node_modules` and `dist` directories |

**Run a single Vitest test file:**
```bash
bun --filter @erdwithai/web test -- path/to/file.spec.ts
```

**Run a single Playwright test file:**
```bash
bunx playwright test tests/e2e/specific.e2e.spec.ts
```

### Known-broken scripts

- `bun run migrate` points at `packages/generator/migrations/migrate.ts`, which **does not exist**. Real migrations live in `database/migrations/` and are applied via `runMigrations()` from `@erdwithai/core/services` (see `bun run seed:admin`, which calls it).
- Root `vitest.config.ts` references `./test/setup.ts`, which does not exist. The config that actually runs is `packages/web/vitest.config.ts`. Prefer `bun run test`.
- `packages/web` still declares a `lint` script using `eslint`, but ESLint is not a dependency. Lint from the root with Biome.

---

## Project Overview

ERDwithAI turns natural-language descriptions into production-ready full-stack applications:

- AI-powered entity extraction via Mastra.ai agents against a **local OpenAI-compatible model**
- Human-in-the-loop (HITL) approval workflow for ERD design
- Visual ERD designer (Mermaid + React Flow)
- Full-stack code generation: TanStack Start frontend + NestJS backend
- Dictionary-driven architecture inspired by Compiere ERP (`sys_*` tables)
- Business rules via GoRules JDM / zen-engine
- CopilotKit integration for AI-assisted UI
- E2B sandbox for code execution in generated projects
- **EML** — a Mermaid-based modeling language for ERD + rules + workflows (see `language/`)

### Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun.js >= 1.3.14 |
| AI Orchestration | Mastra.ai v1.54+, CopilotKit v1.64+ |
| AI Model | **Local OpenAI-compatible endpoint** (default `qwen3.6:27b-mlx`) — see AI Model Configuration |
| Frontend | TanStack Start v1.168, TanStack Router v1.170, Vite 8, React 19, Tailwind CSS v4, Zustand 5, Radix UI |
| Diagrams | Mermaid 11, `@xyflow/react` (React Flow), `elkjs` (layout) |
| Rules | `@gorules/zen-engine` (core), `@gorules/jdm-editor` (web UI) |
| Auth | Better Auth (core config) + custom session routes (web) |
| Backend (generated) | NestJS 10+, Fastify, Kysely |
| Database | PostgreSQL via Kysely + `pg`; LibSQL/SQLite for Mastra state |
| Templates | Handlebars 4.7+ |
| Testing | Vitest 4, Playwright 1.62, Testing Library |
| Code Sandbox | E2B Code Interpreter |
| Linter/Formatter | **Biome** (replaces ESLint + Prettier) |

> Tailwind v4 is wired through the `@tailwindcss/vite` plugin — there is no v3-style content-scanning step.

---

## AI Model Configuration

**Important:** this project no longer calls the Anthropic API. `ANTHROPIC_API_KEY` is dead config; the `@anthropic-ai/sdk` dependency is vestigial.

All model configuration lives in exactly one file — `packages/ai/src/config.ts`:

```ts
export const AI_BASE_URL = process.env.LOCAL_AI_BASE_URL ?? "http://localhost:8000/v1";
export const AI_MODEL    = process.env.LOCAL_AI_MODEL    ?? "qwen3.6:27b-mlx";
export const AI_API_KEY  = process.env.LOCAL_AI_API_KEY  ?? "local";

/** Pass directly as the `model` field of any Mastra Agent. */
export const mastraModelConfig = {
  id: `openai/${AI_MODEL}`,
  url: AI_BASE_URL,
  apiKey: AI_API_KEY,
} as const;
```

**Never hard-code model strings or base URLs in agents or API routes.** Import
`mastraModelConfig` (or `AI_MODEL` / `AI_BASE_URL`) from `../config` instead.

A local `llama.cpp` server is optionally supported via `LLAMA_CPP_BASE_URL` /
`LLAMA_CPP_MODEL` (`packages/ai/src/providers/llama.ts`).

---

## Monorepo Structure

```
app-with-ai-tanstack/
├── packages/
│   ├── core/          # Types, hooks, services, auth, rules, workflow, config
│   ├── generator/     # Code generation engine, CLI, Handlebars templates
│   ├── ai/            # Mastra.ai agents, workflows, converter, CLI
│   └── web/           # TanStack Start app (Vite 8 + React 19)
├── language/          # EML: the Mermaid-based modeling language + `eml` CLI
├── database/          # Migrations (001–010), knexfile.ts, generator.sql
├── docs/              # Architecture, development, testing, roadmap
├── generated-projects/# Output directory for generated applications
├── tests/             # Playwright E2E suites
├── scripts/           # Setup, seeding, and test automation
├── examples/          # Sample ERD files (.mmd)
└── .claude/           # Project rules, plans, and local skills
```

Root docs: `DESIGN.md`, `HOOKS_GUIDE.md`, `READEME.md` (sic — feature overview), `TODOS.md`, `CHANGELOG.md`.

### Package Aliases

Path aliases are defined in root `tsconfig.json` and mirrored in each Vite/Vitest config.

| Alias | Resolves to |
|-------|-------------|
| `@erdwithai/core` (+ `/*`) | `packages/core/src` |
| `@erdwithai/generator` (+ `/*`) | `packages/generator/src` |
| `@erdwithai/ai` (+ `/*`) | `packages/ai/src` |
| `@erdwithai/web` (+ `/*`) | `packages/web/src` |
| `@/*` | `packages/web/src/*` |
| `#/*` | `packages/web/src/*` (web package `imports` field) |

`@erdwithai/core` publishes explicit subpath exports — `./types`, `./hooks`,
`./services`, `./utils`, `./generators`, `./auth`, `./workflow`, `./workflows`,
`./rules`, `./config`. Adding a new subdirectory to core requires adding both an
`exports` entry **and** a `bun build` invocation in `packages/core/package.json`.

---

## Package Details

### @erdwithai/core (`packages/core/`)

```
src/
├── auth/              # Better Auth config, guards, decorators, session helpers
├── config/            # db.config.ts (the ONLY DB connection site), db.types.ts, workflow.config.ts
├── generators/
│   └── hook-translator/   # Parses hook source into generated code
├── hooks/             # hook-builder, hook-executor (globalHookExecutor), hook-registry
├── rules/             # zen-engine singleton, rules-engine.service, rule-cache, jdm.schema
├── services/          # base.service, database.service, entity.service, process-manager
├── types/             # api, bus-entity, dictionary, entity, hook, rbac, rule, sys-dictionary
├── utils/             # formatting, naming, table-naming
├── validation/        # entity.validation, Zod schemas
├── workflow/          # workflow.service, workflow.types
└── workflows/         # workflow-polling.helper
```

### @erdwithai/generator (`packages/generator/`)

Code generation engine. **One stack is supported: `tanstackjs-nestjs`.**

**CLI binaries**: `erdwithai`, `erdwithai-generate` (Commander.js, `src/cli/generate.ts`)

```
src/
├── cli/generate.ts            # generate | list | backend | frontend subcommands
├── generators/
│   ├── base.generator.ts
│   ├── full-stack.generator.ts    # StackOption type
│   ├── orchestrator.ts
│   ├── dictionary.generator.ts
│   ├── tanstack-start-nestjs/     # nestjs-backend + tanstack-start-frontend generators
│   └── tests/                     # E2E test generators
├── parsers/mermaid.parser.ts
├── templates/loader.ts
└── utils/
templates/
├── common/                 # migrations, seeds, hooks, services, AI agents/workflows
└── tanstack-start-nestjs/
    ├── backend/            # NestJS: modules (bus, sys, auth, rules, workflow, jobs, ai, audit, electric)
    └── frontend/           # TanStack Start: routes, components, hooks, i18n
```

Also see `packages/generator/TWO_PHASE_GENERATION.md` and `MIGRATION_GUIDE.md`.

### @erdwithai/ai (`packages/ai/`)

**CLI binary**: `erdwithai-convert`

```
src/
├── config.ts          # ⭐ Central model config — import from here, never hard-code
├── agents/            # domain, entity, relationship, mermaid (standalone Mastra Agents)
├── mastra/
│   ├── index.ts       # Mastra instance — registers ONLY codeAgent
│   ├── agents/code-agent.ts
│   └── tools/e2b.ts
├── providers/         # llama.cpp provider
├── workflows/erd-design-workflow.ts   # HITL workflow (createWorkflow/createStep)
├── converter/         # AI converter + openai-fallback
├── cli/convert.ts
└── mastra.ts          # Dev-server entrypoint (`bun run dev:mastra`)
```

**Mastra instance** (`src/mastra/index.ts`): registers `codeAgent` only, LibSQL
storage at `file:../../../../mastra.db`, Pino logger (`debug` in dev, `info` in
production). The four `src/agents/*` agents are used directly by the converter
and the ERD workflow — they are not registered on the Mastra instance.

### @erdwithai/web (`packages/web/`)

TanStack Start app on Vite 8 + React 19. **No Vinxi** — `vite.config.ts` shims
`@tanstack/start-api-routes` (which still imports `vinxi/routes`) with
`src/lib/start-api-routes-compat.js`.

```
src/
├── routes/
│   ├── __root.tsx, index.tsx, login.tsx, dashboard.tsx, designer.tsx, settings.tsx
│   ├── projects/
│   │   ├── index.tsx
│   │   └── $id/{init,design,generate,rules-design,deploy}.tsx
│   │       └── enhance/{index,$serviceName}.tsx
│   ├── admin/
│   │   ├── users.tsx, mermaid/index.tsx
│   │   ├── rules/{index,new,$entity/$ruleId}.tsx
│   │   └── workflows/{index,$workflowId}.tsx
│   └── api/            # ~50 server routes — see API Route Pattern below
├── components/
│   ├── ProgressStepper, WizardStepHeader, JourneyArc, ErdFlowViewer, DbOperationsModal
│   ├── approval/, code-agent/, error-boundary/, project/, providers/
│   ├── rules/          # DecisionTableEditor, JDMEditor
│   ├── workflow/       # WorkflowEditor, GoRulesEditor, FlowchartPreview
│   └── ui/             # Shadcn-style primitives
├── lib/
│   ├── mermaid.ts, mermaid-erd-parser.ts, mermaid-flowchart-parser.ts, mermaid-render.ts
│   ├── auth-server.ts, encrypt.ts, errors.ts, api-client.ts, jdm-converter.ts
│   ├── api/{projects,deployment}.ts, workflow/hook-parser.ts
│   └── start-api-routes-compat.js, vinxi-routes-stub.js   # Vite shims
├── middleware/auth.ts
├── store/{projectStore,authStore}.ts   # Zustand
├── hooks/useHumanInTheLoop.ts
└── types/{project,workflow}.ts
```

---

## TanStack Start Patterns

### File-based routing

- Dynamic segments use `$`: `$id`, `$serviceName` (not Next.js `[id]`)
- Splat routes use `$.ts` (e.g. `api/copilotkit/$.ts`)
- Every route file exports `export const Route = createFileRoute('/path')({ ... })`
- `routeTree.gen.ts` is generated by the TanStack Router plugin — never edit it by hand

### API Route Pattern — use `createFileRoute` + `server.handlers`

This is the current pattern (~43 route files). **Do not use `createAPIFileRoute`
for new routes** — only two legacy files still do, and `@tanstack/start/api` is
deprecated and emits a `console.warn` on every load.

```typescript
// routes/api/projects/$id/index.ts
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/projects/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        // Heavy/Node-only deps are imported lazily inside the handler so they
        // stay out of the client bundle.
        const { getDatabase } = await import("@erdwithai/core/services");
        const db = getDatabase();

        const project = await db
          .selectFrom("projects")
          .selectAll()
          .where("id", "=", params.id)
          .executeTakeFirst();

        return new Response(JSON.stringify(project), {
          headers: { "Content-Type": "application/json" },
        });
      },

      PUT: async ({ request, params }) => {
        const data = await request.json();
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
```

**Conventions in these handlers:**
- Dynamic-`import()` server-only modules (`@erdwithai/core/services`, `pg`, generator code) inside the handler body.
- Always return a real `Response` with an explicit `Content-Type`.
- API routes are excluded from the client router tree via the `tsr` option in `vite.config.ts`.

### Streaming (SSE) route

```typescript
export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { projectId } = await request.json();
        return new Response(
          new ReadableStream({
            async start(controller) {
              try {
                for (const chunk of await generateProject(projectId)) {
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
              Connection: "keep-alive",
            },
          },
        );
      },
    },
  },
});
```

### Page route

```typescript
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/projects/$id/design")({
  component: DesignPage,
});

function DesignPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  return <button onClick={() => navigate({ to: "/projects" })}>Back</button>;
}
```

### Navigation

| Pattern | TanStack Start |
|---------|----------------|
| Navigate | `navigate({ to: '/path' })` |
| With params | `navigate({ to: '/path/$id', params: { id: '123' } })` |
| URL params | `Route.useParams()` |
| Search params | `Route.useSearch()` |
| Link | `<Link to="/path">` |

### Environment variables

- **Client** (`routes/*.tsx`, components): `import.meta.env.VITE_*` only
- **Server** (`server.handlers`, lib server modules): `process.env.*`

---

## EML — ERDwithAI Modeling Language (`language/`)

EML is a Mermaid-based language describing an app's **ERD**, **business rules**,
and **workflows** in one `.eml.mmd` artifact. Every EML document is valid,
renderable Mermaid; generator semantics ride on `%%` directive comments that
renderers ignore.

**`language/erdwithai-language.json` is the single source of truth** for the
type vocabulary, modifiers, cardinalities, hook types, rule-node shapes,
directives, grammar, and generator contract. Load it via the typed accessor:

```ts
import { loadLanguageDefinition, normalizeType, cardinalityKind, isHookType } from "../language";

normalizeType("varchar");   // "string"
cardinalityKind("||--o{");  // "oneToMany"
isHookType("beforeCreate"); // true
```

```
language/
├── erdwithai-language.json   # ⭐ Canonical definition
├── index.ts                  # Typed loader/accessor
├── checker.ts
├── grammar/erdwithai.ebnf    # Formal EBNF grammar
├── spec/                     # 00-overview, 01-erd, 02-business-rules,
│                             # 03-workflows, 04-types-and-modifiers, 05-directives
├── cli/                      # Zero-dependency `eml` CLI (Bun) + runtime for generated apps
└── examples/                 # crm, ecommerce, helpdesk, minimal (.eml.mmd)
```

**Sections** are opened by a Mermaid keyword: `erDiagram` (ERD),
`flowchart`/`graph` (rules **or** workflow), `stateDiagram-v2` (workflow).
A `flowchart` is read as **rules** when preceded by `%%meta kind: rules`, or when
it contains only decision/expression/function/io shapes and no `%%hook`
directives; otherwise it is a **workflow**.

**Reserved directives**: `%%meta %%hook %%entity %%field %%enum %%index %%rule
%%guard %%trigger %%workflow`. Only `%%hook` is parsed by the currently shipped
parser — the rest are the documented extension surface (`spec/05-directives.md`).

When changing language semantics, update `erdwithai-language.json` **first**, then
the spec docs and grammar.

---

## Database

**PostgreSQL via Kysely + `pg`.** Connection config lives in exactly one place:
`packages/core/src/config/db.config.ts`. Change the driver or connection string
there and nowhere else.

```
DATABASE_URL=postgresql://user:pass@host:5432/dbname   # takes precedence
# or individual vars:
PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE
```

`getDb()` is a lazy singleton returning `Kysely<Database>`; `destroyDb()` tears
down the pool (tests, graceful shutdown). `packages/core/src/services/database.service.ts`
wraps it with domain helpers: `projectDb`, `erdVersionDb`, `workflowDb`,
`generationHistoryDb`, `deploymentDb`, `entityDb`, `settingsDb`.

**Migrations** are numbered files in `database/migrations/` (`001`–`010`) applied
via `runMigrations()` from `@erdwithai/core/services`. Note there are two `004_*`
files (`004_add_better_auth_tables.ts`, `004_add_business_rules_system.ts`).

```typescript
await db.selectFrom('projects').selectAll().execute();
await db.insertInto('projects').values({ id, name, description }).execute();
await db.updateTable('projects').set({ name: 'updated' }).where('id', '=', id).execute();
await db.deleteFrom('projects').where('id', '=', id).execute();
```

Target-database connection strings for generated projects are encrypted at rest
with AES-256-GCM using `DB_ENCRYPTION_KEY` (`packages/web/src/lib/encrypt.ts`).
Rotating that key invalidates all stored project connections.

---

## Code Style Guidelines

### TypeScript

Root `tsconfig.json` is strict, with several checks beyond `strict`:

```json
{
  "target": "ES2022",
  "module": "ESNext",
  "moduleResolution": "bundler",
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "isolatedModules": true,
  "experimentalDecorators": true
}
```

`noUncheckedIndexedAccess` means every index access yields `T | undefined` — narrow before use.

### Formatting (Biome)

`biome.json`: 2-space indent, LF, **line width 100**, double quotes (JS + JSX),
always semicolons, ES5 trailing commas, no trailing commas in JSON.
Run `bun run lint:fix` before committing.

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Functions | camelCase | `analyzeDomain()` |
| Types/Interfaces | PascalCase | `EntityAttribute` |
| Classes | PascalCase | `EntityService` |
| Constants (primitives) | UPPER_SNAKE_CASE | `AI_BASE_URL` |
| Constants (instances) | camelCase | `globalHookExecutor`, `domainAgent` |
| Files (logic) | kebab-case | `domain-agent.ts` |
| Files (React components) | PascalCase | `ProgressStepper.tsx` |

### Import order

1. External dependencies
2. Internal packages (`@erdwithai/*`)
3. Relative imports
4. Type-only imports (`import type`)

### Error handling

```typescript
async convert(input: ConverterInput): Promise<ConverterOutput> {
  try {
    const result = await someOperation();
    if (!result) return { success: false, error: 'Operation returned empty result' };
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

---

## Architecture Patterns

### Hook system

```typescript
hookRegistry.register({
  entity: 'Patient',
  event: 'beforeCreate',
  handler: async (data) => data,
});

export abstract class BaseService<T> {
  protected abstract entityName: string;

  async create(data: Partial<T>): Promise<T> {
    const processed = await globalHookExecutor.execute(this.entityName, "beforeCreate", data);
    return this.performCreate(processed);
  }

  protected abstract performCreate(data: Partial<T>): Promise<T>;
}
```

See `HOOKS_GUIDE.md` and `packages/core/src/generators/hook-translator/`.

### AI agent pattern (Mastra.ai)

```typescript
import { Agent } from "@mastra/core/agent";
import { mastraModelConfig } from "../config";

export const domainAgent = new Agent({
  id: "domain-agent",
  name: "Domain Analyzer",
  instructions: `...`,
  model: mastraModelConfig,   // never a hard-coded model string
});

export async function analyzeDomain(description: string) {
  const response = await domainAgent.generate(description, {
    structuredOutput: { schema: domainAnalysisSchema },
  });
  return response.object;
}
```

### Business rules (GoRules)

Rules are JDM decision graphs evaluated by `@gorules/zen-engine`
(`packages/core/src/rules/`, with a singleton engine and an LRU rule cache).
The web app edits them through `@gorules/jdm-editor` — bundled from npm, **not** a
CDN — in `components/workflow/GoRulesEditor.tsx` and `components/rules/`.

### Rate limiting

`packages/web/src/lib/rate-limit.ts` is a dependency-free, in-memory fixed-window
limiter for TanStack Start server handlers (`express-rate-limit` does not apply —
these are Web `Request`/`Response` handlers, not Express middleware). Guard a route
by returning early:

```typescript
const { AUTH_LOGIN_LIMIT, enforceRateLimit } = await import("@/lib/rate-limit");
const limited = enforceRateLimit(request, "auth:login", AUTH_LOGIN_LIMIT);
if (limited) return limited;   // 429 with Retry-After + RateLimit-* headers
```

Counters are keyed by `scope:clientIp`, so each endpoint has its own budget.
Currently applied to `api/auth/login` (10/min per IP) and `api/auth/register`
(3/min per IP).

**Limitation:** counters live in module state — single-process only, and they
reset on restart. Move `buckets` to Redis before running more than one instance.

### User-facing AI flow

```
/projects → New Project → /projects/$id/init
  → natural-language description
  → agents: domain → entity → relationship → mermaid
  → /projects/$id/design         (HITL ERD approval)
  → /projects/$id/rules-design   (business rules from %%rule flowcharts)
  → /projects/$id/generate       (stack selection + code generation)
  → /projects/$id/enhance/$serviceName
  → /projects/$id/deploy
```

---

## Environment Variables

**AI (local model — required for AI features):**
- `LOCAL_AI_BASE_URL` (default `http://localhost:8000/v1`)
- `LOCAL_AI_MODEL` (default `qwen3.6:27b-mlx`)
- `LOCAL_AI_API_KEY` (default `local`)
- `LLAMA_CPP_BASE_URL` / `LLAMA_CPP_MODEL` — optional llama.cpp server

**Database:** `DATABASE_URL`, or `PGHOST` / `PGPORT` / `PGUSER` / `PGPASSWORD` / `PGDATABASE`

**Web (client-side vars must be `VITE_`-prefixed):**
- `VITE_APP_URL` (default `http://localhost:3000`)
- `VITE_API_URL` (default `http://localhost:3000/api`)
- `VITE_MASTRA_URL` (default `http://localhost:4111`)
- `COPILOTKIT_API_KEY`

**Mastra:** `MASTRA_DATABASE_URL` (default `file:./erdwithai-mastra.db`), `MASTRA_PORT` (4111), `MASTRA_LOG_LEVEL`

**Security:** `SESSION_SECRET`, `JWT_SECRET`, `DB_ENCRYPTION_KEY` (base64, 32 bytes), `CORS_ORIGIN`, `CORS_CREDENTIALS`

**Rate limiting:** `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS` — defaults for `defaultRateLimitOptions()`; the auth routes use their own fixed limits (see Rate Limiting)

**Feature flags:** `ENABLE_AI_FEATURES`, `ENABLE_DICTIONARY_FEATURES`, `ENABLE_CODE_GENERATION`, `ENABLE_ANALYTICS`

**Code generation:** `DEFAULT_OUTPUT_DIR`, `TEMPLATE_DIR`

**ERD design:** `ERD_DESIGN_AUTO_RETRY_COUNT` (3), `ERD_DESIGN_RETRY_DELAY_MS` (2000)

`ANTHROPIC_API_KEY` is **no longer used**. See `.env.example` for the full list.

---

## Testing

### Unit tests (Vitest)

```bash
bun run test            # all unit tests
bun run test:watch
bun --filter @erdwithai/web test -- path/to/file.spec.ts
```

The effective config is `packages/web/vitest.config.ts` — jsdom, `pool: "forks"`,
10s timeouts. It deliberately includes tests from sibling packages:
`src/**`, `../core/src/**`, `../generator/src/**`. Setup file:
`packages/web/src/components/workflow/__tests__/setup.ts`.

### E2E tests (Playwright)

```bash
bun run test:playwright
bun run test:playwright:ui
bun run test:e2e:server        # starts the server first
bunx playwright test tests/e2e/foo.e2e.spec.ts
```

`playwright.config.ts`: `testDir: ./tests/e2e`, matches `**/*.e2e.spec.ts` and
`**/*.e2e-test.ts`, **Chromium only**, base URL `http://localhost:5000`,
`workers: 1` / `fullyParallel: false` (tests share state), 3-minute timeout.

Note the port mismatch: `bun run dev` serves on **3000**, Playwright targets
**5000**. Use `bun run test:e2e:server`, which sets this up for you.

Some suites under `tests/e2e/complete-tests/` target an OData/UI5 stack the
generator no longer emits — treat those as historical.

---

## Git Workflow

1. Create a feature branch from `main`
2. Make changes with descriptive commits
3. Run `bun run type-check` and `bun run lint` before pushing
4. Target `main` for pull requests

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `package.json` | Monorepo root, all scripts |
| `tsconfig.json` | Root TS config + path aliases |
| `biome.json` | Lint + format rules |
| `playwright.config.ts` / `packages/web/vitest.config.ts` | Test configuration |
| `.env.example` | All environment variable templates |
| `.claude/custom-rules.md` | Bun-only policy |
| `.claude/tanstack-start-reference.md` | TanStack Start notes |
| `packages/ai/src/config.ts` | ⭐ Central AI model config |
| `packages/ai/src/mastra/index.ts` | Mastra instance |
| `packages/ai/src/workflows/erd-design-workflow.ts` | HITL ERD workflow |
| `packages/ai/src/agents/domain-agent.ts` | NL → domain analysis |
| `packages/core/src/config/db.config.ts` | ⭐ Sole DB connection site |
| `packages/core/src/services/database.service.ts` | Kysely domain helpers |
| `packages/core/src/hooks/hook-executor.ts` | `globalHookExecutor` |
| `packages/core/src/rules/rules-engine.service.ts` | GoRules evaluation |
| `packages/generator/src/cli/generate.ts` | Generator CLI |
| `packages/generator/src/parsers/mermaid.parser.ts` | Mermaid ERD parser |
| `packages/generator/templates/tanstack-start-nestjs/` | Stack templates |
| `packages/web/vite.config.ts` | Vite 8 config + `start-api-routes` shim |
| `packages/web/src/routes/__root.tsx` | Root layout |
| `packages/web/src/lib/mermaid-flowchart-parser.ts` | Rules/workflow flowchart parser |
| `language/erdwithai-language.json` | ⭐ EML canonical definition |

---

## Additional Documentation

| Document | Description |
|----------|-------------|
| [docs/architecture.md](docs/architecture.md) | System architecture |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Build system, commands |
| [docs/TESTING.md](docs/TESTING.md) | E2E test generation |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Version 6.0 plans |
| [docs/ARCHITECTURAL-DESIGN-AUTH-WORKFLOW-RULES.md](docs/ARCHITECTURAL-DESIGN-AUTH-WORKFLOW-RULES.md) | Auth + workflow + rules design |
| [docs/AUDIT_GUIDE.md](docs/AUDIT_GUIDE.md) | Audit trail |
| [docs/NESTJS-INTEGRATION-GUIDE.md](docs/NESTJS-INTEGRATION-GUIDE.md) | Generated-backend integration |
| [language/README.md](language/README.md) | EML entry point |

---

## Common Tasks

### Add a new AI agent

1. Create `packages/ai/src/agents/<name>-agent.ts`, importing `mastraModelConfig` from `../config`
2. Re-export from `packages/ai/src/agents/index.ts`
3. Optionally wire into `packages/ai/src/workflows/erd-design-workflow.ts`

### Add a new API route (web)

1. Create the file under `packages/web/src/routes/api/…` (`$param` for dynamic segments)
2. Use `createFileRoute("/api/…")({ server: { handlers: { GET, POST, … } } })`
3. Dynamic-`import()` server-only deps inside the handler; return an explicit `Response`

### Add a new generation template

1. Add the `.hbs` file under `packages/generator/templates/tanstack-start-nestjs/`
2. Register it in `packages/generator/src/templates/loader.ts`
3. Supply context data in the matching generator class

### Extend the EML language

1. Edit `language/erdwithai-language.json` (source of truth)
2. Update `language/grammar/erdwithai.ebnf` and the relevant `language/spec/*.md`
3. Update the parser (`packages/web/src/lib/mermaid-flowchart-parser.ts` and/or `language/cli/src/`)
4. Add an example to `language/examples/`

### Add a core subpath export

1. Create `packages/core/src/<dir>/index.ts`
2. Add an `exports` entry **and** a `bun build` step to `packages/core/package.json`
3. Add the alias to root `tsconfig.json` and the relevant Vite/Vitest configs

### Run the full stack locally

```bash
bun run dev          # Terminal 1 — web app on :3000
bun run dev:mastra   # Terminal 2 — Mastra on :4111
# plus a local OpenAI-compatible model server on :8000 (LOCAL_AI_BASE_URL)
```
