import "@gorules/jdm-editor/dist/style.css";
import {
  DecisionGraph,
  type DecisionGraphType,
  type DictionaryMap,
  GraphSimulator,
  JdmConfigProvider,
  type JdmUiMode,
  nodeSpecification,
  type Simulation,
} from "@gorules/jdm-editor";
import { Play } from "lucide-react";
import { useMemo, useState } from "react";
import type { DecisionTable as InternalDecisionTable } from "@/lib/eml/decision-table";
import type { DryRunResult } from "@/lib/eml/dry-run";
import type { RuleConstraints } from "@/lib/eml/rule-constraints";
import {
  constrainGraph,
  graphProblems,
  inputColumns,
  setInputField,
} from "@/lib/eml/rule-graph-constraints";
import { tableToGraph } from "@/lib/eml/rule-templates";

interface GoRulesEditorPanelProps {
  /** Serialised DecisionGraphType JSON, if the rule was already saved as a graph. */
  jdmGraph?: string;
  table: InternalDecisionTable;
  entityFields: string[];
  /** Enum values for entity fields, keyed by bare field name. */
  entityEnums?: Record<string, string[]>;
  /** Processes defined for the entity — all that an answer naming one may pick from. */
  entityWorkflows?: string[];
  /** Each field's JSON type, for the request schema. */
  fieldTypes?: Record<string, "string" | "number" | "boolean">;
  /** Human-readable rule name used for the initial decision table node label. */
  ruleName?: string;
  /** The entity and a starting record, for the editor's own simulator. */
  projectId: string;
  entity: string;
  sampleRecord: string;
  onChange: (graphJson: string) => void;
}

/**
 * What a rule may answer. There is no "start a workflow" here: a rule decides,
 * and which workflow it belongs to is chosen in the workflow editor alone.
 */
const ACTION_CHOICES: DictionaryMap = {
  action: [
    { label: "Validation Error (block write)", value: "validation-error" },
    { label: "Transform Field Value", value: "transform" },
    { label: "Allow (no action)", value: "" },
  ],
};

/**
 * The request node's schema, so the fields a check can look at are the entity's
 * own. The editor reads it for the field pickers and for its completion, and a
 * name outside it is flagged rather than accepted.
 */
function withRequestSchema(
  graph: DecisionGraphType,
  fields: string[],
  values: Record<string, string[]>,
  types: Record<string, "string" | "number" | "boolean">
): DecisionGraphType {
  if (fields.length === 0) return graph;
  const schema = JSON.stringify(
    {
      type: "object",
      properties: Object.fromEntries(
        fields.map((field) => [
          field,
          values[field]
            ? { type: "string", enum: values[field] }
            : { type: types[field] ?? "string" },
        ])
      ),
    },
    null,
    2
  );
  return {
    ...graph,
    nodes: graph.nodes.map((node) =>
      node.type === "inputNode"
        ? { ...node, content: { ...(node.content as object), schema } }
        : node
    ),
  } as DecisionGraphType;
}

/**
 * Every rule starts from the record being written, not from a request, so the
 * editor's first node says "Record" — in the component palette, in the node
 * title, and on a node dragged out new. The library offers no prop for it: the
 * built-in components are not replaceable, only extendable, so its own
 * specification is renamed once, for this editor.
 */
const inputSpec = nodeSpecification.inputNode;
if (inputSpec.displayName !== "Record") {
  const generate = inputSpec.generateNode;
  inputSpec.displayName = "Record";
  inputSpec.generateNode = (params) => ({ ...generate(params), name: "Record" });
}

const MODES: ReadonlyArray<{ id: JdmUiMode; label: string }> = [
  { id: "dev", label: "Developer" },
  { id: "business", label: "Business" },
];

/**
 * The GoRules decision-graph editor, with what it ships with: every node kind
 * (input, output, decision table, expression, function, switch), the graph
 * and the tabs for each node, Developer and Business views, and its simulator
 * panel with a per-run result. The simulator runs the same compiled rule the
 * application runs, through the dry-run route, and nothing is saved.
 */
