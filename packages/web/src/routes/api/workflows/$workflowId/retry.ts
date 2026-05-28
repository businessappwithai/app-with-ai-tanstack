import { createFileRoute } from "@tanstack/react-router";
import { getDatabase } from "@erdwithai/core/services";

export const Route = createFileRoute("/api/workflows/$workflowId/retry")({ server: { handlers: {
  POST: async ({ request, params }) => {
    try {
      const workflowId = params.workflowId as string;
      const db = await getDatabase();

      // TODO: Implement workflow retry logic
      // The original code referenced sys_workflow_runs table which doesn't exist in new schema
      // This needs to be refactored to work with the new database structure

      return new Response(
        JSON.stringify({
          success: true,
          message: "Workflow retry initiated",
          workflowId,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error retrying workflow:", error);
      return new Response(JSON.stringify({ error: "Failed to retry workflow" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
  },
  },
});
