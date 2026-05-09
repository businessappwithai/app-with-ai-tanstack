"use client";

import React, { useEffect, useMemo, useState } from "react";
import "@gorules/jdm-editor/dist/style.css";
import { DecisionGraph, JdmConfigProvider } from "@gorules/jdm-editor";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- JDM graph data is dynamic JSON with no fixed type
type JDMValue = any;

interface GoRulesEditorProps {
  initialValue?: JDMValue;
  onChange?: (value: JDMValue) => void;
  readOnly?: boolean;
  entityContext?: Array<{ name: string; attributes: string[] }>;
  className?: string;
}

export function GoRulesEditor({
  initialValue,
  onChange,
  readOnly = false,
  entityContext = [],
  className = "",
}: GoRulesEditorProps) {
  // Memoize the default model to prevent unnecessary re-creation
  const defaultModel = useMemo(() => createDefaultModel(entityContext), [entityContext]);

  const [value, setValue] = useState(initialValue || defaultModel);

  useEffect(() => {
    if (initialValue && JSON.stringify(initialValue) !== JSON.stringify(value)) {
      setValue(initialValue);
    }
  }, [initialValue, value]);

  const handleChange = (newValue: JDMValue) => {
    setValue(newValue);
    onChange?.(newValue);
  };

  return (
    <div className={`w-full h-full ${className}`}>
      <JdmConfigProvider>
        <DecisionGraph value={value} onChange={handleChange} disabled={readOnly} />
      </JdmConfigProvider>
    </div>
  );
}

import { parseEntityAttribute } from "./parseEntityAttribute";

export { parseEntityAttribute };

function createInputNode(fields: Array<{ name: string; type: string; entity: string }>) {
  return {
    id: "input",
    type: "input",
    position: { x: 100, y: 100 },
    data: {
      name: "Input Data",
      description: "Entity attributes available for manipulation",
      fields,
    },
  };
}

function createDecisionNode() {
  return {
    id: "decision",
    type: "decisionTable",
    position: { x: 300, y: 100 },
    data: {
      name: "Business Rules",
      description: "Define validation and transformation rules",
      content: {
        rules: [],
      },
    },
  };
}

function createOutputNode(inputFields: Array<{ name: string; type: string; entity: string }>) {
  return {
    id: "output",
    type: "output",
    position: { x: 500, y: 100 },
    data: {
      name: "Output Result",
      description: "Result after applying business rules",
      fields: [
        { name: "success", type: "boolean" },
        { name: "message", type: "string" },
        { name: "data", type: "object" },
        ...inputFields.map((f) => ({
          name: `${f.name}_modified`,
          type: f.type,
          entity: f.entity,
        })),
      ],
    },
  };
}

function createEdge(id: string, source: string, target: string) {
  return {
    id,
    source,
    target,
    type: "default",
  };
}

function createDefaultModel(entities: Array<{ name: string; attributes: string[] }>) {
  // Parse entity attributes to extract field names and types
  const inputFields: Array<{ name: string; type: string; entity: string }> = [];

  entities.forEach((entity) => {
    entity.attributes.forEach((attr) => {
      try {
        const parsed = parseEntityAttribute(attr, entity.name);
        inputFields.push(parsed);
      } catch (error) {
        console.warn(`Failed to parse attribute "${attr}" for entity "${entity.name}":`, error);
        // Skip malformed attributes rather than failing completely
      }
    });
  });

  return {
    name: "Business Rules",
    nodes: [createInputNode(inputFields), createDecisionNode(), createOutputNode(inputFields)],
    edges: [
      createEdge("input-decision", "input", "decision"),
      createEdge("decision-output", "decision", "output"),
    ],
  };
}
