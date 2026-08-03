/**
 * `%%workflow ... kind: saga` → executable BPMN.
 *
 * A saga section is a flowchart whose nodes are bound to steps by `%%step`
 * directives. The flowchart is what a reader sees; the directives are what the
 * generator compiles. Same split as `%%hook`: one artifact, both halves in sync.
 *
 * Before this existed, the only workflows the model could express were state
 * machines, which compile to a single "stamp the initial state" task. Anything
 * with more than one step — open a CAPA, escalate the deviation, carry a
 * computed value onto the new row — had to be drawn by hand in the running app
 * and lived only in that database.
 *
 * The step vocabulary is declared canonically in
 * `language/erdwithai-language.json` under `workflowConstructs.stepNodes`; the
 * table below is its executable mirror, shared with the checker.
 */

/** Step types the generated executor knows how to run. */
export const STEP_TYPES = [
  "UpdateEntity",
  "CreateEntity",
  "DeleteEntity",
  "Decision",
  "Formula",
  "REST",
  "Agent",
] as const;

export type StepType = (typeof STEP_TYPES)[number];

/** Formula operations that read `source` and `operand` as numbers. */
export const ARITHMETIC_OPERATIONS = ["multiply", "divide", "add", "subtract"] as const;

export interface StepContract {
  /** Properties the step cannot run without. */
  required: readonly string[];
  /** Groups where at least one member must be present. */
  oneOf?: readonly (readonly string[])[];
  /** Properties the step understands but does not require. */
  optional: readonly string[];
  /**
   * Context variables this step publishes, derived from its properties.
   *
   * A list rather than a single name because a Decision publishes one variable
   * per output column of the row that matched.
   */
  publishes?: (props: Record<string, string>) => string[];
}

/**
 * Output columns a Decision step publishes.
 *
 * Read from the table's declared `outputs` when it is authored inline, or from
 * the `publish` allow-list when it names a rule — the rule's JDM lives
 * elsewhere in the document, so the columns cannot be read from here.
 */
export function decisionPublishes(props: Record<string, string>): string[] {
  const allowed = (props.publish ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  if (allowed.length > 0) return allowed;

  const inline = props.decisionTable?.trim();
  if (!inline) return [];
  try {
    const table = JSON.parse(inline) as { outputs?: { field?: string }[] };
    return (table.outputs ?? [])
      .map((output) => output?.field?.trim())
      .filter((field): field is string => Boolean(field));
  } catch {
    return [];
  }
}

/**
 * What each step type needs.
 *
 * The executor skips a node missing these and records why, but a step that
 * silently does nothing is a bad thing to discover in production — so the
 * checker refuses the model instead.
 */
export const STEP_CONTRACTS: Record<StepType, StepContract> = {
  UpdateEntity: {
    required: ["field"],
    oneOf: [["source", "value"]],
    optional: ["entity", "targetField", "targetSource"],
  },
  CreateEntity: {
    required: ["entity", "fields"],
    optional: ["as"],
    publishes: (props) => {
      const explicit = props.as?.trim();
      if (explicit) return [explicit];
      const table = props.entity?.trim();
      return table ? [`${table.replace(/^bus_/, "")}Id`] : [];
    },
  },
  DeleteEntity: {
    required: [],
    optional: ["entity", "targetField", "targetSource", "hard"],
  },
  Decision: {
    required: [],
    // Either the table lives here, or it names one that lives elsewhere.
    oneOf: [["decisionTable", "rule"]],
    optional: ["publish"],
    publishes: decisionPublishes,
  },
  Formula: {
    required: ["target", "operation"],
    optional: ["source", "operand", "value"],
    publishes: (props) => (props.target?.trim() ? [props.target.trim()] : []),
  },
  REST: {
    required: ["url"],
    optional: ["method", "bodyTemplate"],
  },
  Agent: {
    required: ["agentId"],
    optional: [],
  },
};

/** Extra requirements a Formula picks up from its `operation`. */
export function formulaRequirements(operation: string): string[] {
  const name = operation.trim();
  if (name === "set") return ["value"];
  if (name === "copy") return ["source"];
  return ["source", "operand"];
}

export interface CompiledStep {
  /** Flowchart node id this step is bound to. */
  nodeId: string;
  type: StepType;
  /** Node label from the flowchart, used as the BPMN task name. */
  label: string;
  props: Record<string, string>;
}

export interface CompiledSaga {
  name: string;
  /** Entity as the model spells it. */
  entity: string;
  trigger: "automatic" | "rule";
  /** Which write runs it. Only consulted when `trigger` is `automatic`. */
  operation: "CREATE" | "UPDATE" | "DELETE" | "ALL";
  steps: CompiledStep[];
}

/**
 * `%%step <nodeId> <StepType> <key>: <value> ...`
 *
 * A value runs to the next `<key>:` token, so it may contain spaces — a title,
 * a URL, a JSON field map. Requiring quotes instead would make every directive
 * noisier for the sake of the rare value that needs them.
 */
const STEP_DIRECTIVE = /^%%step\s+([A-Za-z_]\w*)\s+([A-Za-z]\w*)\s*(.*)$/;

/** `key:` starts a new property; everything up to the next one is the value. */
const PROP_SPLIT = /\s+(?=[A-Za-z_]\w*:)/;

export function parseStepProps(rest: string): Record<string, string> {
  const props: Record<string, string> = {};
  const trimmed = rest.trim();
  if (!trimmed) return props;

  for (const chunk of trimmed.split(PROP_SPLIT)) {
    const at = chunk.indexOf(":");
    if (at <= 0) continue;
    const key = chunk.slice(0, at).trim();
    const value = chunk.slice(at + 1).trim();
    if (key) props[key] = value;
  }
  return props;
}

/** Node labels, so a BPMN task carries the name the author drew. */
const NODE_LABEL =
  /(?:^|[^\w])([A-Za-z_]\w*)\s*(?:\(\[([^\]]*)\]\)|\(\(([^)]*)\)\)|\[([^\]]*)\]|\{([^}]*)\}|\(([^)]*)\))/g;

