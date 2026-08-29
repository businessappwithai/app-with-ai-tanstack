# QA Report — hospital-management (generator + generated app, CLI)

**Date:** 2026-08-29
**Target:** generator (`packages/generator`) + a fresh `tanstackjs-nestjs` app generated from it
**Source model:** `examples/hospital-management-system.mmd` — 28 entities, 47 relationships,
12 `%%workflow` sections (9 state machines + 3 sagas), 8 `%%rule` sections, 9 `%%action`s
**Branch:** `claude/gstack-qa-skill-k55fji`
**Mode:** CLI only — no browser. Editors were exercised through the HTTP endpoints
their screens call, plus a frontend type-check.
**Focus:** do workflows and the rules editor work, in the generator and in the generated app.

All fixes land in `packages/generator/templates` and `packages/generator/src`, so every
generated app picks them up — not just this one output.

---

## Summary

| Severity | Found | Fixed | Deferred |
|----------|------:|------:|---------:|
| High     | 1     | 1     | 0        |
| Medium   | 1     | 1     | 0        |
| Low      | 2     | 1     | 1        |
| **Total**| **4** | **3** | **1**    |

The workflow and rules machinery itself is sound. All 37 state-machine edges the model
draws reach the database, topology enforcement refuses an undrawn move even for the
master role, all 8 authored rules compile to GoRules JDM with their own messages and
fire correctly, and the generated app's 68 E2E suites pass. What was broken was the
**workflow editor's activate/deactivate control**, which failed twice over, and the
generated frontend's **type-check**, which never passed on a fresh install.

---

## Method

1. Generated a fresh app from the model through the CLI:
   `bun packages/generator/src/cli/generate.ts generate -i examples/hospital-management-system.mmd -o <dir> -n hospital-management --force --no-setup`
2. `bun install` + `bun run db:setup` against a local PostgreSQL 16, using the
   generated `backend/.env.example` unedited.
3. Booted the generated NestJS backend on `:4001` and drove the endpoints the admin
   rules editor and workflow editor call, signed in as the seeded administrator.
4. Ran the generated app's own suites: `node run.ts --only workflow`, `--only rules`,
   then the full `--fast` run.
5. Ran the repo's `bun run type-check` and the modelling tool's rules/workflow unit
   tests (`src/lib/automation`, `src/components/automation`, `src/lib/workflow`, `src/lib/eml`).
6. Each fix was applied to the generator, then verified by regenerating the app from
   scratch and re-running the checks.

---

## What was verified working

**Model → database, workflows.** The 9 state machines compile to exactly 37 rows in
`sys_workflow_transitions`, matching the diagrams edge for edge:

| Entity | Edges |
|--------|------:|
| `bus_appointment` | 7 |
| `bus_invoice` | 6 |
| `bus_encounter`, `bus_prescription`, `bus_lab_order`, `bus_imaging_order` | 4 each |
| `bus_admission`, `bus_payment` | 3 each |
| `bus_stock_transaction` | 2 |

**Topology enforcement, master role included.** An appointment in `requested` moved
straight to `completed` — an edge the diagram never drew — is refused for the
administrator:

```
403 Invalid transition: 'bus_appointment' has no edge from 'requested' to 'completed'.
    Valid transitions from 'requested': confirmed, cancelled.
```

The legal `requested → confirmed` move on the same record succeeds. This is the
invariant `CLAUDE.md` calls out, and it holds.

**`GET /api/workflows/transitions`** returns the right edges filtered by `table` and
`from`, in both the flat `data` and grouped `byTable` shapes.

**Rules, model → JDM → enforcement.** All 8 `%%rule` sections reach
`sys_rule_definitions` as authored rules alongside the 28 field-derived validation
graphs, with the correct operations (`CREATE`/`UPDATE`) and the model's own messages.
All 3 `trigger-workflow` actions carry their workflow name
(`AppointmentToEncounter`, `AdmissionBedAllocation`, `InvoicePaymentSettlement`).

