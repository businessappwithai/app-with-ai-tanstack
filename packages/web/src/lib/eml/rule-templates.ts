/**
 * Starter graphs for the rule editor, one per kind of node an author can reach
 * for. Each is a complete, working rule over a field of the chosen entity —
 * "required field" in five different shapes — so an author sees what the node
 * does before deciding how to adapt it, instead of facing an empty canvas.
 *
 * The graphs are plain GoRules JDM (the shape `@gorules/jdm-editor` edits and
 * `%%jdm-graph` stores). A rule's answer is its final output row, and the
 * application acts on that row's `action`: `validation-error` refuses the write,
 * `transform` changes the record.
 * `rule-templates.test.ts` runs every template through the real engine and the
 * browser runtime, so a template cannot teach a shape that does not run.
 */

import type { DecisionTable } from "./decision-table";

export type RuleTemplateKind = "table" | "expression" | "function" | "switch";

export interface RuleTemplateInfo {
  kind: RuleTemplateKind;
  label: string;
  /** One sentence: when to reach for it. */
  summary: string;
}

export const RULE_TEMPLATES: readonly RuleTemplateInfo[] = [
  {
    kind: "table",
    label: "Decision table",
    summary: "Rows of checks and answers — best when the cases are a list a person can read.",
  },
  {
    kind: "expression",
    label: "Expression",
    summary: "One formula that works out a value or an answer from the record.",
  },
  {
    kind: "function",
    label: "Function",
    summary: "A few lines of JavaScript for logic a table or formula cannot say.",
  },
  {
    kind: "switch",
    label: "Switch",
    summary: "Send the record down different branches depending on a condition.",
  },
] as const;

export interface RuleTemplateContext {
  /** The entity's field names, to pick the example field from. */
  entityFields: string[];
}

/** Fields the application manages itself — never a good example to check. */
const MANAGED = new Set(["id", "version", "created_at", "updated_at", "created_by", "updated_by"]);

export function exampleField(fields: string[]): string {
  return fields.find((field) => !MANAGED.has(field) && !field.endsWith("_id")) ?? "name";
}

const at = (index: number) => ({ x: 80 + index * 260, y: 200 });

type Node = {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number };
  content?: unknown;
};
type Edge = { id: string; type: "edge"; sourceId: string; targetId: string; sourceHandle?: string };

export interface TemplateGraph {
  nodes: Node[];
  edges: Edge[];
}

const edge = (from: string, to: string, sourceHandle?: string): Edge => ({
  id: `${from}-${to}`,
  type: "edge",
  sourceId: from,
  targetId: to,
  ...(sourceHandle ? { sourceHandle } : {}),
});

const input = (): Node => ({ id: "input", name: "Record", type: "inputNode", position: at(0) });
const output = (index: number): Node => ({
  id: "output",
  name: "Answer",
  type: "outputNode",
  position: at(index),
});

