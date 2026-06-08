import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  EditIcon,
  PlusIcon,
  RefreshCwIcon,
  TrashIcon,
  SaveIcon,
  MoreVerticalIcon,
  CheckCircle2Icon,
  CircleIcon,
} from "lucide-react";
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
  const [selectedRule, setSelectedRule] = useState<RuleDefinition | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "r") {
        e.preventDefault();
        fetchRules();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const deleteRule = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    try {
      const response = await fetch(`/api/rules/${ruleId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete rule");
      setSelectedRule(null);
      fetchRules();
    } catch (error) {
      console.error("Failed to delete rule:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <div className="px-6 py-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50">Business Rules</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                  Manage JDM (JSON Decision Model) rules for entity automation
                </p>
              </div>
              <button
                onClick={() => navigate({ to: "/admin/rules/new" })}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#FF8400] text-white rounded-lg hover:bg-[#E67300] transition-all duration-200 font-medium shadow-md hover:shadow-lg"
              >
                <PlusIcon className="h-5 w-5" />
                New Rule
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
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Operation</label>
                <select
                  className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-[#FF8400] focus:ring-offset-2 dark:focus:ring-offset-slate-950 transition-all"
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
              <div className="flex items-end gap-2">
                <button
                  onClick={fetchRules}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#FF8400] transition-all duration-200"
                  title="Refresh (Ctrl+R)"
                >
                  <RefreshCwIcon className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Rules List or Empty State */}
          {loading ? (
            <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
              <div className="animate-spin inline-block h-8 w-8 border-4 border-[#FF8400] border-t-transparent rounded-full mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Loading rules...</p>
            </div>
          ) : rules.length === 0 ? (
            <div className="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-2">No Business Rules Yet</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-sm mx-auto">
                Business rules automate decisions and validations across your system. Create your first rule to get started.
              </p>
              <button
                onClick={() => navigate({ to: "/admin/rules/new" })}
                className="px-6 py-2.5 bg-[#FF8400] text-white rounded-lg hover:bg-[#E67300] transition-all duration-200 font-medium inline-block"
              >
                Create Your First Rule
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  onClick={() => setSelectedRule(rule)}
                  className={`bg-white dark:bg-slate-950 rounded-lg border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md ${
                    selectedRule?.id === rule.id
                      ? "border-[#FF8400] bg-orange-50 dark:bg-slate-900/50"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="p-6">
                    {/* Rule Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{rule.ruleName}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {rule.entityName} • {rule.operation}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Prominent Status Badge */}
                        <div
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-medium text-sm min-w-[100px] justify-center ${
                            rule.isActive
                              ? "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-800 text-green-700 dark:text-green-300"
                              : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {rule.isActive ? (
                            <CheckCircle2Icon className="h-4 w-4" />
                          ) : (
                            <CircleIcon className="h-4 w-4" />
                          )}
                          {rule.isActive ? "Active" : "Inactive"}
                        </div>

                        {/* More Menu */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMoreMenu(showMoreMenu === rule.id ? null : rule.id);
                            }}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <MoreVerticalIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                          </button>

                          {showMoreMenu === rule.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-lg z-10">
                              <button className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                                Export
                              </button>
                              <button className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm text-slate-700 dark:text-slate-300">
                                Share Settings
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rule Metadata */}
                    <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        <div className="font-medium">Version {rule.version}</div>
                        <div className="text-xs mt-1">
                          Updated {new Date(rule.updatedAt).toLocaleDateString()} at{" "}
                          {new Date(rule.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate({
                              to: "/admin/rules/$entity/$ruleId",
                              params: { entity: rule.entityName, ruleId: rule.id },
                            });
                          }}
                          className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-[#FF8400] hover:text-[#FF8400] transition-all duration-200 font-medium"
                        >
                          <EditIcon className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRule(rule.id);
                          }}
                          className="flex items-center gap-2 px-4 py-2 border border-red-300 dark:border-red-900 rounded-lg text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-500 dark:hover:border-red-700 transition-all duration-200 font-medium"
                        >
                          <TrashIcon className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
