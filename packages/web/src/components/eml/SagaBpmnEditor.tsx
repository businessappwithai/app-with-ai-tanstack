import { useEffect, useMemo, useRef, useState } from "react";
import {
  BpmnWorkflowEditor,
  type BpmnWorkflowEditorHandle,
} from "@/components/workflow/BpmnWorkflowEditor";
import type { SagaFlow } from "@/lib/eml/workflow-flow";
import type { WorkflowStep } from "@/lib/workflow/bpmn-model";
import { sagaFlowToBpmn, stepsToSagaSteps } from "@/lib/workflow/saga-bpmn";

/**
 * A model-declared saga, edited on the bpmn canvas.
 *
 * The document is still the source of truth — this loads the `%%step`
 * directives into a diagram once, and writes every change back as steps. The
 * trigger stays outside the canvas because it belongs to the `%%workflow`
 * directive rather than to any step, and because it is the one decision that
 * changes whether the workflow runs at all.
 */
export interface SagaBpmnEditorProps {
  flow: SagaFlow;
  /** Entity names from the ERD, for the entity pickers. */
  entityNames: string[];
  /** Columns of the entity this workflow is triggered by. */
  entityColumns?: string[];
  /** Rules the model declares, for a Decision step that names one. */
  ruleNames?: string[];
  /** Columns per entity, so a step acting on another one still gets pickers. */
  columnsFor?: (entity: string) => string[];
  onChange: (flow: SagaFlow) => void;
}

export function SagaBpmnEditor({
  flow,
  entityNames,
  entityColumns = [],
  ruleNames = [],
  columnsFor,
  onChange,
}: SagaBpmnEditorProps) {
  // State, not a ref: the handle arrives after mount, and the seeding effect
  // below has to run once it does. A ref would leave the canvas empty.
  const [editor, setEditor] = useState<BpmnWorkflowEditorHandle | null>(null);

  // The diagram is seeded from the model once per workflow. Re-importing on
  // every change would fight the canvas: each keystroke in the drawer would
  // rebuild the diagram and throw away the selection.
  const [seeded, setSeeded] = useState(false);
  const initialXml = useMemo(() => sagaFlowToBpmn(flow), [flow]);
  const latestFlow = useRef(flow);
  latestFlow.current = flow;

  useEffect(() => {
    if (seeded || !editor) return;
    void editor.importXml(initialXml).then(() => setSeeded(true));
  }, [seeded, editor, initialXml]);

  const entities = useMemo(
    () => entityNames.map((name) => ({ name, tableName: name })),
    [entityNames]
  );

  const handleSteps = (steps: WorkflowStep[]) => {
    // Before the first import lands the canvas is empty, and writing that back
    // would delete the workflow the model declares.
    if (!seeded) return;
    onChange({ ...latestFlow.current, steps: stepsToSagaSteps(steps) });
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="grid grid-cols-1 gap-3 border-b border-border p-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium">Runs when</span>
          <select
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={flow.trigger}
            onChange={(event) =>
              onChange({ ...flow, trigger: event.target.value as SagaFlow["trigger"] })
            }
          >
            <option value="rule">Only when a business rule triggers it</option>
            <option value="automatic">On every matching write</option>
          </select>
          <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
            {flow.trigger === "rule"
              ? "The rule's condition decides. Use this when the process should not run on every save."
              : "Runs on every write of the chosen operation, whatever the record says."}
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium">On</span>
          <select
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm disabled:opacity-50"
            value={flow.operation}
            disabled={flow.trigger === "rule"}
            onChange={(event) =>
              onChange({ ...flow, operation: event.target.value as SagaFlow["operation"] })
            }
          >
            {["CREATE", "UPDATE", "DELETE", "ALL"].map((operation) => (
              <option key={operation} value={operation}>
                {operation}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
            {flow.trigger === "rule"
              ? "Not used — a rule-triggered workflow is resolved by name."
              : "Which write starts the process."}
          </span>
        </label>
      </div>

      <div className="h-[640px]">
        <BpmnWorkflowEditor
          onReady={setEditor}
          entities={entities}
          entityColumns={entityColumns}
          ruleNames={ruleNames}
          columnsFor={columnsFor}
          onStepsChange={handleSteps}
        />
      </div>

      <p className="border-t border-border px-3 py-2 text-[11px] leading-snug text-muted-foreground">
        The model stores the steps and their order, not where they sit on the canvas — so the
        diagram is laid out left to right each time it opens.
      </p>
    </div>
  );
}
