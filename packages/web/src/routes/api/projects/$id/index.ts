import { createFileRoute } from "@tanstack/react-router";
import { projectDb } from "@erdwithai/core/services";

export const Route = createFileRoute("/api/projects/$id/")({ server: { handlers: {
  GET: async ({ request, params }) => {
    try {
      const id = params.id as string;

      const project = await projectDb.findById(id);

      if (!project) {
        return new Response(JSON.stringify({ error: "Project not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ project }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error fetching project:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch project" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },

  PATCH: async ({ request, params }) => {
    try {
      const id = params.id as string;
      const body = await request.json();

      const project = await projectDb.update(id, body);

      if (!project) {
        return new Response(JSON.stringify({ error: "Project not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ project }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error updating project:", error);
      return new Response(JSON.stringify({ error: "Failed to update project" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },

  DELETE: async ({ request, params }) => {
    try {
      const id = params.id as string;

      await projectDb.softDelete(id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error deleting project:", error);
      return new Response(JSON.stringify({ error: "Failed to delete project" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
  },
  },
});
