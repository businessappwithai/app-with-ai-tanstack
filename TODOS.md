# TODOs - HMS OpenUI5/OData V4 Enhancement

Work deferred from the Better Auth + Trigger.dev + GoRules enhancement plan.

---

## 1. Row-Level Security (RLS)

**What:** Add `created_by`/`updated_by` filtering to OData queries so users can only access their own records.

**Why:** Current RBAC checks entity type permissions (can User X read Patients?) but not record ownership (can User X read THIS patient?). This allows horizontal access - Alice can read Bob's patients.

**Pros:**
- Closes security gap (horizontal access prevention)
- Industry standard for multi-user systems
- Aligns with Better Auth user model

**Cons:**
- 4h effort (adds `WHERE created_by = :userId` to all OData queries)
- Impacts every query (small performance overhead)
- Requires sys_access schema redesign (add row_level_security flag)

**Context:**
- Current state: BaseEntityController has no ownership filtering
- Implementation: Add `injectOwnershipFilter()` method to BaseEntityController
- Use `created_by` field (added in migration 007)
- Only apply to non-admin users (check sys_user_role)

**Depends on:**
- Phase 1 migrations (created_by fields must exist)
- Better Auth integration (user.id available in req.user)

**Blocked by:** None

---

## 2. Rate Limiting on Auth Endpoints

**What:** Add `express-rate-limit` middleware to `/api/auth/*` endpoints (10 attempts per minute per IP address).

**Why:** No protection against brute force login attacks. Attacker can try unlimited passwords.

**Pros:**
- Industry standard security practice
- Simple to implement (middleware config)
- Prevents credential stuffing attacks

**Cons:**
- 2h effort (minimal)
- May block legitimate users on shared NAT (corporate networks)

**Context:**
- Use `express-rate-limit` package (already compatible with NestJS)
- Config: 10 attempts/min for `/api/auth/signin`, 3 attempts/min for `/api/auth/signup`
- Store in Redis for distributed rate limiting (or in-memory for single-server)

**Depends on:** Phase 2 (Better Auth integration complete)

**Blocked by:** None

---

## 3. JDM Editor Self-Hosting

**What:** Install `@gorules/jdm-editor` via npm and serve from `/static/jdm-editor.js` instead of loading from CDN.

**Why:** CDN dependency creates supply chain risk. If CDN is compromised, attacker can inject malicious JavaScript into admin interface (RCE).

**Pros:**
- Removes external dependency
- Better security (no third-party code at runtime)
- Offline support (editor works without internet)

**Cons:**
- 3h effort (webpack config for React build)
- Adds ~2MB to bundle size
- Must manually upgrade editor version (no auto-update from CDN)

**Context:**
- Current: `<script src="https://cdn.jsdelivr.net/npm/@gorules/jdm-editor"></script>`
- Target: `<script src="/static/jdm-editor.js"></script>`
- Requires webpack config to bundle React component
- May conflict with OpenUI5's own build system (test carefully)

**Depends on:** Phase 5 (JDM Editor iframe wrapper exists)

**Blocked by:** None

---

## 4. Dead Letter Queue for Failed Workflows

**What:** Configure Trigger.dev dead letter queue to persist workflows that fail after 3 retries. Surface in AdminWorkflows view.

**Why:** Current behavior: workflow retries 3x, then disappears. Admins see error_details but can't retry from UI. DLQ ensures failed workflows are never lost.

**Pros:**
- Production reliability (no silent data loss)
- Trigger.dev built-in feature (minimal implementation)
- Enables bulk retry (process all DLQ items at once)

**Cons:**
- 2h effort (config + UI updates)
- May require Trigger.dev plan upgrade (DLQ not available in free tier)
- DLQ storage costs if many failures

**Context:**
- Trigger.dev DLQ config: `deadLetterQueue: { enabled: true }`
- AdminWorkflows view: add "Failed (DLQ)" filter
- Show count: "12 workflows in dead letter queue"
- Retry button: re-queue from DLQ

**Depends on:**
- Phase 3 (Trigger.dev workflow system complete)
- Trigger.dev paid plan (verify DLQ availability)

**Blocked by:** Trigger.dev plan limits (check with Trigger.dev account)

---

## Deferred (Not TODOs - Explicitly Rejected)

These items were considered but explicitly rejected:

- **Audit logging** - Not required for MVP, adds 3h + storage costs
- **Multi-tenancy** - HMS is single-hospital system, no use case
- **Workflow scheduling** - No time-based triggers identified
- **Rule versioning** - Admin can duplicate rules manually
- **Bulk operations** - OData $batch is complex, unclear use case

---

## Found by /qa on `claude/drug-discovery-mmd-qa-nc8d0b`, 2026-07-30 — RESOLVED

All four deferred findings fixed on main, 2026-07-30:

- **Database consistency** — Init panel placeholder/default changed to `postgresql://…:5432/…`; helper text updated; `.env.example` switched to PostgreSQL vars (`PGHOST`, `PGPORT`, etc.); `database.service.ts` header comment updated from MariaDB to PostgreSQL.
- **EML `%%rule` ingestion** — `extractRuleFlowcharts()` added to `rules-design.tsx`; on first load the editor now seeds from the first `%%rule` flowchart in `project.erdCode` instead of the hardcoded "Order Discount" placeholder.
- **`(round)` node shape** — `NodeShape` union extended with `"round"`; `parseNodeDef` branch added for `^\((.+?)\)` in `mermaid-flowchart-parser.ts`.
- **Console pipe amplification** — `routes/api/db/reverse-engineer.ts` and `generate-schema.ts` migrated from `@tanstack/start/api` (deprecated, emits `console.warn` on every load) to `@tanstack/start-api-routes` (the underlying package, no warning); `@tanstack/start-api-routes` added as an explicit web dependency.