export function parseNodeLabels(diagram: string): Map<string, string> {
  const labels = new Map<string, string>();
  for (const line of diagram.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("%%")) continue;
    for (const match of trimmed.matchAll(NODE_LABEL)) {
      const id = match[1]!;
      const label = (match[2] ?? match[3] ?? match[4] ?? match[5] ?? match[6] ?? "").trim();
      if (label && !labels.has(id)) labels.set(id, label);
    }
  }
  return labels;
}

/** `A --> B`, `A -->|yes| B`, `A --- B`. Ids may carry a shape. */
const EDGE =
  /([A-Za-z_]\w*)\s*(?:\(\[[^\]]*\]\)|\(\([^)]*\)\)|\[[^\]]*\]|\{[^}]*\}|\([^)]*\))?\s*(?:-->|---|-\.->|==>)(?:\|[^|]*\|)?\s*([A-Za-z_]\w*)/g;

export interface FlowGraph {
  next: Map<string, string[]>;
  hasIncoming: Set<string>;
}

export function parseEdges(diagram: string): FlowGraph {
  const next = new Map<string, string[]>();
  const hasIncoming = new Set<string>();

  for (const line of diagram.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("%%")) continue;
    EDGE.lastIndex = 0;
    let match: RegExpExecArray | null;
    // Not matchAll: the body rewinds lastIndex so a chained `A --> B --> C`
    // yields both edges, and matchAll owns the cursor.
    // biome-ignore lint/suspicious/noAssignInExpressions: standard exec-loop idiom
    while ((match = EDGE.exec(trimmed)) !== null) {
      const from = match[1]!;
      const to = match[2]!;
      next.set(from, [...(next.get(from) ?? []), to]);
      hasIncoming.add(to);
      // Chained edges (`A --> B --> C`) overlap, so resume from the target.
      EDGE.lastIndex = match.index + match[0].length - to.length;
    }
  }
  return { next, hasIncoming };
}

/**
 * Order the steps the way the author drew them.
 *
 * Walks forward from every node with no incoming edge. A node carrying a
 * `%%step` but no edges still runs, appended in document order — the canvas
 * implies a step runs even when the connection was left implicit, and dropping
 * it silently is the worse failure.
 */
export function orderSteps(diagram: string, declared: Map<string, CompiledStep>): CompiledStep[] {
  const { next, hasIncoming } = parseEdges(diagram);
  const roots = [...new Set([...next.keys()].filter((id) => !hasIncoming.has(id)))];

  const ordered: CompiledStep[] = [];
  const seen = new Set<string>();

  const walk = (id: string): void => {
    if (seen.has(id)) return; // edges can loop back
    seen.add(id);
    const step = declared.get(id);
    if (step) ordered.push(step);
    for (const child of next.get(id) ?? []) walk(child);
  };
  for (const root of roots) walk(root);

  for (const [id, step] of declared) {
    if (!seen.has(id)) ordered.push(step);
  }
  return ordered;
}

export interface SagaSection {
  name: string;
  entity: string;
  kind: string;
  trigger?: "automatic" | "rule";
  operation?: "CREATE" | "UPDATE" | "DELETE" | "ALL";
  diagram: string;
}

/**
 * Read the saga workflows a document declares.
 *
 * `knownEntities` is matched against the entity the workflow binds to; an
 * unknown one is skipped with a warning rather than generating a definition
 * against a table that does not exist.
 */
