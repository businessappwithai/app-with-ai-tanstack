# QA Report: every published model, through the browser application and the deployable zip

| Field | Value |
|-------|-------|
| **Date** | 2026-09-13 |
| **Scope** | All six `.mmd` models the website publishes, each taken through `guide/run-in-browser.html`: generate → boot → sign in → dashboard, and the *Download the deployable app (.zip)* path → unzip → install → type-check → build |
| **Models** | crm · dance-studio · drug-discovery · education-management-system · hospital-management-system · investment-planning-wealth-management-system |
| **Repositories** | `businessappwithai.github.io` (fix landed), `app-with-ai-tanstack` (this report) |
| **Driver** | Chromium through Playwright, plus the real `bun`/`tsc`/`nest`/`vinxi` toolchain |
| **Defects found** | 5, all fixed: 1 high, 1 medium, 3 low. Two of them were opened as "not a defect" or "not worth fixing" and turned out to be defects once measured |

## Method, and two accommodations to state plainly

**gstack was not used.** It is not installed in this environment
(`~/.claude/skills/` carries only `session-start-hook`), its installer cannot run
here, and its Aside browser is macOS-only. Same accommodation the 2026-09-09 run
made: Chromium through Playwright instead. Same evidence, different driver.

**The browser work ran against a local mirror, not the live host,** because this
sandbox's egress intercepts TLS to `appwithai.org`. The five vendored generator
artifacts were byte-compared against `app-with-ai-tanstack` first —
`appwithai-wasm.js`, `appwithai-fullstack.js`, `checker.js`, `fixer.js` and
`wasm-app/sw.js` were all identical — so what was driven is what the site serves.
`stack-templates.json` was **not** identical, and that is ISSUE-001.

Boot times below are this sandbox's CPU. They are not a claim about a reader's
machine and should not be used to tune anything.

---

## ISSUE-001 — the deployable zip shipped a pre-line-item application · **high** · fixed

`appwithai-fullstack.js` compiles the model, but every file it *writes* comes out
of `assets/vendor/stack-templates.json`. That payload had not been re-copied when
the bundles beside it were, so four templates were stale — exactly the four the
line-item work touched:

| Template | Vendored | Fresh |
|---|--:|--:|
| `frontend/src/hooks/use-bus-entity-level.ts` | 6,001 | 12,947 |
| `backend/.../sys/services/sys-category.service.ts.hbs` | 11,848 | 13,397 |
| `frontend/src/hooks/use-field-metadata.ts` | 4,169 | 4,781 |
| `tests/suites/12-access-control.test.ts.hbs` | 12,246 | 13,156 |

A reader downloading the zip from chapter 09 — or running chapter 10's
WebContainer — therefore got an application with **no child tabs and line items
still on the dashboard**, while the same model through the CLI produced one with
both.

**Why nothing caught it.** The archive is internally consistent: all four stale
templates agree with each other. It installs, type-checks, builds and runs. Only
opening a parent record and finding nowhere for its lines to be reveals it.
`website-e2e.mjs` held the *bundles* to the generator — which is how the acronym
staleness was caught — but had no reader for this payload at all. The artifact
with the least coverage was the one deciding what the zip contains.

Fixed in `businessappwithai.github.io` at `112cbe5`: payload rebuilt with
`bun run build:stack-templates` at `795f091` and re-vendored, plus two assertions
that fail against the old payload and pass against the new.

---

## ISSUE-002 — an acronym in an entity name is title-cased on screen · **low** · fixed

A model declaring `KYCRecord` gets the table `bus_kyc_record` (correct — that is
the acronym fix) but the screen label **`Kyc Record`**. Likewise `FATCADeclaration`
renders `Fatca Declaration` and `CRSDeclaration` renders `Crs Declaration`.

`title()` in `packages/generator/src/generators/wasm/model-bundle.ts:136` already
protects the all-caps case, and its comment states the intent exactly:

> An all-caps name is left as it is — a model that declares `CAPA` means the
> acronym, and titling it to `Capa` renames the entity on screen.

