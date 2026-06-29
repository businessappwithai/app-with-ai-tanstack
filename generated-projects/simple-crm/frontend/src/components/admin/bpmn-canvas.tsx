/**
 * BpmnCanvas — bpmn-js modeler wrapper for React
 *
 * Mounts bpmn-js imperatively on a div ref, exposes getXml/importXml
 * via useImperativeHandle, and renders a sidebar properties panel
 * when a ServiceTask is selected.
 *
 * Custom node type encoding:
 *   extensionElements > erdwithai:properties > erdwithai:property[@name, text]
 */

import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useState,
  useCallback,
} from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';

// bpmn-js types (runtime import)
type BpmnModelerInstance = any;

export interface BpmnCanvasHandle {
  getXml: () => Promise<string>;
  importXml: (xml: string) => Promise<void>;
}

interface SelectedTask {
  id: string;
  name: string;
  nodeType: string;
  properties: Record<string, string>;
}

const NODE_TYPES = ['UpdateEntity', 'CreateEntity', 'Formula', 'REST', 'Agent'] as const;
type NodeType = typeof NODE_TYPES[number];

const NODE_TYPE_ICONS: Record<NodeType, string> = {
  UpdateEntity: '✏️',
  CreateEntity: '➕',
  Formula: '🔢',
  REST: '🌐',
  Agent: '🤖',
};

const NODE_TYPE_DESC: Record<NodeType, string> = {
  UpdateEntity: 'Update a field on an entity record',
  CreateEntity: 'Insert a new entity record',
  Formula: 'Compute a value and store in vars',
  REST: 'Call an external HTTP endpoint',
  Agent: 'Invoke an AI agent (placeholder)',
};

const EMPTY_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
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
        <dc:Bounds x="172" y="82" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="432" y="82" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_end_di" bpmnElement="Flow_end">
        <di:waypoint x="208" y="100"/>
        <di:waypoint x="432" y="100"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

// Read erdwithai:property elements from a business object
function readProperties(element: any): Record<string, string> {
  const props: Record<string, string> = {};
  const exts = element?.businessObject?.extensionElements?.values ?? [];
  for (const ext of exts) {
    if (ext.$type === 'erdwithai:Properties') {
      for (const p of ext.values ?? []) {
        if (p.name) props[p.name] = p.value ?? '';
      }
    }
  }
  return props;
}

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Help scenarios ────────────────────────────────────────────────────────────

interface ScenarioExample {
  title: string;
  description: string;
  nodeType: NodeType;
  props: Record<string, string>;
}

