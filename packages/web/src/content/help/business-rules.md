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

## When a rule runs, and what it can do

Pick **Runs when** to say which write the rule judges: a record being created,
changed or deleted, or any write. The moments the editor offers are
`beforeCreate`, `afterCreate`, `beforeUpdate`, `afterUpdate`, `beforeDelete` and
`customValidate`. The generated application judges `beforeCreate` and
`afterCreate` the same way — it reads only *create*, *update*, *delete* or *any* —
so choose by what you mean, not by timing.

Here is what happens to one write, in order:

1. **Hooks** for that moment run first (a hook is code that prepares or checks
   the record — see the Lifecycle page).
2. **Your rules** run, lowest **Priority** first. A rule whose answer is
   `validation-error` stops the write here, and the user sees its message.
3. The record is saved.
4. The rules' other answers now take effect: `transform` changes the record,
   and `trigger-workflow` starts a process (see the Process page). Processes you
   set to start automatically start here too.

So a rule is how a hook or a process gets *decided*: the hook prepares the
record, the rule judges it, and the rule's answer can hand it on to a process.

## Pick the kind of rule that fits

Choose **Start from an example** to begin with a working rule instead of a blank
canvas. Each example checks the same thing — a required field — in a different
way, so you can compare them.

| Kind | Use it when | What it looks like |
| ---- | ----------- | ------------------ |
| **Decision table** | The cases are a list a person can read: *if status is cancelled and money is owed, refuse.* | Rows of checks on the left, answers on the right. |
| **Expression** | One formula works out the answer: *refuse when the total is below the deposit.* | Named values, each a formula over the record, e.g. `action = total < deposit ? "validation-error" : "allow"`. |
| **Function** | The logic needs loops, several steps or string work. | A few lines of JavaScript: `export const handler = async (input) => ({ action: "allow" })`. It sees the record as `input` and may not use `import`, `require`, `fetch`, `eval` or `process`. |
| **Switch** | Different records need different handling: *large amounts go to review, small ones are approved.* | A diamond that sends the record down the branch whose condition fits; each branch can be a table, expression or function. |
| **Start a workflow** | A match should start a process. | A table whose answer is `trigger-workflow` and a **Workflow Name**. |

You can chain them: an expression can work out `owed`, a table can judge it, and
a switch can route the result. Draw the nodes on the canvas and join them with
lines, from **Request** (the record) to **Response** (the answer).

**Whatever the last node produces is the rule's answer, and the application acts
on its `action`.** An answer with no `action` — say, only `total = 20` — does
nothing at all. This is the most common reason a first rule "does not work", and
**Try it** names it for you.

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

Under the editor, **Try it before you save** takes a sample record (filled in
for you — change any value), runs the rule exactly as the application would, and
says in a sentence what would happen to the write: *Blocks the write*, *Starts
the workflow*, *Changes status on the record*, or *Lets the write through*. It
also says when the rule returned something the application cannot act on, such
as a missing `action` or a `trigger-workflow` with no **Workflow Name**. **How it
got there** lists what each node produced, in order. Nothing is saved.

### Testing a plain table

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
