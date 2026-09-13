# QA Report: every published model, through the browser application and the deployable zip

| Field | Value |
|-------|-------|
| **Date** | 2026-09-13 |
| **Scope** | All six `.mmd` models the website publishes, each taken through `guide/run-in-browser.html`: generate → boot → sign in → dashboard, and the *Download the deployable app (.zip)* path → unzip → install → type-check → build |
| **Models** | crm · dance-studio · drug-discovery · education-management-system · hospital-management-system · investment-planning-wealth-management-system |
| **Repositories** | `businessappwithai.github.io` (fix landed), `app-with-ai-tanstack` (this report) |
| **Driver** | Chromium through Playwright, plus the real `bun`/`tsc`/`nest`/`vinxi` toolchain |
| **Defects found** | 1 high (fixed), 1 low (reported, not fixed — see ISSUE-002) |

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

## ISSUE-002 — an acronym in an entity name is title-cased on screen · **low** · reported, not fixed

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

**Not fixed here, deliberately.** It is cosmetic rather than a malfunction; the
change would touch every generated application's UI copy through ten-plus
duplicated implementations under a parity test; and it carries a real design
question the author should answer, not QA — `ESignatureRequest` becomes
`E Signature Request` under the obvious fix, which may not be wanted. The
proposed change is to split on acronym runs before titling, preserving a run of
two or more capitals:

```ts
value.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").replace(/([a-z0-9])([A-Z])/g, "$1 $2")
```

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

## An observation that is not a defect

Boot time in the browser scales with seeded rows, from 75s at 90 rows to 491s at
910. The scaling is proportional, so there is no algorithmic problem. But
`run-in-browser.js` weights its progress bar around a documented assumption —
"booting Postgres is ten seconds or more" (line 89) — that does not hold for the
two largest published models on this hardware, and the bar's own design comment
says an unweighted bar "would sit at 66% for the entire wait, which is worse than
no bar".

**Deliberately not changed.** Sandbox CPU cannot be distinguished from a reader's
machine here, and tuning a constant against numbers that cannot be validated is
guesswork dressed as a fix. Worth one measurement on real hardware first.

---

## Three corrections to this run's own first-pass numbers

Stated because they were reported before they were checked, and all three were
the instrument rather than the product:

| First reported | Cause | Corrected |
|---|---|---|
| hospital and investment "never reached sign-in" | 200s boot budget, measured under a competing Chromium | 280s and 491s in isolation |
| hospital "0 of 5 parents carded" | capture fired when the login form vanished, before the dictionary query returned | 5/5 |
| investment "9 entities missing from the dashboard" | label extractor discarded any label ≥60 characters, which is every long entity name | 0 missing, 67/66 reconciled |

No product defect was involved in any of the three.
