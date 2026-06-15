import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getAuthService, getSessionToken, clearSessionCookie } = await import("@/lib/auth-server");
        const token = await getSessionToken(request);
        if (token) {
          try {
            const authService = await getAuthService();
            await authService.logout(token);
          } catch {
            // ignore logout errors
          }
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": clearSessionCookie(),
          },
        });
      },
    },
  },
});
