import { createAPIFileRoute } from "@tanstack/start/api";
import { hookWorkflowDb } from "@erdwithai/core/services";

export const Route = createAPIFileRoute("/api/projects/$id/workflows/$serviceName/draft")({
  POST: async ({ request, params }) => {
    try {
      const projectId = params.id;
      const serviceName = params.serviceName;

      const body = await request.json();
      const { hooks, flowchartCode } = body;

      const workflow = await hookWorkflowDb.saveDraft({
        projectId,
        serviceName,
        hooks,
        flowchartCode,
      });

      return new Response(
        JSON.stringify({
          success: true,
          workflow,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error saving draft:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Failed to save draft",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
});
