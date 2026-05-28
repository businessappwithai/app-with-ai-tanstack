// Unified Mermaid parsing module
// Converts Mermaid ERD (erDiagram) or flowchart (flowchart TD) to structured data
// Pure TypeScript, no AI required.

import { MermaidParser } from "@erdwithai/generator";
import type { Entity, Relationship } from "@erdwithai/core/types";
import { parseMermaidFlowchart } from "./mermaid-flowchart-parser";
import { convertToJdm } from "./jdm-converter";
import type { JdmGraph } from "./jdm-converter";

export type { Entity, Relationship, JdmGraph };

export interface ErdParseResult {
  type: "erd";
  entities: Entity[];
  relationships: Relationship[];
}

export interface RulesParseResult {
  type: "rules";
  jdm: JdmGraph;
}

export type MermaidParseResult = ErdParseResult | RulesParseResult;

const erdParser = new MermaidParser();

export function parseMermaid(code: string): MermaidParseResult {
  const trimmed = code.trim();

  if (trimmed.startsWith("erDiagram")) {
    const { entities, relationships } = erdParser.parse(trimmed);
    return { type: "erd", entities, relationships };
  }

  if (trimmed.startsWith("flowchart") || trimmed.startsWith("graph")) {
    const ast = parseMermaidFlowchart(trimmed);
    const jdm = convertToJdm(ast);
    return { type: "rules", jdm };
  }

  throw new Error("Unknown Mermaid diagram type. Expected 'erDiagram' or 'flowchart TD'.");
}
