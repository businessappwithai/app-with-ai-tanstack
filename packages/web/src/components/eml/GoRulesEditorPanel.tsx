import "@gorules/jdm-editor/dist/style.css";
import {
  DecisionGraph,
  JdmConfigProvider,
  type DecisionGraphType,
  type DecisionTableType,
  type DictionaryMap,
} from "@gorules/jdm-editor";
import { useMemo } from "react";
import { type DecisionTable as InternalDecisionTable } from "@/lib/eml/decision-table";

interface GoRulesEditorPanelProps {
  /** Serialised DecisionGraphType JSON, if the rule was already saved as a graph. */
  jdmGraph?: string;
  table: InternalDecisionTable;
  entityFields: string[];
  /** Enum values for entity fields, keyed by bare field name. */
  entityEnums?: Record<string, string[]>;
  /** Human-readable rule name used for the initial decision table node label. */
  ruleName?: string;
  onChange: (graphJson: string) => void;
}

const ACTION_CHOICES: DictionaryMap = {
  action: [
    { label: "Validation Error (block write)", value: "validation-error" },
    { label: "Trigger Workflow", value: "trigger-workflow" },
    { label: "Transform Field Value", value: "transform" },
    { label: "Allow (no action)", value: "" },
  ],
};

/** Convert a flat DecisionTable into a minimal JDM graph (Input → Table → Output). */
function tableToInitialGraph(table: InternalDecisionTable, name: string): DecisionGraphType {
  return {
    nodes: [
      {
        id: "input-1",
        name: "Request",
        type: "inputNode",
        position: { x: 80, y: 200 },
      },
      {
        id: "dt-1",
        name: name || "Decision",
        type: "decisionTableNode",
        position: { x: 340, y: 200 },
        content: table as unknown as DecisionTableType,
      },
      {
        id: "output-1",
        name: "Response",
        type: "outputNode",
        position: { x: 680, y: 200 },
      },
    ],
    edges: [
      { id: "e1", sourceId: "input-1", targetId: "dt-1" },
      { id: "e2", sourceId: "dt-1", targetId: "output-1" },
    ],
  };
}

export function GoRulesEditorPanel({
  jdmGraph,
  table,
  entityFields: _entityFields,
  entityEnums = {},
  ruleName = "Decision",
  onChange,
}: GoRulesEditorPanelProps) {
  const graphValue = useMemo<DecisionGraphType>(() => {
    if (jdmGraph) {
      try {
        return JSON.parse(jdmGraph) as DecisionGraphType;
      } catch {
        // fall through to conversion
      }
    }
    return tableToInitialGraph(table, ruleName);
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

  return (
    <JdmConfigProvider>
      <div className="rounded-xl border border-border overflow-hidden" style={{ height: 500 }}>
        <DecisionGraph
          value={graphValue}
          onChange={(next) => onChange(JSON.stringify(next))}
          dictionaries={dictionaries}
        />
      </div>
    </JdmConfigProvider>
  );
}
