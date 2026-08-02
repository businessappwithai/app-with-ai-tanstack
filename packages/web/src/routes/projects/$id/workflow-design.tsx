import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Code2,
  GitBranch,
  ListOrdered,
  Loader2,
  Plus,
  Save,
  Trash2,
  Workflow as WorkflowIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SagaStepEditor } from "@/components/eml/SagaStepEditor";
import { emptyStateFlow, StateFlowCanvas } from "@/components/eml/StateFlowCanvas";
import { ProgressStepper } from "@/components/ProgressStepper";
import { WizardStepHeader } from "@/components/WizardStepHeader";
import {
  emitHookWorkflow,
  emitSagaFlow,
  emitStateFlow,
  emptySagaFlow,
  HOOK_HINTS,
  HOOK_TYPES,
  parseHookWorkflow,
  parseSagaFlow,
  parseStateFlow,
  type SagaFlow,
  type StateFlow,
  validateHookWorkflow,
  validateSagaFlow,
  validateStateFlow,
  type WorkflowHook,
} from "@/lib/eml/workflow-flow";
import { useProjectStore } from "@/store/projectStore";

export const Route = createFileRoute("/projects/$id/workflow-design")({
  component: WorkflowDesignPage,
});

type WorkflowKind = "hook" | "state" | "saga";

interface EditableWorkflow {
  /** Stable across renames, so React keeps the row it is editing. */
  key: string;
  name: string;
  entity: string;
  kind: WorkflowKind;
  title?: string;
  hooks: WorkflowHook[];
  states: StateFlow;
  saga: SagaFlow;
}

interface EmlResponse {
  eml: string;
  rules: unknown[];
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

function readEntityNames(erd: string): string[] {
  const names: string[] = [];
  for (const rawLine of (erd ?? "").split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("%%")) continue;
    const open = line.match(/^([A-Za-z][A-Za-z0-9_]*)\s*\{$/);
    if (open?.[1]) names.push(open[1]);
  }
  return names;
}

function pascal(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9]+/g, " ").trim();
  if (!cleaned) return "Workflow";
  return cleaned
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

let hookCounter = 0;
let keyCounter = 0;
const nextKey = () => `w${(keyCounter++).toString(36)}${Date.now().toString(36)}`;

function WorkflowDesignPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { currentProject, loadProject, setCurrentStep } = useProjectStore();

  const [workflows, setWorkflows] = useState<EditableWorkflow[]>([]);
  const [rules, setRules] = useState<unknown[]>([]);
  const [erd, setErd] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    if (id) void loadProject(id);
  }, [id, loadProject]);

  useEffect(() => {
    setCurrentStep("workflows");
  }, [setCurrentStep]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/projects/${id}/eml`);
        if (!response.ok) throw new Error(`Could not load the model (${response.status})`);
        const data = (await response.json()) as EmlResponse;
        if (cancelled) return;

        setErd(data.eml ?? "");
        setRules(data.rules ?? []);
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

  const entityNames = useMemo(() => readEntityNames(erd), [erd]);
  const active = workflows[activeIndex] ?? null;

  const problems = useMemo(() => {
    if (!active) return [];
    if (active.kind === "hook") return validateHookWorkflow(active.entity, active.hooks);
    if (active.kind === "saga") return validateSagaFlow(active.saga);
    return validateStateFlow(active.states);
  }, [active]);

  const patchActive = useCallback(
    (patch: Partial<EditableWorkflow>) => {
      setWorkflows((current) =>
        current.map((workflow, index) =>
          index === activeIndex ? { ...workflow, ...patch } : workflow
        )
      );
      setSavedAt(null);
    },
    [activeIndex]
  );

  const addWorkflow = (kind: WorkflowKind) => {
    const entity = entityNames[0] ?? "";
    const suffix = kind === "state" ? "Lifecycle" : kind === "saga" ? "Process" : "Hooks";
    const next: EditableWorkflow = {
      key: nextKey(),
      name: `${entity || "New"}${suffix}`,
      entity,
      kind,
      hooks: [],
      states: emptyStateFlow(),
      saga: emptySagaFlow(),
    };
    setWorkflows((current) => [...current, next]);
    setActiveIndex(workflows.length);
    setSavedAt(null);
  };

  const addHook = () => {
    if (!active) return;
    patchActive({
      hooks: [
        ...active.hooks,
        {
          id: `h${hookCounter++}`,
          type: "beforeCreate",
          handler: `handler${active.hooks.length + 1}`,
        },
      ],
    });
  };

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${id}/eml`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules,
          workflows: workflows.map((workflow) => ({
            name: pascal(workflow.title ?? workflow.name),
            entity: workflow.entity,
            kind: workflow.kind,
            title: workflow.title,
            ...(workflow.kind === "saga"
              ? { trigger: workflow.saga.trigger, operation: workflow.saga.operation }
              : {}),
            diagram:
              workflow.kind === "hook"
                ? emitHookWorkflow(workflow.entity, workflow.hooks)
                : workflow.kind === "saga"
                  ? emitSagaFlow(workflow.saga)
                  : emitStateFlow(workflow.states),
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

  return (
    <div className="min-h-screen bg-background">
      <ProgressStepper currentStep="workflows" projectId={id} />

      <div className="mx-auto max-w-[1600px] px-4 py-6">
        <WizardStepHeader
          stepNumber={4}
          estimatedTime="5-10 min"
          subtitle={currentProject?.name}
          title="Workflows"
          description="Describe what happens around the data. Lifecycle workflows run handlers on create, update and delete; status workflows define the states a record moves through."
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
          <div className="flex gap-4">
            <aside className="w-60 shrink-0">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase text-muted-foreground">
                  Workflows ({workflows.length})
                </h2>
              </div>

              <div className="mb-2 grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => addWorkflow("hook")}
                  title="Run named handlers around this entity's create, update and delete"
                  className="flex items-center justify-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted"
                >
                  <Plus className="h-3 w-3" />
                  Lifecycle
                </button>
                <button
                  type="button"
                  onClick={() => addWorkflow("state")}
                  title="Define the statuses a record moves through"
                  className="flex items-center justify-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted"
                >
                  <Plus className="h-3 w-3" />
                  Status
                </button>
                <button
                  type="button"
                  onClick={() => addWorkflow("saga")}
                  title="A multi-step process: create, update and delete across entities, passing values along"
                  className="flex items-center justify-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted"
                >
                  <Plus className="h-3 w-3" />
                  Process
                </button>
              </div>

              <div className="space-y-1">
                {workflows.map((workflow, index) => (
                  <div
                    key={workflow.key}
                    className={`group flex items-center gap-1 rounded-md border px-2 py-1.5 text-sm ${
                      index === activeIndex
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                    >
                      {workflow.kind === "state" ? (
                        <GitBranch className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      ) : workflow.kind === "saga" ? (
                        <ListOrdered className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      ) : (
                        <WorkflowIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {workflow.title || workflow.name}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {workflow.entity || "no entity"} · {workflow.kind}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${workflow.name}`}
                      onClick={() => {
                        setWorkflows((current) => current.filter((_w, i) => i !== index));
                        setActiveIndex((current) =>
                          Math.max(0, current > index ? current - 1 : current)
                        );
                        setSavedAt(null);
                      }}
                      className="opacity-0 transition group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}

                {!workflows.length && (
                  <p className="rounded-md border border-dashed border-border px-2 py-4 text-center text-xs text-muted-foreground">
                    No workflows yet.
                  </p>
                )}
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              {!active ? (
                <div className="rounded-lg border border-dashed border-border py-20 text-center text-sm text-muted-foreground">
                  Add a lifecycle or status workflow to begin.
                </div>
              ) : (
                <>
                  <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium">Name</span>
                      <input
                        className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                        value={active.title ?? active.name}
                        onChange={(event) =>
                          patchActive({
                            title: event.target.value,
                            name: pascal(event.target.value),
                          })
                        }
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs font-medium">Entity</span>
                      <select
                        className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                        value={active.entity}
                        onChange={(event) => patchActive({ entity: event.target.value })}
                      >
                        <option value="">Choose…</option>
                        {entityNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div>
                      <span className="mb-1 block text-xs font-medium">Kind</span>
                      <p className="rounded-md border border-border bg-muted/40 px-2 py-1.5 text-sm">
                        {active.kind === "hook"
                          ? "Lifecycle handlers"
                          : active.kind === "saga"
                            ? "Multi-step process"
                            : "Status state machine"}
                      </p>
                    </div>
                  </div>

                  {active.kind === "hook" ? (
                    <div className="rounded-lg border border-border bg-card p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-medium">Lifecycle steps</h3>
                        <button
                          type="button"
                          onClick={addHook}
                          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted"
                        >
                          <Plus className="h-3 w-3" />
                          Add step
                        </button>
                      </div>

                      <div className="space-y-2">
                        {active.hooks.map((hook, index) => (
                          <div
                            key={hook.id}
                            className="grid grid-cols-1 gap-2 rounded-md border border-border p-2 md:grid-cols-[200px_1fr_160px_auto]"
                          >
                            <label className="block">
                              <span className="mb-1 block text-[11px] font-medium">When</span>
                              <select
                                className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                                value={hook.type}
                                onChange={(event) =>
                                  patchActive({
                                    hooks: active.hooks.map((candidate, position) =>
                                      position === index
                                        ? { ...candidate, type: event.target.value }
                                        : candidate
                                    ),
                                  })
                                }
                              >
                                {HOOK_TYPES.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="block">
                              <span className="mb-1 block text-[11px] font-medium">
                                Handler name
                              </span>
                              <input
                                className="w-full rounded-md border border-border px-2 py-1.5 font-mono text-sm"
                                value={hook.handler}
                                onChange={(event) =>
                                  patchActive({
                                    hooks: active.hooks.map((candidate, position) =>
                                      position === index
                                        ? { ...candidate, handler: event.target.value }
                                        : candidate
                                    ),
                                  })
                                }
                                placeholder="hashPassword"
                              />
                              <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                                {HOOK_HINTS[hook.type] ?? ""}
                              </span>
                            </label>

                            <label className="block">
                              <span className="mb-1 block text-[11px] font-medium">
                                Field (optional)
                              </span>
                              <input
                                className="w-full rounded-md border border-border px-2 py-1.5 font-mono text-sm"
                                value={hook.field ?? ""}
                                onChange={(event) =>
                                  patchActive({
                                    hooks: active.hooks.map((candidate, position) =>
                                      position === index
                                        ? { ...candidate, field: event.target.value || undefined }
                                        : candidate
                                    ),
                                  })
                                }
                                placeholder="password"
                              />
                            </label>

                            <button
                              type="button"
                              aria-label="Remove step"
                              onClick={() =>
                                patchActive({
                                  hooks: active.hooks.filter((_h, position) => position !== index),
                                })
                              }
                              className="self-end pb-2"
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </button>
                          </div>
                        ))}

                        {!active.hooks.length && (
                          <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                            No steps yet. Add one to run a handler on this entity's lifecycle.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : active.kind === "saga" ? (
                    <SagaStepEditor
                      flow={active.saga}
                      entityNames={entityNames}
                      onChange={(saga) => patchActive({ saga })}
                    />
                  ) : (
                    <div className="h-[460px]">
                      <StateFlowCanvas
                        flow={active.states}
                        onChange={(states) => patchActive({ states })}
                      />
                    </div>
                  )}

                  {problems.length > 0 && (
                    <ul className="mt-3 space-y-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      {problems.map((problem) => (
                        <li key={problem} className="flex items-start gap-1.5">
                          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                          {problem}
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowSource((current) => !current)}
                    className="mt-3 flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium"
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    {showSource ? "Hide" : "Show"} EML
                  </button>

                  {showSource && (
                    <pre className="mt-2 max-h-56 overflow-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
                      {`%%workflow ${pascal(active.title ?? active.name)} entity: ${
                        active.entity || "<entity>"
                      } kind: ${active.kind}${
                        active.kind === "saga"
                          ? `${active.saga.trigger === "rule" ? " trigger: rule" : ""}${
                              active.saga.operation !== "CREATE"
                                ? ` operation: ${active.saga.operation}`
                                : ""
                            }`
                          : ""
                      }\n${
                        active.kind === "hook"
                          ? emitHookWorkflow(active.entity || "Entity", active.hooks)
                          : active.kind === "saga"
                            ? emitSagaFlow(active.saga)
                            : emitStateFlow(active.states)
                      }`}
                    </pre>
                  )}
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
              onClick={() => navigate({ to: "/projects/$id/rules-design", params: { id } })}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium"
            >
              Back to rules
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
              Save workflows
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