export function buildRuleTemplate(kind: RuleTemplateKind, context: RuleTemplateContext) {
  const field = exampleField(context.entityFields);
  const message = `${field} is required`;
  const missing = `${field} == null or ${field} == ""`;

  switch (kind) {
    case "table":
      return {
        nodes: [
          input(),
          {
            id: "table",
            name: "Required check",
            type: "decisionTableNode",
            position: at(1),
            content: {
              hitPolicy: "first",
              inputs: [{ id: "in1", name: field, field }],
              outputs: [
                { id: "out1", name: "Action", field: "action" },
                { id: "out2", name: "Message", field: "message" },
              ],
              rules: [
                { _id: "row1", in1: 'null, ""', out1: '"validation-error"', out2: `"${message}"` },
                { _id: "row2", in1: "", out1: '"allow"', out2: '""' },
              ],
            },
          },
          output(2),
        ],
        edges: [edge("input", "table"), edge("table", "output")],
      } satisfies TemplateGraph;

    case "expression":
      return {
        nodes: [
          input(),
          {
            id: "formula",
            name: "Required check",
            type: "expressionNode",
            position: at(1),
            content: {
              expressions: [
                { id: "x1", key: "action", value: `(${missing}) ? "validation-error" : "allow"` },
                { id: "x2", key: "message", value: `(${missing}) ? "${message}" : ""` },
              ],
            },
          },
          output(2),
        ],
        edges: [edge("input", "formula"), edge("formula", "output")],
      } satisfies TemplateGraph;

    case "function":
      return {
        nodes: [
          input(),
          {
            id: "code",
            name: "Required check",
            type: "functionNode",
            position: at(1),
            content: {
              source: [
                "export const handler = async (input) => {",
                `  const missing = input.${field} === null || input.${field} === undefined || input.${field} === "";`,
                `  return { action: missing ? "validation-error" : "allow", message: missing ? "${message}" : "" };`,
                "};",
              ].join("\n"),
            },
          },
          output(2),
        ],
        edges: [edge("input", "code"), edge("code", "output")],
      } satisfies TemplateGraph;

    case "switch":
      return {
        nodes: [
          input(),
          {
            id: "branch",
            name: `Is ${field} missing?`,
            type: "switchNode",
            position: at(1),
            content: {
              hitPolicy: "first",
              statements: [
                { id: "missing", condition: missing },
                { id: "present", condition: "", isDefault: true },
              ],
            },
          },
          {
            id: "refuse",
            name: "Refuse the write",
            type: "expressionNode",
            position: { x: at(2).x, y: 120 },
            content: {
              expressions: [
                { id: "r1", key: "action", value: '"validation-error"' },
                { id: "r2", key: "message", value: `"${message}"` },
              ],
            },
          },
          {
            id: "accept",
            name: "Let it through",
            type: "expressionNode",
            position: { x: at(2).x, y: 300 },
            content: { expressions: [{ id: "a1", key: "action", value: '"allow"' }] },
          },
          output(3),
        ],
        edges: [
          edge("input", "branch"),
          edge("branch", "refuse", "missing"),
          edge("branch", "accept", "present"),
          edge("refuse", "output"),
          edge("accept", "output"),
        ],
      } satisfies TemplateGraph;
  }
}

/** A believable value for a field, by its name — a starting point to edit, not a schema. */
function sampleValue(field: string, enumValues: string[] | undefined): unknown {
  if (enumValues?.length) return enumValues[0];
  if (/(^|_)(is|has|can)_/.test(field)) return false;
  if (/(_at|_on|date)$/.test(field)) return new Date().toISOString().slice(0, 10);
  if (/(amount|total|price|qty|quantity|count|balance|fee|credit|cost|score|age)/.test(field)) {
    return 0;
  }
  return "";
}

/** The sample record the Try-it panel opens with: one entry per editable field. */
export function sampleRecord(
  fields: string[],
  enums: Record<string, string[]> = {}
): Record<string, unknown> {
  return Object.fromEntries(
    fields.filter((f) => !MANAGED.has(f)).map((field) => [field, sampleValue(field, enums[field])])
  );
}

/** Plain-language labels for the moment a rule judges a write. */
export const RUNS_WHEN: Record<string, { label: string; hint: string }> = {
  beforeCreate: { label: "A record is created", hint: "Judged before it is saved." },
  afterCreate: {
    label: "A record is created (after)",
    hint: "The generated application judges this exactly as it does “created”.",
  },
  beforeUpdate: { label: "A record is changed", hint: "Judged before the change is saved." },
  afterUpdate: {
    label: "A record is changed (after)",
    hint: "The generated application judges this exactly as it does “changed”.",
  },
  beforeDelete: { label: "A record is deleted", hint: "Judged before it is removed." },
  customValidate: { label: "Any write", hint: "Created, changed or deleted." },
};

/** A flat decision table as the smallest graph that runs it: Input → Table → Output. */
export function tableToGraph(table: DecisionTable, name: string): TemplateGraph {
  return {
    nodes: [
      { id: "input-1", name: "Request", type: "inputNode", position: { x: 80, y: 200 } },
      {
        id: "dt-1",
        name: name || "Decision",
        type: "decisionTableNode",
        position: { x: 340, y: 200 },
        content: table,
      },
      { id: "output-1", name: "Response", type: "outputNode", position: { x: 680, y: 200 } },
    ],
    edges: [
      { id: "e1", type: "edge", sourceId: "input-1", targetId: "dt-1" },
      { id: "e2", type: "edge", sourceId: "dt-1", targetId: "output-1" },
    ],
  };
}