**Rules editor round-trip.** The endpoints `admin/rules/$id.edit.tsx` calls all work:
`GET /api/rules?entityName=`, `GET /api/rules/:id`, `PUT /api/rules/:id` (version bumps
1 → 2), and the dry-run `POST /api/rules/evaluate`. An edit made through `PUT` is
visible to the very next evaluation. Evaluating an appointment with `status: "checked_in"`
returns the `trigger-workflow` action with `workflowName: "AppointmentToEncounter"`;
evaluating one missing `scheduled_at` returns the authored `validation-error` with the
model's message, "Appointment date and time are required".

**Saga workflows.** All 3 seed as BPMN with their steps and field maps intact, and
`parseBpmn` in the editor has well-formed XML to read.

**Suites.** 68/68 generated E2E suites pass against the fixed app, including
`06-rules-workflow`, `06b-workflow-transitions`, `07-workflow-random` and
`09-workflow-multistep`. Repo `type-check` is clean; 191 modelling-tool unit tests
across rules, automation, workflow and EML pass.

---

## ISSUE-001 (High, fixed) — the workflow editor's activate toggle was broken twice over

`admin/workflow-definitions/$id/edit.tsx` toggles a definition with:

```ts
apiClient.patch(`/workflow-definitions/${id}`, { is_active: !wf?.is_active })
```

Two independent defects made that a no-op:

1. **The route did not exist.** `WorkflowDefinitionsController` mapped `GET`, `POST`,
   `PUT` and `DELETE`, but no `PATCH`. Nest answered 404. Confirmed against the
   backend's own route table:
   `Mapped {/api/workflow-definitions/:id, PUT}` with no `PATCH` line.
2. **The body key was wrong.** `WorkflowDefinitionsService.update` reads
   `dto.isActive` (camelCase). The screen sent `is_active`, so even once the route
   answered, `updates` would carry only `updated_at` — the toggle would report success
   and change nothing.

This is not a model-owned field: `isActive` is deliberately excluded from
`MODEL_OWNED_FIELDS`, so disabling a definition is meant to work even for one the
model declared.

**Fix.** Added a `PATCH :id` handler delegating to the same partial update, and
corrected the payload to `isActive`.

Worth noting for whoever fixes this class of bug next: stacking `@Patch(":id")` on the
existing `@Put(":id")` handler does **not** register both. Nest stores one verb per
handler, so the second decorator silently replaces the first — the first attempt at
this fix compiled, generated, and still mapped only `PUT`. It needs its own method.

Verified after regeneration: `Mapped {/api/workflow-definitions/:id, PATCH}` appears,
and `PATCH {"isActive": false}` flips `is_active` to `false`, then back to `true`.

**Files:**
- `packages/generator/templates/tanstack-start-nestjs/backend/src/modules/workflow-definitions/workflow-definitions.controller.ts`
- `packages/generator/templates/tanstack-start-nestjs/frontend/src/routes/admin/workflow-definitions/$id/edit.tsx`

---

## ISSUE-002 (Medium, fixed) — every generated frontend failed `type-check` on a fresh install

`bun run type-check` in the generated frontend failed with 5 errors:

```
src/lib/api-client.ts(21,34): error TS2339: Property 'env' does not exist on type 'ImportMeta'.
src/lib/api-client.ts(52,30): error TS2339: ...
src/lib/sys-collections.ts(41,15): error TS2339: ...
src/lib/sys-collections.ts(42,18): error TS2339: ...
src/lib/sys-collections.ts(50,22): error TS2339: ...
```

`src/vite-env.d.ts` opens with `/// <reference types="vite/client" />`, but the
generated frontend depends on **vinxi**, not on vite directly — there is no
`node_modules/vite` at either the app root or the frontend after a clean `bun install`.
The reference resolves to nothing, so `import.meta.env` is untyped and every
`VITE_*` read is an error. The file's own doc comment says its purpose is that a freshly
generated app should typecheck; it did not.

**Fix.** Declared `ImportMetaEnv` / `ImportMeta` in that same file rather than adding a
dependency. The reference line stays: TypeScript merges interfaces, so this is correct
whether or not `vite/client` resolves.

Verified after regeneration: `tsc --noEmit` is clean.

**File:** `packages/generator/templates/tanstack-start-nestjs/frontend/src/vite-env.d.ts.hbs`

---

## ISSUE-003 (Low, fixed) — the transitions seed documented a merge it does not perform

`backend/seeds/05b_workflow_transitions.ts` was generated with:

