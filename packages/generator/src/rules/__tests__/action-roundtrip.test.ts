/**
 * The enhance page shows a model's `%%action` directives as the decision table
 * the generated application's rule editor edits. An edit made there is written
 * back as `%%action` lines, so the two ends have to agree: what
 * `buildActionDecisionTable` compiles, `serializeRuleActions` must read back as
 * the directives that produced it.
 *
 * The first kind of failure is silent: the round trip still saves, but an action
 * comes back with the runtime's `prevent` instead of EML's `validation-error`,
 * or a transform loses its target, and the rule quietly changes what it does.
 * So the property held here is the identity on an unedited model.
 */

import { describe, expect, it } from "vitest";
import {
  buildActionDecisionTable,
  parseRuleActions,
  replaceRuleActions,
  serializeRuleActions,
} from "../index";

const RULE_NAME = "paymentRecording";

const DIRECTIVES = [
  '%%action requireCardReference validation-error when: method == "card" and reference == null message: A card payment needs its authorisation code.',
  '%%action requireTransferReference validation-error when: method == "bank_transfer" and reference == null message: A bank transfer needs its bank reference.',
  "%%action stampCashReference transform when: method == cash field: reference value: counted-into-till",
  '%%action startReconciliation trigger-workflow when: method == "bank_transfer" workflow: BankReconciliation message: Kick off reconciliation',
].join("\n");

function table() {
  const graph = buildActionDecisionTable(RULE_NAME, parseRuleActions(DIRECTIVES));
  const node = graph.nodes.find((n) => n.type === "decisionTableNode");
  if (!node?.content) throw new Error("no decision table node");
  return node.content;
}

describe("reading %%action back out of the compiled table", () => {
  it("re-emits the directives byte for byte", () => {
    expect(serializeRuleActions(RULE_NAME, table())).toEqual(DIRECTIVES.split("\n"));
  });

  it("translates the runtime's prevent back to EML's validation-error", () => {
    const [first] = serializeRuleActions(RULE_NAME, table());
    expect(first).toContain("validation-error");
    expect(first).not.toContain("prevent");
  });

  it("keeps a transform's field and value", () => {
    const transform = serializeRuleActions(RULE_NAME, table()).find((line) =>
      line.includes("stampCashReference")
    );
    expect(transform).toContain("field: reference");
    expect(transform).toContain("value: counted-into-till");
  });

  it("joins several input columns with `and` rather than dropping them", () => {
    // The editor lets an author add a second condition column. %%action carries
    // one `when:`, so the two have to meet there instead of the extra one going
    // missing on save.
    const withSecondInput = table();
    withSecondInput.inputs.push({ id: "i2", name: "Method", field: "method" });
    for (const row of withSecondInput.rules) row.i2 = "check";
    const lines = serializeRuleActions(RULE_NAME, withSecondInput);
    expect(lines[0]).toContain('when: method == "card" and reference == null and check');
  });

  it("re-reads as the same actions through parseRuleActions", () => {
    const serialized = serializeRuleActions(RULE_NAME, table()).join("\n");
    expect(parseRuleActions(serialized)).toEqual(parseRuleActions(DIRECTIVES));
  });
});

describe("replaceRuleActions keeps the diagram", () => {
  const body = [
    "flowchart TD",
    "    A([Payment updated]) --> B{status == paid?}",
    "    B -->|No| C[No enrollment action]",
    "    B -->|Yes| D[Start course enrollment]",
    '    %%action startEnrollment trigger-workflow when: status == "paid" workflow: PaidCourseEnrollment message: Payment received',
  ].join("\n");

  it("swaps only the %%action lines", () => {
    const replaced = replaceRuleActions(body, [
      '%%action startEnrollment trigger-workflow when: status == "refunded" workflow: RefundFlow message: Refunded',
    ]);
    expect(replaced).toContain("B{status == paid?}");
    expect(replaced).not.toContain("PaidCourseEnrollment");
    expect(replaced).toContain("RefundFlow");
  });

  it("adds actions to a rule that had none", () => {
    const replaced = replaceRuleActions("flowchart TD\n    A --> B", [
      "%%action log afterUpdate when: true",
    ]);
    expect(replaced.split("\n")).toEqual([
      "flowchart TD",
      "    A --> B",
      "%%action log afterUpdate when: true",
    ]);
  });
});
