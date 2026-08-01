/**
 * Workflows, both directions.
 *
 * EML expresses a workflow two ways (spec/03-workflows.md):
 *
 *   hook   a flowchart annotated with `%%hook` directives binding named
 *          handlers to entity lifecycle events
 *   state  a `stateDiagram-v2` whose states become the entity's status enum
 *          and whose transitions define the allowed moves
 *
 * The hook form is a list, so it is edited as one. The state form is a graph,
 * so it gets a canvas. Both serialise back to the exact text a hand-written
 * workflow would use.
 */

import { parseHooksFromFlowchart } from "../workflow/hook-parser";

/* -------------------------------------------------------------------------- */
/*  Hook workflows                                                             */
/* -------------------------------------------------------------------------- */

/** The 13 lifecycle events, in the order they run. Matches the EML spec. */
export const HOOK_TYPES = [
  "beforeCreate",
  "afterCreate",
  "beforeUpdate",
  "afterUpdate",
  "beforeDelete",
  "afterDelete",
  "beforeRead",
  "afterRead",
  "beforeQuery",
  "afterQuery",
  "beforeList",
  "afterList",
  "customValidate",
] as const;

export type HookType = (typeof HOOK_TYPES)[number];

export const HOOK_HINTS: Record<string, string> = {
  beforeCreate: "Runs before a record is written — hash a password, set a default.",
  afterCreate: "Runs once the record exists — send a welcome email, emit an event.",
  beforeUpdate: "Validate or transform before the write.",
  afterUpdate: "Audit the change, invalidate a cache.",
  beforeDelete: "Block the delete if the record is still referenced.",
  afterDelete: "Clean up related rows or files.",
  beforeRead: "Guard a single-record read.",
  afterRead: "Redact or enrich a record on the way out.",
  beforeQuery: "Scope the query — tenant filters, injected conditions.",
  afterQuery: "Post-process the rows that came back.",
  beforeList: "Adjust filtering, sorting or pagination.",
  afterList: "Post-process a page of results.",
  customValidate: "Cross-field or business validation on any write.",
};

export interface WorkflowHook {
  id: string;
  type: HookType | string;
  /** Generated function name. */
  handler: string;
  /** Optional field the hook is scoped to. */
  field?: string;
}

/** Read the `%%hook` directives out of a hook workflow's diagram. */
export function parseHookWorkflow(diagram: string): WorkflowHook[] {
  const { hooks } = parseHooksFromFlowchart(diagram ?? "");
  return hooks.map((hook, index) => ({
    id: `h${index}_${hook.name}`,
    type: hook.type,
    handler: hook.name,
    field: hook.parameters?.find((parameter) => parameter.type === "field")?.name,
  }));
}

/**
 * Write a hook workflow.
 *
 * The flowchart is generated from the hooks, so the picture and the directives
 * can never disagree — the directives carry the meaning, and the diagram is how
 * a reader sees it. The steps are drawn as one chain in run order because that
 * is what actually happens at runtime.
 */
export function emitHookWorkflow(entity: string, hooks: WorkflowHook[]): string {
  const lines = ["flowchart TD", `    request[Request] --> validate[Validate ${entity}]`];

  let previous = "validate";
  hooks.forEach((hook, index) => {
    const id = `step${index + 1}`;
    lines.push(`    ${previous} --> ${id}[${hook.type}: ${hook.handler}]`);
    previous = id;
  });

  lines.push(
    `    ${previous} --> persist[Persist ${entity}]`,
    "    persist --> done[Response]",
    ""
  );

  for (const hook of hooks) {
    lines.push(
      `    %%hook ${hook.type} ${hook.handler} on ${entity}` +
        (hook.field ? `[field: ${hook.field}]` : "")
    );
  }

  return lines.join("\n");
}

export function validateHookWorkflow(entity: string, hooks: WorkflowHook[]): string[] {
  const problems: string[] = [];
  if (!entity) problems.push("Pick the entity this workflow runs for.");
  if (!hooks.length) problems.push("Add at least one lifecycle step.");

  const seen = new Set<string>();
  for (const hook of hooks) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(hook.handler)) {
      problems.push(`"${hook.handler || "(unnamed)"}" is not a valid handler name.`);
    }
    const key = `${hook.type}:${hook.handler}`;
    if (seen.has(key)) problems.push(`${hook.type} ${hook.handler} is listed twice.`);
    seen.add(key);
  }
  return problems;
}

