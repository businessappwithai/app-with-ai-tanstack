/**
 * The automation model — one sentence, three parts.
 *
 * "When an Order is created, only if Order.total is greater than 1000, then
 * look up a rule table, set a field, and create an Invoice."
 *
 * That sentence is the whole model. A trigger, a flat list of conditions that
 * must all pass, and an ordered list of steps. There is deliberately no graph
 * here: the executor runs steps in order and stops at the first failure, so a
 * list is the honest representation and the one the builder can draw as a
 * ladder without inventing layout the author never asked for.
 *
 * Storage is unchanged. `serializeAutomation` writes the same mermaid
 * flowchart with `%%` directives the parser already reads, so automations
 * saved before this builder existed still open, and anything saved here still
 * runs through the existing executor.
 */

import {
  type DecisionTable,
  emptyDecisionTable,
  STEP_TYPES,
  type StepType,
} from "../workflow/bpmn-model";

export type { DecisionTable, StepType };
export { emptyDecisionTable, STEP_TYPES };

/* -------------------------------------------------------------------------- */
/*  Triggers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The events an automation can start from.
 *
 * These are the entity lifecycle hooks the generated services already fire, so
 * a trigger is not a new concept — it is the hook, named the way someone
 * describing their business would name it.
 */
export const TRIGGER_EVENTS = [
  "created",
  "beforeCreated",
  "updated",
  "beforeUpdated",
  "deleted",
  "beforeDeleted",
] as const;

export type TriggerEvent = (typeof TRIGGER_EVENTS)[number];

/** How each event reads in the builder, and what it means for the write. */
export const TRIGGER_LABELS: Record<TriggerEvent, string> = {
  created: "is created",
  beforeCreated: "is about to be created",
  updated: "is updated",
  beforeUpdated: "is about to be updated",
  deleted: "is deleted",
  beforeDeleted: "is about to be deleted",
};

export const TRIGGER_HINTS: Record<TriggerEvent, string> = {
  created: "Runs after the record is written. The record already exists.",
  beforeCreated: "Runs before the record is written, so it can still block the write.",
  updated: "Runs after the change is saved.",
  beforeUpdated: "Runs before the change is saved, so it can still block it.",
  deleted: "Runs after the record is removed.",
  beforeDeleted: "Runs before the record is removed, so it can still block it.",
};

/** The hook name each trigger maps to on the generated service. */
export const TRIGGER_HOOKS: Record<TriggerEvent, string> = {
  created: "afterCreate",
  beforeCreated: "beforeCreate",
  updated: "afterUpdate",
  beforeUpdated: "beforeUpdate",
  deleted: "afterDelete",
  beforeDeleted: "beforeDelete",
};

const HOOK_TO_EVENT: Record<string, TriggerEvent> = {
  afterCreate: "created",
  beforeCreate: "beforeCreated",
  afterUpdate: "updated",
  beforeUpdate: "beforeUpdated",
  afterDelete: "deleted",
  beforeDelete: "beforeDeleted",
};

export interface Trigger {
  /** The entity this automation watches, e.g. "Order". */
  entity: string;
  event: TriggerEvent;
}

/* -------------------------------------------------------------------------- */
/*  Conditions                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Comparison operators, worded as a check reads rather than as an expression.
 *
 * `arity: 0` means the operator takes no value — "is empty" has nothing on the
 * right-hand side, and the builder hides the value box for it rather than
 * leaving an input that must stay blank to be correct.
 */
export const OPERATORS = [
  { id: "eq", label: "is", arity: 1 },
  { id: "neq", label: "is not", arity: 1 },
  { id: "gt", label: "is greater than", arity: 1 },
  { id: "gte", label: "is greater than or equal to", arity: 1 },
  { id: "lt", label: "is less than", arity: 1 },
  { id: "lte", label: "is less than or equal to", arity: 1 },
  { id: "contains", label: "contains", arity: 1 },
  { id: "startsWith", label: "starts with", arity: 1 },
  { id: "isEmpty", label: "is empty", arity: 0 },
  { id: "isNotEmpty", label: "is not empty", arity: 0 },
  { id: "changed", label: "changed", arity: 0 },
] as const;

