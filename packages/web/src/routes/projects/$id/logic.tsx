import {
  AutomationBuilder,
  type RuleTableSummary,
} from "@appwithai/editors/components/automation/AutomationBuilder";
import {
  type NewWorkflowDraft,
  NewWorkflowPanel,
} from "@appwithai/editors/components/eml/NewWorkflowPanel";
import {
  type EditableRule,
  RuleEditor,
  slugifyRuleName,
} from "@appwithai/editors/components/eml/RuleEditor";
import { emptyStateFlow } from "@appwithai/editors/components/eml/StateFlowCanvas";
import {
  type EditableWorkflow,
  emitWorkflowDiagram,
  emptyWorkflow,
  pascalWorkflowName,
  WorkflowEditor,
  type WorkflowKind,
} from "@appwithai/editors/components/eml/WorkflowEditor";
import { WorkflowRules } from "@appwithai/editors/components/eml/WorkflowRules";
import { HelpLink, HelpPanel } from "@appwithai/editors/components/help/HelpPanel";
import type { HelpTopicId } from "@appwithai/editors/content/help";
import { emptyAutomation, parseAutomation } from "@appwithai/editors/lib/automation/model";
import { emptyDecisionTable } from "@appwithai/editors/lib/eml/decision-table";
import { ruleForSave, toEditableRule } from "@appwithai/editors/lib/eml/editable-rule";
import { readEntities, ruleConstraints } from "@appwithai/editors/lib/eml/rule-constraints";
import { sectionProblems } from "@appwithai/editors/lib/eml/section-problems";
import {
  emptySagaFlow,
  parseHookWorkflow,
  parseSagaFlow,
  parseStateFlow,
} from "@appwithai/editors/lib/eml/workflow-flow";
import { hookFor } from "@appwithai/editors/lib/eml/workflow-hooks";
import { CopilotSidebar } from "@copilotkit/react-ui";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GitBranch,
  ListOrdered,
  Loader2,
  Plus,
  Save,
  Trash2,
  Workflow as WorkflowIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CopilotProvider } from "@/components/CopilotProvider";
import { ProgressStepper } from "@/components/ProgressStepper";
import { WizardStepHeader } from "@/components/WizardStepHeader";
import { useModelAssistant } from "@/hooks/useModelAssistant";
import { projectDryRun } from "@/lib/eml/project-dry-run";
import { requestContext } from "@/lib/request-context";
import { useProjectStore } from "@/store/projectStore";

/**
 * Rules and workflows, on one screen.
 *
 * These were two wizard steps, which said they were two jobs done in order:
 * finish all the deciding, then start all the doing. They are not. A rule
 * decides and a process acts on what it decided — often about the same entity,
 * now often as a Decision step inside the process itself. Splitting them meant
 * naming a rule on one screen and typing that name from memory on another.
 *
 * One rail lists both. One save writes both into the model in a single edit,
 * which also fixes a real hazard: each page used to send its own half and
 * re-read the other from the document, so two tabs could quietly undo each
 * other.
 */

async function checkAuthMe() {
  const { baseUrl, fetchInit } = await requestContext();
  const res = await fetch(`${baseUrl}/api/auth/me`, fetchInit);
  return res.json() as Promise<{ user: { id: string; email: string; role: string } | null }>;
}

export const Route = createFileRoute("/projects/$id/logic")({
  validateSearch: (search: Record<string, unknown>): { rule?: string; workflow?: string } => ({
    rule: typeof search.rule === "string" ? search.rule : undefined,
    workflow: typeof search.workflow === "string" ? search.workflow : undefined,
  }),
  beforeLoad: async () => {
    try {
      const data = await checkAuthMe();
      if (!data.user) throw redirect({ to: "/login" });
    } catch (e) {
      if (e && typeof e === "object" && "to" in e) throw e;
      throw redirect({ to: "/login" });
    }
  },
  component: LogicRoute,
});

/**
 * The provider has to sit above the component that calls the Copilot hooks —
 * rendering it inside LogicPage's own JSX puts the context below the consumer
 * and throws "useCopilotKit must be used within CopilotKitProvider".
 */
