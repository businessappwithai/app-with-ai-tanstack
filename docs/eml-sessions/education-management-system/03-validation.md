# 03 — validation log

Every step that touched the `.mmd` closed the same way (§10.0): edit → fixer →
checker → clean. One line per step, with the counts before and after.

Engine: `bun language/checker.ts` from the checkout, which is
`language/checker.ts` itself — the same engine `appwithai.org/guide/checker.js`
is built from. The published runner and the site's scorer were then run over the
delivered bytes as an independent confirmation.

| # | Step | Before | Fixer changed | After |
|---|---|---|---|---|
| 1 | Phase 3 — seed: 19 entities, `id PK` only, categories, entity help, parents, 25 relationships | — | nothing to fix (no `.error` file yet; the fixer reads one, so the checker ran first) | **0 errors · 0 warnings · 25 info** — one `EML125` per relationship, exactly as §10.3 predicts, and **no `EML102`**, which is the diagnostic that would have meant an entity block the parser never read |
| 2 | Phase 4 structure pass — every column, its type, modifiers and `%%field help:`; 25 enum bindings; 14 indexes; 6 more relationships for the `_by_id` and one-off reference columns | 0e · 0w · 25i | nothing | **0 errors · 0 warnings · 0 info** — every `EML125` cleared by the foreign keys the walk added, and no `EML502`: every FK name resolves to a declared entity or is covered by a drawn edge |
| 3 | Phase 4 behaviour pass — 68 `%%rbac` directives merged first, ahead of the state machines they name transitions from | 0e · 0w | — | **15 errors**, all `EML214`: `%%rbac` naming a transition on an entity with no state machine yet. Expected of the ordering, and cleared by step 4 rather than by weakening the rules |
| 4 | Phase 4 behaviour pass — 10 rule sections, 11 state machines, 5 sagas, 19 hooks | 15e · 0w | — | **0 errors · 3 warnings**: `EML303`/`EML304` (a decision node with one outgoing edge, in the banding flowchart) and `EML500` (`StaffLifecycle` bound to an entity whose status column was called `employment_status`) |
| 5 | Repair of step 4's three warnings: the banding flowchart given real branches; `Staff.employment_status` renamed to `Staff.status`, with its help and enum binding moved with it | 0e · 3w | — | **0 errors · 0 warnings** |
| 6 | Phase 5 — the reporting pass: 40 `%%report` directives across eight roles | 0e · 0w | — | **0 errors · 0 warnings** |
| 7 | **Phase 7 delivery run over the exact delivered bytes** | — | `checkAndFix` reported `repaired: false` — there was nothing to repair | **0 errors · 0 warnings · 0 info** |

## The delivery run (§10.7)

Run against the published modules rather than the checkout, so the verdict is the
one a reader gets from `appwithai.org`:

```
$ node guide/check-model.mjs education-management-system.mmd
model    education-management-system.mmd
checker  guide/checker.js · EML 1.2.0
pass 1   checkAndFix 0e 0w 0i · repaired: false
pass 2   check       0e 0w 0i
pass 3   check       0e 0w 0i

OK — 0 errors, 0 warnings (EML 1.2.0)        exit 0
```

## The scorer (§10.6)

`scripts/check-model.mjs` audits the file contract and §10's checklist
mechanically — a different question from the checker's, and one a clean document
can still fail:

```
20 passed, 0 failed
```

including: every FK ends `_id` (32 of them), every reference column carries the
`FK` modifier, every status column is bound to an enum (12 of 12), 11 state
machines each with an initial transition and a terminal state, 31 `%%action`
directives, 5 sagas with 7 steps, 68 `%%rbac` directives, 19 `%%hook` directives,
and the repaired bytes being the delivered bytes.

## The two checks the checker cannot make (§10.6)

Both were run mechanically over the document, not by eye:

```
rules checked; off-row identifier count: 0
OK   saga writes FeeInvoice -> paid
OK   saga writes FeeInvoice -> part_paid
OK   saga writes Enrollment -> withdrawn
OK   saga writes Student    -> suspended
```

1. **Every identifier a `when:` reads is a column of the rule's own entity.** 31
   actions, 0 off-row identifiers. Three checks that could not be written this
   way were moved into handlers or onto columns instead — see
   `02-cross-cutting.md`.
2. **Every state a saga writes is a state its machine draws.** Two edges were
   added because this check asked for them: `part_paid → part_paid` and
   `on_leave → suspended`.

## What was *not* verified here

- **The report SQL against a live schema.** The checker has no database, so
  `EML290`–`EML296` validate the shape and nothing else. `check-reporting-pack.ts`
  in `app-and-report-with-ai-tanstack` executes every query against a real
  generated schema; it was not run in this session.
