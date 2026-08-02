/**
 * Business rules authored in EML.
 *
 * A `%%rule` section is a decision flowchart. These compile it to a GoRules JDM
 * decision graph — the same representation the generated application's rules
 * engine evaluates and its admin editor edits — so a rule drawn in the design
 * phase is the rule that runs.
 *
 * The flowchart parser and JDM converter live here rather than in the web app
 * because the generator is what consumes them; the web app re-exports these.
 */

export * from "./flowchart-parser";
export * from "./jdm-converter";

import type { EmlRuleSection } from "../eml";
import { parseMermaidFlowchart } from "./flowchart-parser";
import { convertToJdm, type JdmGraph } from "./jdm-converter";

/** A rule compiled from EML, ready to seed into `sys_rule_definitions`. */
export interface CompiledRule {
  /** Directive name, used as the seeded rule's identity. */
  name: string;
  /** Table the rule is bound to, e.g. `bus_sample`. */
  tableName: string;
  entity: string;
  /** Lifecycle event from the directive, e.g. `beforeCreate`. */
  event: string;
  /** CRUD operation the rules engine keys on: CREATE / UPDATE / DELETE / ALL. */
  operation: "CREATE" | "UPDATE" | "DELETE" | "ALL";
  priority: number;
  /** The JDM decision graph, serialised. */
  jdmContent: string;
}

/** Map a lifecycle event onto the operation the rules engine evaluates against. */
export function eventToOperation(event: string): CompiledRule["operation"] {
  const normalized = event.toLowerCase();
  if (normalized.includes("create")) return "CREATE";
  if (normalized.includes("update")) return "UPDATE";
  if (normalized.includes("delete")) return "DELETE";
  return "ALL";
}

/** `Sample` → `bus_sample`, matching the ERD's table naming. */
function toTableName(entity: string): string {
  const snake = entity
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
  return snake.startsWith("bus_") || snake.startsWith("sys_") ? snake : `bus_${snake}`;
}

/**
 * Compile the `%%rule` sections of a model into seedable JDM.
 *
 * A section whose flowchart cannot be parsed is skipped with a warning rather
 * than failing the build: one malformed rule should not stop an application
 * from being generated, and the checker already reports the syntax problem.
 */
/** A side-effecting action a rule emits, declared by a `%%action` directive. */
export interface CompiledRuleAction {
  name: string;
  type: string;
  /** Zen expression over the record; `true` fires on every write. */
  when: string;
  props: Record<string, string>;
}

/** `%%action <name> <type> when: <expr> <key>: <value> ...` */
const ACTION_DIRECTIVE = /^%%action\s+([A-Za-z_][\w-]*)\s+([A-Za-z][\w-]*)\s*(.*)$/;

/** `key:` starts a new property; the value runs to the next one. */
function parseActionProps(rest: string): Record<string, string> {
  const props: Record<string, string> = {};
  const trimmed = rest.trim();
  if (!trimmed) return props;
  for (const chunk of trimmed.split(/\s+(?=[A-Za-z_]\w*:)/)) {
    const at = chunk.indexOf(":");
    if (at <= 0) continue;
    const key = chunk.slice(0, at).trim();
    if (key) props[key] = chunk.slice(at + 1).trim();
  }
  return props;
}

export function parseRuleActions(flowchart: string): CompiledRuleAction[] {
  const actions: CompiledRuleAction[] = [];
  for (const rawLine of (flowchart ?? "").split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("%%action")) continue;
    const match = line.match(ACTION_DIRECTIVE);
    if (!match) continue;
    const [, name, type, rest] = match as unknown as [string, string, string, string];
    const props = parseActionProps(rest ?? "");
    const { when, ...others } = props;
    actions.push({ name, type, when: when?.trim() || "true", props: others });
  }
  return actions;
}

/** Quote a value for a zen decision-table output cell. */
function zenLiteral(value: string): string {
  return `'${value.replace(/'/g, "\\'")}'`;
}

