# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager Rule

**CRITICAL**: Always use `bun`. NEVER use `npm` or `pnpm`.
- Exception: `appwithai-wasm` generated apps use `npm` — that's intentional.

---

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool,
FIRST, before any other tool. When in doubt, invoke the skill.

| Request | Skill |
|---------|-------|
| Product ideas / brainstorming | `/office-hours` |
| Strategy / scope | `/plan-ceo-review` |
| Architecture | `/plan-eng-review` |
| Design system / plan review | `/design-consultation` or `/plan-design-review` |
| Full review pipeline | `/autoplan` |
| Bugs / errors | `/investigate` |
| QA / testing site behavior | `/qa` or `/qa-only` |
| Code review / diff check | `/review` |
| Visual polish | `/design-review` |
| Ship / deploy / PR | `/ship` or `/land-and-deploy` |
| Docs after shipping | `/document-release` |
| Save progress | `/context-save` |
| Resume context | `/context-restore` |
| Author a backlog-ready spec/issue | `/spec` |

Use `/browse` for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

---

# APPWITHAI

**Project**: AI-powered ERD design + full-stack code generation  
**Version**: 5.1.1 | **Runtime**: Bun.js 1.4.0 (pinned — see below)

## Commands

| Command | Purpose |
|---------|---------|
| `bun run dev` | Web app → http://localhost:3000 |
| `bun run dev:mastra` | Mastra AI → http://localhost:4111 |
| `./scripts/start-llm.sh` | Local model server → :8000 |
| `bun run build` | Build all packages |
| `bun run type-check` | TypeScript (root tsconfig only) |
| `bun run type-check:language` | Type-check `language/**` (separate config) |
| `bun run lint` / `bun run lint:fix` | Biome lint / autofix |
| `bun run test` | Vitest unit tests (runs `packages/web/vitest.config.ts`) |
| `bun run test:e2e:server` | Playwright E2E with server startup |
| `bun run test:wasm` | WASM stack end-to-end |
| `bun run seed:admin -- --email you@example.com` | Run migrations + make admin |
| `bun run wasm generate -i <model> -o <dir>` | Generate NestJS/TanStack on WASM Postgres |
| `bun run wasm generate … --standalone` | Self-contained browser app |
| `bun run build:wasm-runtime` | Re-inline `templates/wasm/**` after editing |
| `bun run build:wasm-browser` | Rebuild `html/assets/appwithai-wasm.js` + `html/wasm-app/sw.js` |
| `bun run build:fullstack-browser` | Rebuild `html/assets/appwithai-fullstack.js` |
| `bun run build:language-tools` | Rebuild `html/checker.js` + `html/fixer.js` |
| `bun run test:llmtext` | Hold `llmtext/*.txt` to what the checker actually does |

**Run a single test:**
```bash
bun --filter @appwithai/web test -- path/to/file.spec.ts
bunx playwright test tests/e2e/specific.e2e.spec.ts
```

### Run `bun install` first — both failure modes are silent

In a tree with no `node_modules`, the two commands you would reach for to check
your work lie to you, in opposite directions:

| Command | What it does with no `node_modules` |
|---|---|
| `bunx biome check .` | Resolves **`biome@0.3.3`** — an unrelated legacy package, not `@biomejs/biome` — and exits **0 having checked nothing**. Indistinguishable from a clean lint |
| `bun run type-check` | Reports **thousands of phantom errors**: every `node:` builtin and `process` is unresolvable. Indistinguishable from a broken repository |

Both have been mistaken for real results, and each wasted a CI cycle. `bun
install` fixes both. If you cannot install, pin the linter explicitly —
`bunx @biomejs/biome@2.5.6 check .` — and do not trust `type-check` at all.

### The committed build artifacts, and why CI is the only judge of them

Seven files are built from sources and committed, and CI rebuilds each one and
compares byte for byte. Editing a source without rebuilding fails the
`Type-check, lint and unit tests` job — after type-check, lint and the unit
tests have all passed, which is a long way to walk to find out.

