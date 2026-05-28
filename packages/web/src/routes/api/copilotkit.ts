import Anthropic from "@anthropic-ai/sdk";
import { createFileRoute } from "@tanstack/react-router";
import {
  AnthropicAdapter,
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";

const runtime = new CopilotRuntime();

export const Route = createFileRoute("/api/copilotkit")({ server: { handlers: {
  POST: async ({ request }) => {
    try {
      const serviceAdapter = new AnthropicAdapter({
        anthropic: new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY || "",
        }) as any,
        model: "claude-3-5-sonnet-20241022",
      });

      const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
        runtime,
        serviceAdapter,
        endpoint: "/api/copilotkit",
      });

      return handleRequest(request);
    } catch (error) {
      console.error("CopilotKit error:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
  },
  },
});
