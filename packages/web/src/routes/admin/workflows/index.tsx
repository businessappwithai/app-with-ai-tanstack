import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EyeIcon, RefreshCwIcon, RotateCwIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface WorkflowRun {
  id: string;
  entity_name: string;
  entity_id: string;
  operation: string;
  status: "draft" | "success" | "error";
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

  const retryWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/retry`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to retry workflow");

      console.log("Workflow retry initiated");
      fetchWorkflows();
    } catch (error) {
      console.error("Failed to retry workflow:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800";
      case "error":
        return "bg-red-100 text-red-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Workflow Monitor</h1>
          <p className="text-gray-600">Monitor and manage workflow executions</p>
        </div>
        <button
          onClick={fetchWorkflows}
          className="p-2 border rounded-md hover:bg-gray-50 transition-colors"
          title="Refresh"
        >
          <RefreshCwIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="bg-white border rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <select
              className="w-full p-2 border rounded-md"
              value={filter.status || ""}
              onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Entity</label>
            <select
              className="w-full p-2 border rounded-md"
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
        </div>
      </div>

      {loading ? (
        <div className="bg-white border rounded-lg shadow-sm p-8 text-center text-gray-600">
          Loading workflows...
        </div>
      ) : workflows.length === 0 ? (
        <div className="bg-white border rounded-lg shadow-sm p-8 text-center text-gray-600">
          No workflow runs found
        </div>
      ) : (
        <div className="grid gap-4">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="bg-white border rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    {workflow.operation} - {workflow.entity_name}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">ID: {workflow.entity_id}</p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                    workflow.status
                  )}`}
                >
                  {workflow.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <div>Started: {new Date(workflow.created_at).toLocaleString()}</div>
                  <div className="text-xs">
                    Updated: {new Date(workflow.updated_at).toLocaleString()}
                  </div>
                  {workflow.retry_count > 0 && (
                    <div className="text-xs text-orange-600">Retries: {workflow.retry_count}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  {workflow.status === "error" && (
                    <button
                      className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 transition-colors"
                      onClick={() => retryWorkflow(workflow.id)}
                    >
                      <RotateCwIcon className="h-4 w-4" />
                      Retry
                    </button>
                  )}
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 transition-colors"
                    onClick={() =>
                      navigate({
                        to: "/admin/workflows/$workflowId",
                        params: { workflowId: workflow.id },
                      })
                    }
                  >
                    <EyeIcon className="h-4 w-4" />
                    View Details
                  </button>
                </div>
              </div>
              {workflow.error_message && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  <strong>Error:</strong> {workflow.error_message}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
