/**
 * The generated application's side of the rules & workflows screen.
 *
 * `LogicWorkbench` (vendored from `@appwithai/editors`, the same source the modelling
 * tool's Logic step renders) owns everything an author does on the screen. It owns no I/O:
 * it is handed the rules and workflows as editable objects and a `save` that is told the
 * whole list. This file is that I/O for a running application — rules in `sys_rule_definitions`
 * through `/api/rules`, processes, hook workflows and status machines in
 * `sys_workflow_definitions` through `/api/workflow-definitions`.
 *
 * Saving diffs against what was loaded, so an edit writes the rows that changed and nothing
 * else. What the model declares (`RULE_MODEL`) decides what a rule may name.
 */

import type { ConstraintWorkflow, WorkbenchSave } from "@/editors/components/LogicWorkbench";
import { slugifyRuleName } from "@/editors/components/eml/RuleEditor";
import type { EditableRule } from "@/editors/components/eml/RuleEditor";
import {
  type EditableWorkflow,
  emitWorkflowDiagram,
  pascalWorkflowName,
} from "@/editors/components/eml/WorkflowEditor";
import {
  type Automation,
  parseAutomation,
  serializeAutomation,
  TRIGGER_HOOKS,
} from "@/editors/lib/automation/model";
import { asDecisionTable } from "@/editors/lib/automation/rule-content";
import type { DryRunResult, RuleDryRun } from "@/editors/lib/eml/dry-run-types";
import { describeOutcome } from "@/editors/lib/eml/rule-outcome";
import type { RuleConstraints } from "@/editors/lib/eml/rule-constraints";
import { parseStateFlow } from "@/editors/lib/eml/workflow-flow";
import { eventForOperation, operationForEvent } from "@/editors/lib/eml/workflow-hooks";
import { type StoredWorkflow, toEditableWorkflow } from "@/editors/lib/eml/workflow-model";
import { apiClient } from "@/lib/api-client";
import { RULE_MODEL, type RuleModelEntity } from "@/lib/rule-model";

type Operation = "CREATE" | "UPDATE" | "DELETE" | "ALL";

interface RuleRow {
  id: string;
  ruleName?: string;
  entityName?: string;
  operation?: string;
  jdmContent?: unknown;
  isActive?: boolean;
  rule_name?: string;
  entity_name?: string;
  jdm_content?: unknown;
  is_active?: boolean;
}

interface WorkflowRow {
  id: string;
  name: string;
  entity_name: string;
  kind: string;
  operation?: string;
  trigger_type?: string;
  mermaid_code?: string | null;
}

const entityByName = (name: string): RuleModelEntity | undefined =>
  RULE_MODEL.find((entity) => entity.name === name || entity.table === name);

/** The model's name for a stored entity, which may be a table (`bus_student`) or already a name. */
const entityNameOf = (stored: string): string => entityByName(stored)?.name ?? stored;

async function readJson<T>(path: string): Promise<T | null> {
  const response = await fetch(`/api${path}`);
  return response.ok ? ((await response.json()) as T) : null;
}

async function write(method: string, path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as { message?: string | string[] };
  if (!response.ok) {
    const message = [data.message ?? `The server refused the change (${response.status}).`].flat();
    throw new Error(message.join(" "));
  }
  return data;
}

/** Run a rule's graph against a record, on the server that will run it for real. */
export const simulateRule: RuleDryRun = async ({ graph, record, entity }) => {
  const data = await apiClient.post<{
    ok: boolean;
    result?: unknown;
    trace?: Array<{ node: string; output: unknown }>;
    problems?: string[];
  }>("/rules/simulate", { jdmContent: graph, testData: record, entityName: entity });
  if (!data.ok) return { ok: false, problems: data.problems ?? ["The rule did not run."] };
  const answer: DryRunResult = {
    ok: true,
    result: data.result,
    trace: data.trace ?? [],
    outcomes: describeOutcome(data.result),
  };
  return answer;
};

/** What the model says each record type may name — the Logic step reads the same from the ERD. */
export const logicEntities = RULE_MODEL.map((entity) => ({
  name: entity.name,
  attributes: entity.fields.map((field) => field.name),
}));

/** The column a status machine moves: the one whose declared values its states overlap. */
function statusColumnFor(entity: RuleModelEntity | undefined, states: string[]): string {
  const wanted = new Set(states);
  let column: string | undefined;
  let best = 0;
  for (const [field, allowed] of Object.entries(entity?.values ?? {})) {
    const overlap = allowed.filter((value) => wanted.has(value)).length;
    if (overlap > best) {
      best = overlap;
      column = field;
    }
  }
  return column ?? "status";
}

