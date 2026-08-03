/**
 * CopilotKit endpoint — exact path.
 *
 * The runtime itself lives in `lib/copilot-runtime.ts`; this file and the `$`
 * splat beside it both delegate to it, so the adapter is configured once
 * instead of the two routes drifting apart.
 */

import { createFileRoute } from "@tanstack/react-router";
import { copilotError, handleCopilotRequest } from "@/lib/copilot-runtime";

export const Route = createFileRoute("/api/copilotkit")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return await handleCopilotRequest(request, "/api/copilotkit");
        } catch (error) {
          return copilotError(error, "GET");
        }
      },
      POST: async ({ request }) => {
        try {
          return await handleCopilotRequest(request, "/api/copilotkit");
        } catch (error) {
          return copilotError(error, "POST");
        }
      },
    },
  },
});