| Rebuild with | Artifact | Stale when you edit |
|---|---|---|
| `build:wasm-runtime` | `runtime-assets.generated.ts`, `overlay-assets.generated.ts` | `templates/wasm/**`, `templates/wasm-overlay/**` |
| `build:wasm-browser` | `html/assets/appwithai-wasm.js`, `html/wasm-app/sw.js` | the standalone generator, or the service worker |
| `build:fullstack-browser` | `html/assets/appwithai-fullstack.js` | **anything the real pipeline reaches** — `packages/generator/src/{rules,hooks,workflows,templates,parsers,rbac}/**` included |
| `build:language-tools` | `html/checker.js`, `html/fixer.js` | `language/**` |

`build:fullstack-browser` is the one that catches people out: it inlines the
whole NestJS + TanStack pipeline over a memory filesystem, so a change anywhere
under `packages/generator/src` can stale it even when nothing browser-facing was
touched.

**The two kinds are not equally portable.** `runtime-assets.generated.ts`,
`overlay-assets.generated.ts` and `sw.js` are verbatim copies — byte-identical
anywhere. The `.js` bundles come from `Bun.build`, whose output depends on the
bun version **and the platform**: the full-stack bundle is 807407 bytes built on
macOS and 807697 on Linux, same bun 1.4.0, same frozen lockfile. CI builds with
the `BUN_VERSION` pinned in `.github/workflows/ci.yml` on `linux-x64`, so
rebuilding a bundle anywhere else commits bytes CI will reject.

Run `--check` before pushing, and read what it says — it compares your runtime
and platform against CI's and tells you which case you are in rather than just
"out of date":

```bash
bun run build:wasm-runtime -- --check
bun run build:fullstack-browser --check
bun run build:wasm-browser -- --check
bun run build:language-tools --check
```

Two traps worth knowing. The job's steps **fail fast**, so the first stale
artifact hides the rest — run all four locally or you will fix one per CI cycle.
And if `--check` reports your runtime differs from CI's, do not rebuild locally:
build where CI builds, e.g.
`docker run --rm -v "$PWD":/w -w /w oven/bun:1.4.0 sh -c 'bun install --frozen-lockfile && bun run build:fullstack-browser'`.

### `bun run dev` builds the workspace packages first
`packages/web` imports `@appwithai/core`, `@appwithai/generator` and
`@appwithai/ai` by bare specifier, and their `exports` point at `dist/`. On a
tree that has never been built those do not exist, so `dev` runs
`scripts/ensure-packages-built.ts` first. It builds only what is missing — 26ms
and nothing rebuilt on a warm tree. Editing `packages/core` mid-session still
needs `bun run build:core`.

### Known-broken scripts
- `bun run migrate` — file doesn't exist; real migrations: `runMigrations()` from `@appwithai/core/services`
- Root `vitest.config.ts` — references missing `./test/setup.ts`; use `bun run test`
- `packages/web` lint uses eslint (not a dep) — lint with Biome from root
- `test:app`, `test:e2e`, `test:generator`, `test:complete` — reference non-existent files
- `bun run build && bun run start` — the **production server does not work**.
  With a reachable `DATABASE_URL` it loads `@ag-ui/mcp-apps-middleware`, which
  `require()`s the ESM-only `eventsource` through the MCP SDK; Bun refuses, and
  the server answers 204 to everything including `/api/health`. Predates this
  work and reproduces on `main`. It is why the E2E suite drives `bun run dev`

### What `type-check` does NOT cover
- `language/**` → `bun run type-check:language`
- Templates (`packages/generator/templates/**`) → generate an app and build it

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun.js 1.4.0 (pinned) |
| AI Orchestration | Mastra.ai v1.59+, CopilotKit v1.68+ |
| AI Model | Local OpenAI-compatible endpoint (:8000) |
| Retrieval | `@mastra/pg` PgVector (HNSW) |
| Frontend | TanStack Start v1.168, TanStack Router v1.170, Vite 8, React 19, Tailwind CSS v4, Zustand 5 |
| Rules | `@gorules/zen-engine` + `@gorules/jdm-editor` |
| Auth | Better Auth + custom session routes |
| Backend (generated) | NestJS 10+, Fastify, Kysely |
| Database | PostgreSQL via Kysely + `pg`; LibSQL/SQLite for Mastra |
| Testing | Vitest 4, Playwright 1.62, `node:test` (generated apps) |
| Linter | **Biome** |

