/**
 * How a workflow and the rules attached to it relate.
 *
 * A rule is written once, on the Enhance step, with no "runs when" of its own.
 * What makes it run is a workflow: the workflow names the hooks it listens on,
 * and attaching a rule to one of those hooks is what gives the rule its event.
 * The model still stores `%%rule … event: …` — that is the one thing the
 * generated application reads — so attaching is a write to the rule's `event`,
 * and "attached to" is read back as the same entity and the same event.
 */

import { type AutomationHook, type HookEvent, newHook } from "@/lib/automation/model";

/**
 * The hooks a rule can be judged at. The generated application reads a rule's
 * event only as create, update, delete or any write, so a hook outside this
 * list (a read, a list) has nowhere to run a rule.
 */
export const RULE_HOOKS = [
  "beforeCreate",
  "afterCreate",
  "beforeUpdate",
  "afterUpdate",
  "beforeDelete",
  "customValidate",
] as const satisfies readonly HookEvent[];

export type RuleHook = (typeof RULE_HOOKS)[number];

export function canAttachRules(event: string): event is RuleHook {
  return (RULE_HOOKS as readonly string[]).includes(event);
}

/** The hooks offered when a workflow is started, with a line saying what each is for. */
export const STARTER_HOOKS: ReadonlyArray<{ event: HookEvent; label: string; hint: string }> = [
  { event: "beforeCreate", label: "Before a record is created", hint: "Check or prepare it." },
  { event: "afterCreate", label: "After a record is created", hint: "React to the new record." },
  { event: "beforeUpdate", label: "Before a record is changed", hint: "Check the change." },
  { event: "afterUpdate", label: "After a record is changed", hint: "Audit or notify." },
  { event: "beforeDelete", label: "Before a record is deleted", hint: "Block or confirm it." },
  { event: "afterDelete", label: "After a record is deleted", hint: "Clean up after it." },
  { event: "customValidate", label: "On any write", hint: "Cross-field business checks." },
];

/** `Lead` + `beforeCreate` → `leadBeforeCreate`, a valid handler name. */
export function defaultHandlerName(entity: string, event: string): string {
  const head = entity.replace(/[^A-Za-z0-9]+/g, "");
  const first = head.charAt(0).toLowerCase() + head.slice(1);
  const tail = event.charAt(0).toUpperCase() + event.slice(1);
  return `${first || "record"}${tail}`;
}

/** One rung per chosen hook, in the order the author ticked them. */
export function hooksFor(entity: string, events: readonly HookEvent[]): AutomationHook[] {
  return events.map((event) => ({
    ...newHook(event),
    handler: defaultHandlerName(entity, event),
  }));
}

export interface AttachableRule {
  key: string;
  name: string;
  title?: string;
  entity: string;
  event: string;
}

/** The rules that run at `event` on `entity` — what is attached to that hook. */
export function rulesAttachedTo<R extends AttachableRule>(
  rules: readonly R[],
  entity: string,
  event: string
): R[] {
  return rules.filter((rule) => rule.entity === entity && rule.event === event);
}

/**
 * Rules of `entity` that run somewhere other than `event` — offered to attach,
 * with the hook they would be moved from, because a rule has one event.
 */
export function rulesAvailableFor<R extends AttachableRule>(
  rules: readonly R[],
  entity: string,
  event: string
): R[] {
  return rules.filter((rule) => rule.entity === entity && rule.event !== event);
}