const HELP_SCENARIOS: ScenarioExample[] = [
  // UpdateEntity
  { nodeType: 'UpdateEntity', title: 'Qualify a Lead',
    description: 'When a lead is saved, set its status to Qualified. Leave entity blank to update the triggering record.',
    props: { field: 'status', value: 'Qualified' } },
  { nodeType: 'UpdateEntity', title: 'Mark Opportunity as Won',
    description: 'Update a related opportunity\'s stage to Won using the same record ID.',
    props: { entity: 'bus_opportunity', field: 'stage', value: 'Won' } },
  { nodeType: 'UpdateEntity', title: 'Write computed score to notes',
    description: 'After a Formula node stores lead_score in vars, write it to the notes field.',
    props: { field: 'notes', source: 'lead_score' } },
  // CreateEntity
  { nodeType: 'CreateEntity', title: 'Create Follow-up Call activity',
    description: 'Insert a new bus_activity row each time a lead is saved.',
    props: { entity: 'bus_activity', fields: '{"type":"Call","subject":"Follow up","status":"Planned"}' } },
  { nodeType: 'CreateEntity', title: 'Create a Contact from Lead data',
    description: 'Auto-create a contact record using {{name}} / {{email}} template keys.',
    props: { entity: 'bus_contact', fields: '{"name":"{{name}}","email":"{{email}}"}' } },
  // Formula
  { nodeType: 'Formula', title: 'Lead score = version × 10',
    description: 'Multiply the version field by 10 and store the result in lead_score for use by the next node.',
    props: { source: 'version', operation: 'multiply', operand: '10', target: 'lead_score' } },
  { nodeType: 'Formula', title: 'Discount % = amount ÷ 100',
    description: 'Divide the amount field by 100 and store the result in discount_pct.',
    props: { source: 'amount', operation: 'divide', operand: '100', target: 'discount_pct' } },
  // REST
  { nodeType: 'REST', title: 'Notify webhook on Lead save',
    description: 'POST lead id, name and status to an external webhook URL each time a lead is saved.',
    props: { method: 'POST', url: 'https://hooks.example.com/crm-lead', bodyTemplate: '{"id":"{{id}}","name":"{{name}}","status":"{{status}}"}' } },
  { nodeType: 'REST', title: 'Sync to external CRM',
    description: 'Push lead details to a third-party CRM via their REST API.',
    props: { method: 'POST', url: 'https://api.yourcrm.com/leads', bodyTemplate: '{"leadId":"{{id}}","company":"{{name}}","contact":"{{email}}"}' } },
  // Agent
  { nodeType: 'Agent', title: 'AI Lead Qualifier',
    description: 'Invoke a Mastra AI agent to automatically score and qualify the lead.',
    props: { agentId: 'lead-qualifier-v1' } },
  { nodeType: 'Agent', title: 'AI Follow-up Drafter',
    description: 'Generate a personalised follow-up email draft via an AI agent.',
    props: { agentId: 'followup-drafter-v1' } },
];

// ── Dictionary hooks ──────────────────────────────────────────────────────────

interface TableRow { table_name: string; name: string }
interface ColumnRow { column_name: string; name: string }

function useBusTables(): TableRow[] {
  const [tables, setTables] = useState<TableRow[]>([]);
  useEffect(() => {
    fetch('/api/sys/tables?limit=200', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        const rows = (Array.isArray(d) ? d : d?.data ?? []) as any[];
        setTables(
          rows
            .filter((t) => t.table_name?.startsWith('bus_'))
            .map((t) => ({ table_name: t.table_name, name: t.name || t.table_name })),
        );
      })
      .catch(() => {});
  }, []);
  return tables;
}

const SKIP_COLS = new Set([
  'id', 'created_at', 'updated_at', 'deleted_at', 'version',
  'workflow_status', 'workflow_run_id', 'doc_status', 'doc_status_message', 'is_active',
]);

