# QA report — ERDwithAI generator + generated Enterprise CRM

**Date:** 2026-08-17
**Branch:** `claude/enterprise-crm-mmd-diagram-rko0x9`
**Targets:** generator app at `localhost:3000`, generated CRM at `localhost:4000` (API `:4001`)
**Model under test:** `language/examples/crm.eml.mmd` — 17 entities, 8 rules, 5 state machines, 7 hook workflows, 5 sagas
**Screenshots:** `pics/` (32 files)
**Tier:** Standard (critical + high + medium fixed)

## Summary

| | Count |
|---|---|
| Issues found | 7 |
| Fixed and verified | 4 |
| Feature added | 1 |
| Deferred / documented | 3 |

Health: the generated application starts, migrates, seeds and serves all 17
entities. The model's rules, state machines and sagas all reach the running
app. Two of the four fixed bugs made core paths unusable — a new developer
could not log into the generator app at all, and no record in any generated
application could change its status.

## Fixed

### ISSUE-001 — web dev server never read the root `.env` (high) — `66c321c`

`READEME.md` says `cp .env.example .env` at the repo root and that is the only
env template in the tree. `bun run dev` is `bun --filter @erdwithai/web dev`,
which runs `vite dev` with cwd `packages/web`; Bun's automatic .env loading is
per-process at cwd, so it looked for `packages/web/.env` (absent) and never
passed the root file down. Confirmed against the running process:
`/proc/<vite pid>/environ` had no `DATABASE_URL`.

Every handler touching the database ran with no connection settings. Registering
the first user returned 500 `no PostgreSQL user name specified in startup
packet` — the login page a new developer cannot get past.

**Fix:** `vite.config.ts` loads the root file with Vite's `loadEnv` into
`process.env`. Nothing reaches `import.meta.env`, so a secret cannot be bundled
into the client; a variable already set in the real environment wins.

**Verified:** `POST /api/auth/register` 500 → 200 `{"pending":true,…}`.

### ISSUE-002 — Validate button reported nothing, ever (high) — `3c51d77`

`handleValidate()` rendered the diagram through mermaid and wrote the outcome to
`_validationErrors`. The underscore is the tell: the state was never read
anywhere, so it existed only to silence the unused-variable lint. Validating a
17-entity model produced no toast, no banner, no network call; validating a
diagram that does not parse produced the same nothing, swallowing the one
result that matters.

**Fix:** the outcome renders above the editor — green with the entity count when
it parses, red with mermaid's own parse error, line and caret when it does not.

**Verified:** `Diagram is valid — 17 entities parsed.` /
`Parse error on line 2: … Expecting 'BLOCK_STOP', got '{'`.

### ISSUE-003 — model created rows that violated NOT NULL (high, in the model) — `dd736f4`

The `LeadConversion` saga inserts an Account, but `account_number` was `UK`
without `OPTIONAL`, and no caller can supply a number the application mints.
The rule fired, the decision table matched, and the insert failed with
`null value in column "account_number" of relation "bus_account" violates
not-null constraint` — the whole conversion rolled back.

**Fix (model):** `account_number`, `quote_number`, `contract_number` and
`case_number` are `UK OPTIONAL`. They are minted by `beforeCreate` hooks, and
Postgres allows repeated NULLs under a unique index, so nothing collides in the
window before the hook stamps a value.

### ISSUE-004 — every update reset the record to its initial state (critical) — `dd736f4`

`renderWorkflowDefinitionsSeed` emitted the same state-entry BPMN for the create
*and* the update definition, so `<table>-on-update-workflow` wrote the machine's
**initial** state on every update.

Setting a lead to `qualified` through the UI left it `new`. The
`LeadConversion` saga then fired correctly, created three rows, set the lead to
`converted` — and the reset overwrote that too, so the record looked untouched
while an account, a contact and an opportunity had been created against it.
Status was read-only in any generated application whose model declares a state
machine.

**Fix:** on update the definition is a pass-through. The run is still created
and visible; nothing decides the state on the record's behalf.

**Verified:** lead reads `converted`; accounts, contacts and opportunities each
4 → 5.

## Added

### Help on the Application Dictionary screens — `fdc43e5`

Every business window carries help generated from the model. The six dictionary
screens — Business Rules, Workflow Designer, Audit Log, Table and Column,
Window/Tab/Field, Role — had none, and `WindowHelpDialog` hid its own button
rather than open empty, so there was no way in. The screens explaining how the
application is assembled were the only ones that could not explain themselves.

Help text now lives in `sys_window.help` (seeded, backfilled only when null, so
an administrator's edit survives re-seeding); `getWindowHelp` falls back from
`sys_table` to `sys_window.name`; the dialog takes a `windowName`. Also drops a
hardcoded `clinic-app` from the Business Rules footer.

## Deferred

### ISSUE-005 — `%%field … enum:` does not reach the generated UI (medium)

The model declares 26 enums and binds 28 fields to them. Generated forms render
those fields as free-text boxes, so `status` accepts any string the state
machine cannot act on. This matches the language's own conformance table
(`%%field` is listed as extended, not shipped), so it is a feature gap rather
than a regression — but it is the largest gap between what the model says and
what the application enforces.

### ISSUE-006 — "View" on a model workflow lands on an empty page (medium)

From Workflow Designer, View navigates to `/admin/automations`, which reports
"None yet" because model-declared workflows are not automations. The spec says
model workflows open read-only in the builder; today they do not.

### ISSUE-007 — reference columns render as raw UUIDs in dictionary grids (low)

Window → Tab shows `Table` as `c3bb17e9-a4dd-43c0-…` instead of the table's
name. Business entity grids resolve their lookups correctly, so this is scoped
to the dictionary's own screens.

Also noted, not filed: `GET /api/me/permissions` 401s once on load and succeeds
on retry, logging "Session expired. Please sign in again." to the console
before recovering.

## What the model proved

The end-to-end chain runs in the generated application, driven entirely by
`crm.eml.mmd`:

1. `leadQualification` (a `%%rule` on Lead, `beforeUpdate`) evaluates on the write.
2. Its `%%action convertQualifiedLead trigger-workflow when: status == "qualified"` fires.
3. `LeadConversion` (a `kind: saga`) runs: a decision table publishes
   `accountTier=strategic`, `openingAmount=250000` for a score of 88.
4. Three `CreateEntity` steps insert the Account, the Contact (wired to the new
   account) and the Opportunity (wired to both).
5. `UpdateEntity` sets the lead to `converted`, and a final step reaches back
   into the account it created via `targetSource` to stamp its tier.

39 workflow definitions and 25 rule definitions seeded, all marked
`source: model`; the dashboard renders the 7 `%%category` groups with the
descriptions written in the model.