/**
 * A GoRules decision table, one row per `%%action`.
 *
 * The node-graph form a rules flowchart compiles to carries no outputs, so the
 * rules engine finds no actions in it and a model-declared rule can decide but
 * never act. A decision table is the shape the engine reads `action`,
 * `message`, `ruleId` and `workflowName` from, so a section that declares
 * actions is compiled as one.
 *
 * `hitPolicy: "collect"` because several rows may match one write — a rule that
 * escalates *and* stamps a field is ordinary.
 */
export function buildActionDecisionTable(
  ruleName: string,
  actions: CompiledRuleAction[]
): JdmGraph {
  // Every declared output column has to appear in every row, blank when the
  // action does not use it. zen-engine yields *no result at all* for a row with
  // a missing cell — not a row with an empty field — so an omitted column made
  // the whole rule silently evaluate to nothing.
  const cells = [
    (action: CompiledRuleAction) => zenLiteral(action.type),
    (action: CompiledRuleAction) =>
      zenLiteral(action.props.message ?? `${ruleName}: ${action.name}`),
    () => zenLiteral(ruleName),
    (action: CompiledRuleAction) => zenLiteral(action.props.workflow ?? ""),
    (action: CompiledRuleAction) => zenLiteral(action.props.field ?? ""),
    (action: CompiledRuleAction) => zenLiteral(action.props.value ?? ""),
    (action: CompiledRuleAction) => zenLiteral(action.props.targetEntity ?? ""),
    (action: CompiledRuleAction) => zenLiteral(action.props.linkField ?? ""),
  ];

  const rows = actions.map((action) => {
    const row: Record<string, string> = {
      _id: `${ruleName}-${action.name}`,
      i1: action.when,
    };
    cells.forEach((cell, index) => {
      row[`o${index + 1}`] = cell(action);
    });
    return row;
  });

  return {
    nodes: [
      { id: "input", name: "Input", type: "inputNode" },
      {
        id: `${ruleName}-table`,
        name: ruleName,
        type: "decisionTableNode",
        content: {
          hitPolicy: "collect" as const,
          inputs: [{ id: "i1", name: "Record", field: "" }],
          outputs: [
            { id: "o1", name: "Action", field: "action" },
            { id: "o2", name: "Message", field: "message" },
            { id: "o3", name: "Rule ID", field: "ruleId" },
            { id: "o4", name: "Workflow Name", field: "workflowName" },
            { id: "o5", name: "Field", field: "field" },
            { id: "o6", name: "Value", field: "value" },
            { id: "o7", name: "Target Entity", field: "targetEntity" },
            { id: "o8", name: "Link Field", field: "linkField" },
          ],
          rules: rows,
        },
      },
      { id: "output", name: "Output", type: "outputNode" },
    ],
    edges: [
      { id: "edge-1", sourceId: "input", targetId: `${ruleName}-table` },
      { id: "edge-2", sourceId: `${ruleName}-table`, targetId: "output" },
    ],
  };
}

export function compileRules(
  sections: EmlRuleSection[],
  onWarn: (message: string) => void = () => {}
): CompiledRule[] {
  const compiled: CompiledRule[] = [];

  for (const section of sections) {
    if (!section.entity) {
      onWarn(`Rule "${section.name}" declares no entity; skipping.`);
      continue;
    }

    try {
      const ast = parseMermaidFlowchart(section.flowchart);
      if (!ast.nodes.size) {
        onWarn(`Rule "${section.name}" has no nodes; skipping.`);
        continue;
      }

      // A section that declares actions compiles to a decision table: that is
      // the only JDM shape the rules engine reads actions out of.
      const actions = parseRuleActions(section.flowchart);
      const jdm = actions.length
        ? buildActionDecisionTable(section.name, actions)
        : convertToJdm(ast);
      compiled.push({
        name: section.name,
        entity: section.entity,
        tableName: toTableName(section.entity),
        event: section.event,
        operation: eventToOperation(section.event),
        priority: section.priority ?? 100,
        jdmContent: JSON.stringify(jdm),
      });
    } catch (error) {
      onWarn(
        `Rule "${section.name}" could not be compiled: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return compiled;
}
