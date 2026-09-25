# QA Report: the Logic step's rule and process editors, on the education model

| Field | Value |
|-------|-------|
| **Date** | 2026-09-25 |
| **URL** | `http://localhost:3000/projects/:id/logic` (the modelling tool, `bun run dev`) |
| **Branch** | `claude/test-rules-workflows-editor-3d0gqi` |
| **Model** | `docs/eml-sessions/education-management-system/education-management-system.mmd` (19 entities, 10 rules, 22 processes) |
| **Scope** | Every input of the business-rule editor and the three process editors (Lifecycle, Status, Process), added through the browser, saved, reloaded, and the saved model checked |
| **Framework** | TanStack Start + React 19, React Flow for the status canvas, PostgreSQL 16 + pgvector |
| **Screenshots** | 14, under `screenshots/rules-workflows/` |

## Method

The run used **Chromium through Playwright**, not gstack's `$B` browser, for the
same reason as the 2026-09-09 report: gstack's installer is not available in this
session. It collects the same evidence and produces the same report with a
different driver. An ordinary approved account owned the project, not the
administrator, because the project routes refuse administrators.

Everything was entered through the page itself, with clicks, typing,
selections, and dragging on the status canvas. The API was used only to create
the project and to read back what was saved. The run is now a spec,
`tests/e2e/05b-logic-editors.e2e.spec.ts`, so CI repeats it on every pull
request.

## What the two editors are for

**The business-rule editor** records a decision the application makes on every
write to one entity. It is a decision table: inputs are the record's fields,
outcomes are what happens (`validation-error` refuses the write, `transform`
sets a field, `trigger-workflow` starts a process), and the first row that fits
wins. It compiles to a GoRules decision graph that runs inside the write.

**The workflow editors** record what happens around those decisions. There are
three kinds:

- **Lifecycle**: named handlers at fixed moments (`beforeCreate`, `afterUpdate`…),
  generated as stubs in `backend/src/modules/hooks/handlers/`.
- **Status**: the statuses a record moves through and the moves allowed. The
  generated guard refuses any other move.
- **Process**: ordered steps (check, repeat, look up a rule, create, update,
  delete, work out a value, call a web service), started by a rule or by the
  record's own lifecycle.

## Findings

