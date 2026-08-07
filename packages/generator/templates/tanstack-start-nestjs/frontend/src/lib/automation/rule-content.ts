/**
 * Reading and writing what the rules API stores.
 *
 * Rules predate the rule-table editor, so `jdm_content` may hold either a
 * decision table or an older JDM decision graph. Anything that is not a table
 * opens as an empty one rather than a guessed conversion: a graph flattened by
 * assumption would look like a working table while deciding something different,
 * and visibly empty is the failure an author can actually see and fix.
 */

import { type DecisionTable, emptyDecisionTable } from "../workflow/bpmn-model";

/** What the rules API round-trips. Kept loose because older rows vary. */
export type StoredRuleContent = DecisionTable | Record<string, unknown>;

export function isDecisionTable(content: unknown): content is DecisionTable {
  if (!content || typeof content !== "object") return false;
  const c = content as Partial<DecisionTable>;
  return Array.isArray(c.inputs) && Array.isArray(c.outputs) && Array.isArray(c.rules);
}

/** A table to edit, whatever was stored. */
export function asDecisionTable(content: unknown): DecisionTable {
  if (isDecisionTable(content)) {
    return {
      hitPolicy: content.hitPolicy === "collect" ? "collect" : "first",
      inputs: content.inputs,
      outputs: content.outputs,
      rules: content.rules,
    };
  }
  return emptyDecisionTable();
}

/**
 * Whether opening this rule will lose what was stored.
 *
 * True for a rule saved as something other than a table — the editor shows an
 * empty table, and saving would replace the old content. The routes use this to
 * warn before that happens rather than after.
 */
export function wouldReplaceStoredContent(content: unknown): boolean {
  return content !== null && content !== undefined && !isDecisionTable(content);
}
