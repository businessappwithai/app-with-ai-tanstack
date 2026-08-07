/**
 * Automations for a project.
 *
 * Stored in the existing `workflows` table as mermaid, because that is what the
 * generator already reads. The builder is a new way to write the same artifact,
 * not a new artifact — so an automation saved here is picked up by code
 * generation with no further translation, and one written before the builder
 * existed opens in it.
 */

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/projects/$id/automations/")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { workflowDb } = await import("@erdwithai/core/services");
          const rows = await workflowDb.getWorkflows(params.id);

          const automations = rows
            .filter((row) => (row.workflow_type ?? "") === "automation")
            .map((row) => ({
              id: row.id,
              name: row.name,
              serviceName: row.service_name,
              mermaid: row.mermaid_code,
              description: row.description ?? undefined,
              updatedAt: row.updated_at ?? row.created_at ?? undefined,
            }));

          return new Response(JSON.stringify({ automations }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Failed to list automations:", error);
          return new Response(JSON.stringify({ error: "Failed to list automations" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },

      POST: async ({ request, params }) => {
        try {
          const body = (await request.json()) as {
            name?: string;
            entity?: string;
            mermaid?: string;
            description?: string;
          };

          if (!body.name?.trim() || !body.mermaid?.trim()) {
            return new Response(
              JSON.stringify({ error: "An automation needs a name and its mermaid source." }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const { workflowDb } = await import("@erdwithai/core/services");
          const created = await workflowDb.create({
            project_id: params.id,
            name: body.name,
            service_name: body.entity ?? "",
            workflow_type: "automation",
            mermaid_code: body.mermaid,
            description: body.description ?? "",
          });

          return new Response(JSON.stringify({ automation: created }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Failed to create automation:", error);
          return new Response(JSON.stringify({ error: "Failed to create automation" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
