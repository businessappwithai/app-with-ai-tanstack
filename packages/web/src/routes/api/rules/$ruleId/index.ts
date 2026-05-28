import { createFileRoute } from "@tanstack/react-router";
import { getDatabase } from "@erdwithai/core/services";

export const Route = createFileRoute("/api/rules/$ruleId/")({ server: { handlers: {
  GET: async ({ request, params }) => {
    try {
      const ruleId = params.ruleId as string;
      const db = await getDatabase();

      // TODO: Update to use actual rules engine table from new schema
      // Current implementation references old sys_rule table that doesn't exist

      return new Response(
        JSON.stringify({
          error: "Rule not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error fetching rule:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch rule" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
  },
  },
});
