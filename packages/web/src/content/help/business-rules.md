# Business rules

A business rule is a **decision the application makes about a record every time
it is written** — "an invoice with money still owed cannot be cancelled",
"stamp the admission band from the applicant's attainment", "when an
application is accepted, start enrolment".

You write it as a **decision table**: a few questions about the record on the
left, the answer on the right, one row per case. The generator compiles the
table into a GoRules decision graph that the application evaluates inside the
write, so a rule that refuses a write really does stop it.

## The settings at the top

| Field        | What it means |
| ------------ | ------------- |
| **Name**     | What people call the rule. It is also how a process's *Look up a rule table* step names it, so it is saved as a short identifier — `Late Fee Guard` becomes `lateFeeGuard`. |
| **Entity**   | The record type the rule reads and writes. The input pickers below list this entity's fields. |
| **Priority** | Order among rules on the same entity. **Lower runs first** — run an early validation before a later transform. |

> **Business rules run when a hook fires.** Go to the **Trigger.dev Workflows** tab, open a hook (e.g. `beforeCreate`, `beforeUpdate`), and attach the rule there. A rule defined here does nothing on its own until it is wired to a hook.

## How the table works

> Given **status** and **balance_due**, decide **Action** and **Message**

### Inputs — conditions on the entity's fields

Click **＋ input** (or the column header) to add an input column. A dropdown lists every field on the selected entity. Pick one — for example **status**. Each cell in that column is a check: type `"Cancelled"` to match that value, `> 0` to check a number, or leave it blank to match anything.

All checks in a row must fit for the row to apply. Rows are read **top to bottom** and the first row where every check fits is the answer — put the most specific case first.

### Outputs — what the rule does when a row fits

Click **＋ output** (or the column header) to add an outcome column. A dropdown lists the available output fields. The most common ones:

| Output field      | What it does |
| ----------------- | ------------ |
| **Action**        | `validation-error` blocks the write; `transform` changes a field; `trigger-workflow` starts a process. |
| **Message**       | The sentence shown to the user when a `validation-error` fires. |
| **Workflow Name** | For `trigger-workflow` — which process to start. |
| **Field / Value** | For `transform` — which field to set and what value to write. |

A row where all checks are blank matches *everything*. Put it last as a catch-all default.

### Writing a check in a cell

| Type in the cell   | It fits when the field…              |
| ------------------ | ------------------------------------ |
| *(blank)*          | is anything at all                   |
| `"cancelled"`      | equals `cancelled`                   |
| `= 3` or `3`       | equals 3                             |
| `!= "paid"`        | is not `paid`                        |
| `> 0`, `>= 70`     | is greater than / at least the number |
| `< 70`, `<= 100`   | is less than / at most the number    |

Put text values in double quotes. Numbers are compared as numbers, so `> 0`
never fits an empty field.

### The outcomes

| Outcome           | Use it for |
| ----------------- | ---------- |
| **Action**        | What happens. `validation-error` refuses the write; `transform` changes a field on the record being written; `trigger-workflow` starts a process. |
| **Message**       | The sentence the user sees when a `validation-error` refuses their write. Write it for them: *"An invoice with a balance cannot be cancelled."* |
| **Workflow Name** | For `trigger-workflow`: the process to start, e.g. `AdmissionToEnrolment`. |
| **Field** / **Value** | For `transform`: the column to set and the value to put in it. |
| **Target Entity** / **Link Field** | For rules that reach a related record. |
| **Rule ID**       | An identifier for the row, shown in logs. Optional. |

## Moving, removing and adding rows

- **＋ Add row** adds a row at the bottom.
- **↑** / **↓** at the end of a row move it up or down. Remember the first
  fitting row wins, so moving a row changes the rule's meaning.
- **✕** removes the row.

## Try it before you save

**Test with values** has a box for each input. Type a value the way a record
would hold it and the panel names the row that fits and the answer it gives.
If it says *"No row fits these values"*, the rule returns nothing for that
record. Usually that means a catch-all row is missing.

**Coverage check** warns about gaps: an input that reads no field, an outcome
with no name, or combinations of values that reach no row.

Rows compiled from `%%action` lines hold whole expressions such as
`has_sibling_enrolled == true`. The application evaluates those; the test panel
only understands the simple checks in the table above.

## Rules that came from the model

A rule written by hand in the `.mmd` opens in one of three ways:

1. **Written with `%%action` lines**, as most of the education model's rules
   are. It opens as the table those actions compile to. Editing it rewrites the
   `%%action` lines in place, and the flowchart drawn above them is kept.
2. **A table this editor wrote** (`%%decision-table`). It opens exactly as it
   was saved.
3. **Only a flowchart**, like *Admission Assessment*. Such a rule has no
   outputs: it documents a judgement and changes nothing. If the editor can read
   the flowchart as a table, it offers **Convert to a decision table**.
   Otherwise the flowchart is shown read-only and saved back untouched.
   **Start an empty table instead** throws the flowchart away, so use it only
   when you mean to re-enter the logic by hand.

## Show EML

**Show EML** shows the `%%rule` line and body this rule will be saved as, which
is exactly what goes into the model.

## Worked example — *Late Fee Guard*

1. Rules → **New**. Name it `Late Fee Guard`, Entity **FeeInvoice**, Priority `25`.
2. Pick the input field **status**, then **＋ input** and pick
   **balance_due**.
3. Pick the outcome **Action**, then **＋ outcome** and pick **Message**.
4. **＋ Add row**. In row 1 type `"cancelled"` under status and `> 0` under
   balance_due, choose `validation-error`, and write the message.
5. Leave the last row blank. That is the *Otherwise* row, and it lets every
   other update through.
6. Under **Test with values** type `"cancelled"` and `50`. The panel should say
   **Row 1 fits**. Then **Save**.
