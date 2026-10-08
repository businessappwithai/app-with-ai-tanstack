import { describe, expect, it } from "vitest";
import {
  canAttachRules,
  defaultHandlerName,
  hooksFor,
  RULE_HOOKS,
  rulesAttachedTo,
  rulesAvailableFor,
} from "../workflow-hooks";

const rule = (key: string, entity: string, event: string) => ({ key, name: key, entity, event });

describe("workflow hooks", () => {
  it("names a handler the checker accepts", () => {
    expect(defaultHandlerName("Lead", "beforeCreate")).toBe("leadBeforeCreate");
    expect(defaultHandlerName("Support Case", "afterUpdate")).toMatch(/^[a-zA-Z_][a-zA-Z0-9_]*$/);
  });

  it("starts one rung per ticked hook, each with its own handler", () => {
    const hooks = hooksFor("Lead", ["beforeCreate", "afterUpdate"]);
    expect(hooks.map((h) => [h.event, h.handler])).toEqual([
      ["beforeCreate", "leadBeforeCreate"],
      ["afterUpdate", "leadAfterUpdate"],
    ]);
  });

  it("reads 'attached to' as the same entity and the same event", () => {
    const rules = [
      rule("a", "Lead", "beforeCreate"),
      rule("b", "Lead", "beforeUpdate"),
      rule("c", "Account", "beforeCreate"),
    ];
    expect(rulesAttachedTo(rules, "Lead", "beforeCreate").map((r) => r.key)).toEqual(["a"]);
    expect(rulesAvailableFor(rules, "Lead", "beforeCreate").map((r) => r.key)).toEqual(["b"]);
  });

  it("offers rules only at hooks that judge a write", () => {
    expect(RULE_HOOKS.every(canAttachRules)).toBe(true);
    expect(canAttachRules("beforeList")).toBe(false);
  });
});
