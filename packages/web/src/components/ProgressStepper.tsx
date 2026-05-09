"use client";

import { Check } from "lucide-react";
import React from "react";
import type { ProjectStep } from "@/types/project";

const steps: Array<{ key: ProjectStep; label: string; number: number }> = [
  { key: "init", label: "Init", number: 1 },
  { key: "design", label: "Design", number: 2 },
  { key: "generate", label: "Gen", number: 3 },
  { key: "enhance", label: "Enhance", number: 4 },
  { key: "deploy", label: "Deploy", number: 5 },
];

interface ProgressStepperProps {
  currentStep: ProjectStep;
  completedSteps?: ProjectStep[];
  onStepClick?: (step: ProjectStep) => void;
}

export function ProgressStepper({
  currentStep,
  completedSteps = [],
  onStepClick,
}: ProgressStepperProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between relative max-w-3xl mx-auto">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.key) || index < currentIndex;
          const isCurrent = step.key === currentStep;
          const isClickable = onStepClick && (isCompleted || isCurrent);

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center z-10 gap-2">
                <button
                  onClick={() => isClickable && onStepClick(step.key)}
                  disabled={!isClickable}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isCurrent
                      ? "bg-primary text-white ring-4 ring-primary/20"
                      : isCompleted
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                        : "bg-muted border border-border text-muted-foreground"
                  } ${isClickable ? "cursor-pointer hover:scale-110" : "cursor-default"}`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-bold">{step.number}</span>
                  )}
                </button>
                <span
                  className={`text-[10px] uppercase tracking-widest font-semibold ${
                    isCurrent
                      ? "text-primary"
                      : isCompleted
                        ? "text-emerald-400"
                        : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-[2px] mx-1 -mt-6 ${
                    index < currentIndex ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
