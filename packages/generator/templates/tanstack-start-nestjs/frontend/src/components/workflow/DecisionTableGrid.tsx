import { Plus, X } from "lucide-react";
import {
  type DecisionColumn,
  type DecisionTable,
  newRowId,
  validateDecisionTable,
} from "../../lib/workflow/bpmn-model";

/**
 * A GoRules decision table, edited where it runs.
 *
 * Inputs and outputs are separated by colour rather than by a heading, because
 * the one thing a reader has to get right at a glance is which side of the
 * table they are on: the left is what is tested, the right is what is
 * published. Everything else is a grid.
 *
 * Cells are expressions, not values. An input cell is a unary test against its
 * column's field (`"critical"`, `> 5`, blank for "any"); an output cell is an
 * expression producing the value to publish (`1`, `'QA'`). Writing that out in
 * the placeholders is cheaper than making someone find the documentation.
 */
export interface DecisionTableGridProps {
  table: DecisionTable;
  onChange: (table: DecisionTable) => void;
  /** Column names of the triggering entity, offered as input fields. */
  entityColumns?: string[];
  /** Variables earlier steps publish — also readable as inputs. */
  availableVariables?: string[];
  readOnly?: boolean;
}

let columnCounter = 0;
const nextColumnId = (prefix: "i" | "o") => `${prefix}${(columnCounter++).toString(36)}x`;

