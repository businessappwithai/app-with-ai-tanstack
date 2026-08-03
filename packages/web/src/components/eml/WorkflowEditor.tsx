import { AlertCircle, Code2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { emptyStateFlow, StateFlowCanvas } from "@/components/eml/StateFlowCanvas";
import { SagaBpmnEditor } from "@/components/eml/SagaBpmnEditor";
import {
  emitHookWorkflow,
  emitSagaFlow,
  emitStateFlow,
  emptySagaFlow,
  HOOK_HINTS,
  HOOK_TYPES,
  type SagaFlow,
  type StateFlow,
  validateHookWorkflow,
  validateSagaFlow,
  validateStateFlow,
  type WorkflowHook,
} from "@/lib/eml/workflow-flow";

/**
 * One workflow.
 *
 * Lifted out of the workflows step so it can sit beside the rule editor. A rule
 * decides and a process acts on what it decided; keeping them on separate
 * screens made that look like two unrelated pieces of work.
 */

export type WorkflowKind = "hook" | "state" | "saga";

export interface EditableWorkflow {
  /** Stable across renames, so React keeps the row it is editing. */
  key: string;
  name: string;
  entity: string;
  kind: WorkflowKind;
  title?: string;
  hooks: WorkflowHook[];
  states: StateFlow;
  saga: SagaFlow;
}

export function pascalWorkflowName(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9]+/g, " ").trim();
  if (!cleaned) return "Workflow";
  return cleaned
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

export function emptyWorkflow(kind: WorkflowKind, key: string, entity: string): EditableWorkflow {
  return {
    key,
    name: kind === "hook" ? "NewLifecycle" : kind === "saga" ? "NewProcess" : "NewStatus",
    entity,
    kind,
    hooks: [],
    states: emptyStateFlow(),
    saga: emptySagaFlow(),
  };
}

/** The diagram a workflow serialises to, whichever kind it is. */
export function emitWorkflowDiagram(workflow: EditableWorkflow): string {
  if (workflow.kind === "hook") return emitHookWorkflow(workflow.entity || "Entity", workflow.hooks);
  if (workflow.kind === "saga") return emitSagaFlow(workflow.saga);
  return emitStateFlow(workflow.states);
}

export function validateWorkflow(workflow: EditableWorkflow): string[] {
  if (workflow.kind === "hook") return validateHookWorkflow(workflow.entity, workflow.hooks);
  if (workflow.kind === "saga") return validateSagaFlow(workflow.saga);
  return validateStateFlow(workflow.states);
}

let hookCounter = 0;

export interface WorkflowEditorProps {
  workflow: EditableWorkflow;
  entityNames: string[];
  /** Rules the model declares, for a Decision step that names one. */
  ruleNames: string[];
  columnsFor: (entity: string) => string[];
  onChange: (patch: Partial<EditableWorkflow>) => void;
}