---

## AI Model Configuration

**No Anthropic API** — `ANTHROPIC_API_KEY` is dead config. All AI config in `packages/ai/src/config.ts`.

**Never hard-code model strings or base URLs.** Import `mastraModelConfig` from `../config`.

```ts
export const AI_BASE_URL = process.env.LOCAL_AI_BASE_URL ?? "http://127.0.0.1:8000/v1";
export const AI_MODEL    = process.env.LOCAL_AI_MODEL    ?? "mlx-community/Qwen3.8-27B-4bit";
export const mastraModelConfig = { id: `openai/${AI_MODEL}`, url: AI_BASE_URL, apiKey: "local" };
```

---

## Monorepo Structure

```
app-with-ai-tanstack/
├── packages/
│   ├── core/       # Types, hooks, services, auth, rules, workflow, config
│   ├── generator/  # Code generation engine, CLI, Handlebars templates
│   ├── ai/         # Mastra.ai agents, workflows, converter, RAG
│   └── web/        # TanStack Start app (Vite 8 + React 19)
├── language/       # EML modeling language + `eml` CLI
├── database/       # Migrations (001–010)
├── html/           # Static guide + run-in-browser.html + run-real-stack.html
├── tests/          # Playwright E2E suites
└── examples/       # Sample .eml.mmd files
```

### Package Aliases

| Alias | Resolves to |
|-------|-------------|
| `@appwithai/core` | `packages/core/src` |
| `@appwithai/generator` | `packages/generator/src` |
| `@appwithai/ai` | `packages/ai/src` |
| `@appwithai/web` | `packages/web/src` |
| `@/*` or `#/*` | `packages/web/src/*` |

Adding a new subdir to core requires an `exports` entry **and** a `bun build` step in `packages/core/package.json`.

---

## Key Architecture

### Generation pipeline

`packages/generator/src/pipeline/generate-application.ts` is the **single generation path** — both the `appwithai` CLI and `/api/generate` go through it. One stack is supported: `tanstackjs-nestjs`. Generated apps listen on frontend:4000 / backend:4001 (off 3000 where the modelling tool runs).

**Adding a migration to generated backend:** write template under `templates/tanstack-start-nestjs/backend/src/migrations/`, then **add its slug to the `scaffold` array** in `generateMigrations` in `nestjs-backend.generator.ts` — nothing scans that directory. A template that is not in that array is simply never run, and the seeds that need its tables fail. Verify with `bun run db:setup`.

### State machines

`%%workflow … kind: state` compiles to rows in `sys_workflow_transitions`, seeded by `05b_workflow_transitions.ts`. `entity-access.guard.ts` reads them and refuses a status write with no matching edge — **for every caller, master role included**: an edge the diagram never drew is not a permission an administrator lacks, it is a move that does not exist. Who may cross an edge is the separate question, answered from `sys_transition_access` (`%%guard`), and *that* one the master role does bypass. Keep the two apart; merging them is how topology enforcement came to run only on edges that happened to carry a role rule.

`GET /api/workflows/transitions?table=&from=` exposes the edges, so a screen can offer only the moves that exist.

### WASM stack

`appwithai-wasm` runs the same pipeline as `appwithai`, then applies an overlay replacing `pg` with WebAssembly Postgres and swapping `bun` for `node`. The overlay changes exactly 9 files and adds 6 — CI asserts this footprint exactly. **After editing `templates/wasm/` or `templates/wasm-overlay/`, run `bun run build:wasm-runtime` from repo root.**

`--standalone` mode generates a self-contained browser app (model compiled to `model.json` + SQL, no per-entity source). Regular mode generates the full NestJS + TanStack stack (~413 files).

### Project wizard flow

```
init → design → logic → generate → enhance → deploy
```

Step vocabulary lives in `packages/web/src/types/project.ts` (`ProjectStep`, `STEP_ORDER`, `STEP_LABELS`, `STEP_ROUTES`). `ProgressStepper` derives itself from there — **add a step in one place only**.

### Web app (packages/web/)

**No Vinxi** — `vite.config.ts` shims `@tanstack/start-api-routes` with `src/lib/start-api-routes-compat.js`. Also loads the root `.env` via `loadEnv` (Vite runs with cwd `packages/web`).