export type OperatorId = (typeof OPERATORS)[number]["id"];

export function operatorLabel(id: string): string {
  return OPERATORS.find((o) => o.id === id)?.label ?? id;
}

export function operatorArity(id: string): number {
  return OPERATORS.find((o) => o.id === id)?.arity ?? 1;
}

export interface Condition {
  id: string;
  /** Dotted path read from the run context, e.g. "order.total". */
  field: string;
  operator: OperatorId | string;
  /** Ignored when the operator takes no value. */
  value: string;
}

/* -------------------------------------------------------------------------- */
/*  Steps                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * How each step type reads in the ladder and what it is for.
 *
 * The vocabulary is the executor's — Decision, CreateEntity, UpdateEntity,
 * DeleteEntity, Formula, REST — relabelled so the palette answers "what do I
 * want to happen" rather than "which node class is this".
 */
export const STEP_LABELS: Record<StepType, string> = {
  Decision: "Look up a rule table",
  CreateEntity: "Create a record",
  UpdateEntity: "Update a field",
  DeleteEntity: "Delete a record",
  Formula: "Work out a value",
  REST: "Call a web service",
};

export const STEP_HINTS: Record<StepType, string> = {
  Decision: "Ask a table of rules for an answer, then use it in a later step.",
  CreateEntity: "Insert a row and remember its id for later steps.",
  UpdateEntity: "Write one field, on this record or a related one.",
  DeleteEntity: "Soft delete by default, so the audit trail still resolves.",
  Formula: "Set, copy, add, subtract, multiply or divide.",
  REST: "POST to an external URL and keep the response.",
};

/** A single glyph per step type. Kept text so it renders without an icon font. */
export const STEP_GLYPHS: Record<StepType, string> = {
  Decision: "▤",
  CreateEntity: "✚",
  UpdateEntity: "✎",
  DeleteEntity: "✕",
  Formula: "ƒ",
  REST: "↗",
};

export interface AutomationStep {
  id: string;
  type: StepType;
  /**
   * What later steps call this step's result. Empty means the step produces
   * nothing worth naming (a delete, usually).
   */
  resultName: string;
  /** Type-specific configuration. Keys are documented per type in STEP_FIELDS. */
  props: Record<string, string>;
  /**
   * The loop this step belongs to, if any. At most one: loops do not nest, so
   * a step is either inside exactly one repeat or outside them all.
   */
  loopId?: string;
  /** Only set on Decision steps that own an inline table rather than a shared one. */
  table?: DecisionTable;
}

/** Which property fields each step type shows, in the order they read. */
export const STEP_FIELDS: Record<StepType, readonly string[]> = {
  Decision: ["ruleTable", "inputs"],
  CreateEntity: ["entity", "values"],
  UpdateEntity: ["entity", "field", "value"],
  DeleteEntity: ["entity", "target"],
  Formula: ["operation", "left", "right"],
  REST: ["method", "url", "body"],
};

/* -------------------------------------------------------------------------- */
/*  Loops                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Repeat while a rule holds — the steps run again and again until the check
 * fails.
 *
 * The check is re-evaluated before every pass against the record *as it stands
 * then*, which is the point: a step inside the loop changes the record, and
 * that change is what eventually ends the loop.
 *
 * This is genuinely unbounded, and an automation runs inside the write that
 * triggered it — so a check that never fails does not spin a harmless
 * background job, it holds a database transaction open until something times
 * out. `LOOP_SAFETY_LIMIT` is the backstop. It is not a second way to say "how
 * many times": reaching it means the automation was wrong, so the run is marked
 * failed and says so, rather than finishing quietly as though the loop had
 * ended on its own.
 */
export interface Loop {
  id: string;
  /** Re-checked before each pass. The loop ends the first time it fails. */
  condition: Condition;
}

/** Passes after which a loop is abandoned and the run reported as failed. */
export const LOOP_SAFETY_LIMIT = 1000;

/**
 * A tolerant read of `loops`.
 *
 * Automations stored before loops existed have no such field, and they are the
 * majority of what is in any database today. Defaulting here rather than at
 * each call site means an old record opens and serialises unchanged instead of
 * throwing in whichever function reaches it first.
 */
