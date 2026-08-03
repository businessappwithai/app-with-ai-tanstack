/**
 * BpmnCanvas — the Workflow Designer's editor.
 *
 * A thin adapter over the shared editor: it knows how to ask this application's
 * dictionary for the tables and columns a step can act on, and hands the rest
 * over. The editor itself is the same code the modelling tool uses, so a
 * workflow drawn there and one drawn here behave identically.
 *
 * The imperative handle (`getXml` / `importXml`) is kept because the routes
 * around it save and load BPMN directly.
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  BpmnWorkflowEditor,
  type BpmnWorkflowEditorHandle,
} from "../workflow/BpmnWorkflowEditor";

export type BpmnCanvasHandle = BpmnWorkflowEditorHandle;

interface TableRow {
  table_name: string;
  name: string;
}

/** Columns that exist on every row and are never a step's business. */
const SKIP_COLUMNS = new Set([
  "id",
  "created_at",
  "updated_at",
  "deleted_at",
  "version",
  "workflow_status",
  "workflow_run_id",
  "doc_status",
  "doc_status_message",
  "is_active",
]);

/** The business tables a step may act on. */
function useBusTables(): TableRow[] {
  const [tables, setTables] = useState<TableRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/sys/tables?limit=200", { credentials: "include" })
      .then((response) => response.json())
      .then((body) => {
        if (cancelled) return;
        const rows = (Array.isArray(body) ? body : (body?.data ?? [])) as TableRow[];
        setTables(
          rows
            .filter((row) => row.table_name?.startsWith("bus_"))
            .map((row) => ({ table_name: row.table_name, name: row.name || row.table_name }))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return tables;
}

/**
 * Columns per table, fetched on demand and remembered.
 *
 * The editor asks for columns synchronously while rendering a step's pickers,
 * so this returns whatever is already known and starts a fetch for whatever is
 * not. The first render of a newly chosen entity falls back to a free-text
 * field, and the picker appears a moment later.
 */
function useColumnCache(): (tableName: string) => string[] {
  const [cache, setCache] = useState<Record<string, string[]>>({});
  const inFlight = useRef(new Set<string>());

  return useCallback(
    (tableName: string) => {
      const table = tableName?.trim();
      if (!table) return [];
      if (cache[table]) return cache[table];
      if (inFlight.current.has(table)) return [];

      inFlight.current.add(table);
      fetch(`/api/sys/columns/direct?tableName=${encodeURIComponent(table)}`, {
        credentials: "include",
      })
        .then((response) => response.json())
        .then((body) => {
          const rows = (Array.isArray(body) ? body : (body?.data ?? [])) as {
            column_name: string;
          }[];
          const columns = rows
            .map((row) => row.column_name)
            .filter((column) => column && !SKIP_COLUMNS.has(column));
          setCache((current) => ({ ...current, [table]: columns }));
        })
        .catch(() => setCache((current) => ({ ...current, [table]: [] })))
        .finally(() => inFlight.current.delete(table));

      return [];
    },
    [cache]
  );
}

/** Rules a Decision step may evaluate instead of carrying its own table. */
function useRuleNames(): string[] {
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/rules?limit=200", { credentials: "include" })
      .then((response) => response.json())
      .then((body) => {
        if (cancelled) return;
        const rows = (Array.isArray(body) ? body : (body?.data ?? [])) as {
          rule_name?: string;
          ruleName?: string;
        }[];
        setNames(
          rows
            .map((row) => row.rule_name ?? row.ruleName)
            .filter((name): name is string => Boolean(name))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return names;
}

const BpmnCanvas = forwardRef<
  BpmnCanvasHandle,
  {
    className?: string;
    /** Table this workflow is triggered by, so its columns fill the pickers. */
    entityName?: string;
    readOnly?: boolean;
  }
>(({ className, entityName, readOnly }, ref) => {
  const tables = useBusTables();
  const columnsFor = useColumnCache();
  const ruleNames = useRuleNames();
  const [handle, setHandle] = useState<BpmnWorkflowEditorHandle | null>(null);

  // The routes load a workflow as soon as the record arrives, which is usually
  // before the canvas exists. Rejecting there left the diagram empty for good:
  // the effect that called it had already run and had no reason to run again.
  // Hold the XML instead, and import it the moment there is something to
  // import it into.
  const pendingXml = useRef<string | null>(null);

  useEffect(() => {
    if (!handle || pendingXml.current === null) return;
    const xml = pendingXml.current;
    pendingXml.current = null;
    void handle.importXml(xml);
  }, [handle]);

  useImperativeHandle(
    ref,
    () => ({
      getXml: () => {
        if (!handle) return Promise.reject(new Error("The editor is still loading."));
        return handle.getXml();
      },
      importXml: async (xml: string) => {
        if (!handle) {
          pendingXml.current = xml;
          return;
        }
        await handle.importXml(xml);
      },
    }),
    [handle]
  );

  // The workflow's Entity picker stores a display name ("Appointment") while a
  // step's stores a table name ("bus_appointment"), so resolve before asking.
  const triggeringTable =
    tables.find((table) => table.table_name === entityName || table.name === entityName)
      ?.table_name ?? "";

  return (
    <div className={`h-full ${className ?? ""}`}>
      <BpmnWorkflowEditor
        onReady={setHandle}
        entities={tables.map((table) => ({ name: table.name, tableName: table.table_name }))}
        entityColumns={triggeringTable ? columnsFor(triggeringTable) : []}
        columnsFor={columnsFor}
        ruleNames={ruleNames}
        readOnly={readOnly}
      />
    </div>
  );
});

BpmnCanvas.displayName = "BpmnCanvas";
export default BpmnCanvas;