/* -------------------------------------------------------------------------- */
/*  State workflows                                                            */
/* -------------------------------------------------------------------------- */

export interface StateNode {
  id: string;
  /** The state name, which becomes a status enum value. */
  name: string;
  position?: { x: number; y: number };
}

export interface StateTransition {
  id: string;
  from: string;
  to: string;
  /** Optional trigger label, e.g. `submit`. */
  label?: string;
}

export interface StateFlow {
  states: StateNode[];
  transitions: StateTransition[];
  /** State the entity starts in — the `[*] --> x` transition. */
  initial?: string;
  /** States that end the process — `x --> [*]`. */
  terminal: string[];
}

const START_MARKER = "[*]";

/** Read a `stateDiagram-v2` into the editable model. */
export function parseStateFlow(diagram: string): StateFlow {
  const states = new Map<string, StateNode>();
  const transitions: StateTransition[] = [];
  const terminal: string[] = [];
  let initial: string | undefined;

  const ensure = (name: string) => {
    if (name === START_MARKER) return;
    if (!states.has(name)) states.set(name, { id: name, name });
  };

  let index = 0;
  for (const rawLine of (diagram ?? "").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("%%") || /^stateDiagram(-v2)?$/.test(line)) continue;

    // `from --> to : label`
    const match = line.match(
      /^(\[\*\]|[A-Za-z_][\w]*)\s*-->\s*(\[\*\]|[A-Za-z_][\w]*)\s*(?::\s*(.+))?$/
    );
    if (!match) continue;

    const [, from, to, label] = match as unknown as [string, string, string, string | undefined];
    ensure(from);
    ensure(to);

    if (from === START_MARKER) {
      initial = to;
      continue;
    }
    if (to === START_MARKER) {
      terminal.push(from);
      continue;
    }

    transitions.push({ id: `t${index++}_${from}_${to}`, from, to, label: label?.trim() });
  }

  // Left-to-right by reachability from the initial state, so the process reads
  // in the order it happens.
  const ordered = [...states.values()];
  const depth = new Map<string, number>();
  if (initial) depth.set(initial, 0);
  let changed = true;
  while (changed) {
    changed = false;
    for (const transition of transitions) {
      const fromDepth = depth.get(transition.from);
      if (fromDepth === undefined) continue;
      if (!depth.has(transition.to)) {
        depth.set(transition.to, fromDepth + 1);
        changed = true;
      }
    }
  }
  const perColumn = new Map<number, number>();
  for (const state of ordered) {
    const column = depth.get(state.id) ?? 0;
    const row = perColumn.get(column) ?? 0;
    perColumn.set(column, row + 1);
    state.position = { x: 80 + column * 220, y: 60 + row * 120 };
  }

  return { states: ordered, transitions, initial, terminal };
}

/** Write the editable model back out as a `stateDiagram-v2`. */
export function emitStateFlow(flow: StateFlow): string {
  const lines = ["stateDiagram-v2"];

  if (flow.initial) lines.push(`    ${START_MARKER} --> ${flow.initial}`);
  for (const transition of flow.transitions) {
    const label = transition.label?.trim();
    lines.push(`    ${transition.from} --> ${transition.to}${label ? ` : ${label}` : ""}`);
  }
  for (const state of flow.terminal) lines.push(`    ${state} --> ${START_MARKER}`);

  // A state with no transitions at all would vanish; name it so it survives.
  const mentioned = new Set<string>();
  if (flow.initial) mentioned.add(flow.initial);
  for (const transition of flow.transitions) {
    mentioned.add(transition.from);
    mentioned.add(transition.to);
  }
  for (const state of flow.terminal) mentioned.add(state);
  for (const state of flow.states) {
    if (!mentioned.has(state.id)) lines.push(`    ${state.name}`);
  }

  return lines.join("\n");
}

export function validateStateFlow(flow: StateFlow): string[] {
  const problems: string[] = [];
  if (!flow.states.length) return ["No states yet — add the first one."];
  if (!flow.initial) problems.push("No starting state — mark the state the entity begins in.");
  if (!flow.terminal.length) problems.push("No finishing state — mark at least one as an end.");

  for (const state of flow.states) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(state.name)) {
      problems.push(`"${state.name}" is not a valid status value (letters, digits, underscore).`);
    }
  }
  return problems;
}
