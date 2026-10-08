import { useState } from "react";
import { RULE_TEMPLATES, type RuleTemplateKind } from "@/lib/eml/rule-templates";

interface RuleStarterPickerProps {
  /** True once the author has drawn something that choosing a starter would replace. */
  hasWork: boolean;
  onPick: (kind: RuleTemplateKind) => void;
}

/**
 * "Start from…" — the five shapes a rule can take, each a working example.
 *
 * Replacing real work is a two-step choice inline rather than `confirm()`: this
 * tool also runs in an iframe, where a modal is not guaranteed to appear.
 */
export function RuleStarterPicker({ hasWork, onPick }: RuleStarterPickerProps) {
  const [pending, setPending] = useState<RuleTemplateKind | null>(null);

  return (
    <div className="mb-3 rounded-lg border border-border bg-muted/30 p-3">
      <p className="mb-2 text-xs font-medium">
        Start from an example
        <span className="ml-1 font-normal text-muted-foreground">
          — each one is a working “required field” rule you can adapt
        </span>
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {RULE_TEMPLATES.map((template) => (
          <button
            key={template.kind}
            type="button"
            onClick={() => (hasWork ? setPending(template.kind) : onPick(template.kind))}
            className="rounded-md border border-border bg-background p-2 text-left hover:border-primary"
          >
            <span className="block text-sm font-medium">{template.label}</span>
            <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
              {template.summary}
            </span>
          </button>
        ))}
      </div>
      {pending && (
        <div
          role="alert"
          className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
        >
          <span>This replaces the rule you have drawn so far.</span>
          <button
            type="button"
            className="rounded border border-amber-400 bg-white px-2 py-1 font-medium"
            onClick={() => {
              onPick(pending);
              setPending(null);
            }}
          >
            Replace it
          </button>
          <button
            type="button"
            className="rounded border border-border bg-white px-2 py-1"
            onClick={() => setPending(null)}
          >
            Keep mine
          </button>
        </div>
      )}
    </div>
  );
}