export function GoRulesEditorPanel({
  jdmGraph,
  table,
  entityFields,
  entityEnums = {},
  entityWorkflows = [],
  fieldTypes = {},
  ruleName = "Decision",
  projectId,
  entity,
  sampleRecord,
  onChange,
}: GoRulesEditorPanelProps) {
  const [mode, setMode] = useState<JdmUiMode>("business");
  const [simulate, setSimulate] = useState<Simulation | undefined>();
  const [running, setRunning] = useState(false);

  const constraints = useMemo<RuleConstraints>(
    () => ({ fields: entityFields, values: entityEnums, workflowNames: entityWorkflows }),
    [entityFields, entityEnums, entityWorkflows]
  );

  const graphValue = useMemo<DecisionGraphType>(() => {
    let graph: DecisionGraphType | null = null;
    if (jdmGraph) {
      try {
        graph = JSON.parse(jdmGraph) as DecisionGraphType;
      } catch {
        // fall through to conversion
      }
    }
    graph ??= tableToGraph(table, ruleName) as unknown as DecisionGraphType;
    return withRequestSchema(
      constrainGraph(graph, constraints),
      entityFields,
      entityEnums,
      fieldTypes
    );
  }, [jdmGraph, table, ruleName, entityFields, entityEnums, fieldTypes, constraints]);

  const problems = useMemo(() => graphProblems(graphValue, constraints), [graphValue, constraints]);

  // Every choice the editor offers is something that exists: the answers a rule
  // may give, the values a field may hold (its enum, or its state machine's
  // states), and the processes defined for this entity. Nothing is free text
  // where the model already says what is allowed.
  const dictionaries = useMemo<DictionaryMap>(
    () => ({
      ...ACTION_CHOICES,
      ...Object.fromEntries(
        Object.entries(entityEnums).map(([field, values]) => [
          field,
          values.map((v) => ({ label: v, value: v })),
        ])
      ),
      workflowName: entityWorkflows.map((name) => ({ label: name, value: name })),
    }),
    [entityEnums, entityWorkflows]
  );

  /** Every edit passes through the model's constraints before it is kept. */
  const commit = (next: DecisionGraphType) =>
    onChange(JSON.stringify(constrainGraph(next, constraints)));

  const columns = useMemo(() => inputColumns(graphValue as never), [graphValue]);
  const tableIds = [...new Set(columns.map((column) => column.nodeId))];
  const inputCount = columns.filter((column) => column.nodeId === tableIds[0]).length;

  const run = async ({ graph, context }: { graph: DecisionGraphType; context: unknown }) => {
    setRunning(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/rules/dry-run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graph, record: context, entity }),
      });
      const data = (await response.json()) as DryRunResult & { error?: string };
      if (!response.ok || !data.ok) {
        const message = !response.ok
          ? (data.error ?? `Could not run the rule (${response.status})`)
          : (data as { problems: string[] }).problems.join(" ");
        setSimulate({ error: { title: "The rule did not run", message, data: {} } });
        return;
      }
      setSimulate({
        result: { performance: "", result: data.result, snapshot: graph, trace: {} },
      });
    } catch (caught) {
      setSimulate({
        error: {
          title: "The rule did not run",
          message: caught instanceof Error ? caught.message : "Could not run the rule.",
          data: {},
        },
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="jdm-scope">
      {/* The editor's own provider renders an `.ant-app` that fills its parent's
          height. Inside a stretched flex column that made it as tall as the rail
          beside it and pushed everything under the editor off the screen. */}
      <style>{`
        .jdm-scope > .ant-app { height: auto !important; min-height: 0 !important; }
        /* An input is picked from the entity's fields in the bar above, not typed
           into the editor's own free-text field box. */
        .jdm-scope thead tr:first-child th:nth-child(2) .cta-wrapper { display: none; }
        .jdm-scope thead tr:nth-child(2) th:nth-child(n+3):nth-child(-n+${2 + inputCount}) .grl-field-edit {
          pointer-events: none;
        }
      `}</style>
      <JdmConfigProvider>
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            The GoRules editor. Drag nodes from the left toolbar; select a node to edit it; press ▷
            at the bottom-left to open the Simulator and run a sample record.
          </p>
          <div
            role="group"
            aria-label="Editor view"
            className="flex shrink-0 overflow-hidden rounded-md border border-border text-xs font-medium"
          >
            {MODES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={mode === id}
                onClick={() => setMode(id)}
                className={`px-3 py-1 ${mode === id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {tableIds.map((nodeId) => {
          const mine = columns.filter((column) => column.nodeId === nodeId);
          const used = new Set(mine.map((column) => column.field));
          return (
            <div
              key={nodeId}
              aria-label={`Inputs of ${mine[0]?.nodeName}`}
              className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs"
            >
              <span className="font-medium">Inputs of {mine[0]?.nodeName}</span>
              <span className="text-muted-foreground">
                — each is a field of {entity || "this entity"}, picked from its own fields
              </span>
              {mine.map((column) => (
                <select
                  key={column.columnId}
                  aria-label={`Input field ${column.field || "whole record"}`}
                  className="rounded-md border border-border px-2 py-1"
                  value={column.field}
                  onChange={(e) =>
                    commit(setInputField(graphValue, nodeId, column.columnId, e.target.value))
                  }
                >
                  {column.field === "" && <option value="">Whole record (formula)</option>}
                  {entityFields.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
              ))}
              <select
                aria-label="Add an input field"
                className="rounded-md border border-dashed border-border px-2 py-1"
                value=""
                onChange={(e) => {
                  if (e.target.value)
                    commit(setInputField(graphValue, nodeId, null, e.target.value));
                }}
              >
                <option value="">+ Add an input field…</option>
                {entityFields
                  .filter((field) => !used.has(field))
                  .map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
              </select>
            </div>
          );
        })}
        <div className="overflow-hidden rounded-xl border border-border" style={{ height: 640 }}>
          <DecisionGraph
            value={graphValue}
            onChange={(next) => commit(next)}
            dictionaries={dictionaries}
            mode={mode}
            name={ruleName}
            simulate={simulate}
            panels={[
              {
                id: "simulator",
                title: "Simulator",
                icon: <Play className="h-4 w-4" />,
                renderPanel: () => (
                  <GraphSimulator
                    defaultRequest={sampleRecord}
                    loading={running}
                    onRun={run}
                    onClear={() => setSimulate(undefined)}
                  />
                ),
              },
            ]}
          />
        </div>
        {problems.length > 0 && (
          <ul
            aria-label="Names that do not exist"
            className="mt-2 space-y-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          >
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        )}
      </JdmConfigProvider>
    </div>
  );
}
