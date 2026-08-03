import { useId } from "react";
import type { WorkflowStep } from "../../lib/workflow/bpmn-model";

/**
 * The properties of one step.
 *
 * Each step type asks only for what it uses, and asks in the order someone
 * thinks: what does this act on, which row, what does it write, where does the
 * value come from. Fields that read a variable offer the ones earlier steps
 * publish, so passing a value between steps does not require remembering a
 * name exactly.
 */
export interface StepPropertyFieldsProps {
  step: WorkflowStep;
  entities: { name: string; tableName: string }[];
  /** Columns of whatever entity this step acts on. */
  columns: string[];
  ruleNames: string[];
  /** Variables published by steps that run before this one. */
  available: string[];
  readOnly: boolean;
  onChange: (props: Record<string, string>) => void;
  onOpenTable: () => void;
}

const FORMULA_OPERATIONS = ["set", "copy", "multiply", "divide", "add", "subtract"] as const;

export function StepPropertyFields({
  step,
  entities,
  columns,
  ruleNames,
  available,
  readOnly,
  onChange,
  onOpenTable,
}: StepPropertyFieldsProps) {
  const listId = useId();
  const props = step.props;
  const set = (key: string, value: string) => onChange({ ...props, [key]: value });
  const usesSavedRule = Boolean(props.rule?.trim());

  // These are called as functions, not rendered as JSX elements. Declaring them
  // as components inside the render body gave React a new component type on
  // every render, so it unmounted and remounted the input after each keystroke
  // — the field lost focus and the character with it, which made every text
  // property in this panel impossible to type into.
  const text = (
    label: string,
    name: string,
    options: { placeholder?: string; hint?: string; mono?: boolean } = {}
  ) => (
    <Field key={name} label={label} hint={options.hint}>
      <input
        className={`w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm disabled:opacity-60 ${
          options.mono ? "font-mono text-[12.5px]" : ""
        }`}
        value={props[name] ?? ""}
        disabled={readOnly}
        placeholder={options.placeholder}
        onChange={(event) => set(name, event.target.value)}
      />
    </Field>
  );

  const variable = (label: string, name: string, hint?: string) => (
    <Field key={name} label={label} hint={hint}>
      <input
        list={listId}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[12.5px] disabled:opacity-60"
        value={props[name] ?? ""}
        disabled={readOnly}
        placeholder={available[0] ?? "variable or column"}
        onChange={(event) => set(name, event.target.value)}
      />
    </Field>
  );

  const entityPicker = (label: string, hint?: string) => (
    <Field key="entity" label={label} hint={hint}>
      <select
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm disabled:opacity-60"
        value={props.entity ?? ""}
        disabled={readOnly}
        onChange={(event) => set("entity", event.target.value)}
      >
        <option value="">
          {step.type === "CreateEntity" ? "Choose…" : "the record that triggered this"}
        </option>
        {entities.map((entity) => (
          <option key={entity.tableName} value={entity.tableName}>
            {entity.name}
          </option>
        ))}
      </select>
    </Field>
  );

  const column = (
    label: string,
    name: string,
    options: { hint?: string; includeId?: boolean } = {}
  ) => {
    const choices = options.includeId ? ["id", ...columns] : columns;
    return (
      <Field key={name} label={label} hint={options.hint}>
        {choices.length > 0 ? (
          <select
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm disabled:opacity-60"
            value={props[name] ?? ""}
            disabled={readOnly}
            onChange={(event) => set(name, event.target.value)}
          >
            <option value="">Choose…</option>
            {choices.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[12.5px] disabled:opacity-60"
            value={props[name] ?? ""}
            disabled={readOnly}
            placeholder="column name"
            onChange={(event) => set(name, event.target.value)}
          />
        )}
      </Field>
    );
  };

  const rowTargeting = (verb: string) => (
    <>
      {column("Match rows on", "targetField", {
        includeId: true,
        hint: `Leave blank to ${verb} the record that triggered this workflow.`,
      })}
      {variable(
        "…against this variable",
        "targetSource",
        "A cross-entity write must name a row — the executor refuses to guess one."
      )}
    </>
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-3">
        {step.type === "Decision" && (
          <>
            <Field
              label="Where the table lives"
              hint="Inside this step, or in a rule you maintain elsewhere."
            >
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm disabled:opacity-60"
                value={usesSavedRule ? "rule" : "inline"}
                disabled={readOnly}
                onChange={(event) => {
                  if (event.target.value === "rule") {
                    const { decisionTable: _dropped, ...rest } = props;
                    onChange({ ...rest, rule: ruleNames[0] ?? "" });
                  } else {
                    const { rule: _dropped, ...rest } = props;
                    onChange(rest);
                    onOpenTable();
                  }
                }}
              >
                <option value="inline">In this step</option>
                <option value="rule">A saved rule</option>
              </select>
            </Field>

            {usesSavedRule ? (
              <Field label="Rule" hint="Evaluated as it stands when the workflow runs.">
                {ruleNames.length > 0 ? (
                  <select
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm disabled:opacity-60"
                    value={props.rule ?? ""}
                    disabled={readOnly}
                    onChange={(event) => set("rule", event.target.value)}
                  >
                    {ruleNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[12.5px]"
                    value={props.rule ?? ""}
                    disabled={readOnly}
                    placeholder="rule name"
                    onChange={(event) => set("rule", event.target.value)}
                  />
                )}
              </Field>
            ) : (
              <Field label="Table" hint="Edit it on the Decision table tab.">
                <button
                  type="button"
                  onClick={onOpenTable}
                  className="w-full rounded-md border border-primary/50 bg-primary/10 px-2 py-1.5 text-sm font-medium text-primary"
                >
                  Open the table
                </button>
              </Field>
            )}

            {text("Publish only", "publish", {
              placeholder: "leave blank to publish every output",
              hint: "Comma-separated, when the table decides more than this process needs.",
              mono: true,
            })}
          </>
        )}

        {step.type === "CreateEntity" && (
          <>
            {entityPicker("Insert into")}
            {text("Remember the new row's id as", "as", {
              placeholder: "newCapaId",
              hint: "Later steps reach the row through this name. Defaults to the entity name plus Id.",
              mono: true,
            })}
          </>
        )}

        {step.type === "UpdateEntity" && (
          <>
            {entityPicker("Entity")}
            {rowTargeting("update")}
            {column("Column to write", "field")}
            {text("Value", "value", { placeholder: "a literal" })}
            {variable("…or read it from", "source")}
          </>
        )}

        {step.type === "DeleteEntity" && (
          <>
            {entityPicker("Entity")}
            {rowTargeting("delete")}
            <Field
              label="How"
              hint="A hard delete leaves the audit trail pointing at a row that is gone."
            >
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm disabled:opacity-60"
                value={props.hard ?? "false"}
                disabled={readOnly}
                onChange={(event) => set("hard", event.target.value)}
              >
                <option value="false">Soft — stamp deleted_at</option>
                <option value="true">Hard — remove the row</option>
              </select>
            </Field>
          </>
        )}

        {step.type === "Formula" && (
          <>
            {text("Store the result in", "target", { placeholder: "slaDays", mono: true })}
            <Field label="Operation">
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm disabled:opacity-60"
                value={props.operation ?? "set"}
                disabled={readOnly}
                onChange={(event) => set("operation", event.target.value)}
              >
                {FORMULA_OPERATIONS.map((operation) => (
                  <option key={operation} value={operation}>
                    {operation}
                  </option>
                ))}
              </select>
            </Field>
            {(props.operation ?? "set") === "set" &&
              text("Value to stage", "value", {
                hint: "Stored unchanged, so a later step can be handed text and not only numbers.",
              })}
            {(props.operation ?? "set") === "copy" && variable("Copy from", "source")}
            {!["set", "copy"].includes(props.operation ?? "set") && (
              <>
                {variable("Read from", "source")}
                {text("Operand", "operand", { placeholder: "7", mono: true })}
              </>
            )}
          </>
        )}

        {step.type === "REST" && (
          <>
            {text("URL", "url", { placeholder: "https://hooks.example.com/notify", mono: true })}
            <Field label="Method">
              <select
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm disabled:opacity-60"
                value={props.method ?? "POST"}
                disabled={readOnly}
                onChange={(event) => set("method", event.target.value)}
              >
                {["POST", "PUT", "PATCH", "GET"].map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
      </div>

      {step.type === "CreateEntity" && (
        <Field
          label="Columns to set"
          hint={`A JSON object of column to value. A string naming a variable is substituted${
            available.length ? ` — ${available.slice(0, 3).join(", ")} are in scope` : ""
          }; anything else is written as-is.`}
        >
          <textarea
            className="h-24 w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[12px] disabled:opacity-60"
            value={props.fields ?? "{}"}
            disabled={readOnly}
            placeholder={'{"title":"capaTitle","status":"open"}'}
            onChange={(event) => set("fields", event.target.value)}
          />
        </Field>
      )}

      {step.type === "REST" && (
        <Field label="Body" hint="Interpolates {{variable}} from everything in scope.">
          <textarea
            className="h-20 w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[12px] disabled:opacity-60"
            value={props.bodyTemplate ?? ""}
            disabled={readOnly}
            placeholder={'{"id":"{{id}}"}'}
            onChange={(event) => set("bodyTemplate", event.target.value)}
          />
        </Field>
      )}

      <datalist id={listId}>
        {available.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && (
        <span className="mt-1 block text-[10.5px] leading-snug text-muted-foreground/80">
          {hint}
        </span>
      )}
    </label>
  );
}