export function loopsOf(automation: Automation): Loop[] {
  return automation.loops ?? [];
}

/** The steps belonging to a loop, in ladder order. */
export function stepsInLoop(automation: Automation, loopId: string): AutomationStep[] {
  return automation.steps.filter((step) => step.loopId === loopId);
}

/** The loop a step sits in, if any. */
export function loopOf(automation: Automation, step: AutomationStep): Loop | undefined {
  return step.loopId ? loopsOf(automation).find((l) => l.id === step.loopId) : undefined;
}

/**
 * A loop's members must sit together in the ladder.
 *
 * The list is the running order, so members split by an outside step would mean
 * the workflow runs A, (something else), B and repeats only part of it — a
 * shape the drawn subgraph could not honestly represent either.
 */
export function loopIsContiguous(automation: Automation, loopId: string): boolean {
  const positions = automation.steps
    .map((step, i) => (step.loopId === loopId ? i : -1))
    .filter((i) => i >= 0);
  if (positions.length === 0) return true;
  const first = positions[0] as number;
  return positions.every((position, offset) => position === first + offset);
}

/* -------------------------------------------------------------------------- */
/*  The automation                                                             */
/* -------------------------------------------------------------------------- */

export type AutomationStatus = "draft" | "live" | "paused";

export interface Automation {
  id: string;
  name: string;
  description?: string;
  trigger: Trigger;
  conditions: Condition[];
  /** Bounded repeats. A step joins one by carrying its id in `loopId`. */
  loops: Loop[];
  steps: AutomationStep[];
  status: AutomationStatus;
  updatedAt?: string;
}

