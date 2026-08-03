import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  analyzeVariables,
  consumedBy,
  type DecisionTable,
  describeProblem,
  emptyDecisionTable,
  missingRequirements,
  parseDecisionTable,
  publishedBy,
  STEP_HINTS,
  STEP_LABELS,
  STEP_TYPES,
  type StepType,
  serializeDecisionTable,
  type WorkflowStep,
} from "../../lib/workflow/bpmn-model";
import { DecisionTableGrid } from "./DecisionTableGrid";
import { StepPropertyFields } from "./StepPropertyFields";

/**
 * One editor for a whole workflow.
 *
 * The diagram is on top and the drawer is the full width of the window,
 * because the one thing a workflow editor has to hold that a properties
 * sidebar cannot is a decision table: five columns and a dozen rows do not fit
 * beside a canvas, and pushing them into a modal is what made rules and
 * workflows feel like two products.
 *
 * The drawer's three tabs are the three questions someone actually has —
 * what does this step do, what does the table decide, and where do the values
 * come from — and the variable strip along the bottom answers the third one
 * without anyone having to open a tab at all.
 */

const MODDLE_EXTENSION = {
  erdwithai: {
    name: "ERDwithAI",
    uri: "http://erdwithai.io/schema/1.0",
    prefix: "erdwithai",
    xml: { tagAlias: "lowerCase" },
    types: [
      {
        name: "Properties",
        superClass: ["Element"],
        meta: { allowedIn: ["bpmn:BaseElement"] },
        properties: [{ name: "values", type: "Property", isMany: true, isBody: false }],
      },
      {
        name: "Property",
        superClass: ["Element"],
        properties: [
          { name: "name", isAttr: true, type: "String" },
          { name: "value", isAttr: true, type: "String" },
        ],
      },
    ],
  },
};

export const EMPTY_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:erdwithai="http://erdwithai.io/schema/1.0"
  id="Definitions_1"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="Start"/>
    <bpmn:endEvent id="EndEvent_1" name="End"/>
    <bpmn:sequenceFlow id="Flow_end" sourceRef="StartEvent_1" targetRef="EndEvent_1"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="102" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="452" y="102" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_end_di" bpmnElement="Flow_end">
        <di:waypoint x="188" y="120"/>
        <di:waypoint x="452" y="120"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

export interface BpmnWorkflowEditorHandle {
  getXml: () => Promise<string>;
  importXml: (xml: string) => Promise<void>;
}

export interface BpmnWorkflowEditorProps {
  /**
   * Handed the imperative API once the canvas exists.
   *
   * A callback rather than a `ref` prop so the same file works on React 18 and
   * 19 — the generated applications are on 18, and one editor that behaves
   * identically in both is worth more than the slightly nicer call site.
   */
  onReady?: (handle: BpmnWorkflowEditorHandle) => void;
  /** Entity names offered in the entity pickers. */
  entities?: { name: string; tableName: string }[];
  /** Columns of the triggering entity, so a read can be told from a typo. */
  entityColumns?: string[];
  /** Named rules a Decision step may evaluate instead of an inline table. */
  ruleNames?: string[];
  /** Columns of a chosen entity — supplied by the host, which knows how to ask. */
  columnsFor?: (tableName: string) => string[];
  readOnly?: boolean;
  /** Fires whenever the diagram changes, so the host can mark itself dirty. */
  onDirty?: () => void;
  /**
   * Every step, in the order the executor will run them.
   *
   * A host that persists something other than BPMN — the generator app stores
   * EML `%%step` directives — reads the workflow back through this rather than
   * re-parsing the XML it just produced.
   */
  onStepsChange?: (steps: WorkflowStep[]) => void;
}

type Tab = "step" | "table" | "variables";

// biome-ignore lint/suspicious/noExplicitAny: bpmn-js ships no types for the modeler
type Modeler = any;

