import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Code2,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { emptyRuleFlow, RuleFlowCanvas } from "@/components/eml/RuleFlowCanvas";
import { ProgressStepper } from "@/components/ProgressStepper";
import { WizardStepHeader } from "@/components/WizardStepHeader";
import { emitRuleFlow, parseRuleFlow, type RuleFlow, validateRuleFlow } from "@/lib/eml/rule-flow";
import { useProjectStore } from "@/store/projectStore";

export const Route = createFileRoute("/projects/$id/rules-design")({
  component: RulesDesignPage,
});

/** The lifecycle events a rule can be bound to. */
const RULE_EVENTS = [
  "beforeCreate",
  "afterCreate",
  "beforeUpdate",
  "afterUpdate",
  "beforeDelete",
  "customValidate",
] as const;

interface EditableRule {
  /** Stable across renames, so React keeps the row it is editing. */
  key: string;
  name: string;
  entity: string;
  event: string;
  priority?: number;
  title?: string;
  flow: RuleFlow;
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
  workflows: unknown[];
}

/** Entity names and their attributes, read from the ERD for the pickers. */
function readEntities(erd: string): Array<{ name: string; attributes: string[] }> {
  const entities: Array<{ name: string; attributes: string[] }> = [];
  let current: { name: string; attributes: string[] } | null = null;

  for (const rawLine of (erd ?? "").split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("%%")) continue;

    const open = line.match(/^([A-Za-z][A-Za-z0-9_]*)\s*\{$/);
    if (open?.[1]) {
      current = { name: open[1], attributes: [] };
      continue;
    }
    if (line === "}" && current) {
      entities.push(current);
      current = null;
      continue;
    }
    if (current) {
      const attribute = line.match(/^\S+\s+([A-Za-z_][A-Za-z0-9_]*)/);
      if (attribute?.[1]) current.attributes.push(attribute[1]);
    }
  }
  return entities;
}

let keyCounter = 0;
const nextKey = () => `r${(keyCounter++).toString(36)}${Date.now().toString(36)}`;