/** Per entity: its fields, the values a closed field allows, and the processes it has. */
export function logicConstraints(
  workflows: readonly ConstraintWorkflow[]
): Record<string, RuleConstraints> {
  const result: Record<string, RuleConstraints> = {};
  for (const entity of RULE_MODEL) {
    const values: Record<string, string[]> = { ...entity.values };
    const machine = workflows.find((w) => w.entity === entity.name && w.kind === "state");
    if (machine?.stateNames?.length) {
      values[statusColumnFor(entity, machine.stateNames)] = machine.stateNames;
    }
    const names = new Set([
      ...entity.processes,
      ...workflows.filter((w) => w.entity === entity.name).map((w) => w.name),
    ]);
    result[entity.name] = {
      fields: entity.fields.map((field) => field.name),
      fieldTypes: Object.fromEntries(entity.fields.map((field) => [field.name, field.type])),
      values,
      workflowNames: [...names].filter(Boolean),
    };
  }
  return result;
}

/** The write a stored hook workflow runs on, recomputed on every save. */
function operationOf(automation: Automation): Operation {
  if (automation.kind === "saga") return automation.sagaOperation ?? "CREATE";
  const events =
    automation.kind === "hook"
      ? automation.hooks.map((hook) => hook.event as string)
      : [TRIGGER_HOOKS[automation.trigger.event]];
  const operations = new Set(events.map(operationForEvent));
  return operations.size === 1 ? [...operations][0]! : events.length === 0 ? "CREATE" : "ALL";
}

function toEditableRule(row: RuleRow): EditableRule {
  const content = row.jdmContent ?? row.jdm_content;
  const table = asDecisionTable(content);
  let jdmGraph: string | undefined;
  try {
    const parsed = (typeof content === "string" ? JSON.parse(content) : content) as {
      nodes?: Array<{ type?: string }>;
    };
    // Any stored graph opens as that graph, including one that is only a table: reading it
    // back as a bare table and rebuilding the graph renames its nodes and loses cells.
    if (Array.isArray(parsed?.nodes)) {
      jdmGraph = typeof content === "string" ? content : JSON.stringify(content);
    }
  } catch {
    // not JSON: the table above is empty, which is what the editor opens
  }
  const operation = row.operation ?? "CREATE";
  return {
    key: row.id,
    name: row.ruleName ?? row.rule_name ?? "Untitled rule",
    entity: entityNameOf(row.entityName ?? row.entity_name ?? ""),
    event: eventForOperation(operation),
    table,
    ...(jdmGraph ? { jdmGraph } : {}),
    sourceKind: "decision-table",
  };
}

function toStoredWorkflow(row: WorkflowRow): StoredWorkflow {
  const entity = entityNameOf(row.entity_name);
  const diagram = row.mermaid_code ?? "";
  const kind =
    row.kind === "state"
      ? "state"
      : parseAutomation(diagram, entity).kind === "saga"
        ? "saga"
        : "hook";
  return {
    // As the model stores one: an identifier, with the name people read beside it as the title.
    name: pascalWorkflowName(row.name),
    entity,
    kind,
    title: row.name,
    diagram,
    ...(kind === "saga"
      ? {
          trigger: row.trigger_type === "rule" ? ("rule" as const) : ("automatic" as const),
          operation: (row.operation as Operation | undefined) ?? "CREATE",
        }
      : {}),
  };
}

export interface LoadedLogic {
  rules: EditableRule[];
  workflows: EditableWorkflow[];
}

/**
 * Rules and workflows for the screen, and the `save` that writes them back.
 * One host per screen: it remembers which stored row each editor key stands for.
 */
