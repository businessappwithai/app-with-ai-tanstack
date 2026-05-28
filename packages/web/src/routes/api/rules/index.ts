import { createFileRoute } from "@tanstack/react-router";
import { getDatabase } from "@erdwithai/core/services";

export const Route = createFileRoute("/api/rules/")({ server: { handlers: {
  GET: async ({ request }) => {
    try {
      const url = new URL(request.url);
      const entity = url.searchParams.get("entity");
      const operation = url.searchParams.get("operation");

      const db = await getDatabase();

      // TODO: Update to use actual rules engine table from new schema
      // Current implementation references old sys_rule table that doesn't exist
      // This is a placeholder that returns empty rules

      return new Response(
        JSON.stringify({
          rules: [],
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error fetching rules:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch rules" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },

  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const { entityName, ruleName, operation, jdmContent } = body;

      if (!entityName || !ruleName || !operation || !jdmContent) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const errors: string[] = [];
      if (!jdmContent.name) {
        errors.push("Rule name is required");
      }
      if (!jdmContent.nodes || jdmContent.nodes.length === 0) {
        errors.push("At least one node is required");
      }

      if (errors.length > 0) {
        return new Response(JSON.stringify({ error: "Invalid JDM content", errors }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // TODO: Use RulesEngineService to create rule
      return new Response(JSON.stringify({ success: true, id: "rule_placeholder" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error creating rule:", error);
      return new Response(JSON.stringify({ error: "Failed to create rule" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
  },
  },
});
