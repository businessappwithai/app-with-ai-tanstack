import { createFileRoute } from "@tanstack/react-router";
import { getDatabase } from "@erdwithai/core/services";

export const Route = createFileRoute("/api/workflows/$workflowId/")({ server: { handlers: {
  GET: async ({ request, params }) => {
    try {
      const workflowId = params.workflowId as string;
      const db = await getDatabase();
      const workflow = await db
        .selectFrom("workflows")
        .selectAll()
        .where("id", "=", workflowId)
        .executeTakeFirst();

      if (!workflow) {
        return new Response(JSON.stringify({ error: "Workflow not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(workflow), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error fetching workflow:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch workflow" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
  },
  },
});
