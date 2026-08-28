import { AlertCircle, Code2 } from "lucide-react";
import { useMemo, useState } from "react";
import { RuleTableEditor } from "@/components/eml/RuleTableEditor";
import {
  type DecisionTable,
  tableToEmlFlowchart,
  validateDecisionTable,
} from "@/lib/eml/decision-table";

/**
 * One business rule — shown as a decision table, matching the rule editor in
 * the generated admin application so both surfaces look and behave identically.
 */

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
  table: DecisionTable;
}

export function slugifyRuleName(value: string): string {
  const cleaned = value
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
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

export function RuleEditor({ rule, entities, onChange }: RuleEditorProps) {
  const [showSource, setShowSource] = useState(false);
  const problems = useMemo(() => validateDecisionTable(rule.table), [rule.table]);

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

      <RuleTableEditor
        name={slugifyRuleName(rule.title ?? rule.name)}
        table={rule.table}
        onChange={(table) => onChange({ table })}
      />

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
          {`%%rule ${slugifyRuleName(rule.title ?? rule.name)} on ${
            rule.entity || "<entity>"
          } event: ${rule.event} priority: ${rule.priority ?? 100}\n${tableToEmlFlowchart(rule.table)}`}
        </pre>
      )}
    </>
  );
}
