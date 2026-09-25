# Status state machines

A status state machine lists the **statuses a record can be in** and the
**moves allowed between them**. For example, an invoice goes `draft → issued →
paid`, or `issued → cancelled`, and nothing else.

The generated application enforces it on every write. A write that changes the
status along an arrow you drew is allowed. A write that tries any other move is
refused, **for every user, administrators included**, because a move the
diagram does not contain is not a move the process has. (Who may make an
allowed move is a separate question, answered by the model's `%%rbac` lines.)

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
- **Name the triggers.** A labelled arrow reads as a sentence in the generated
  screens (*"issue"*, *"cancel"*), and the application offers only the moves
  that exist from a record's current status.

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