export function BpmnWorkflowEditor({
  onReady,
  entities = [],
  entityColumns = [],
  ruleNames = [],
  columnsFor,
  readOnly = false,
  onDirty,
  onStepsChange,
}: BpmnWorkflowEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<Modeler>(null);
  const initRef = useRef(false);
  const pendingXmlRef = useRef<string | null>(null);

  // The bpmn-js event handlers are registered once, on mount, so anything they
  // call has to be reached through a ref. Closing over the props directly meant
  // every change was reported to the callbacks as they were on the very first
  // render — the host saw an empty workflow forever, however many steps were
  // added.
  const callbacksRef = useRef({ onDirty, onStepsChange, onReady });
  callbacksRef.current = { onDirty, onStepsChange, onReady };

  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("step");
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [importError, setImportError] = useState<string | null>(null);

  const selected = steps.find((step) => step.id === selectedId) ?? null;
  const selectedIndex = steps.findIndex((step) => step.id === selectedId);

  /* ---------------------------------------------------------------------- */
  /*  Reading the diagram                                                    */
  /* ---------------------------------------------------------------------- */

  /**
   * Re-read every service task in sequence-flow order.
   *
   * Order is the whole point: a workflow's variables only work because one
   * step runs before another, so the editor has to see the same order the
   * executor will, not the order the shapes were created in.
   */
  const syncFromDiagram = useCallback(() => {
    const modeler = modelerRef.current;
    if (!modeler) return;

    const registry = modeler.get("elementRegistry");
    // biome-ignore lint/suspicious/noExplicitAny: bpmn-js element shapes are untyped
    const tasks = registry.filter((element: any) => element.type === "bpmn:ServiceTask");
    const byId = new Map<string, WorkflowStep>();
    for (const task of tasks) {
      byId.set(task.id, {
        id: task.id,
        name: task.businessObject?.name ?? "",
        type: readProperties(task).nodeType ?? "UpdateEntity",
        props: (({ nodeType: _nodeType, ...rest }) => rest)(readProperties(task)),
      });
    }

    // biome-ignore lint/suspicious/noExplicitAny: as above
    const starts = registry.filter((element: any) => element.type === "bpmn:StartEvent");
    const ordered: WorkflowStep[] = [];
    const seen = new Set<string>();
    // biome-ignore lint/suspicious/noExplicitAny: as above
    const walk = (element: any) => {
      if (!element || seen.has(element.id)) return;
      seen.add(element.id);
      const step = byId.get(element.id);
      if (step) ordered.push(step);
      // biome-ignore lint/suspicious/noExplicitAny: as above
      for (const flow of element.outgoing ?? []) walk((flow as any).target);
    };
    for (const start of starts) walk(start);
    // A task nobody wired up still runs, after the wired ones — matching the
    // executor, which does not silently drop it.
    for (const [id, step] of byId) {
      if (!seen.has(id)) ordered.push(step);
    }

    setSteps(ordered);
    callbacksRef.current.onStepsChange?.(ordered);
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    let modeler: Modeler;

    (async () => {
      const container = containerRef.current;
      if (!container) return;

      const { default: BpmnModeler } = await import("bpmn-js/lib/Modeler");
      modeler = new BpmnModeler({
        container,
        moddleExtensions: MODDLE_EXTENSION,
      });
      modelerRef.current = modeler;

      try {
        await modeler.importXML(pendingXmlRef.current ?? EMPTY_BPMN);
      } catch (error) {
        setImportError(error instanceof Error ? error.message : String(error));
      }
      pendingXmlRef.current = null;

      const eventBus = modeler.get("eventBus");
      // biome-ignore lint/suspicious/noExplicitAny: bpmn-js event payloads are untyped
      eventBus.on("selection.changed", ({ newSelection }: any) => {
        const element = newSelection[0];
        setSelectedId(element?.type === "bpmn:ServiceTask" ? element.id : null);
        if (element?.type === "bpmn:ServiceTask") setDrawerOpen(true);
      });
      eventBus.on(["elements.changed", "import.done"], () => {
        syncFromDiagram();
        callbacksRef.current.onDirty?.();
      });

      syncFromDiagram();
    })();

    return () => modeler?.destroy();
  }, [syncFromDiagram]);

  const getXml = useCallback(async (): Promise<string> => {
    if (!modelerRef.current) throw new Error("The editor is still loading.");
    const { xml } = await modelerRef.current.saveXML({ format: true });
    return xml;
  }, []);

  const importXml = useCallback(
    async (xml: string): Promise<void> => {
      if (!modelerRef.current) {
        pendingXmlRef.current = xml;
        return;
      }
      setImportError(null);
      try {
        await modelerRef.current.importXML(xml);
        syncFromDiagram();
        // Fitting immediately measures a container the drawer has not finished
        // sizing, so a freshly opened workflow sat half under the panel. One
        // frame later the layout has settled.
        requestAnimationFrame(() => modelerRef.current?.get("canvas").zoom("fit-viewport"));
      } catch (error) {
        setImportError(error instanceof Error ? error.message : String(error));
      }
    },
    [syncFromDiagram]
  );

  useEffect(() => {
    callbacksRef.current.onReady?.({ getXml, importXml });
  }, [getXml, importXml]);

  /* ---------------------------------------------------------------------- */
  /*  Writing the diagram                                                    */
  /* ---------------------------------------------------------------------- */

  const writeStep = useCallback((id: string, patch: Partial<WorkflowStep>) => {
    const modeler = modelerRef.current;
    if (!modeler) return;
    const registry = modeler.get("elementRegistry");
    const element = registry.get(id);
    if (!element) return;

    const current = readProperties(element);
    const { nodeType: currentType, ...currentProps } = current;
    const type = patch.type ?? currentType ?? "UpdateEntity";
    const props = patch.props ?? currentProps;
    const name = patch.name ?? element.businessObject?.name ?? "";

    const moddle = modeler.get("moddle");
    const values = Object.entries({ nodeType: type, ...props })
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) =>
        moddle.create("erdwithai:Property", { name: key, value: String(value) })
      );

    modeler.get("modeling").updateProperties(element, {
      name,
      extensionElements: moddle.create("bpmn:ExtensionElements", {
        values: [moddle.create("erdwithai:Properties", { values })],
      }),
    });
  }, []);

  /**
   * Drop a step at the end of the chain, wired in.
   *
   * Adding a node used to leave it floating, so anyone building a multi-step
   * flow had to hand-draw every arrow and the saved order was whatever the
   * serialiser happened to emit. A palette that implies "and then this" should
   * produce a diagram that says so.
   */
  const addStep = useCallback(
    (type: StepType) => {
      const modeler = modelerRef.current;
      if (!modeler) return;

      const modeling = modeler.get("modeling");
      const registry = modeler.get("elementRegistry");
      const canvas = modeler.get("canvas");
      const root = canvas.getRootElement();

      // Drop it anywhere; `relayout` puts the whole chain in order a moment
      // later. Placing it by hand meant reasoning about how bpmn-js interprets
      // the position it is handed, and getting that subtly wrong produced
      // overlapping shapes with connections routed around them.
      const shape = modeling.createShape(
        { type: "bpmn:ServiceTask" },
        { x: 0, y: 0, width: TASK_WIDTH, height: TASK_HEIGHT },
        root
      );

      const moddle = modeler.get("moddle");
      const seed = defaultsFor(type, entities[0]?.tableName ?? "");
      const values = Object.entries({ nodeType: type, ...seed }).map(([key, value]) =>
        moddle.create("erdwithai:Property", { name: key, value: String(value) })
      );
      modeling.updateProperties(shape, {
        name: STEP_LABELS[type],
        extensionElements: moddle.create("bpmn:ExtensionElements", {
          values: [moddle.create("erdwithai:Properties", { values })],
        }),
      });

      chainOntoFlow(modeling, registry, shape);
      relayout(modeling, registry);
      modeler.get("selection").select(shape);
      setTab(type === "Decision" ? "table" : "step");
      setDrawerOpen(true);
      setTimeout(() => canvas.zoom("fit-viewport"), 60);
    },
    [entities]
  );

  /* ---------------------------------------------------------------------- */
  /*  Derived state                                                          */
  /* ---------------------------------------------------------------------- */

  const facts = useMemo(() => analyzeVariables(steps, entityColumns), [steps, entityColumns]);
  const availableBefore = useMemo(() => {
    if (selectedIndex < 0) return [];
    return steps.slice(0, selectedIndex).flatMap(publishedBy);
  }, [steps, selectedIndex]);
  const warnings = facts.map(describeProblem).filter((note): note is string => Boolean(note));

  const selectedTable = useMemo(
    () => (selected ? parseDecisionTable(selected.props.decisionTable) : null),
    [selected]
  );

  const selectedColumns = useMemo(() => {
    const table = selected?.props.entity?.trim();
    if (!table) return entityColumns;
    return columnsFor?.(table) ?? [];
  }, [selected, columnsFor, entityColumns]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Palette */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-2">
        <span className="mr-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          Add step
        </span>
        {STEP_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            disabled={readOnly}
            title={STEP_HINTS[type]}
            onClick={() => addStep(type)}
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:border-primary/60 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3 w-3" />
            {STEP_LABELS[type]}
          </button>
        ))}
        {warnings.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setTab("variables");
              setDrawerOpen(true);
            }}
            className="ml-auto flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {warnings.length} to look at
          </button>
        )}
      </div>

      {/* Canvas */}
      {/* overflow-hidden because bpmn-js draws its process label and search box
          relative to the canvas, and they spilled past the panel below it. */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-background">
        <div ref={containerRef} className="h-full w-full" />
        {importError && (
          <p
            role="alert"
            className="absolute inset-x-3 top-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            This workflow could not be opened: {importError}
          </p>
        )}
        {steps.length === 0 && !importError && (
          <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-xs text-muted-foreground">
            Add a step above. Each one is wired onto the end of the chain, so the diagram always
            says what runs in what order.
          </p>
        )}
      </div>

      {/* Drawer */}
      <div
        className="flex shrink-0 flex-col border-t border-border bg-card"
        style={{ height: drawerOpen ? "42%" : "auto" }}
      >
        <div className="flex items-center gap-1 border-b border-border px-3">
          {(
            [
              ["step", selected ? `Step — ${selected.name || selected.type}` : "Step"],
              ["table", "Decision table"],
              ["variables", `Variables (${facts.length})`],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setDrawerOpen(true);
              }}
              className={`-mb-px border-b-2 px-3 py-2.5 text-[13px] transition-colors ${
                tab === key && drawerOpen
                  ? "border-primary font-semibold text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            aria-label={drawerOpen ? "Collapse the panel" : "Expand the panel"}
            onClick={() => setDrawerOpen((open) => !open)}
            className="ml-auto p-2 text-muted-foreground hover:text-foreground"
          >
            {drawerOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>

        {drawerOpen && (
          <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
            {tab === "step" && (
              <StepTab
                step={selected}
                index={selectedIndex}
                total={steps.length}
                entities={entities}
                columns={selectedColumns}
                ruleNames={ruleNames}
                available={availableBefore}
                readOnly={readOnly}
                onPatch={(patch) => selected && writeStep(selected.id, patch)}
                onOpenTable={() => setTab("table")}
              />
            )}

            {tab === "table" && (
              <TableTab
                step={selected}
                table={selectedTable}
                entityColumns={selectedColumns}
                available={availableBefore}
                readOnly={readOnly}
                onChange={(table) =>
                  selected &&
                  writeStep(selected.id, {
                    props: { ...selected.props, decisionTable: serializeDecisionTable(table) },
                  })
                }
              />
            )}

            {tab === "variables" && <VariablesTab facts={facts} />}
          </div>
        )}

        {/* Variable strip — visible whether or not the drawer is open, because
            "where does this value come from" is the question that recurs. */}
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-t border-border px-3 py-2">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Variables
          </span>
          {facts.length === 0 && (
            <span className="text-[11.5px] text-muted-foreground">
              None yet — a step that publishes one lets the next step use it.
            </span>
          )}
          {facts.map((fact) => (
            <button
              key={fact.name}
              type="button"
              onClick={() => {
                setTab("variables");
                setDrawerOpen(true);
              }}
              title={describeProblem(fact) ?? `${fact.publishedBy ?? "the record"} → ${fact.name}`}
              className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11.5px] ${
                fact.problem === "unused" || fact.problem === "late"
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : fact.publishedBy
                    ? "border-primary/45 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
              }`}
            >
              {fact.publishedBy ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              {fact.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tabs                                                                       */
/* -------------------------------------------------------------------------- */

function StepTab({
  step,
  index,
  total,
  entities,
  columns,
  ruleNames,
  available,
  readOnly,
  onPatch,
  onOpenTable,
}: {
  step: WorkflowStep | null;
  index: number;
  total: number;
  entities: { name: string; tableName: string }[];
  columns: string[];
  ruleNames: string[];
  available: string[];
  readOnly: boolean;
  onPatch: (patch: Partial<WorkflowStep>) => void;
  onOpenTable: () => void;
}) {
  if (!step) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Select a step on the diagram to configure it.
      </p>
    );
  }

  const missing = missingRequirements(step);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
            Step {index + 1} of {total} · does
          </span>
          <select
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm disabled:opacity-60"
            value={step.type}
            disabled={readOnly}
            onChange={(event) => {
              const type = event.target.value as StepType;
              onPatch({
                type,
                name: STEP_LABELS[type],
                props: defaultsFor(type, entities[0]?.tableName ?? ""),
              });
              if (type === "Decision") onOpenTable();
            }}
          >
            {STEP_TYPES.map((type) => (
              <option key={type} value={type}>
                {STEP_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="block min-w-[15rem] flex-1">
          <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Called</span>
          <input
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm disabled:opacity-60"
            value={step.name}
            disabled={readOnly}
            placeholder="What this step does, in your words"
            onChange={(event) => onPatch({ name: event.target.value })}
          />
        </label>
      </div>

      <p className="text-[11.5px] text-muted-foreground">
        {STEP_HINTS[step.type as StepType] ?? "This step type is not one the executor knows."}
      </p>

      <StepPropertyFields
        step={step}
        entities={entities}
        columns={columns}
        ruleNames={ruleNames}
        available={available}
        readOnly={readOnly}
        onChange={(props) => onPatch({ props })}
        onOpenTable={onOpenTable}
      />

      {missing.length > 0 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11.5px] leading-relaxed text-amber-700 dark:text-amber-300">
          This step will be skipped until it has: {missing.join("; ")}.
        </div>
      )}
    </div>
  );
}

function TableTab({
  step,
  table,
  entityColumns,
  available,
  readOnly,
  onChange,
}: {
  step: WorkflowStep | null;
  table: DecisionTable | null;
  entityColumns: string[];
  available: string[];
  readOnly: boolean;
  onChange: (table: DecisionTable) => void;
}) {
  if (!step) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Select a Decision step to edit its table.
      </p>
    );
  }

  if (step.type !== "Decision") {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{step.name || step.type}</span> is not a
        decision. Add a Decision step to put a table in this workflow.
      </p>
    );
  }

  if (step.props.rule?.trim() && !table) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        This step evaluates the saved rule{" "}
        <code className="font-mono text-foreground">{step.props.rule.trim()}</code>. Edit it under
        Rules — the workflow reads whatever that rule says at the time it runs.
      </p>
    );
  }

  if (!table) {
    return (
      <div className="py-8 text-center">
        <p className="mb-3 text-xs text-muted-foreground">
          No table yet. One lives inside this step, so the branch stays where the process is.
        </p>
        <button
          type="button"
          disabled={readOnly}
          onClick={() => onChange(emptyDecisionTable())}
          className="rounded-md border border-primary/50 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-40"
        >
          Start a table
        </button>
      </div>
    );
  }

  return (
    <DecisionTableGrid
      table={table}
      onChange={onChange}
      entityColumns={entityColumns}
      availableVariables={available}
      readOnly={readOnly}
    />
  );
}

