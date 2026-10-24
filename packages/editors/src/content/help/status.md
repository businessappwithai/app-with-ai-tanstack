# Status state machines

A status state machine lists the **statuses a record can be in** and the
**moves allowed between them**. For example, an invoice goes `draft → issued →
paid`, or `issued → cancelled`, and nothing else.

**Nobody changes a status by hand.** The status column is system-managed: the
record's form shows it read-only in its header, the list always shows it as a
column, and a person's write that changes it is refused — administrators
included. Only background workflows move a record: a rule notices the fact a
move depends on (an `approved_at`, a `paid_at`) and starts a saga whose
`UpdateEntity` step writes the new status.

Even a workflow may only move along an arrow you drew. A move the diagram does
not contain is not a move the process has, and the application refuses it.

## Building one

1. Click **+ Status**.
2. Type a **Name**, e.g. `Invoice Lifecycle`, and choose the **Entity** whose
   status column it governs.
3. The canvas starts with one state, `draft`, marked as where records start.
4. **Add state** adds another. Click a state and rename it in the panel on
   the right. The name is the value stored in the status column, so use the
   same spelling as the entity's `%%enum`, e.g. `issued`, `part_paid`.
5. **Draw a move**: drag from the dot on the **right** of one state to the dot
   on the **left** of another. The arrow means *a record in this status may
   move to that one*.
6. Click an arrow to give it an optional **Trigger**, the name of the action
   that makes the move, e.g. `issue` or `cancel`. It becomes the arrow's label.

## The state panel

| Control | What it does |
| ------- | ------------ |
| **Status value** | The value written to the status column. |
| **Records start here** | The status a new record gets. Exactly one state carries it. |
| **The process finishes here** | Marks an end state, such as `paid` or `cancelled`. At least one is required. The orange notice *"No finishing state"* disappears once one is marked. |
| **Delete state** / **Delete transition** | Removes the selected state, together with every arrow into and out of it, or removes the selected arrow. |

Use the **＋ / − / fit** controls in the corner of the canvas to zoom. Drag a
state to move it; its position has no effect on how the machine behaves.

## Good practice

- **Draw every real move, and only those.** If staff sometimes reopen a
  cancelled invoice, draw `cancelled → issued`. Otherwise that write is
  refused.
- **Match the enum.** A state whose name is not one of the column's enum
  values can never be reached by a real record.
- **Give every arrow a writer.** Each status a record can move into needs a
  saga that writes it, started by a rule on the fact that causes the move.
  The checker reports a status nothing writes.
- **Name the triggers.** A labelled arrow reads as a sentence in the generated
  screens (*"issue"*, *"cancel"*).

## Show EML

**Show EML** shows the `stateDiagram-v2` block that will be saved:

```
%%workflow InvoiceLifecycle entity: FeeInvoice kind: state
stateDiagram-v2
    [*] --> draft
    draft --> issued : issue
    issued --> paid
    paid --> [*]
```

`[*] -->` marks where records start and `--> [*]` marks an end state.
