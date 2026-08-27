# CLAUDE.md

## Package Manager Rule

**CRITICAL**: Always use `bun` for all package management and script execution. NEVER use `npm` or `pnpm`.

- `bun install`, `bun run <script>`, `bun --filter @package build`, `bunx` instead of `npx`
- Generated projects must also use bun exclusively (exception: `appwithai-wasm` generated apps use `npm` — that's intentional)

---

## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

**Skill routing** — ALWAYS invoke the skill FIRST, before any other tool:
- Bugs, errors, "why is this broken" → `/investigate`
- Ship, deploy, create PR → `/ship`
- QA, test the site → `/qa`
- Code review → `/review`
- Brainstorming, product ideas → `/office-hours`
- Architecture review → `/plan-eng-review`
- Visual audit → `/design-review`
- Update docs after shipping → `/document-release`

---

# APPWITHAI

**Project**: AI-powered ERD design + full-stack code generation
**Version**: 5.1.1 (`VERSION`; the root `package.json` still says 5.1.0) | **Runtime**: Bun.js >= 1.3.14

## Quick Reference

| Command | Purpose |
|---------|---------|
| `bun run dev` | Web app → http://localhost:3000 |
| `bun run dev:mastra` | Mastra AI → http://localhost:4111 |
| `./scripts/start-llm.sh` | Local model server → :8000 |
| `bun run build` | Build all packages |
| `bun run type-check` | TypeScript (root tsconfig) |
| `bun run type-check:language` | Type-check `language/**` (separate config) |
| `bun run lint` / `bun run lint:fix` | Biome lint / autofix |
| `bun run test` | Vitest unit tests |
| `bun run test:playwright` | Playwright E2E |
| `bun run test:e2e:server` | E2E with automatic server startup |
| `bun run test:wasm` | WASM stack end-to-end |
| `bun run wasm generate -i <model> -o <dir>` | Full NestJS/TanStack on WASM Postgres |
| `bun run wasm generate … --standalone` | Self-contained browser app |
| `bun run wasm serve <dir>` | Serve standalone app over http |
| `bun run build:wasm-runtime` | Re-inline `templates/wasm/**` after editing |
| `bun run build:wasm-browser` | Rebuild `html/assets/appwithai-wasm.js` |
| `bun run build:language-tools` | Rebuild `html/checker.js` + `html/fixer.js` |
| `bun run seed:admin -- --email you@example.com` | Run migrations + make admin |
| `bun run clean` | Remove all `node_modules` and `dist` |

**Run a single test file:**
```bash
bun --filter @appwithai/web test -- path/to/file.spec.ts
bunx playwright test tests/e2e/specific.e2e.spec.ts
```

### What `type-check` does NOT cover

| Not checked | How to check |
|---|---|
| `language/**` | `bun run type-check:language` |
| `*.test.ts`, `*.spec.ts` | `bun run test` |
| `packages/generator/templates/**` | Generate an app and build it |

### Known-broken scripts

- `bun run migrate` — the file doesn't exist. Real migrations: `runMigrations()` from `@appwithai/core/services`
- Root `vitest.config.ts` — references missing `./test/setup.ts`. Use `bun run test` (runs `packages/web/vitest.config.ts`)
- `packages/web` lint script uses eslint (not a dep) — lint with Biome from root
- `test:app`, `test:e2e`, `test:generator`, `test:complete` — reference non-existent files

### Known gaps in what gets generated

Verified against a freshly generated CRM, and green CI does not cover them:

- **`sys_workflow_transitions` is never created.** Its migration template is not
  in the `scaffold` array, so the `05b` seed fails and state-machine topology
  enforcement passes everything through. See **The generated backend's migrations
  and seeds**.
- **`bun run migrate` in a generated app does not fail on a broken seed** — its
  seed loop logs and continues. Use `bun run db:setup` when you need the truth.
- **`src/seed.ts` filters on `.ts`**, so the compiled (`dist/src/seed.js`) path
  the WASM stack runs finds no seed files and silently does nothing.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun.js >= 1.3.14 |
| AI Orchestration | Mastra.ai v1.59+, CopilotKit v1.68+ |
| AI Model | Local OpenAI-compatible endpoint (:8000) |
| Retrieval | `@mastra/pg` PgVector (HNSW) |
| Frontend | TanStack Start v1.168, TanStack Router v1.170, Vite 8, React 19, Tailwind CSS v4, Zustand 5 |
| Rules | `@gorules/zen-engine` + `@gorules/jdm-editor` |
| Auth | Better Auth + custom session routes |
| Backend (generated) | NestJS 10+, Fastify, Kysely |
| Database | PostgreSQL via Kysely + `pg`; LibSQL/SQLite for Mastra |
| Testing | Vitest 4, Playwright 1.62, `node:test` (generated apps) |
| Linter | **Biome** (replaces ESLint + Prettier) |

---

## AI Model Configuration

**No Anthropic API** — `ANTHROPIC_API_KEY` is dead config. All AI config in `packages/ai/src/config.ts`.

**Never hard-code model strings or base URLs.** Import `mastraModelConfig` from `../config`.

```ts
// packages/ai/src/config.ts
export const AI_BASE_URL = process.env.LOCAL_AI_BASE_URL ?? "http://127.0.0.1:8000/v1";
export const AI_MODEL    = process.env.LOCAL_AI_MODEL    ?? "mlx-community/Qwen3.8-27B-4bit";
export const mastraModelConfig = { id: `openai/${AI_MODEL}`, url: AI_BASE_URL, apiKey: "local" };
export const AI_EMBEDDING_MODEL      = process.env.LOCAL_AI_EMBEDDING_MODEL ?? "bge-small-en-v1.5";
export const AI_EMBEDDING_DIMENSIONS = Number(process.env.LOCAL_AI_EMBEDDING_DIMENSIONS ?? 384);
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
├── scripts/        # Setup, seeding, LLM startup, CI helpers
└── examples/       # Sample .eml.mmd files
```

Root docs: `README.md` (the repository front page), `ROADMAP.md` (⭐ the road to
1.0.0 — five items before the release is production grade and one after, each
with a checkable *Done when*; `appwithai.org/todo.html` is the same list in one
screen), `DESIGN.md`, `HOOKS_GUIDE.md`, `TODOS.md`, `CHANGELOG.md`, plus QA write-ups (`GENERATOR_QA_SUMMARY.md`,
`QA_AND_IMPROVEMENT_COMPLETE.md`, `REGENERATION_TEST_RESULTS.md`,
`TEMPLATE_IMPROVEMENTS.md`).

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

## Package Details

### @appwithai/core (`packages/core/`)

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

### @appwithai/generator (`packages/generator/`)

Code generation engine. **One stack is supported: `tanstackjs-nestjs`.**

**CLI binaries**: `appwithai`, `appwithai-generate` (Commander.js, `src/cli/generate.ts`)
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
the `appwithai` CLI and the web app's `/api/generate` route go through it, so a
model produces the same application however it was submitted. Adding a generator
input means adding it here once — do not rebuild options at a call site.

Generated apps listen on `DEFAULT_FRONTEND_PORT = 4000` and
`DEFAULT_BACKEND_PORT = 4001` (`src/generators/ports.ts`) — deliberately off
3000, where the modelling tool runs. `packages/web/src/lib/generated-ports.ts`
mirrors these for client components, with a unit test asserting they stay equal.
The generated `frontend/package.json` prefixes its **`start`** script with
`PORT={{config.frontendPort}}` as well as its `dev` script: production `vinxi
start` otherwise binds 3000 and a built application landed on a different port
from the one it was developed on.

Also see `packages/generator/TWO_PHASE_GENERATION.md` and `MIGRATION_GUIDE.md`.

### The generated backend's migrations and seeds

**One array decides what a generated backend runs.** `generateMigrations` in
`src/generators/tanstack-start-nestjs/nestjs-backend.generator.ts` holds a
`scaffold` list of `{ slug, template }` in execution order, and writes each one
as `NNNN_<slug>.ts`. The numbering is a fixed zero-padded sequence rather than a
timestamp, so regenerating overwrites each migration in place — timestamped names
made every `--force` run emit a second copy of a `CREATE TABLE` the runner had
already recorded as executed.

Generating the CRM today gives 13 migrations and 9 seeds:

```
src/migrations/                         seeds/
0000_create_auth_tables                 00_users_and_roles
0001_create_sys_tables                  01_sys_references
0002_create_bus_tables                  02_sys_dictionary
0003_add_workflow_support               02b_entity_categories
0004_create_workflow_definitions        03_business_data
0005_fix_numeric_columns                04_business_rules
0006_create_sys_category                04b_operation_access
0007_create_audit_log                   05_workflow_definitions
0008_add_automation_definitions         05b_workflow_transitions
0009_add_workflow_ownership
0010_sync_better_auth_schema
0011_add_dictionary_role_scope
0012_add_operation_access
```

**Nothing scans the migrations template directory.** A `.hbs` file dropped into
`templates/tanstack-start-nestjs/backend/src/migrations/` is inert until its slug
is added to that array — which is the whole of what "add a migration" means here.

**There are two seed runners and they disagree, deliberately and by accident:**

| | reads | on a failing seed |
|---|---|---|
| `src/migrate.ts` (`bun run migrate`) | `seeds/*.ts` | logs `✗ Seed "…" failed` and **continues** — "Don't throw - continue with other seeds" |
| `src/seed.ts` (`bun run seed`) | `seeds/*.ts` | rethrows, `process.exit(1)` |

`db:setup` is `migrate` then `seed`, so the tolerant pass runs first and the
strict pass runs over the same directory again. Which half you actually feel
depends on the stack: under Bun the strict pass reads `seeds/*.ts` and exits 1 on
the first failure; under the WASM overlay it reads a compiled `dist/` tree and
finds nothing to run at all. Two consequences worth knowing before trusting a
green run:

- **A broken seed does not fail `bun run migrate`.** It prints one red line in a
  wall of green ones and the command still exits 0.
- **`src/seed.ts` filters on `.ts`, so the compiled path seeds nothing.** Under
  the WASM overlay the backend runs `dist/src/seed.js` over `dist/seeds/*.js`;
  the filter matches no file, and it reports `✓ Seed initialization completed`
  having done nothing at all. Everything a WASM application has in it was seeded
  by `migrate.js`'s tolerant pass.

> ⚠️ **`sys_workflow_transitions` is never created.** The migration template
> `src/migrations/012_add_workflow_transitions.ts.hbs` exists but is **not in the
> `scaffold` array**, so nothing renders it. `05b_workflow_transitions.ts` is
> still generated with real rows and still inserts into that table, and
> `entity-access.guard.ts` still queries it. The result in a generated app: the
> seed fails, the guard's topology check reads zero rows, and — because it only
> refuses a transition `if (validEdges.length > 0)` — **every state transition is
> allowed.** CI stays green over it: the `generated-app` job runs only the
> tolerant `migrate`, and the `generated-wasm-app` job's own log reads
> `✗ Seed "05b_workflow_transitions.js" failed: relation "sys_workflow_transitions"
> does not exist` immediately followed by `✅ Database setup completed successfully`.
> The fix is one entry in the `scaffold` array; a test that a declared edge is
> accepted and an undeclared one is refused is what would keep it fixed.

### State-machine topology — what `%%workflow … kind: state` enforces

`%%rbac` says *who* may cross an edge. The topology table says *which edges
exist*, and it is checked first, for everyone, the administrator included.

| | |
|---|---|
| the table | `sys_workflow_transitions` — `(table_name, status_field, from_state, to_state)` unique, plus `transition_name` and `is_active` |
| what fills it | `renderWorkflowTransitionsSeed` in `nestjs-backend.generator.ts`, from `compiledWorkflows` — `[*]` initial and terminal pseudo-states are skipped, and the status column is `status` if the entity has one, else `workflow_status` |
| what reads it | the **Topology enforcement** block in `entity-access.guard.ts.hbs`, on every write that changes a status field |
| what a refusal says | `Invalid transition: 'bus_lead' has no edge from 'new' to 'closed'. Valid transitions from 'new': working` |

Three things about the guard are deliberate and easy to break:

- **An empty table means "unenforced", not "nothing is allowed".** The check is
  skipped entirely when the query returns no rows, so a model with no state
  machine is not locked out of its own status column. It is also why the missing
  migration above fails open rather than loudly.
- **Topology runs before role access.** An edge nobody declared is refused
  without ever asking which roles the caller holds — a 403 about the model, not
  about the person.
- **The seed replaces by table, not by row.** Each run deletes every row for the
  tables it is about to write, so a transition removed from the model disappears
  on regeneration instead of lingering as a still-valid edge.

The empty-model case renders a no-op module rather than an empty `TRANSITIONS`
array: `as const` gives `TRANSITIONS.length` a literal type, so comparing it to
`0` is `TS2367` in the generated backend's own build.

### Field metadata — how a column becomes a control

`getEntityMetadata` in `templates/…/backend/src/modules/bus/bus.service.ts.hbs`
is what both generated screens read. It resolves three things per column, and
each of the three was once missing in a way that showed:

- **Enumerated values.** After resolving FK label fields it batch-queries
  `sys_ref_list` for every `sys_reference_id` that is not a built-in scalar, and
  returns `options: [{ value, label }]`. `SCALAR_REF_IDS` guards the query — FK
  (18/19), date (15/16), boolean (20), JSON (28) and the other built-ins never
  have ref-list rows. Before this, `field.options` was always `undefined` and the
  front end's existing `field.options.find()` had nothing to find, so every enum
  rendered as its stored string: *female*, *applicant*.
- **Date against datetime.** `dynamic-form.tsx` splits `DATE` (ref_id 15) from
  `DATETIME` (16); sharing one branch put a time component on every plain date.
- **The label lookup is in both places.** `dynamic-form.tsx` and
  `dynamic-table.tsx` each map a stored value back through `options`, for the
  same reason `labelFor` has two callers in the browser stack — a value cannot
  read *Female* in the form and *female* in the grid it was chosen from.

**Sample data reads the field name.** The `seedValue` Handlebars helper in
`packages/generator/src/templates/loader.ts` takes the column name, the row index
and the entity's display name:

| The column is | It seeds |
|---|---|
| `first_name` / `last_name` | a name from the fixed ten |
| `full_name`, `contact_name`, `student_name`, … | a person's whole name |
| a bare `name` / `*_name` | `Grade 1`, `Grade 2` — the **entity's** display name, because `Instrument.name` is not a person and once seeded as *James Smith* |
| `*_number`, `*_no`, `*_id`, `reference`, `sku`, `barcode` | a structured code — `ADM-0001` — not the humanized label *Admission Number 1* |
| `gender`, `status`, `department`, `city`, `phone`, `address`, … | a value from that field's own vocabulary |

### The WASM stack (`cli-wasm`) — the default mode

`appwithai-wasm` has **two modes and one CLI**, and confusing them is the easiest
mistake to make here:

| | what you get | cost |
|---|---|---|
| `generate` (default) | the real stack — NestJS + TanStack Start — on WebAssembly Postgres | `npm install` and a build; ~413 files |
| `generate --standalone` | a self-contained app that boots in a browser tab | no per-entity source to edit |

This section is the default mode; **The self-contained browser runtime** below is
`--standalone`.

**Sample data belongs to `--standalone`.** The self-contained runtime seeds
`model.json`'s `sampleData` on first boot, so `appwithai-wasm generate
--standalone` writes 10 rows per entity by default — typed from the Application
Dictionary, parent-first so every Table Direct lookup opens on a row that
exists, and deterministic for a given model and seed. `.env.wasm` (see
`.env.wasm.example`) holds `WASM_SEED_RECORDS`, `WASM_SEED_SEED` and
`WASM_SEED_NULL_RATE`; `--sample-records N` overrides it and `0` turns it off.
The default mode refuses the flag rather than ignoring it: that stack seeds
through its own migrations. The library default is 0, so the hosted browser
generator is unaffected — a page generating an application for a model someone
is about to read should not invent records in it.

**`docker compose up --build` on a generated app.** Three defects had to be
fixed before it worked, and all three had been latent since the templates were
written:

- **The lockfile that is never written.** The per-service Dockerfiles did
  `COPY bun.lock package.json ./`, and a COPY of a missing file fails the build.
  They now use the `bun.loc[k]` glob and the conditional install the root
  Dockerfile already had.
- **The image name.** `docker-compose.yml` named its images `{{project.name}}`,
  so "Acme CRM" produced `image: Acme CRM:latest` — not a valid Docker
  reference, rejected before anything builds. Image names use `project.id`.
- **The build context.** Both service Dockerfiles install the *workspace* — they
  copy `backend/package.json` **and** `frontend/package.json` so resolution
  matches what the app was generated against — but compose handed them
  `context: ./backend`, putting those paths out of reach. The build reached
  `COPY backend/run-app.sh` and failed with "not found", which reads like a
  missing file rather than the wrong root. Both services now build from
  `context: .` with `dockerfile: ./backend/Dockerfile`, and a generated
  `.dockerignore` keeps `node_modules` and `.git` out of the context that
  change implies.

**Configuration comes from a root `.env`.** The generator writes a
`.env.example` beside `docker-compose.yml`; compose reads `.env` from there
automatically, and every value has a working default in the compose file, so an
absent `.env` still brings the application up. The file exists for the two
things no default can supply: the real secrets, and where the AI endpoint lives.

**The generated app's AI surface is one endpoint, and it is embeddings.** The
model-context assistant answers questions about the application's own model by
embedding it into pgvector, so what it needs is OpenAI-compatible
`POST /v1/embeddings` — `AI_BASE_URL`, `AI_API_KEY`, `AI_EMBEDDING_MODEL`,
`AI_EMBEDDING_DIMENSIONS`. A local model (Ollama, LM Studio, llama.cpp, vLLM) or
OpenAI both speak it. **The Claude API does not**: it has no embeddings
endpoint, and it is `POST /v1/messages` with `x-api-key` rather than
`POST /v1/embeddings` with a bearer token, so an Anthropic key cannot serve the
assistant on its own. `ANTHROPIC_API_KEY` is passed through and not yet read —
`.env.example` says exactly that rather than implying it works.

> **Mastra is in the modelling tool, not in generated applications.**
> `packages/ai` registers the Mastra instance and its agents; a generated app
> has no `mastra` dependency and no agent module. Wiring a chat surface into the
> generated backend is unbuilt work, not a configuration switch.

**`appwithai-wasm` is not a second stack.** It runs the same pipeline
`appwithai` runs — the same NestJS backend, the same TanStack Start front end,
the same migrations, guards, rules engine and dictionary — and then applies an
overlay that changes the two things stopping that application run without a
server:

| | |
|---|---|
| the database | `pg` is replaced by a package **of the same name** backed by PostgreSQL compiled to WebAssembly. Not one line of the backend's own source changes, because none of it ever knew what was on the far side of a `Pool`. |
| the runtime | every script that said `bun` says `node`, and scripts that ran TypeScript directly build first. |

Generating the CRM model produces **413 files plain and 419 with the overlay —
the overlay adds 6 and changes 9** — and only one of the nine is application
source. The six it adds are three `.npmrc` files and the three-file `pg-wasm`
package; the nine it changes are:

```
.appwithai.json   backend/.env        backend/.env.example
package.json      backend/package.json   frontend/package.json
docker-start.sh   backend/run-app.sh
backend/src/modules/audit/immudb.service.ts    ← the only source file
```

**CI asserts that list exactly.** The `generated-wasm-app` job generates the CRM
model twice — once with `appwithai`, once with `appwithai-wasm`, same name and
description — blanks the ISO timestamps generated files carry, and fails if the
set of differing files is anything other than the nine above. Widening the
overlay means widening that list in `.github/workflows/ci.yml` and being able to
say why. A second job then asserts no generated `package.json` still calls `bun`.

Verified: 13 migrations and 9 seeds run (one of the nine fails silently — see
**The generated backend's migrations and seeds** above), the backend starts, better-auth signs
in, `/bus` CRUD works and the audit trail records it, all with no database
server anywhere.

```
packages/generator/
├── src/cli-wasm/generate.ts              # the `appwithai-wasm` CLI
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

The other half of `cli-wasm`, and a different trade. **`appwithai-wasm generate
--standalone`** emits an application that runs in a browser tab with no install
and no build step at all — PGlite, an application server on a Worker under a
Node-API runtime, and a Service Worker answering the page's own `/api`
requests.

```
packages/generator/
├── src/cli-wasm/generate.ts              # the `appwithai-wasm` CLI
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
bun run build:wasm-browser      # html/assets/appwithai-wasm.js + html/wasm-app/sw.js
bun run build:fullstack-browser # html/assets/appwithai-fullstack.js
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

### What a record is called — the display value

A reference column stores a uuid. Every screen that shows one has to turn it
back into words: the form's lookup dropdown, and the grid cell. **One rule
answers this for both stacks** — `identifierColumnNames` in
`packages/core/src/types/bus-entity.types.ts` — and it fills
`sys_column.is_identifier`, from which a record's display value is the
identifier columns concatenated in `seq_no` order.

| The entity declares | Identifiers | Reads as |
|---|---|---|
| `name` / `full_name` / `display_name` / `title` / `label` / `subject` | that column | `Northwind Systems` |
| `first_name` **and** `last_name` | both | `Omar Kowalski` |
| `code` / `reference` / `number` | that column | `CON2026-0001` |
| **≥2 `FK` columns and no name of its own** | its first two parents | `Spring Promo — Omar Kowalski` |
| none of those | first `string`/`text` column | whatever came first |
| no text column | *(the key)* | a uuid — the outcome to avoid |

**The primary key is never an identifier.** It used to be, which put a uuid at
the front of every display value and grew a `!== "id"` filter in each consumer.

**A join entity names itself from what it joins.** `CampaignMember` is a
campaign and a contact; the row above it would have chosen `member_status`, so
every campaign member read *invited*. Two or more references and no name of its
own is the shape. Three constraints keep it readable, and each exists because
the first attempt broke without it:

- **The first two parents only.** A label from four grandparents is not a name.
  An entity with three references labels itself from the first two *in declared
  order* — the only say the modeller has in it.
- **One level deep.** A parent that is itself a join labels itself by its key
  rather than recursing.
- **Two separators.** Names of one record join with a space; two records join
  with an em dash. Sharing one turns a person into `Omar — Kowalski`.

**Resolution lives in `templates/wasm/server/lib/labels.js`**, and both callers
go through it — `/sys/lookup` (the dropdown) and `labelsForRows` (the grid) — so
a record cannot be *Northwind Systems* in the dropdown and a uuid in the table
it was chosen from. `labelFor` is sync and pure; **`labelForTable` is the async
form that reads the parent columns a join entity needs**, and is what a caller
with a database should use.

> **A generated key is `UUID`; a reference to it is `VARCHAR(255)`**, because the
> model declares `string campaign_id FK`. Postgres coerces a text *parameter* to
> uuid — which is why `WHERE id IN ($1, …)` never noticed — but refuses to
> compare the two *columns*. The subquery that resolves a join entity's parents
> casts both sides.

The NestJS side reads the same `is_identifier` flags; its
`use-bus-entity-level.ts` hook picks a *single* field for display and search, so
it skips reference identifiers — a join entity falls through to its own fallback
list rather than printing the uuid the rule put in front of it.

Tests: `packages/core/src/types/__tests__/identifier-columns.test.ts` pins the
rule, including the shapes that must **not** trip the join branch.

### The generated manual

The last thing generation does is write the application back out as prose.
`packages/generator/src/manual/index.ts` renders a `ParsedModel` into **one
self-contained HTML page** — a contents menu, a section per entity giving every
field with its control type, constraints, enumerated values and help text, then
that entity's relationships, its state machine, the rules that fire on it and
the roles that may read it, followed by the rules, the processes, and a note on
how the application was built.

**One renderer, both stacks, three ways of being served.** The browser stack puts
`manual.html` in its file map (`wasm-app.generator.ts`); the NestJS stack writes
`frontend/public/manual.html` from the pipeline (`generate-application.ts`), which
is what TanStack Start serves at `/manual.html` and what travels in the
downloadable zip. Both dashboards carry a **Manual** button pointing at it —
`templates/wasm/ui/views/dashboard.js` and
`templates/tanstack-start-nestjs/frontend/src/routes/dashboard.tsx`.

Four decisions worth keeping:

- **No stylesheet, no script, no font, no image.** It is served by a Service
  Worker, by a static directory and by a `file://` double-click out of the zip,
  and a single file with its CSS inline is the only form that survives all three.
- **It is written by the shared pipeline, not by a generator.** That is what
  makes the two stacks' copies identical for a given model — and why CI's
  overlay-footprint job does not list it: the plain and wasm runs produce the
  same bytes.
- **The stamp is a full ISO instant, deliberately.** That footprint job blanks
  ISO timestamps before diffing; a friendly `2026-08-22` would survive the
  blanking and make the two trees differ whenever the pair of runs straddles
  midnight.
- **Its prose is the model's `%%entity help:` and `%%field help:` and nothing
  else.** A field with no help gets a dash; an entity with none gets one line
  saying so, once, rather than the same sentence on every row. That is the only
  feedback a modeller gets that the help contract was never honoured, and
  `language/examples/crm.eml.mmd` now honours it on all 17 entities and every
  column.

**Two of the manual's sections are authored; the rest are derived.** This is the
distinction `language/spec/05-directives.md` and `llmtext/llms-full.txt` now
spell out for a language model writing a model:

| Manual section | Comes from | Author writes it? |
|---|---|---|
| Entity description | `%%entity … help:` | **Yes** — the only entity prose there is |
| Field help column | `%%field ….help:` | **Yes** |
| Field table (control type, constraints, values) | the `erDiagram` block, `%%enum`, `%%field ui:` | No — derived |
| Relationships | `erDiagram` FK declarations | No — derived |
| Lifecycle (From / To / Event) | `%%workflow … kind: state` | No — derived |
| Rules and automation | `%%rule`, `%%workflow kind: saga`, `%%hook` | No — derived |
| Access | `%%rbac` | No — derived |

**The example models are checked in twice.** `language/examples/*.eml.mmd` (and
`examples/*.eml.mmd`) is where a model is authored; `html/models/*.eml.mmd` is
what the two hosted pages serve, so it cannot be a symlink or an import. They
drifted — the CRM gained a `%%rbac … .read` rule per entity and the `html/` copy
did not, so the page demonstrated per-role visibility with a model that no longer
declared it. `packages/generator/src/__tests__/example-models.test.ts` asserts
they are byte-identical.

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
├── index.html + 01…08-*.html   the guide: "Build a CRM with APPWITHAI"
├── run-in-browser.html         ⭐ generate + boot a --standalone app, in the page
├── run-real-stack.html         ⭐ generate the real stack, boot it in a WebContainer
├── checker.js                  generated — bun run build:language-tools
├── fixer.js                    generated — the published EML validators (see below)
├── models/                     crm.eml.mmd, drug-discovery.eml.mmd — what the pages offer
├── assets/
│   ├── appwithai-wasm.js       generated — bun run build:wasm-browser
│   ├── appwithai-fullstack.js  generated — bun run build:fullstack-browser
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
  script; never hand-edit `assets/appwithai-wasm.js`,
  `assets/appwithai-fullstack.js`, `assets/stack-templates.json` or
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
inlined language definition — a tab has no `appwithai-language.json` to open —
and re-exports the pure functions, so a document that passes there is a document
`appwithai` accepts. `fixer.js` also carries `checkAndFix`, the repair-then-
re-check loop, because a fix can uncover a problem the original error was masking.

Two CI steps guard them, and they catch different things: `build:language-tools
--check` proves the committed copies are not stale, and `test:language-tools`
proves they still *run* — they are bundled against Node stubs, and a stub that
throws where the real call returned would turn every check into an exception the
page reports as an invalid model.

### @appwithai/ai (`packages/ai/`)

**CLI binary**: `appwithai-convert`

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

### @appwithai/web (`packages/web/`)

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

### API Route Pattern — use `createFileRoute` + `server.handlers`

Do NOT use `createAPIFileRoute` (deprecated).

```typescript
// routes/api/projects/$id/index.ts
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/projects/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getDatabase } = await import("@appwithai/core/services"); // lazy import!
        const db = getDatabase();
        const project = await db.selectFrom("projects").selectAll()
          .where("id", "=", params.id).executeTakeFirst();
        return new Response(JSON.stringify(project), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
```

**Rules:**
- Dynamic-`import()` server-only modules inside the handler body (keeps them out of client bundle)
- Always return a `Response` with explicit `Content-Type`
- Any route touching a project must call `requireProjectAccess`
- Dynamic segments: `$id`, `$serviceName` (not Next.js `[id]`)
- Flat-file segments use `.`: `api/projects/$id/eml.download.ts` → `/api/projects/$id/eml/download`
- Never edit `routeTree.gen.ts` by hand

### Environment variables

- **Client** (components): `import.meta.env.VITE_*` only
- **Server** (handlers, lib): `process.env.*`

### Navigation

```typescript
navigate({ to: '/projects/$id', params: { id: '123' } })
Route.useParams()   // get URL params
Route.useSearch()   // get search params
<Link to="/path">
```

---

## Database

PostgreSQL via Kysely. **One connection site:** `packages/core/src/config/db.config.ts`.

```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
# or: PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE
```

Migrations: `database/migrations/001–010`, applied via `runMigrations()` from `@appwithai/core/services`.

pgvector required for model-context assistant — use `pgvector/pgvector:pg18` in CI.

---

## Security Patterns

### Project access

**Every route touching a project must call `requireProjectAccess`.**

```typescript
import { requireProjectAccess } from "@/lib/project-access";
const access = await requireProjectAccess(request, params.id, "read_write");
if ("response" in access) return access.response;  // 401 / 403 / 404
```

Permissions: `"read"` or `"read_write"`. Do not reimplement inline.

### Rate limiting

In-memory fixed-window limiter for Web `Request`/`Response` handlers (not Express middleware).

```typescript
const { AUTH_LOGIN_LIMIT, enforceRateLimit } = await import("@/lib/rate-limit");
const limited = enforceRateLimit(request, "auth:login", AUTH_LOGIN_LIMIT);
if (limited) return limited;
```

---

## Code Style

### TypeScript (strict + extras)

`noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess` (every index → `T | undefined`, narrow before use), `noImplicitReturns`, `isolatedModules`, `experimentalDecorators`.

### Biome formatting

2-space indent, LF, **line width 100**, double quotes, semicolons always, ES5 trailing commas.
Run `bun run lint:fix` before committing.

Excluded from Biome: `packages/generator/templates`, `**/routeTree.gen.ts`, `**/*.generated.ts`, `html/assets/`.

### Naming

| Type | Convention |
|------|------------|
| Functions | camelCase |
| Types/Interfaces/Classes | PascalCase |
| Constants (primitives) | UPPER_SNAKE_CASE |
| Constants (instances) | camelCase |
| Files (logic) | kebab-case |
| Files (React components) | PascalCase |

---

## Environment Variables

**AI:**
- `LOCAL_AI_BASE_URL` (default `http://127.0.0.1:8000/v1`)
- `LOCAL_AI_MODEL` (default `mlx-community/Qwen3.8-27B-4bit`)
- `LOCAL_AI_EMBEDDING_MODEL` / `LOCAL_AI_EMBEDDING_DIMENSIONS` (384)

**Database:** `DATABASE_URL` or `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE`

**Web (must be `VITE_` for client):**
- `VITE_APP_URL` (localhost:3000), `VITE_API_URL`, `VITE_MASTRA_URL` (localhost:4111)

**Security:** `SESSION_SECRET`, `JWT_SECRET`, `DB_ENCRYPTION_KEY` (base64, 32 bytes)

**Mastra:** `MASTRA_DATABASE_URL` (default `file:./appwithai-mastra.db`), `MASTRA_PORT` (4111)

`ANTHROPIC_API_KEY` — **no longer used**.

---

## EML Language (`language/`)

EML is a Mermaid-based language for ERD + business rules + workflows in one `.eml.mmd` file.
`language/appwithai-language.json` is the **single source of truth** (v1.2.0).

```bash
bun language/checker.ts language/examples/crm.eml.mmd   # validates, writes .error file
bun language/fixer.ts   language/examples/crm.eml.mmd.error  # auto-fixes EML001/114/117/421/422
```

The checker always writes the `.error` file, clean run or not — the CRM example
currently reports **0 errors and 0 warnings**, and its `.error` file says so.
That file is checked in and carries a timestamp, so running the checker over an
example dirties the working tree; revert it unless the verdict actually changed.

**The fifteen directives** (`%%` comments a Mermaid renderer ignores, which is
what keeps an EML document a valid diagram):

| | |
|---|---|
| structure | `%%meta`, `%%entity`, `%%field`, `%%enum`, `%%index`, `%%category` |
| behaviour | `%%rule`, `%%workflow`, `%%step`, `%%loop`, `%%trigger`, `%%action`, `%%hook` |
| access | `%%rbac`, `%%guard` |

Diagnostic code bands: `001-099` doc level, `100-199` entities/relations/ERD directives, `200-299` hooks/rules/workflows, `300-399` rule flowcharts, `400-449` workflow sections, `500-599` cross-section.

When changing language semantics: edit `appwithai-language.json` first, then spec docs, grammar, parser, composer, rag.

---

## Testing

### Unit (Vitest)
Effective config: `packages/web/vitest.config.ts` (covers `../core/src`, `../generator/src`, `../ai/src` too).

```bash
bun run test
bun --filter @appwithai/web test -- path/to/file.spec.ts
```

### E2E (Playwright)
`testDir: ./tests/e2e`, Chromium only, base URL `http://localhost:5000`, `workers: 1`.

Note: `bun run dev` serves on **3000**; Playwright targets **5000**. Use `bun run test:e2e:server`.

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

Two suites sit at the root of `tests/e2e/` and drive the modelling tool itself:

| Spec | What it covers |
|---|---|
| `project-permissions.e2e.spec.ts` | who may read and edit a project — the browser-side half of `requireProjectAccess` |
| `simple-crm-business-rules.e2e.spec.ts` | authoring rules against a small CRM and seeing them fire |

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
APPWITHAI") built from those runs, plus the two live `run-*.html` pages.

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
| `packages/generator/src/rbac/roles.ts` | ⭐ `%%rbac` → the roles, one account each, and per-entity visibility — read by both stacks |
| `packages/generator/src/manual/index.ts` | ⭐ The parsed model → `manual.html`, one self-contained page — written by both stacks |
| `packages/generator/src/cli/generate.ts` | Generator CLI |
| `packages/generator/src/generators/ports.ts` | Generated-app default ports |
| `packages/generator/src/templates/loader.ts` | Handlebars helpers — `seedValue` decides what sample data says |
| `.../backend/src/migrations/012_add_workflow_transitions.ts.hbs` | ⚠️ `sys_workflow_transitions` — a template no scaffold entry renders |
| `.../backend/src/modules/auth/guards/entity-access.guard.ts.hbs` | ⭐ Topology first, then role access |
| `.../backend/src/modules/bus/bus.service.ts.hbs` | ⭐ `getEntityMetadata` — what makes a column a control |
| `.../backend/src/migrate.ts.hbs` / `seed.ts.hbs` | The tolerant and the strict seed runners |
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
| `language/appwithai-language.json` | ⭐ EML canonical definition |
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

### Add an API route
1. Create `packages/web/src/routes/api/…` with `createFileRoute` + `server.handlers`
2. Call `requireProjectAccess` if route touches a project
3. Lazy-import server-only deps inside the handler

### Add a wizard step
1. Add to `ProjectStep`, `STEP_ORDER`, `STEP_LABELS`, `STEP_ROUTES` in `packages/web/src/types/project.ts`
2. Create `packages/web/src/routes/projects/$id/<step>.tsx`
3. `ProgressStepper` auto-updates — don't hard-code steps elsewhere

### Add a generator input
Add once in `packages/generator/src/pipeline/generate-application.ts` (`GenerationSettings`). Do NOT add at call sites.

### Change the browser runtime (`--standalone`)
1. Edit `packages/generator/templates/wasm/`
2. `bun run build:wasm-runtime` **from repo root**
3. Generate and test: `bun run wasm generate -i language/examples/crm.eml.mmd -o /tmp/x --standalone --force`
4. `bun run test:wasm` before pushing

### Change the generated manual

1. `packages/generator/src/manual/index.ts` is the whole renderer — there is no
   template and no second copy
2. Render it over the CRM model and open the result before believing it:
   ```bash
   bun -e 'import{readFileSync,writeFileSync}from"node:fs";\
   const{parseModel}=await import("./packages/generator/src/pipeline/parse-model");\
   const{renderManual}=await import("./packages/generator/src/manual/index");\
   writeFileSync("/tmp/manual.html",renderManual(parseModel(readFileSync("language/examples/crm.eml.mmd","utf-8")),{name:"Acme CRM",version:"1.0.0",description:"CRM"}))'
   ```
3. `bun run build:wasm-runtime` is **not** needed — the manual is TypeScript in
   `src/`, not a template under `templates/wasm/` — but `build:wasm-browser` and
   `build:fullstack-browser` are, because both bundles carry it
4. Generate both ways and re-run the footprint diff: the two copies must stay
   identical, or CI's `generated-wasm-app` job fails on a file the overlay does
   not own

### Change what `%%rbac` enforces

0. `packages/generator/src/rbac/roles.ts` if it changes the roles, the seeded
   accounts or which entities a role may see — both stacks read that one file,
   and its tests are `src/rbac/__tests__/derive-access.test.ts`
1. `packages/generator/src/rbac/index.ts` — the compiler and its tests
2. `templates/tanstack-start-nestjs/backend/src/migrations/011_add_operation_access.ts.hbs` — the two tables
3. `templates/common/seeds/operation-access.ts.hbs` — the seed
4. `templates/.../auth/guards/entity-access.guard.ts.hbs` — enforcement
5. Generate an app, migrate, and exercise the routes — a guard that compiles
   proves nothing about whether it refuses the right callers

### Add a migration to the generated backend

1. Write the template under
   `templates/tanstack-start-nestjs/backend/src/migrations/`
2. **Add its slug to the `scaffold` array** in `generateMigrations`
   (`src/generators/tanstack-start-nestjs/nestjs-backend.generator.ts`), in the
   position the execution order needs — nothing scans that directory, so a
   template not in the array is never rendered
3. Generate an app and run `bun run db:setup`, not `bun run migrate`: the
   migrate path swallows seed failures, so it is green whether or not your table
   exists

### Change what a state machine enforces

1. `packages/generator/src/workflows/index.ts` — `%%workflow … kind: state` →
   `CompiledWorkflow.transitions`
2. `renderWorkflowTransitionsSeed` in `nestjs-backend.generator.ts` — what lands
   in `sys_workflow_transitions`
3. `templates/.../backend/src/migrations/012_add_workflow_transitions.ts.hbs` —
   the table (**and the `scaffold` array, which does not yet name it**)
4. `templates/.../auth/guards/entity-access.guard.ts.hbs` — the **Topology
   enforcement** block, which runs before the role check
5. Exercise both directions against a running app: a declared edge accepted, an
   undeclared one refused with a 403. An empty table fails open, so "nothing was
   refused" is the symptom of a missing table as well as of a passing test

### Extend the EML language

1. Edit `language/appwithai-language.json` (source of truth)
2. Update `language/grammar/appwithai.ebnf` and the relevant `language/spec/*.md`
3. Update the parser (`language/cli/src/parser.ts`, `packages/web/src/lib/mermaid-flowchart-parser.ts`, `packages/generator/src/rules/flowchart-parser.ts`)
4. Update `language/composer.ts` if the document shape changes, and `language/rag.ts` if the chunking does
5. If you added a diagnostic, put it in the right code band; if you made it
   auto-fixable, add it to **all three** of `AUTO_FIXABLE_CODES` in `checker.ts`,
   the fixer's dispatch table, and `diagnostics.autoFixable` in the JSON
6. Add an example to `language/examples/` and run `bun language/checker.ts` over it
7. `bun run type-check:language` — the root `type-check` does not cover `language/`

### Add a core subpath export
1. Create `packages/core/src/<dir>/index.ts`
2. Add `exports` entry **and** `bun build` step in `packages/core/package.json`
3. Add alias to root `tsconfig.json` and Vite/Vitest configs

### Run the full stack locally
```bash
./scripts/start-llm.sh   # model on :8000
bun run dev              # web on :3000
bun run dev:mastra       # Mastra on :4111
```

---

## Git Workflow

1. Feature branch from `main`
2. Run `bun run type-check` and `bun run lint` before pushing
3. If you touched `packages/generator/templates/`, generate an app and build it
4. Target `main` for PRs
