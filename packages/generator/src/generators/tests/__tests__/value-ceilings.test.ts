import { describe, expect, it } from "vitest";
import { buildActionDecisionTable, parseRuleActions } from "../../../rules";
import { BunE2ETestGenerator } from "../bun-e2e.generator";

/**
 * The suites invent numbers. crm's `validation-error when: discount_percent > 40`
 * refuses every update to a record the factory gave 56, so a Quote CRUD run failed
 * for a random share of records. The ceiling is read off the compiled rule instead.
 */
function ceilingsFor(when: string) {
  const [action] = parseRuleActions(
    `%%action cap validation-error when: ${when} message: too much`
  );
  const jdmContent = JSON.stringify(buildActionDecisionTable("quote_cap", [action!]));
  const generator = new BunE2ETestGenerator({
    projectName: "t",
    projectVersion: "1",
    projectDescription: "",
    port: 1,
    frontendPort: 2,
    compiledRules: [
      {
        name: "quote_cap",
        tableName: "bus_quote",
        entity: "Quote",
        event: "beforeUpdate",
        operation: "UPDATE",
        priority: 1,
        jdmContent,
      },
    ],
  });
  const entities = [
    {
      name: "Quote",
      tableName: "bus_quote",
      attributes: [{ name: "discount_percent", columnName: "discount_percent" }],
    },
  ];
  const result = (
    generator as unknown as {
      withValueCeilings(e: unknown[]): Array<{ attributes: Array<{ maxValue?: number }> }>;
    }
  ).withValueCeilings(entities);
  return result[0]!.attributes[0]!.maxValue;
}

describe("value ceilings from refusing rules", () => {
  it("keeps a value at or below a `>` bound", () => {
    expect(ceilingsFor("discount_percent > 40")).toBe(40);
  });

  it("keeps a value strictly below a `>=` bound", () => {
    expect(ceilingsFor("discount_percent >= 40")).toBeCloseTo(39.99, 5);
  });

  it("claims no ceiling for a condition it cannot read", () => {
    expect(ceilingsFor('status == "withdrawn" and discount_percent > 40')).toBeUndefined();
  });
});
