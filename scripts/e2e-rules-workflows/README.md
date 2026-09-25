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

| Spec | What it proves |
|---|---|
| `01-business-rules-editor` | Every rule in `scenarios/business-rules.json` is built through every control, **tested with values**, saved, reloaded and read back. An `%%action` rule opens as its table and keeps its flowchart. The model still checks clean |
| `02-workflow-editors` | Every workflow in `scenarios/workflows.json`: a Lifecycle's hooks, a Status machine's states and drawn transitions, a Process with **every step type**. Stored as the runtime reads it: a Create step's values as one JSON map, an Update on another record type with its target, a web-service body on one line |
| `03-editor-help` | The Markdown help opens from the Help button and from each editor, on that editor's page |
| `04-git-history-and-yaml-projection` | A Logic save is a git commit; the diff names what was added; the YAML projection the AI assistant reads lists it; restoring the earlier commit removes it |
| `05-enhance-page-rules` | The Enhance page's Business Rules tab opens an `%%action` rule as its table and writes an edit back into the `%%action` line |
| `06-generated-app-editors` | In the generated app: Business Rules offers the app's own entities and a rule built there is **enforced** (the write it forbids answers 400 with its message); Automations keeps everything across a reload; Report Designs opens and prints for **every** entity, and a customised layout is what Print uses |

## Testing a new rule or workflow

Add an object to `scenarios/business-rules.json` or `scenarios/workflows.json`;
no code changes are needed. A rule names its entity, event, priority, input
fields, outcome labels, rows and the test values it must answer. A workflow
names its kind and either hooks, states and transitions, or steps. Each step
uses the words its inspector shows (`"type": "Update a field"`, `"target":
"fee_invoice_id"`). Each scenario file's `$comment` field documents its shape.

Controls are found by the words on the screen, never by position, so a field
added to an inspector does not break every step after it.
