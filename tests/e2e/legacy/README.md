# Legacy end-to-end specs

These files are kept, not run. Nothing here is part of the suite that gates CI
(`tests/e2e/*.e2e.spec.ts`), and `playwright.config.ts` excludes this directory.

They are here rather than deleted because several contain assertions worth
porting. They are not in the default run because none of them can pass as
written, and a suite that cannot go green cannot gate anything.

## Why each one cannot run

| Path | Why |
|---|---|
| `complete-tests/*odata*`, `*ui5*` | Target the **OpenUI5 + OData V4** stack. The generator supports one stack now — `tanstackjs-nestjs` — so there is nothing for these to drive |
| `complete-tests/*tanstack-nestjs*`, `dictionary-*`, `field-metadata`, `school-mgmt-qa` | Expect a **generated application already running on :3002**. Nothing starts one; the suite gets `ECONNREFUSED` |
| `generator-tests/complete-generator.e2e-test.ts` | Same, plus it asserts against OpenUI5 screens |
| `simple-crm-business-rules.e2e.spec.ts` | Expects a **generated CRM on :3001** with a `qaadmin@test.com` account, provisioned by hand. Its coverage — business rules and workflow definitions — is now exercised far more thoroughly by the suite the generator emits, which CI runs against a real database |
| `project-permissions.e2e.spec.ts` | Hardcodes `http://localhost:5000`, which nothing serves, and its registration helper calls `test.browserContext`, which is not a Playwright API. It has never run |

## What replaced them

`tests/e2e/02-project-authorization.e2e.spec.ts` covers the ground
`project-permissions.e2e.spec.ts` aimed at — owner, signed-in stranger, and
anonymous caller across every project-scoped route — and runs. It found three
endpoints serving unauthenticated callers on its first execution.

What it does **not** yet cover, and what is worth porting from
`project-permissions.e2e.spec.ts`: sharing. A project shared read-only should be
visible to the member and refuse their writes; a read-write share should accept
them; removing a share should revoke access. Those three cases need a working
`/api/projects/:id/members` flow in the test, not the browser-context helper the
old file tried to use.

## Running one anyway

Provision whatever it expects, then point Playwright at this directory
explicitly:

```bash
bunx playwright test tests/e2e/legacy/<file> --config playwright.config.ts
```

The config's `testIgnore` will still exclude it. Copy the file out, or drop the
ignore locally — deliberately awkward, because a green run here means nothing
until its prerequisites exist.