export function DecisionTableGrid({
  table,
  onChange,
  entityColumns = [],
  availableVariables = [],
  readOnly = false,
}: DecisionTableGridProps) {
  const problems = validateDecisionTable(table);
  const readable = [...new Set([...availableVariables, ...entityColumns])];

  const patchColumn = (
    side: "inputs" | "outputs",
    index: number,
    patch: Partial<DecisionColumn>
  ) => {
    onChange({
      ...table,
      [side]: table[side].map((column, position) =>
        position === index ? { ...column, ...patch } : column
      ),
    });
  };

  const addColumn = (side: "inputs" | "outputs") => {
    const id = nextColumnId(side === "inputs" ? "i" : "o");
    onChange({ ...table, [side]: [...table[side], { id, name: "", field: "" }] });
  };

  const removeColumn = (side: "inputs" | "outputs", index: number) => {
    const removed = table[side][index];
    if (!removed) return;
    onChange({
      ...table,
      [side]: table[side].filter((_column, position) => position !== index),
      // Drop the cells too, or they linger in the JSON as orphans.
      rules: table.rules.map((row) => {
        const { [removed.id]: _dropped, ...rest } = row;
        return rest as typeof row;
      }),
    });
  };

  const patchCell = (rowIndex: number, columnId: string, value: string) => {
    onChange({
      ...table,
      rules: table.rules.map((row, position) =>
        position === rowIndex ? { ...row, [columnId]: value } : row
      ),
    });
  };

  const addRow = () => {
    const row = { _id: newRowId() } as DecisionTable["rules"][number];
    for (const column of [...table.inputs, ...table.outputs]) row[column.id] = "";
    onChange({ ...table, rules: [...table.rules, row] });
  };

  const columns = [...table.inputs, ...table.outputs];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          When more than one row matches
          <select
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground disabled:opacity-60"
            value={table.hitPolicy}
            disabled={readOnly}
            onChange={(event) =>
              onChange({ ...table, hitPolicy: event.target.value as DecisionTable["hitPolicy"] })
            }
          >
            <option value="first">take the first — rows read top to bottom</option>
            <option value="collect">collect them all</option>
          </select>
        </label>
        {!readOnly && (
          <>
            <button
              type="button"
              onClick={() => addColumn("inputs")}
              className="flex items-center gap-1 rounded-md border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-600 hover:bg-sky-500/20 dark:text-sky-300"
            >
              <Plus className="h-3 w-3" /> Input column
            </button>
            <button
              type="button"
              onClick={() => addColumn("outputs")}
              className="flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-300"
            >
              <Plus className="h-3 w-3" /> Output column
            </button>
          </>
        )}
      </div>

      <div className="max-h-[22rem] overflow-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            <tr>
              {table.inputs.map((column, index) => (
                <ColumnHeader
                  key={column.id}
                  column={column}
                  side="inputs"
                  options={readable}
                  readOnly={readOnly}
                  onPatch={(patch) => patchColumn("inputs", index, patch)}
                  onRemove={() => removeColumn("inputs", index)}
                />
              ))}
              {table.outputs.map((column, index) => (
                <ColumnHeader
                  key={column.id}
                  column={column}
                  side="outputs"
                  readOnly={readOnly}
                  onPatch={(patch) => patchColumn("outputs", index, patch)}
                  onRemove={() => removeColumn("outputs", index)}
                />
              ))}
              {!readOnly && <th className="w-8 bg-muted/40" />}
            </tr>
          </thead>
          <tbody>
            {table.rules.map((row, rowIndex) => (
              <tr key={row._id} className="border-t border-border hover:bg-muted/30">
                {columns.map((column) => {
                  const isInput = table.inputs.some((input) => input.id === column.id);
                  return (
                    <td key={column.id} className="border-r border-border/60 p-0 last:border-r-0">
                      <input
                        className="w-full bg-transparent px-2.5 py-2 font-mono text-[11.5px] text-foreground outline-none focus:bg-primary/5 disabled:opacity-70"
                        value={row[column.id] ?? ""}
                        disabled={readOnly}
                        placeholder={isInput ? "any" : "''"}
                        aria-label={`${column.field || column.id} for row ${rowIndex + 1}`}
                        onChange={(event) => patchCell(rowIndex, column.id, event.target.value)}
                      />
                    </td>
                  );
                })}
                {!readOnly && (
                  <td className="w-8 text-center">
                    <button
                      type="button"
                      aria-label={`Delete row ${rowIndex + 1}`}
                      className="p-1 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        onChange({
                          ...table,
                          rules: table.rules.filter((_row, position) => position !== rowIndex),
                        })
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <button
          type="button"
          onClick={addRow}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Add a row
        </button>
      )}

      {problems.length > 0 && (
        <ul className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11.5px] leading-snug text-amber-700 dark:text-amber-300">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}

      <p className="text-[11px] leading-snug text-muted-foreground">
        Cells are expressions. An input cell tests its column —{" "}
        <code className="font-mono">"critical"</code>, <code className="font-mono">&gt; 5</code>, or
        blank for any. An output cell produces the value to publish —{" "}
        <code className="font-mono">1</code>, <code className="font-mono">'QA'</code>. Blank output
        cells are saved as <code className="font-mono">''</code>, because the engine discards a row
        that leaves one unset.
      </p>
    </div>
  );
}

function ColumnHeader({
  column,
  side,
  options = [],
  readOnly,
  onPatch,
  onRemove,
}: {
  column: DecisionColumn;
  side: "inputs" | "outputs";
  options?: string[];
  readOnly: boolean;
  onPatch: (patch: Partial<DecisionColumn>) => void;
  onRemove: () => void;
}) {
  const input = side === "inputs";
  const tone = input
    ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

  return (
    <th className={`border-r border-border/60 p-0 text-left align-top last:border-r-0 ${tone}`}>
      <div className="flex items-center gap-1 px-2 pt-1.5">
        <span className="text-[9.5px] font-semibold uppercase tracking-wider opacity-80">
          {input ? "reads" : "publishes"}
        </span>
        {!readOnly && (
          <button
            type="button"
            aria-label={`Remove column ${column.field || column.id}`}
            className="ml-auto opacity-50 hover:opacity-100"
            onClick={onRemove}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <input
        className="w-full bg-transparent px-2 pb-1.5 font-mono text-[11.5px] font-semibold outline-none placeholder:font-normal placeholder:opacity-60 disabled:opacity-70"
        value={column.field}
        disabled={readOnly}
        list={options.length ? `${column.id}-options` : undefined}
        placeholder={input ? "column or variable" : "variable name"}
        aria-label={`${input ? "Input" : "Output"} column name`}
        onChange={(event) => onPatch({ field: event.target.value, name: event.target.value })}
      />
      {options.length > 0 && (
        <datalist id={`${column.id}-options`}>
          {options.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      )}
    </th>
  );
}
