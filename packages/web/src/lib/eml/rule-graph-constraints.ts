/**
 * Hold a rule graph to what the model declares.
 *
 * The GoRules editor takes a column's allowed values from its `fieldType`: a
 * string column with an inline enum is a list the cell is picked from, in place
 * of free text. This sets that on every decision table in the graph, from the
 * entity's own constraints, and reports whatever the graph names that does not
 * exist — a field the entity lacks, a status its state machine never reaches, a
 * process nobody defined. The report is the part that reaches a check written
 * as an expression, which no column type can close.
 */

import type { RuleConstraints } from "./rule-constraints";

/** What a rule may answer. Starting a process is chosen in the workflow editor. */
export const ANSWERS = ["validation-error", "transform", "allow"] as const;

interface Column {
  id?: string;
  name?: string | null;
  field?: string | null;
  fieldType?: unknown;
  outputFieldType?: unknown;
}

interface TableContent {
  inputs?: Column[];
  outputs?: Column[];
  rules?: Array<Record<string, string | undefined>>;
}

interface GraphNode {
  type?: string;
  name?: string;
  content?: unknown;
}

interface Graph {
  nodes?: GraphNode[];
}

const STOCK_IMPORT = /^[ \t]*import\s+zen\s+from\s+['"]zen['"];?[ \t]*\r?\n?/m;

/** The editor's starter source for a function node, minus the import it ships with. */
export function withoutStockImport(content: unknown): unknown {
  if (typeof content === "string") return content.replace(STOCK_IMPORT, "").replace(/^\s*\n/, "");
  if (
    content &&
    typeof content === "object" &&
    typeof (content as { source?: unknown }).source === "string"
  ) {
    const source = (content as { source: string }).source;
    return { ...content, source: source.replace(STOCK_IMPORT, "").replace(/^\s*\n/, "") };
  }
  return content;
}

const choices = (values: readonly string[]) => ({
  type: "string" as const,
  enum: {
    type: "inline" as const,
    values: values.map((value) => ({ label: value, value })),
  },
});

/** The values a column may hold, or null when it is free. */
function allowedFor(
  field: string,
  kind: "input" | "output",
  constraints: RuleConstraints
): readonly string[] | null {
  if (kind === "output") {
    if (field === "action") return ANSWERS;
    if (field === "workflowName") return constraints.workflowNames;
    if (field === "field") return constraints.fields;
  }
  return constraints.values[field] ?? null;
}

/** The same graph, with each constrained column typed as a pick-list. */
export function constrainGraph<G extends Graph>(graph: G, constraints: RuleConstraints): G {
  return {
    ...graph,
    nodes: (graph.nodes ?? []).map((node) => {
      // The node every rule starts from is the record being written, so it is
      // called that — the editor's own default name for it is "Request".
      if (node.type === "inputNode") {
        return !node.name || node.name === "Request" ? { ...node, name: "Record" } : node;
      }
      // A new function node opens with `import zen from 'zen'`, a line the
      // application's own check refuses (a function may not import), so a rule
      // saved from the editor's default body could never compile.
      if (node.type === "functionNode")
        return { ...node, content: withoutStockImport(node.content) };
      if (node.type !== "decisionTableNode") return node;
      const content = (node.content ?? {}) as TableContent;
      const type = (column: Column, kind: "input" | "output") => {
        const allowed = column.field ? allowedFor(column.field, kind, constraints) : null;
        return allowed ? choices(allowed) : undefined;
      };
      return {
        ...node,
        content: {
          ...content,
          inputs: (content.inputs ?? []).map((column) => {
            const fieldType = type(column, "input");
            return fieldType ? { ...column, fieldType } : column;
          }),
          outputs: (content.outputs ?? []).map((column) => {
            const outputFieldType = type(column, "output");
            return outputFieldType ? { ...column, outputFieldType } : column;
          }),
        },
      };
    }),
  };
}

const unquote = (cell: string) => cell.trim().replace(/^["']|["']$/g, "");

/**
 * What the graph names that the model does not have.
 *
 * Reads the decision tables: a column's field, a cell under a constrained
 * column, and — for a whole-record check such as `status == "qualified"` — the
 * field and the value on either side of a comparison.
 */
export function graphProblems(graph: Graph, constraints: RuleConstraints): string[] {
  const problems = new Set<string>();
  const fields = new Set(constraints.fields);

  for (const node of graph.nodes ?? []) {
    if (node.type !== "decisionTableNode") continue;
    const content = (node.content ?? {}) as TableContent;
    const columns = [
      ...(content.inputs ?? []).map((c) => ({ c, kind: "input" as const })),
      ...(content.outputs ?? []).map((c) => ({ c, kind: "output" as const })),
    ];

    for (const { c, kind } of columns) {
      if (kind === "input" && c.field && !fields.has(c.field)) {
        problems.add(`"${c.field}" is not a field of this entity.`);
      }
      const allowed = c.field ? allowedFor(c.field, kind, constraints) : null;
      if (!c.id || !c.field || !allowed) continue;
      for (const row of content.rules ?? []) {
        const cell = row[c.id];
        if (!cell || !cell.trim()) continue;
        const value = unquote(cell);
        if (c.field === "action" && value === "trigger-workflow") {
          problems.add(
            "A rule cannot start a workflow — attach the rule to the workflow in the workflow editor."
          );
        } else if (!allowed.includes(value) && value !== "") {
          const what = c.field === "workflowName" ? "process" : c.field;
          problems.add(`"${value}" is not an existing ${what} for this entity.`);
        }
      }
    }

    // Whole-record checks: `status == "qualified"`, `amount > 10 and stage != "won"`.
    for (const row of content.rules ?? []) {
      for (const column of content.inputs ?? []) {
        if (column.field || !column.id) continue;
        const cell = row[column.id];
        if (!cell) continue;
        for (const m of cell.matchAll(
          /([A-Za-z_]\w*)\s*(?:==|!=|>=|<=|>|<)\s*("[^"]*"|'[^']*'|[^\s)]+)/g
        )) {
          const [, name, raw] = m as unknown as [string, string, string];
          if (!fields.has(name)) {
            problems.add(`"${name}" is not a field of this entity.`);
            continue;
          }
          const allowed = constraints.values[name];
          if (allowed && /^["']/.test(raw) && !allowed.includes(unquote(raw))) {
            problems.add(`"${unquote(raw)}" is not a ${name} this entity can have.`);
          }
        }
      }
    }
  }
  return [...problems];
}

export interface InputColumn {
  nodeId: string;
  nodeName: string;
  columnId: string;
  /** The field the column checks, or "" for a whole-record check. */
  field: string;
}

/** Every input column of every decision table in the graph. */
export function inputColumns(
  graph: Graph & { nodes?: Array<GraphNode & { id?: string }> }
): InputColumn[] {
  const columns: InputColumn[] = [];
  for (const node of graph.nodes ?? []) {
    if (node.type !== "decisionTableNode") continue;
    for (const column of ((node.content ?? {}) as TableContent).inputs ?? []) {
      columns.push({
        nodeId: node.id ?? "",
        nodeName: node.name ?? "Decision table",
        columnId: column.id ?? "",
        field: column.field ?? "",
      });
    }
  }
  return columns;
}

/**
 * Point an input column at a field, or add a column for one. A column that was a
 * whole-record check loses its cells: they were written against the whole
 * record, and under a single field they would mean something else.
 */
export function setInputField<G extends Graph>(
  graph: G,
  nodeId: string,
  columnId: string | null,
  field: string
): G {
  return {
    ...graph,
    nodes: (graph.nodes ?? []).map((node) => {
      if ((node as GraphNode & { id?: string }).id !== nodeId) return node;
      const content = (node.content ?? {}) as TableContent;
      if (columnId === null) {
        const id = `in_${Math.random().toString(36).slice(2, 8)}`;
        return {
          ...node,
          content: { ...content, inputs: [...(content.inputs ?? []), { id, name: field, field }] },
        };
      }
      const previous = (content.inputs ?? []).find((c) => c.id === columnId);
      const wasWholeRecord = !previous?.field;
      return {
        ...node,
        content: {
          ...content,
          inputs: (content.inputs ?? []).map((c) =>
            c.id === columnId ? { ...c, field, name: field, fieldType: undefined } : c
          ),
          rules: wasWholeRecord
            ? (content.rules ?? []).map((row) => ({ ...row, [columnId]: "" }))
            : content.rules,
        },
      };
    }),
  };
}