function slugify(value: string): string {
  const cleaned = value
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .map((word, index) =>
      index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join("");
  return cleaned || "rule";
}

function RulesDesignPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { currentProject, loadProject, setCurrentStep } = useProjectStore();

  const [rules, setRules] = useState<EditableRule[]>([]);
  const [workflows, setWorkflows] = useState<unknown[]>([]);
  const [erd, setErd] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);

  useEffect(() => {
    if (id) void loadProject(id);
  }, [id, loadProject]);

  useEffect(() => {
    setCurrentStep("rules");
  }, [setCurrentStep]);

  // Load the model's rules. The document is the source of truth; this page
  // edits its `%%rule` sections and hands them straight back.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/projects/${id}/eml`);
        if (!response.ok) throw new Error(`Could not load the model (${response.status})`);
        const data = (await response.json()) as EmlResponse;
        if (cancelled) return;

        setErd(data.eml ?? "");
        setWorkflows(data.workflows ?? []);
        setRules(
          (data.rules ?? []).map((rule) => ({
            key: nextKey(),
            name: rule.name,
            entity: rule.entity,
            event: rule.event,
            priority: rule.priority,
            title: rule.title,
            flow: parseRuleFlow(rule.flowchart),
          }))
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
  const activeRule = rules[activeIndex] ?? null;
  const fieldHints = useMemo(() => {
    const entity = entities.find((candidate) => candidate.name === activeRule?.entity);
    return entity?.attributes ?? [];
  }, [entities, activeRule?.entity]);

  const problems = useMemo(
    () => (activeRule ? validateRuleFlow(activeRule.flow) : []),
    [activeRule]
  );

  const patchActive = useCallback(
    (patch: Partial<EditableRule>) => {
      setRules((current) =>
        current.map((rule, index) => (index === activeIndex ? { ...rule, ...patch } : rule))
      );
      setSavedAt(null);
    },
    [activeIndex]
  );

  const addRule = () => {
    const entity = entities[0]?.name ?? "";
    const next: EditableRule = {
      key: nextKey(),
      name: `rule${rules.length + 1}`,
      entity,
      event: "beforeCreate",
      priority: 100,
      flow: emptyRuleFlow(),
    };
    setRules((current) => [...current, next]);
    setActiveIndex(rules.length);
    setSavedAt(null);
  };

  const deleteRule = (index: number) => {
    setRules((current) => current.filter((_rule, position) => position !== index));
    setActiveIndex((current) => Math.max(0, current > index ? current - 1 : current));
    setSavedAt(null);
  };

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${id}/eml`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: rules.map((rule) => ({
            name: slugify(rule.name),
            entity: rule.entity,
            event: rule.event,
            priority: rule.priority,
            title: rule.title,
            flowchart: emitRuleFlow(rule.flow),
          })),
          workflows,
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

  /** Ask the AI for a first draft, then drop it onto the canvas to refine. */
  const draftWithAi = async () => {
    if (!aiPrompt.trim() || !activeRule) return;
    setIsDrafting(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/rules-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-flowchart",
          description: aiPrompt,
          // Send what is on the canvas so the model extends it rather than
          // replacing work already done.
          currentFlowchartCode: emitRuleFlow(activeRule.flow),
          projectId: id,
        }),
      });
      if (!response.ok || !response.body) throw new Error("The AI service is unavailable");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let flowchart = "";
      let failure = "";

      // SSE frames can split across reads, so keep the tail until it completes.
      const drain = (final: boolean) => {
        const frames = buffer.split("\n\n");
        buffer = final ? "" : (frames.pop() ?? "");
        for (const frame of frames) {
          const line = frame.split("\n").find((candidate) => candidate.startsWith("data: "));
          if (!line) continue;
          try {
            const payload = JSON.parse(line.slice(6)) as {
              step?: string;
              message?: string;
              flowchartCode?: string;
            };
            if (payload.flowchartCode) flowchart = payload.flowchartCode;
            if (payload.step === "error") failure = payload.message ?? "The AI could not help";
          } catch {
            // not a complete frame yet
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        drain(false);
      }
      drain(true);

      if (failure) throw new Error(failure);
      if (!flowchart.trim()) throw new Error("The AI did not return a flowchart");
      patchActive({ flow: parseRuleFlow(flowchart) });
      setAiPrompt("");
    } catch (aiError) {
      setError(aiError instanceof Error ? aiError.message : "Could not draft the rule");
    } finally {
      setIsDrafting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ProgressStepper currentStep="rules" projectId={id} />

      <div className="mx-auto max-w-[1600px] px-4 py-6">
        <WizardStepHeader
          stepNumber={3}
          estimatedTime="5-10 min"
          subtitle={currentProject?.name}
          title="Business rules"
          description="Draw the decisions your application makes. Each rule compiles to a GoRules decision graph the generated app evaluates on the lifecycle event you choose."
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
            {/* Rule list */}
            <aside className="w-60 shrink-0">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase text-muted-foreground">
                  Rules ({rules.length})
                </h2>
                <button
                  type="button"
                  onClick={addRule}
                  className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted"
                >
                  <Plus className="h-3 w-3" />
                  New
                </button>
              </div>

              <div className="space-y-1">
                {rules.map((rule, index) => (
                  <div
                    key={rule.key}
                    className={`group flex items-center gap-1 rounded-md border px-2 py-1.5 text-left text-sm ${
                      index === activeIndex
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate font-medium">{rule.title || rule.name}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {rule.entity || "no entity"} · {rule.event}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRule(index)}
                      aria-label={`Delete ${rule.name}`}
                      className="opacity-0 transition group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}

                {!rules.length && (
                  <p className="rounded-md border border-dashed border-border px-2 py-4 text-center text-xs text-muted-foreground">
                    No rules yet. Add one to start.
                  </p>
                )}
              </div>
            </aside>

            {/* Editor */}
            <div className="min-w-0 flex-1">
              {!activeRule ? (
                <div className="rounded-lg border border-dashed border-border py-20 text-center text-sm text-muted-foreground">
                  Select a rule, or create one, to start drawing.
                </div>
              ) : (
                <>
                  <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium">Name</span>
                      <input
                        className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                        value={activeRule.title ?? activeRule.name}
                        onChange={(event) =>
                          patchActive({
                            title: event.target.value,
                            name: slugify(event.target.value),
                          })
                        }
                        placeholder="Sample expiry guard"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs font-medium">Entity</span>
                      <select
                        className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                        value={activeRule.entity}
                        onChange={(event) => patchActive({ entity: event.target.value })}
                      >
                        <option value="">Choose…</option>
                        {entities.map((entity) => (
                          <option key={entity.name} value={entity.name}>
                            {entity.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs font-medium">Runs on</span>
                      <select
                        className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                        value={activeRule.event}
                        onChange={(event) => patchActive({ event: event.target.value })}
                      >
                        {RULE_EVENTS.map((event) => (
                          <option key={event} value={event}>
                            {event}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-xs font-medium">Priority</span>
                      <input
                        type="number"
                        className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
                        value={activeRule.priority ?? 100}
                        onChange={(event) =>
                          patchActive({ priority: Number(event.target.value) || 0 })
                        }
                      />
                    </label>
                  </div>

                  <div className="h-[520px]">
                    <RuleFlowCanvas
                      flow={activeRule.flow}
                      onChange={(flow) => patchActive({ flow })}
                      fieldHints={fieldHints}
                    />
                  </div>

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

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      className="min-w-[240px] flex-1 rounded-md border border-border px-2 py-1.5 text-sm"
                      value={aiPrompt}
                      onChange={(event) => setAiPrompt(event.target.value)}
                      placeholder="Describe the rule and let AI draft it — e.g. block edits once a sample is consumed"
                    />
                    <button
                      type="button"
                      onClick={draftWithAi}
                      disabled={isDrafting || !aiPrompt.trim()}
                      className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                    >
                      {isDrafting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSource((current) => !current)}
                      className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium"
                    >
                      <Code2 className="h-3.5 w-3.5" />
                      {showSource ? "Hide" : "Show"} EML
                    </button>
                  </div>

                  {showSource && (
                    <pre className="mt-2 max-h-56 overflow-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
                      {`%%rule ${slugify(activeRule.title ?? activeRule.name)} on ${
                        activeRule.entity || "<entity>"
                      } event: ${activeRule.event} priority: ${activeRule.priority ?? 100}\n${emitRuleFlow(
                        activeRule.flow
                      )}`}
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
              onClick={save}
              disabled={isSaving || isLoading}
              className="flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save rules
            </button>
            <button
              type="button"
              onClick={async () => {
                await save();
                void navigate({ to: "/projects/$id/workflow-design", params: { id } });
              }}
              disabled={isSaving || isLoading}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Continue to workflows
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