The mixed case falls through to `snake()`, which lowers the acronym, after which
only the first letter is restored. The same derivation is duplicated across ten
template files and `packages/core/src/generators/hook-translator/visitor.ts:389`.

**Deferred at first, then fixed when the author asked for it.** Investigating it
found the problem was worse than reported: the two stacks did not merely lower
the acronym, they *disagreed*. Core split only on a lower-to-upper step, so a
name beginning with an acronym had no boundary to find and came through whole —
`KYCRecord`. The browser bundle routed through `snakeCase`, which found the
boundary and lowered the acronym — `Kyc Record`. The manual was a third copy.
Core also lowered `CAPA` to `Capa`, which is exactly what the browser copy's own
comment warns against.

There is one implementation in core now and the others call it. It splits a run
of capitals before its last letter when a lowercase follows, and leaves an
all-capitals word alone. Verified through both stacks: `KYC Record`,
`FATCA Declaration`, `CRS Declaration`.

## ISSUE-003 — a foreign key was labelled two different ways · **low** · fixed

Found while fixing ISSUE-002. `kyc_record_id` on `KYCVerification` points at
`KYCRecord`, and the stacks called it two different things, neither of them that:
the NestJS dictionary stripped the suffix (`Kyc Record`), the browser bundle
labelled the raw column (`Kyc Record Id`), and the acronym was gone from both
because a column name is lower-case by the time either sees it.

A foreign key is now labelled by the entity it points at, resolved against the
names the model declares rather than reconstructed from the column.
`attributeDisplayName` in core does it and both stacks call it. Verified on the
wealth-management model column by column: **642 columns in the browser bundle,
642 in the NestJS dictionary seed, 0 disagreements.**

## ISSUE-004 — the progress bar sat still for 97% of the boot · **medium** · fixed

Opened below as an observation, on the grounds that sandbox CPU could not be
told from a reader's machine. Measuring showed that was the wrong frame: the
`seed` mark put the bar at 85% and nothing moved it again until the frame was
ready — **246 of the 253 seconds** a thirty-entity model took. A faster machine
shortens the same frozen stretch, so no constant needed estimating; the fix was
to report progress.

The runtime counts the work that scales with the model and says so; the page
spreads that count across the band the `seed` mark opens. The marks were also
weighted backwards — opening Postgres and running the DDL took 6 of those 251
seconds and owned 70% of the bar. Measured across four runs on the same
hardware: 246s worst dwell, then 72s, then 57s, then **52s**, with the bar
moving steadily from 78% to 90% and the counter reaching 1307 of 1320.

---

## Results

### The browser application

Every model generated, booted PGlite, migrated, seeded, and signed in as the
administrator. **Zero application console errors on all six.**

| Model | Generated | Boot to sign-in | Line items carded | Parents carded |
|---|---|--:|--:|---|
| dance-studio | 43 files · 554KB · 90 rows | 75s | 0 of 1 | 1/1 |
| crm | 43 files · 1005KB · 170 rows | 155s | 0 of 3 | 3/3 |
| drug-discovery | 43 files · 922KB · 190 rows | 155s | 0 of 2 | 2/2 |
| education-management | 43 files · 1015KB · 190 rows | 170s | 0 of 4 | 4/4 |
| hospital-management | 43 files · 1384KB · 300 rows | 280s | 0 of 8 | 5/5 |
| investment-planning | 43 files · 2382KB · 910 rows | 491s | 0 of 25 | 17/17 |

The line-item arrangement is correct on every model: **no declared child appears
as a dashboard card, and every declared parent does.** Reconciled fully on the
largest model — 67 cards against 66 non-line-item entities, the extra being the
`Audit Log` system entity, with zero missing and zero children wrongly carded.

The three page-level console errors on each model are Google Fonts and PostHog,
which this sandbox blocks. The single failed request is the pre-sign-in
`401 /api/auth/me` probe — the auth check working.

### The deployable zip

Downloaded per model from a local server holding the corrected payload, then
built exactly as a reader would. **24 of 24 steps clean.**

