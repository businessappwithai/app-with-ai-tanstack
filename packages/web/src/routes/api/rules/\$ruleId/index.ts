import { createAPIFileRoute } from "@tanstack/start/api";
import { getDatabase } from "@erdwithai/core/services";

export const Route = createAPIFileRoute("/api/rules/$ruleId")({
  GET: async ({ params }) => {
    try {
      const db = getDatabase();

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
});
