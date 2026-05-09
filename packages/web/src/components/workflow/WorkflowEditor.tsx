"use client";

import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleX,
  Database,
  GitBranch,
  Loader2,
  Play,
  RefreshCw,
  Save,
  Settings,
  Sparkles,
} from "lucide-react";
import React from "react";
import { GoRulesEditor } from "./GoRulesEditor";
import { GoRulesErrorBoundary } from "./GoRulesErrorBoundary";
import { useWorkflowEditor, type WorkflowStep } from "./useWorkflowEditor";

export type { WorkflowEditorProps } from "./useWorkflowEditor";

interface WorkflowEditorComponentProps {
  serviceName: string;
  projectId: string;
  entities: Array<{ name: string; attributes: string[] }>;
  hooks: Array<{
    type: string;
    name: string;
    code?: string;
    entity: string;
    enabled: boolean;
    order: number;
  }>;
  flowchartCode: string;
}

const getStepIcon = (type: WorkflowStep["type"]) => {
  switch (type) {
    case "validation":
      return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
    case "transformation":
      return <GitBranch className="w-4 h-4 text-purple-500" />;
    case "external":
      return <Settings className="w-4 h-4 text-orange-500" />;
    case "commit":
      return <Database className="w-4 h-4 text-green-500" />;
  }
};

