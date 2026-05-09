import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { EditIcon, PlusIcon, RefreshCwIcon, TrashIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface RuleDefinition {
  id: string;
  entityName: string;
  ruleName: string;
  operation: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const Route = createFileRoute("/admin/rules/")({
  component: RulesListPage,
});

function RulesListPage() {
  const navigate = useNavigate();
  const [rules, setRules] = useState<RuleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    entity?: string;
    operation?: string;
  }>({});

  const fetchRules = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.entity) params.append("entity", filter.entity);
      if (filter.operation) params.append("operation", filter.operation);

      const response = await fetch(`/api/rules?${params}`);
      if (!response.ok) throw new Error("Failed to fetch rules");

      const data = await response.json();
      setRules(data.rules || []);
    } catch (error) {
      console.error("Failed to load rules:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [filter]);

  const deleteRule = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    try {
      const response = await fetch(`/api/rules/${ruleId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete rule");

      console.log("Rule deleted successfully");
      fetchRules();
    } catch (error) {
      console.error("Failed to delete rule:", error);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Business Rules</h1>
          <p className="text-gray-600">
            Manage JDM (JSON Decision Model) rules for entity automation
          </p>
        </div>
        <button
          onClick={() => navigate({ to: "/admin/rules/new" })}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          New Rule
        </button>
      </div>

      <div className="bg-white border rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div>
            <label className="text-sm font-medium mb-2 block">Operation</label>
            <select
              className="w-full p-2 border rounded-md"
              value={filter.operation || ""}
              onChange={(e) => setFilter({ ...filter, operation: e.target.value || undefined })}
            >
              <option value="">All Operations</option>
              <option value="CREATE">CREATE</option>
              <option value="READ">READ</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="ALL">ALL</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchRules}
              className="p-2 border rounded-md hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <RefreshCwIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border rounded-lg shadow-sm p-8 text-center text-gray-600">
          Loading rules...
        </div>
      ) : rules.length === 0 ? (
        <div className="bg-white border rounded-lg shadow-sm p-8 text-center text-gray-600">
          No rules found. Create your first rule to get started.
        </div>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white border rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{rule.ruleName}</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    {rule.entityName} • {rule.operation}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    rule.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {rule.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <div>Version {rule.version}</div>
                  <div className="text-xs">
                    Last updated: {new Date(rule.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 transition-colors"
                    onClick={() =>
                      navigate({
                        to: "/admin/rules/$entity/$ruleId",
                        params: { entity: rule.entityName, ruleId: rule.id },
                      })
                    }
                  >
                    <EditIcon className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-md hover:bg-red-50 hover:border-red-300 transition-colors"
                    onClick={() => deleteRule(rule.id)}
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
