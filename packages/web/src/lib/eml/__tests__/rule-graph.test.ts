import { describe, expect, it } from "vitest";
import { emptyDecisionTable } from "../decision-table";
import { constrainGraph } from "../rule-graph-constraints";
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
});
