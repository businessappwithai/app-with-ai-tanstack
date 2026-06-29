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

// Build BPMN XML extensionElements snippet for a ServiceTask
function buildExtensionXml(nodeType: string, properties: Record<string, string>): string {
  const allProps = { nodeType, ...properties };
  const propXml = Object.entries(allProps)
    .map(([k, v]) => `      <erdwithai:property name="${k}">${escapeXml(String(v))}</erdwithai:property>`)
    .join('\n');
  return `    <bpmn:extensionElements>
      <erdwithai:properties>
${propXml}
      </erdwithai:properties>
    </bpmn:extensionElements>`;
}

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const BpmnCanvas = forwardRef<BpmnCanvasHandle, { className?: string }>(
  ({ className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const modelerRef = useRef<BpmnModelerInstance>(null);
    const pendingXmlRef = useRef<string | null>(null);
    const [selected, setSelected] = useState<SelectedTask | null>(null);
    const [localProps, setLocalProps] = useState<Record<string, string>>({});
    const [localNodeType, setLocalNodeType] = useState<NodeType>('UpdateEntity');
    const [importError, setImportError] = useState<string | null>(null);

    // Mount bpmn-js modeler
    useEffect(() => {
      let modeler: BpmnModelerInstance;

      (async () => {
        // Dynamic import to avoid SSR issues
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

        // Load pending XML if importXml was called before modeler was ready, else load empty diagram
        const xmlToLoad = pendingXmlRef.current ?? EMPTY_BPMN;
        pendingXmlRef.current = null;
        try {
          await modeler.importXML(xmlToLoad);
        } catch (e) {
          console.error('BPMN import error', e);
        }

        // Listen for selection changes
        const eventBus = modeler.get('eventBus');
        eventBus.on('selection.changed', ({ newSelection }: any) => {
          const el = newSelection[0];
          if (el?.type === 'bpmn:ServiceTask') {
            const existingProps = readProperties(el);
            const nodeType = (existingProps.nodeType as NodeType) ?? 'UpdateEntity';
            const { nodeType: _nt, ...rest } = existingProps;
            setSelected({ id: el.id, name: el.businessObject.name ?? '', nodeType, properties: rest });
            setLocalNodeType(nodeType);
            setLocalProps(rest);
          } else {
            setSelected(null);
          }
        });
      })();

      return () => {
        modeler?.destroy();
      };
    }, []);

    const getXml = useCallback(async (): Promise<string> => {
      if (!modelerRef.current) throw new Error('Modeler not initialized');
      const { xml } = await modelerRef.current.saveXML({ format: true });
      return xml;
    }, []);

    const importXml = useCallback(async (xml: string): Promise<void> => {
      if (!modelerRef.current) {
        // Modeler not ready yet — queue the XML to be loaded after initialization
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

    // Apply properties to the selected element in the diagram
    const applyProperties = useCallback(() => {
      if (!selected || !modelerRef.current) return;

      const modeling = modelerRef.current.get('modeling');
      const elementRegistry = modelerRef.current.get('elementRegistry');
      const moddle = modelerRef.current.get('moddle');
      const element = elementRegistry.get(selected.id);
      if (!element) return;

      // Build erdwithai:Property objects
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
            Drag ServiceTask from the palette • Connect with arrows • Select a task to configure
          </div>
        </div>

        {/* Properties panel */}
        <div className="w-72 flex-shrink-0 border rounded-lg p-4 bg-gray-50 overflow-y-auto">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{selected.id}</Badge>
                <span className="text-sm font-medium truncate">{selected.name || 'ServiceTask'}</span>
              </div>
              <Separator />

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-600">NODE TYPE</Label>
                <Select value={localNodeType} onValueChange={(v) => setLocalNodeType(v as NodeType)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NODE_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <div className="text-center text-sm text-gray-400 mt-8">
              <div className="text-2xl mb-2">☐</div>
              Select a <strong>Service Task</strong> in the diagram to configure its node type and properties.
              <div className="mt-4 text-xs text-left space-y-1">
                <div className="font-semibold text-gray-500">Available node types:</div>
                {NODE_TYPES.map((t) => (
                  <div key={t} className="pl-2 text-gray-400">• {t}</div>
                ))}
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

  const Field = ({ label, k, placeholder }: { label: string; k: string; placeholder?: string }) => (
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
        <Field label="Entity table (e.g. bus_account)" k="entity" placeholder="bus_account" />
        <Field label="Field to update" k="field" placeholder="discount" />
        <Field label="Source key from decision context" k="source" placeholder="Discount" />
        <Field label="Literal value (if no source)" k="value" placeholder="0" />
      </div>
    );
  }

  if (nodeType === 'CreateEntity') {
    return (
      <div className="space-y-3">
        <Field label="Entity table" k="entity" placeholder="bus_activity" />
        <div className="space-y-1">
          <Label className="text-xs text-gray-600">Fields (JSON map of field → source key)</Label>
          <textarea
            className="w-full h-24 text-xs border rounded p-1 font-mono resize-none"
            value={props['fields'] ?? ''}
            placeholder={'{\n  "description": "entityId",\n  "type": "email"\n}'}
            onChange={(e) => set('fields', e.target.value)}
          />
        </div>
      </div>
    );
  }

  if (nodeType === 'Formula') {
    return (
      <div className="space-y-3">
        <Field label="Target variable name" k="target" placeholder="discountedTotal" />
        <Field label="Source key (number)" k="source" placeholder="Total" />
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
        <Field label="Operand" k="operand" placeholder="0.85" />
      </div>
    );
  }

  if (nodeType === 'REST') {
    return (
      <div className="space-y-3">
        <Field label="URL" k="url" placeholder="https://hooks.example.com/notify" />
        <div className="space-y-1">
          <Label className="text-xs text-gray-600">Method</Label>
          <Select value={props['method'] ?? 'POST'} onValueChange={(v) => set('method', v)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['POST', 'PUT', 'PATCH'].map((m) => (
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
            placeholder={'{"id":"{{entityId}}","discount":"{{Discount}}"}'}
            onChange={(e) => set('bodyTemplate', e.target.value)}
          />
        </div>
      </div>
    );
  }

  if (nodeType === 'Agent') {
    return (
      <div className="space-y-3">
        <Field label="Agent ID" k="agentId" placeholder="my-agent" />
        <p className="text-xs text-amber-600">Agent invocation is currently a no-op placeholder pending Mastra integration.</p>
      </div>
    );
  }

  return null;
}
