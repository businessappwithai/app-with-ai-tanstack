/**
 * Deployment API route
 * Handles deployment operations for a project
 */

import { createAPIFileRoute } from "@tanstack/start/api";
import { deploymentApi } from "@/lib/api/deployment";

export const Route = createAPIFileRoute("/api/projects/$id/deployment")({
  GET: async ({ params }) => {
    try {
      const id = params.id;
      const result = await deploymentApi.getDeployment(id);
      return new Response(JSON.stringify(result), {
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
      const id = params.id;
      const body = await request.json();
      const { status, port } = body;

      if (status === "running") {
        const result = await deploymentApi.start(id, port);
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      } else {
        const result = await deploymentApi.upsert(id, body);
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

  DELETE: async ({ params }) => {
    try {
      const id = params.id;
      const result = await deploymentApi.stop(id);
      return new Response(JSON.stringify(result), {
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
});
