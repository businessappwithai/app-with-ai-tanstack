---
name: browser-workflow-builder
description: Write a workflow (a process) in a generated application's Admin → Rules and workflows screen using only the browser — a trigger, checks, rule lookups, every formula operation, create/update/delete steps, a repeat and a web-service call — then test it only in the browser by driving real records through the app's forms and reading Run History. Use when asked to build, demonstrate or QA a workflow "through the editor", "in the browser", or "step by step", or to check that every step type works.
---

# Workflows, built and tested in the browser

A process is built in the generated application at **`/admin/automations`**
(Admin → Rules and workflows → *Other kinds: process*), in the automation builder:
one sentence of a trigger, conditions that must all pass, and an ordered list of
steps. It is tested by doing in the app what a person would do — open a record, edit
it, save — and reading what the process did off the app's own screens.

Two scripts beside this file are the worked example and run as they are:

| Script | What it does |
|---|---|
| `examples/build-close-out-playbook.cjs` | Builds "Deal Close-Out Playbook" on Opportunity with all eight kinds of step and all six formula operations, a screenshot after each, saves, reloads, reopens, shows the EML |
| `examples/drive-a-deal-to-closed-won.cjs` | Takes one opportunity through every stage in the record form, then edits the won deal so the playbook runs |

```bash
BASE_URL=http://127.0.0.1:4000 SHOTS_DIR=/tmp/build node examples/build-close-out-playbook.cjs
BASE_URL=http://127.0.0.1:4000 SHOTS_DIR=/tmp/test OPPORTUNITY_ID=<uuid> node examples/drive-a-deal-to-closed-won.cjs
```

Playwright and Chromium are preinstalled (`require('playwright')`). A generated app must
be running — see `generate-and-run-app`; sign in at `/auth/login`.

## Building it

The builder's controls are all labelled; drive them by label, never by position.

- **Helpers** (copy from the example): `field(label)` finds the control under a
  `<label>` in the right-hand inspector (`aside`, last); `set(label, value)` selects or
  fills it, and **waits for a select's option to exist first** — the field and record
  lists fill in only after the record type is chosen, and a value set too early is
  silently lost (the editor then says the step is "missing a field to write").
- **New process**: the `process` button in the rail, then `input[aria-label="Name"]`.
- **Trigger**: `Record type`, `What starts it` (`The record's own lifecycle`), `On which
  write` (`Created` / `Updated` / `Deleted` / `Any write`).
- **Steps**: `＋ Add a condition or an action` opens a menu of eight —
  `A check`, `A repeat`, `Look up a rule table`, `Create a record`, `Update a field`,
  `Delete a record`, `Work out a value`, `Call a web service`. Match the menu item with
  `new RegExp('^\\S*\\s*' + kind)` (each starts with an icon).
- **Values**: a record's own field is `{{opportunity.amount}}` (entity lower-cased) or
  `{{amount}}`; an earlier step's result is `{{resultName}}`. Formula: `Operation`
  (`set`, `copy`, `add`, `subtract`, `multiply`, `divide`), `Value to work from`,
  `And this value`, `Save the answer as`. Create: `Columns to set` as `column: value`
  lines. Update/Delete: `Which record`.
- **A repeat brings a placeholder step** (`Set a field to …`) — click it and fill it, or
  the process cannot be saved. Steps added inside use `Add a step inside this repeat`.
- **Look up a rule table**: pick a rule that **decides** — a `%%action` table or a
  graph with conditions. A `%%rule` drawn as a flowchart has no conditions; the step
  reports that it decides nothing.
- The rail keeps a banner, `N things to fix before publishing`, or `ready`. Read it
  after every step and print the problems — it is the editor's own validator.
- **Save** (`Save`, exact), then **reload and reopen** from the rail to prove it was
  stored. `Show EML` shows what was written. The rail's delete button is labelled with
  the **slugified** name (`Delete DealCloseOutPlaybook`); click it with `force: true`
  and `Save` to remove an earlier copy.

To change one step later: open the process, click its card by its `Step N` label
(`getByText(/step 1$/i)` — the label is upper-cased by CSS), change the inspector, `Save`.

## Testing it — browser only

1. **Pick a record that can take the path.** Seeded rows may carry values that send it
   somewhere else (a deal whose `closed_lost_at` is already set goes to Closed Lost on
   its first edit). Choose one whose facts are empty, or make one in the app's form.
2. **Drive it the way a person would**: open `/<entity>/<id>`, `Edit`, fill the inputs
   by id (`#qualification_at`), `Save Changes`, reopen. **A state is never typed** —
   record the fact the move rests on (`<state>_at`), and the state badge
   (`[data-testid=record-state]`) follows.
3. **Know when it runs**: an `Updated` process whose check is `stage is closed_won` runs
   on the **next person's edit after** the deal is won, not on the write that wins it —
   the stage is written by a saga after that write commits. Edit once more.
4. **Read what it did, on screen**:
   - **Admin → Run History** (`/admin/workflows`): one row per run, its status, and each
     step's result when expanded (`skipped: …` names a step that did not do its job).
   - The records it touched: the record's own fields (`next_step`, `probability`), the
     related list or the entity's list for rows it created, and the absence of the row
     it deleted.
   - A web-service step: point it at something the browser can show, or check the run's
     `REST` entry (`status: 200`).
5. **Judge every step**, not the run: list each step with what it should have done and
   what the screen shows. A run marked `success` can still contain skipped steps.

Screenshot after every build step and every check, record video
(`recordVideo` on the context), and send both.

## Things that have bitten

- Watch `opportunity`-wide automations with no condition (the CRM's `ClosedWonHandoff`
  used to be one): they run on every edit and fill the lists you are checking.
- A rule that is live on the entity (one a rule test left active) can refuse the edits
  that drive the process. Deactivate test rules in Admin → Business Rules first.
- Clearing a date in the form used to be refused ("must be a valid date"); fixed in the
  generator — regenerate an older app if you meet it.