### AI package (packages/ai/)

Mastra instance (`src/mastra/index.ts`) registers `codeAgent` only. The four agents in `src/agents/*` are used directly by the converter and ERD workflow — not on the Mastra instance. RAG uses one pgvector HNSW index (`model_context`) keyed by `projectId`; spec chunks use `SPEC_PROJECT_ID = "__eml_spec__"`.

---

## TanStack Start API Routes

Use `createFileRoute` + `server.handlers`. **NOT** `createAPIFileRoute` (deprecated).

```typescript
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/projects/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getDatabase } = await import("@appwithai/core/services"); // lazy import!
        const db = getDatabase();
        // ...
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
```

Rules:
- Lazy-`import()` server-only modules inside handler body (keeps them out of client bundle)
- Always return `Response` with explicit `Content-Type`
- **Every route touching a project must call `requireProjectAccess`**
- Dynamic segments: `$id`, `$serviceName` (not `[id]`)
- Flat-file segments use `.`: `api/projects/$id/eml.download.ts` → `/api/projects/$id/eml/download`
- Never edit `routeTree.gen.ts` by hand

**Env vars:** Client components use `import.meta.env.VITE_*`; server handlers use `process.env.*`.

---

## Logging

**`packages/core/src/logging/log-spec.json` is the single source of truth.** Levels,
channels, messages and redaction are declared there; a call site names an event
and the spec decides the rest.

```ts
import { getLogger } from "@appwithai/core/logging";
getLogger("pipeline").event("pipeline.generation.completed", { project, files, durationMs });
```

Never write a level and a sentence at a call site. Naming the event keeps one
line per event in the catalogue, makes it greppable, and lets a test assert a
failure was reported without knowing its wording. Adding a log line means adding
an entry to the spec first.

| Rule | Why |
|---|---|
| Channels declare the level of their **least severe event** | Resolution takes the *quieter* of channel and environment, so no channel can be louder than its environment permits |
| `LOG_LEVEL` / `LOG_LEVEL_<CHANNEL>` override both | One subsystem turned up at 3am without a redeploy |
| stdout only, `sync: false` in production | Whatever runs the process collects it; a syscall per line is not free |
| An unknown event id is reported at `warn`, not dropped | A typo must not become silence |
| Never log a request body, a query string, or a field's value | Business data and credentials. `changedFields` logs the *keys* |

Two checks hold it together, both in `packages/core/src/logging/__tests__/`:
`logger.test.ts` reads the JSON actually written rather than spying on Pino, and
`spec-conformance.test.ts` asserts every `.event(…)` in the tree names a declared
id **and** that the spec declares nothing that nothing emits.

### The pipeline takes a logger; it does not import one

`build:fullstack-browser` bundles the pipeline for a browser tab, where Pino
cannot run. So `generate-application.ts` depends on the one-method
`PipelineLogger` port (`pipeline/logger-port.ts`) that `ChannelLogger` satisfies
structurally: Node passes the real logger, the browser passes `NO_LOG`. **Never
import `@appwithai/core/logging` from anything the browser bundle reaches** —
`bun run build:fullstack-browser` then fails, and `grep pino html/assets/appwithai-fullstack.js`
must stay at zero.

A CLI run is silent unless `LOG_LEVEL` is set (`cliLogger`): a terminal's stdout
is its report to the person watching, and interleaving JSON through it helps
nobody. The `/api/generate` path always logs.

### The generated application

Ships its own copy, derived from the canonical spec by
`packages/generator/src/logging/generated-spec.ts` — **not** a template, so the
two cannot drift. Channels not marked `generated` are filtered out.

- `backend/src/common/logging/logger.service.ts` — Pino, the Nest `LoggerService`
  adapter, `installHttpLogging`, `installProcessLogging`, and the
  `AsyncLocalStorage` request context.
- The spec is **read off disk**, and `nest-cli.json` copies it into `dist/src/`
  as a build asset. An imported JSON would be inlined and the deployed file
  would be decorative.