function VariablesTab({ facts }: { facts: ReturnType<typeof analyzeVariables> }) {
  if (facts.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Nothing is being passed between steps yet. A Decision, a Formula or a Create publishes a
        value; a later step reads it by name.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="px-2 pb-2 font-semibold">Name</th>
            <th className="px-2 pb-2 font-semibold">Published by</th>
            <th className="px-2 pb-2 font-semibold">Used by</th>
          </tr>
        </thead>
        <tbody>
          {facts.map((fact) => (
            <tr key={fact.name} className="border-b border-border/60">
              <td className="px-2 py-2 font-mono text-[11.5px] text-primary">{fact.name}</td>
              <td className="px-2 py-2">
                {fact.publishedBy ?? (
                  <span className="text-muted-foreground">the triggering record</span>
                )}
              </td>
              <td
                className={`px-2 py-2 ${fact.problem ? "text-amber-700 dark:text-amber-300" : ""}`}
              >
                {fact.usedBy.length > 0 ? fact.usedBy.join(", ") : "— not used"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {facts.map((fact) => {
        const note = describeProblem(fact);
        return note ? (
          <p
            key={fact.name}
            className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11.5px] leading-relaxed text-amber-700 dark:text-amber-300"
          >
            {note}
          </p>
        ) : null;
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  bpmn-js helpers                                                            */
/* -------------------------------------------------------------------------- */

// biome-ignore lint/suspicious/noExplicitAny: bpmn-js business objects are untyped
function readProperties(element: any): Record<string, string> {
  const props: Record<string, string> = {};
  for (const extension of element?.businessObject?.extensionElements?.values ?? []) {
    if (extension.$type !== "erdwithai:Properties") continue;
    for (const property of extension.values ?? []) {
      if (property.name) props[property.name] = property.value ?? "";
    }
  }
  return props;
}

/**
 * Splice a shape in just before the end event, so the chain still reads
 * start → … → end. Does nothing without a start event: someone who deleted it
 * is building something by hand and should not have it rewritten under them.
 */
// biome-ignore lint/suspicious/noExplicitAny: bpmn-js services are untyped
function chainOntoFlow(modeling: any, registry: any, shape: any): void {
  // biome-ignore lint/suspicious/noExplicitAny: as above
  const start = registry.filter((element: any) => element.type === "bpmn:StartEvent")[0];
  if (!start) return;

  let tail = start;
  const visited = new Set<string>([shape.id]);
  while (!visited.has(tail.id)) {
    visited.add(tail.id);
    const next = (tail.outgoing ?? []).find(
      // biome-ignore lint/suspicious/noExplicitAny: as above
      (flow: any) =>
        flow.target && !visited.has(flow.target.id) && flow.target.type !== "bpmn:EndEvent"
    );
    if (!next) break;
    tail = next.target;
  }

  const toEnd = (tail.outgoing ?? []).find(
    // biome-ignore lint/suspicious/noExplicitAny: as above
    (flow: any) => flow.target?.type === "bpmn:EndEvent"
  );
  if (toEnd) {
    const end = toEnd.target;
    modeling.removeConnection(toEnd);
    modeling.connect(tail, shape);
    modeling.connect(shape, end);
    return;
  }
  if (tail.id !== shape.id) modeling.connect(tail, shape);
}

const TASK_WIDTH = 110;
const TASK_HEIGHT = 80;
const STEP_GAP = 60;

/**
 * Lay the chain out left to right, in the order it runs.
 *
 * The diagram's job is to state the order, so the order is what decides the
 * positions — a step added at the end appears at the end, and the connections
 * are straight because everything shares a centre line. Anything not on the
 * chain is left where it is; someone who drew it there meant it.
 */
// biome-ignore lint/suspicious/noExplicitAny: bpmn-js services are untyped
function relayout(modeling: any, registry: any): void {
  // biome-ignore lint/suspicious/noExplicitAny: as above
  const start = registry.filter((element: any) => element.type === "bpmn:StartEvent")[0];
  if (!start) return;

  const chain: unknown[] = [];
  const seen = new Set<string>();
  // biome-ignore lint/suspicious/noExplicitAny: as above
  let cursor: any = start;
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    chain.push(cursor);
    // biome-ignore lint/suspicious/noExplicitAny: as above
    const next = (cursor.outgoing ?? []).find((flow: any) => flow.target);
    cursor = next?.target;
  }

  const centreY = 220;
  let x = 150;
  for (const node of chain) {
    // biome-ignore lint/suspicious/noExplicitAny: as above
    const element = node as any;
    const targetX = x;
    const targetY = centreY - element.height / 2;
    const dx = targetX - element.x;
    const dy = targetY - element.y;
    if (dx !== 0 || dy !== 0) modeling.moveElements([element], { x: dx, y: dy });
    x += element.width + STEP_GAP;
  }

  // Moving a shape keeps the waypoints its connections already had, so a link
  // drawn while its target was somewhere else stays bent — the last arrow
  // looped up and over the row it was meant to run along. `layoutConnection`
  // re-routes but still avoids the old path; since the layout above already
  // decided every position, the waypoints can just be stated.
  for (const node of chain) {
    // biome-ignore lint/suspicious/noExplicitAny: as above
    const source = node as any;
    // biome-ignore lint/suspicious/noExplicitAny: as above
    for (const flow of ((source.outgoing ?? []) as any[]).filter((f) => f.target)) {
      modeling.updateWaypoints(flow, [
        { x: source.x + source.width, y: centreY },
        { x: flow.target.x, y: centreY },
      ]);
    }
  }
}

/** Sensible starting properties, so a new step is never blank and invalid. */
function defaultsFor(type: StepType, firstTable: string): Record<string, string> {
  if (type === "Decision") return { decisionTable: serializeDecisionTable(emptyDecisionTable()) };
  if (type === "Formula") return { operation: "set", target: "", value: "" };
  if (type === "CreateEntity") return { entity: firstTable, fields: "{}" };
  if (type === "UpdateEntity") return { field: "", value: "" };
  if (type === "DeleteEntity") return { hard: "false" };
  return { method: "POST", url: "" };
}

export { consumedBy, publishedBy };
