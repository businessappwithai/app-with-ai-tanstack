/**
 * Admin Workflows Monitoring Page
 *
 * Monitor workflow execution history and status
 *
 * Generated: 2026-05-15T16:06:27.796Z
 * Project: CRM App
 */

import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  Workflow,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const Route = createFileRoute('/admin/workflows')({
  component: AdminWorkflowsPage,
});

interface WorkflowRun {
  id: string;
  trigger_run_id: string;
  entity_name: string;
  entity_id: string;
  operation: string;
  status: 'draft' | 'success' | 'error';
  input_payload?: any;
  output_payload?: any;
  error_details?: string;
  mutations_applied?: any;
  duration_ms?: number;
  created_at: string;
  completed_at?: string;
}

function AdminWorkflowsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [operationFilter, setOperationFilter] = useState<string>('');

  const { data: workflows, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'workflows', { statusFilter, entityFilter, operationFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (entityFilter) params.append('entityName', entityFilter);
      if (operationFilter) params.append('operation', operationFilter);
      params.append('limit', '100');

      const response = await apiClient.get<WorkflowRun[]>(`/api/workflow/runs?${params.toString()}`);
      return response;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const filteredWorkflows = workflows?.filter((wf) => {
    const matchesSearch =
      searchQuery === '' ||
      wf.entity_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wf.entity_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wf.trigger_run_id?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  }) || [];

  const entityNames = Array.from(new Set(workflows?.map((w) => w.entity_name) || []));
  const operations = Array.from(new Set(workflows?.map((w) => w.operation) || []));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'draft':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'draft':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b-4 border-black bg-white">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <Workflow className="h-8 w-8 text-black" />
                <div>
                  <h1 className="text-6xl font-bold tracking-tight text-black">
                    Workflow Monitor
                  </h1>
                  <p className="text-xl text-gray-600 font-light mt-2">
                    Real-time workflow execution and status tracking
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="default"
              onClick={() => refetch()}
              disabled={isLoading}
              className="border-2 border-black hover:bg-black hover:text-white transition-colors rounded-none"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Stats Cards */}
        <section className="mb-12">
          <div className="grid grid-cols-5 gap-0 border-l border-r border-black">
            <div className="border-t border-b border-black border-r p-6 bg-gray-50">
              <p className="text-sm uppercase tracking-widest text-gray-500 mb-2">Total</p>
              <p className="text-4xl font-bold text-black">{workflows?.length || 0}</p>
            </div>
            <div className="border-t border-b border-black border-r p-6 bg-gray-50">
              <p className="text-sm uppercase tracking-widest text-gray-500 mb-2">Draft</p>
              <p className="text-4xl font-bold text-blue-700">
                {workflows?.filter((w) => w.status === 'draft').length || 0}
              </p>
            </div>
            <div className="border-t border-b border-black border-r p-6 bg-gray-50">
              <p className="text-sm uppercase tracking-widest text-gray-500 mb-2">Success</p>
              <p className="text-4xl font-bold text-emerald-700">
                {workflows?.filter((w) => w.status === 'success').length || 0}
              </p>
            </div>
            <div className="border-t border-b border-black border-r p-6 bg-gray-50">
              <p className="text-sm uppercase tracking-widest text-gray-500 mb-2">Error</p>
              <p className="text-4xl font-bold text-red-700">
                {workflows?.filter((w) => w.status === 'error').length || 0}
              </p>
            </div>
            <div className="border-t border-b border-black p-6 bg-gray-50">
              <p className="text-sm uppercase tracking-widest text-gray-500 mb-2">Avg Duration</p>
              <p className="text-4xl font-bold text-black">
                {formatDuration(
                  (workflows?.filter((w) => w.duration_ms).reduce((acc, w) => acc + (w.duration_ms || 0), 0) ?? 0) /
                    (workflows?.filter((w) => w.duration_ms).length || 1)
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Search and Filter Bar */}
        <section className="mb-8">
          <div className="mb-6 flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by entity, ID, or run ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-2 border-black rounded-none focus:ring-0 focus:border-black"
              />
            </div>

            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="px-4 py-2 border-2 border-black rounded-none focus:ring-0 focus:border-black bg-white"
            >
              <option value="">All Entities</option>
              {entityNames.map((entity) => (
                <option key={entity} value={entity}>
                  {entity}
                </option>
              ))}
            </select>

            <select
              value={operationFilter}
              onChange={(e) => setOperationFilter(e.target.value)}
              className="px-4 py-2 border-2 border-black rounded-none focus:ring-0 focus:border-black bg-white"
            >
              <option value="">All Operations</option>
              {operations.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border-2 border-black rounded-none focus:ring-0 focus:border-black bg-white"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </select>
          </div>
        </section>

        {/* Workflows List */}
        {isLoading ? (
          <div className="text-center py-16 text-gray-500 border-2 border-black">
            Loading workflows...
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="text-center py-16 text-gray-500 border-2 border-black">
            {searchQuery || statusFilter || entityFilter || operationFilter
              ? 'No workflows match your search criteria.'
              : 'No workflows found. Workflows will appear here after entity operations.'}
          </div>
        ) : (
          <div className="border-2 border-black">
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b-2 border-black text-sm uppercase tracking-wider font-semibold">
              <div className="col-span-2">Entity</div>
              <div className="col-span-2">Entity ID</div>
              <div className="col-span-1">Operation</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2">Duration</div>
              <div className="col-span-2">Started</div>
              <div className="col-span-2 text-right">Run ID</div>
            </div>

            {filteredWorkflows.map((wf) => (
              <div
                key={wf.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 border-t border-gray-200 hover:bg-gray-50 items-center"
              >
                <div className="col-span-2">
                  <code className="text-sm bg-gray-100 px-2 py-1 font-mono">
                    {wf.entity_name}
                  </code>
                </div>

                <div className="col-span-2">
                  <div className="text-sm font-mono text-gray-600">
                    {wf.entity_id.slice(0, 8)}...
                  </div>
                </div>

                <div className="col-span-1">
                  <span className="text-sm font-medium uppercase">{wf.operation}</span>
                </div>

                <div className="col-span-1">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 border ${getStatusBadge(wf.status)}`}>
                    {getStatusIcon(wf.status)}
                    {wf.status}
                  </span>
                </div>

                <div className="col-span-2">
                  <div className="text-sm font-medium">{formatDuration(wf.duration_ms)}</div>
                  {wf.status === 'draft' && (
                    <div className="text-xs text-blue-600">Running...</div>
                  )}
                </div>

                <div className="col-span-2">
                  <div className="text-sm text-gray-600">
                    {new Date(wf.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(wf.created_at).toLocaleTimeString()}
                  </div>
                </div>

                <div className="col-span-2 text-right">
                  <div className="text-xs font-mono text-gray-500">
                    {wf.trigger_run_id?.slice(0, 12)}...
                  </div>
                  {wf.error_details && (
                    <div className="text-xs text-red-600 mt-1">Error</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t-2 border-black mt-16">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <p className="text-sm text-gray-500">
            CRM App · Workflow Monitoring · Auto-refreshing every 5 seconds
          </p>
        </div>
      </footer>
    </div>
  );
}
