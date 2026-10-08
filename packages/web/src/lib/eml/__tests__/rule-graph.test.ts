import { describe, expect, it } from "vitest";
import { emptyDecisionTable } from "../decision-table";
import { constrainGraph, withoutStockImport } from "../rule-graph-constraints";
import { sampleRecord, tableToGraph } from "../rule-templates";

describe("a rule's graph", () => {
  it("starts from the Record, not a Request", () => {
    const graph = tableToGraph(emptyDecisionTable(), "lateFee");
    expect(graph.nodes.find((n) => n.type === "inputNode")?.name).toBe("Record");
  });

  it("renames a stored graph's Request node, and only that one", () => {
    const stored = {
      nodes: [
        { id: "a", type: "inputNode", name: "Request" },
        { id: "b", type: "decisionTableNode", name: "Request" },
      ],
    };
    const shown = constrainGraph(stored, { fields: [], values: {}, workflowNames: [] });
    expect(shown.nodes.map((n) => n.name)).toEqual(["Record", "Request"]);
  });

  it("fills the sample record from the entity's own fields, not the managed ones", () => {
    expect(Object.keys(sampleRecord(["id", "status", "amount", "updated_at"]))).toEqual([
      "status",
      "amount",
    ]);
  });

  it("drops the import a new function node ships with, which the compiler refuses", () => {
    const stock =
      "import zen from 'zen';\n\n/** @type {Handler} **/\nexport const handler = async (input) => {\n  return input;\n};\n";
    expect(withoutStockImport(stock)).not.toMatch(/import/);
    expect(withoutStockImport({ source: stock })).toEqual({
      source: expect.not.stringMatching(/import/),
    });
    expect(withoutStockImport("export const handler = async (i) => i;")).toBe(
      "export const handler = async (i) => i;"
    );
  });
});
