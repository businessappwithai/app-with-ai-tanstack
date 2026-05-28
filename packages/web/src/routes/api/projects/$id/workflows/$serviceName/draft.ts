import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/projects/$id/workflows/$serviceName/draft")({ server: { handlers: {
  POST: async ({ request, params }) => {
    try {
      const body = await request.json();

      // TODO: Implement workflow draft logic
      return new Response(
        JSON.stringify({
          success: true,
          message: "Workflow draft created successfully",
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error creating workflow draft:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Failed to create workflow draft",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
  },
  },
});
