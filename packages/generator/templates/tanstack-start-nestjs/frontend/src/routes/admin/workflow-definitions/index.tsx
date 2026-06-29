import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '../../../lib/api-client';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';

export const Route = createFileRoute('/admin/workflow-definitions/')({
  component: WorkflowDefinitionsList,
});

interface WfDef {
  id: string;
  name: string;
  entity_name: string;
  operation: string;
  is_active: boolean;
  description?: string;
  created_at: string;
}

function WorkflowDefinitionsList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterEntity, setFilterEntity] = useState('');

  const { data: defs = [], isLoading } = useQuery<WfDef[]>({
    queryKey: ['workflow-definitions'],
    queryFn: () => apiClient.get('/workflow-definitions'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/workflow-definitions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflow-definitions'] }),
  });

  const filtered = filterEntity
    ? defs.filter((d) => d.entity_name.toLowerCase().includes(filterEntity.toLowerCase()))
    : defs;

  const stats = {
    total: defs.length,
    active: defs.filter((d) => d.is_active).length,
    entities: Array.from(new Set(defs.map((d) => d.entity_name))).length,
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Designer</h1>
          <p className="text-sm text-gray-500 mt-1">
            Visual BPMN action graphs that run after GoRules decisions
          </p>
        </div>
        <Button onClick={() => navigate({ to: '/admin/workflow-definitions/new' })}>
          + New Workflow
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-gray-500">Total workflows</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-xs text-gray-500">Active</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold">{stats.entities}</div>
          <div className="text-xs text-gray-500">Entities covered</div>
        </CardContent></Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <input
          className="border rounded px-3 py-1.5 text-sm w-64"
          placeholder="Filter by entity..."
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No workflow definitions yet.{' '}
          <Link to="/admin/workflow-definitions/new" className="text-teal-600 underline">
            Create one
          </Link>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Entity</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Operation</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        to="/admin/workflow-definitions/$id/edit"
                        params={{ id: d.id }}
                        className="text-teal-700 hover:underline"
                      >
                        {d.name}
                      </Link>
                      {d.description && (
                        <div className="text-xs text-gray-400 mt-0.5">{d.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{d.entity_name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">{d.operation}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={d.is_active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500'}>
                        {d.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate({ to: '/admin/workflow-definitions/$id/edit', params: { id: d.id } })}
                        >
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete workflow?</AlertDialogTitle>
                              <AlertDialogDescription>
                                "{d.name}" will be permanently removed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => deleteMutation.mutate(d.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