let seq = 0;
export function newId(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq.toString(36)}${Date.now().toString(36)}`;
}

export function emptyAutomation(entity: string): Automation {
  return {
    id: newId("auto"),
    name: "Untitled automation",
    trigger: { entity, event: "created" },
    conditions: [],
    loops: [],
    steps: [],
    status: "draft",
  };
}

export function newCondition(): Condition {
  return { id: newId("cond"), field: "", operator: "eq", value: "" };
}

/**
 * A new loop, named `L1`, `L2`, … rather than with the opaque id every other
 * object gets. The id is what an author types in `{{L1.iteration}}` and what
 * they read in the serialised model, so it has to be short and predictable.
 */
export function newLoop(existing: Loop[]): Loop {
  let n = existing.length + 1;
  while (existing.some((loop) => loop.id === `L${n}`)) n += 1;
  return { id: `L${n}`, condition: newCondition() };
}

/** How a loop reads on its card: "Repeat while status is open". */
export function describeLoop(loop: Loop): string {
  const check = loop.condition.field
    ? describeCondition(loop.condition)
    : "a check that is not set yet";
  return `Repeat while ${check}`;
}

export function newStep(type: StepType): AutomationStep {
  return {
    id: newId("step"),
    type,
    resultName: defaultResultName(type),
    props: {},
    ...(type === "Decision" ? {} : {}),
  };
}

function defaultResultName(type: StepType): string {
  switch (type) {
    case "Decision":
      return "decision";
    case "CreateEntity":
      return "createdId";
    case "Formula":
      return "value";
    case "REST":
      return "response";
    default:
      return "";
  }
}

/* -------------------------------------------------------------------------- */
/*  Reading an automation back as a sentence                                   */
/* -------------------------------------------------------------------------- */

/** The trigger line, as the WHEN card shows it. */
export function describeTrigger(t: Trigger): string {
  return `${article(t.entity)} ${t.entity} ${TRIGGER_LABELS[t.event] ?? t.event}`;
}

/** One condition, as the IF card shows it. */
export function describeCondition(c: Condition): string {
  const op = operatorLabel(c.operator);
  return operatorArity(c.operator) === 0
    ? `${c.field || "a field"} ${op}`
    : `${c.field || "a field"} ${op} ${c.value || "…"}`;
}

/** One step, as the THEN card shows it. */
export function describeStep(s: AutomationStep): string {
  const p = s.props;
  switch (s.type) {
    case "Decision":
      return `Look up ${p.ruleTable || "a rule table"}${s.resultName ? ` → ${s.resultName}` : ""}`;
    case "CreateEntity":
      return `Create ${article(p.entity || "record")} ${p.entity || "record"}${
        s.resultName ? ` → ${s.resultName}` : ""
      }`;
    case "UpdateEntity":
      return `Set ${p.entity && p.field ? `${p.entity}.${p.field}` : p.field || "a field"} to ${
        p.value || "…"
      }`;
    case "DeleteEntity":
      return `Delete ${article(p.entity || "record")} ${p.entity || "record"}`;
    case "Formula":
      return `${p.operation || "Set"} ${p.left || "…"}${p.right ? ` and ${p.right}` : ""}${
        s.resultName ? ` → ${s.resultName}` : ""
      }`;
    case "REST":
      return `${p.method || "POST"} to ${p.url || "a URL"}${
        s.resultName ? ` → ${s.resultName}` : ""
      }`;
    default:
      return STEP_LABELS[s.type] ?? s.type;
  }
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

/* -------------------------------------------------------------------------- */
/*  Values available at a point in the run                                     */
/* -------------------------------------------------------------------------- */

export interface AvailableValue {
  /** The reference an author types, without braces, e.g. "tier.discount_pct". */
  path: string;
  type: string;
  /** Where it came from, shown beside the path. */
  origin: string;
}

/**
 * Everything a step at `index` may reference.
 *
 * Only values produced *above* the step are returned, so the picker can never
 * offer a reference to a step that has not run yet — the single most common way
 * a hand-written workflow breaks in production.
 */
export function valuesAvailableAt(
  automation: Automation,
  index: number,
  entityFields: Record<string, string[]> = {}
): AvailableValue[] {
  const out: AvailableValue[] = [];
  const entity = automation.trigger.entity;
  const root = entity.toLowerCase();

  for (const field of entityFields[entity] ?? []) {
    out.push({ path: `${root}.${field}`, type: "field", origin: entity });
  }
  if (out.length === 0) {
    out.push({ path: `${root}.id`, type: "uuid", origin: entity });
  }

  // Only offered to steps actually inside the repeat — outside it the pass
  // number has no meaning, and a picker that offers it anyway teaches the
  // wrong model of when a loop variable exists.
  const own = automation.steps[index];
  const loop = own ? loopOf(automation, own) : undefined;
  if (loop) {
    out.push({
      path: `${loop.id}.iteration`,
      type: "number",
      origin: `repeat ${loop.id}`,
    });
  }

  automation.steps.slice(0, Math.max(0, index)).forEach((step, i) => {
    if (!step.resultName) return;
    const origin = `step ${i + 1}`;
    if (step.type === "Decision") {
      const outputs = step.table?.outputs ?? [];
      if (outputs.length === 0) {
        out.push({ path: step.resultName, type: "answer", origin });
      }
      for (const o of outputs) {
        out.push({ path: `${step.resultName}.${o.field || o.name}`, type: "answer", origin });
      }
    } else {
      out.push({ path: step.resultName, type: stepResultType(step.type), origin });
    }
  });

  return out;
}

function stepResultType(type: StepType): string {
  switch (type) {
    case "CreateEntity":
      return "uuid";
    case "Formula":
      return "value";
    case "REST":
      return "response";
    default:
      return "value";
  }
}

/* -------------------------------------------------------------------------- */
/*  Validation — stated as the author would fix it                             */
/* -------------------------------------------------------------------------- */

export interface Problem {
  /** Which card the problem belongs to, so the ladder can mark it. */
  target: string;
  message: string;
}

export function validateAutomation(automation: Automation): Problem[] {
  const problems: Problem[] = [];

  if (!automation.name.trim()) {
    problems.push({ target: "name", message: "Give the automation a name." });
  }
  if (!automation.trigger.entity.trim()) {
    problems.push({ target: "trigger", message: "Pick the record type this watches." });
  }

  for (const c of automation.conditions) {
    if (!c.field.trim()) {
      problems.push({ target: c.id, message: "This check does not say which field to look at." });
    } else if (operatorArity(c.operator) === 1 && !c.value.trim()) {
      problems.push({
        target: c.id,
        message: `"${c.field} ${operatorLabel(c.operator)}" needs a value to compare against.`,
      });
    }
  }

  if (automation.steps.length === 0) {
    problems.push({ target: "steps", message: "Add at least one thing for this to do." });
  }

  const named = new Set<string>();
  automation.steps.forEach((step, i) => {
    for (const field of STEP_FIELDS[step.type] ?? []) {
      if (field === "inputs" || field === "values" || field === "body") continue;
      if (!(step.props[field] ?? "").trim()) {
        problems.push({
          target: step.id,
          message: `Step ${i + 1} is missing ${humanField(field)}.`,
        });
      }
    }
    if (step.resultName) {
      if (named.has(step.resultName)) {
        problems.push({
          target: step.id,
          message: `Two steps both save their answer as "${step.resultName}". Rename one.`,
        });
      }
      named.add(step.resultName);
    }
  });

  for (const loop of loopsOf(automation)) {
    const members = stepsInLoop(automation, loop.id);
    if (members.length === 0) {
      problems.push({
        target: loop.id,
        message: `Repeat ${loop.id} has no steps in it. Add one, or remove the repeat.`,
      });
      continue;
    }

    if (!loopIsContiguous(automation, loop.id)) {
      problems.push({
        target: loop.id,
        message: `The steps in repeat ${loop.id} have something else between them. Move them together.`,
      });
    }

    const check = loop.condition;
    if (!check.field.trim()) {
      problems.push({
        target: loop.id,
        message: `Repeat ${loop.id} does not say what to check, so it would never stop.`,
      });
    } else if (operatorArity(check.operator) === 1 && !check.value.trim()) {
      problems.push({
        target: loop.id,
        message: `"${check.field} ${operatorLabel(check.operator)}" needs a value to compare against.`,
      });
    }

    // A check on a field no step in the loop writes cannot change between
    // passes, so the loop either never runs or runs until the safety limit
    // aborts it. Both are bugs, and both are invisible until it is live.
    if (check.field.trim() && !membersCanChange(members, check.field)) {
      problems.push({
        target: loop.id,
        message:
          `Nothing inside repeat ${loop.id} changes "${check.field}", so the check will ` +
          `read the same every pass. Add a step that updates it, or the repeat will run ` +
          `until it is cut off at ${LOOP_SAFETY_LIMIT} passes.`,
      });
    }
  }

  return problems;
}

/**
 * Does any step in the loop write the field the loop checks?
 *
 * Deliberately shallow — it matches an `UpdateEntity` on the field by name and
 * treats every other step type as opaque. A `REST` call or a `Decision` can
 * change the world in ways this cannot see, so this only ever reports the case
 * it is certain about: a loop whose body contains no write to that field at all.
 */
function membersCanChange(members: AutomationStep[], field: string): boolean {
  const bare = field.includes(".") ? (field.split(".").pop() as string) : field;
  return members.some((step) => {
    if (step.type !== "UpdateEntity") return true;
    const written = (step.props.field ?? "").trim();
    return written === "" || written === bare || written === field;
  });
}

function humanField(field: string): string {
  switch (field) {
    case "ruleTable":
      return "a rule table to look up";
    case "entity":
      return "a record type";
    case "field":
      return "a field to write";
    case "value":
      return "a value to write";
    case "operation":
      return "an operation";
    case "left":
      return "a value to work from";
    case "url":
      return "a URL";
    case "method":
      return "a method";
    case "target":
      return "a record to delete";
    default:
      return field;
  }
}

/* -------------------------------------------------------------------------- */
/*  Storage — mermaid flowchart with %% directives, unchanged                  */
/* -------------------------------------------------------------------------- */

/**
 * Write the automation as the flowchart the existing parser and generator read.
 *
 * The diagram is a straight chain because the model is a list; the `%%`
 * directives carry the semantics and every renderer ignores them, so the
 * artifact stays valid, renderable mermaid.
 */
export function serializeAutomation(a: Automation): string {
  const lines: string[] = [];
  lines.push("flowchart TD");
  lines.push(`%%meta kind: workflow`);
  lines.push(`%%workflow name: ${a.name}`);
  lines.push(`%%hook ${TRIGGER_HOOKS[a.trigger.event]} on ${a.trigger.entity}`);

  for (const c of a.conditions) {
    lines.push(`%%guard ${c.field} ${c.operator} ${JSON.stringify(c.value)}`);
  }

  for (const loop of loopsOf(a)) {
    if (stepsInLoop(a, loop.id).length === 0) continue;
    const c = loop.condition;
    lines.push(`%%loop ${loop.id} while: ${c.field} ${c.operator} ${JSON.stringify(c.value)}`);
  }

  // The edge chain, where a loop contributes its subgraph id once rather than
  // each of its members — the repeat is one unit in the flow.
  const ids: string[] = ["start"];
  lines.push(`  start([${a.trigger.entity} ${TRIGGER_LABELS[a.trigger.event]}])`);

  if (a.conditions.length > 0) {
    ids.push("guard");
    lines.push(`  guard{${a.conditions.map(describeCondition).join(" and ")}}`);
  }

  /** Directives for one step, kept out of the node loop so the subgraph body stays clean. */
  const directives: string[] = [];
  const emit = (step: AutomationStep, nodeId: string) => {
    directives.push(
      `%%step ${nodeId} type: ${step.type}${step.resultName ? ` as: ${step.resultName}` : ""}`
    );
    for (const [k, v] of Object.entries(step.props)) {
      if (v) directives.push(`%%step ${nodeId} ${k}: ${v}`);
    }
    if (step.table) directives.push(`%%step ${nodeId} table: ${JSON.stringify(step.table)}`);
    if (step.loopId) directives.push(`%%step ${nodeId} in: ${step.loopId}`);
  };

  let openLoop: string | null = null;
  a.steps.forEach((step, i) => {
    const nodeId = `s${i + 1}`;

    if (step.loopId !== openLoop) {
      if (openLoop) lines.push("  end");
      openLoop = step.loopId ?? null;
      if (openLoop) {
        const loop = loopsOf(a).find((l) => l.id === openLoop);
        // A `subgraph` is real Mermaid, so the repeat is visible to any
        // renderer rather than being knowable only from the directives.
        lines.push(`  subgraph ${openLoop}[${loop ? describeLoop(loop) : "Repeat"}]`);
        ids.push(openLoop);
      }
    }

    lines.push(`  ${openLoop ? "  " : ""}${nodeId}[${describeStep(step)}]`);
    if (!openLoop) ids.push(nodeId);
    emit(step, nodeId);
  });
  if (openLoop) lines.push("  end");

  lines.push(...directives);

  ids.push("done");
  lines.push("  done([Done])");

  for (let i = 0; i < ids.length - 1; i++) {
    lines.push(`  ${ids[i]} --> ${ids[i + 1]}`);
  }

  return lines.join("\n");
}

/**
 * Read a flowchart back into the model.
 *
 * Anything the directives do not describe is dropped rather than guessed at —
 * a half-understood automation that silently loses a step is worse than one
 * that opens with the steps it could actually read.
 */
/**
 * Which trigger a saga's `operation:` denotes.
 *
 * A saga names the CRUD operation; an automation names the moment. Sagas run
 * after the write, so each maps to the corresponding `after` event.
 */
const SAGA_OPERATION_EVENTS: Record<string, TriggerEvent> = {
  CREATE: "created",
  UPDATE: "updated",
  DELETE: "deleted",
};

/**
 * Split a saga step's one-line property list.
 *
 * A value runs to the next `key:` token, so it may contain spaces — a title, a
 * URL, a JSON blob. This is the same rule the generator's own step compiler
 * uses, deliberately: two readers of one directive that disagree about where a
 * value ends is a bug waiting to happen.
 */
function parseSagaProps(rest: string): Record<string, string> {
  const props: Record<string, string> = {};
  for (const part of rest.trim().split(/\s+(?=[A-Za-z_]\w*:)/)) {
    const match = part.match(/^([A-Za-z_]\w*):\s*(.*)$/s);
    if (match?.[1]) props[match[1]] = (match[2] ?? "").trim();
  }
  return props;
}

/**
 * Translate saga property names into the automation model's.
 *
 * The two dialects name the same things differently — a saga's `fields` is an
 * automation's `values`, its `target`/`source` pair on a Formula is `as` plus
 * `left`. Mapping rather than passing through matters: an unmapped key lands in
 * `props` where no inspector renders it, so the step opens looking empty and an
 * author who saves it silently drops the configuration.
 *
 * Anything with no counterpart is kept under its own name rather than dropped,
 * so nothing is lost on a round trip even where the builder cannot yet edit it.
 */
function applySagaProps(entry: AutomationStep, props: Record<string, string>): void {
  const take = (key: string): string | undefined => {
    const value = props[key];
    delete props[key];
    return value;
  };

  // `as:` names the result on every step type that publishes one.
  const as = take("as");
  if (as) entry.resultName = as;

  if (entry.type === "Decision") {
    const table = take("decisionTable");
    if (table) {
      try {
        entry.table = JSON.parse(table) as DecisionTable;
      } catch {
        /* an unreadable table is left off rather than replaced with an empty one */
      }
    }
  } else if (entry.type === "Formula") {
    // A saga writes its result name as `target:` and its operands as
    // `source:`/`value:` and `operand:`.
    const target = take("target");
    if (target && !entry.resultName) entry.resultName = target;
    const source = take("source");
    const value = take("value");
    if (source) entry.props.left = `{{${source}}}`;
    else if (value !== undefined) entry.props.left = value;
    const operand = take("operand");
    if (operand !== undefined) entry.props.right = operand;
  } else if (entry.type === "CreateEntity") {
    const fields = take("fields");
    if (fields !== undefined) entry.props.values = fields;
  } else if (entry.type === "UpdateEntity") {
    // `source:` reads another step's published value; `value:` is a literal.
    const source = take("source");
    if (source) entry.props.value = `{{${source}}}`;
    // A saga aims at another row with targetSource/targetField; the automation
    // model has one `target`, so the row reference wins over the column.
    const targetSource = take("targetSource");
    if (targetSource) entry.props.target = `{{${targetSource}}}`;
  } else if (entry.type === "DeleteEntity") {
    const targetSource = take("targetSource");
    const targetField = take("targetField");
    if (targetSource) entry.props.target = `{{${targetSource}}}`;
    else if (targetField) entry.props.target = targetField;
  } else if (entry.type === "REST") {
    const body = take("bodyTemplate");
    if (body !== undefined) entry.props.body = body;
  }

  for (const [key, value] of Object.entries(props)) {
    if (value) entry.props[key] ??= value;
  }
}

export function parseAutomation(source: string, fallbackEntity = "Record"): Automation {
  const a = emptyAutomation(fallbackEntity);
  const stepsById = new Map<string, AutomationStep>();
  const order: string[] = [];

  for (const raw of source.split("\n")) {
    const line = raw.trim();

    const name = line.match(/^%%workflow\s+name:\s*(.+)$/);
    if (name?.[1]) {
      a.name = name[1].trim();
      continue;
    }

    // The saga form carries the name, entity and operation on one line. Read
    // before the generic %%workflow match so the positional form is not
    // mistaken for a name.
    const saga = line.match(/^%%workflow\s+(\w+)\s+entity:\s*(\w+)(.*)$/);
    if (saga?.[1] && saga[2]) {
      a.name = saga[1];
      const operation = saga[3]?.match(/operation:\s*(\w+)/)?.[1]?.toUpperCase();
      a.trigger = { entity: saga[2], event: SAGA_OPERATION_EVENTS[operation ?? ""] ?? "created" };
      continue;
    }

    const hook = line.match(/^%%hook\s+(\w+)\s+on\s+(\w+)/);
    if (hook?.[1] && hook[2]) {
      a.trigger = { entity: hook[2], event: HOOK_TO_EVENT[hook[1]] ?? "created" };
      continue;
    }

    const loop = line.match(/^%%loop\s+(\w+)\s+while:\s*(\S+)\s+(\S+)\s*(.*)$/);
    if (loop?.[1] && loop[2] && loop[3]) {
      let value = (loop[4] ?? "").trim();
      try {
        if (value.startsWith('"')) value = JSON.parse(value) as string;
      } catch {
        /* leave the raw text — better than dropping the check that ends the loop */
      }
      a.loops.push({
        id: loop[1],
        condition: { id: newId("cond"), field: loop[2], operator: loop[3], value },
      });
      continue;
    }

    // An RBAC restriction, not a condition. %%guard used to mean both; the
    // RBAC sense is now spelled %%rbac, but a model written before that would
    // otherwise be read as a check on a field literally called "role:admin"
    // with an operator of "on" — a condition that can never pass, silently
    // disabling the automation. Skipped rather than guessed at.
    if (/^%%guard\s+role:\S+\s+on\s+\w+\.\w+\s*$/.test(line)) continue;

    const guard = line.match(/^%%guard\s+(\S+)\s+(\S+)\s*(.*)$/);
    if (guard?.[1] && guard[2]) {
      let value = (guard[3] ?? "").trim();
      try {
        if (value.startsWith('"')) value = JSON.parse(value) as string;
      } catch {
        /* leave the raw text — better than dropping the check */
      }
      a.conditions.push({
        id: newId("cond"),
        field: guard[1],
        operator: guard[2],
        value,
      });
      continue;
    }

    // Saga form: the type sits where the automation form puts `type:`, and
    // every property shares the one line. Matched first because the automation
    // pattern below would read `Decision decisionTable:` as a property named
    // `decisionTable` on an untyped step.
    const sagaStep = line.match(/^%%step\s+(\S+)\s+([A-Za-z]\w*)\s+(.*)$/);
    if (sagaStep?.[2] && STEP_TYPES.includes(sagaStep[2] as StepType)) {
      const [, nodeId = "", typeName = "", rest = ""] = sagaStep;
      let entry = stepsById.get(nodeId);
      if (!entry) {
        entry = { id: newId("step"), type: "Formula", resultName: "", props: {} };
        stepsById.set(nodeId, entry);
        order.push(nodeId);
      }
      entry.type = typeName as StepType;
      applySagaProps(entry, parseSagaProps(rest));
      continue;
    }

    const step = line.match(/^%%step\s+(\S+)\s+(\w+):\s*(.*)$/);
    if (step?.[1] && step[2]) {
      const [, nodeId, key, rest = ""] = step;
      let entry = stepsById.get(nodeId);
      if (!entry) {
        entry = { id: newId("step"), type: "Formula", resultName: "", props: {} };
        stepsById.set(nodeId, entry);
        order.push(nodeId);
      }
      const value = rest.trim();
      if (key === "type") {
        const [typeName = "", ...tail] = value.split(/\s+as:\s*/);
        if (STEP_TYPES.includes(typeName.trim() as StepType)) {
          entry.type = typeName.trim() as StepType;
        }
        if (tail[0]) entry.resultName = tail[0].trim();
      } else if (key === "as") {
        entry.resultName = value;
      } else if (key === "table") {
        try {
          entry.table = JSON.parse(value) as DecisionTable;
        } catch {
          /* an unreadable table is left off rather than replaced with an empty one */
        }
      } else if (key === "in") {
        entry.loopId = value;
      } else {
        entry.props[key] = value;
      }
    }
  }

  a.steps = order.map((id) => stepsById.get(id)).filter((s): s is AutomationStep => Boolean(s));

  // A membership naming a loop that was never declared would render as a box
  // with no repeat count and execute once, which is not what the document says.
  // Dropping the membership keeps the step, which is the recoverable half.
  const declared = new Set(loopsOf(a).map((loop) => loop.id));
  for (const step of a.steps) {
    if (step.loopId && !declared.has(step.loopId)) step.loopId = undefined;
  }
  // An empty loop is not drawn and not run, so it is not kept either.
  a.loops = loopsOf(a).filter((loop) => a.steps.some((step) => step.loopId === loop.id));

  return a;
}
