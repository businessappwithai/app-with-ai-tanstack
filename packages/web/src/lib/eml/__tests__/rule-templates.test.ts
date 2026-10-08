/**
 * Every starter graph the editor offers must run.
 *
 * A template is the first rule most authors ever see, and they adapt it rather
 * than write one. One that saves but never fires teaches a shape that does not
 * work. So each is compiled by the real generator, evaluated by the real
 * engine (zen) and by the browser runtime, against a record that should be
 * refused and one that should not.
 */

import { createRequire } from "node:module";
import path from "node:path";
import { compileRules } from "@appwithai/generator";
import { describe, expect, it } from "vitest";
// @ts-expect-error — plain ESM JavaScript shipped as a template, no types.
import { evaluateRules } from "../../../../../generator/templates/wasm/server/lib/rules.js";
import { describeOutcome } from "../rule-outcome";
import { buildRuleTemplate, exampleField, RULE_TEMPLATES } from "../rule-templates";

const { ZenEngine } = createRequire(path.resolve(__dirname, "../../../../../core/package.json"))(
  "@gorules/zen-engine"
) as typeof import("@gorules/zen-engine");
const engine = new ZenEngine();

const CONTEXT = {
  entityFields: ["id", "customer_id", "title", "status", "created_at"],
};

function compiled(kind: (typeof RULE_TEMPLATES)[number]["kind"]) {
  const graph = buildRuleTemplate(kind, CONTEXT);
  const [rule] = compileRules([
    {
      name: "starter",
      entity: "Invoice",
      event: "beforeCreate",
      priority: 100,
      flowchart: `flowchart TD\n    A([Rule]) --> B([Result])\n    %%jdm-graph ${JSON.stringify(graph)}`,
    },
  ]);
  if (!rule) throw new Error(`template ${kind} did not compile`);
  return rule.jdmContent;
}

async function zen(jdm: string, record: Record<string, unknown>) {
  return (await engine.createDecision(Buffer.from(jdm)).evaluate(record)).result;
}

describe("the example field", () => {
  it("skips managed columns and references", () => {
    expect(exampleField(CONTEXT.entityFields)).toBe("title");
    expect(exampleField(["id", "created_at"])).toBe("name");
  });
});

describe("every starter graph runs", () => {
  for (const { kind, label } of RULE_TEMPLATES) {
    it(`${label}: acts on a record that fits and lets the others through`, async () => {
      const jdm = compiled(kind);
      const fits = { title: "" };
      const other = { title: "Late fee" };

      const hit = describeOutcome(await zen(jdm, fits));
      const miss = describeOutcome(await zen(jdm, other));

      expect(hit.map((o) => o.kind)).toEqual(["blocks"]);
      expect(miss.map((o) => o.kind)).toEqual(["nothing"]);
    });

    it(`${label}: the browser runtime reaches the same verdict`, async () => {
      const jdm = compiled(kind);
      const run = async (record: Record<string, unknown>) =>
        evaluateRules([{ name: "starter", jdm_content: jdm }], record, {
          columns: Object.keys(record),
        });
      const fits = { title: "" };
      const other = { title: "Late fee" };

      const hit = await run(fits);
      const miss = await run(other);
      expect(hit.violations).toHaveLength(1);
      expect(miss.violations).toHaveLength(0);
    });
  }

  it("offers no starter that starts a process — that link is made in the workflow", () => {
    expect(RULE_TEMPLATES.map((t) => t.kind)).not.toContain("workflow");
  });
});
