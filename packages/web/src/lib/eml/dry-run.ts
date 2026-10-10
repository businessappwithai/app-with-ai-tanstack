/**
 * Run a rule graph against a sample record without saving anything.
 *
 * The graph is compiled by the generator's own `compileRules` — the same
 * validation, the same normalisation — and evaluated by the same engine the
 * generated application embeds. A dry run that took a shortcut (evaluating the
 * editor's graph as it stands) would answer for a rule the application never
 * runs, and "it worked when I tried it" would stop meaning anything.
 *
 * Server-only: imports the generator and the native engine, so callers import
 * this lazily inside a request handler.
 */

import type { DryRunResult } from "@appwithai/editors/lib/eml/dry-run-types";
import { describeOutcome } from "@appwithai/editors/lib/eml/rule-outcome";

export type { DryRunResult, DryRunTraceStep } from "@appwithai/editors/lib/eml/dry-run-types";

export interface DryRunInput {
  /** The editor's graph, as JSON text or an object. */
  graph: unknown;
  /** The sample record the rule is run against. */
  record: Record<string, unknown>;
  /** Entity name; only used to compile the rule the way the generator would. */
  entity?: string;
}

const TIMEOUT_MS = 3000;

export async function dryRunRule(input: DryRunInput): Promise<DryRunResult> {
  let graph: unknown = input.graph;
  if (typeof graph === "string") {
    try {
      graph = JSON.parse(graph);
    } catch {
      return { ok: false, problems: ["The graph is not valid JSON."] };
    }
  }
  if (!graph || typeof graph !== "object") {
    return { ok: false, problems: ["There is no graph to run."] };
  }

  const { compileRules } = await import("@appwithai/generator");
  const problems: string[] = [];
  const [rule] = compileRules(
    [
      {
        name: "dryRun",
        entity: input.entity || "Record",
        event: "beforeCreate",
        priority: 100,
        flowchart: `flowchart TD\n    A([Rule]) --> B([Result])\n    %%jdm-graph ${JSON.stringify(graph)}`,
      },
    ],
    (message) => problems.push(message.replace(/^Rule "dryRun" /, "This rule "))
  );
  if (!rule) {
    return { ok: false, problems: problems.length ? problems : ["The rule did not compile."] };
  }

  const { ZenEngineSingleton } = await import("@appwithai/core/rules");
  const evaluated = await ZenEngineSingleton.evaluate(
    JSON.parse(rule.jdmContent),
    { ...input.record, _operation: "create" },
    { timeout: TIMEOUT_MS, trace: true }
  );
  if (!evaluated.success || !evaluated.decision) {
    return {
      ok: false,
      problems: [evaluated.error?.message ?? "The engine could not evaluate the rule."],
    };
  }

  const traced = (evaluated.decision.trace ?? {}) as Record<
    string,
    { name?: string; output?: unknown }
  >;
  const trace = Object.values(traced).map((step) => ({
    node: step.name ?? "",
    output: step.output,
  }));
  const result = evaluated.decision.result;
  return { ok: true, result, outcomes: describeOutcome(result), trace };
}
