# Business rule and workflow editor E2E

End-to-end Playwright tests for the **business rule editor** and the **workflow
editors** (Lifecycle, Status, Process), and nothing else. They drive the
editors in Chromium the way an author does, then check what was saved against
what the generator and the generated runtime read.

```bash
bun run test:e2e:rules-workflows                 # the modelling tool (01–05)
bun run test:e2e:rules-workflows -- --generated  # also generate, boot and test the app (06)
bun scripts/e2e-rules-workflows/run.ts --model path/to/other.eml.mmd --generated
bun scripts/e2e-rules-workflows/run.ts -- --grep "Report Designs"   # after `--`: Playwright flags
```

`--generated` needs `DATABASE_URL`. It creates `<db>_rules_workflows_e2e`
beside it, generates the model with the real pipeline, migrates and seeds, and
starts the generated backend (4701) and front end (4700). The app runs without
the modelling tool's `VITE_*`, `DATABASE_URL`, `PORT` and auth variables, even
from a shell that has sourced the tool's `.env`: Vite prefers a process variable
to the app's own `.env`, and an inherited `VITE_API_URL` once sent every
dictionary call to the tool. `--no-server` uses a
modelling tool that is already running. `PLAYWRIGHT_CHROMIUM_PATH` points at a
Chromium on the machine when Playwright cannot download its own.

## What each spec holds

> **Specs 01–06 are not in this repository.** The root `.gitignore` excludes
> `*.spec.ts` outside a few named paths and this directory was never one of
> them, so only the config, helpers and scenarios were committed — and
> `bun run test:e2e:rules-workflows` found no tests. The ignore now allows
> `scripts/e2e-rules-workflows/specs/*.spec.ts`. The rows for 01–06 below
> describe what those specs were written to hold; if you have them locally,
> add them. 07 and 08 are committed.

| Spec | What it proves |
|---|---|
| `01-business-rules-editor` | Every rule in `scenarios/business-rules.json` is built through every control, **tested with values**, saved, reloaded and read back. An `%%action` rule opens as its table and keeps its flowchart. The model still checks clean |
| `02-workflow-editors` | Every workflow in `scenarios/workflows.json`: a Lifecycle's hooks, a Status machine's states and drawn transitions, a Process with **every step type**. Stored as the runtime reads it: a Create step's values as one JSON map, an Update on another record type with its target, a web-service body on one line |
| `03-editor-help` | The Markdown help opens from the Help button and from each editor, on that editor's page |
| `04-git-history-and-yaml-projection` | A Logic save is a git commit; the diff names what was added; the YAML projection the AI assistant reads lists it; restoring the earlier commit removes it |
| `05-enhance-page-rules` | The Enhance page's Business Rules tab opens an `%%action` rule as its table and writes an edit back into the `%%action` line |
| `06-generated-app-editors` | In the generated app: Business Rules offers the app's own entities and a rule built there is **enforced** (the write it forbids answers 400 with its message); Automations keeps everything across a reload; Report Designs opens and prints for **every** entity, and a customised layout is what Print uses |
| `07-rule-kinds-and-try-it` | The Enhance page's rule editor has no "Runs when" (a workflow's hook gives a rule its moment), and the dry-run route behind **Try it** and the Simulator: refuses nobody and a stranger, runs a real graph and says what it would do, and refuses a function that reaches for the network |
| `09-rule-graph-builder` | A rule built from nothing in the graph editor: the first node is the **Record** (never "Request"), no starter cards; **Record**, **Expression**, **Decision table**, **Function**, **Switch** and **Response** added from Components and joined; each configured. The Record's schema is the entity's own fields; an input is picked from them and no others; a status offers only its state machine's states; an answer is one of three, never `trigger-workflow`; Monaco comes from the application, not a CDN. Run in the Simulator and in **Try it**, saved, and read back from the model. Every step attaches a screenshot |
| `08-generated-rule-kinds` | Needs `--generated --model scripts/e2e-rules-workflows/models/rule-kinds.eml.mmd`. A generated helpdesk obeys a table, an expression and a function (each refuses a write with its own message), and a switch that starts a process whose step marks the record — while an ordinary ticket starts nothing. The author's hook handlers (`models/rule-kinds.handlers/`) are installed over the generated stubs, so it also asserts hook → rule → process (a `beforeCreate` hook raises the score the rules then read) and `beforeCreate` before `afterCreate` |

## Testing a new rule or workflow

Add an object to `scenarios/business-rules.json` or `scenarios/workflows.json`;
no code changes are needed. A rule names its entity, event, priority, input
fields, outcome labels, rows and the test values it must answer. A workflow
names its kind and either hooks, states and transitions, or steps. Each step
uses the words its inspector shows (`"type": "Update a field"`, `"target":
"fee_invoice_id"`). Each scenario file's `$comment` field documents its shape.

Controls are found by the words on the screen, never by position, so a field
added to an inspector does not break every step after it.
