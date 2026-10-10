import {
  type ConstraintWorkflow,
  LogicWorkbench,
  type WorkbenchSave,
} from "@appwithai/editors/components/LogicWorkbench";
import { readEntities, ruleConstraints } from "@appwithai/editors/lib/eml/rule-constraints";
import {
  newEditorKey,
  type StoredWorkflow,
  toEditableWorkflow,
  workflowForSave,
} from "@appwithai/editors/lib/eml/workflow-model";
import { CopilotSidebar } from "@copilotkit/react-ui";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CopilotProvider } from "@/components/CopilotProvider";
import { ProgressStepper } from "@/components/ProgressStepper";
import { WizardStepHeader } from "@/components/WizardStepHeader";
import { useModelAssistant } from "@/hooks/useModelAssistant";
import { type ModelRule, ruleForSave, toEditableRule } from "@/lib/eml/editable-rule";
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
  rules: ModelRule[];
  workflows: StoredWorkflow[];
}

/**
 * The modelling tool's side of the Logic step: where the model comes from (the project's
 * EML document), where a save goes (the same document, one PUT) and the wizard around it.
 * Everything an author does on the screen lives in `@appwithai/editors`, which a generated
 * application's Rules & workflows screen renders too.
 */
function LogicPage() {
  const { id } = Route.useParams();
  const ruleDryRun = useMemo(() => projectDryRun(id), [id]);
  const navigate = useNavigate();
  const { rule: ruleSearch, workflow: workflowSearch } = Route.useSearch();
  const { currentProject, loadProject, setCurrentStep } = useProjectStore();

  const [model, setModel] = useState<{
    rules: ReturnType<typeof toEditableRule>[];
    workflows: ReturnType<typeof toEditableWorkflow>[];
  } | null>(null);
  const [erd, setErd] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ ruleNames: string[]; workflowNames: string[] }>({
    ruleNames: [],
    workflowNames: [],
  });

  useEffect(() => {
    if (id) void loadProject(id);
  }, [id, loadProject]);

  useEffect(() => {
    setCurrentStep("logic");
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
        // The same reader the Enhance page uses, so a rule written as `%%action` directives
        // opens as the table it compiles to rather than as a read-only flowchart.
        setModel({
          rules: (data.rules ?? []).map((rule) => toEditableRule(rule, newEditorKey())),
          workflows: (data.workflows ?? []).map(toEditableWorkflow),
        });
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load the model");
        }
      }
    }
    if (id) void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const entities = useMemo(() => readEntities(erd), [erd]);
  const constraintsFor = useCallback(
    (workflows: ConstraintWorkflow[]) => ruleConstraints(erd, workflows),
    [erd]
  );

  // What is on this screen is names and canvases; the decision tables, step properties and
  // directive syntax the assistant needs to answer a question about them come from retrieval.
  useModelAssistant({
    projectId: id,
    surface: "logic",
    summary: useMemo(
      () => ({
        name: currentProject?.name ?? "this application",
        entities: entities.map((entity) => entity.name),
        ruleNames: summary.ruleNames,
        workflowNames: summary.workflowNames,
      }),
      [currentProject?.name, entities, summary]
    ),
  });

  /** One write, both halves — the document is edited once. */
  const save = useCallback(
    async (payload: WorkbenchSave) => {
      const response = await fetch(`/api/projects/${id}/eml`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: payload.rules.map(ruleForSave),
          workflows: payload.workflows.map(workflowForSave),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? `Save failed (${response.status})`);
      setErd((current) => data.eml ?? current);
    },
    [id]
  );

  const initialSelection = useMemo(
    () => ({ rule: ruleSearch, workflow: workflowSearch }),
    [ruleSearch, workflowSearch]
  );

  return (
    <div className="min-h-screen bg-background">
      <ProgressStepper currentStep="logic" projectId={id} />

      <div className="mx-auto max-w-[1600px] px-4 py-6">
        <LogicWorkbench
          loading={!model && !loadError}
          loadError={loadError}
          rules={model?.rules ?? []}
          workflows={model?.workflows ?? []}
          entities={entities}
          constraintsFor={constraintsFor}
          dryRun={ruleDryRun}
          save={save}
          initialSelection={initialSelection}
          onSelectionChange={(search) =>
            void navigate({ to: "/projects/$id/logic", params: { id }, search })
          }
          enhanceHref={`/projects/${id}/enhance`}
          onSummaryChange={setSummary}
          header={
            <WizardStepHeader
              stepNumber={3}
              estimatedTime="10-15 min"
              subtitle={currentProject?.name}
              title="Rules and workflows"
              description="A workflow is what runs around a record: it starts from the hooks it attaches to. Rules are written here or in Enhance, and attached to those hooks in the workflow."
            />
          }
          footerStart={() => (
            <button
              type="button"
              onClick={() => navigate({ to: "/projects/$id/design", params: { id } })}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium"
            >
              Back to the data model
            </button>
          )}
          footerEnd={({ save: saveFirst, busy }) => (
            <button
              type="button"
              onClick={async () => {
                if (await saveFirst())
                  void navigate({ to: "/projects/$id/generate", params: { id } });
              }}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Continue to generate
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        />
      </div>
    </div>
  );
}