```ts
// Replace all model-declared transitions on each table, keeping any
// hand-crafted rows (source = 'designer') untouched.
```

Neither half is true. `sys_workflow_transitions` has no `source` column at all
(migration `0013`), and the `DELETE` is unconditional:

```sql
DELETE FROM sys_workflow_transitions WHERE table_name = ${tbl}
```

So a transition added by hand on a table the model also describes is destroyed on the
next re-seed, while the comment promises the opposite.

**Fix.** Corrected the comment to state the actual semantics — a full replacement per
model-declared table, with tables the model says nothing about left alone. The
behaviour is unchanged; adding real provenance tracking is a feature, not a QA fix, and
is left for whoever wants designer-authored transitions to survive.

**File:** `packages/generator/src/generators/tanstack-start-nestjs/nestjs-backend.generator.ts`

---

## ISSUE-004 (Low, deferred) — `%%rule … priority:` is parsed and then silently dropped

The model sets a priority on all 8 rules (`priority: 10`, `priority: 20` on
`inventoryReorder`), and the generator faithfully emits it into the `AUTHORED_RULES`
array in `backend/seeds/04_business_rules.ts`:

```ts
{ entityName: 'bus_patient', ruleName: 'patientValidation', operation: 'CREATE', priority: 10, jdmContent: '…' }
```

It goes nowhere. `sys_rule_definitions` has no `priority` column, `seedAuthoredRules`
never puts it in the insert, and the rules engine does not order rules by anything. A
modeller who writes `priority: 20` to make one rule run after another gets no error and
no effect — the directive reads as supported.

**Deferred, not fixed.** Honouring it means a migration, an ordered read in the engine,
and a decision about how authored rules interleave with the field-derived validation
graphs — a feature change, outside a QA pass. Flagging it so the gap is a known one
rather than a surprise. The intervening options are to implement ordering or to have
the checker warn that `priority` is not yet enforced.

**Files (for whoever picks it up):**
- `packages/generator/templates/common/seeds/business-rules.ts.hbs` (emits it)
- `packages/generator/templates/tanstack-start-nestjs/backend/src/modules/rules/rules-engine.service.ts.hbs` (would consume it)

---

## Observations (no change made)

- **The activate toggle is disabled in the UI for model-declared workflows**
  (`disabled={… || wf.source === 'model'}`), even though the service deliberately
  permits `isActive` on them. For this model that means all 59 definitions have the
  control greyed out, so ISSUE-001 only bites on designer-authored workflows today.
  Whether the button should be live for model workflows is a product call, not a bug
  to fix under QA.
- The generated frontend pins `@tanstack/react-router` and `@tanstack/start` at
  `1.97.1` with vinxi, well behind the modelling tool's 1.168/1.170 on Vite. That is a
  deliberate split, but it is what makes ISSUE-002 possible and is worth a decision
  before it drifts further.
- `ModelContextService` warns `extension "vector" is not available` at boot when
  pgvector is absent. It degrades cleanly, but the warning reads like a failure on a
  stock Postgres.

---

## Reproduction

```bash
# generate
bun packages/generator/src/cli/generate.ts generate \
  -i examples/hospital-management-system.mmd -o /tmp/hospital-app \
  -n hospital-management --force --no-setup

# set up
cd /tmp/hospital-app
cp backend/.env.example backend/.env
bun install && bun run db:setup

# the suites
cd tests && node run.ts --fast          # 68/68
node run.ts --only workflow             # 4/4
node run.ts --only rules                # 29/29

# the frontend type-check (ISSUE-002)
cd ../frontend && bun run type-check

# the workflow editor toggle (ISSUE-001), with the backend running
curl -s -c jar -X POST localhost:4001/api/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@admin.com","password":"admin123"}'
ID=$(curl -s -b jar 'localhost:4001/api/workflow-definitions?isActive=true' \
  | python3 -c 'import sys,json;print(next(w["id"] for w in json.load(sys.stdin) if w["name"]=="AppointmentToEncounter"))')
curl -s -b jar -X PATCH "localhost:4001/api/workflow-definitions/$ID" \
  -H 'Content-Type: application/json' -d '{"isActive":false}' -w '\n%{http_code}\n'
```
