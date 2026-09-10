# QA Report: AppWithAI — Education Management System, end to end

| Field | Value |
|-------|-------|
| **Date** | 2026-09-09 / 2026-09-10 |
| **URL** | `https://appwithai.org/try-it-yourself.html` → `guide/run-in-browser.html` → the deployable `.zip` under `docker compose` |
| **Branch** | `claude/gstack-qa-ems-skill-de3uui` (this repository and `businessappwithai.github.io`) |
| **Tier** | Standard (critical + high + medium) |
| **Scope** | The whole path a reader takes: the conversion page, the `llmdetailed.txt` §10 authoring protocol, the browser application, the model viewers, and the deployable stack |
| **Pages visited** | 6 (try-it-yourself, run-in-browser, viewers, the browser application, the deployed application's login and dashboard) |
| **Screenshots** | 14 (3 kept beside this report) |
| **Framework** | Static site (no build step) · WebAssembly browser runtime (PGlite) · NestJS + TanStack Start + PostgreSQL + Electric under Docker |

## Method, and one accommodation to state plainly

Driven with **Chromium through Playwright**, not with gstack's own `$B` binary: this
session could not run gstack's installer, and the Aside browser is macOS-only.
Same evidence, same report, different driver.

**The browser work ran against a local mirror of the site, not the live host.**
This sandbox's egress intercepts TLS, and Chromium would not complete a
handshake to `appwithai.org` (the proxy log shows the tunnel closing mid-exchange);
`curl` reached it fine. So every file the run touches was fetched from the live
site and compared first — `try-it-yourself.html`, `llmdetailed.txt`,
`guide/run-in-browser.html`, `assets/js/appwithai-wasm.js`,
`assets/js/run-in-browser.js`, `assets/js/appwithai-fullstack.js` and
`assets/vendor/stack-templates.json` are **byte-identical** between the live host
and the checkout that was served locally. The findings below are therefore
findings about what appwithai.org is serving today, and the two that are
site-side were verified against the live bytes before anything was changed.

## Health Score: 73 → 97

Weighted over the categories actually exercised (Console 15, Links 10,
Functional 20, Visual 10 — 55 points of weight). Accessibility, Performance and
Content were **not tested**, and are excluded rather than scored.

| Category | Before | After | Why |
|----------|-------:|------:|-----|
| Console | 70 | 100 | 2 reproducible errors (the dictionary sync failure, the 500 behind it); both gone |
| Links | 100 | 100 | 25 same-origin links on the conversion page, all 200 |
| Functional | 47 | 92 | 3 high + 1 medium; the three highs fixed and verified, the medium deferred with a reason |
| Visual | 100 | 100 | provisional — 1440px and 390px only, no horizontal overflow at either |

`(70×0.15 + 100×0.10 + 47×0.20 + 100×0.10) / 0.55 = 72.5 → 73`
`(100×0.15 + 100×0.10 + 92×0.20 + 100×0.10) / 0.55 = 97.1 → 97`

## Top 3 Things to Fix

1. **ISSUE-001: every `validation-error` rule was inert in the browser application** — the rule matched, the record was written anyway, and the caller was told nothing. Fixed.
2. **ISSUE-002: the deployable zip shipped a bug the generator had already fixed** — the site's vendored `stack-templates.json` was three files behind, so every download carried the Electric `Invalid URL` failure, the old Tailwind glob and the old password placeholder. Fixed.
3. **ISSUE-003: the generated Electric proxy produced a malformed HTTP response** — `transfer-encoding: chunked` relayed over a fixed-length body, so every dictionary shape request answered 500. Fixed.

## Console Health

| Error | Where | Count | Status |
|-------|-------|------:|--------|
| `An error occurred while syncing collection: dictionary:<table> … TypeError: Failed to construct 'URL': Invalid URL` | deployed stack, every page load | 6 (one per dictionary collection) | fixed — ISSUE-002 |
| `Failed to load resource: the server responded with a status of 500` (`/api/v1/shape`) | deployed stack, every page load | 6 | fixed — ISSUE-003 |
| `net::ERR_CONNECTION_RESET` for `fonts.googleapis.com` and `us.i.posthog.com` | every page | — | **environment, not a defect**: this sandbox blocks both hosts |
| `401 GET /api/auth/me` before sign-in | browser application | 1 | **not a defect**: the pre-session probe the sign-in screen makes |

## Summary

| Severity | Count |
|----------|------:|
| Critical | 0 |
| High | 3 |
| Medium | 1 |
| Low | 0 |
| Informational | 4 |
| **Total** | **8** |

---

## Issues

### ISSUE-001: every `validation-error` rule was inert in the browser application

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | functional |
| **Where** | `guide/run-in-browser.html` — the WebAssembly application, for every model |
| **Fix** | `packages/generator/templates/wasm/server/lib/rules.js` |

**Description.** The rules compiler translates EML's `validation-error` into the
runtime's own vocabulary, `prevent`, because that is what the NestJS stack
refuses a write on (`rules.service.ts` checks `ruleAction.type === 'prevent'`).
The browser runtime classified a matched row by the same cell and recognised only
`reject` and `error`, so a `prevent` row fell through the chain into
`notifications` — and `bus.routes.js` refuses a write on `violations` alone. The
rule matched, the write was stored, and the caller got a 200.

It fails in the way that is hardest to notice: the rule is seeded into
`sys_rule_definitions`, listed in the application's own **Business Rules**
screen, and drawn by the viewers. It simply refuses nothing.

**Repro (before the fix), against the Education Management System model:**

| Request | Expected | Actual |
|---|---|---|
| `PUT /api/bus/student/<id>` with `status: withdrawn`, `withdrawal_reason: null` | refused — `requireWithdrawalReason` | **200**, record written |
| `POST /api/bus/attendancerecord` with `status: late`, `minutes_late: null` | refused — `requireMinutesLate` | **201**, record written |
| `POST /api/bus/payment` with `amount: 999999`, `balance_before: 10` | refused — `refuseOverpayment` | **201**, record written |

The `transform` and `trigger-workflow` halves of the same table worked
throughout — an application created with `prior_attainment_score: 82` came back
banded `priority`, and one with no score came back `review` — which is what
narrowed this to the refusal branch rather than to the engine.

**After the fix, same three requests, same model, same page:**

| Request | Result |
|---|---|
| `withdrawn` with no reason | **422** — *"A business rule refused this change"*, violation `studentRecordControl / prevent / A withdrawal needs a reason — the retention report is built from it."* |
| `withdrawn` with a reason | **200** |
| `late` with no minutes | **422** |
| `late` with `minutes_late: 7` | **201** |
| payment over the balance | **422** |
| payment within the balance | **201** |

**Regression test.** `packages/generator/src/rules/__tests__/browser-runtime-honours-prevent.test.ts`
compiles a directive with the real compiler and evaluates it with the real
browser engine, so the two runtimes are held to the same meaning rather than to
each other's spelling. Reverting the one-line fix fails it.

---

### ISSUE-002: the deployable zip shipped a bug the generator had already fixed

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | functional |
| **Where** | `assets/vendor/stack-templates.json` on the live site |
| **Fix** | rebuilt with `bun run build:stack-templates` and re-vendored |

**Description.** The zip's 466 files come from `stack-templates.json`, not from
`appwithai-fullstack.js`. The site's copy was **three files behind** this
repository — exactly commit `6140922`, *"Fix Electric sync, the Tailwind glob and
the password placeholder in generated apps"*:

```
tanstack-start-nestjs/frontend/src/lib/sys-collections.ts
tanstack-start-nestjs/frontend/src/routes/auth/login.tsx
tanstack-start-nestjs/frontend/tailwind.config.js
```

So every deployable zip downloaded from appwithai.org — and every chapter-10
WebContainer run, which mounts the same file map — carried a `SHAPE_URL` that is
a *relative* path. The Electric client hands it to `new URL(...)` with no base,
which throws, and the console filled with
`TypeError: Failed to construct 'URL': Invalid URL`, once per dictionary
collection, before a single shape request left the browser. Observed in the
`docker compose` run of the first zip.

**Fix and verification.** `build:stack-templates` rebuilt the file (353
templates, 3 changed) and it was copied to the site repository. The zip
downloaded after that carries `SHAPE_PATH` — the fixed shape — and the
`Invalid URL` error is gone from the console of a fresh `docker compose up
--build`.

**Note for whoever re-vendors next.** The site's `CLAUDE.md` says the five
generator artifacts move together. Four of them (`checker.js`, `fixer.js`,
`appwithai-wasm.js`, `appwithai-fullstack.js`) were byte-identical to this
repository's builds; `stack-templates.json` was not, and it is the one that is
**gitignored upstream**, so nothing compares it. That is why it drifted.

---

### ISSUE-003: the generated Electric proxy produced a malformed HTTP response

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | functional |
| **Where** | the deployed stack — `GET /api/v1/shape`, every dictionary collection |
| **Fix** | `packages/generator/templates/tanstack-start-nestjs/backend/src/modules/electric/electric.controller.ts.hbs` |

**Description.** With ISSUE-002 fixed, the shape requests finally left the
browser — and every one of them answered **500**. The backend's own log recorded
the same requests as **200**, which is the shape of a relay fault rather than an
upstream one.

The proxy copies every upstream header and then sends the body it read with
`fetch`. Electric answers `transfer-encoding: chunked`; `fetch` consumes the
chunking and hands back a decoded buffer. The relayed response therefore
announced chunked framing and carried a fixed-length body — a response nothing
downstream can read. Reproduced outside the browser: a plain `fetch` from Node
to the backend's shape endpoint fails with `UND_ERR_HTTP_PARSER` while the body
visibly contains Electric's rows. The generated front end's own `/api` proxy
turns the same refusal into the browser's 500, with the upstream's `electric-*`
headers still attached, so the failure reads like an Electric problem.

**Fix.** The relay now drops `transfer-encoding`, `content-encoding`,
`content-length`, `connection` and `keep-alive`, and keeps everything else —
including the `private, no-store` cache header the proxy sets deliberately,
because a shape response is computed for one role.

**Regression test.**
`packages/generator/src/templates/__tests__/electric-proxy-framing.test.ts`.

---

### ISSUE-004: child entities appear on the deployed dashboard as a "General" group

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | ux |
| **Where** | the deployed stack's dashboard |
| **Status** | **deferred** — see below |

**Description.** `%%entity <Child> parent: <Parent>` says a child has no life
away from its parent, and §3.3.1 is explicit that a category lists what appears
on the dashboard and a child does not. The browser runtime implements exactly
that (`ui/main.js`: `state.entities.filter((entity) => !entity.parentEntity)`)
and its dashboard shows 15 cards for this model's 19 entities.

The deployed NestJS dashboard shows all 19: `AssessmentResult`,
`AttendanceRecord`, `FeeInvoiceLine` and `StudentGuardian` are bucketed into a
**GENERAL (4) — "Entities not assigned to a specific category"** group, which is
a screen listing every invoice line ever written.

**Why it is deferred rather than fixed.** The two stacks disagree because the
NestJS side has no idea which entities are children: `resolveCategories()` is
handed only entity *names*, and the generated dictionary has nowhere to record a
parent — `sys_tab.parent_column_id` exists in the migration and nothing fills it.
Filtering at the one endpoint that renders the dashboard would leave the same
entities in the seed's fallback sweep (`WHERE sys_category_id IS NULL AND
table_name LIKE 'bus_%'`), so a correct fix carries the parent into the
dictionary and reads it in both places. That is a change to the generated
dictionary rather than a QA repair, and it is not something this run could
validate to the standard of the three above.

---

## Informational — checked, not defects

| # | Observation |
|---|---|
| INFO-1 | **A handler name serves one event per entity.** `%%hook afterCreate recalculateInvoiceTotal` and `%%hook afterUpdate recalculateInvoiceTotal` on the same entity: the compiler keeps the first and says so, because a handler name is a function name in the generated per-entity module. It is intended, and `compile-hooks.spec.ts` asserts it. The model was corrected to name one handler per event (`addLineToInvoiceTotal`, `recalculateInvoiceTotal`, `removeLineFromInvoiceTotal`), after which the generator reported nothing skipped. |
| INFO-2 | **The browser application does not enforce state-machine topology.** `graduated → enrolled`, an edge this model never draws, was accepted with a 200 there; the deployed stack refuses the same write with `403 Invalid transition: 'bus_student' has no edge from 'withdrawn' to 'enrolled'`. This is documented (`llms-full.txt` §5.2 names the stack deliberately), and the browser runtime records the crossing as `status: unmodelled` in `sys_workflow_runs` rather than refusing it. Worth knowing before demonstrating a lifecycle in a browser tab. |
| INFO-3 | **Seeded sample rows do not satisfy the model's own rules.** The browser application's 190 rows include students with `status: enrolled` carrying a `withdrawn_on`, and `year_group` values like 93 for a school that teaches years 7–13. Seeds honour `%%enum` (documented) but not `%%action` rules and not numeric ranges, which EML has no syntax for. Not a defect; it does mean a demonstration should create its own record rather than point at row four. |
| INFO-4 | **`try-it-yourself.html` reveals its cards with an IntersectionObserver.** A full-page screenshot shows six of the nine cards blank, which reads like a bug and is not one: scrolling to each card reveals all nine (verified). The content is nonetheless invisible without JavaScript and in print, and there is no `prefers-reduced-motion` path. Left alone — it is site-wide, pre-existing, and outside what this run was asked to change. |

## What was verified and found working

- **The conversion page.** 25 same-origin links, all 200. No console error that is not this sandbox blocking Google Fonts or PostHog. No horizontal overflow at 1440px or at 390px.
- **The authoring protocol.** `llmdetailed.txt` §10 run end to end for an Education Management System: 19 entities, 178 columns, 31 relationships, 25 enums, 11 state machines, 10 rule sections, 5 sagas, 19 hooks, 8 roles, 68 `%%rbac` directives, 40 `%%report` directives. **0 errors, 0 warnings** from `language/checker.ts`, from the published `guide/check-model.mjs`, and from the viewers' own copy; **20/20** from the site's `scripts/check-model.mjs` scorer.
- **The browser application.** Generated (43 files, 190 sample rows) and booted on PGlite in ~160s. Sign-in as the administrator, 15 dashboard cards in 7 categories, the dictionary, the manual, entity lists with real display values, record detail, create and read back, audit and workflow endpoints all 200.
- **The role matrix, three ways.** The generated sign-in screen, the viewers' Access tab and the model itself agree: principal 19 of 19, registrar 17, head of department 12, teacher 12, finance officer 11, guardian 11, counsellor 10, admissions officer 8. No role signs in to an empty application.
- **The deployable zip.** 466 files, 1.4MB. `docker compose up --build` brings up PostgreSQL (pgvector), Electric, the NestJS API and the TanStack Start front end; migrations and seeds run on a fresh volume; the backend goes healthy; sign-in works; business rules refuse (`400 Business rule validation failed`) and allow correctly; and the state machine refuses an undrawn edge with a 403 that names the edge.

## Fixes Applied

| Issue | Fix status | Files |
|-------|-----------|-------|
| ISSUE-001 | **verified** — before/after through the real application | `packages/generator/templates/wasm/server/lib/rules.js`, `packages/generator/src/generators/wasm/runtime-assets.generated.ts`, `html/assets/appwithai-wasm.js`, site `assets/js/appwithai-wasm.js` |
| ISSUE-002 | **verified** — the new zip carries the fixed file and the console error is gone | site `assets/vendor/stack-templates.json` |
| ISSUE-003 | **verified** — shape requests answer 200 and the dictionary syncs | `packages/generator/templates/tanstack-start-nestjs/backend/src/modules/electric/electric.controller.ts.hbs`, site `assets/vendor/stack-templates.json` |
| ISSUE-004 | **deferred** — reason above | — |

**How the rebuilt bundle was produced.** `html/assets/appwithai-wasm.js` is a
`Bun.build` output, and this repository's `--check` refuses a rebuild on a
different runtime because the bytes would be wrong for CI. It was therefore
rebuilt in `oven/bun:1.4.0` — the version `.github/workflows/ci.yml` pins — on
`linux-x64`, and all five `--check` comparisons pass afterwards.

## Regression Tests

| Issue | Test file | Status |
|-------|-----------|--------|
| ISSUE-001 | `packages/generator/src/rules/__tests__/browser-runtime-honours-prevent.test.ts` | committed — 4 cases; fails on the pre-fix runtime |
| ISSUE-003 | `packages/generator/src/templates/__tests__/electric-proxy-framing.test.ts` | committed — 3 cases |
| ISSUE-004 | — | deferred with the issue |

## Ship Readiness

| Metric | Value |
|--------|-------|
| Health score | 73 → 97 |
| Issues found | 8 (3 high, 1 medium, 4 informational) |
| Fixes applied | 3 (all verified) |
| Deferred | 1, with the reason written down |

**Two repositories move together here.** The generator fix is only in front of a
reader once the site re-vendors, and the site's re-vendored
`stack-templates.json` is only correct because the template fix landed first.
