/**
 * Table Detail Page - Compiere Application Dictionary
 *
 * Swiss Clean Design - Editorial layout with minimalist aesthetic
 *
 * Generated: 2026-05-12T11:48:21.058Z
 * Project: crm-app
 */

import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { apiClient, PaginatedResponse } from '@/lib/api-client';
import {
  ArrowLeft,
  Save,
  RefreshCw,
  Database,
  Edit2,
  Check,
  X,
  Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export const Route = createFileRoute('/admin/tables/$tableName')({
  component: TableDetailPage,
});

interface SysTable {
  sys_table_id: string | null;
  table_name: string;
  name: string;
  description?: string;
  is_active?: boolean;
}

interface SysColumn {
  sys_column_id: string | null;
  column_name: string;
  name: string;
  data_type: string;
  field_length?: number;
  is_mandatory: boolean;
  is_key?: boolean;
  reference_name?: string;
  description?: string;
}

interface Reference {
  sys_reference_id: string;
  name: string;
}

function TableDetailPage() {
  const { tableName } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: tablesResponse, isLoading: tableLoading, refetch: refetchTable } = useQuery({
    queryKey: ['admin', 'table-detail', tableName],
    queryFn: async () => {
      const dictResponse = await apiClient.get<PaginatedResponse<SysTable>>('/api/sys/tables', {
        limit: 1,
        search: tableName,
      });
      if (dictResponse.data && dictResponse.data.length > 0) return dictResponse;
      const schemaResponse = await apiClient.get<any>('/api/sys/tables/all', { limit: 1, search: tableName });
      return schemaResponse;
    },
  });

  const table = tablesResponse?.data?.[0];

  const { data: referencesResponse } = useQuery({
    queryKey: ['admin', 'references'],
    queryFn: () => apiClient.get<PaginatedResponse<Reference>>('/api/sys/references', { limit: 100 }),
  });

  const { data: columnsResponse, isLoading: columnsLoading, refetch: refetchColumns } = useQuery({
    queryKey: ['admin', 'table-columns', tableName],
    queryFn: async () => {
      if (!table) return { data: [] };
      if (table.sys_table_id) {
        try {
          return await apiClient.get<PaginatedResponse<SysColumn>>('/api/sys/columns', {
            tableId: table.sys_table_id,
            limit: 200,
          });
        } catch (e) {}
      }
      const response = await fetch(`http://localhost:3001/api/sys/columns/direct?tableName=${tableName}`);
      if (!response.ok) throw new Error('Failed to fetch columns');
      return await response.json();
    },
    enabled: !!table,
  });

  const columns = columnsResponse?.data || [];
  const references = referencesResponse?.data || [];

  useEffect(() => {
    if (table) {
      setDisplayName(table.name || '');
      setDescription(table.description || '');
      setIsActive(table.is_active ?? true);
      setHasChanges(false);
    }
  }, [table]);

  const updateTableMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; is_active: boolean }) => {
      if (table?.sys_table_id) {
        return apiClient.patch(`/api/sys/tables/${table.sys_table_id}`, data);
      } else {
        return apiClient.post('/api/sys/tables', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'table-detail', tableName] });
      toast.success('Table updated successfully');
      setHasChanges(false);
    },
  });

  const handleSave = () => {
    if (!table) return;
    updateTableMutation.mutate({ name: displayName, description, is_active: isActive });
  };

  if (tableLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading table details...</p>
        </div>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="min-h-screen bg-white">
        <header className="border-b-4 border-black bg-white">
          <div className="max-w-7xl mx-auto px-8 py-12">
            <div className="flex items-center gap-3 mb-4">
              <Database className="h-8 w-8 text-red-600" />
              <h1 className="text-6xl font-bold tracking-tight text-black font-newsreader">Table Not Found</h1>
            </div>
            <p className="text-xl text-gray-600">Table &quot;{tableName}&quot; does not exist.</p>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-8 py-12">
          <Link to="/admin/tables" className="inline-flex items-center text-sm hover:underline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Table Browser
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b-4 border-black bg-white sticky top-0 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin/tables" className="inline-flex items-center text-sm hover:underline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tables
              </Link>
              <Database className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-black font-newsreader">
                  {displayName || tableName}
                </h1>
                <code className="text-sm text-gray-500 ml-2">{tableName}</code>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => { refetchTable(); refetchColumns(); }} variant="outline" size="sm" className="border-2 border-black rounded-none hover:bg-black hover:text-white">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {hasChanges && (
                <Button onClick={handleSave} disabled={updateTableMutation.isPending} className="bg-blue-600 text-white hover:bg-blue-700 border-2 border-blue-600 rounded-none">
                  <Save className="h-4 w-4 mr-2" />
                  {updateTableMutation.isPending ? 'Saving...' : 'Save Table'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="border-2 border-black">
              <CardHeader className="bg-gray-50 border-b-2 border-black">
                <CardTitle className="flex items-center gap-2"><Edit2 className="h-5 w-5" />Table Metadata</CardTitle>
                <CardDescription>Edit the display name, description, and status for this table.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div>
                  <Label htmlFor="displayName" className="text-sm font-semibold">Display Name</Label>
                  <Input id="displayName" value={displayName} onChange={(e) => { setDisplayName(e.target.value); setHasChanges(true); }} placeholder="e.g., Patient" className="border-2 border-black rounded-none focus:ring-0 focus:border-black" />
                </div>
                <div>
                  <Label htmlFor="tableName" className="text-sm font-semibold">Table Name</Label>
                  <Input id="tableName" value={tableName} disabled className="bg-gray-100 border-2 border-black rounded-none" />
                  <p className="text-xs text-gray-500 mt-1">Technical name - cannot be changed</p>
                </div>
                <div>
                  <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                  <Textarea id="description" value={description} onChange={(e) => { setDescription(e.target.value); setHasChanges(true); }} placeholder="Describe what this table stores..." rows={3} className="border-2 border-black rounded-none focus:ring-0 focus:border-black resize-none" />
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor="isActive" className="text-sm font-semibold mb-0">Active</Label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setIsActive(true); setHasChanges(true); }} className={`w-12 h-6 rounded-none border-2 transition-all ${isActive ? 'bg-blue-600 border-blue-600' : 'bg-gray-200 border-gray-300 hover:bg-gray-300'}`}>
                      {isActive && <Check className="h-4 w-4 text-white" />}
                    </button>
                    <button onClick={() => { setIsActive(false); setHasChanges(true); }} className={`w-12 h-6 rounded-none border-2 transition-all ${!isActive ? 'bg-red-600 border-red-600' : 'bg-gray-200 border-gray-300 hover:bg-gray-300'}`}>
                      {!isActive && <X className="h-4 w-4 text-white" />}
                    </button>
                  </div>
                  <span className="text-sm text-gray-600">{isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="pt-6 border-t-2 border-gray-200">
                  <h3 className="text-sm font-semibold mb-3">Table Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Columns:</span>
                      <span className="font-semibold">{columns.length}</span>
                    </div>
                    {table.sys_table_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">In Dictionary:</span>
                        <Badge variant="outline" className="border-black">Yes</Badge>
                      </div>
                    )}
                  </div>
                </div>
                <div className="pt-6 border-t-2 border-gray-200">
                  <Button onClick={handleSave} disabled={!hasChanges || updateTableMutation.isPending} className="w-full bg-blue-600 text-white hover:bg-blue-700 border-2 border-blue-600 rounded-none">
                    <Save className="h-4 w-4 mr-2" />
                    {updateTableMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="border-2 border-black">
              <CardHeader className="bg-gray-50 border-b-2 border-black">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Hash className="h-5 w-5" />Columns ({columns.length})</CardTitle>
                </div>
                <CardDescription>View column definitions for this table.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-black text-white">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Column Name</th>
                        <th className="px-4 py-3 text-left font-semibold">Display Name</th>
                        <th className="px-4 py-3 text-left font-semibold">Data Type</th>
                        <th className="px-4 py-3 text-left font-semibold">Mandatory</th>
                        <th className="px-4 py-3 text-left font-semibold">Key</th>
                      </tr>
                    </thead>
                    <tbody>
                      {columnsLoading ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading columns...</td></tr>
                      ) : columns.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No columns found for this table</td></tr>
                      ) : (
                        columns.map((column: SysColumn, index: number) => (
                          <tr key={column.column_name} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3"><code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{column.column_name}</code></td>
                            <td className="px-4 py-3 text-sm">{column.name}</td>
                            <td className="px-4 py-3"><Badge className="bg-purple-100 text-purple-700 border-purple-200">{column.data_type}</Badge></td>
                            <td className="px-4 py-3">{column.is_mandatory ? <Check className="h-4 w-4 text-red-600" /> : <X className="h-4 w-4 text-gray-400" />}</td>
                            <td className="px-4 py-3">{column.is_key ? <Badge variant="outline" className="border-black">PK</Badge> : <span className="text-gray-300">-</span>}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
