import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getDatabase } = await import("@erdwithai/core/services");
        const { getSessionToken } = await import("@/lib/auth-server");

        try {
          const token = await getSessionToken(request);
          if (!token) {
            return new Response(JSON.stringify({ user: null }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          const db = getDatabase();
          const session = await db
            .selectFrom("auth_sessions" as any)
            .selectAll()
            .where("token" as any, "=", token)
            .executeTakeFirst();

          if (!session || new Date((session as any).expiresAt) < new Date()) {
            return new Response(JSON.stringify({ user: null }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          const user = await db
            .selectFrom("auth_users" as any)
            .select(["id" as any, "email" as any, "name" as any, "status" as any, "role" as any])
            .where("id" as any, "=", (session as any).userId)
            .executeTakeFirst();

          if (!user) {
            return new Response(JSON.stringify({ user: null }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(
            JSON.stringify({
              user: {
                id: (user as any).id,
                email: (user as any).email,
                name: (user as any).name,
                status: (user as any).status || "approved",
                role: (user as any).role || "user",
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Failed to get session" }),
            {
              status: 401,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
    },
  },
});
