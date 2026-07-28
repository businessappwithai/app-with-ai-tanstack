import { erdVersionDb } from "@erdwithai/core/services";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/projects/$id/erd-versions/$versionId/restore")({
  server: {
    handlers: {
      POST: async ({ params }) => {
        try {
          const versionId = params.versionId as string;

          const version = await erdVersionDb.setCurrentVersion(versionId);

          if (!version) {
            return new Response(JSON.stringify({ error: "Version not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(JSON.stringify({ version }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Error restoring ERD version:", error);
          return new Response(JSON.stringify({ error: "Failed to restore ERD version" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },

      DELETE: async ({ params }) => {
        try {
          const versionId = params.versionId as string;

          await erdVersionDb.delete(versionId);

          return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Error deleting ERD version:", error);
          return new Response(JSON.stringify({ error: "Failed to delete ERD version" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
