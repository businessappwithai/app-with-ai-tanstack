/**
 * Regression: the browser runtime let every model-declared refusal through.
 * Found by /qa on 2026-09-09 against an Education Management System model run
 * in guide/run-in-browser.html.
 *
 * `action-vocabulary.test.ts` beside this one holds the *compiler* to the
 * runtime's vocabulary: EML's `validation-error` is emitted as `prevent`,
 * because that is what `rules.service.ts` refuses a write on. The browser
 * runtime — `templates/wasm/server/lib/rules.js`, which exists because
 * zen-engine is a native binding that cannot follow the application into a tab
 * — classified a matched row by the same `action` cell and recognised only
 * `reject` and `error`. A `prevent` row therefore fell out of that chain into
 * `notifications`, and `bus.routes.js` refuses a write on `violations` alone:
 * the rule matched, the write was stored, and the caller was told nothing.
 *
 * The failure was invisible from every screen. The rule is seeded into
 * `sys_rule_definitions`, listed in the application's own Business Rules
 * screen, and drawn by the viewers — it simply refuses nothing. Observed on a
 * `withdrawn` student with no withdrawal reason and on a payment of 999999
 * against a balance of 10, both accepted with a 200.
 *
 * The property worth holding is that the two runtimes agree about what a
 * compiled row *does*, not only about what it says.
 */

import { describe, expect, it } from "vitest";
// The browser runtime, imported as the application would run it.
// @ts-expect-error — plain ESM JavaScript shipped as a template, no types.
import { evaluateRules } from "../../../templates/wasm/server/lib/rules.js";
import { buildActionDecisionTable, parseRuleActions } from "../index";

/** Compile directives the way the pipeline does, then evaluate one record. */
async function run(directives: string[], record: Record<string, unknown>) {
  const actions = parseRuleActions(directives.join("\n"));
  const jdm = buildActionDecisionTable("qaRule", actions);
  return (await evaluateRules([{ name: "qaRule", jdm_content: JSON.stringify(jdm) }], record, {
    columns: Object.keys(record),
  })) as {
    violations: { action?: string; message?: string }[];
    mutations: Record<string, unknown>;
    notifications: unknown[];
  };
}

describe("the browser runtime honours the runtime action vocabulary", () => {
  it("refuses a write when a validation-error row matches", async () => {
    const outcome = await run(
      [
        "%%action requireWithdrawalReason validation-error when: status == \"withdrawn\" and withdrawal_reason == null message: A withdrawal needs a reason.",
      ],
      { status: "withdrawn", withdrawal_reason: null }
    );

    expect(outcome.violations).toHaveLength(1);
    expect(outcome.violations[0]?.message).toBe("A withdrawal needs a reason.");
    // A refusal reported as a notification is a write that went through.
    expect(outcome.notifications).toHaveLength(0);
  });

  it("lets the write through when the same rule does not match", async () => {
    const outcome = await run(
      [
        "%%action requireWithdrawalReason validation-error when: status == \"withdrawn\" and withdrawal_reason == null message: A withdrawal needs a reason.",
      ],
      { status: "withdrawn", withdrawal_reason: "Relocated abroad" }
    );

    expect(outcome.violations).toHaveLength(0);
  });

  it("still applies a transform as a mutation rather than a refusal", async () => {
    const outcome = await run(
      [
        "%%action bandOnSibling transform when: has_sibling_enrolled == true field: admission_band value: priority",
      ],
      { has_sibling_enrolled: true, admission_band: null }
    );

    expect(outcome.violations).toHaveLength(0);
    expect(outcome.mutations).toEqual({ admission_band: "priority" });
  });

  it("still reports a trigger-workflow as a notification rather than a refusal", async () => {
    const outcome = await run(
      [
        "%%action settleInvoice trigger-workflow when: amount >= balance_before workflow: InvoiceSettlement",
      ],
      { amount: 100, balance_before: 100 }
    );

    expect(outcome.violations).toHaveLength(0);
    expect(outcome.notifications).toHaveLength(1);
  });
});
