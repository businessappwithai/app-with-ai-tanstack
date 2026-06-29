import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useRef, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Switch } from '../../../components/ui/switch';
import BpmnCanvas from '../../../components/admin/bpmn-canvas';
import type { BpmnCanvasHandle } from '../../../components/admin/bpmn-canvas';

export const Route = createFileRoute('/admin/workflow-definitions/$id/edit')({
  component: EditWorkflowDefinition,
});

const OPERATIONS = ['ALL', 'CREATE', 'UPDATE', 'DELETE'] as const;

function EditWorkflowDefinition() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canvasRef = useRef<BpmnCanvasHandle>(null);

  const [name, setName] = useState('');
  const [entityName, setEntityName] = useState('');
  const [operation, setOperation] = useState<'ALL' | 'CREATE' | 'UPDATE' | 'DELETE'>('ALL');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [xmlLoaded, setXmlLoaded] = useState(false);

  const { data: tables = [] } = useQuery<any[]>({
    queryKey: ['sys-tables'],
    queryFn: async () => {
      const res = await apiClient.get('/sys/tables?prefix=bus_');
      return Array.isArray(res) ? res : ((res as any)?.data ?? []);
    },
  });

  const { data: def, isLoading } = useQuery<any>({
    queryKey: ['workflow-definition', id],
    queryFn: () => apiClient.get(`/workflow-definitions/${id}`),
  });

  // Populate form once def loads
  useEffect(() => {
    if (!def) return;
    setName(def.name ?? '');
    setEntityName(def.entity_name ?? '');
    setOperation(def.operation ?? 'ALL');
    setDescription(def.description ?? '');
    setIsActive(def.is_active ?? true);
  }, [def]);

  // Load BPMN XML into canvas once canvas and def are ready
  useEffect(() => {
    if (!def?.bpmn_xml || !canvasRef.current || xmlLoaded) return;
    canvasRef.current.importXml(def.bpmn_xml).then(() => setXmlLoaded(true));
  }, [def, xmlLoaded]);

  const updateMutation = useMutation({
    mutationFn: async (dto: any) => apiClient.put(`/workflow-definitions/${id}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-definition', id] });
      navigate({ to: '/admin/workflow-definitions' });
    },
    onError: (err: any) => setError(err.message ?? 'Save failed'),
  });

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) return setError('Name is required');
    if (!canvasRef.current) return setError('Canvas not ready');

    try {
      const bpmnXml = await canvasRef.current.getXml();
      updateMutation.mutate({ name, entityName, operation, bpmnXml, description, isActive });
    } catch (e: any) {
      setError(e.message ?? 'Failed to export BPMN');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen text-gray-400">Loading…</div>;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-4 px-4 py-3 border-b bg-white shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/admin/workflow-definitions/' })}>
          ← Back
        </Button>
        <h1 className="font-semibold text-gray-800">Edit Workflow Definition</h1>
        <div className="flex items-center gap-2 ml-4">
          <Switch checked={isActive} onCheckedChange={setIsActive} id="is-active" />
          <Label htmlFor="is-active" className="text-xs text-gray-600">Active</Label>
        </div>
        <div className="flex-1" />
        {error && <span className="text-xs text-red-600">{error}</span>}
        <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>

      {/* Metadata bar */}
      <div className="flex items-end gap-4 px-4 py-3 border-b bg-gray-50">
        <div className="space-y-1">
          <Label className="text-xs text-gray-600">Name *</Label>
          <Input className="h-8 text-sm w-56" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-600">Entity</Label>
          <Select value={entityName} onValueChange={setEntityName}>
            <SelectTrigger className="h-8 text-sm w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {tables.map((t: any) => (
                <SelectItem key={t.name ?? t.table_name} value={t.name ?? t.table_name} className="text-xs">
                  {t.name ?? t.table_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-600">Trigger on</Label>
          <Select value={operation} onValueChange={(v: any) => setOperation(v)}>
            <SelectTrigger className="h-8 text-sm w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {OPERATIONS.map((o) => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1">
          <Label className="text-xs text-gray-600">Description</Label>
          <Input className="h-8 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 p-4 min-h-0">
        <BpmnCanvas
          ref={canvasRef}
          className="h-full"
        />
      </div>
    </div>
  );
}
