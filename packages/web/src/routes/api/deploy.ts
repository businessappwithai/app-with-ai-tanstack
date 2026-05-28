import { createFileRoute } from "@tanstack/react-router";
import { projectDb } from "@erdwithai/core/services";

export const Route = createFileRoute("/api/deploy")({ server: { handlers: {
  POST: async ({ request }) => {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendLog = (level: string, message: string) => {
          const data = `data: ${JSON.stringify({ log: message, level })}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        const sendComplete = (url: string) => {
          const data = `data: ${JSON.stringify({ complete: true, url })}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        const sendError = (error: string) => {
          const data = `data: ${JSON.stringify({ error })}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        try {
          const body = await request.json();
          const { projectId, envVars } = body;

          if (!projectId) {
            sendError("Missing required field: projectId");
            controller.close();
            return;
          }

          const project = await projectDb.findById(projectId);
          if (!project) {
            sendError("Project not found");
            controller.close();
            return;
          }

          sendLog("info", "Initializing local deployment...");
          await new Promise((resolve) => setTimeout(resolve, 500));

          // TODO: Implement full deployment logic
          // - Validate environment variables
          // - Start local server
          // - Monitor deployment
          // - Stream logs

          sendLog("info", "Starting server...");
          sendLog("success", "Deployment complete");
          sendComplete(`http://localhost:${project.port}`);
          controller.close();
        } catch (error) {
          console.error("Deployment error:", error);
          sendError(error instanceof Error ? error.message : "Deployment failed");
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  },
  },
  },
});
