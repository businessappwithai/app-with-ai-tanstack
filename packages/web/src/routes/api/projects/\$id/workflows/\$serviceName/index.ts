/**
 * Service-specific workflow API route
 * Handles workflow operations for a specific service
 */

import { createAPIFileRoute } from "@tanstack/start/api";
import { hookWorkflowDb } from "@erdwithai/core/services";

export const Route = createAPIFileRoute("/api/projects/$id/workflows/$serviceName")({
  GET: async ({ params }) => {
    try {
      const projectId = params.id;
      const serviceName = params.serviceName;

      const workflow = await hookWorkflowDb.getByService(projectId, serviceName);

      if (!workflow) {
        return new Response(
          JSON.stringify({
            success: true,
            workflow: null,
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }

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
      console.error("Error fetching workflow:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch workflow",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
});