- **HTTP logging is a Fastify `onResponse` hook, never a Nest interceptor.**
  Interceptors run after guards, so an interceptor sees no 401 or 403 and none
  of the better-auth routes. This is the mistake to not make twice.
- The exception filter stashes its exception on the request (`__logError`) for
  that hook — the hook sees every response, the filter sees the error.
- `requestId` and `userId` come from the request context, so a service never
  takes a user it has no other use for.

---

## Database

PostgreSQL via Kysely. **One connection site:** `packages/core/src/config/db.config.ts`.

```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
# or: PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE
```

Migrations applied via `runMigrations()` from `@appwithai/core/services`. pgvector required for model-context assistant.

---

## Security Patterns

### Project access
**Every route touching a project must call `requireProjectAccess`.**

```typescript
import { requireProjectAccess } from "@/lib/project-access";
const access = await requireProjectAccess(request, params.id, "read_write");
if ("response" in access) return access.response;  // 401 / 403 / 404
```

### Rate limiting
```typescript
const { AUTH_LOGIN_LIMIT, enforceRateLimit } = await import("@/lib/rate-limit");
const limited = enforceRateLimit(request, "auth:login", AUTH_LOGIN_LIMIT);
if (limited) return limited;
```

---

## Code Style

**TypeScript strict flags:** `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess` (every index → `T | undefined`, narrow before use), `noImplicitReturns`, `isolatedModules`, `experimentalDecorators`.

**Biome:** 2-space indent, LF, line width 100, double quotes, semicolons always, ES5 trailing commas. Excluded: `packages/generator/templates`, `**/routeTree.gen.ts`, `**/*.generated.ts`, `html/assets/`.

**Naming:** functions→camelCase, Types/Classes→PascalCase, primitive constants→UPPER_SNAKE_CASE, instance constants→camelCase, logic files→kebab-case, React component files→PascalCase.

---

## Environment Variables

**AI:** `LOCAL_AI_BASE_URL` (:8000/v1), `LOCAL_AI_MODEL`, `LOCAL_AI_EMBEDDING_MODEL`, `LOCAL_AI_EMBEDDING_DIMENSIONS` (384)

**Database:** `DATABASE_URL` or `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE`

**Web (client must use `VITE_`):** `VITE_APP_URL` (:3000), `VITE_API_URL`, `VITE_MASTRA_URL` (:4111)

**Security:** `SESSION_SECRET`, `JWT_SECRET`, `DB_ENCRYPTION_KEY` (base64, 32 bytes)

**Logging:** `LOG_LEVEL`, `LOG_LEVEL_<CHANNEL>` (e.g. `LOG_LEVEL_DB`), `LOG_PRETTY`,
`LOG_SYNC`, `LOG_NAME`, `DB_SLOW_QUERY_MS` (500), `HTTP_SLOW_REQUEST_MS` (1000)

**Mastra:** `MASTRA_DATABASE_URL` (default `file:./appwithai-mastra.db`), `MASTRA_PORT` (4111)

---

## EML Language

EML is a Mermaid-based language for ERD + business rules + workflows in one `.eml.mmd` file. `language/appwithai-language.json` is the **single source of truth**.

```bash
bun language/checker.ts language/examples/crm.eml.mmd   # validates, writes .error file
bun language/fixer.ts   language/examples/crm.eml.mmd.error
```

The checker always writes the `.error` file — revert it unless the verdict changed.

**The fifteen directives** (`%%` comments Mermaid ignores):
- structure: `%%meta`, `%%entity`, `%%field`, `%%enum`, `%%index`, `%%category`
- behaviour: `%%rule`, `%%workflow`, `%%step`, `%%loop`, `%%trigger`, `%%action`, `%%hook`
- access: `%%rbac`, `%%guard`

**When changing language semantics:** edit `appwithai-language.json` first, then spec docs, grammar, parser, composer, rag. If adding a diagnostic, add its code to `AUTO_FIXABLE_CODES` in `checker.ts`, the fixer's dispatch table, and `diagnostics.autoFixable` in the JSON — all three.

**Example models are checked in twice** — `language/examples/*.eml.mmd` and `html/models/*.eml.mmd` must be byte-identical (CI asserts this).

---

## Testing

### Unit tests
Effective config: `packages/web/vitest.config.ts` (covers core, generator, ai too).