function LogicRoute() {
  return (
    <CopilotProvider>
      <LogicPage />
      <CopilotSidebar
        labels={{
          title: "Rules and processes",
          initial:
            "I can see this application's entities, its rules and its processes, and the EML " +
            "language they are written in. Ask me what already runs on an entity, or describe " +
            "the behaviour you want and I will tell you which rule or step declares it.",
        }}
        defaultOpen={false}
        clickOutsideToClose={false}
      />
    </CopilotProvider>
  );
}

interface EmlResponse {
  eml: string;
  rules: Array<{
    name: string;
    entity: string;
    event: string;
    priority?: number;
    title?: string;
    flowchart: string;
  }>;
  workflows: Array<{
    name: string;
    entity: string;
    kind: string;
    trigger?: "automatic" | "rule";
    operation?: "CREATE" | "UPDATE" | "DELETE" | "ALL";
    title?: string;
    diagram: string;
  }>;
}

let keyCounter = 0;
const nextKey = () => `k${(keyCounter++).toString(36)}${Date.now().toString(36)}`;

const workflowSlug = (w: EditableWorkflow) =>
  (w.title ?? w.name)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

function LogicPage() {
  const { id } = Route.useParams();
  const ruleDryRun = useMemo(() => projectDryRun(id), [id]);
  const navigate = useNavigate();
  const { rule: ruleSearch, workflow: workflowSearch } = Route.useSearch();
  const { currentProject, loadProject, setCurrentStep } = useProjectStore();

  const [rules, setRules] = useState<EditableRule[]>([]);
  const [workflows, setWorkflows] = useState<EditableWorkflow[]>([]);
  const [erd, setErd] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  // A workflow starts from the hooks it attaches to, so with none yet the
  // screen opens on that, not on an empty editor.
  const [creating, setCreating] = useState(false);
  // A rule is edited here too, with no moment of its own: a workflow hook gives it one.
  const [selectedRule, setSelectedRule] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpTopicId, setHelpTopicId] = useState<HelpTopicId>("overview");
  const openHelp = useCallback((topic: HelpTopicId) => {
    setHelpTopicId(topic);
    setHelpOpen(true);
  }, []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  useEffect(() => {
    if (id) void loadProject(id);
  }, [id, loadProject]);

  useEffect(() => {
    setCurrentStep("logic");
  }, [setCurrentStep]);

  // When the URL carries a rule or workflow slug, select it once loading finishes.
  useEffect(() => {
    if (isLoading) return;
    if (ruleSearch) {
      const idx = rules.findIndex((r) => slugifyRuleName(r.title ?? r.name) === ruleSearch);
      if (idx >= 0) {
        setSelectedRule(idx);
        setCreating(false);
      }
    } else if (workflowSearch) {
      const idx = workflows.findIndex((w) => workflowSlug(w) === workflowSearch);
      if (idx >= 0) {
        setSelectedIndex(idx);
        setSelectedRule(null);
        setCreating(false);
      }
    }
    // Intentionally runs once after load completes, not on every search change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/projects/${id}/eml`);
        if (!response.ok) throw new Error(`Could not load the model (${response.status})`);
        const data = (await response.json()) as EmlResponse;
        if (cancelled) return;

        setErd(data.eml ?? "");
        setRules(
          // The same reader the Enhance page uses, so a rule written as
          // `%%action` directives opens as the table it compiles to rather
          // than as a read-only flowchart whose only offer discards them.
          (data.rules ?? []).map((rule) => toEditableRule(rule, nextKey()))
        );
        setWorkflows(
          (data.workflows ?? []).map((workflow) => {
            const kind: WorkflowKind =
              workflow.kind === "state" || workflow.kind === "saga" ? workflow.kind : "hook";
            const saga = kind === "saga" ? parseSagaFlow(workflow.diagram) : emptySagaFlow();
            return {
              key: nextKey(),
              name: workflow.name,
              entity: workflow.entity,
              kind,
              title: workflow.title,
              hooks: kind === "hook" ? parseHookWorkflow(workflow.diagram) : [],
              states: kind === "state" ? parseStateFlow(workflow.diagram) : emptyStateFlow(),
              // A hook workflow is many handlers on different events, which is
              // the multi-trigger shape the automation ladder now carries. It
              // reads and writes the same `%%hook` directives, so this is a
              // change of editor, not of artifact.
              ...(kind === "hook" || kind === "saga"
                ? {
                    automation: {
                      ...parseAutomation(workflow.diagram, workflow.entity),
                      kind,
                      name: workflow.title ?? workflow.name,
                      trigger: {
                        ...parseAutomation(workflow.diagram, workflow.entity).trigger,
                        entity: workflow.entity,
                      },
                      // For a saga these ride on the %%workflow directive, so
                      // they reach us beside the diagram rather than inside it.
                      ...(kind === "saga"
                        ? {
                            // Absent means automatic: language/composer.ts only
                            // ever writes the token for `rule`, so falling back
                            // to the SagaFlow default ("rule") relabelled every
                            // automatic saga as rule-triggered.
                            sagaTrigger: workflow.trigger ?? "automatic",
                            sagaOperation: workflow.operation ?? saga.operation,
                          }
                        : {}),
                    },
                  }
                : {}),
              // The diagram carries the steps; the trigger lives on the
              // %%workflow directive, so it arrives alongside rather than inside.
              saga: {
                ...saga,
                trigger: workflow.trigger ?? saga.trigger,
                operation: workflow.operation ?? saga.operation,
              },
            };
          })
        );
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load the model");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    if (id) void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const entities = useMemo(() => readEntities(erd), [erd]);
  const entityNames = useMemo(() => entities.map((entity) => entity.name), [entities]);
  // What a rule may name: the entity's fields, the values its enum or state
  // machine allows, and the processes defined for it.
  const constraints = useMemo(
    () =>
      ruleConstraints(
        erd,
        workflows.map((workflow) => ({
          name: pascalWorkflowName(workflow.title ?? workflow.name),
          title: workflow.title ?? workflow.name,
          entity: workflow.entity,
          kind: workflow.kind,
          stateNames: workflow.kind === "state" ? workflow.states.states.map((s) => s.name) : [],
        }))
      ),
    [erd, workflows]
  );
  const columnsFor = useCallback(
    (entity: string) => entities.find((candidate) => candidate.name === entity)?.attributes ?? [],
    [entities]
  );
  /** The same fields `columnsFor` gives, in the shape the ladder takes them. */
  const entityFieldMap = useMemo(
    () => Object.fromEntries(entities.map((entity) => [entity.name, entity.attributes])),
    [entities]
  );
  // A Decision step can evaluate a rule declared here rather than carrying its
  // own copy of the same table — which is only offerable because both live on
  // this screen now.
  const ruleNames = useMemo(
    () => rules.map((rule) => slugifyRuleName(rule.title ?? rule.name)),
    [rules]
  );
  // What a "Look up a rule table" step picks from. Without it the step's
  // picker was empty on this screen, so no process built here could consult
  // any of the model's rules.
  const ruleTables: RuleTableSummary[] = useMemo(
    () =>
      rules.map((rule) => ({
        id: rule.key,
        name: slugifyRuleName(rule.title ?? rule.name),
        rowCount: rule.table.rules.length,
        outputs: rule.table.outputs.map((output) => output.field || output.name),
      })),
    [rules]
  );

  // What is on this screen is names and canvases; the decision tables, step
  // properties and directive syntax the assistant needs to answer a question
  // about them come from retrieval.
  useModelAssistant({
    projectId: id,
    surface: "logic",
    summary: useMemo(
      () => ({
        name: currentProject?.name ?? "this application",
        entities: entities.map((entity) => entity.name),
        ruleNames,
        workflowNames: workflows.map((workflow) =>
          pascalWorkflowName(workflow.title ?? workflow.name)
        ),
      }),
      [currentProject?.name, entities, ruleNames, workflows]
    ),
  });

  const activeRule = creating || selectedRule === null ? null : (rules[selectedRule] ?? null);
  const activeWorkflow =
    creating || selectedRule !== null ? null : (workflows[selectedIndex] ?? null);

  const patchRule = useCallback(
    (patch: Partial<EditableRule>) => {
      setRules((current) =>
        current.map((rule, index) => (index === selectedRule ? { ...rule, ...patch } : rule))
      );
      setSavedAt(null);
    },
    [selectedRule]
  );

  const addRule = () => {
    const newName = `rule${rules.length + 1}`;
    setRules((current) => [
      ...current,
      {
        key: nextKey(),
        name: newName,
        entity: entityNames[0] ?? "",
        event: "beforeCreate",
        priority: 100,
        table: emptyDecisionTable(),
      },
    ]);
    setSelectedRule(rules.length);
    setCreating(false);
    setSavedAt(null);
    void navigate({
      to: "/projects/$id/logic",
      params: { id },
      search: { rule: newName },
    });
  };

  const removeRule = (index: number) => {
    setRules((current) => current.filter((_r, i) => i !== index));
    setSelectedRule((current) =>
      current === null ? null : current === index ? null : current > index ? current - 1 : current
    );
    setSavedAt(null);
  };

  /**
   * Attaching a rule to a hook gives it that hook's event. The rule's own table
   * is untouched — it is written on the Enhance step.
   */
  const attachRule = useCallback((ruleKey: string, event: string) => {
    setRules((current) =>
      current.map((rule) => (rule.key === ruleKey ? { ...rule, event } : rule))
    );
    setSavedAt(null);
  }, []);

  const patchWorkflow = useCallback(
    (patch: Partial<EditableWorkflow>) => {
      setWorkflows((current) =>
        current.map((workflow, index) =>
          index === selectedIndex ? { ...workflow, ...patch } : workflow
        )
      );
      setSavedAt(null);
    },
    [selectedIndex]
  );

  const createWorkflow = (draft: NewWorkflowDraft) => {
    const base = emptyWorkflow("hook", nextKey(), draft.entity);
    const automation = {
      ...emptyAutomation(draft.entity, "hook"),
      name: draft.name,
      hooks: [hookFor(draft.entity, draft.event)],
    };
    const newWorkflow = {
      ...base,
      name: pascalWorkflowName(draft.name),
      title: draft.name,
      automation,
    };
    setWorkflows((current) => [...current, newWorkflow]);
    setSelectedIndex(workflows.length);
    setSelectedRule(null);
    setCreating(false);
    setSavedAt(null);
    void navigate({
      to: "/projects/$id/logic",
      params: { id },
      search: { workflow: workflowSlug(newWorkflow) },
    });
  };

  /** A status machine or a process has no hooks to start from, so it opens blank. */
  const addWorkflow = (kind: WorkflowKind) => {
    const newWorkflow = emptyWorkflow(kind, nextKey(), entityNames[0] ?? "");
    setWorkflows((current) => [...current, newWorkflow]);
    setSelectedIndex(workflows.length);
    setSelectedRule(null);
    setCreating(false);
    setSavedAt(null);
    void navigate({
      to: "/projects/$id/logic",
      params: { id },
      search: { workflow: workflowSlug(newWorkflow) },
    });
  };

  const removeWorkflow = (index: number) => {
    setWorkflows((current) => current.filter((_w, i) => i !== index));
    setSelectedIndex((current) => (current >= index ? Math.max(0, current - 1) : current));
    setSavedAt(null);
  };

  /** One write, both halves — the document is edited once. */
  const save = async () => {
    const problems = sectionProblems(rules, workflows);
    const first = problems[0];
    if (first) {
      setError(problems.map((p) => p.message).join(" "));
      setCreating(false);
      if (first.kind === "workflow") {
        setSelectedIndex(first.index);
        setSelectedRule(null);
      } else {
        setSelectedRule(first.index);
      }
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${id}/eml`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: rules.map(ruleForSave),
          workflows: workflows.map((workflow) => ({
            name: pascalWorkflowName(workflow.title ?? workflow.name),
            entity: workflow.entity,
            kind: workflow.kind,
            title: workflow.title,
            ...(workflow.kind === "saga"
              ? {
                  trigger: workflow.automation?.sagaTrigger ?? workflow.saga.trigger,
                  operation: workflow.automation?.sagaOperation ?? workflow.saga.operation,
                }
              : {}),
            diagram: emitWorkflowDiagram(workflow),
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? `Save failed (${response.status})`);

      setErd(data.eml ?? erd);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save");
    } finally {
      setIsSaving(false);
    }
  };

  const kindIcon = (kind: WorkflowKind) =>
    kind === "saga" ? ListOrdered : kind === "state" ? GitBranch : WorkflowIcon;

  /** The help page for whatever the editor is showing, and how to ask for it. */
  const editorHelp: { topic: HelpTopicId; label: string } =
    activeWorkflow?.kind === "state"
      ? { topic: "status", label: "How status machines work" }
      : activeWorkflow?.kind === "hook"
        ? { topic: "lifecycle", label: "How lifecycle processes work" }
        : activeWorkflow
          ? { topic: "process", label: "How processes and their steps work" }
          : { topic: "overview", label: "Which one should I use?" };

  return (
    <div className="min-h-screen bg-background">
      <ProgressStepper currentStep="logic" projectId={id} />

      <div className="mx-auto max-w-[1600px] px-4 py-6">
        <WizardStepHeader
          stepNumber={3}
          estimatedTime="10-15 min"
          subtitle={currentProject?.name}
          title="Rules and workflows"
          description="A workflow is what runs around a record: it starts from the hooks it attaches to. Rules are written here or in Enhance, and attached to those hooks in the workflow."
        />

        <div className="-mt-2 mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => openHelp(helpOpen ? helpTopicId : "overview")}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <BookOpen className="h-4 w-4" />
            Help
          </button>
        </div>

        <HelpPanel
          open={helpOpen}
          topic={helpTopicId}
          onTopicChange={setHelpTopicId}
          onClose={closeHelp}
        />

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading the model…
          </div>
        ) : (
          // Side by side from md up; stacked on a phone, where a 256px rail
          // left the editor a column about 70px wide.
          <div className="flex flex-col gap-4 md:flex-row">
            <aside className="max-h-80 w-full space-y-5 overflow-y-auto md:max-h-none md:w-64 md:shrink-0 md:overflow-visible">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Rules ({rules.length})
                  </h2>
                  <button
                    type="button"
                    onClick={addRule}
                    className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted"
                  >
                    <Plus className="h-3 w-3" />
                    New rule
                  </button>
                </div>
                <div className="space-y-1">
                  {rules.map((rule, index) => (
                    <div
                      key={rule.key}
                      className={`group flex items-center gap-1 rounded-md border px-2 py-1.5 text-left text-sm ${
                        !creating && selectedRule === index
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRule(index);
                          setCreating(false);
                          void navigate({
                            to: "/projects/$id/logic",
                            params: { id },
                            search: { rule: slugifyRuleName(rule.title ?? rule.name) },
                          });
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block truncate font-medium">
                          {rule.title || rule.name}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {rule.entity || "no entity"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRule(index)}
                        aria-label={`Delete ${rule.name}`}
                        className="opacity-0 transition group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                  {!rules.length && (
                    <p className="rounded-md border border-dashed border-border px-2 py-3 text-center text-xs text-muted-foreground">
                      No rules yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Workflows ({workflows.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setCreating(true);
                      setSelectedRule(null);
                    }}
                    className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted"
                  >
                    <Plus className="h-3 w-3" />
                    New workflow
                  </button>
                </div>

                <div className="space-y-1">
                  {workflows.map((workflow, index) => {
                    const Icon = kindIcon(workflow.kind);
                    const hookCount = workflow.automation?.hooks.length ?? 0;
                    return (
                      <div
                        key={workflow.key}
                        className={`group flex items-center gap-1 rounded-md border px-2 py-1.5 text-left text-sm ${
                          !creating && selectedRule === null && selectedIndex === index
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedIndex(index);
                            setSelectedRule(null);
                            setCreating(false);
                            void navigate({
                              to: "/projects/$id/logic",
                              params: { id },
                              search: { workflow: workflowSlug(workflow) },
                            });
                          }}
                          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {workflow.title || workflow.name}
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {workflow.entity || "no entity"} ·{" "}
                              {workflow.kind === "hook"
                                ? `${hookCount} hook${hookCount === 1 ? "" : "s"}`
                                : workflow.kind}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeWorkflow(index)}
                          aria-label={`Delete ${workflow.name}`}
                          className="opacity-0 transition group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    );
                  })}

                  {!workflows.length && (
                    <p className="rounded-md border border-dashed border-border px-2 py-3 text-center text-xs text-muted-foreground">
                      No workflows yet.
                    </p>
                  )}
                </div>

                <div className="border-t border-border pt-3 text-[11px] text-muted-foreground">
                  Other kinds:{" "}
                  <button type="button" className="underline" onClick={() => addWorkflow("state")}>
                    status machine
                  </button>
                  {" · "}
                  <button type="button" className="underline" onClick={() => addWorkflow("saga")}>
                    process
                  </button>
                </div>
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              {activeRule ? (
                <>
                  <div className="mb-2 flex justify-end">
                    <HelpLink onClick={() => openHelp("rules")}>How business rules work</HelpLink>
                  </div>
                  <RuleEditor
                    key={activeRule.key}
                    rule={activeRule}
                    entities={entities}
                    dryRun={ruleDryRun}
                    onChange={patchRule}
                    onError={setError}
                    entityEnums={constraints[activeRule.entity]?.values}
                    entityWorkflows={constraints[activeRule.entity]?.workflowNames}
                    fieldTypes={constraints[activeRule.entity]?.fieldTypes}
                  />
                </>
              ) : creating || (!workflows.length && !activeWorkflow) ? (
                <NewWorkflowPanel
                  key="new-workflow"
                  entityNames={entityNames}
                  onCreate={createWorkflow}
                  onCancel={workflows.length ? () => setCreating(false) : undefined}
                />
              ) : (
                <>
                  <div className="mb-2 flex justify-end">
                    <HelpLink onClick={() => openHelp(editorHelp.topic)}>
                      {editorHelp.label}
                    </HelpLink>
                  </div>
                  {(activeWorkflow?.kind === "hook" || activeWorkflow?.kind === "saga") &&
                  activeWorkflow.automation ? (
                    <>
                      <div className="min-h-[560px] overflow-hidden rounded-xl border border-border">
                        <AutomationBuilder
                          key={activeWorkflow.key}
                          automation={activeWorkflow.automation}
                          onChange={(automation) =>
                            patchWorkflow({
                              automation,
                              entity: automation.trigger.entity,
                              title: automation.name,
                              name: pascalWorkflowName(automation.name),
                            })
                          }
                          entities={entityNames}
                          entityFields={entityFieldMap}
                          ruleTables={ruleTables}
                          onOpenRuleTable={(name) => {
                            const index = rules.findIndex(
                              (rule) => slugifyRuleName(rule.title ?? rule.name) === name
                            );
                            if (index >= 0) setSelectedRule(index);
                          }}
                        />
                      </div>
                      {activeWorkflow.kind === "hook" && (
                        <WorkflowRules
                          entity={activeWorkflow.entity}
                          hooks={activeWorkflow.automation.hooks}
                          rules={rules}
                          onAttach={attachRule}
                          enhanceHref={`/projects/${id}/enhance`}
                        />
                      )}
                    </>
                  ) : activeWorkflow ? (
                    <WorkflowEditor
                      key={activeWorkflow.key}
                      workflow={activeWorkflow}
                      entityNames={entityNames}
                      ruleNames={ruleNames}
                      columnsFor={columnsFor}
                      onChange={patchWorkflow}
                    />
                  ) : null}
                </>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {savedAt && (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Saved to the model at {savedAt}
              </>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate({ to: "/projects/$id/design", params: { id } })}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium"
            >
              Back to the data model
            </button>
            <button
              type="button"
              onClick={save}
              disabled={isSaving || isLoading}
              className="flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </button>
            <button
              type="button"
              onClick={async () => {
                await save();
                void navigate({ to: "/projects/$id/generate", params: { id } });
              }}
              disabled={isSaving || isLoading}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Continue to generate
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