| Model | Files | install | backend `tsc` | `nest build` | `vinxi build` | routeTree |
|---|--:|---|--:|---|---|---|
| investment-planning | 821 | 1854 pkgs | 0 errors | ok | ok | generated |
| hospital-management | 526 | 1852 | 0 errors | ok | ok | generated |
| education-management | 466 | 1854 | 0 errors | ok | ok | generated |
| drug-discovery | 460 | 1852 | 0 errors | ok | ok | generated |
| crm | 454 | 1852 | 0 errors | ok | ok | generated |
| dance-studio | 408 | 1852 | 0 errors | ok | ok | generated |

Each archive carries `childTabs` ×2 and `lineItemTables` ×2, has no WASM overlay
leak (no `file:./pg-wasm`, no `DATABASE_URL=./pgdata`), and correctly omits
`bun.lock` and `frontend/src/routeTree.gen.ts` — both of which the build then
produces, as documented.

---

## What is left, and what genuinely is not a defect

**Boot time itself.** It scales with seeded rows, from 75s at 90 rows to 491s at
910, proportionally — so there is no algorithmic problem, and the absolute
numbers are this sandbox's CPU rather than a reader's. That part stands. What
did not stand was the conclusion originally drawn from it: see ISSUE-004. The
bar sitting still was a property of the *reporting*, not of the machine, and
measuring rather than reasoning is what separated the two.

**The residual 52s dwell — and the explanation for it, which was wrong.** This
section said the dwell was uneven cost per unit, "a sample row with foreign keys
is slower to insert than a dictionary row", and that fixing it would need an
estimated cost weight. That was inferred, not measured. Plotting the recorded
samples shows a steady 5-9 units per second throughout and one 40-second dead
stop — not uneven cost but uncounted work, in the six seed stages that had no
tick at all. See ISSUE-005. Worst dwell is 16s now, and no estimate went into it.

Nothing is outstanding.

---

## ISSUE-005 — six seed stages were uncounted, and a column's kind was decided twice · **low** · fixed

Both found by auditing a claim rather than a symptom.

`seedAccess` is nested over operations x roles and transitions x edges x roles,
and the hospital model declares 132 access rules over ten state machines. It ran
with no tick, along with roles, the administrator, role accounts, rules and
workflows — the 40-second stop above. Every stage ticks now, and the total counts
the nested access rows exactly rather than approximating them by rule count.

Separately, `referenceIdFor` in the browser stack carried a rule core lacked:
failing a `semanticType` alias, read the column's name, so a model writing
`string email` rather than `email email` still gets an email control. Guarded, so
`boolean email_opt_out` stays a checkbox. Core had no such rule, so the browser
application rendered an email input and the NestJS application a plain text box
over the same column — five columns across the published dance-studio and
ecommerce models. Section 3.7's claim is that the reference type decides the
control, so the two applications were promising different things about one model.
One implementation in core now; checked over **953 real attributes in four
published models, 0 disagreements**, was 5.

---

## Corrections to this run's own first-pass numbers

Stated because they were reported before they were checked. The first three were
the instrument rather than the product; the fourth was a judgement call that
measuring overturned:

| First reported | Cause | Corrected |
|---|---|---|
| hospital and investment "never reached sign-in" | 200s boot budget, measured under a competing Chromium | 280s and 491s in isolation |
| hospital "0 of 5 parents carded" | capture fired when the login form vanished, before the dictionary query returned | 5/5 |
| investment "9 entities missing from the dashboard" | label extractor discarded any label ≥60 characters, which is every long entity name | 0 missing, 67/66 reconciled |

No product defect was involved in any of those three.

| First reported | Corrected |
|---|---|
| the progress bar's weighting could not be judged without real hardware, so leave it | the bar sat still for 97% of the boot because of *what it reported*, not how fast the machine was. Hardware-independent, measurable here, and fixed — ISSUE-004 |
| the residual dwell was uneven cost per unit, and fixing it would need an estimated weight | it was six uncounted stages. Measuring the rate showed a flat 5-9 units/sec with one dead stop, not a gradient. No weight, no estimate — ISSUE-005 |

The lesson of the fourth is the opposite of the first three: those were caution
about the product that turned out to be the harness, and this was caution about
the measurement that turned out to be avoidable by measuring more carefully.
