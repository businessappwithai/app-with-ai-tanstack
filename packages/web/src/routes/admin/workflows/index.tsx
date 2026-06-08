import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  EyeIcon,
  RefreshCwIcon,
  RotateCwIcon,
  MoreVerticalIcon,
  CheckCircle2Icon,
  AlertCircle,
  Clock,
  SaveIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

interface WorkflowRun {
  id: string;
  entity_name: string;
  entity_id: string;
  operation: string;
  status: "draft" | "running" | "success" | "error";
  error_message?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export const Route = createFileRoute("/admin/workflows/")({
  component: WorkflowMonitorPage,
});

function WorkflowMonitorPage() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    status?: string;
    entity?: string;
  }>({});
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowRun | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append("status", filter.status);
      if (filter.entity) params.append("entity", filter.entity);

      const response = await fetch(`/api/workflows?${params}`);
      if (!response.ok) throw new Error("Failed to fetch workflows");

      const data = await response.json();
      setWorkflows(data.workflows || []);
    } catch (error) {
      console.error("Failed to load workflows:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [filter]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "r") {
        e.preventDefault();
        fetchWorkflows();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const retryWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/retry`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to retry workflow");
      fetchWorkflows();
    } catch (error) {
      console.error("Failed to retry workflow:", error);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "success":
        return {
          bg: "bg-green-50 dark:bg-green-950/30",
          border: "border-green-300 dark:border-green-800",
          text: "text-green-700 dark:text-green-300",
          icon: CheckCircle2Icon,
        };
      case "error":
        return {
          bg: "bg-red-50 dark:bg-red-950/30",
          border: "border-red-300 dark:border-red-800",
          text: "text-red-700 dark:text-red-300",
          icon: AlertCircle,
        };
      case "running":
        return {
          bg: "bg-blue-50 dark:bg-blue-950/30",
          border: "border-blue-300 dark:border-blue-800",
          text: "text-blue-700 dark:text-blue-300",
          icon: Clock,
        };
      case "draft":
      default:
        return {
          bg: "bg-slate-100 dark:bg-slate-800",
          border: "border-slate-300 dark:border-slate-700",
          text: "text-slate-700 dark:text-slate-300",
          icon: Clock,
        };
    }
  };

  const statusLabels: Record<string, string> = {
    draft: "Draft",
    running: "Running",
    success: "Completed",
    error: "Failed",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <div className="px-6 py-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50">Workflow Monitor</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                  Monitor and manage workflow executions across entities
                </p>
              </div>
              <button
                onClick={fetchWorkflows}
                className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#FF8400] hover:border-[#FF8400] transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                title="Refresh (Ctrl+R)"
              >
                <RefreshCwIcon className="h-5 w-5" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-6 mb-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 uppercase tracking-wide mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Status</label>
                <select
                  className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-[#FF8400] focus:ring-offset-2 dark:focus:ring-offset-slate-950 transition-all"
                  value={filter.status || ""}
                  onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="running">Running</option>
                  <option value="success">Completed</option>
                  <option value="error">Failed</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Entity</label>
                <select
                  className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-[#FF8400] focus:ring-offset-2 dark:focus:ring-offset-slate-950 transition-all"
                  value={filter.entity || ""}
                  onChange={(e) => setFilter({ ...filter, entity: e.target.value || undefined })}
                >
                  <option value="">All Entities</option>
                  <option value="Patient">Patient</option>
                  <option value="Appointment">Appointment</option>
                  <option value="Prescription">Prescription</option>
                  <option value="Invoice">Invoice</option>
                  <option value="Ward">Ward</option>
                </select>
              </div>
              <div className="flex items-end"></div>
            </div>
          </div>

          {/* Workflows List or Empty State */}
          {loading ? (
            <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
              <div className="animate-spin inline-block h-8 w-8 border-4 border-[#FF8400] border-t-transparent rounded-full mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Loading workflows...</p>
            </div>
          ) : workflows.length === 0 ? (
            <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
              <div className="text-5xl mb-4">⚙️</div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-2">No Workflows Running</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-sm mx-auto">
                Workflows will appear here as they execute. Workflows monitor and manage multi-step operations across your system.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {workflows.map((workflow) => {
                const statusColors = getStatusBadgeColor(workflow.status);
                const StatusIcon = statusColors.icon;

                return (
                  <div
                    key={workflow.id}
                    onClick={() => setSelectedWorkflow(workflow)}
                    className={`bg-white dark:bg-slate-950 rounded-lg border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md ${
                      selectedWorkflow?.id === workflow.id
                        ? "border-[#FF8400] bg-orange-50 dark:bg-slate-900/50"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="p-6">
                      {/* Workflow Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                            {workflow.operation}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            Entity: <span className="font-medium">{workflow.entity_name}</span> | ID:{" "}
                            <span className="font-mono">{workflow.entity_id}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Prominent Status Badge */}
                          <div
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-medium text-sm min-w-[100px] justify-center ${statusColors.bg} ${statusColors.border} ${statusColors.text}`}
                          >
                            <StatusIcon className="h-4 w-4" />
                            {statusLabels[workflow.status] || workflow.status}
                          </div>

                          {/* More Menu */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMoreMenu(showMoreMenu === workflow.id ? null : workflow.id);
                              }}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <MoreVerticalIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                            </button>

                            {showMoreMenu === workflow.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-lg z-10">
                                <button className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                                  Export Logs
                                </button>
                                <button className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm text-slate-700 dark:text-slate-300">
                                  Share Results
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Workflow Metadata */}
                      <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          <div className="font-medium">
                            Started {new Date(workflow.created_at).toLocaleDateString()} at{" "}
                            {new Date(workflow.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="text-xs mt-1">
                            Updated {new Date(workflow.updated_at).toLocaleDateString()}
                          </div>
                          {workflow.retry_count > 0 && (
                            <div className="text-xs mt-1 text-[#FF8400] font-medium">
                              {workflow.retry_count} {workflow.retry_count === 1 ? "retry" : "retries"}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          {workflow.status === "error" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                retryWorkflow(workflow.id);
                              }}
                              className="flex items-center gap-2 px-4 py-2 border border-[#FF8400] rounded-lg text-[#FF8400] hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:border-[#E67300] transition-all duration-200 font-medium"
                            >
                              <RotateCwIcon className="h-4 w-4" />
                              Retry
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate({
                                to: "/admin/workflows/$workflowId",
                                params: { workflowId: workflow.id },
                              });
                            }}
                            className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-[#FF8400] hover:text-[#FF8400] transition-all duration-200 font-medium"
                          >
                            <EyeIcon className="h-4 w-4" />
                            Details
                          </button>
                        </div>
                      </div>

                      {/* Error Message (if present) */}
                      {workflow.error_message && (
                        <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-lg">
                          <div className="flex gap-3">
                            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-red-700 dark:text-red-300">
                              <strong className="block">Error Details:</strong>
                              {workflow.error_message}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
