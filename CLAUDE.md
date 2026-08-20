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

**Project**: ERDwithAI — AI-powered entity-relationship design and full-stack code generation
**Version**: 5.1.0 (`@erdwithai/web` is 5.1.1; `VERSION` says 5.1.1)
**Runtime**: Bun.js >= 1.3.14 (`bun.lock` is authoritative; `pnpm-workspace.yaml` / `pnpm-lock.yaml` / `.eslintrc.cjs` are vestigial — ignore them)

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `bun install` | Install dependencies |
| `bun run dev` | Start web app (http://localhost:3000) |
| `bun run dev:mastra` | Start Mastra AI service (http://localhost:4111) |
| `./scripts/start-llm.sh` | Start the local OpenAI-compatible model server (:8000) |
| `bun run build` | Build all packages (lint → core → generator → ai → web) |
| `bun run type-check` | TypeScript validation (root tsconfig, `--noEmit`) |
| `bun run type-check:language` | Type-check `language/**` (its own config — the root one excludes it) |
| `bun run lint` | Biome lint |
| `bun run lint:fix` | Biome check + autofix (`biome check --write .`) |
| `bun run format` | Biome format (`biome format --write .`) |
| `bun run generate:tanstack` | Generate a TanStack Start + NestJS app |
| `bun run wasm generate -i <model> -o <dir>` | The **full NestJS/TanStack stack** on WASM Postgres (npm + Node, no DB server) |
| `bun run wasm generate … --standalone` | The **self-contained browser app** instead (no install, no build) |
| `bun run wasm serve <dir>` | Serve a `--standalone` app over http (a Service Worker needs http, not `file://`) |
| `bun run wasm run <dir>` | Serve it *and* run its backend under Node (`host/node-host.mjs`) |
| `bun run wasm inspect <model>` | Show what `--standalone` would generate, without writing it |
| `bun run build:wasm-runtime` | Re-inline `templates/wasm/**` after editing it |
| `bun run build:wasm-browser` | Rebuild `html/assets/erdwithai-wasm.js` and `html/wasm-app/sw.js` |
| `bun run vendor:pglite` | Put PGlite beside `html/` so the hosted page runs offline |
| `bun run convert` | Run the AI conversion CLI |
| `bun run test` | Unit tests (Vitest, via `@erdwithai/web`) |
| `bun run test:playwright` | Playwright E2E tests |
| `bun run test:wasm` | The wasm stack end to end — CLI, page, and the app in Chromium |
| `bun run build:stack-templates` | Put the NestJS templates beside `html/` (for the real-stack page) |
| `bun run build:fullstack-browser` | Rebuild `html/assets/erdwithai-fullstack.js` |
| `bun run build:language-tools` | Rebuild `html/checker.js` + `html/fixer.js` (the published validators) |
| `bun run test:language-tools` | Assert those two still agree with `language/checker.ts` |
| `bun run test:e2e:server` | E2E with automatic server startup |
| `bun run seed:admin -- --email you@example.com` | Run migrations + promote a user to admin |
| `bun scripts/seed-model.ts --file examples/drug-discovery.eml.mmd` | Seed a project so a fresh container has something to design |
| `bun run clean` | Remove all `node_modules` and `dist` directories |

**Run a single Vitest test file:**
```bash
bun --filter @erdwithai/web test -- path/to/file.spec.ts
```

**Run a single Playwright test file:**
```bash
bunx playwright test tests/e2e/specific.e2e.spec.ts
```

**`erdwithai-wasm` generates two different things — mind the flag.**

```bash
# Default: the real stack (NestJS + TanStack Start), on WebAssembly Postgres.
# ~407 files; needs `npm install` and a build, but IS the editable source.
bun run wasm generate -i language/examples/crm.eml.mmd \
  -o ./crm-wasm --name "Acme CRM" --force --vendor-pglite
cd crm-wasm && npm install --prefix backend && npm run --prefix backend db:setup
npm run --prefix backend start          # NestJS on :4001, no database to start

# --standalone: the self-contained browser runtime. Boots in a tab in seconds,
# no install and no build — at the cost of there being no per-entity source.
bun run wasm generate -i language/examples/crm.eml.mmd \
  -o ./crm-browser --standalone --force --vendor-pglite
bun run wasm serve ./crm-browser        # then open http://localhost:4000
bun run wasm run   ./crm-browser        # …and run its backend under Node too
```

Both refuse a model the checker rejects (`--skip-check` overrides,
`--no-auto-fix` reports repairs instead of applying them).

**Generate an application directly from the CLI** (what CI does):
```bash
bun packages/generator/src/cli/generate.ts generate \
  --input examples/drug-discovery.eml.mmd \
  --output ./generated-app --name my-app \
  --port 4001 --frontend-port 4000 --force --no-setup
```

### What `bun run type-check` does not cover

The root `tsconfig.json` `include`/`exclude` leaves four things out, so a green
`type-check` is a narrower claim than it looks:

| Not checked | Check it with |
|---|---|
| `language/**` | `bun run type-check:language` (it needs `allowImportingTsExtensions`) |
| `**/__tests__/**`, `*.test.ts`, `*.spec.ts` | `bun run test` — Vitest type-strips, so type errors surface at review, not here |
| `packages/generator/templates/**` | generate an app and build it (see Testing) |
| the generated `tests/` workspace | `bunx tsc --noEmit` inside it — CI does this, after a port shipped nine type errors Node ran anyway |

### Known-broken / misleading scripts

- `bun run migrate` points at `packages/generator/migrations/migrate.ts`, which **does not exist**. Real migrations live in `database/migrations/` and are applied via `runMigrations()` from `@erdwithai/core/services` (see `bun run seed:admin`, which calls it).
- Root `vitest.config.ts` references `./test/setup.ts`, which does not exist. The config that actually runs is `packages/web/vitest.config.ts`. Prefer `bun run test`.
- `packages/web` still declares a `lint` script using `eslint`, but ESLint is not a dependency. Lint from the root with Biome.
- Root `test:*` scripts pointing at `test/…` (`test:app`, `test:e2e`, `test:generator`, `test:complete`) reference files that no longer exist.

---

## Project Overview

ERDwithAI turns natural-language descriptions into production-ready full-stack applications:

- AI-powered entity extraction via Mastra.ai agents against a **local OpenAI-compatible model**
- Human-in-the-loop (HITL) approval workflow for ERD design
- Visual ERD designer (Mermaid + React Flow) and visual rule/workflow/automation builders
- Full-stack code generation: TanStack Start frontend + NestJS backend + a generated `node:test` E2E suite (runnable under Bun too)
- Dictionary-driven architecture inspired by Compiere ERP (`sys_*` tables)
- Business rules via GoRules JDM / zen-engine
- CopilotKit assistant grounded in the project's own model via pgvector retrieval
- E2B sandbox for code execution in generated projects
- **EML** — a Mermaid-based modeling language for ERD + rules + workflows (see `language/`)

### Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun.js >= 1.3.14 |
| AI Orchestration | Mastra.ai v1.59+, CopilotKit v1.68+ |
| AI Model | **Local OpenAI-compatible endpoint** (default `mlx-community/Qwen3.8-27B-4bit` on :8000) |
| Retrieval | `@mastra/pg` PgVector (HNSW) + `/v1/embeddings` from the same endpoint |
| Frontend | TanStack Start v1.168, TanStack Router v1.170, Vite 8, React 19, Tailwind CSS v4, Zustand 5, Radix UI |
| Diagrams | Mermaid 11, `@xyflow/react` (React Flow), `elkjs` (layout), `bpmn-js` |
| Rules | `@gorules/zen-engine` (core), `@gorules/jdm-editor` (web UI) |
| Auth | Better Auth (core config) + custom session routes (web) |
| Backend (generated) | NestJS 10+, Fastify, Kysely |
| Database | PostgreSQL via Kysely + `pg` (pgvector for retrieval); LibSQL/SQLite for Mastra state |
| Templates | Handlebars 4.7+ |
| Testing | Vitest 4, Playwright 1.62, Testing Library, `node:test` (generated apps — runs under Bun too) |
| Code Sandbox | E2B Code Interpreter |
| Linter/Formatter | **Biome** (replaces ESLint + Prettier) |

> Tailwind v4 is wired through the `@tailwindcss/vite` plugin — there is no v3-style content-scanning step.

---

## AI Model Configuration

**Important:** this project no longer calls the Anthropic API. `ANTHROPIC_API_KEY` is dead config; the `@anthropic-ai/sdk` dependency is vestigial.

All model configuration lives in exactly one file — `packages/ai/src/config.ts`:

```ts
export const AI_BASE_URL = process.env.LOCAL_AI_BASE_URL ?? "http://127.0.0.1:8000/v1";
export const AI_MODEL    = process.env.LOCAL_AI_MODEL    ?? "mlx-community/Qwen3.8-27B-4bit";
export const AI_API_KEY  = process.env.LOCAL_AI_API_KEY  ?? "local";

/** Pass directly as the `model` field of any Mastra Agent. */
export const mastraModelConfig = {
  id: `openai/${AI_MODEL}`,
  url: AI_BASE_URL,
  apiKey: AI_API_KEY,
} as const;

/** Embeddings come from the same endpoint — one URL to point elsewhere, one key to rotate. */
export const AI_EMBEDDING_MODEL      = process.env.LOCAL_AI_EMBEDDING_MODEL ?? "bge-small-en-v1.5";
export const AI_EMBEDDING_DIMENSIONS = Number(process.env.LOCAL_AI_EMBEDDING_DIMENSIONS ?? 384);
```

**Never hard-code model strings or base URLs in agents or API routes.** Import
`mastraModelConfig` (or `AI_MODEL` / `AI_BASE_URL`) from `../config` instead.

`AI_EMBEDDING_DIMENSIONS` is the pgvector column width, fixed when the index is
created. Changing the embedding model means changing this **and** re-ingesting;
a mismatch is rejected at insert time.

Start the model server with `./scripts/start-llm.sh` (`--foreground`, `--stop`,
`--status`). A local `llama.cpp` server is optionally supported via
`LLAMA_CPP_BASE_URL` / `LLAMA_CPP_MODEL` (`packages/ai/src/providers/llama.ts`).

---

## Monorepo Structure

```
app-with-ai-tanstack/
├── packages/
│   ├── core/          # Types, hooks, services, auth, rules, workflow, config
│   ├── generator/     # Code generation engine, CLI, Handlebars templates
│   ├── ai/            # Mastra.ai agents, workflows, converter, RAG, CLI
│   └── web/           # TanStack Start app (Vite 8 + React 19)
├── language/          # EML: the Mermaid-based modeling language + `eml` CLI
├── database/          # Migrations (001–010), knexfile.ts, generator.sql
├── docs/              # Architecture, development, testing, roadmap, QA reports
├── html/              # Static guide (9 chapters) + the two live run-*.html pages
├── generated-projects/# Output directory for generated applications
├── tests/             # Playwright E2E suites
├── scripts/           # Setup, seeding, LLM startup, CI helpers, test automation
├── examples/          # Sample ERD / EML files (.mmd)
├── pics/              # QA screenshots referenced by docs/qa reports
└── .claude/           # Project rules, plans, and local skills
```

Root docs: `DESIGN.md`, `HOOKS_GUIDE.md`, `READEME.md` (sic — feature overview),
`TODOS.md`, `CHANGELOG.md`, plus QA write-ups (`GENERATOR_QA_SUMMARY.md`,
`QA_AND_IMPROVEMENT_COMPLETE.md`, `REGENERATION_TEST_RESULTS.md`,
`TEMPLATE_IMPROVEMENTS.md`).

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

`@erdwithai/core` publishes explicit subpath exports — `.`, `./types`, `./hooks`,
`./services` (+ `./services/*`, `./database.service`), `./utils` (+ `./utils/*`),
`./generators` (+ `./generators/hook-translator/*`), `./auth`, `./workflow`,
`./workflows`, `./rules`, `./config`. Adding a new subdirectory to core requires adding both an
`exports` entry **and** a `bun build` invocation in `packages/core/package.json`.

---

## Package Details

### @erdwithai/core (`packages/core/`)

```
src/
├── auth/              # Better Auth config + adapter, guards, decorators, session helpers
├── config/            # db.config.ts (the ONLY DB connection site), db.types.ts, workflow.config.ts
├── generators/
│   └── hook-translator/   # Parses hook source into generated code
├── hooks/             # hook-builder, hook-executor (globalHookExecutor), hook-registry
├── rules/             # zen-engine singleton, rules-engine.service, rule-cache, jdm.schema
├── services/          # base, database, db-introspect, entity, process-manager
├── types/             # api, bus-entity, dictionary, entity, hook, rbac, rule, sys-dictionary
├── utils/             # formatting, naming, table-naming
├── validation/        # entity.validation, Zod schemas
├── workflow/          # workflow.service, workflow.types
└── workflows/         # workflow-polling.helper
```

`db-introspect.service.ts` reads an existing Postgres schema — it backs
reverse-engineering (`/api/db/reverse-engineer`) and `seed-model.ts --from-database`.

### @erdwithai/generator (`packages/generator/`)

Code generation engine. **One stack is supported: `tanstackjs-nestjs`.**

**CLI binaries**: `erdwithai`, `erdwithai-generate` (Commander.js, `src/cli/generate.ts`)
Subcommands: `generate`, `generate:backend`, `generate:frontend`, `generate:entity`,
`inspect`, `validate`, `diff`, `info`, `wizard`, `list`, `deploy <project-dir>`.

```
src/
├── cli/generate.ts            # the CLI above
├── pipeline/
│   ├── generate-application.ts    # ⭐ the ONE path both entry points take
│   ├── parse-model.ts             # ⭐ the pure half — no node:fs, so a tab can run it
│   └── review-model.ts            # checker + fixer, over a string
├── eml/index.ts               # re-export of language/composer.ts
├── rag/index.ts               # re-export of language/rag.ts
├── rules/                     # flowchart-parser + jdm-converter → CompiledRule
├── workflows/                 # state machines (index.ts) + sagas (steps.ts)
├── hooks/                     # %%hook → CompiledHook
├── rbac/                      # %%rbac → CRUD + transition access rules
├── parsers/                   # mermaid.parser, category.parser, language-maps
├── generators/
│   ├── base.generator.ts, full-stack.generator.ts (StackOption), orchestrator.ts
│   ├── dictionary.generator.ts, ports.ts
│   ├── tanstack-start-nestjs/     # nestjs-backend + tanstack-start-frontend generators
│   └── tests/                     # node:test E2E suite generator
├── templates/loader.ts
└── utils/cli-executor.ts
templates/
├── common/                 # migrations, seeds, hooks, services, AI agents/workflows
└── tanstack-start-nestjs/
    ├── backend/            # NestJS modules: ai, audit, auth, bus, electric, hooks,
    │                       #   jobs, model-context, rules, sys, workflow, workflow-definitions
    ├── frontend/           # TanStack Start: routes, components, automation UI, i18n
    └── tests/              # generated harness/ (testing.ts shims node:test) + suites/
```

**`src/pipeline/generate-application.ts` is the single generation path.** Both
the `erdwithai` CLI and the web app's `/api/generate` route go through it, so a
model produces the same application however it was submitted. Adding a generator
input means adding it here once — do not rebuild options at a call site.

Generated apps listen on `DEFAULT_FRONTEND_PORT = 4000` and
`DEFAULT_BACKEND_PORT = 4001` (`src/generators/ports.ts`) — deliberately off
3000, where the modelling tool runs. `packages/web/src/lib/generated-ports.ts`
mirrors these for client components, with a unit test asserting they stay equal.

Also see `packages/generator/TWO_PHASE_GENERATION.md` and `MIGRATION_GUIDE.md`.

### The WASM stack (`cli-wasm`) — the default mode

`erdwithai-wasm` has **two modes and one CLI**, and confusing them is the easiest
mistake to make here:

| | what you get | cost |
|---|---|---|
| `generate` (default) | the real stack — NestJS + TanStack Start — on WebAssembly Postgres | `npm install` and a build; ~407 files |
| `generate --standalone` | a self-contained app that boots in a browser tab | no per-entity source to edit |

This section is the default mode; **The self-contained browser runtime** below is
`--standalone`.

**Sample data belongs to `--standalone`.** The self-contained runtime seeds
`model.json`'s `sampleData` on first boot, so `erdwithai-wasm generate
--standalone` writes 10 rows per entity by default — typed from the Application
Dictionary, parent-first so every Table Direct lookup opens on a row that
exists, and deterministic for a given model and seed. `.env.wasm` (see
`.env.wasm.example`) holds `WASM_SEED_RECORDS`, `WASM_SEED_SEED` and
`WASM_SEED_NULL_RATE`; `--sample-records N` overrides it and `0` turns it off.
The default mode refuses the flag rather than ignoring it: that stack seeds
through its own migrations. The library default is 0, so the hosted browser
generator is unaffected — a page generating an application for a model someone
is about to read should not invent records in it.

**`erdwithai-wasm` is not a second stack.** It runs the same pipeline
`erdwithai` runs — the same NestJS backend, the same TanStack Start front end,
the same migrations, guards, rules engine and dictionary — and then applies an
overlay that changes the two things stopping that application run without a
server:

| | |
|---|---|
| the database | `pg` is replaced by a package **of the same name** backed by PostgreSQL compiled to WebAssembly. Not one line of the backend's own source changes, because none of it ever knew what was on the far side of a `Pool`. |
| the runtime | every script that said `bun` says `node`, and scripts that ran TypeScript directly build first. |

Generating the CRM model produces **407 files, of which the overlay adds 3 and
changes 9** — and only one of the nine is application source:

```
.erdwithai.json   backend/.env        backend/.env.example
package.json      backend/package.json   frontend/package.json
docker-start.sh   backend/run-app.sh
backend/src/modules/audit/immudb.service.ts    ← the only source file
```

**CI asserts that list exactly.** The `generated-wasm-app` job generates the CRM
model twice — once with `erdwithai`, once with `erdwithai-wasm`, same name and
description — blanks the ISO timestamps generated files carry, and fails if the
set of differing files is anything other than the nine above. Widening the
overlay means widening that list in `.github/workflows/ci.yml` and being able to
say why. A second job then asserts no generated `package.json` still calls `bun`.

Verified: 13 migrations and 8 seeds run, the backend starts, better-auth signs
in, `/bus` CRUD works and the audit trail records it, all with no database
server anywhere.

```
packages/generator/
├── src/cli-wasm/generate.ts              # the `erdwithai-wasm` CLI
└── src/generators/wasm/overlay.ts        # ⭐ what the overlay is allowed to change
templates/wasm-overlay/                   # ⭐ what it ships
├── backend/pg-wasm/                      # PostgreSQL (wasm) as the `pg` package
├── backend/src/modules/audit/immudb.service.ts   # the one replaced source file
└── .npmrc, backend/.npmrc, frontend/.npmrc
```

**The one replaced file is the audit ledger.** immudb cannot be substituted the
way `pg` was — it is not a driver behind an interface, it is a second server —
so the overlay reimplements `ImmudbService` as a hash chain in the application's
own database, keeping the class, its methods and its signatures so that
`audit.service.ts` and `audit.controller.ts` are untouched. Each entry stores
the hash of the one before it; editing or deleting an entry makes
`/audit/:id/verify` report `verified: false`. It detects accidental and casual
tampering and **not** a deliberate rewrite by someone who owns the database —
the file says so, and a test asserts that it keeps saying so.

Four things the overlay had to learn, all of them from failures worth keeping:

- **The shim's version must be a plain one.** `8.99.0-wasm` reads better and
  npm excludes prereleases from `^8.0.0`, so better-auth's optional peer on `pg`
  refused the whole install.
- **`node -r dotenv/config`.** The backend finds `.env` by walking up from
  `__dirname`, which is `src/` under Bun and `dist/src/` once built, so `../.env`
  lands on a file that does not exist — and the first thing needing a secret
  fails as though the file were missing.
- **`dist/src/…`, not `dist/…`.** The backend compiles `seeds/` alongside
  `src/`, so the build mirrors the package root.
- **Pools are reference-counted.** PGlite is one embedded server shared by every
  `Pool`; `end()` closing it breaks `main.ts` seeding the administrator beside
  the live Nest module, and `end()` doing nothing leaves `db:setup` hanging
  forever after it finishes.

`ENABLE_MODEL_CONTEXT=false` in the generated `.env`: retrieval needs pgvector,
which PGlite 0.5 does not carry. The backend logs one warning and runs without
it.

**The generated `tests/` workspace runs on `node:test`.** It used to be a
`bun:test` suite, which meant a wasm application — whose whole point is running
under Node — could not be tested without Bun. `tests/harness/testing.ts` supplies
`describe`/`it`/`expect` over `node:test`: the runner comes from Node, and
`expect` is twenty lines with exactly the matchers the suites use, because
rewriting four hundred assertions into `assert.strictEqual` would have made every
one of them worse. Both runners understand `node:test`, so `bun test` still works
for the ordinary stack.

Three things Node needs that Bun did not: every relative import carries its `.ts`
extension (Node's ESM resolver requires one), no parameter properties (its
type-stripping can only *remove* syntax), and `import.meta.url` rather than
Bun's `import.meta.dir`.

**`it` has a different shape in the two runners, and `harness/testing.ts` owns
the difference.** bun:test takes a timeout as a third positional argument and
offers `it.skipIf(condition)`; node:test takes an options object and offers
neither. The shim translates both, beside the `expect` shim and for the same
reason — sixty call sites should not each know which runner they are on. It
matters because a dropped timeout does not fail a suite, it flakes it, so CI
now runs `tsc --noEmit` over the generated workspace as well as executing it.
**Add a matcher or a test-function shape to the suites and you add it here.**

### The self-contained browser runtime (`--standalone`)

The other half of `cli-wasm`, and a different trade. **`erdwithai-wasm generate
--standalone`** emits an application that runs in a browser tab with no install
and no build step at all — PGlite, an application server on a Worker under a
Node-API runtime, and a Service Worker answering the page's own `/api`
requests.

```
packages/generator/
├── src/cli-wasm/generate.ts              # the `erdwithai-wasm` CLI
├── src/browser/index.ts                  # the same generator, bundled for a browser
└── src/generators/wasm/
    ├── model-bundle.ts                   # ⭐ model -> model.json + schema.bus.sql
    ├── wasm-app.generator.ts             # assembles the file map
    └── runtime-assets.generated.ts       # templates/wasm/**, inlined (do not edit)
templates/wasm/                           # ⭐ the runtime, as editable files
├── app/schema.sys.sql                    # the dictionary schema (model-independent)
├── server/                               # router, CRUD, rules, guards, hooks, migrate
├── host/node-host.mjs                    # `node:http` host — how CI exercises it
├── host/browser-node-host.js             # Worker host + the Node-API shim
├── sw.js, boot.js, serve.mjs             # HTTP layer, startup, static server
└── ui/                                   # buildless dictionary-driven interface
```

**The two stacks differ in kind, not degree.** The NestJS stack renders ~150
source files per model, which works because `tsc` runs afterwards. Nothing runs
`tsc` in a tab, so the browser stack compiles a model into **data** — one
`app/model.json` and one `app/schema.bus.sql` — read by a runtime that is the
same bytes for every model. Generation is milliseconds and needs no install; the
trade is that there is no per-entity source to open and edit. For that, use the
NestJS stack.

**The front end is a port, not the same code, and this is the one place the two
stacks genuinely diverge.** `templates/wasm/ui/` reproduces the React
application's screens — masthead, Search/New/Save action bar, breadcrumb,
category cards on the dashboard, the dark-headed grid, the record panel with its
field-type chips — and `templates/wasm/styles.css` is the Swiss Clean palette in
hex, where `frontend/src/styles/globals.css` states it as the HSL triples
Tailwind composes with.

**`templates/common/design-tokens.json` states that palette once**, and
`src/generators/wasm/__tests__/design-tokens.test.ts` holds both stylesheets to
it. Change a colour there first; the test names whichever stylesheet you then
forget. (It was written because they had already drifted: `--primary: 182 78%
27%` renders `#0f777b`, not the `#0D6E6E` its own comment claimed.)

Two things stop the React front end being reused directly, and both are
structural rather than a matter of effort:

- **It needs a build.** React, TanStack Router and Tailwind v4 have to go
  through Vite, and the hosted generator assembles an application inside a
  browser tab where no bundler exists. A CLI-only variant could ship a prebuilt
  client, at the cost of the two entry points no longer producing the same
  application.
- **Its session is a cookie.** A Service Worker never sees the `Cookie` header
  on a request it intercepts, and a `Set-Cookie` on a response it synthesises is
  not stored. Anything hosted this way has to carry a bearer token, which
  `ui/api.js` does and better-auth does not.

**The runtime is checked in twice.** `templates/wasm/**` is the source of
truth — real `.js` files, lintable and `node --check`-able. `bun run
build:wasm-runtime` inlines them into a generated TypeScript module, which is
what the generator (and the browser bundle) actually reads, because a browser
has no `fs.readFile`. **After editing anything under `templates/wasm/` — or
`templates/wasm-overlay/` — run `bun run build:wasm-runtime`.**

One script, **two** inlined bundles, because both have to be readable from a tab:

| Source | Generated | Read by |
|---|---|---|
| `templates/wasm/**` | `src/generators/wasm/runtime-assets.generated.ts` | the standalone generator |
| `templates/wasm-overlay/**` | `src/generators/wasm/overlay-assets.generated.ts` | `applyWasmOverlay` |

Four generated artifacts are checked in and CI `--check`s all of them — stale
means a red build:

```bash
bun run build:wasm-runtime      # the two asset modules above
bun run build:wasm-browser      # html/assets/erdwithai-wasm.js + html/wasm-app/sw.js
bun run build:fullstack-browser # html/assets/erdwithai-fullstack.js
bun run build:language-tools    # html/checker.js + html/fixer.js
```

**Run them from the repository root.** Bun labels each bundled module with its
path relative to the working directory and inlines `__dirname`, so a build from
anywhere else produced a different file — `--check` passing locally and failing
on CI, which is the worst way round. `build-fullstack-browser.ts` now pins both,
but the habit is still the rule. They are also excluded from Biome
(`**/*.generated.ts` and the `html/assets` bundles), so don't hand-format them.

Things worth knowing before changing it:

- **The Node-API shim must not claim to be Node.** `host/browser-node-host.js`
  provides `process`, `Buffer` and friends so Node-shaped code runs — but
  `process.versions` deliberately carries no `node` key. PGlite detects Node by
  exactly that key, and on finding it reached for `fs/promises`, which a browser
  cannot resolve.
- **No COEP.** Cross-origin isolation would buy a faster Postgres where
  `SharedArrayBuffer` is available, and costs the ability to embed a generated
  app in an iframe — which is how `html/run-in-browser.html` demonstrates it.
- **`zen-engine` cannot follow the app into a browser** (it is a Rust binding),
  so `server/lib/expr.js` parses the expression subset the generator emits and
  `server/lib/rules.js` walks JDM. A flowchart's prose decisions
  (`Status == draft?`) are interpreted by pattern; anything unrecognised is
  reported as `assumed`, never silently passed.
- **`serve` sends no `Cross-Origin-Embedder-Policy`** and does send
  `Service-Worker-Allowed: /`. A Service Worker cannot register from `file://`,
  so a generated app must be reached over http.
- **Each application gets its own IndexedDB name**, derived in `model-bundle.ts`
  as `project.dataKey` from the schema and entity names. Two applications
  generated in one browser share an origin; with a fixed name the second found
  the first's seed marker, skipped its own seed, and ran the wrong database
  behind the right model with no error anywhere.

`html/run-in-browser.html` is the hosted end of the same thing: it loads a model
(the CRM example, the drug-discovery example, or one the reader uploads), runs
the bundled generator, hands the files to a Service Worker and boots the result
in an iframe. `bun run vendor:pglite` puts a local PGlite beside it so the whole
demonstration works with the network off; without it the page uses a CDN and
says so.

### The real stack, in a browser tab (`--standalone`'s opposite)

`html/run-real-stack.html` assembles the **actual** generated application — four
hundred files of NestJS and TanStack Start — in the browser, and hands them to a
WebContainer to install and run.

Nothing about the generator is reimplemented for it. `generateApplication` and
`applyWasmOverlay` run unmodified; what changes is the filesystem beneath them,
which `scripts/build-fullstack-browser.ts` binds to
`packages/generator/src/browser/memory-fs.ts` — a `Map`. Rewriting the pipeline
to emit a file map instead would have meant two ways to produce an application,
and the second one drifting.

```
packages/generator/src/browser/
├── memory-fs.ts     ⭐ fs over a Map; templates resolve by suffix (see below)
└── full-stack.ts    ⭐ the real pipeline + overlay, returning a file map
scripts/
├── build-fullstack-browser.ts   bundles it, binding node:fs to memory-fs
└── build-stack-templates.ts     copies templates/** beside the page as JSON
```

Two things worth knowing:

- **Templates resolve by suffix, deliberately.** `resolveTemplateDir` tries six
  candidate locations and picks the first that exists; all six ask "where is this
  repository", which has no answer in a tab. A miss falls back to matching on
  everything after `templates/`, so a seventh spelling still works.
- **The page is cross-origin isolated and nothing else is.** WebContainers
  require COOP/COEP; the standalone application requires their *absence*, since a
  COEP document cannot embed a Service-Worker-synthesised response. `serve` sets
  the headers per path.

**The boot half is unverified.** StackBlitz's hosts are unreachable from the
environment this was written in, so the install-and-start path has never been
watched working; the generation half is compared against the CLI's own output on
every commit and matches it but for nine binary fonts, which do not survive the
JSON transport. The page says both of these to the reader.

### `html/` — the guide, and the two live pages

`html/` is served as plain static files (no build step, no framework). It is two
different things sharing a stylesheet:

```
html/
├── index.html + 01…08-*.html   the guide: "Build a CRM with ERDwithAI"
├── run-in-browser.html         ⭐ generate + boot a --standalone app, in the page
├── run-real-stack.html         ⭐ generate the real stack, boot it in a WebContainer
├── checker.js                  generated — bun run build:language-tools
├── fixer.js                    generated — the published EML validators (see below)
├── models/                     crm.eml.mmd, drug-discovery.eml.mmd — what the pages offer
├── assets/
│   ├── erdwithai-wasm.js       generated — bun run build:wasm-browser
│   ├── erdwithai-fullstack.js  generated — bun run build:fullstack-browser
│   ├── stack-templates.json    generated — bun run build:stack-templates (not committed)
│   ├── vendor/                 generated — bun run vendor:pglite (not committed)
│   └── guide.css/js, run-in-browser.css/js, run-real-stack.css/js   hand-written
├── wasm-app/sw.js              generated — the Service Worker the page registers
└── img/                        screenshots, from the QA runs in pics/
```

The nine guide chapters (`index` + `01`–`08`) are prose written from the dated
walkthroughs in `docs/qa/`; the two `run-*.html` pages are live — they run the
real generator, compiled to a browser bundle.

Things to know before touching it:

- **Four of these files are build output.** Edit the source and re-run the
  script; never hand-edit `assets/erdwithai-wasm.js`,
  `assets/erdwithai-fullstack.js`, `assets/stack-templates.json` or
  `wasm-app/sw.js`. Biome ignores all of them, and CI `--check`s the two
  committed bundles.
- **`stack-templates.json` and `assets/vendor/` are not committed** — they are
  ~1.8MB of Handlebars and a copy of PGlite. Run `bun run build:stack-templates`
  and `bun run vendor:pglite` before serving the pages locally; without the
  vendored PGlite `run-in-browser.html` falls back to a CDN and says so.
- **Serve it over http, not `file://`.** A Service Worker cannot register from a
  `file://` origin. Use `bun run wasm serve html/` — it sends
  `Service-Worker-Allowed: /`, omits COEP on the standalone path, and sets
  COOP/COEP only on `run-real-stack.html` (WebContainers need them; the
  standalone app needs their absence).
- **`run-real-stack.html`'s boot half is unverified** — see the section above.

**`checker.js` and `fixer.js` are the published validation surface.** They are
`language/checker.ts` and `language/fixer.ts` bundled for the browser by
`bun run build:language-tools`, and they sit at the site root rather than under
`assets/` because their URL is the interface: `llmtext/llms-full.txt` §10 tells a
language model to run its output past `appwithai.org/guide/checker.js` before
handing a model to anyone.

They add no rules. Each entry point (`language/browser/*.entry.ts`) injects the
inlined language definition — a tab has no `erdwithai-language.json` to open —
and re-exports the pure functions, so a document that passes there is a document
`erdwithai` accepts. `fixer.js` also carries `checkAndFix`, the repair-then-
re-check loop, because a fix can uncover a problem the original error was masking.

Two CI steps guard them, and they catch different things: `build:language-tools
--check` proves the committed copies are not stale, and `test:language-tools`
proves they still *run* — they are bundled against Node stubs, and a stub that
throws where the real call returned would turn every check into an exception the
page reports as an invalid model.

### @erdwithai/ai (`packages/ai/`)

**CLI binary**: `erdwithai-convert`

```
src/
├── config.ts          # ⭐ Central model + embedding config — import from here, never hard-code
├── agents/            # domain, entity, relationship, mermaid (standalone Mastra Agents)
├── mastra/
│   ├── index.ts       # Mastra instance — registers ONLY codeAgent
│   ├── agents/code-agent.ts
│   └── tools/e2b.ts
├── rag/               # ⭐ model-context retrieval: store (PgVector), embedder, ingest, context
├── providers/         # llama.cpp provider
├── workflows/erd-design-workflow.ts   # HITL workflow (createWorkflow/createStep)
├── converter/         # AI converter + openai-fallback
├── cli/convert.ts
└── mastra.ts          # Dev-server entrypoint (`bun run dev:mastra`)
```

**Mastra instance** (`src/mastra/index.ts`): registers `codeAgent` only, LibSQL
storage, Pino logger. The four `src/agents/*` agents are used directly by the
converter and the ERD workflow — they are not registered on the Mastra instance.

**RAG** (`src/rag/`): one pgvector HNSW index (`model_context`) holds every
project's chunks plus the EML specification, separated by `projectId` metadata
rather than an index each. Spec chunks live under the reserved project id
`SPEC_PROJECT_ID = "__eml_spec__"` so one query can fetch "this project's model
and the language spec". `@mastra/pg` is imported lazily — it pulls in `pg`,
which is Node-only.

### @erdwithai/web (`packages/web/`)

TanStack Start app on Vite 8 + React 19. **No Vinxi** — `vite.config.ts` shims
`@tanstack/start-api-routes` (which still imports `vinxi/routes`) with
`src/lib/start-api-routes-compat.js`. It also loads the **root** `.env` into
`process.env` via `loadEnv`, because `bun run dev` runs Vite with cwd
`packages/web` and Bun's per-process `.env` loading would otherwise miss it.

```
src/
├── routes/
│   ├── __root.tsx, index.tsx, login.tsx, dashboard.tsx, designer.tsx, settings.tsx
│   ├── projects/
│   │   ├── index.tsx
│   │   └── $id/{init,design,logic,automations,generate,deploy}.tsx
│   │       └── enhance/{index,$serviceName}.tsx
│   ├── admin/
│   │   ├── users.tsx, mermaid/index.tsx
│   │   ├── rules/{index,new,$entity/$ruleId}.tsx
│   │   └── workflows/{index,$workflowId}.tsx
│   └── api/            # 53 server routes — see API Route Pattern below
├── components/
│   ├── ProgressStepper, WizardStepHeader, JourneyArc, ErdFlowViewer,
│   │   DbOperationsModal, CopilotProvider
│   ├── eml/            # RuleEditor, RuleFlowCanvas, StateFlowCanvas,
│   │                   #   WorkflowEditor, SagaLadder, SagaStepEditor
│   ├── automation/     # AutomationBuilder, LadderCard, RailList,
│   │                   #   RuleTableEditor, StepInspector, AutomationHelp
│   ├── approval/, code-agent/, error-boundary/, project/, providers/
│   └── ui/             # Shadcn-style primitives
├── lib/
│   ├── automation/{model,rule-content}.ts     # the automation model + serializer
│   ├── eml/{rule-flow,workflow-flow}.ts       # canvas ⇄ EML round-trip
│   ├── workflow/{bpmn-model,hook-parser}.ts
│   ├── mermaid.ts, mermaid-erd-parser.ts, mermaid-flowchart-parser.ts, mermaid-render.ts
│   ├── project-access.ts  # ⭐ one implementation of "who may read/edit a project"
│   ├── rate-limit.ts, auth-server.ts, password.ts, encrypt.ts, request-context.ts
│   ├── generated-ports.ts, action-log.ts, errors.ts, api-client.ts, jdm-converter.ts
│   ├── api/{projects,deployment}.ts, copilot-runtime.ts, mastra-adapter.ts, code-agent.ts
│   └── start-api-routes-compat.js, vinxi-routes-stub.js   # Vite shims
├── middleware/auth.ts
├── store/{projectStore,authStore}.ts   # Zustand
├── hooks/{useHumanInTheLoop,useModelAssistant}.ts
├── test/setup.ts       # Vitest setup (moved here from components/workflow/__tests__/)
└── types/{project,workflow}.ts
```

---

## The Project Wizard

`packages/web/src/types/project.ts` owns the step vocabulary —
`ProjectStep`, `STEP_ORDER`, `STEP_LABELS`, `STEP_ROUTES`. `ProgressStepper`
derives itself from those, so **a new step is added in one place**.

```
init → design → logic → generate → enhance → deploy
```

`logic` replaced the former separate `rules-design` step: a rule decides and a
process acts on what it decided, often about the same entity, so they share one
screen. `/projects/$id/automations` is the trigger→conditions→steps builder,
reachable alongside the wizard rather than being a numbered step of it.

### User-facing AI flow

```
/projects → New Project → /projects/$id/init
  → natural-language description
  → agents: domain → entity → relationship → mermaid
  → /projects/$id/design      (HITL ERD approval, ErdFlowViewer)
  → /projects/$id/logic       (rules + workflows, one screen)
  → /projects/$id/automations (trigger / conditions / steps builder, rule tables)
  → /projects/$id/generate    (code generation, SSE progress)
  → /projects/$id/enhance/$serviceName
  → /projects/$id/deploy
```

---

## TanStack Start Patterns

### File-based routing

- Dynamic segments use `$`: `$id`, `$serviceName` (not Next.js `[id]`)
- Splat routes use `$.ts` (e.g. `api/copilotkit/$.ts`)
- Flat-file segments use `.`: `api/projects/$id/eml.download.ts` → `/api/projects/$id/eml/download`
- Every route file exports `export const Route = createFileRoute('/path')({ ... })`
- `routeTree.gen.ts` is generated by the TanStack Router plugin — never edit it by hand

### API Route Pattern — use `createFileRoute` + `server.handlers`

This is the current pattern. **Do not use `createAPIFileRoute` for new routes** —
one legacy file still does (`api/db/generate-schema.ts`), and
`@tanstack/start/api` is deprecated and emits a `console.warn` on every load.

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
    },
  },
});
```

**Conventions in these handlers:**
- Dynamic-`import()` server-only modules (`@erdwithai/core/services`, `pg`, generator code) inside the handler body.
- Always return a real `Response` with an explicit `Content-Type`.
- API routes are excluded from the client router tree via the `tsr.routeFileIgnorePattern` option in `vite.config.ts`.
- **Any route touching a project must call `requireProjectAccess`** (see Project Access below).

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

export const Route = createFileRoute("/projects/$id/logic")({
  component: LogicPage,
});

function LogicPage() {
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

### Isomorphic code (`beforeLoad`, shared helpers)

A route's `beforeLoad` runs on the server for the first paint and in the browser
for every navigation after. Never import `@tanstack/react-start/server` from a
file in the client graph — the bundler's import protection fails the production
build even behind a `typeof window` check. Use `createIsomorphicFn`; see
`src/lib/request-context.ts`, which returns the base URL and cookie-carrying
fetch options for whichever side is running.

### Environment variables

- **Client** (`routes/*.tsx`, components): `import.meta.env.VITE_*` only
- **Server** (`server.handlers`, lib server modules): `process.env.*`

---

## EML — ERDwithAI Modeling Language (`language/`)

EML is a Mermaid-based language describing an app's **ERD**, **business rules**,
and **workflows** in one `.eml.mmd` artifact. Every EML document is valid,
renderable Mermaid; generator semantics ride on `%%` directive comments that
renderers ignore.

**`language/erdwithai-language.json` is the single source of truth** (EML
**1.2.0**) for the type vocabulary, modifiers, cardinalities, hook types,
rule-node shapes, automations, directives, grammar, generator contract,
conformance levels and diagnostics. Load it via the typed accessor:

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
├── composer.ts               # ⭐ Writes a complete EML document (composeEml, mergeSections)
├── rag.ts                    # ⭐ EML → retrieval chunks (one per entity/rule/workflow/spec section)
├── checker.ts                # `bun language/checker.ts <file.mmd>` — full validator
├── fixer.ts                  # `bun language/fixer.ts <file.mmd.error>` — applies auto-fixes
├── grammar/erdwithai.ebnf    # Formal EBNF grammar
├── spec/                     # 00-overview, 01-erd, 02-business-rules,
│                             # 03-workflows, 04-types-and-modifiers, 05-directives
├── cli/                      # Zero-dependency `eml` CLI (Bun) + runtime for generated apps
│   ├── src/{cli,parser,validator,model,util}.ts
│   ├── src/generate/{app,tanstack,jdm,docker,ci,github}.ts
│   └── runtime/src/          # copied into generated apps: db, server, services,
│                             #   rules, workflows, validate, openapi
└── examples/                 # crm, ecommerce, helpdesk, minimal (.eml.mmd, with .error reports)
```

**The `eml` CLI** (`language/cli/eml.ts`, a separate zero-dependency workspace
with its own `bun.lock`) is a second, self-contained front door to generation —
`eml validate | info | generate`, with `--stack`, `--docker`, `--github`
(`--github-token`, `--private`/`--public`), `--no-autofix`, `--force` and
`--json`. It is what `.github/workflows/eml-generate-and-publish.yml` drives.
Its `runtime/src/` is copied verbatim into generated apps and is excluded from
Biome, so it is written to be read, not reformatted.

`language/` is **the source of truth for both the generator and the applications
it generates**. `composer.ts` and `rag.ts` are deliberately dependency-free and
structurally typed: the generator re-exports them (`packages/generator/src/eml`,
`packages/generator/src/rag`), and `rag.ts` is copied into generated apps
verbatim — an `@erdwithai/*` import there would not survive the trip.

`composer.ts` is the **only** place that decides what a complete EML document
looks like. `mergeSections(source, { rules, workflows })` replaces the rules and
workflow sections while leaving the ERD byte-for-byte intact, which is what the
logic editor needs for a safe round trip.

**Sections** are opened by a Mermaid keyword: `erDiagram` (ERD),
`flowchart`/`graph` (rules **or** workflow), `stateDiagram-v2` (workflow).
A `flowchart` is read as **rules** when preceded by `%%meta kind: rules`, or when
it contains only decision/expression/function/io shapes and no `%%hook`
directives; otherwise it is a **workflow**.

**Directives** declared in `erdwithai-language.json`: `%%meta %%entity %%field
%%enum %%index %%category %%rbac %%hook %%rule %%guard %%trigger %%workflow
%%step %%action %%loop`. The generator pipeline compiles
`%%rule` (→ JDM), `%%action` (→ JDM decision table), `%%hook` (→ lifecycle
handlers), `%%workflow kind: state` (→ status machines), `%%workflow kind: saga`
(→ multi-step processes), `%%category` (→ entity grouping), `%%enum`/`%%field`
(→ bound enums) and `%%rbac` (→ access rules). Each directive carries a
machine-readable `status` — and a `consumedBy` naming the file that reads it:

| status | meaning | today |
|---|---|---|
| `compiled` | a shipped compiler reads it and it changes the generated app | 12 of 15 |
| `validated` | no compiler reads it, but `checker.ts` enforces its syntax and cross-references | `%%entity`, `%%rule`, `%%trigger` |
| `reserved` | documented, renderer-safe, no reader — the keyword is held so a later meaning cannot collide | none currently |

**Check the status before promising a directive does anything**, and follow
`consumedBy` to the file that would have to change. See
`spec/05-directives.md`.

### `%%rbac` — access control

`%%rbac <roleExpr> on <Entity>.<op>` **restricts**; it does not grant. A target
no directive names is open to any authenticated caller, so a model declaring
none generates exactly what it did before. `<op>` is a CRUD operation
(`create`/`read`/`update`/`delete`/`*`) **or** a transition event in the
entity's state machine.

```
%%rbac role:admin on Order.delete            # CRUD
%%rbac role:sales_manager on Quote.approve   # a transition of Quote's machine
```

Compiled by `packages/generator/src/rbac/index.ts` into `sys_operation_access`
and `sys_transition_access`, enforced by the generated `EntityAccessGuard` on
**every route carrying an entity in its path** — `/bus/:entity` and
`/workflows/entity/:entityName`. A read restriction a sibling route ignores is
not a restriction. Role names match case-insensitively; a master role bypasses.

Two things to know before touching it:

- **It deliberately does not write `sys_access`.** That is a grant table feeding
  `sys_refresh_dictionary_scope()`, where the first row added narrows a window
  to one role — a restriction on *deleting* would become a restriction on
  *looking*.
- **Transitions have no endpoint of their own.** Moving a record along an edge
  is an ordinary status update, so a rule stores the `(from_state, to_state)`
  pair and the guard matches on the states the write crosses. Both ends are kept
  because one event can sit on several edges.

### The other two access surfaces

`%%rbac` governs entity data. Two administrative surfaces are gated separately,
because a model has no way to name them:

| Surface | Rule | Guard |
|---|---|---|
| `/sys` — the Application Dictionary | reads open to any signed-in user, **writes admin-only** | `DictionaryWriteGuard` |
| `/audit` — the audit trail | admin-only | `RolesGuard` + `@Roles` |

Dictionary reads must stay open: `use-entities.ts` calls `/sys/tables`,
`/sys/fields/form` and `/sys/fields/grid` to render any list or form, so gating
them leaves a non-admin looking at empty pages. Writes are administrative —
every screen is drawn from those rows, so editing one changes what everyone
else sees.

`DictionaryWriteGuard` keys on the HTTP method rather than per-route decorators
on purpose: there are 28 write routes, and a new one added later would
otherwise default to open.

**The checker runs on the wasm path automatically.** `erdwithai-wasm generate`
refuses a model with errors and prints each with its line, code and hint;
`--skip-check` overrides. The hosted page checks the moment a model is chosen and
shows the findings under it. Both go through
`packages/generator/src/pipeline/review-model.ts`, which is the checker and the
fixer in a loop — repair, then re-check, so what is reported is what survived the
repair. Neither reimplements a rule: `checkSource` and `applyFixes` are exported
from `checker.ts` and `fixer.ts` themselves.

**Validation loop** (checker → fixer → recheck):
```bash
bun language/checker.ts examples/crm.eml.mmd          # writes crm.eml.mmd.error
bun language/fixer.ts   examples/crm.eml.mmd.error    # auto-fixes EML001/114/117/421/422
# %%rbac problems are errors, not warnings: EML210 syntax, EML211 no role,
# EML213 unknown entity, EML214 target is neither an operation nor a transition.
```

**Diagnostic codes are banded**, and the band tells you where to look:

| Range | Covers |
|---|---|
| `EML001–099` | document level: metadata, emptiness, section structure |
| `EML100–119` | entities and attributes |
| `EML120–129` | relationships |
| `EML130–199` | ERD directives: `%%enum`, `%%field`, `%%entity`, `%%index` |
| `EML200–299` | hooks, guards, triggers, workflows and rules as declared by directives |
| `EML300–399` | business-rule flowcharts |
| `EML400–449` | workflow sections: hook, state and saga |
| `EML500–599` | cross-section consistency |

128 codes are implemented; exactly five are auto-fixable (`EML001`, `EML114`,
`EML117`, `EML421`, `EML422`). **`AUTO_FIXABLE_CODES`
in `checker.ts` and the fixer's dispatch table must list the same codes** — a
code in one and not the other is either a fix that never runs or a promise the
fixer cannot keep. Adding a fix means editing both, plus the `autoFixable` map in
`erdwithai-language.json`.

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

**pgvector** is required for the model-context assistant — CI runs
`pgvector/pgvector:pg18` because `CREATE EXTENSION vector` fails on stock Postgres.

Target-database connection strings for generated projects are encrypted at rest
with AES-256-GCM using `DB_ENCRYPTION_KEY` (`packages/web/src/lib/encrypt.ts`).
Rotating that key invalidates all stored project connections.

---

## Security Patterns

### Project access

A project is owned by its creator and shared with rows in `project_members`.
**Every route that touches a project must enforce that** — reading someone
else's model by guessing an id is the same disclosure whether it arrives as
JSON, as an `.mmd` download, or as parsed sections. Use the shared helper:

```typescript
import { requireProjectAccess } from "@/lib/project-access";

const access = await requireProjectAccess(request, params.id, "read_write");
if ("response" in access) return access.response;   // 401 / 403 / 404
```

Permissions are `"read"` and `"read_write"`. Do not reimplement the check
inline — a copy in one file and not another is exactly how the EML routes ended
up open while `/api/projects/$id` was closed. `api/projects/$id/index.ts` still
carries a local `checkProjectAccess`; new routes should use the shared helper,
and that copy is worth folding in when you touch the file.

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

### Password hashing

`packages/web/src/lib/password.ts` is a **fixed-salt SHA-256** — fast to
brute-force, and identical passwords hash identically. It is kept as-is because
stored hashes are already in this format; changing it silently locks out every
existing user. Replacing it means a migration that rehashes on next successful
login, not an edit to that file. Login, registration and container bootstrap all
import from here so they cannot drift.

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
Excluded from Biome entirely (`files.includes` in `biome.json`) — everything
here is either generated, a template rendered elsewhere, or vendored:

```
packages/generator/templates   language/cli/runtime   generated-projects
**/routeTree.gen.ts   **/*.css   **/*.generated.ts
html/assets/erdwithai-wasm.js   html/assets/erdwithai-fullstack.js
html/assets/stack-templates.json   html/assets/vendor   html/wasm-app
```

Run `bun run lint:fix` before committing.

CI lints with `--diagnostic-level=error` only: the tree carries several hundred
style warnings that predate the workflow. Errors (formatting, unorganised
imports) are auto-fixable and stay enforced.

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Functions | camelCase | `analyzeDomain()` |
| Types/Interfaces | PascalCase | `EntityAttribute` |
| Classes | PascalCase | `EntityService` |
| Constants (primitives) | UPPER_SNAKE_CASE | `AI_BASE_URL` |
| Constants (instances) | camelCase | `globalHookExecutor`, `domainAgent` |
| Files (logic) | kebab-case | `domain-agent.ts` |
| Files (React components) | PascalCase | `AutomationBuilder.tsx` |

### Import order

1. External dependencies
2. Internal packages (`@erdwithai/*`)
3. Relative imports
4. Type-only imports (`import type`)

### Comments

Files in this codebase open with a block explaining **why the file exists and
what it decided** — the failure it prevents, the alternative rejected — not what
the code does line by line. Match that when adding a module; see
`packages/web/src/lib/automation/model.ts` or `language/rag.ts` for the register.

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

### The automation model

`packages/web/src/lib/automation/model.ts` — one sentence, three parts:
a **trigger**, a flat list of **conditions** that must all pass, and an ordered
list of **steps**. Deliberately not a graph: the executor runs steps in order and
stops at the first failure, so a list is the honest representation and the
builder can draw it as a ladder.

Triggers are the entity lifecycle hooks the generated services already fire —
`created`/`beforeCreated`/`updated`/`beforeUpdated`/`deleted`/`beforeDeleted`,
mapped to `afterCreate`/`beforeCreate`/… by `TRIGGER_HOOKS`.

Storage is unchanged: `serializeAutomation` writes the same Mermaid flowchart
with `%%` directives the existing parser reads, so automations saved before the
builder existed still open, and anything saved in it still runs through the
existing executor.

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

### Model-context assistant (CopilotKit + RAG)

`packages/web/src/hooks/useModelAssistant.ts` wires two channels:

- `useCopilotReadable` publishes a **small always-present summary** (app name,
  entity names, rule/workflow names). Cheap enough for every message, and it
  stops the assistant proposing an entity that already exists.
- `useCopilotAction` gives it **retrieval** against `POST /api/model-context`.
  Detail — a rule's decision table, a process's steps, directive syntax — is too
  large to send every time and only needed sometimes. Making it a search the
  model chooses to run also shows the user what was consulted.

Retrieval is scoped by `projectId` and a `surface` (`entities` | `logic` |
`general`), and the endpoint enforces project access before searching.

### Business rules (GoRules)

Rules are JDM decision graphs evaluated by `@gorules/zen-engine`
(`packages/core/src/rules/`, with a singleton engine and an LRU rule cache).
`%%rule` flowcharts compile to JDM in `packages/generator/src/rules/` — the same
representation the generated app's engine evaluates and its admin editor edits,
so a rule drawn at design time is the rule that runs. The web app edits them
through `@gorules/jdm-editor` — bundled from npm, **not** a CDN.

---

## Environment Variables

**AI (local model — required for AI features):**
- `LOCAL_AI_BASE_URL` (default `http://127.0.0.1:8000/v1`)
- `LOCAL_AI_MODEL` (default `mlx-community/Qwen3.8-27B-4bit`)
- `LOCAL_AI_API_KEY` (default `local`)
- `LOCAL_AI_EMBEDDING_MODEL` (default `bge-small-en-v1.5`), `LOCAL_AI_EMBEDDING_DIMENSIONS` (384)
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

**Seeding (containers/CI):** `SEED_MODEL` (path to an `.mmd`), `SEED_DATABASE_URL` (schema to reverse-engineer)

`ANTHROPIC_API_KEY` is **no longer used**. See `.env.example` for the full list.
The root `.env` is the only one — `packages/web/vite.config.ts` loads it into
`process.env` for the dev server.

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
`src/**`, `../core/src/**`, `../generator/src/**`, `../ai/src/**`.
Setup file: `packages/web/src/test/setup.ts`.

Notable suites: `lib/automation/__tests__/` (model, loops, rule content,
language parity, generated-app parity, a drug-discovery stress test),
`lib/eml/__tests__/rule-flow-roundtrip.test.ts`, `lib/__tests__/rate-limit.test.ts`,
`lib/__tests__/generated-ports.test.ts` (asserts the port constants match the
generator's).

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

### Testing what the generator produces

**Type-checking this repo says nothing about whether a generated app compiles** —
templates are `.hbs` text until rendered. `.github/workflows/ci.yml` therefore
has a second job that generates an application from
`examples/drug-discovery.eml.mmd`, builds its backend, frontend and test suite,
migrates a pgvector Postgres, starts the backend, and runs the generated
E2E suite against it. **Changing a template means running that path**,
not just `bun run type-check`.

The generated suite lives in `packages/generator/templates/tanstack-start-nestjs/tests/`
— a `harness/` (testing, auth, http, factory, entities, rules, workflows, metrics, report)
and `suites/` (health, auth, dictionary, bulk-seed, rules-workflow, workflow
random/multistep, users-roles, benchmark, plus per-entity CRUD and rules suites).
`--records-per-entity` controls the bulk-seed volume (default 1000; CI uses 25).

### The wasm stack, end to end

```bash
bun run test:wasm              # both halves
bun run test:wasm:cli          # the CLI: generation, the checker, the overlay footprint
bun run test:wasm:browser      # the page and the running application, in Chromium
```

`tests/e2e/wasm/` has its own Playwright config, because the root suite drives
the modelling tool on port 5000 and this one serves `html/` with the generator's
own `serve` command — the server that sets `Service-Worker-Allowed` and
deliberately omits COEP.

`cli.e2e.spec.ts` generates both ways and asserts the overlay's exact footprint;
`browser.e2e.spec.ts` drives the hosted page through generation, boot, sign-in,
dictionary-driven CRUD, a rule refusing a write, the audit trail and the checker
feedback path, leaving screenshots in `pics/wasm-e2e/`.

In a container whose Chromium Playwright did not download, set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` to it rather than running `playwright install`.

### QA reports

`docs/qa/qa-report-*.md` are dated walkthroughs of a generated application, with
screenshots in `pics/`. `html/` is a nine-chapter static guide ("Build a CRM with
ERDwithAI") built from those runs, plus the two live `run-*.html` pages.

---

## CI/CD (`.github/workflows/`)

| Workflow | What it does |
|----------|--------------|
| `ci.yml` | **checks**: type-check, `type-check:language`, Biome (errors only), unit tests, and that all three generated bundles are current (`build:wasm-runtime`, `build:fullstack-browser`, `build:wasm-browser`, each `--check`). **generated-wasm-app**: generate the CRM twice (with and without the overlay) → assert the overlay's exact nine-file footprint → assert no `bun` survives in the generated scripts → `tsc --noEmit` and load the generated `node:test` suite → install/migrate/seed on WASM Postgres → start the backend → `scripts/ci/wasm-smoke.ts` (no database service: the app carries its own). **wasm-e2e**: run `bun run test:wasm` in Chromium — the only job that opens the result. **generated-app**: generate → build backend/frontend → `tsc --noEmit` the generated test suite → migrate+seed pgvector Postgres → start backend → run the generated E2E suite |
| `github-neon.yml` | `workflow_dispatch`: generate from an online `.mmd`, point the app at a Neon database, migrate/seed/verify, run both halves on the runner, exercise it, optionally publish the app to a repo |
| `eml-generate-and-publish.yml` | `workflow_dispatch`: run the `eml` CLI over an online model and publish the generated application to a target repo |

`scripts/ci/neon-db.ts` holds everything that touches the Neon connection string
(`check`, `reset`, `report [--assert]`, `write-env`) so the URL is never
interpolated into a command line where it could reach a log or process listing.
Secrets: `NEON_DATABASE_URL`, `EML_PUBLISH_TOKEN` (needs `repo` **and**
`workflow` scopes — generated apps carry their own `.github/workflows/`).

---

## Git Workflow

1. Create a feature branch from `main`
2. Make changes with descriptive commits
3. Run `bun run type-check` and `bun run lint` before pushing
4. If you touched `packages/generator/templates/`, generate an app and build it
5. Target `main` for pull requests

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `package.json` | Monorepo root, all scripts |
| `tsconfig.json` | Root TS config + path aliases |
| `biome.json` | Lint + format rules |
| `playwright.config.ts` / `packages/web/vitest.config.ts` | Test configuration |
| `.env.example` | All environment variable templates |
| `.github/workflows/ci.yml` | Checks + generate-and-build-the-generated-app |
| `.claude/custom-rules.md` | Bun-only policy |
| `.claude/tanstack-start-reference.md` | TanStack Start notes |
| `packages/ai/src/config.ts` | ⭐ Central AI model + embedding config |
| `packages/ai/src/rag/store.ts` | pgvector model-context index |
| `packages/ai/src/mastra/index.ts` | Mastra instance |
| `packages/ai/src/workflows/erd-design-workflow.ts` | HITL ERD workflow |
| `packages/core/src/config/db.config.ts` | ⭐ Sole DB connection site |
| `packages/core/src/services/database.service.ts` | Kysely domain helpers |
| `packages/core/src/hooks/hook-executor.ts` | `globalHookExecutor` |
| `packages/core/src/rules/rules-engine.service.ts` | GoRules evaluation |
| `packages/generator/src/pipeline/generate-application.ts` | ⭐ The one generation path |
| `packages/generator/src/pipeline/parse-model.ts` | ⭐ Model → parsed model; pure, so a browser tab can run it |
| `packages/generator/src/pipeline/review-model.ts` | ⭐ Checker + fixer, over a string |
| `packages/generator/templates/common/design-tokens.json` | ⭐ The palette, stated once |
| `packages/generator/templates/.../frontend/src/lib/app-meta.ts.hbs` | ⭐ The only generated module in the front end |
| `packages/generator/src/rbac/index.ts` | `%%rbac` → operation + transition access rules |
| `packages/generator/src/cli/generate.ts` | Generator CLI |
| `packages/generator/src/generators/ports.ts` | Generated-app default ports |
| `packages/generator/templates/tanstack-start-nestjs/` | Stack templates |
| `packages/generator/src/cli-wasm/generate.ts` | ⭐ The browser-stack CLI |
| `packages/generator/src/generators/wasm/model-bundle.ts` | ⭐ Model → `model.json` + schema |
| `packages/generator/templates/wasm/` | ⭐ The `--standalone` browser runtime (run `build:wasm-runtime` after editing) |
| `packages/generator/templates/wasm-overlay/` | ⭐ What the WASM overlay ships (same build script) |
| `packages/generator/src/generators/wasm/overlay.ts` | ⭐ What the overlay is allowed to change — CI asserts its footprint |
| `packages/generator/src/browser/{memory-fs,full-stack}.ts` | The real pipeline over a `Map`, for `run-real-stack.html` |
| `html/run-in-browser.html` | Generate and run a `--standalone` app from a page, no server |
| `html/run-real-stack.html` | Assemble the real 400-file stack in a tab, boot it in a WebContainer |
| `language/cli/eml.ts` | The zero-dependency `eml` CLI (`validate`/`info`/`generate`) |
| `language/browser/*.entry.ts` | ⭐ Entry points for the published `html/checker.js` + `html/fixer.js` |
| `llmtext/llms-full.txt` | ⭐ The spec written for language models — §10 is the authoring protocol |
| `packages/web/vite.config.ts` | Vite 8 config, root-`.env` loading, `start-api-routes` shim |
| `packages/web/src/types/project.ts` | ⭐ Wizard step vocabulary |
| `packages/web/src/lib/project-access.ts` | ⭐ Project authorization |
| `packages/web/src/lib/automation/model.ts` | Automation model + serializer |
| `language/erdwithai-language.json` | ⭐ EML canonical definition |
| `language/composer.ts` | ⭐ The only writer of complete EML documents |
| `language/rag.ts` | EML → retrieval chunks (copied into generated apps) |

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
| [docs/qa/](docs/qa/) | Dated QA walkthroughs of generated apps |
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
3. Call `requireProjectAccess` if the route touches a project
4. Dynamic-`import()` server-only deps inside the handler; return an explicit `Response`

### Add a wizard step

1. Add the key to `ProjectStep`, `STEP_ORDER`, `STEP_LABELS`, `STEP_ROUTES` in `packages/web/src/types/project.ts`
2. Create `packages/web/src/routes/projects/$id/<step>.tsx`
3. `ProgressStepper` picks it up automatically — do not hard-code steps anywhere else

### Change the browser stack's runtime (`--standalone`)

1. Edit the real files under `packages/generator/templates/wasm/`
2. `bun run build:wasm-runtime` **from the repository root** — otherwise the generator keeps emitting the old bytes
3. `bun run build:wasm-browser` if the hosted page should pick it up too
4. Generate an app and start it — **`--standalone` is what produces `host/`**:
   ```bash
   bun run wasm generate -i language/examples/crm.eml.mmd \
     -o /tmp/x --standalone --force --vendor-pglite
   node /tmp/x/host/node-host.mjs --port 4700
   ```
5. `bun scripts/ci/wasm-smoke.ts --base http://localhost:4700/api`
6. `bun run test:wasm` before pushing — it is the only thing that opens the result in a browser

### Change the WASM overlay (the default, full-stack mode)

1. Edit `packages/generator/src/generators/wasm/overlay.ts` (what it may change) or
   `packages/generator/templates/wasm-overlay/**` (what it ships)
2. `bun run build:wasm-runtime` — the overlay is inlined too, into `overlay-assets.generated.ts`
3. Generate both ways and diff them; anything newly differing must be added to the
   expected footprint in `.github/workflows/ci.yml`, with a reason:
   ```bash
   bun packages/generator/src/cli/generate.ts generate \
     -i language/examples/crm.eml.mmd -o /tmp/plain --name CRM -d CRM --force --no-setup
   bun run wasm generate -i language/examples/crm.eml.mmd -o /tmp/wasm --name CRM -d CRM --force
   ```
4. `npm install --prefix /tmp/wasm/backend && npm run --prefix /tmp/wasm/backend db:setup`,
   then start it — a footprint that is right proves nothing about an app that boots

### Add a new generation template — or, more often, a component

**Ask first whether it needs a model at all.** Most of the generated front end
does not: it renders whatever the Application Dictionary describes, so it is the
same code for a CRM and for a drug-discovery lab. Those files are plain `.tsx`
and `.ts` under `templates/`, read by `BaseGenerator.component()` and copied
verbatim — an editor, a linter and the generated app's own `tsc` can all read
them, which none of them can do with a `.hbs`.

The identity a component needs comes from `src/lib/app-meta.ts` (`APP_NAME`,
`BACKEND_PORT`, …), which is the one generated module in the front end.

- **A component** (no model in it): add the `.tsx`/`.ts` under
  `templates/tanstack-start-nestjs/frontend/`, then
  `const x = await this.component("src/…")` in the matching generator.
- **A real template** (the model shapes its contents): add the `.hbs`, render it
  with `this.renderTemplate("… .hbs", context)`, and supply the context data.

Either way: generate an app and build it. `bun run type-check` in this repo does
not check `templates/` — a component there is written against the *generated*
application's dependencies, not this one's.

### Add a generator input

Add it once in `packages/generator/src/pipeline/generate-application.ts`
(`GenerationSettings`). Do **not** assemble options separately in the CLI or in
`/api/generate` — that drift is what lost `%%category` on the web path.

### Change what `%%rbac` enforces

1. `packages/generator/src/rbac/index.ts` — the compiler and its tests
2. `templates/tanstack-start-nestjs/backend/src/migrations/011_add_operation_access.ts.hbs` — the two tables
3. `templates/common/seeds/operation-access.ts.hbs` — the seed
4. `templates/.../auth/guards/entity-access.guard.ts.hbs` — enforcement
5. Generate an app, migrate, and exercise the routes — a guard that compiles
   proves nothing about whether it refuses the right callers

### Extend the EML language

1. Edit `language/erdwithai-language.json` (source of truth)
2. Update `language/grammar/erdwithai.ebnf` and the relevant `language/spec/*.md`
3. Update the parser (`language/cli/src/parser.ts`, `packages/web/src/lib/mermaid-flowchart-parser.ts`, `packages/generator/src/rules/flowchart-parser.ts`)
4. Update `language/composer.ts` if the document shape changes, and `language/rag.ts` if the chunking does
5. If you added a diagnostic, put it in the right code band; if you made it
   auto-fixable, add it to **all three** of `AUTO_FIXABLE_CODES` in `checker.ts`,
   the fixer's dispatch table, and `diagnostics.autoFixable` in the JSON
6. Add an example to `language/examples/` and run `bun language/checker.ts` over it
7. `bun run type-check:language` — the root `type-check` does not cover `language/`

### Add a core subpath export

1. Create `packages/core/src/<dir>/index.ts`
2. Add an `exports` entry **and** a `bun build` step to `packages/core/package.json`
3. Add the alias to root `tsconfig.json` and the relevant Vite/Vitest configs

### Run the full stack locally

```bash
./scripts/start-llm.sh   # local OpenAI-compatible model on :8000
bun run dev              # Terminal 1 — web app on :3000
bun run dev:mastra       # Terminal 2 — Mastra on :4111
```
