import { AlertCircle, Code2, Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { RuleFlowCanvas } from "@/components/eml/RuleFlowCanvas";
import { emitRuleFlow, type RuleFlow, validateRuleFlow } from "@/lib/eml/rule-flow";

/**
 * One business rule.
 *
 * Lifted out of the rules step so the same editor can sit beside the workflow
 * one: a rule and the process that reads its decision are the same piece of
 * work, and they now share a screen.
 */

/** The lifecycle events a rule can be bound to. */
export const RULE_EVENTS = [
  "beforeCreate",
  "afterCreate",
  "beforeUpdate",
  "afterUpdate",
  "beforeDelete",
  "customValidate",
] as const;

export interface EditableRule {
  /** Stable across renames, so React keeps the row it is editing. */
  key: string;
  name: string;
  entity: string;
  event: string;
  priority?: number;
  title?: string;
  flow: RuleFlow;
}

export function slugifyRuleName(value: string): string {
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

export interface RuleEditorProps {
  rule: EditableRule;
  entities: Array<{ name: string; attributes: string[] }>;
  projectId: string;
  onChange: (patch: Partial<EditableRule>) => void;
  onError: (message: string | null) => void;
}

export function RuleEditor({ rule, entities, projectId, onChange, onError }: RuleEditorProps) {
  const [showSource, setShowSource] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);

  const fieldHints = useMemo(
    () => entities.find((candidate) => candidate.name === rule.entity)?.attributes ?? [],
    [entities, rule.entity]
  );
  const problems = useMemo(() => validateRuleFlow(rule.flow), [rule.flow]);

  /** Ask the AI for a first draft, then drop it onto the canvas to refine. */
  const draftWithAi = async () => {
    if (!aiPrompt.trim()) return;
    setIsDrafting(true);
    onError(null);
    try {
      const response = await fetch("/api/ai/rules-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-flowchart",
          description: aiPrompt,
          // Send what is on the canvas so the model extends it rather than
          // replacing work already done.
          currentFlowchartCode: emitRuleFlow(rule.flow),
          projectId,
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
              flowchart?: string;
              error?: string;
            };
            if (payload.flowchart) flowchart = payload.flowchart;
            if (payload.error) failure = payload.error;
          } catch {
            // A frame that does not parse is a partial write; the next read completes it.
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
      if (!flowchart) throw new Error("The AI returned no flowchart");

      const { parseRuleFlow } = await import("@/lib/eml/rule-flow");
      onChange({ flow: parseRuleFlow(flowchart) });
      setAiPrompt("");
    } catch (draftError) {
      onError(draftError instanceof Error ? draftError.message : "Could not draft the rule");
    } finally {
      setIsDrafting(false);
    }
  };

  return (
    <>
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium">Name</span>
          <input
            className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
            value={rule.title ?? rule.name}
            onChange={(event) =>
              onChange({ title: event.target.value, name: slugifyRuleName(event.target.value) })
            }
            placeholder="Sample expiry guard"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium">Entity</span>
          <select
            className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
            value={rule.entity}
            onChange={(event) => onChange({ entity: event.target.value })}
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
            value={rule.event}
            onChange={(event) => onChange({ event: event.target.value })}
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
            value={rule.priority ?? 100}
            onChange={(event) => onChange({ priority: Number(event.target.value) || 0 })}
          />
        </label>
      </div>

      <div className="h-[520px]">
        <RuleFlowCanvas
          flow={rule.flow}
          onChange={(flow) => onChange({ flow })}
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
          {`%%rule ${slugifyRuleName(rule.title ?? rule.name)} on ${
            rule.entity || "<entity>"
          } event: ${rule.event} priority: ${rule.priority ?? 100}\n${emitRuleFlow(rule.flow)}`}
        </pre>
      )}
    </>
  );
}
