import { createAPIFileRoute } from "@tanstack/start/api";
import { hookWorkflowDb } from "@erdwithai/core/services";

export const Route = createAPIFileRoute("/api/projects/$id/workflows/$serviceName/gorules")({
  POST: async ({ request, params }) => {
    try {
      const projectId = params.id;
      const serviceName = params.serviceName;

      const body = await request.json();
      const { workflowId, hookType, rules } = body;

      // Validate request body
      if (!workflowId || !hookType || !rules) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Missing required fields: workflowId, hookType, and rules are required",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Validate GoRules structure
      if (!rules.name || !Array.isArray(rules.nodes) || !Array.isArray(rules.edges)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid GoRules structure. Must have name, nodes array, and edges array.",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Save GoRules configuration to database
      const result = await hookWorkflowDb.saveGoRules({
        projectId,
        serviceName,
        workflowId,
        hookType,
        rules: JSON.stringify(rules),
      });

      return new Response(
        JSON.stringify({
          success: true,
          result,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error saving GoRules:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Failed to save GoRules configuration",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
});
