import { useState } from "react";
import {
  buildRuleTemplate,
  RULE_TEMPLATES,
  type RuleTemplateKind,
  type TemplateGraph,
} from "@/lib/eml/rule-templates";

/** The editor's node colours, so a starter looks like the node it will become. */
const NODE_LOOK: Record<string, { color: string; glyph: string }> = {
  inputNode: { color: "#10b981", glyph: "→" },
  outputNode: { color: "#10b981", glyph: "⇥" },
  decisionTableNode: { color: "#3b82f6", glyph: "▦" },
  expressionNode: { color: "#6366f1", glyph: "#" },
  functionNode: { color: "#f97316", glyph: "JS" },
  switchNode: { color: "#8b5cf6", glyph: "⑂" },
};

const NODE_W = 150;
const NODE_H = 44;

/**
 * A starter drawn as the graph it becomes: the same nodes and edges the editor
 * will open with, laid out from the same positions.
 */
function GraphPreview({ graph, label }: { graph: TemplateGraph; label: string }) {
  const xs = graph.nodes.map((n) => n.position.x);
  const ys = graph.nodes.map((n) => n.position.y);
  const left = Math.min(...xs) - 12;
  const top = Math.min(...ys) - 12;
  const width = Math.max(...xs) + NODE_W + 12 - left;
  const height = Math.max(...ys) + NODE_H + 12 - top;
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));

  return (
    <svg
      role="img"
      aria-label={`${label} as a graph`}
      viewBox={`${left} ${top} ${width} ${height}`}
      className="h-28 w-full rounded bg-muted/40"
    >
      {graph.edges.map((edge) => {
        const from = byId.get(edge.sourceId);
        const to = byId.get(edge.targetId);
        if (!from || !to) return null;
        const x1 = from.position.x + NODE_W;
        const y1 = from.position.y + NODE_H / 2;
        const x2 = to.position.x;
        const y2 = to.position.y + NODE_H / 2;
        const mid = (x1 + x2) / 2;
        return (
          <path
            key={edge.id}
            d={`M${x1} ${y1} C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={3}
          />
        );
      })}
      {graph.nodes.map((node) => {
        const look = NODE_LOOK[node.type] ?? { color: "#64748b", glyph: "•" };
        return (
          <g key={node.id} transform={`translate(${node.position.x} ${node.position.y})`}>
            <rect
              width={NODE_W}
              height={NODE_H}
              rx={8}
              fill="#fff"
              stroke="#cbd5e1"
              strokeWidth={2}
            />
            <rect width={36} height={NODE_H} rx={8} fill={look.color} />
            <text x={18} y={NODE_H / 2 + 6} textAnchor="middle" fontSize={16} fill="#fff">
              {look.glyph}
            </text>
            <text x={46} y={NODE_H / 2 + 6} fontSize={19} fill="#0f172a">
              {node.name.length > 11 ? `${node.name.slice(0, 10)}…` : node.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

interface RuleStarterPickerProps {
  /** The entity's own fields, so each starter is drawn over a field that exists. */
  entityFields?: string[];
  /** True once the author has drawn something that choosing a starter would replace. */
  hasWork: boolean;
  onPick: (kind: RuleTemplateKind) => void;
}

/**
 * "Start from…" — the four shapes a rule can take, each a working example.
 *
 * Replacing real work is a two-step choice inline rather than `confirm()`: this
 * tool also runs in an iframe, where a modal is not guaranteed to appear.
 */
export function RuleStarterPicker({ hasWork, onPick, entityFields = [] }: RuleStarterPickerProps) {
  const [pending, setPending] = useState<RuleTemplateKind | null>(null);

  return (
    <div className="mb-3 rounded-lg border border-border bg-muted/30 p-3">
      <p className="mb-2 text-xs font-medium">
        Start from an example
        <span className="ml-1 font-normal text-muted-foreground">
          — each one is a working “required field” rule you can adapt
        </span>
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {RULE_TEMPLATES.map((template) => (
          <button
            key={template.kind}
            type="button"
            onClick={() => (hasWork ? setPending(template.kind) : onPick(template.kind))}
            className="rounded-md border border-border bg-background p-2 text-left hover:border-primary"
          >
            <GraphPreview
              graph={buildRuleTemplate(template.kind, { entityFields }) as TemplateGraph}
              label={template.label}
            />
            <span className="mt-1 block text-sm font-medium">{template.label}</span>
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