### The modelling tool's E2E suite
`bunx playwright test` (or `bun run test:e2e:server` — same thing now). Playwright
starts the server itself and stops it; there is no script to run first and no
port to line up. One value, `E2E_PORT`, feeds both the base URL and the server.

CI runs it as **Drive the modelling tool**, against a pgvector service, after
`bun run seed:admin` creates the schema and the bootstrap administrator the
suite signs in as.

| File | What it holds the app to |
|---|---|
| `01-auth` | Sign-in, sessions, sign-out, registration-needs-approval. Asserts the same answer for a wrong password and an unknown address — a different one is an account-enumeration oracle |
| `02-project-authorization` | Enumerates the project-scoped routes and drives each as nobody, a signed-in stranger, and the owner. **Found three endpoints serving unauthenticated callers on its first run** |
| `09-rate-limiting` | Runs last, deliberately: the limiter is a fixed window per IP, and exhausting it mid-suite left every later spec failing with an unrelated 429 |

Two things to know before adding to it:
- **Every test shares one IP**, so the suite runs the server with
  `AUTH_LOGIN_MAX_PER_MINUTE` / `AUTH_REGISTER_MAX_PER_MINUTE` raised. Both
  default to their production values (10 and 3) everywhere else.
- **`tests/e2e/legacy/` is excluded.** Those files target the OpenUI5 stack the
  generator no longer emits, or a generated app on a port nothing starts. See
  the README there for what is worth porting out of them.

### Template testing
**Type-checking this repo says nothing about whether a generated app compiles** — templates are `.hbs` until rendered. Changing a template means generating an app and building it, not just `bun run type-check`.

### The generated app's own suite
Every generated application gets a `tests/` project driving its HTTP API — run it with `appwithai generate … --run-tests`, or `bun run test:e2e` inside the output. Suites are ordered by filename prefix: health, auth, dictionary (`02`, `02b` layout, `02c` references), CRUD per entity (`03`), bulk seed (`04`), rules per entity (`05`), workflows (`06`–`09`), benchmark and budgets (`10`, `11`).

`harness/model.ts` carries the model's own `%%enum` values and state-machine edges into the suites. Assert against **that**, not against the dictionary the same generator wrote — otherwise a suite only proves the application is self-consistent, and passes just as happily when the generator dropped something.

The suites deliberately leave their rows behind, so **a re-run against a populated database is the normal case**. Unique values are salted with a per-run token (`E2E_RUN_TOKEN`, printed by the runner) folded into any caller-supplied salt; replacing it rather than folding into it makes every insert of the second run collide.

### WASM E2E
`tests/e2e/wasm/` has its own Playwright config (serves `html/` not the modelling tool).

---

## Key Files

| File | Purpose |
|------|---------|
| `packages/ai/src/config.ts` | ⭐ Central AI model + embedding config |
| `packages/core/src/logging/log-spec.json` | ⭐ The log specification, stated once |
| `packages/core/src/logging/logger.ts` | Pino, configured entirely from the spec |
| `packages/generator/src/pipeline/logger-port.ts` | ⭐ Why the pipeline never imports a logger |
| `packages/generator/src/logging/generated-spec.ts` | ⭐ The generated app's spec, derived not duplicated |
| `.../backend/src/common/logging/logger.service.ts.hbs` | ⭐ The generated app's logger + HTTP hook |
| `packages/core/src/config/db.config.ts` | ⭐ Sole DB connection site |
| `packages/core/src/hooks/hook-executor.ts` | `globalHookExecutor` |
| `packages/core/src/rules/rules-engine.service.ts` | GoRules evaluation |
| `packages/core/src/types/bus-entity.types.ts` | `identifierColumnNames` — display value rule |
| `packages/generator/src/pipeline/generate-application.ts` | ⭐ The one generation path |
| `packages/generator/src/pipeline/parse-model.ts` | ⭐ Model → parsed model; pure (no node:fs) |
| `packages/generator/src/rbac/roles.ts` | ⭐ `%%rbac` → roles + per-entity visibility; read by both stacks |
| `packages/generator/src/manual/index.ts` | ⭐ Parsed model → `manual.html`; both stacks write it |
| `packages/generator/src/generators/ports.ts` | Generated-app default ports (4000/4001) |
| `packages/generator/src/generators/wasm/overlay.ts` | ⭐ What the WASM overlay may change — CI asserts footprint |
| `packages/generator/templates/common/design-tokens.json` | ⭐ The palette, stated once |
| `packages/generator/templates/wasm/` | ⭐ Standalone browser runtime — run `build:wasm-runtime` after editing |
| `.../backend/src/modules/auth/guards/entity-access.guard.ts.hbs` | ⭐ Topology first, then role access |
| `.../backend/src/modules/bus/bus.service.ts.hbs` | ⭐ `getEntityMetadata` — column → control |
| `packages/web/src/types/project.ts` | ⭐ Wizard step vocabulary |
| `packages/web/src/lib/project-access.ts` | ⭐ Project authorization |
| `packages/web/vite.config.ts` | Vite config, root-.env loading, start-api-routes shim |
| `language/appwithai-language.json` | ⭐ EML canonical definition |
| `language/composer.ts` | ⭐ The only writer of complete EML documents |
| `llmtext/llms-full.txt` | ⭐ The spec written for language models |
| `llmtext/llmdetailed.txt` | The same spec, §10 replaced by the interactive authoring walkthrough |
| `scripts/ci/llmtext-claims.ts` | ⭐ Holds both of the above to the real checker — run by CI |

