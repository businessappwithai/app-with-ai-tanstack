# CLAUDE.md

## Package Manager Rule

**CRITICAL**: Always use `bun` for all package management and script execution. NEVER use `npm` or `pnpm`.

- `bun install`, `bun run <script>`, `bun --filter @package build`, `bunx` instead of `npx`
- Generated projects must also use bun exclusively (exception: `erdwithai-wasm` generated apps use `npm` — that's intentional)

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

# ERDwithAI

**Project**: AI-powered ERD design + full-stack code generation
**Version**: 5.1.1 | **Runtime**: Bun.js >= 1.3.14

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
| `bun run build:wasm-browser` | Rebuild `html/assets/erdwithai-wasm.js` |
| `bun run build:language-tools` | Rebuild `html/checker.js` + `html/fixer.js` |
| `bun run seed:admin -- --email you@example.com` | Run migrations + make admin |
| `bun run clean` | Remove all `node_modules` and `dist` |

**Run a single test file:**
```bash
bun --filter @erdwithai/web test -- path/to/file.spec.ts
bunx playwright test tests/e2e/specific.e2e.spec.ts
```

### What `type-check` does NOT cover

| Not checked | How to check |
|---|---|
| `language/**` | `bun run type-check:language` |
| `*.test.ts`, `*.spec.ts` | `bun run test` |
| `packages/generator/templates/**` | Generate an app and build it |

### Known-broken scripts

- `bun run migrate` — the file doesn't exist. Real migrations: `runMigrations()` from `@erdwithai/core/services`
- Root `vitest.config.ts` — references missing `./test/setup.ts`. Use `bun run test` (runs `packages/web/vitest.config.ts`)
- `packages/web` lint script uses eslint (not a dep) — lint with Biome from root
- `test:app`, `test:e2e`, `test:generator`, `test:complete` — reference non-existent files

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

### Package Aliases

| Alias | Resolves to |
|-------|-------------|
| `@erdwithai/core` | `packages/core/src` |
| `@erdwithai/generator` | `packages/generator/src` |
| `@erdwithai/ai` | `packages/ai/src` |
| `@erdwithai/web` | `packages/web/src` |
| `@/*` or `#/*` | `packages/web/src/*` |

Adding a new subdir to core requires an `exports` entry **and** a `bun build` step in `packages/core/package.json`.

---

## Key Files

| File | Purpose |
|------|---------|
| `packages/ai/src/config.ts` | ⭐ Central AI model + embedding config |
| `packages/core/src/config/db.config.ts` | ⭐ Sole DB connection site |
| `packages/core/src/services/database.service.ts` | Kysely domain helpers |
| `packages/generator/src/pipeline/generate-application.ts` | ⭐ The ONE generation path |
| `packages/generator/src/pipeline/parse-model.ts` | Model → parsed model (pure/browser-safe) |
| `packages/generator/src/generators/ports.ts` | Generated-app default ports (4000/4001) |
| `packages/generator/templates/common/design-tokens.json` | ⭐ Colour palette (single source) |
| `packages/generator/templates/wasm/` | ⭐ Standalone browser runtime (run `build:wasm-runtime` after editing) |
| `packages/generator/src/generators/wasm/overlay.ts` | ⭐ WASM overlay footprint (CI asserts it) |
| `packages/generator/src/rbac/index.ts` | `%%rbac` → operation + transition access rules |
| `packages/web/src/types/project.ts` | ⭐ Wizard step vocabulary (STEP_ORDER, STEP_LABELS, STEP_ROUTES) |
| `packages/web/src/lib/project-access.ts` | ⭐ Project authorization |
| `packages/web/src/lib/automation/model.ts` | Automation model + serializer |
| `packages/web/vite.config.ts` | Vite 8 config, root-`.env` loading, `start-api-routes` shim |
| `language/erdwithai-language.json` | ⭐ EML canonical definition (v1.2.0) |
| `language/composer.ts` | ⭐ The only writer of complete EML documents |
| `language/checker.ts` / `language/fixer.ts` | EML validator / auto-fixer |

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
        const { getDatabase } = await import("@erdwithai/core/services"); // lazy import!
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

Migrations: `database/migrations/001–010`, applied via `runMigrations()` from `@erdwithai/core/services`.

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

**Mastra:** `MASTRA_DATABASE_URL` (default `file:./erdwithai-mastra.db`), `MASTRA_PORT` (4111)

`ANTHROPIC_API_KEY` — **no longer used**.

---

## EML Language (`language/`)

EML is a Mermaid-based language for ERD + business rules + workflows in one `.eml.mmd` file.
`language/erdwithai-language.json` is the **single source of truth** (v1.2.0).

```bash
bun language/checker.ts examples/crm.eml.mmd   # validates, writes .error file
bun language/fixer.ts   examples/crm.eml.mmd.error  # auto-fixes EML001/114/117/421/422
```

Diagnostic code bands: `001-099` doc level, `100-199` entities/relations/ERD directives, `200-299` hooks/rules/workflows, `300-399` rule flowcharts, `400-449` workflow sections, `500-599` cross-section.

When changing language semantics: edit `erdwithai-language.json` first, then spec docs, grammar, parser, composer, rag.

---

## Testing

### Unit (Vitest)
Effective config: `packages/web/vitest.config.ts` (covers `../core/src`, `../generator/src`, `../ai/src` too).

```bash
bun run test
bun --filter @erdwithai/web test -- path/to/file.spec.ts
```

### E2E (Playwright)
`testDir: ./tests/e2e`, Chromium only, base URL `http://localhost:5000`, `workers: 1`.

Note: `bun run dev` serves on **3000**; Playwright targets **5000**. Use `bun run test:e2e:server`.

### Templates
`bun run type-check` does NOT check templates. Generate an app and build it to catch template errors.

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

### Add a new AI agent
1. Create `packages/ai/src/agents/<name>-agent.ts` importing `mastraModelConfig` from `../config`
2. Re-export from `packages/ai/src/agents/index.ts`

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
