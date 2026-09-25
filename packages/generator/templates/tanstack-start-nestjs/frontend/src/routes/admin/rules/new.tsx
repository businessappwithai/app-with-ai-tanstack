import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  Loader2,
  Save,
  Scale,
  TestTube2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { RuleTableEditor } from "@/components/automation/RuleTableEditor";
import { asDecisionTable } from "@/lib/automation/rule-content";
import { emptyDecisionTable } from "@/lib/workflow/bpmn-model";
import { useRuleEntities, useRuleEntityFields } from "@/hooks/use-rule-entities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";

export const Route = createFileRoute("/admin/rules/new")({
  component: NewRulePage,
});

const OPERATIONS = [
  { value: "CREATE", label: "Create", description: "Triggered when a new record is created" },
  { value: "UPDATE", label: "Update", description: "Triggered when a record is modified" },
  { value: "DELETE", label: "Delete", description: "Triggered when a record is deleted" },
  { value: "ALL", label: "All Operations", description: "Triggered on create, update, and delete" },
];

/**
 * A new rule starts as the modelling tool's does: one input, one outcome and
 * the catch-all row, rather than a sample about an `email` field the chosen
 * entity may not have — whose action was the runtime's `prevent`, which the
 * editor's Action picker does not offer, so it showed as unpicked.
 */
const DEFAULT_JDM = JSON.stringify(emptyDecisionTable(), null, 2);

