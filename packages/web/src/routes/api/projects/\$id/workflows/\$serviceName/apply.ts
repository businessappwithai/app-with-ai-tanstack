import { createAPIFileRoute } from "@tanstack/start/api";
import { hookWorkflowDb } from "@erdwithai/core/services";
import mermaid from "mermaid";

export const Route = createAPIFileRoute("/api/projects/$id/workflows/$serviceName/apply")({
  POST: async ({ request, params }) => {
    try {
      const projectId = params.id;
      const serviceName = params.serviceName;

      const body = await request.json();
      const { hooks, flowchartCode, generatedHookCode, description } = body;

      // Validate Mermaid syntax
      try {
        const id = `validate-${Date.now()}`;
        await mermaid.render(id, flowchartCode);
      } catch (mermaidError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid Mermaid syntax",
            validationErrors: [
              mermaidError instanceof Error ? mermaidError.message : "Unknown error",
            ],
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Validate hook definitions
      const validationErrors: string[] = [];

      for (const hook of hooks) {
        if (!hook.type || !hook.name || !hook.entity) {
          validationErrors.push(
            `Invalid hook definition at order ${hook.order}: missing required fields`
          );
        }

        // Validate hook type
        const validHookTypes = [
          "beforeCreate",
          "afterCreate",
          "beforeUpdate",
          "afterUpdate",
          "beforeDelete",
          "afterDelete",
          "beforeQuery",
          "afterQuery",
          "customValidate",
        ];

        if (!validHookTypes.includes(hook.type)) {
          validationErrors.push(`Invalid hook type: ${hook.type}`);
        }

        // Validate hook name format
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(hook.name)) {
          validationErrors.push(
            `Invalid hook name: ${hook.name}. Must start with letter or underscore`
          );
        }
      }

      if (validationErrors.length > 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Validation failed",
            validationErrors,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Apply workflow with validation passed
      const workflow = await hookWorkflowDb.apply({
        projectId,
        serviceName,
        hooks,
        flowchartCode,
        generatedHookCode,
        description,
      });

      return new Response(
        JSON.stringify({
          success: true,
          workflow,
          validationErrors: [],
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error applying workflow:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Failed to apply workflow",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
});
