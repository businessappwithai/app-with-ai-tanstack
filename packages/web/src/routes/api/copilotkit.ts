import { createAPIFileRoute } from "@tanstack/start/api";
import Anthropic from "@anthropic-ai/sdk";
import {
  AnthropicAdapter,
  CopilotRuntime,
  copilotRuntimeGenericHTTPEndpoint,
} from "@copilotkit/runtime";

const runtime = new CopilotRuntime();

export const Route = createAPIFileRoute("/api/copilotkit")({
  POST: async ({ request }) => {
    const serviceAdapter = new AnthropicAdapter({
      anthropic: new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CopilotKit requires Anthropic client type cast
      }) as any,
      model: "claude-3-5-sonnet-20241022",
    });

    const handler = copilotRuntimeGenericHTTPEndpoint({
      runtime,
      serviceAdapter,
      endpoint: "/api/copilotkit",
    });

    return handler(request);
  },
});
