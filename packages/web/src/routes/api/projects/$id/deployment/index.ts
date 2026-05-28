import { createFileRoute } from "@tanstack/react-router";
import { deploymentDb } from "@erdwithai/core/services";

export const Route = createFileRoute("/api/projects/$id/deployment/")({ server: { handlers: {
  GET: async ({ request, params }) => {
    try {
      const id = params.id as string;
      const deployments = await deploymentDb.findByProjectId(id);
      return new Response(JSON.stringify({ deployments }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error fetching deployment:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch deployment" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },

  POST: async ({ request, params }) => {
    try {
      const id = params.id as string;
      const body = await request.json();
      const { status, port } = body;

      if (status === "running") {
        const result = await deploymentDb.create({
          projectId: id,
          status: "running",
          port,
          deployedAt: new Date().toISOString(),
        });
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      } else {
        const result = await deploymentDb.update(id, body);
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (error) {
      console.error("Error updating deployment:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Failed to update deployment",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },

  DELETE: async ({ request, params }) => {
    try {
      const id = params.id as string;
      await deploymentDb.delete(id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error stopping deployment:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Failed to stop deployment",
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