function useBusColumns(tableName: string): ColumnRow[] {
  const [columns, setColumns] = useState<ColumnRow[]>([]);
  useEffect(() => {
    if (!tableName) { setColumns([]); return; }
    fetch(`/api/sys/columns/direct?tableName=${encodeURIComponent(tableName)}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        const rows = (Array.isArray(d) ? d : d?.data ?? []) as any[];
        setColumns(
          rows
            .filter((c) => !SKIP_COLS.has(c.column_name))
            .map((c) => ({ column_name: c.column_name, name: c.name || c.column_name })),
        );
      })
      .catch(() => {});
  }, [tableName]);
  return columns;
}

// ── Main component ────────────────────────────────────────────────────────────

const BpmnCanvas = forwardRef<BpmnCanvasHandle, { className?: string }>(
  ({ className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const modelerRef = useRef<BpmnModelerInstance>(null);
    const pendingXmlRef = useRef<string | null>(null);
    const pendingScenarioRef = useRef<ScenarioExample | null>(null);
    const [selected, setSelected] = useState<SelectedTask | null>(null);
    const [localProps, setLocalProps] = useState<Record<string, string>>({});
    const [localNodeType, setLocalNodeType] = useState<NodeType>('UpdateEntity');
    const [importError, setImportError] = useState<string | null>(null);
    const [helpOpen, setHelpOpen] = useState(false);

    // Mount bpmn-js modeler
    useEffect(() => {
      let modeler: BpmnModelerInstance;

      (async () => {
        const { default: BpmnModeler } = await import('bpmn-js/lib/Modeler');

        modeler = new BpmnModeler({
          container: containerRef.current!,
          additionalModules: [],
          moddleExtensions: {
            erdwithai: {
              name: 'ERDwithAI',
              uri: 'http://erdwithai.io/schema/1.0',
              prefix: 'erdwithai',
              xml: { tagAlias: 'lowerCase' },
              types: [
                {
                  name: 'Properties',
                  superClass: ['Element'],
                  meta: { allowedIn: ['bpmn:BaseElement'] },
                  properties: [
                    { name: 'values', type: 'Property', isMany: true, isBody: false },
                  ],
                },
                {
                  name: 'Property',
                  superClass: ['Element'],
                  properties: [
                    { name: 'name', isAttr: true, type: 'String' },
                    { name: 'value', isAttr: true, type: 'String' },
                  ],
                },
              ],
            },
          },
        });

        modelerRef.current = modeler;

        const xmlToLoad = pendingXmlRef.current ?? EMPTY_BPMN;
        pendingXmlRef.current = null;
        try {
          await modeler.importXML(xmlToLoad);
        } catch (e) {
          console.error('BPMN import error', e);
        }

        const eventBus = modeler.get('eventBus');
        eventBus.on('selection.changed', ({ newSelection }: any) => {
          const el = newSelection[0];
          if (el?.type === 'bpmn:ServiceTask') {
            const existingProps = readProperties(el);
            const nodeType = (existingProps.nodeType as NodeType) ?? 'UpdateEntity';
            const { nodeType: _nt, ...rest } = existingProps;
            setSelected({ id: el.id, name: el.businessObject.name ?? '', nodeType, properties: rest });
            // If a scenario was queued (from load in empty state), apply it now
            if (pendingScenarioRef.current) {
              const s = pendingScenarioRef.current;
              pendingScenarioRef.current = null;
              setLocalNodeType(s.nodeType);
              setLocalProps(s.props);
            } else {
              setLocalNodeType(nodeType);
              setLocalProps(rest);
            }
          } else {
            setSelected(null);
          }
        });
      })();

      return () => { modeler?.destroy(); };
    }, []);

    const getXml = useCallback(async (): Promise<string> => {
      if (!modelerRef.current) throw new Error('Modeler not initialized');
      const { xml } = await modelerRef.current.saveXML({ format: true });
      return xml;
    }, []);

    const importXml = useCallback(async (xml: string): Promise<void> => {
      if (!modelerRef.current) {
        pendingXmlRef.current = xml;
        return;
      }
      setImportError(null);
      try {
        await modelerRef.current.importXML(xml);
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        setImportError(msg);
        console.error('BPMN import error', e);
      }
    }, []);

    useImperativeHandle(ref, () => ({ getXml, importXml }), [getXml, importXml]);

    // Programmatically add a ServiceTask node to the diagram
    const addNodeType = useCallback((nodeType: NodeType) => {
      const modeler = modelerRef.current;
      if (!modeler) return;

      const modeling = modeler.get('modeling');
      const elementRegistry = modeler.get('elementRegistry');
      const moddle = modeler.get('moddle');
      const canvas = modeler.get('canvas');
      const rootElement = canvas.getRootElement();

      // Position: after the rightmost existing ServiceTask, or at x=300
      const existingTasks = elementRegistry.filter((el: any) => el.type === 'bpmn:ServiceTask');
      const lastX = existingTasks.reduce(
        (max: number, s: any) => Math.max(max, (s.x ?? 0) + (s.width ?? 100)),
        200,
      );
      const x = lastX + 40;
      const y = 60;

      // Create the shape
      const taskShape = modeling.createShape(
        { type: 'bpmn:ServiceTask' },
        { x, y, width: 100, height: 80 },
        rootElement,
      );

      // Pre-set the nodeType property
      const propObjects = [moddle.create('erdwithai:Property', { name: 'nodeType', value: nodeType })];
      const propsContainer = moddle.create('erdwithai:Properties', { values: propObjects });
      const extensionElements = moddle.create('bpmn:ExtensionElements', { values: [propsContainer] });
      modeling.updateProperties(taskShape, { name: nodeType, extensionElements });

      // Select it so the properties panel opens, then fit viewport so it's visible
      modeler.get('selection').select(taskShape);
      setTimeout(() => canvas.zoom('fit-viewport', 'auto'), 50);
    }, []);

    const loadScenario = useCallback((scenario: ScenarioExample) => {
      setHelpOpen(false);
      if (selected) {
        setLocalNodeType(scenario.nodeType);
        setLocalProps(scenario.props);
      } else {
        pendingScenarioRef.current = scenario;
        addNodeType(scenario.nodeType);
      }
    }, [selected, addNodeType]);

    // Apply edited properties back to the selected diagram element
    const applyProperties = useCallback(() => {
      if (!selected || !modelerRef.current) return;

      const modeling = modelerRef.current.get('modeling');
      const elementRegistry = modelerRef.current.get('elementRegistry');
      const moddle = modelerRef.current.get('moddle');
      const element = elementRegistry.get(selected.id);
      if (!element) return;

      const allProps = { nodeType: localNodeType, ...localProps };
      const propObjects = Object.entries(allProps).map(([k, v]) =>
        moddle.create('erdwithai:Property', { name: k, value: v }),
      );

      const propsContainer = moddle.create('erdwithai:Properties', { values: propObjects });
      const extensionElements = moddle.create('bpmn:ExtensionElements', { values: [propsContainer] });

      modeling.updateProperties(element, {
        name: localProps.name || selected.name || localNodeType,
        extensionElements,
      });

      setSelected((prev) => prev ? { ...prev, nodeType: localNodeType, properties: localProps } : prev);
    }, [selected, localNodeType, localProps]);

    return (
      <div className={`flex gap-4 h-full ${className ?? ''}`}>
        {/* BPMN canvas */}
        <div className="flex-1 relative border rounded-lg overflow-hidden bg-white">
          <div ref={containerRef} className="w-full h-full" />
          {importError && (
            <div className="absolute top-2 left-2 right-2 bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
              {importError}
            </div>
          )}
          <div className="absolute bottom-2 left-2 text-xs text-gray-400 pointer-events-none">
            Click a node button → or drag ServiceTask from palette → connect with arrows → select to configure
          </div>
        </div>

        {/* Properties / node palette panel */}
        <div className="w-72 flex-shrink-0 border rounded-lg bg-gray-50 overflow-y-auto flex flex-col relative">
          <HelpDrawer
            open={helpOpen}
            onClose={() => setHelpOpen(false)}
            onLoad={loadScenario}
            currentNodeType={selected ? localNodeType : undefined}
          />
          {selected ? (
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{selected.id}</Badge>
                <span className="text-sm font-medium truncate flex-1">{selected.name || 'ServiceTask'}</span>
                <button
                  type="button"
                  onClick={() => setHelpOpen(true)}
                  className="text-[10px] px-1.5 py-0.5 rounded border border-gray-300 text-gray-500 hover:border-teal-400 hover:text-teal-600 transition-colors whitespace-nowrap"
                  title="View workflow examples"
                >
                  ? Help
                </button>
              </div>
              <Separator />

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-600">NODE TYPE</Label>
                <Select value={localNodeType} onValueChange={(v) => {
                  setLocalNodeType(v as NodeType);
                  setLocalProps({});
                }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NODE_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {NODE_TYPE_ICONS[t]} {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">{NODE_TYPE_DESC[localNodeType]}</p>
              </div>

              <Separator />
              <PropertyFields
                nodeType={localNodeType}
                props={localProps}
                onChange={setLocalProps}
              />

              <Button size="sm" className="w-full" onClick={applyProperties}>
                Apply to Diagram
              </Button>
            </div>
          ) : (
            <div className="p-4 flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-gray-500">Add a node to the diagram:</div>
                <button
                  type="button"
                  onClick={() => setHelpOpen(true)}
                  className="text-[10px] px-1.5 py-0.5 rounded border border-gray-300 text-gray-500 hover:border-teal-400 hover:text-teal-600 transition-colors"
                  title="View workflow examples"
                >
                  ? Help
                </button>
              </div>
              <div className="space-y-1.5">
                {NODE_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addNodeType(t)}
                    className="w-full text-left text-xs px-3 py-2 rounded-md bg-white border border-gray-200 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700 transition-colors flex items-start gap-2 shadow-sm"
                  >
                    <span className="mt-px">{NODE_TYPE_ICONS[t]}</span>
                    <span>
                      <span className="font-medium">{t}</span>
                      <span className="block text-gray-400 text-[10px] leading-tight mt-0.5">{NODE_TYPE_DESC[t]}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-auto pt-4 text-[10px] text-gray-400 text-center">
                Or drag from the bpmn palette • Select a task to configure
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

BpmnCanvas.displayName = 'BpmnCanvas';
export default BpmnCanvas;

// ── Property fields per node type ──────────────────────────────────────────

function PropertyFields({
  nodeType,
  props,
  onChange,
}: {
  nodeType: NodeType;
  props: Record<string, string>;
  onChange: (p: Record<string, string>) => void;
}) {
  const set = (k: string, v: string) => onChange({ ...props, [k]: v });

  const tables = useBusTables();
  const entityValue = props['entity'] ?? '';
  const columns = useBusColumns(entityValue);

  // Shared entity picker (used by UpdateEntity + CreateEntity)
  const EntitySelect = ({ label = 'Entity table' }: { label?: string }) => (
    <div className="space-y-1">
      <Label className="text-xs text-gray-600">{label}</Label>
      {tables.length > 0 ? (
        <Select value={entityValue} onValueChange={(v) => set('entity', v)}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Select entity…" />
          </SelectTrigger>
          <SelectContent>
            {tables.map((t) => (
              <SelectItem key={t.table_name} value={t.table_name} className="text-xs">
                {t.name} <span className="text-gray-400 ml-1">({t.table_name})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          className="h-7 text-xs"
          value={entityValue}
          placeholder="bus_account"
          onChange={(e) => set('entity', e.target.value)}
        />
      )}
    </div>
  );

  // Field picker — populates from columns of the selected entity
  const FieldSelect = ({ label = 'Field to update', propKey = 'field' }: { label?: string; propKey?: string }) => (
    <div className="space-y-1">
      <Label className="text-xs text-gray-600">{label}</Label>
      {columns.length > 0 ? (
        <Select value={props[propKey] ?? ''} onValueChange={(v) => set(propKey, v)}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Select field…" />
          </SelectTrigger>
          <SelectContent>
            {columns.map((c) => (
              <SelectItem key={c.column_name} value={c.column_name} className="text-xs">
                {c.name} <span className="text-gray-400 ml-1">({c.column_name})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          className="h-7 text-xs"
          value={props[propKey] ?? ''}
          placeholder={entityValue ? 'Loading columns…' : 'Select entity first'}
          onChange={(e) => set(propKey, e.target.value)}
        />
      )}
    </div>
  );

  const TextField = ({ label, k, placeholder }: { label: string; k: string; placeholder?: string }) => (
    <div className="space-y-1">
      <Label className="text-xs text-gray-600">{label}</Label>
      <Input
        className="h-7 text-xs"
        value={props[k] ?? ''}
        placeholder={placeholder}
        onChange={(e) => set(k, e.target.value)}
      />
    </div>
  );

  if (nodeType === 'UpdateEntity') {
    return (
      <div className="space-y-3">
        <EntitySelect label="Entity table (blank = triggering entity)" />
        <FieldSelect label="Field to update" propKey="field" />
        <TextField label="Source key from decision/vars context" k="source" placeholder="lead_score" />
        <TextField label="Literal value (if no source)" k="value" placeholder="Qualified" />
      </div>
    );
  }

  if (nodeType === 'CreateEntity') {
    return (
      <div className="space-y-3">
        <EntitySelect label="Entity table to insert into" />
        <CreateEntityFields
          tableName={entityValue}
          columns={columns}
          value={props['fields'] ?? ''}
          onChange={(v) => set('fields', v)}
        />
      </div>
    );
  }

  if (nodeType === 'Formula') {
    return (
      <div className="space-y-3">
        <TextField label="Target variable name" k="target" placeholder="lead_score" />
        <TextField label="Source key (number from entityData/vars)" k="source" placeholder="version" />
        <div className="space-y-1">
          <Label className="text-xs text-gray-600">Operation</Label>
          <Select value={props['operation'] ?? 'multiply'} onValueChange={(v) => set('operation', v)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['multiply', 'divide', 'add', 'subtract'].map((o) => (
                <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <TextField label="Operand" k="operand" placeholder="10" />
      </div>
    );
  }

  if (nodeType === 'REST') {
    return (
      <div className="space-y-3">
        <TextField label="URL" k="url" placeholder="https://hooks.example.com/notify" />
        <div className="space-y-1">
          <Label className="text-xs text-gray-600">Method</Label>
          <Select value={props['method'] ?? 'POST'} onValueChange={(v) => set('method', v)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['POST', 'PUT', 'PATCH', 'GET'].map((m) => (
                <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-600">Body template (use {'{{key}}'})</Label>
          <textarea
            className="w-full h-20 text-xs border rounded p-1 font-mono resize-none"
            value={props['bodyTemplate'] ?? ''}
            placeholder={'{"id":"{{id}}","name":"{{name}}"}'}
            onChange={(e) => set('bodyTemplate', e.target.value)}
          />
        </div>
      </div>
    );
  }

  if (nodeType === 'Agent') {
    return (
      <div className="space-y-3">
        <TextField label="Agent ID" k="agentId" placeholder="my-mastra-agent" />
        <p className="text-xs text-amber-600">Agent invocation is currently a placeholder pending Mastra integration.</p>
      </div>
    );
  }

  return null;
}

// ── CreateEntity field-map builder ────────────────────────────────────────────

interface FieldRow { field: string; source: string }

function parseFieldsJson(json: string): FieldRow[] {
  try {
    const obj = JSON.parse(json || '{}') as Record<string, string>;
    return Object.entries(obj).map(([field, source]) => ({ field, source }));
  } catch {
    return [];
  }
}

function serializeRows(rows: FieldRow[]): string {
  const obj: Record<string, string> = {};
  for (const r of rows) {
    if (r.field) obj[r.field] = r.source;
  }
  return JSON.stringify(obj, null, 2);
}

function CreateEntityFields({
  tableName,
  columns,
  value,
  onChange,
}: {
  tableName: string;
  columns: ColumnRow[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [rows, setRows] = useState<FieldRow[]>(() => parseFieldsJson(value) || [{ field: '', source: '' }]);
  const [showRaw, setShowRaw] = useState(false);

  const updateRows = (next: FieldRow[]) => {
    setRows(next);
    onChange(serializeRows(next));
  };

  const addRow = () => updateRows([...rows, { field: '', source: '' }]);
  const removeRow = (i: number) => updateRows(rows.filter((_, idx) => idx !== i));
  const setRow = (i: number, patch: Partial<FieldRow>) =>
    updateRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-gray-600">Fields to set</Label>
        <button
          type="button"
          className="text-[10px] text-gray-400 hover:text-gray-600"
          onClick={() => setShowRaw((v) => !v)}
        >
          {showRaw ? 'Builder' : 'Raw JSON'}
        </button>
      </div>

      {showRaw ? (
        <textarea
          className="w-full h-24 text-xs border rounded p-1 font-mono resize-none"
          value={value}
          placeholder={'{\n  "status": "Active",\n  "type": "Call"\n}'}
          onChange={(e) => {
            onChange(e.target.value);
            setRows(parseFieldsJson(e.target.value));
          }}
        />
      ) : (
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-400 px-1">
            <span>Column</span><span>Value / source key</span>
          </div>
          {rows.map((row, i) => (
            <div key={i} className="flex gap-1 items-center">
              {columns.length > 0 ? (
                <Select value={row.field} onValueChange={(v) => setRow(i, { field: v })}>
                  <SelectTrigger className="h-6 text-xs flex-1 min-w-0">
                    <SelectValue placeholder="column…" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((c) => (
                      <SelectItem key={c.column_name} value={c.column_name} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-6 text-xs flex-1 min-w-0"
                  value={row.field}
                  placeholder="column"
                  onChange={(e) => setRow(i, { field: e.target.value })}
                />
              )}
              <Input
                className="h-6 text-xs flex-1 min-w-0"
                value={row.source}
                placeholder="value or key"
                onChange={(e) => setRow(i, { source: e.target.value })}
              />
              <button
                type="button"
                className="text-gray-300 hover:text-red-400 text-xs px-0.5"
                onClick={() => removeRow(i)}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-xs text-teal-600 hover:text-teal-800 mt-1"
            onClick={addRow}
          >
            + Add field
          </button>
        </div>
      )}
    </div>
  );
}

// ── Help Drawer ───────────────────────────────────────────────────────────────

function HelpDrawer({
  open,
  onClose,
  onLoad,
  currentNodeType,
}: {
  open: boolean;
  onClose: () => void;
  onLoad: (s: ScenarioExample) => void;
  currentNodeType?: NodeType;
}) {
  if (!open) return null;

  const grouped = NODE_TYPES.reduce<Record<string, ScenarioExample[]>>((acc, t) => {
    acc[t] = HELP_SCENARIOS.filter((s) => s.nodeType === t && (!currentNodeType || s.nodeType === currentNodeType));
    return acc;
  }, {} as Record<string, ScenarioExample[]>);

  return (
    <div className="absolute inset-0 bg-white z-20 flex flex-col rounded-lg border border-teal-200 shadow-xl">
      <div className="flex items-center justify-between px-3 py-2.5 border-b bg-teal-50 rounded-t-lg">
        <span className="text-sm font-semibold text-teal-800">📖 Workflow Examples</span>
        <button
          type="button"
          onClick={onClose}
          className="text-teal-500 hover:text-teal-800 text-base leading-none px-1"
        >
          ✕
        </button>
      </div>
      <div className="overflow-y-auto flex-1 p-3 space-y-5">
        {currentNodeType && (
          <p className="text-[10px] text-gray-400 italic">
            Showing examples for <strong>{currentNodeType}</strong> — change node type to see others.
          </p>
        )}
        {NODE_TYPES.map((t) => {
          const scenarios = grouped[t];
          if (!scenarios?.length) return null;
          return (
            <div key={t}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">{NODE_TYPE_ICONS[t]}</span>
                <span className="text-xs font-semibold text-gray-700">{t}</span>
              </div>
              <div className="space-y-2">
                {scenarios.map((s) => (
                  <div key={s.title} className="bg-gray-50 rounded-md p-2.5 border border-gray-100 hover:border-teal-200 transition-colors">
                    <div className="text-xs font-medium text-gray-800 mb-0.5">{s.title}</div>
                    <div className="text-[10px] text-gray-500 mb-2 leading-relaxed">{s.description}</div>
                    <button
                      type="button"
                      onClick={() => onLoad(s)}
                      className="text-[10px] px-2 py-0.5 rounded bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                    >
                      Load →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-3 py-2 border-t text-[10px] text-gray-400 text-center rounded-b-lg bg-gray-50">
        After loading, click <strong>Apply to Diagram</strong> to save changes to the canvas
      </div>
    </div>
  );
}
