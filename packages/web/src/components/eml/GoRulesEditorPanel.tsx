import "@gorules/jdm-editor/dist/style.css";
import {
  DecisionGraph,
  type DecisionGraphType,
  type DictionaryMap,
  GraphSimulator,
  JdmConfigProvider,
  type JdmUiMode,
  type Simulation,
} from "@gorules/jdm-editor";
import { Play } from "lucide-react";
import { useMemo, useState } from "react";
import type { DecisionTable as InternalDecisionTable } from "@/lib/eml/decision-table";
import type { DryRunResult } from "@/lib/eml/dry-run";
import { tableToGraph } from "@/lib/eml/rule-templates";

interface GoRulesEditorPanelProps {
  /** Serialised DecisionGraphType JSON, if the rule was already saved as a graph. */
  jdmGraph?: string;
  table: InternalDecisionTable;
  entityFields: string[];
  /** Enum values for entity fields, keyed by bare field name. */
  entityEnums?: Record<string, string[]>;
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
  entityFields: _entityFields,
  entityEnums = {},
  ruleName = "Decision",
  projectId,
  entity,
  sampleRecord,
  onChange,
}: GoRulesEditorPanelProps) {
  const [mode, setMode] = useState<JdmUiMode>("dev");
  const [simulate, setSimulate] = useState<Simulation | undefined>();
  const [running, setRunning] = useState(false);

  const graphValue = useMemo<DecisionGraphType>(() => {
    if (jdmGraph) {
      try {
        return JSON.parse(jdmGraph) as DecisionGraphType;
      } catch {
        // fall through to conversion
      }
    }
    return tableToGraph(table, ruleName) as unknown as DecisionGraphType;
  }, [jdmGraph, table, ruleName]);

  const dictionaries: DictionaryMap = {
    ...ACTION_CHOICES,
    ...Object.fromEntries(
      Object.entries(entityEnums).map(([field, values]) => [
        field,
        values.map((v) => ({ label: v, value: v })),
      ])
    ),
  };

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
      <style>
        {".jdm-scope > .ant-app { height: auto !important; min-height: 0 !important; }"}
      </style>
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
        <div className="overflow-hidden rounded-xl border border-border" style={{ height: 640 }}>
          <DecisionGraph
            value={graphValue}
            onChange={(next) => onChange(JSON.stringify(next))}
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
      </JdmConfigProvider>
    </div>
  );
}
