import "@gorules/jdm-editor/dist/style.css";
import {
  DecisionGraph,
  type DecisionGraphType,
  type DictionaryMap,
  JdmConfigProvider,
} from "@gorules/jdm-editor";
import { useMemo } from "react";
import type { DecisionTable as InternalDecisionTable } from "@/lib/eml/decision-table";
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