export function createLogicHost() {
  const ruleIds = new Map<string, string>();
  const ruleSnapshots = new Map<string, string>();
  // The name each stored rule is filed under. A rule the model seeded is called "Fee Invoice
  // validation", not `feeInvoiceValidation`: it keeps that name unless it is renamed, because
  // a process looks a rule up by its stored name.
  const ruleNames = new Map<string, string>();
  const workflowIds = new Map<string, string>();
  const workflowSnapshots = new Map<string, string>();

  const ruleBody = (rule: EditableRule) => {
    const wanted = slugifyRuleName(rule.title ?? rule.name);
    const kept = ruleNames.get(rule.key);
    return {
      entityName: entityByName(rule.entity)?.table ?? rule.entity,
      ruleName: kept && slugifyRuleName(kept) === wanted ? kept : wanted,
      operation: operationForEvent(rule.event),
      jdmContent: rule.jdmGraph ?? JSON.stringify(rule.table),
    };
  };

  const workflowBody = (workflow: EditableWorkflow) => {
    const name = workflow.title ?? workflow.name;
    if (workflow.kind === "state") {
      const diagram = emitWorkflowDiagram(workflow);
      const flow = parseStateFlow(diagram);
      return {
        kind: "state",
        name,
        entityName: workflow.entity,
        mermaid: diagram,
        statusField: statusColumnFor(
          entityByName(workflow.entity),
          flow.states.map((state) => state.name)
        ),
        transitions: flow.transitions.map((edge) => ({
          from: edge.from,
          to: edge.to,
          ...(edge.label ? { name: edge.label } : {}),
        })),
      };
    }
    const automation: Automation = {
      ...(workflow.automation as Automation),
      name,
      kind: workflow.kind,
    };
    return {
      kind: "automation",
      name,
      entityName: automation.trigger.entity || workflow.entity,
      operation: operationOf(automation),
      triggerType:
        automation.kind === "saga" && automation.sagaTrigger === "rule" ? "rule" : "automatic",
      mermaid: serializeAutomation(automation),
      isActive: true,
    };
  };

  async function load(): Promise<LoadedLogic> {
    const [ruleData, automationData, stateData] = await Promise.all([
      readJson<RuleRow[] | { rules?: RuleRow[]; items?: RuleRow[] }>("/rules?limit=200"),
      readJson<{ items?: WorkflowRow[] }>("/workflow-definitions?kind=automation&limit=200"),
      readJson<{ items?: WorkflowRow[] }>("/workflow-definitions?kind=state&limit=200"),
    ]);
    if (!ruleData && !automationData) throw new Error("Could not load the rules and workflows.");

    const ruleRows = Array.isArray(ruleData) ? ruleData : (ruleData?.rules ?? ruleData?.items ?? []);
    const rules = ruleRows.filter((row) => (row.isActive ?? row.is_active) !== false).map(toEditableRule);
    for (const rule of rules) {
      ruleIds.set(rule.key, rule.key);
      ruleNames.set(rule.key, rule.name);
      ruleSnapshots.set(rule.key, JSON.stringify(ruleBody(rule)));
    }

    const rows = [...(automationData?.items ?? []), ...(stateData?.items ?? [])];
    const workflows = rows.map((row) => {
      const workflow = toEditableWorkflow(toStoredWorkflow(row));
      workflowIds.set(workflow.key, row.id);
      workflowSnapshots.set(workflow.key, JSON.stringify(workflowBody(workflow)));
      return workflow;
    });
    return { rules, workflows };
  }

  /** Write what changed: new rows created, edited rows updated, removed rows deleted. */
  async function save({ rules, workflows }: WorkbenchSave): Promise<void> {
    const keptRules = new Set(rules.map((rule) => rule.key));
    for (const [key, id] of [...ruleIds]) {
      if (keptRules.has(key)) continue;
      await write("DELETE", `/rules/${id}`);
      await write("DELETE", `/rules/${id}?permanent=true`);
      ruleIds.delete(key);
      ruleNames.delete(key);
      ruleSnapshots.delete(key);
    }
    for (const rule of rules) {
      const body = ruleBody(rule);
      const snapshot = JSON.stringify(body);
      const id = ruleIds.get(rule.key);
      if (id && ruleSnapshots.get(rule.key) === snapshot) continue;
      const before = id ? (JSON.parse(ruleSnapshots.get(rule.key) ?? "{}") as typeof body) : null;
      // A stored rule keeps the name and record type it was filed under, so a rename or a
      // move is a new rule and the old one goes.
      const refiled = before && (before.ruleName !== body.ruleName || before.entityName !== body.entityName);
      if (id && !refiled) {
        await write("PUT", `/rules/${id}`, {
          jdmContent: body.jdmContent,
          operation: body.operation,
        });
      } else {
        const created = (await write("POST", "/rules", body)) as { id?: string };
        if (id) {
          await write("DELETE", `/rules/${id}`);
          await write("DELETE", `/rules/${id}?permanent=true`);
        }
        if (created.id) ruleIds.set(rule.key, created.id);
        ruleNames.set(rule.key, body.ruleName);
      }
      ruleSnapshots.set(rule.key, snapshot);
    }

    const keptWorkflows = new Set(workflows.map((workflow) => workflow.key));
    for (const [key, id] of [...workflowIds]) {
      if (keptWorkflows.has(key)) continue;
      await write("DELETE", `/workflow-definitions/${id}`);
      workflowIds.delete(key);
      workflowSnapshots.delete(key);
    }
    for (const workflow of workflows) {
      const body = workflowBody(workflow);
      const snapshot = JSON.stringify(body);
      const id = workflowIds.get(workflow.key);
      if (id && workflowSnapshots.get(workflow.key) === snapshot) continue;
      if (id) {
        await write("PUT", `/workflow-definitions/${id}`, body);
      } else {
        const created = (await write("POST", "/workflow-definitions", body)) as { id?: string };
        if (created.id) workflowIds.set(workflow.key, created.id);
      }
      workflowSnapshots.set(workflow.key, snapshot);
    }
  }

  return { load, save };
}
