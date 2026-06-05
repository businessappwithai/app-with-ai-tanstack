import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Database,
  Loader2,
  Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { JourneyArc } from "@/components/JourneyArc";
import { ProgressStepper } from "@/components/ProgressStepper";
import { WizardStepHeader } from "@/components/WizardStepHeader";
import { useProjectStore } from "@/store/projectStore";
import type { Project } from "@/types/project";

type StackType = Project["stackType"];

export const Route = createFileRoute("/projects/$id/generate")({
  component: GeneratePage,
});

interface StackOption {
  id: StackType;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  category: "fullstack" | "backend";
}

const stackOptions: StackOption[] = [
  {
    id: "tanstackjs-nestjs",
    title: "tanstackjs-nestjs: NestJS + TanStack Start",
    description: "Enterprise-grade backend with modern React frontend",
    icon: <Database className="w-8 h-8" />,
    features: [
      "NestJS REST API",
      "Knex.js with PostgreSQL",
      "TanStack Start Frontend",
      "Monorepo Architecture",
      "API on 4001, Frontend on 3000",
    ],
    category: "fullstack",
  },
];

interface LogEntry {
  timestamp: string;
  level: "info" | "success" | "error" | "warning";
  message: string;
}

function GeneratePage() {
  const navigate = useNavigate();
  const { id: projectId } = Route.useParams();

  const { currentProject, loadProject, updateProject, setCurrentStep } = useProjectStore();

  const [localProject, setLocalProject] = useState<Project | null>(null);
  const [selectedStack, setSelectedStack] = useState<StackType | null>(null);
  const [selectedDatabase] = useState<"sqlite" | "postgresql">("postgresql");
  const [selectedPort, setSelectedPort] = useState<number>(9001);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isGenerated = localProject?.generatedPath && localProject.deploymentStatus === "completed";
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkPort = async () => {
      for (let port = 9001; port <= 9999; port++) {
        try {
          await fetch(`http://localhost:${port}`, { mode: "no-cors" });
        } catch {
          setSelectedPort(port);
          return;
        }
      }
      setSelectedPort(9001);
    };

    if (!isGenerated) {
      checkPort();
    }
  }, [isGenerated]);

  useEffect(() => {
    const initProject = async () => {
      if (projectId) {
        await loadProject(projectId);
      }
    };
    initProject();
  }, [projectId, loadProject]);

  useEffect(() => {
    if (currentProject && currentProject.id === projectId) {
      setLocalProject(currentProject);
      setSelectedStack(currentProject.stackType);
      setCurrentStep("generate");
    }
  }, [currentProject, projectId, setCurrentStep]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (level: LogEntry["level"], message: string) => {
    setLogs((prev) => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
      },
    ]);
  };

  const handleGenerate = async () => {
    if (!selectedStack || !localProject) return;

    setIsGenerating(true);
    setGenerationComplete(false);
    setError(null);
    setLogs([]);

    try {
      addLog("info", "Starting generation process...");
      addLog("info", `Selected stack: ${selectedStack}`);
      addLog("info", "Reading ERD definition...");

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          stackType: selectedStack,
          database: selectedDatabase,
          port: selectedPort,
          erdCode: localProject.erdCode,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.log) {
                  addLog(data.level || "info", data.log);
                }
                if (data.complete) {
                  setGenerationComplete(true);
                  updateProject(projectId, {
                    generatedPath: data.generatedPath,
                    deploymentStatus: "completed",
                  });
                }
                if (data.error) {
                  setError(data.error);
                  addLog("error", data.error);
                }
              } catch (e) {
                console.error("Failed to parse log:", e);
              }
            }
          }
        }
      }

      addLog("success", "Generation completed successfully!");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMsg);
      addLog("error", errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContinue = () => {
    navigate({ to: "/projects/$id/enhance", params: { id: projectId } });
  };

  if (!localProject) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <WizardStepHeader
            stepNumber={4}
            title="Generate Your Application"
            description="Select your tech stack and watch the code generation happen in real-time. Your full-stack application will be ready to deploy."
            estimatedTime="3-5 min"
          />

          <ProgressStepper
            currentStep="generate"
            onStepClick={(step) => {
              if (step === "init") {
                navigate({ to: "/projects/$id/init", params: { id: projectId } });
              } else if (step === "design") {
                navigate({ to: "/projects/$id/design", params: { id: projectId } });
              } else if (step === "enhance") {
                navigate({ to: "/projects/$id/enhance", params: { id: projectId } });
              } else if (step === "deploy") {
                navigate({ to: "/projects/$id/deploy", params: { id: projectId } });
              }
            }}
          />

          <JourneyArc currentStep="generate" />
        </div>
      </header>

      <div className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-6">
          {!isGenerating && !generationComplete && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {stackOptions.map((stack) => (
                <div
                  key={stack.id}
                  onClick={() => setSelectedStack(stack.id)}
                  className={`bg-card border-2 rounded-2xl p-6 cursor-pointer transition-all ${
                    selectedStack === stack.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="text-primary">{stack.icon}</div>
                    <h3 className="font-bold text-lg">{stack.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{stack.description}</p>
                  <ul className="space-y-2">
                    {stack.features.map((feature) => (
                      <li
                        key={feature}
                        className="text-xs text-muted-foreground flex items-center gap-2"
                      >
                        <div className="h-1 w-1 rounded-full bg-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {!isGenerating && !generationComplete && (
            <div className="mt-8 flex gap-4">
              <button
                onClick={handleGenerate}
                disabled={!selectedStack || isGenerating}
                className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg rounded-2xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-50"
                style={{ backgroundColor: "#FF8400" }}
              >
                <Zap className="w-5 h-5" />
                Generate Application
              </button>
            </div>
          )}

          {(isGenerating || generationComplete || error) && (
            <div className="bg-card rounded-2xl p-6 border border-border font-mono text-sm overflow-hidden">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="ml-4 text-muted-foreground">Generation Logs</span>
                {isGenerating && (
                  <span
                    className="ml-auto px-3 py-1 text-xs rounded-full font-sans"
                    style={{ backgroundColor: "rgba(255, 132, 0, 0.2)", color: "#FF8400" }}
                  >
                    IN PROGRESS
                  </span>
                )}
                {generationComplete && (
                  <span className="ml-auto px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-sans">
                    COMPLETED
                  </span>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {logs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 ${
                      log.level === "error"
                        ? "text-red-400"
                        : log.level === "success"
                          ? "text-emerald-400"
                          : log.level === "warning"
                            ? "text-yellow-400"
                            : "text-muted-foreground"
                    }`}
                  >
                    <span className="text-muted-foreground select-none">[{log.timestamp}]</span>
                    <span className="flex-1">{log.message}</span>
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </div>
                )}
                <div ref={logsEndRef} />
              </div>

              {generationComplete && !error && (
                <button
                  onClick={handleContinue}
                  className="mt-6 w-full flex items-center justify-center gap-3 px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg rounded-2xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
                  style={{ backgroundColor: "#FF8400" }}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Continue to Enhancement
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
