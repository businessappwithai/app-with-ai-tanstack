import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/projects/$id/workflows/$serviceName/files/$fileName")({ server: { handlers: {
  PUT: async ({ request, params }) => {
    try {
      const body = await request.json();
      const { code } = body;

      if (!code || typeof code !== "string") {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Code is required",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // TODO: Implement file save logic
      return new Response(
        JSON.stringify({
          success: true,
          message: "File saved successfully",
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error saving file:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Failed to save file",
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
