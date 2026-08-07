/**
 * The automations screen.
 *
 * One rail on the left listing everything in the project, one work area on the
 * right showing whichever thing is selected — an automation, a rule table, or
 * the help. Keeping automations and rule tables in the same rail is deliberate:
 * a rule table is only ever reached from a step that looks it up, and splitting
 * them across two pages is what made rules and workflows feel like two products.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AutomationBuilder,
  type RuleTableSummary,
} from "@/components/automation/AutomationBuilder";
import { AutomationHelp } from "@/components/automation/AutomationHelp";
import { RuleTableEditor } from "@/components/automation/RuleTableEditor";
import {
  type Automation,
  emptyAutomation,
  parseAutomation,
  serializeAutomation,
  validateAutomation,
} from "@/lib/automation/model";
import { cn } from "@/lib/utils";
import { type DecisionTable, emptyDecisionTable } from "@/lib/workflow/bpmn-model";

export const Route = createFileRoute("/projects/$id/automations")({
  component: AutomationsPage,
});

interface StoredAutomation {
  id: string;
  name: string;
  serviceName: string;
  mermaid: string;
  updatedAt?: string;
}

interface RuleTableRecord {
  id: string;
  name: string;
  entity: string;
  table: DecisionTable;
}

type View = { kind: "automation"; id: string } | { kind: "table"; id: string } | { kind: "help" };

function AutomationsPage() {
  const { id: projectId } = Route.useParams();

  const [automations, setAutomations] = useState<Automation[]>([]);
  const [storedIds, setStoredIds] = useState<Record<string, string>>({});
  const [tables, setTables] = useState<RuleTableRecord[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  const [entityFields, setEntityFields] = useState<Record<string, string[]>>({});
  const [view, setView] = useState<View>({ kind: "help" });
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  /* ---------------------------------------------------------------- load */

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [autoRes, ruleRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/automations`),
          fetch("/api/rules"),
        ]);

        if (cancelled) return;

        if (autoRes.ok) {
          const data = (await autoRes.json()) as {
            automations: StoredAutomation[];
            entities?: { name: string; attributes?: { name: string }[] }[];
          };

          const entityList = data.entities ?? [];
          setEntities(entityList.map((e) => e.name));
          setEntityFields(
            Object.fromEntries(
              entityList.map((e) => [e.name, (e.attributes ?? []).map((a) => a.name)])
            )
          );
          const parsed = data.automations.map((row) => ({
            stored: row.id,
            automation: {
              ...parseAutomation(row.mermaid, row.serviceName || "Record"),
              name: row.name,
              updatedAt: row.updatedAt,
            },
          }));
          setAutomations(parsed.map((p) => p.automation));
          setStoredIds(Object.fromEntries(parsed.map((p) => [p.automation.id, p.stored])));
          const first = parsed[0];
          if (first) setView({ kind: "automation", id: first.automation.id });
        }

        if (ruleRes.ok) {
          const data = (await ruleRes.json()) as {
            rules?: {
              id: string;
              ruleName?: string;
              entityName?: string;
              jdmContent?: unknown;
              rule_name?: string;
              entity_name?: string;
              jdm_content?: unknown;
            }[];
          };
          setTables(
            (data.rules ?? []).map((r) => ({
              id: r.id,
              name: r.ruleName ?? r.rule_name ?? "Untitled rule",
              entity: r.entityName ?? r.entity_name ?? "",
              table: asDecisionTable(r.jdmContent ?? r.jdm_content),
            }))
          );
        }
      } catch (error) {
        console.error("Failed to load automations:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  /* ---------------------------------------------------------------- derive */

  const current = useMemo(
    () => (view.kind === "automation" ? automations.find((a) => a.id === view.id) : undefined),
    [view, automations]
  );

  const currentTable = useMemo(
    () => (view.kind === "table" ? tables.find((t) => t.id === view.id) : undefined),
    [view, tables]
  );

  const ruleTableSummaries: RuleTableSummary[] = useMemo(
    () =>
      tables.map((t) => ({
        id: t.id,
        name: t.name,
        rowCount: t.table.rules.length,
        outputs: t.table.outputs.map((o) => o.field || o.name),
      })),
    [tables]
  );

  const usersOf = useCallback(
    (tableName: string) =>
      automations.flatMap((a) =>
        a.steps
          .map((s, i) => ({ s, i }))
          .filter(({ s }) => s.type === "Decision" && s.props.ruleTable === tableName)
          .map(({ i }) => ({ name: a.name, where: `step ${i + 1}` }))
      ),
    [automations]
  );

  const helpExample = useMemo(() => {
    const entity = entities[0] ?? "Order";
    return {
      entity,
      numericField:
        (entityFields[entity] ?? []).find((f) => /total|amount|price|qty/i.test(f)) ?? "total",
      relatedEntity: entities[1] ?? "Invoice",
    };
  }, [entities, entityFields]);

  /* ---------------------------------------------------------------- write */

  const updateAutomation = (next: Automation) =>
    setAutomations((list) => list.map((a) => (a.id === next.id ? next : a)));

  const createAutomation = async () => {
    const fresh = emptyAutomation(entities[0] ?? "Record");
    setAutomations((list) => [...list, fresh]);
    setView({ kind: "automation", id: fresh.id });

    try {
      const res = await fetch(`/api/projects/${projectId}/automations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fresh.name,
          entity: fresh.trigger.entity,
          mermaid: serializeAutomation(fresh),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { automation: { id: string } };
        setStoredIds((m) => ({ ...m, [fresh.id]: data.automation.id }));
      }
    } catch (error) {
      console.error("Failed to create automation:", error);
    }
  };

  const publish = async (automation: Automation) => {
    const storedId = storedIds[automation.id];
    if (!storedId) return;

    setSaveState("saving");
    try {
      const res = await fetch(`/api/projects/${projectId}/automations/${storedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: automation.name,
          entity: automation.trigger.entity,
          mermaid: serializeAutomation(automation),
          status: "live",
        }),
      });
      setSaveState(res.ok ? "saved" : "error");
      if (res.ok) updateAutomation({ ...automation, status: "live" });
    } catch (error) {
      console.error("Failed to publish automation:", error);
      setSaveState("error");
    }
  };

  /* ---------------------------------------------------------------- render */

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        Loading automations…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-5">
        <span className="grid h-[26px] w-[26px] place-items-center rounded-lg bg-primary text-[13px] font-bold text-primary-foreground">
          E
        </span>
        <span className="text-[15px] font-bold">ERDwithAI</span>
        <span className="text-[13px] text-muted-foreground">
          Automations ›{" "}
          <b className="font-semibold text-foreground">
            {view.kind === "help"
              ? "Help"
              : view.kind === "table"
                ? (currentTable?.name ?? "Rule table")
                : (current?.name ?? "Automation")}
          </b>
        </span>
        <div className="flex-1" />
        {saveState === "saving" ? (
          <span className="text-xs text-muted-foreground">Saving…</span>
        ) : null}
        {saveState === "saved" ? <span className="text-xs text-emerald-600">Published</span> : null}
        {saveState === "error" ? (
          <span className="text-xs text-red-600">Could not save. Try again.</span>
        ) : null}
        <button
          type="button"
          onClick={() => setView({ kind: "help" })}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          ? Help
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="Automations and rule tables"
          // Scrolls on its own: with a few hundred automations an unscrolled rail
          // grows the document instead, and selecting one further down takes the
          // work area off screen with it.
          className="flex w-[248px] shrink-0 flex-col overflow-y-auto border-r border-border bg-card"
        >
          <h2 className="px-4 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
            Automations
          </h2>
          {automations.length === 0 ? (
            <p className="px-4 pb-2 text-xs text-muted-foreground">None yet.</p>
          ) : null}
          {automations.map((a) => {
            const problems = validateAutomation(a).length;
            return (
              <RailItem
                key={a.id}
                selected={view.kind === "automation" && view.id === a.id}
                onSelect={() => setView({ kind: "automation", id: a.id })}
                dot={a.status === "live" ? "live" : problems > 0 ? "draft" : "paused"}
                title={a.name}
                subtitle={`${a.trigger.entity || "no record type"} · ${a.steps.length} step${
                  a.steps.length === 1 ? "" : "s"
                }`}
              />
            );
          })}

          <h2 className="px-4 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
            Rule tables
          </h2>
          {tables.length === 0 ? (
            <p className="px-4 pb-2 text-xs text-muted-foreground">None yet.</p>
          ) : null}
          {tables.map((t) => (
            <RailItem
              key={t.id}
              selected={view.kind === "table" && view.id === t.id}
              onSelect={() => setView({ kind: "table", id: t.id })}
              dot="live"
              title={t.name}
              subtitle={`${t.table.inputs.length} inputs · ${t.table.rules.length} rows`}
            />
          ))}

          <div className="mt-auto border-t border-border p-3">
            <button
              type="button"
              onClick={createAutomation}
              className="w-full rounded-lg border border-border bg-card py-2 text-[13px] font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              + New automation
            </button>
          </div>
        </nav>

        {view.kind === "help" ? (
          <AutomationHelp
            example={helpExample}
            onClose={
              automations[0]
                ? () => setView({ kind: "automation", id: automations[0]?.id as string })
                : undefined
            }
          />
        ) : null}

        {view.kind === "automation" && current ? (
          <AutomationBuilder
            automation={current}
            onChange={updateAutomation}
            entities={entities}
            entityFields={entityFields}
            ruleTables={ruleTableSummaries}
            // No onOpenHelp: this page already puts Help in its header, and two
            // identical controls on one screen is one more decision than needed.
            onOpenRuleTable={(name) => {
              const table = tables.find((t) => t.name === name);
              if (table) setView({ kind: "table", id: table.id });
            }}
            onPublish={() => void publish(current)}
          />
        ) : null}

        {view.kind === "table" && currentTable ? (
          <RuleTableEditor
            name={currentTable.name}
            table={currentTable.table}
            usedBy={usersOf(currentTable.name)}
            onChange={(table) =>
              setTables((list) => list.map((t) => (t.id === currentTable.id ? { ...t, table } : t)))
            }
          />
        ) : null}
      </div>
    </div>
  );
}

function RailItem({
  selected,
  onSelect,
  dot,
  title,
  subtitle,
}: {
  selected: boolean;
  onSelect: () => void;
  dot: "live" | "draft" | "paused";
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "page" : undefined}
      className={cn(
        "mx-2 flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        selected ? "bg-primary/10" : "hover:bg-muted"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
          dot === "live" ? "bg-emerald-500" : dot === "draft" ? "bg-amber-500" : "bg-neutral-400"
        )}
      />
      <span className="min-w-0">
        <span
          className={cn(
            "block truncate text-[13px]",
            selected ? "font-semibold text-foreground" : "text-foreground"
          )}
        >
          {title}
        </span>
        <span className="block truncate text-[11.5px] text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}

/**
 * Accept whatever the rules API stored.
 *
 * Rules predate this editor, so a stored rule may be a JDM graph rather than a
 * table. Rather than guess at a conversion, anything unrecognised opens as an
 * empty table — visibly empty beats silently wrong.
 */
function asDecisionTable(content: unknown): DecisionTable {
  if (content && typeof content === "object") {
    const c = content as Partial<DecisionTable>;
    if (Array.isArray(c.inputs) && Array.isArray(c.outputs) && Array.isArray(c.rules)) {
      return {
        hitPolicy: c.hitPolicy === "collect" ? "collect" : "first",
        inputs: c.inputs,
        outputs: c.outputs,
        rules: c.rules,
      };
    }
  }
  return emptyDecisionTable();
}
