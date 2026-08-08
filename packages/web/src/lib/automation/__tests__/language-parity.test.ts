/**
 * The language definition must describe the builder that ships.
 *
 * `language/erdwithai-language.json` is declared the single source of truth for
 * EML, but nothing enforced that — the automation builder was written with its
 * own trigger, operator and step vocabulary and the definition was never
 * updated, so the canonical description of the language omitted the dialect
 * every stored automation is written in. That drift is invisible: both sides
 * work perfectly on their own, and only a reader trusting the definition to
 * write an automation would discover it.
 *
 * These tests pin the two together in the direction that matters. `model.ts` is
 * the implementation and therefore wins ties; the definition is checked for
 * being complete and accurate about it, not the other way round.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OPERATORS, STEP_FIELDS, TRIGGER_EVENTS, TRIGGER_HOOKS } from "../model";

const definition = JSON.parse(
  readFileSync(
    join(import.meta.dirname, "../../../../../../language/erdwithai-language.json"),
    "utf8"
  )
) as {
  automations: {
    shipped: boolean;
    triggers: { events: Array<{ event: string; hook: string; phase: string; blocking: boolean }> };
    conditions: { operators: Array<{ id: string; label: string; arity: number }> };
    steps: { types: Array<{ type: string; properties: string[] }> };
  };
  directives: { reserved: Array<{ keyword: string; form: string }> };
};

const auto = definition.automations;

describe("language definition ↔ automation model", () => {
  it("documents the automation dialect at all", () => {
    expect(auto).toBeDefined();
    expect(auto.shipped).toBe(true);
  });

  it("lists exactly the trigger events the model defines", () => {
    expect(auto.triggers.events.map((e) => e.event).sort()).toEqual([...TRIGGER_EVENTS].sort());
  });

  it("maps each trigger to the hook the serialiser actually writes", () => {
    for (const { event, hook } of auto.triggers.events) {
      expect(hook).toBe(TRIGGER_HOOKS[event as (typeof TRIGGER_EVENTS)[number]]);
    }
  });

  it("agrees on which triggers can still block the write", () => {
    // A `before` hook runs ahead of the write and can stop it; an `after` hook
    // cannot. Anything else is a documentation error, not a naming preference.
    for (const t of auto.triggers.events) {
      expect(t.blocking).toBe(t.phase === "before");
      expect(t.hook.startsWith(t.phase === "before" ? "before" : "after")).toBe(true);
    }
  });

  it("lists exactly the operators the model defines, with matching arity", () => {
    const documented = auto.conditions.operators;
    expect(documented.map((o) => o.id).sort()).toEqual(OPERATORS.map((o) => o.id).sort());

    for (const op of documented) {
      const impl = OPERATORS.find((o) => o.id === op.id);
      expect(impl, `operator ${op.id}`).toBeDefined();
      expect(op.arity).toBe(impl?.arity);
      expect(op.label).toBe(impl?.label);
    }
  });

  it("lists exactly the step types the model defines, with matching properties", () => {
    const documented = auto.steps.types;
    expect(documented.map((s) => s.type).sort()).toEqual(Object.keys(STEP_FIELDS).sort());

    for (const step of documented) {
      const fields = STEP_FIELDS[step.type as keyof typeof STEP_FIELDS];
      expect(step.properties, `step ${step.type}`).toEqual([...fields]);
    }
  });

  it("records that %%guard carries two unrelated meanings", () => {
    // The builder writes conditions as %%guard, but %%guard was already
    // reserved for RBAC. Whatever the eventual resolution, the definition must
    // not quietly present one meaning as the only one.
    const guard = definition.directives.reserved.find((d) => d.keyword === "%%guard");
    expect(guard).toBeDefined();
    expect(guard?.form).toContain("<operator>");
    expect(guard?.form).toContain("role");
  });

  it("documents the two-token %%hook form the automation trigger uses", () => {
    const hook = definition.directives.reserved.find((d) => d.keyword === "%%hook");
    expect(hook?.form).toContain("%%hook <type> on <Entity>");
  });
});
