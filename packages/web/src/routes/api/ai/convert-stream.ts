import { convertToMermaid } from "@erdwithai/ai";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ai/convert-stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { description } = body;

          if (!description || typeof description !== "string") {
            return new Response(JSON.stringify({ error: "Description is required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const encoder = new TextEncoder();

          const stream = new ReadableStream({
            async start(controller) {
              const send = (data: Record<string, unknown>) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
              };

              try {
                send({
                  step: "analyzing",
                  message: "Analyzing business domain and entity relationships...",
                });

                const mermaidSyntax = await convertToMermaid(description);

                if (!mermaidSyntax) {
                  send({
                    step: "error",
                    message: "AI returned an empty diagram — please try again with more detail.",
                  });
                  controller.close();
                  return;
                }

                send({ step: "generating", message: "Building entity model and relationships..." });
                send({ step: "validating", message: "Validating ERD diagram syntax..." });
                send({ mermaidSyntax });
              } catch (error) {
                const message = error instanceof Error ? error.message : "Conversion failed";
                send({ step: "error", message });
              } finally {
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
        } catch (error) {
          console.error("Convert-stream error:", error);
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Conversion failed",
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
