export interface Project {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconColor: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "active" | "archived";
  isDeleted: boolean;

  // Configuration (Step 1)
  stackType:
    | "nestjs-nextjs" // Option 1
    | "odata-ui5"; // Option 2
  port: number;
  databaseUrl?: string;

  // ERD Design (Step 2)
  erdCode?: string;
  erdValidationErrors?: ValidationError[];

  // Generation (Step 3)
  generatedPath?: string;
  deploymentStatus?:
    | "pending"
    | "generating"
    | "completed"
    | "failed"
    | "running"
    | "stopped"
    | "error";

  // Workflow Enhancement (Step 4)
  workflows?: WorkflowDefinition[];

  // Deployment (Step 5)
  deploymentUrl?: string;
  uptime?: string;
}

export interface ValidationError {
  line: number;
  message: string;
  severity: "error" | "warning";
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  serviceName: string;
  mermaidCode: string;
  description?: string;
}

export type ProjectStep = "init" | "design" | "generate" | "enhance" | "deploy";

export const STEP_ORDER: ProjectStep[] = ["init", "design", "generate", "enhance", "deploy"];

export const STEP_LABELS: Record<ProjectStep, string> = {
  init: "Init",
  design: "Design",
  generate: "Gen",
  enhance: "Enhance",
  deploy: "Deploy",
};

export const STACK_LABELS: Record<Project["stackType"], string> = {
  "nestjs-nextjs": "tanstackjs-nestjs: NestJS + TanStack Start",
  "odata-ui5": "openui5-odatav4: OData + OpenUI5",
};
