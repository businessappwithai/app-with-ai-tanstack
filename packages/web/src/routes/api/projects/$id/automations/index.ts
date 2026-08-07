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

/**
 * The entity names and columns the builder's pickers offer.
 *
 * Parsed from the project's current ERD here rather than fetched separately,
 * because the builder needs them on the same first paint as the automations —
 * an entity picker with nothing in it cannot even show the trigger a saved
 * automation already has.
 *
 * Deliberately a small reader over the `Entity { type name }` blocks rather
 * than the full generator parser: this needs names and columns, and pulling the
 * whole generator into a request path to get them would cost far more than it
 * returns.
 */
function entitiesFromErd(mermaid: string): { name: string; attributes: { name: string }[] }[] {
  const entities: { name: string; attributes: { name: string }[] }[] = [];
  let current: { name: string; attributes: { name: string }[] } | null = null;

  for (const raw of mermaid.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("%%")) continue;

    const open = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\{$/);
    if (open?.[1] && open[1] !== "erDiagram") {
      current = { name: open[1], attributes: [] };
      entities.push(current);
      continue;
    }

    if (line === "}") {
      current = null;
      continue;
    }

    if (current) {
      // `type name`, optionally followed by PK/FK and a "comment".
      const attr = line.match(/^[A-Za-z_][A-Za-z0-9_[\]]*\s+([A-Za-z_][A-Za-z0-9_]*)/);
      if (attr?.[1]) current.attributes.push({ name: attr[1] });
    }
  }

  return entities;
}

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

          // The current ERD, so the builder's pickers have something in them.
          const { getDb } = await import("@erdwithai/core/config");
          const erd = await getDb()
            .selectFrom("erd_versions")
            .select(["mermaid_code"])
            .where("project_id", "=", params.id)
            .orderBy("is_current", "desc")
            .orderBy("version_number", "desc")
            .executeTakeFirst();

          const entities = erd?.mermaid_code ? entitiesFromErd(erd.mermaid_code) : [];

          return new Response(JSON.stringify({ automations, entities }), {
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
