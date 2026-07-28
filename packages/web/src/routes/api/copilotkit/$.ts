import Anthropic from "@anthropic-ai/sdk";
import {
  AnthropicAdapter,
  CopilotRuntime,
  copilotRuntimeNodeHttpEndpoint,
} from "@copilotkit/runtime";
import { createFileRoute } from "@tanstack/react-router";

const runtime = new CopilotRuntime();

function makeServiceAdapter() {
  return new AnthropicAdapter({
    anthropic: new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || "",
    }) as any,
    model: "claude-sonnet-4-20250514",
  });
}

async function handleCopilotRequest(request: Request): Promise<Response> {
  const serviceAdapter = makeServiceAdapter();
  const handler = copilotRuntimeNodeHttpEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });
  return handler(request) as Promise<Response>;
}

export const Route = createFileRoute("/api/copilotkit/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return await handleCopilotRequest(request);
        } catch (error) {
          console.error("CopilotKit subroute GET error:", error);
          return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
      POST: async ({ request }) => {
        try {
          return await handleCopilotRequest(request);
        } catch (error) {
          console.error("CopilotKit subroute POST error:", error);
          return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
