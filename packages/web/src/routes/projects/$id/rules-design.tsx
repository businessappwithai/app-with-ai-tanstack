import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Download,
  Eye,
  GitBranch,
  Loader2,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";
import mermaid from "mermaid";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ProgressStepper } from "@/components/ProgressStepper";
import { WizardStepHeader } from "@/components/WizardStepHeader";
import { useProjectStore } from "@/store/projectStore";

export const Route = createFileRoute("/projects/$id/rules-design")({
  component: RulesDesignPage,
});

const FLOWCHART_PLACEHOLDER = `flowchart TD
    A([Start: Order Received]) --> B{Order Amount > $1000?}
    B -->|Yes| C[Apply Premium Discount 15%]
    B -->|No| D{Customer is VIP?}
    D -->|Yes| E[Apply VIP Discount 10%]
    D -->|No| F[Apply Standard Pricing]
    C --> G(Calculate Final Price)
    E --> G
    F --> G
    G --> H([End: Price Calculated])`;

function RulesDesignPage() {
  const navigate = useNavigate();
  const { id: projectId } = Route.useParams();
  const { getProject, loadProject, setCurrentStep, goToNextStep, currentProject, isLoading } =
    useProjectStore();
  const project = getProject(projectId) || currentProject;

  useEffect(() => {
    if (!getProject(projectId) && !currentProject) {
      loadProject(projectId);
    }
  }, [projectId, getProject, currentProject, loadProject]);

  useEffect(() => {
    if (project) {
      setCurrentStep("rules");
    }
  }, [project, setCurrentStep]);

  const [activeTab, setActiveTab] = useState<"flowchart" | "jdm">("flowchart");
  const [flowchartCode, setFlowchartCode] = useState(FLOWCHART_PLACEHOLDER);
  const [jdmCode, setJdmCode] = useState("");
  const [svgBlobUrl, setSvgBlobUrl] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ step: string; message: string; progress: number } | null>(null);
  const [aiStepsLog, setAiStepsLog] = useState<
    Array<{ id: string; step: string; message: string; status: "in-progress" | "completed" | "error" }>
  >([]);
  const [showAiDetails, setShowAiDetails] = useState(false);

  const prevBlobUrlRef = useRef<string>("");

  mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    securityLevel: "loose",
    suppressErrorRendering: true,
  });

  const renderFlowchart = useCallback(async (code: string) => {
    if (!code.trim() || code.trim() === "flowchart TD") {
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
        prevBlobUrlRef.current = "";
      }
      setSvgBlobUrl("");
      setRenderError(null);
      return;
    }

    try {
      const id = `mermaid-rules-${Date.now()}`;
      const { svg } = await mermaid.render(id, code);
      const orphan = document.getElementById(`d${id}`);
      orphan?.remove();

      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
      }

      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      prevBlobUrlRef.current = url;
      setSvgBlobUrl(url);
      setRenderError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setRenderError(msg);
      setSvgBlobUrl("");
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => renderFlowchart(flowchartCode), 800);
    return () => clearTimeout(timer);
  }, [flowchartCode, renderFlowchart]);

  useEffect(() => {
    return () => {
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
      }
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const sanitizedName = (project?.name ?? "export").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const filename = `${sanitizedName}-rules.mmd`;
    try {
      await fetch("/api/mermaid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          projectName: project?.name ?? "export",
          filename,
          type: "rules",
          content: flowchartCode,
        }),
      });
    } catch (_e) {
      // non-blocking
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  const handleExportMmd = () => {
    const sanitizedName = (project?.name ?? "export").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const blob = new Blob([flowchartCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizedName}-rules.mmd`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJdm = () => {
    if (!jdmCode) return;
    const sanitizedName = (project?.name ?? "export").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const blob = new Blob([jdmCode], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizedName}-rules.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConvertToJdm = async () => {
    setIsConverting(true);
    try {
      const response = await fetch("/api/ai/rules-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "convert-to-jdm",
          flowchartCode,
          projectId,
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      let buffer = "";
      let collectedJdm = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.jdm) {
              collectedJdm = typeof data.jdm === "string" ? data.jdm : JSON.stringify(data.jdm, null, 2);
            }
          }
        }
      }

      if (collectedJdm) {
        setJdmCode(collectedJdm);
        setActiveTab("jdm");

        // Save JDM to server
        const sanitizedName = (project?.name ?? "export").replace(/[^a-z0-9]/gi, "_").toLowerCase();
        await fetch("/api/mermaid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            projectName: project?.name ?? "export",
            filename: `${sanitizedName}-rules.json`,
            type: "rules",
            content: collectedJdm,
          }),
        }).catch(() => undefined);
      }
    } catch (err) {
      console.error("JDM conversion error:", err);
    } finally {
      setIsConverting(false);
    }
  };

  const handleAiSubmit = async () => {
    if (!aiInput.trim()) return;
    setIsAiLoading(true);
    setAiStepsLog([]);
    setAiStatus({ step: "starting", message: "Connecting to AI service...", progress: 5 });

    try {
      const response = await fetch("/api/ai/rules-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-flowchart",
          description: aiInput,
          currentFlowchartCode: flowchartCode,
          projectId,
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      let buffer = "";
      let finalFlowchart = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));

            if (data.step && data.message) {
              const progress = { starting: 10, analyzing: 30, generating: 60, complete: 100, error: 0 }[data.step as string] ?? 50;
              setAiStatus({ step: data.step, message: data.message, progress });
              setAiStepsLog((prev) => [
                ...prev.filter((s) => s.step !== data.step),
                {
                  id: `${data.step}-${Date.now()}`,
                  step: data.step,
                  message: data.message,
                  status: data.step === "complete" ? "completed" : data.step === "error" ? "error" : "in-progress",
                },
              ]);
            }

            if (data.flowchartCode) {
              finalFlowchart = data.flowchartCode;
              setFlowchartCode(data.flowchartCode);
            }

            if (data.step === "error") throw new Error(data.message);
          }
        }
      }

      if (finalFlowchart) {
        setAiInput("");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setAiStatus({ step: "error", message: msg, progress: 0 });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleContinue = async () => {
    await handleSave();
    goToNextStep();
    navigate({ to: "/projects/$id/generate", params: { id: projectId } });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Zap className="w-6 h-6 text-blue-600 animate-pulse" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Project not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <WizardStepHeader
            stepNumber={3}
            title="Define Business Rules"
            description="Design your business logic as a Mermaid flowchart. The AI will help you model decision flows and convert them to executable GoRules JDM format."
            estimatedTime="5-10 min"
          />

          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Draft"}
            </button>
            <button
              onClick={handleExportMmd}
              className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground font-medium rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" />
              Export .mmd
            </button>
            {jdmCode && (
              <button
                onClick={handleExportJdm}
                className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground font-medium rounded-xl transition-colors"
              >
                <Download className="w-4 h-4" />
                Export JDM
              </button>
            )}
            <button
              onClick={handleConvertToJdm}
              disabled={isConverting || !flowchartCode.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {isConverting ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
              {isConverting ? "Converting..." : "Convert to JDM"}
            </button>
            <button
              onClick={handleContinue}
              className="flex items-center gap-2 px-6 py-2 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98]"
              style={{ backgroundColor: "#FF8400" }}
            >
              <Zap className="w-4 h-4" />
              Continue to Step 4
            </button>
          </div>

          <ProgressStepper
            currentStep="rules"
            completedSteps={["init", "design"]}
            onStepClick={(step) => {
              if (step === "init") navigate({ to: "/projects/$id/init", params: { id: projectId } });
              else if (step === "design") navigate({ to: "/projects/$id/design", params: { id: projectId } });
              else if (step === "generate") navigate({ to: "/projects/$id/generate", params: { id: projectId } });
              else if (step === "enhance") navigate({ to: "/projects/$id/enhance", params: { id: projectId } });
              else if (step === "deploy") navigate({ to: "/projects/$id/deploy", params: { id: projectId } });
            }}
          />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Editor */}
        <div className="w-1/2 border-r border-border flex flex-col bg-white dark:bg-slate-950">
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("flowchart")}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === "flowchart"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Code2 className="w-4 h-4" />
              Mermaid Flowchart
            </button>
            <button
              onClick={() => setActiveTab("jdm")}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === "jdm"
                  ? "border-b-2 border-purple-500 text-purple-500"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GitBranch className="w-4 h-4" />
              GoRules JDM
              {jdmCode && (
                <span className="ml-1 w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
          </div>

          <div className="flex-1 p-6 overflow-auto">
            {activeTab === "flowchart" ? (
              <textarea
                value={flowchartCode}
                onChange={(e) => setFlowchartCode(e.target.value)}
                className="w-full h-[calc(100vh-380px)] p-4 bg-slate-50 dark:bg-slate-900 border border-border rounded-xl text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                spellCheck={false}
                placeholder={FLOWCHART_PLACEHOLDER}
              />
            ) : (
              <div className="relative">
                <textarea
                  value={jdmCode}
                  onChange={(e) => setJdmCode(e.target.value)}
                  className="w-full h-[calc(100vh-380px)] p-4 bg-slate-50 dark:bg-slate-900 border border-border rounded-xl text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  spellCheck={false}
                  placeholder='JDM JSON will appear here after clicking "Convert to JDM"...'
                  readOnly={!jdmCode}
                />
                {!jdmCode && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <GitBranch className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-30" />
                      <p className="text-sm text-muted-foreground">
                        Click "Convert to JDM" to generate GoRules JSON Decision Model
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="w-1/2 flex flex-col bg-slate-50 dark:bg-slate-900">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Eye className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Live Preview</h2>
            {renderError && (
              <span className="ml-auto text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Syntax error
              </span>
            )}
          </div>

          <div className="flex-1 overflow-auto p-6 bg-white dark:bg-slate-900">
            {svgBlobUrl ? (
              <img
                src={svgBlobUrl}
                alt="Business rules flowchart"
                className="w-full h-auto"
              />
            ) : renderError ? (
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                    Flowchart syntax error
                  </p>
                  <p className="text-xs font-mono text-red-600 dark:text-red-400">{renderError}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-center">
                <div>
                  <GitBranch className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-sm font-medium text-muted-foreground">No flowchart yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Edit the Mermaid flowchart on the left or use the AI assistant below to generate one
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Assistant */}
      <div className="bg-white dark:bg-slate-950 border-t border-border">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span className="font-medium">AI Assistant</span>
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAiSubmit();
                }}
                placeholder="Describe your business rule... e.g. 'Discount 20% for orders over $500 from VIP customers' (Cmd+Enter)"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isAiLoading}
              />
            </div>
            <button
              onClick={handleAiSubmit}
              disabled={isAiLoading || !aiInput.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
          </div>

          {aiStatus && (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-purple-600 h-full transition-all duration-300"
                    style={{ width: `${aiStatus.progress}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground min-w-[50px] text-right">
                  {aiStatus.progress}%
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                {aiStatus.step === "complete" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : aiStatus.step === "error" ? (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                )}
                <span
                  className={
                    aiStatus.step === "complete"
                      ? "text-emerald-600"
                      : aiStatus.step === "error"
                        ? "text-red-600"
                        : "text-muted-foreground"
                  }
                >
                  {aiStatus.message}
                </span>
              </div>

              {aiStepsLog.length > 0 && (
                <button
                  onClick={() => setShowAiDetails(!showAiDetails)}
                  className="mt-2 flex items-center gap-1 text-xs text-purple-600 hover:underline"
                >
                  {showAiDetails ? (
                    <>
                      <ChevronUp className="w-3 h-3" />
                      Hide steps
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" />
                      Show steps ({aiStepsLog.length})
                    </>
                  )}
                </button>
              )}

              {showAiDetails && aiStepsLog.length > 0 && (
                <div className="mt-2 space-y-1">
                  {aiStepsLog.map((s) => (
                    <div
                      key={s.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                        s.status === "completed"
                          ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700"
                          : s.status === "error"
                            ? "bg-red-50 dark:bg-red-950/30 text-red-700"
                            : "bg-purple-50 dark:bg-purple-950/30 text-purple-700"
                      }`}
                    >
                      {s.status === "completed" ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : s.status === "error" ? (
                        <AlertCircle className="w-3 h-3" />
                      ) : (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      )}
                      {s.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button
              onClick={() => setAiInput("Order discount: 20% off for orders over $500, 10% for VIP customers")}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
            >
              Order Discount
            </button>
            <button
              onClick={() => setAiInput("Patient triage: Emergency if vital signs critical, Urgent if fever above 38.5°C, else Standard")}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
            >
              Patient Triage
            </button>
            <button
              onClick={() => setAiInput("Loan approval: Approve if credit score > 700 and income > $50k, else reject or manual review")}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
            >
              Loan Approval
            </button>
            <button
              onClick={() => setAiInput("Inventory reorder: If stock below reorder point, create PO. If critical stock, expedite order")}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
            >
              Inventory Reorder
            </button>
          </div>

          <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/30 rounded-lg text-xs text-purple-700 dark:text-purple-300">
            <RefreshCw className="w-4 h-4 flex-shrink-0" />
            <span>
              Flowchart uses Mermaid <code className="font-mono">flowchart TD</code> syntax.
              Nodes: <code className="font-mono">A([Start/End])</code>, <code className="font-mono">B{"{"}</code>Decision<code className="font-mono">{"}"}</code>, <code className="font-mono">C[Action]</code>, <code className="font-mono">D((Function))</code>.
              Convert to GoRules JDM for runtime execution in generated apps.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