| # | Severity | Editor | Finding | Status |
|---|----------|--------|---------|--------|
| 1 | High | Rule | A rule written as `%%action` lines (six of the education model's ten) opened read-only as a flowchart. The only offer was *Start an empty table instead*, which discards the actions. The Enhance page already read them as a table; the Logic page did not | **Fixed** |
| 2 | Medium | Rule | *Test with values* never matched a quoted value. The cell `"cancelled"` was unquoted before comparing and the typed `"cancelled"` was not, so the panel reported the catch-all row. The same bug was in the automation screen's table editor | **Fixed** |
| 3 | High | Process | The *Look up a rule table* picker was empty on the Logic page, so no process built there could consult any of the model's rules | **Fixed** |
| 4 | Low | Process | A repeat read *"until feeinvoice.status is not paid stops being true"*, a double negative | **Fixed** |
| 5 | High | Process | *Create a record* wrote its values as typed. Every line after the first fell outside the `%%step` directive (invalid Mermaid, dropped on reload), and the first was not JSON, which the generated `executeCreateEntity` requires, so the step was skipped at run time as "invalid fields JSON". A multi-line web-service body had the same line-escaping problem | **Fixed**, in both the tool and the builder copy it ships to generated apps |
| 6 | Medium | Rule | Saving an `%%action` rule moved its actions below the next section's heading (`%% ---- Business rules — the student record`), because a rule's body runs to the next `%%rule` and the actions were appended at its end | **Fixed** |
| 7 | High | Process | *Update a field* on the record the process runs on wrote `entity: FeeInvoice` with no target. The checker the generator runs reads that as a cross-entity write it cannot aim (EML265, an error), so the process failed the check. The executor treats a write with no entity as "this record", which is how the model's own sagas write it. The inspector now shows the own record type for a step that names none, and picking it stores no entity | **Fixed** |
| 8 | Medium | Process | *Update a field* on a **different** record type had no "Which record" input, so it could never be aimed at a row. The checker rejected it (EML265) and the executor skipped it | **Fixed**: `target` added to the step in the tool's builder, the generated app's copy and `appwithai-language.json`; the builder reports a cross-entity write that does not say which row |
| 9 | — | Status | A drag that starts within 200 ms of *Add state* misses, because the canvas is re-fitting | **Not a defect.** No person moves that fast; the spec waits for the canvas to settle |
| 10 | Low | Checker | On a status machine bound to an entity with no status column, EML426 names an unrelated enum (`AssessmentStatus`) | **Open.** `language/**`, outside this change |

### How finding 8 was closed

`target` was added to `UpdateEntity` in `STEP_FIELDS`, in both builder
copies (held equal by `generated-app-parity.test.ts`), and in
`appwithai-language.json` (held equal by `language-parity.test.ts`). The
generator and the checker already read `target:` in both of its forms: a
`{{reference}}` becomes the row id, a bare column a foreign key to match. So
the change is the input, the validation that asks for it, and the help that
explains it. `update-target.test.ts` holds the builder's validation and the
published checker to the same answer.

## Evidence

| Before | After |
|--------|-------|
| `02-banding-actions-read-only.png`: Admission Banding as a read-only flowchart | `20-fixed-banding-table.png`: the same rule as its six-row table |
| `04-rule-table.png`: *Row 2 fits* for `"cancelled"` / `50` | `21-fixed-test-values.png`: *Row 1 fits* |
| `11-process-all-steps.png`: *Missing a rule table*, *"until … stops being true"* | `22-fixed-process.png`: `lateFeeGuard` picked, *"while …"* |

The saved model, before and after (the Create step's values):

```
%%step s3 values: status: reported              ← before: second line escapes
student_id: {{feeinvoice.student_id}}

%%step s2 values: {"status":"reported","student_id":"student_id","severity":2}   ← after
```

After the fixes, the model saved by the full run of the spec checks with
**0 errors**. The only two warnings come from binding the test status machine
to `Room`, which has no status column.

## The generated application's editors

The education model was generated, migrated and run, then its editors were
driven in Chromium as its administrator. The rule and workflow editors a
generated application ships are the tool's own components. They had drifted,
so they are now held byte-identical by `editor-files-identical.test.ts`.
`AutomationHelp.tsx` is the one deliberate difference: each host renders help
in its own frame. Screenshots are `gen-before-*` and `gen-after-*`.

| # | Severity | Screen | Finding | Status |
|---|----------|--------|---------|--------|
| G1 | High | Automations | The builder's copy of the model split `url: https://…` at `https:`, so a web-service step reopened with no URL. It also wrote hook workflows without the steps after the hooks | **Fixed**: the tool's model ships unchanged |
| G2 | Critical | Automations | The update endpoint wrote every field but `mermaid_code`, so Publish never saved an automation's steps. There was no draft save either, so everything built there was lost on reload | **Fixed**: the update writes the document, edits save as debounced drafts, and a new automation starts inactive |
| G3 | High | Business Rules | *Create Business Rule* offered a hard-coded list (Patient, Claim, Account, Opportunity…) and none of the application's own entities | **Fixed**: read from the dictionary (`/sys/tables`, `/sys/columns?tableId=`), with field pickers on new and edit |
| G4 | Critical | Business Rules | The editor saves a bare decision table; the engine needs a JDM graph, and answered "missing field `nodes`". Every rule created, or re-saved, in the editor refused nothing | **Fixed**: the engine wraps a stored table in a graph, quoting outcome text so `validation-error` is not read as a subtraction |
| G5 | High | Business Rules | The editor offers EML's `validation-error`, which the engine's `validate()` does not read. It refuses a write only on `prevent` | **Fixed**: the engine translates it |
| G6 | High | Business Rules | PostgreSQL returns NUMERIC as `"1.500000"`, and an update is checked against the stored row, so `> 0` never fit and a rule that held on create let the same write through on update | **Fixed**: the dictionary's number columns are compared as numbers |
| G7 | Critical | Report Designs | *Edit Design* changed the address and left the list on screen, because the child route had no `<Outlet />`. No entity's print layout could be customised | **Fixed** |
| G8 | Medium | Print | Dates printed as midnight timestamps; NUMERIC printed as `1.500000` | **Fixed**: printed by column type |
| G9 | Low | Dictionary hooks | `useTableColumns` filters with `table_id`, which the backend ignores, so it returns every table's columns | **Open**: outside the editors; the rule editor's new hook uses `tableId` |

Verified end to end in the browser. *Late Fee Guard* was created in Admin →
Business Rules on Fee Invoice; cancelling an invoice with a balance then
answers **400 "An invoice with a balance cannot be cancelled."** (it answered
200 before G4 to G6). An automation built in Admin → Automations comes back
whole after a reload. The report designer opens, saves a customised layout and
prints a real record for **all 19** entities.

CI's *Generate an application and build it* job was reproduced locally on
`drug-discovery.eml.mmd`: the backend, frontend and test-suite builds pass,
the migration runs, and **61/61** generated suites pass against Postgres with
these changes.

## Help, from Markdown files shipped with the application

The editors now carry detailed static help: five `.md` files under
`packages/web/src/content/help/`, inlined at build time and rendered in a side
panel (`31-help-rules.png`, `33-help-process.png`). The **Help** button opens
the overview. A link above each editor (*How business rules work*, *How status
machines work*, …) opens the page for the editor in use. The panel sits beside
the editor rather than over it, so the table being explained stays visible.

`help-content.test.ts` holds each page to its editor. Every event, outcome,
action, step type, check and inspector field the editor offers must appear on
its page, so a control added without help fails CI. The test was confirmed to
bite by removing one label from `process.md` and watching it fail.

## Verification

| Check | Result |
|-------|--------|
| `tests/e2e/05b-logic-editors.e2e.spec.ts` (new) | 2 passed |
| `bun run test` | 893 passed, 12 skipped |
| `bun run type-check`, `biome check . --diagnostic-level=error` | clean |
| All five `--check` artifact comparisons, under bun 1.4.0 on linux-x64 (CI's) | up to date |
| Generated app from `examples/drug-discovery.eml.mmd`: install and frontend build | passed |
| `bun install --frozen-lockfile` under bun 1.4.0 | no changes |