---

## Common Task Checklists

### Add an API route
1. Create `packages/web/src/routes/api/…` with `createFileRoute` + `server.handlers`
2. Call `requireProjectAccess` if route touches a project
3. Lazy-import server-only deps inside the handler

### Add a wizard step
1. Add to `ProjectStep`, `STEP_ORDER`, `STEP_LABELS`, `STEP_ROUTES` in `packages/web/src/types/project.ts`
2. Create `packages/web/src/routes/projects/$id/<step>.tsx`

### Add a generator input
Add once in `GenerationSettings` in `generate-application.ts`. Do NOT add at call sites.

### Change the browser runtime (`--standalone`)
1. Edit `packages/generator/templates/wasm/`
2. `bun run build:wasm-runtime` **from repo root**
3. Generate and test: `bun run wasm generate -i language/examples/crm.eml.mmd -o /tmp/x --standalone --force`
4. `bun run test:wasm` before pushing

### Change what `%%rbac` enforces
1. `packages/generator/src/rbac/roles.ts` (roles + visibility)
2. `packages/generator/src/rbac/index.ts` (compiler)
3. `templates/.../backend/src/migrations/011_add_operation_access.ts.hbs` (tables)
4. `templates/common/seeds/operation-access.ts.hbs` (seed)
5. `templates/.../auth/guards/entity-access.guard.ts.hbs` (enforcement)

### Add a migration to the generated backend
1. Write template under `templates/tanstack-start-nestjs/backend/src/migrations/`
2. **Add slug to `scaffold` array** in `generateMigrations` in `nestjs-backend.generator.ts`
3. Verify with `bun run db:setup` (not `bun run migrate`)

### Extend the EML language
1. Edit `language/appwithai-language.json` first
2. Update grammar, spec docs, parsers, composer, rag
3. Add diagnostic to all three places if auto-fixable
4. Run `bun run type-check:language`

### Add a log event
1. Declare it in `packages/core/src/logging/log-spec.json` — id, channel, level,
   message, fields. A channel must declare the level of its least severe event
2. Emit it with `getLogger(channel).event(id, fields)`; never a bare level and a
   sentence
3. If the generated application should emit it too, the channel's `surfaces`
   must include `generated` — and the call site is a `.hbs` template
4. `bun run test` — `spec-conformance.test.ts` fails on an undeclared id *and*
   on a declared event nothing emits

### Add a core subpath export
1. Create `packages/core/src/<dir>/index.ts`
2. Add `exports` entry + `bun build` step in `packages/core/package.json`
3. Add alias to root `tsconfig.json` and Vite/Vitest configs

---

## Git Workflow

1. Feature branch from `main`
2. `bun run type-check` and `bun run lint` before pushing
3. If you touched `packages/generator/templates/`, generate an app and build it
4. Target `main` for PRs