export function WorkflowEditor(props: WorkflowEditorComponentProps) {
  const {
    workflows,
    selectedWorkflow,
    isExecuting,
    isGenerating,
    executionStatus,
    showGoRules,
    setShowGoRules,
    expandedSteps,
    selectedHookType,
    setSelectedHookType,
    goRulesData,
    setGoRulesData,
    isSavingRules,
    generateWorkflowsFromHooks,
    executeWorkflow,
    handleSaveGoRules,
    toggleStepExpanded,
    getHookColor,
  } = useWorkflowEditor(props);

  const { entities } = props;

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" style={{ color: "#FF8400" }} />
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                Trigger.dev Workflows
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Auto-generated from hooks • Transactional with GoRules
            </p>
          </div>
          <button
            onClick={() => generateWorkflowsFromHooks()}
            disabled={isGenerating || props.hooks.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            style={{ backgroundColor: "#FF8400" }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Regenerate from Hooks
              </>
            )}
          </button>
        </div>

        {/* Hook Type Filter */}
        {props.hooks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedHookType(null)}
              className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors ${
                !selectedHookType
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
              style={
                !selectedHookType ? { color: "#FF8400", borderColor: "rgba(255, 132, 0, 0.3)" } : {}
              }
            >
              All Hooks ({workflows.length})
            </button>
            {Array.from(new Set(props.hooks.map((h) => h.type))).map((hookType) => {
              const hookWorkflows = workflows.filter((w) => w.hookType === hookType);
              return (
                <button
                  key={hookType}
                  onClick={() => setSelectedHookType(hookType)}
                  className={`px-2 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
                    selectedHookType === hookType
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                  style={
                    selectedHookType === hookType
                      ? { color: "#FF8400", borderColor: "rgba(255, 132, 0, 0.3)" }
                      : {}
                  }
                >
                  <div className={`w-2 h-2 rounded-full ${getHookColor(hookType)}`} />
                  {hookType}
                  <span className="ml-1 opacity-70">({hookWorkflows.length})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: "#FF8400" }} />
            <p className="text-sm text-foreground">Generating workflows from hooks...</p>
            <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
          </div>
        ) : props.hooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <GitBranch className="w-16 h-16 text-muted-foreground mb-4" />
            <h4 className="text-lg font-semibold text-foreground mb-2">No hooks configured</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Add hooks in the Hooks tab to auto-generate workflows
            </p>
          </div>
        ) : !selectedWorkflow ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <GitBranch className="w-16 h-16 text-muted-foreground mb-4" />
            <h4 className="text-lg font-semibold text-foreground mb-2">No workflow selected</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Select a hook from the filters above to view its workflow
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Workflow Header */}
            <div className="p-4 bg-secondary rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${getHookColor(selectedWorkflow.hookType)}`}
                  />
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {selectedWorkflow.hookType} Hook Workflow
                    </h4>
                    <p className="text-xs text-muted-foreground">{selectedWorkflow.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedWorkflow.autoGenerated && (
                    <span
                      className="px-2 py-1 text-xs bg-primary/20 text-primary border border-primary/30 rounded font-medium"
                      style={{ color: "#FF8400" }}
                    >
                      Auto-Generated
                    </span>
                  )}
                  <button
                    onClick={() => executeWorkflow(selectedWorkflow)}
                    disabled={isExecuting}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors disabled:opacity-50"
                    style={{ backgroundColor: "#FF8400" }}
                  >
                    {isExecuting ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" />
                        Run Workflow
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedWorkflow.steps.length} steps • {selectedWorkflow.rules.length} business
                rules configured
              </div>
            </div>

            {/* Workflow Steps */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Workflow Steps</h4>
              {selectedWorkflow.steps.map((step, index) => (
                <div
                  key={step.id}
                  className="bg-card border border-border rounded-lg overflow-hidden mb-2"
                >
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary transition-colors"
                    onClick={() => toggleStepExpanded(step.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-xs font-bold text-muted-foreground">
                        {index + 1}
                      </div>
                      {getStepIcon(step.type)}
                      <div>
                        <p className="text-sm font-medium text-foreground">{step.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {step.type}
                          {step.entity && ` • ${step.entity}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                        {step.enabled ? "Enabled" : "Disabled"}
                      </span>
                      {expandedSteps.has(step.id) ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {expandedSteps.has(step.id) && (
                    <div className="p-4 border-t border-border bg-secondary">
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                            GoRules Configuration
                          </label>
                          <button
                            onClick={() => setShowGoRules(true)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded transition-colors"
                            style={{ backgroundColor: "#FF8400" }}
                          >
                            <Settings className="w-3 h-3" />
                            Configure Rules
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Define business rules for this step using GoRules syntax
                        </p>
                      </div>

                      {step.hookType && (
                        <div className="mt-3">
                          <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                            Hook Code Reference
                          </label>
                          <div className="p-2 bg-background border border-border rounded-lg">
                            <p className="text-xs text-muted-foreground">
                              This step uses the{" "}
                              <code
                                className="px-1 py-0.5 bg-primary/10 text-primary rounded font-mono"
                                style={{ color: "#FF8400" }}
                              >
                                {step.hookType}
                              </code>{" "}
                              hook defined in the Hooks tab
                            </p>
                          </div>
                        </div>
                      )}

                      {(() => {
                        const stepRules = selectedWorkflow.rules.filter(
                          (r) => r.stepId === step.id
                        );
                        return (
                          stepRules.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold text-foreground mb-1">
                                Configured Rules ({stepRules.length})
                              </p>
                              <div className="space-y-1">
                                {stepRules.map((rule) => (
                                  <div
                                    key={rule.id}
                                    className="p-2 bg-background border border-border rounded text-xs"
                                  >
                                    <p className="font-medium text-foreground">{rule.ruleName}</p>
                                    <p className="text-muted-foreground font-mono mt-0.5">
                                      {rule.condition}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Execution Status */}
            {executionStatus.status !== "idle" && (
              <div
                className={`p-4 rounded-lg border ${
                  executionStatus.status === "success"
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : executionStatus.status === "error"
                      ? "bg-red-500/10 border-red-500/30"
                      : "bg-primary/10 border-primary/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  {executionStatus.status === "running" && (
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#FF8400" }} />
                  )}
                  {executionStatus.status === "success" && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  )}
                  {executionStatus.status === "error" && (
                    <CircleX className="w-5 h-5 text-red-500" />
                  )}
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        executionStatus.status === "success"
                          ? "text-emerald-500"
                          : executionStatus.status === "error"
                            ? "text-red-500"
                            : "text-foreground"
                      }`}
                    >
                      {executionStatus.message}
                    </p>
                    {executionStatus.currentStep && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Current: {executionStatus.currentStep}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* GoRules Editor Modal */}
      {showGoRules && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0">
          <div className="bg-card w-full h-full max-h-screen overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-primary" style={{ color: "#FF8400" }} />
                <div>
                  <h3 className="font-semibold text-foreground">GoRules Editor</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedWorkflow?.hookType} • Configure business rules
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGoRules(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <CircleX className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="w-72 border-r border-border bg-secondary overflow-y-auto">
                <div className="p-4 border-b border-border">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Hook Type
                  </h4>
                  <div className="p-3 bg-background border border-border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`w-3 h-3 rounded-full ${getHookColor(
                          selectedWorkflow?.hookType ?? "bg-gray-500"
                        )}`}
                      />
                      <span className="text-sm font-bold text-foreground">
                        {selectedWorkflow?.hookType}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedWorkflow?.autoGenerated ? "Auto-generated" : "Custom workflow"}
                    </p>
                  </div>
                </div>

                <div className="p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Database className="w-3 h-3" />
                    Entities ({entities.length})
                  </h4>
                  <div className="space-y-2">
                    {entities.map((entity) => (
                      <details
                        key={entity.name}
                        className="group bg-background border border-border rounded-lg overflow-hidden"
                      >
                        <summary className="flex items-center justify-between p-2 cursor-pointer hover:bg-secondary/50 transition-colors">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full bg-primary"
                              style={{ backgroundColor: "#FF8400" }}
                            />
                            <span className="text-xs font-medium text-foreground">
                              {entity.name}
                            </span>
                          </div>
                          <ChevronDown className="w-3 h-3 text-muted-foreground group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="p-2 pt-0 border-t border-border mt-2">
                          <p className="text-xs text-muted-foreground mb-2">
                            {entity.attributes.length} attributes
                          </p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {entity.attributes.slice(0, 10).map((attr, idx) => (
                              <div
                                key={idx}
                                className="text-xs text-muted-foreground font-mono truncate"
                                title={attr}
                              >
                                • {attr}
                              </div>
                            ))}
                            {entity.attributes.length > 10 && (
                              <p className="text-xs text-muted-foreground italic">
                                +{entity.attributes.length - 10} more...
                              </p>
                            )}
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>

                <div className="p-4 border-t border-border mt-auto">
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                    <p className="text-xs text-foreground font-medium mb-1">
                      Transactional Guarantee
                    </p>
                    <p className="text-xs text-muted-foreground">
                      All rules must succeed for changes to commit. If any rule fails, everything is
                      rolled back automatically.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-background overflow-hidden flex flex-col">
                <div className="flex-1 overflow-hidden">
                  <GoRulesErrorBoundary>
                    <GoRulesEditor
                      entityContext={entities}
                      initialValue={goRulesData}
                      onChange={(value) => setGoRulesData(value)}
                      className="w-full h-full"
                    />
                  </GoRulesErrorBoundary>
                </div>

                <div className="p-4 border-t border-border bg-card flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {goRulesData ? "Changes made - save to persist" : "No changes yet"}
                  </div>
                  <button
                    onClick={handleSaveGoRules}
                    disabled={!goRulesData || isSavingRules}
                    className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#FF8400" }}
                  >
                    {isSavingRules ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Rules
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
