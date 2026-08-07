/**
 * One automation: read it, save it, remove it.
 *
 * The body carries mermaid rather than the builder's object model, so the
 * stored artifact stays the thing the generator reads and this endpoint never
 * becomes a second source of truth for what an automation is.
 */

import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const Route = createFileRoute("/api/projects/$id/automations/$automationId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { workflowDb } = await import("@erdwithai/core/services");
          const row = await workflowDb.findById(params.automationId);

          if (!row || row.project_id !== params.id) {
            return json({ error: "No automation with that id in this project." }, 404);
          }

          return json({
            automation: {
              id: row.id,
              name: row.name,
              serviceName: row.service_name,
              mermaid: row.mermaid_code,
              description: row.description ?? undefined,
              status: row.status ?? "draft",
              updatedAt: row.updated_at ?? undefined,
            },
          });
        } catch (error) {
          console.error("Failed to read automation:", error);
          return json({ error: "Failed to read automation" }, 500);
        }
      },

      PUT: async ({ request, params }) => {
        try {
          const body = (await request.json()) as {
            name?: string;
            entity?: string;
            mermaid?: string;
            description?: string;
            status?: string;
          };

          const { workflowDb } = await import("@erdwithai/core/services");
          const existing = await workflowDb.findById(params.automationId);
          if (!existing || existing.project_id !== params.id) {
            return json({ error: "No automation with that id in this project." }, 404);
          }

          const updated = await workflowDb.update(params.automationId, {
            ...(body.name !== undefined ? { name: body.name } : {}),
            ...(body.entity !== undefined ? { service_name: body.entity } : {}),
            ...(body.mermaid !== undefined ? { mermaid_code: body.mermaid } : {}),
            ...(body.description !== undefined ? { description: body.description } : {}),
            ...(body.status !== undefined ? { status: body.status } : {}),
          });

          return json({ automation: updated });
        } catch (error) {
          console.error("Failed to save automation:", error);
          return json({ error: "Failed to save automation" }, 500);
        }
      },

      DELETE: async ({ params }) => {
        try {
          const { workflowDb } = await import("@erdwithai/core/services");
          const existing = await workflowDb.findById(params.automationId);
          if (!existing || existing.project_id !== params.id) {
            return json({ error: "No automation with that id in this project." }, 404);
          }

          await workflowDb.delete(params.automationId);
          return json({ deleted: true });
        } catch (error) {
          console.error("Failed to delete automation:", error);
          return json({ error: "Failed to delete automation" }, 500);
        }
      },
    },
  },
});
