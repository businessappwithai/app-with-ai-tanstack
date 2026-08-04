/**
 * CopilotKit endpoint — splat.
 *
 * The client posts to sub-paths under `/api/copilotkit`, so this catches those
 * and hands them to the same runtime the exact-path route uses.
 */

import { createFileRoute } from "@tanstack/react-router";
import { copilotError, handleCopilotRequest } from "@/lib/copilot-runtime";

export const Route = createFileRoute("/api/copilotkit/$")({
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
