/**
 * One stored rule, opened in the graph editor beside the workflows that use it.
 *
 * This is the Logic step's rule pane: the same editor, the same Simulator and
 * Try it, and one Save. The rule's record type and name are shown, not edited
 * here — they are what other screens file the rule under.
 */

import { useState } from "react";
import { RuleGraphEditor } from "@/components/rules/RuleGraphEditor";

interface RulePaneProps {
  id: string;
  name: string;
  /** The table the rule is filed under. */
  entityName: string;
  /** The record type's name as people read it. */
  entityLabel: string;
  /** The stored rule, as the API returned it. */
  content: string;
  onSaved: (id: string, content: string) => void;
}

export function RulePane({ id, name, entityName, entityLabel, content, onSaved }: RulePaneProps) {
  const [draft, setDraft] = useState(content);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const save = async () => {
    setState("saving");
    setMessage("");
    try {
      const res = await fetch(`/api/rules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdmContent: draft }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
        setMessage([body.message ?? `Could not save (${res.status}).`].flat().join(" "));
        setState("error");
        return;
      }
      onSaved(id, draft);
      setState("saved");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save.");
      setState("error");
    }
  };

  return (
    <div className="min-w-0 flex-1 overflow-y-auto p-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{name}</h2>
          <p className="text-xs text-muted-foreground">A rule on {entityLabel}</p>
        </div>
        <div className="flex-1" />
        {state === "saved" ? <span className="text-xs text-emerald-600">Saved</span> : null}
        {state === "error" ? (
          <span role="alert" className="max-w-md text-xs text-red-600 dark:text-red-400">
            {message}
          </span>
        ) : null}
        <a
          href={`/admin/rules/${id}/edit`}
          className="text-xs font-medium text-primary hover:underline"
        >
          Open on its own page →
        </a>
        <button
          type="button"
          onClick={() => void save()}
          disabled={state === "saving"}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-[13px] font-semibold hover:bg-muted disabled:opacity-50"
        >
          {state === "saving" ? "Saving…" : "Save rule"}
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <RuleGraphEditor
          key={id}
          entityName={entityName}
          ruleName={name}
          initialContent={content}
          onChange={(json) => {
            setDraft(json);
            setState("idle");
          }}
        />
      </div>
    </div>
  );
}
