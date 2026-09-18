# Security Findings

A full-application security review of the two products that make up this system:

| | Repository |
|---|---|
| **APPWITHAI** — ERD designer and full-stack generator | `businessappwithai/app-with-ai-tanstack` |
| **Enterprise Reporting** — multi-datasource analytics platform | `businessappwithai/enterprise_reporting_tanstack` |

This document is carried in both repositories because several findings only make
sense across the boundary: the generator writes applications that the reporting
platform is composed beside, and in two places one repository already contains
the correct implementation of a check the other is missing.

**Scope.** Not a review of pending changes — the whole application surface of
both products, as of the commits named below: 70 API routes, 13 server-function
modules, the session and RBAC layers, every path that executes SQL, the
encryption and credential handling, and the generated-application templates.

| Repository | Reviewed at |
|---|---|
| `app-with-ai-tanstack` | `030ff64` |
| `enterprise_reporting_tanstack` | `8576481` |

Findings are ordered by severity. `ERS` marks the reporting platform, `AWA` the
generator, and `AWA→generated` marks a defect in a template, which is inherited
by **every application the generator has produced**.

---

## Critical

### C1 · Any authenticated user can run arbitrary SQL, including writes, on any data source
`ERS` · `src/routes/api/queries.ts` · `src/routes/api/queries/$id/execute.ts`

Two routes compose into a complete bypass of every control the platform has:

- `POST /api/queries` (`queries.ts:115`) accepts `sqlContent` and
  `dataSourceId` from the request body. There is **no permission check on the
  data source** and **no read-only check on the SQL**; the content is stored
  verbatim (`sql_content: body.sqlContent`).
- `POST /api/queries/:id/execute` (`execute.ts:64`) executes any saved query by
  id. There is **no ownership check**, **no `validateQueryAccess`**, and **no
  `isReadOnlyQuery`**.

So: save `DELETE FROM users`, then execute it. This is a single statement, so it
does not depend on any driver behaviour or parser weakness — it is simply an
unvalidated write path. The lowest-privileged account on the platform gets full
read and write access to every connected database.

**Fix.** Validate on the way in *and* on the way out: refuse non-read-only SQL
when a query is saved, and gate execution on `validateQueryAccess` against the
caller, exactly as `/api/sql/execute` already does.

### C2 · The data-source RBAC layer fails open and is trivially bypassed
`ERS` · `src/lib/permissions/query-access-validator.ts:47` · `src/lib/sql/antlr-validator.ts:325`

`validateQueryAccess` returns `{ allowed: true }` whenever the extracted table
list is empty:

```ts
if (tables.length === 0) {
  // Subquery or complex query without direct tables
  // Trust it for now (more complex parsing needed)
  return { allowed: true };
}
```

The extractor it trusts is a regular expression, despite living in a file named
`antlr-validator.ts`:

```ts
/(?:FROM|JOIN)\s+([`"]?[a-zA-Z_][a-zA-Z0-9_.$]*[`"]?)(?:\s|$|,|JOIN|WHERE|GROUP|ORDER|LIMIT)/gi
```

Anything it fails to match produces an empty list, and an empty list means
"allowed". Verified against the real expression:

| Query | Tables found | Outcome |
|---|---|---|
| `SELECT * FROM hr_salaries` | `["hr_salaries"]` | checked |
| `SELECT * FROM(hr_salaries)` | `[]` | **check skipped** |
| `SELECT * FROM/**/hr_salaries` | `[]` | **check skipped** |
| `SELECT * FROM (SELECT * FROM hr_salaries) x` | `[]` | **check skipped** |
| `WITH a AS (SELECT * FROM hr_salaries) SELECT * FROM a` | `["a"]` | wrong table checked |

Removing a single space defeats the whole of `ds_entity_permissions` on
`/api/sql/execute`. The CTE row is worth noting separately: the check runs, but
against the alias rather than the table the alias reads, so it reports on
something that does not exist.

**Fix.** An unparseable query must **deny**, never allow — that inversion is the
finding, and it holds regardless of how good the parser is. Then replace the
regex with a real parse: `node-sql-parser` is already a dependency and already
used in `src/lib/sql/validator.ts`, and its `tableList` resolves CTEs.

### C3 · `isReadOnlyQuery` is a prefix test, so a `SELECT` can carry a write
`ERS` · `src/lib/sql/validator.ts:246`

The function strips leading comments and then asks only whether the remaining
text *starts with* `SELECT`, `WITH`, `EXPLAIN`, `SHOW` or `DESCRIBE`. Nothing
examines the rest of the string, so `SELECT 1 LIMIT 1; DROP TABLE users` passes.

Whether both statements reach the database depends on the protocol: Kysely's
`sql.raw()` compiles with an empty parameter array, and node-postgres uses the
simple query protocol when no parameters are bound, which permits multiple
statements per round trip. That is worth confirming against the pinned
`pg ^8.19.0` before relying on it either way — but C1 already provides arbitrary
writes without it, so this is a second door into the same room rather than the
only one.

**Fix.** This repository's sibling already solves it correctly.
`packages/generator/src/reports/index.ts:82` in `app-with-ai-tanstack` carries a
quote-aware `hasStatementBreak()` that tracks quoting rather than searching for
the byte, and allows a single trailing semicolon. Port that function; do not
write a third implementation.

### C4 · Privilege escalation through an unguarded admin route
`ERS` · `src/routes/api/admin/permissions.ts:53`

`POST /api/admin/permissions` inserts into `resource_permissions` behind a
session check alone — there is no administrator check. Any authenticated user
grants themselves any permission level on any resource. `DELETE` on the same
route (line 106) removes anyone else's.

This is specifically an inconsistency rather than an oversight everywhere:
`src/routes/api/admin/logs-permissions.ts:27` *does* call `isAdmin()`, and every
equivalent operation in `src/server-fns/admin.ts` is permission-checked. The
three REST routes under `/api/admin` are unguarded duplicates of guarded server
functions.

**Fix.** `isAdmin()` on every handler under `/api/admin`, matching
`logs-permissions.ts`.

### C5 · Every generated application ships a role mass-assignment hole
`AWA→generated` · `packages/generator/templates/tanstack-start-nestjs/backend/src/lib/better-auth.ts.hbs:107`

The generated Better Auth configuration declares `role` as an additional field
with a default of `'user'` and **without `input: false`**:

```ts
user: {
  additionalFields: {
    role:      { type: 'string', required: false, defaultValue: 'user' },
    sysUserId: { type: 'string', required: false },
  },
},
```

Better Auth accepts input-enabled additional fields from the client on
`updateUser`. `main.ts.hbs:320` forwards the entire `/api/auth/*` surface to the
library and blocks only `/sign-up`, so `POST /api/auth/update-user` is reachable
by any signed-in user.

`role` is load-bearing for authorization: `roles.guard.ts.hbs:55` folds
`user.role` into the caller's role set, and `dictionary-write.guard.ts.hbs:68`
does the same. So `{"role":"admin"}` is an administrator.

The reporting platform gets this right — `src/lib/auth/better-auth.ts` marks
`is_active` `input: false`. The template does not.

**Fix.** Add `input: false` to `role` and `sysUserId`. One line in one template
closes this in every application the generator has produced.

---

## High

### H1 · `GET /api/admin/users` returns every user record, password hashes included
`ERS` · `src/routes/api/admin/users.ts:22`

`selectAll()` over `users` behind a session check only. `users.password_hash` is
a real column (`src/lib/db/kysely-db.ts:61`), so any authenticated user can
retrieve every account's bcrypt hash and take them offline.

**Fix.** Administrator check, and an explicit column list that excludes
`password_hash` — a `selectAll()` on a credential-bearing table is a standing
hazard even behind a correct guard.

### H2 · Report, chart and export data paths have no authorization
`ERS` · `src/routes/api/reports/$id/data.ts` · `reports/$id/export.ts` · `charts/$id/data.ts`

Each resolves a definition by id, loads its saved query, and executes it behind a
session check only. Any signed-in user reads any report's data by guessing or
enumerating an id, whatever `ds_entity_permissions` or `resource_permissions`
say.

Only two of roughly six paths that execute SQL call `validateQueryAccess` —
`/api/sql/execute` and `src/server-fns/nl-query.ts`. `CLAUDE.md` states that
"every path that executes SQL gates on `validateQueryAccess`", and that is
currently not true.

**Fix.** Gate all of them, and correct the claim in `CLAUDE.md` so the document
stops asserting a property the code does not have.

### H3 · Default credentials, and nothing throttles guessing them
`ERS` · `src/lib/db/bootstrap.ts` · `AWA→generated` · `main.ts.hbs:53,57`

- `bootstrap.ts:754` seeds `admin@admin.com` / `admin` when the user table is
  empty.
- `bootstrap.ts:~805` inserts `nlquery@nlquery.com` / `nlquery` on **every**
  boot, with `onConflict` on the id alone — so an operator who deletes the
  account gets it back on the next restart.
- Generated applications default to `admin@admin.com` / `admin123`.

A search for rate limiting across the platform returns nothing, and Better
Auth's own `rateLimit` option is not configured, so none of these is throttled.
Neither is there a lockout or a forced password change.

**Fix.** Enable Better Auth's rate limiting on the credential endpoints; require
the bootstrap password to come from the environment; and force a change on first
sign-in rather than seeding a known one.

### H4 · Generated applications write the administrator password to the log
`AWA→generated` · `packages/generator/templates/tanstack-start-nestjs/backend/src/main.ts.hbs:80`

```ts
logger.log(`Admin user created: ${adminEmail} (password: ${adminPassword})`);
```

On first boot, in plaintext, into whatever collects the process's stdout. This is
the same class of defect already fixed once in this system — the
`[ENCRYPTION DEBUG]` lines removed from the reporting platform's
`encryption.ts`, which printed decrypted connection configs — and the reasoning
recorded there applies unchanged: a credential written to a log is collected,
shipped and retained under far weaker access control than the row it came from.

**Fix.** Log that an administrator was created. Never the password.

### H5 · `ENCRYPTION_KEY` silently falls back to a key that is in the repository
`ERS` · `src/lib/security/encryption.ts:38`

With the variable unset, `getKey()` warns and then returns
`scryptSync("default-dev-key-change-in-production", "salt", 32)`. A deployment
that misses the variable encrypts every stored data-source credential under a key
that anyone reading this repository has. The warning is one line in a boot log
that nothing fails on.

The same file also derives non-hex keys with a hard-coded salt of `"salt"`,
which makes a passphrase-derived key identical across every installation that
chose the same passphrase.

**Fix.** Refuse to boot without the key, exactly as `AUTH_SECRET` already does
(`src/lib/auth/better-auth.ts:37`). A per-installation random salt for the
passphrase path, stored beside the ciphertext.

---

## Medium

### M1 · Four endpoints are reachable with no authentication at all
`ERS` · `src/routes/api/copilotkit/$.ts` · `api/voice/{transcribe,synthesize,ws}.ts`

- `/api/copilotkit` is an open proxy to the configured LLM, using the server's
  own API key. Anyone who can reach the origin can spend the budget and address
  the model directly.
- `/api/voice/transcribe` accepts an arbitrary file upload from an
  unauthenticated caller, writes it to disk, and runs `ffmpeg` over it.

The `Bun.spawn` call itself is sound — an argv array, not a shell, with a
UUID-derived path — so there is no command injection here. The exposure is
resource consumption and handing a media parser untrusted input.

**Fix.** Require a session on all four.

### M2 · Server-side request forgery via the connection tester
`ERS` · `src/routes/api/data-sources/test.ts`

Any authenticated user causes the server to open a connection to an arbitrary
host and port. There is no permission check, no allowlist, and no block on
loopback, link-local or private ranges, and the distinct error messages make it a
usable internal port scanner.

**Fix.** Require the permission that creating a data source requires, and refuse
private and link-local destinations unless deliberately configured otherwise.

### M3 · The generated entity guard fails open on error
`AWA→generated` · `packages/generator/templates/.../guards/entity-access.guard.ts.hbs:95,120`

Two paths return `true` — allow — on failure: `if (!this.db) return true`, and a
`catch` around the `sys_operation_access` lookup that treats a failed query as
"no rules". A transient database error silently disables entity authorization for
that request.

The "open unless closed" default for a table with no rules is a defensible design
choice and is documented as one: it is what makes `%%rbac` additive. The *error*
paths are a different thing, and should not inherit that reasoning.

**Fix.** Deny on lookup failure. A missing optional dependency should fail at
startup rather than per request.

### M4 · Stored XSS in the email template preview
`ERS` · `src/components/email/template-editor.tsx:423`

`preview.preview` is rendered through `dangerouslySetInnerHTML` with no
sanitisation, and that HTML is assembled from **data-source row values**. A row
containing markup executes in the previewing administrator's session.

`src/components/help/HelpPanel.tsx:84` does the same job correctly, through
`DOMPurify.sanitize`.

**Fix.** Sanitise, or render the preview in a sandboxed iframe — which is closer
to what an email client actually does.

---

## Low

- **Record-link scheme check misses the backslash form.**
  `src/lib/reporting/record-link.ts:82` rejects `//host` but accepts `/\host`,
  which browsers normalise to `//host`: `new URL("/\\evil.com/1", …)` resolves to
  `https://evil.com/1`, verified. The rest of this file is careful, deliberate
  work — an allowlist rather than a denylist, re-validated on read as well as on
  save — and this is one spelling it did not anticipate.
- **`trustedOrigins` hard-codes localhost in production** in both products
  (`ERS src/lib/auth/better-auth.ts:63`, `AWA→generated better-auth.ts.hbs:66`).
- **bcrypt cost 10** in both. 12 or higher is the current recommendation.
- **`verifyPassword` compares with `===`** (`encryption.ts:113`), which is not
  constant-time. It is unreferenced — deleting it is better than fixing it.
- **Role folding collides.** `entity-access.guard.ts.hbs:159` lowercases *and*
  strips all separators, so `data_analyst` and `dataanalyst` become one role.
- **The sign-up block is a substring test** on a raw URL
  (`main.ts.hbs:332`: `request.url.includes('/sign-up')`). Match the parsed
  pathname instead.
- **Share routes leak internal columns.** `/share/*` correctly gates on
  `is_public`, but `selectAll()` hands anonymous viewers every column of the
  definition, including the SQL behind it.

---

## What is worth fixing first

1. **C1** — add a read-only check on save and `validateQueryAccess` on execute.
2. **C2** — make an empty table list deny, then parse properly.
3. **C3** — port `hasStatementBreak()` from the generator.
4. **C4, H1** — `isAdmin()` on `/api/admin/*`, and stop selecting `password_hash`.
5. **C5** — `input: false` on the generated `role` field.

The first four are each a few lines, and all four are in the reporting platform.
The fifth is one line in one template and repairs every application the generator
has already written.

## The pattern underneath these

Three observations that explain why the findings cluster the way they do, and
which matter more than any individual line above.

**The authorization checks that exist are good; the problem is that they are not
reached.** `validateQueryAccess`, `checkEntityAccess` and the record-link
allowlist are well-designed, and two of them carry long comments explaining
exactly which bug they were written to prevent. What is missing is not the
control but its application: half the SQL execution paths never call it, and the
one that does calls it through an extractor that returns nothing.

**Several checks fail open.** An empty table list allows, a failed permission
lookup allows, a missing database allows. Each is individually defensible and
some are documented as deliberate, but the accumulated effect is that errors
grant access. The default for an authorization decision that cannot be made
should be refusal.

**No test drives a route as a low-privileged user.** The reporting platform's
four unit-test files are not run by CI at all, and three of their assertions
currently fail. Nothing in either repository's CI exercises authorization. Every
finding above would have been caught by a test that signed in as an ordinary
account and called an endpoint it should not reach — which is precisely the shape
of the suite `app-with-ai-tanstack` already runs against the modelling tool
(`tests/e2e/02-project-authorization`, `02b-unauthenticated-surface`). The
pattern exists in this system; it has not been applied to either of these
surfaces.