export function WorkflowEditor({
  workflow,
  entityNames,
  ruleNames,
  columnsFor,
  onChange,
}: WorkflowEditorProps) {
  const [showSource, setShowSource] = useState(false);
  const problems = useMemo(() => validateWorkflow(workflow), [workflow]);
  const pascal = pascalWorkflowName;

  const addHook = () => {
    onChange({
      hooks: [
        ...workflow.hooks,
        {
          id: `h${hookCounter++}`,
          type: "beforeCreate",
          handler: `handler${workflow.hooks.length + 1}`,
        },
      ],
    });
  };

  return (
    <>
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium">Name</span>
          <input
            className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
            value={workflow.title ?? workflow.name}
            onChange={(event) =>
              onChange({
                title: event.target.value,
                name: pascal(event.target.value),
              })
            }
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium">Entity</span>
          <select
            className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
            value={workflow.entity}
            onChange={(event) => onChange({ entity: event.target.value })}
          >
            <option value="">Choose…</option>
            {entityNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="mb-1 block text-xs font-medium">Kind</span>
          <p className="rounded-md border border-border bg-muted/40 px-2 py-1.5 text-sm">
            {workflow.kind === "hook"
              ? "Lifecycle handlers"
              : workflow.kind === "saga"
                ? "Multi-step process"
                : "Status state machine"}
          </p>
        </div>
      </div>

      {workflow.kind === "hook" ? (
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium">Lifecycle steps</h3>
            <button
              type="button"
              onClick={addHook}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted"
            >
              <Plus className="h-3 w-3" />
              Add step
            </button>
          </div>

          <div className="space-y-2">
            {workflow.hooks.map((hook, index) => (
              <div
                key={hook.id}
                className="grid grid-cols-1 gap-2 rounded-md border border-border p-2 md:grid-cols-[200px_1fr_160px_auto]"
              >
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium">When</span>
                  <select
                    className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                    value={hook.type}
                    onChange={(event) =>
                      onChange({
                        hooks: workflow.hooks.map((candidate, position) =>
                          position === index
                            ? { ...candidate, type: event.target.value }
                            : candidate
                        ),
                      })
                    }
                  >
                    {HOOK_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium">
                    Handler name
                  </span>
                  <input
                    className="w-full rounded-md border border-border px-2 py-1.5 font-mono text-sm"
                    value={hook.handler}
                    onChange={(event) =>
                      onChange({
                        hooks: workflow.hooks.map((candidate, position) =>
                          position === index
                            ? { ...candidate, handler: event.target.value }
                            : candidate
                        ),
                      })
                    }
                    placeholder="hashPassword"
                  />
                  <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                    {HOOK_HINTS[hook.type] ?? ""}
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium">
                    Field (optional)
                  </span>
                  <input
                    className="w-full rounded-md border border-border px-2 py-1.5 font-mono text-sm"
                    value={hook.field ?? ""}
                    onChange={(event) =>
                      onChange({
                        hooks: workflow.hooks.map((candidate, position) =>
                          position === index
                            ? { ...candidate, field: event.target.value || undefined }
                            : candidate
                        ),
                      })
                    }
                    placeholder="password"
                  />
                </label>

                <button
                  type="button"
                  aria-label="Remove step"
                  onClick={() =>
                    onChange({
                      hooks: workflow.hooks.filter((_h, position) => position !== index),
                    })
                  }
                  className="self-end pb-2"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}

            {!workflow.hooks.length && (
              <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                No steps yet. Add one to run a handler on this entity's lifecycle.
              </p>
            )}
          </div>
        </div>
      ) : workflow.kind === "saga" ? (
        <SagaBpmnEditor
          key={workflow.key}
          flow={workflow.saga}
          entityNames={entityNames}
          entityColumns={columnsFor(workflow.entity)}
          ruleNames={ruleNames}
          columnsFor={columnsFor}
          onChange={(saga) => onChange({ saga })}
        />
      ) : (
        <div className="h-[460px]">
          <StateFlowCanvas
            flow={workflow.states}
            onChange={(states) => onChange({ states })}
          />
        </div>
      )}

      {problems.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {problems.map((problem) => (
            <li key={problem} className="flex items-start gap-1.5">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              {problem}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setShowSource((current) => !current)}
        className="mt-3 flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium"
      >
        <Code2 className="h-3.5 w-3.5" />
        {showSource ? "Hide" : "Show"} EML
      </button>

      {showSource && (
        <pre className="mt-2 max-h-56 overflow-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
          {`%%workflow ${pascal(workflow.title ?? workflow.name)} entity: ${
            workflow.entity || "<entity>"
          } kind: ${workflow.kind}${
            workflow.kind === "saga"
              ? `${workflow.saga.trigger === "rule" ? " trigger: rule" : ""}${
                  workflow.saga.operation !== "CREATE"
                    ? ` operation: ${workflow.saga.operation}`
                    : ""
                }`
              : ""
          }\n${
            workflow.kind === "hook"
              ? emitHookWorkflow(workflow.entity || "Entity", workflow.hooks)
              : workflow.kind === "saga"
                ? emitSagaFlow(workflow.saga)
                : emitStateFlow(workflow.states)
          }`}
        </pre>
      )}
    </>
  );
}
