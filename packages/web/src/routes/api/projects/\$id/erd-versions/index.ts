/**
 * ERD Versions API route
 * Handles history/versions for ERD diagrams
 */

import { createAPIFileRoute } from "@tanstack/start/api";
import { erdVersionDb } from "@erdwithai/core/services";

export const Route = createAPIFileRoute("/api/projects/$id/erd-versions")({
  GET: async ({ params }) => {
    try {
      const id = params.id;

      const versions = await erdVersionDb.getVersions(id);

      return new Response(JSON.stringify({ versions }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error fetching ERD versions:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch ERD versions" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },

  POST: async ({ request, params }) => {
    try {
      const id = params.id;
      const body = await request.json();
      const { mermaidCode, description, createdBy, validationErrors } = body;

      if (!mermaidCode) {
        return new Response(JSON.stringify({ error: "Mermaid code is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const version = await erdVersionDb.createVersion({
        project_id: id,
        mermaid_code: mermaidCode,
        description,
        created_by: createdBy,
        validation_errors: validationErrors,
        is_current: true,
      });

      return new Response(JSON.stringify({ version }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error creating ERD version:", error);
      return new Response(JSON.stringify({ error: "Failed to create ERD version" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});