export function compileSagas(
  sections: SagaSection[],
  knownEntities: string[] = [],
  onWarn: (message: string) => void = () => {}
): CompiledSaga[] {
  const known = new Set(knownEntities);
  const compiled: CompiledSaga[] = [];

  for (const section of sections) {
    if (section.kind !== "saga") continue;

    if (known.size && !known.has(section.entity)) {
      onWarn(`Workflow "${section.name}" targets unknown entity "${section.entity}" — skipped.`);
      continue;
    }

    const labels = parseNodeLabels(section.diagram ?? "");
    const declared = new Map<string, CompiledStep>();

    for (const rawLine of (section.diagram ?? "").split("\n")) {
      const line = rawLine.trim();
      // `%%%%step` is an escaped literal, not a directive — the same escape the
      // hook compiler honours, so a doc example can show one without binding it.
      if (!line.startsWith("%%step")) continue;

      const match = line.match(STEP_DIRECTIVE);
      if (!match) {
        onWarn(`Workflow "${section.name}": could not read step directive — ${line}`);
        continue;
      }

      const [, nodeId, typeName, rest] = match as unknown as [string, string, string, string];
      if (!STEP_TYPES.includes(typeName as StepType)) {
        onWarn(
          `Workflow "${section.name}": unknown step type "${typeName}" on node ${nodeId} — skipped.`
        );
        continue;
      }
      if (declared.has(nodeId)) {
        onWarn(
          `Workflow "${section.name}": node ${nodeId} has more than one %%step — keeping the first.`
        );
        continue;
      }

      declared.set(nodeId, {
        nodeId,
        type: typeName as StepType,
        label: labels.get(nodeId) ?? nodeId,
        props: parseStepProps(rest ?? ""),
      });
    }

    if (!declared.size) {
      onWarn(`Workflow "${section.name}" declares no %%step directives — skipped.`);
      continue;
    }

    compiled.push({
      name: section.name,
      entity: section.entity,
      trigger: section.trigger === "rule" ? "rule" : "automatic",
      operation: section.operation ?? "CREATE",
      steps: orderSteps(section.diagram ?? "", declared),
    });
  }

  return compiled;
}

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * BPMN for a compiled saga: one service task per step, wired start → … → end.
 *
 * The steps are wired in a chain rather than emitted loose because the executor
 * walks sequence flows — a multi-step workflow only means anything if the steps
 * run in the order they were written.
 */
export function buildSagaBpmn(
  saga: CompiledSaga,
  tableName: string,
  /**
   * Model entity name → physical table. The executor reads `entity` as a table
   * name, so a step written against the model's `CAPA` has to reach it as
   * `bus_capa` or the insert fails with "relation does not exist".
   */
  resolveTable: (entity: string) => string = (entity) => entity
): string {
  const processId = `${tableName}_${saga.name.replace(/[^A-Za-z0-9_]/g, "_")}`;

  const tasks = saga.steps
    .map((step) => {
      const entries: Array<[string, string]> = [["nodeType", step.type]];
      for (const [key, value] of Object.entries(step.props)) {
        entries.push([key, key === "entity" ? resolveTable(value) : value]);
      }

      const properties = entries
        .map(
          ([key, value]) =>
            `          <erdwithai:property name="${escapeXmlAttr(key)}" value="${escapeXmlAttr(value)}" />`
        )
        .join("\n");

      return `    <bpmn:serviceTask id="${escapeXmlAttr(step.nodeId)}" name="${escapeXmlAttr(step.label)}">
      <bpmn:extensionElements>
        <erdwithai:properties xmlns:erdwithai="http://erdwithai.dev/bpmn">
${properties}
        </erdwithai:properties>
      </bpmn:extensionElements>
    </bpmn:serviceTask>`;
    })
    .join("\n");

  const ids = ["start", ...saga.steps.map((step) => step.nodeId), "end"];
  const flows = ids
    .slice(0, -1)
    .map(
      (from, index) =>
        `    <bpmn:sequenceFlow id="flow_${index}" sourceRef="${escapeXmlAttr(from)}" targetRef="${escapeXmlAttr(ids[index + 1]!)}" />`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="defs_${processId}" targetNamespace="http://erdwithai.dev/bpmn">
  <bpmn:process id="${processId}" isExecutable="true">
    <bpmn:startEvent id="start" name="Record written" />
${tasks}
${flows}
    <bpmn:endEvent id="end" name="Done" />
  </bpmn:process>
</bpmn:definitions>
`;
}

/** A one-line summary, shown in the generated Workflow Designer. */
export function describeSaga(saga: CompiledSaga): string {
  const chain = saga.steps.map((step) => `${step.type}`).join(" → ");
  const gate =
    saga.trigger === "rule" ? "runs when a rule triggers it" : `runs on every ${saga.operation}`;
  return `${saga.name}: ${saga.steps.length} steps · ${gate} · ${chain}`;
}