function NewRulePage() {
  const navigate = useNavigate();
  const [entityName, setEntityName] = useState("");
  const [ruleName, setRuleName] = useState("");
  const [operation, setOperation] = useState("CREATE");
  const [jdmContent, setJdmContent] = useState(DEFAULT_JDM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Dry run state
  const [testData, setTestData] = useState("{}");
  const [testResult, setTestResult] = useState<any>(null);
  const [showTestPanel, setShowTestPanel] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: {
      entityName: string;
      ruleName: string;
      operation: string;
      jdmContent: string;
    }) => {
      return await apiClient.post("/rules", data);
    },
    onSuccess: () => {
      toast.success("Rule created successfully");
      navigate({ to: "/admin/rules" });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create rule: ${error.message}`);
    },
  });

  const { data: workflowsData } = useQuery({
    queryKey: ["workflow-definitions"],
    queryFn: async () => {
      const data = await apiClient.get<any[]>("/workflow-definitions?isActive=true");
      return Array.isArray(data) ? data : [];
    },
  });
  const availableWorkflows = (workflowsData ?? []).map((wf: any) => ({
    id: wf.id,
    name: wf.name,
    description: wf.description,
  }));

  const dryRunMutation = useMutation({
    mutationFn: async (data: { jdmContent: string; testData: Record<string, unknown> }) => {
      return await apiClient.post("/rules/evaluate", {
        entityName,
        operation,
        data: data.testData,
      });
    },
    onSuccess: (result) => {
      setTestResult(result);
    },
    onError: (error: Error) => {
      setTestResult({ error: error.message });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!entityName) newErrors.entityName = "Entity is required";
    if (!ruleName.trim()) newErrors.ruleName = "Rule name is required";
    if (!operation) newErrors.operation = "Operation is required";
    try {
      JSON.parse(jdmContent);
    } catch {
      newErrors.jdmContent = "Invalid JDM content";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    createMutation.mutate({ entityName, ruleName, operation, jdmContent });
  };

  const handleDryRun = () => {
    try {
      const parsed = JSON.parse(testData);
      dryRunMutation.mutate({ jdmContent, testData: parsed });
    } catch {
      toast.error("Invalid test data JSON");
    }
  };

  // This application's own record types, from its dictionary.
  const { data: entities = [], isLoading: entitiesLoading } = useRuleEntities();
  const chosen = entities.find((entity) => entity.value === entityName);
  const { data: entityFields = [] } = useRuleEntityFields(chosen?.tableId);

  return (
    <div className="min-h-screen bg-card">
      <header className="border-b-4 border-foreground bg-card">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <div className="flex items-center gap-4">
            <Link to="/admin/rules">
              <Button variant="ghost" size="sm" className="rounded-none">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Create Business Rule</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Define conditions and actions that run automatically when entity records are
                created, updated, or deleted.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-8">
        <form onSubmit={handleSubmit}>
          {/* Rule metadata section */}
          <div className="border-2 border-foreground mb-8">
            <div className="bg-muted/40 px-6 py-3 border-b-2 border-foreground">
              <h2 className="text-sm font-semibold uppercase tracking-wider">Rule Configuration</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Entity *
                  </Label>
                  <Select value={entityName} onValueChange={setEntityName}>
                    <SelectTrigger className="mt-1 border-2 border-border rounded-none">
                      <SelectValue placeholder="Select entity..." />
                    </SelectTrigger>
                    <SelectContent>
                      {entitiesLoading ? (
                        <SelectItem value="__loading" disabled>
                          Loading…
                        </SelectItem>
                      ) : null}
                      {entities.map((e) => (
                        <SelectItem key={e.value} value={e.value}>
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.entityName && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.entityName}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Rule Name *
                  </Label>
                  <Input
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="e.g. Validate Email Format"
                    className="mt-1 border-2 border-border rounded-none"
                  />
                  {errors.ruleName && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.ruleName}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Trigger Operation *
                  </Label>
                  <Select value={operation} onValueChange={setOperation}>
                    <SelectTrigger className="mt-1 border-2 border-border rounded-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATIONS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          <div>
                            <span>{op.label}</span>
                            <span className="text-xs text-muted-foreground/70 ml-2">— {op.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.operation && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.operation}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Decision Table Editor */}
          <div className="border-2 border-foreground mb-8">
            <div className="bg-muted/40 px-6 py-3 border-b-2 border-foreground">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider">Decision Logic</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-none text-xs"
                  onClick={() => setShowTestPanel(!showTestPanel)}
                >
                  <TestTube2 className="h-3.5 w-3.5 mr-1" />
                  {showTestPanel ? "Hide Test" : "Test Rule"}
                </Button>
              </div>
            </div>
            <RuleTableEditor
              name={ruleName || "New rule"}
              table={asDecisionTable(jdmContent)}
              // Serialised on the way out. `jdmContent` is the JSON text the
              // rules API stores and every check on this page parses; the
              // editor hands back a DecisionTable object. Passing the setter
              // straight in put the object into a string state, so the save
              // path's JSON.parse threw and a rule authored in the table editor
              // could not be saved at all — it failed validation as "Invalid
              // JDM content" with nothing on screen to explain why.
              onChange={(next) => setJdmContent(JSON.stringify(next, null, 2))}
              entityFields={entityFields}
            />
            {errors.jdmContent && (
              <p className="text-xs text-red-600 dark:text-red-400 px-4 pb-2">{errors.jdmContent}</p>
            )}
          </div>

          {/* Test Panel */}
          {showTestPanel && (
            <div className="border-2 border-foreground mb-8">
              <div className="bg-amber-50 dark:bg-amber-950/40 px-6 py-3 border-b-2 border-foreground">
                <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                  <TestTube2 className="h-4 w-4" />
                  Dry Run — Test Your Rule
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter sample entity data to see how your rule would evaluate it.
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                      Test Data (JSON)
                    </Label>
                    <textarea
                      className="w-full h-40 font-mono text-xs border-2 border-border p-3 rounded-none"
                      value={testData}
                      onChange={(e) => setTestData(e.target.value)}
                      placeholder={`{\n  "name": "Test Account",\n  "email": null,\n  "status": "active"\n}`}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="mt-2 rounded-none bg-amber-600 text-white hover:bg-amber-700"
                      onClick={handleDryRun}
                      disabled={dryRunMutation.isPending}
                    >
                      {dryRunMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <TestTube2 className="h-3.5 w-3.5 mr-1" />
                      )}
                      Run Test
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                      Result
                    </Label>
                    {testResult ? (
                      <div className="h-40 overflow-auto border-2 border-border p-3 bg-muted/40 text-xs">
                        {testResult.error ? (
                          <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
                            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold">Error</p>
                              <p>{testResult.error}</p>
                            </div>
                          </div>
                        ) : testResult.results?.length > 0 ? (
                          <div className="space-y-2">
                            {testResult.results.map((r: any, i: number) => (
                              <div
                                key={i}
                                className={`flex items-start gap-2 p-2 rounded ${
                                  r.actions?.some((a: any) => a.type === "prevent")
                                    ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
                                    : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                                }`}
                              >
                                {r.actions?.some((a: any) => a.type === "prevent") ? (
                                  <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                ) : (
                                  <HelpCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                )}
                                <div>
                                  <p className="font-semibold">{r.ruleId}</p>
                                  {r.actions?.map((a: any, j: number) => (
                                    <p key={j}>
                                      [{a.type}] {a.config?.message}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <CheckCircle className="h-4 w-4" />
                            <span className="font-semibold">All checks passed — no violations</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-40 border-2 border-dashed border-border flex items-center justify-center text-muted-foreground/70 text-xs">
                        Click "Run Test" to see results
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Link to="/admin/rules">
              <Button
                type="button"
                variant="outline"
                className="rounded-none border-2 border-foreground"
              >
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-foreground text-background hover:bg-foreground/90 rounded-none px-8"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {createMutation.isPending ? "Creating..." : "Create Rule"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
