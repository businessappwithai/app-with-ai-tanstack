import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { setSessionCookie } = await import("@/lib/auth-server");
        const { getDatabase } = await import("@erdwithai/core/services");

        // Must match the hashing in register endpoint
        async function hashPassword(password: string): Promise<string> {
          const encoder = new TextEncoder();
          const data = encoder.encode(password + "salt-key");
          const hash = await crypto.subtle.digest("SHA-256", data);
          return Array.from(new Uint8Array(hash))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        }
        try {
          const body = await request.json();
          const { email, password } = body as { email: string; password: string };

          if (!email || !password) {
            return new Response(JSON.stringify({ error: "Email and password are required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const db = getDatabase();

          const user = await db
            .selectFrom("auth_users" as any)
            .selectAll()
            .where("email" as any, "=", email)
            .executeTakeFirst();

          if (!user) {
            return new Response(JSON.stringify({ error: "Invalid email or password" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          const status = (user as any).status || "approved";
          const role = (user as any).role || "user";

          if (status === "pending") {
            return new Response(
              JSON.stringify({
                error: "PENDING_APPROVAL",
                message: "Your account is pending admin approval. Please wait for an administrator to review your registration.",
              }),
              {
                status: 403,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          if (status === "rejected") {
            return new Response(
              JSON.stringify({
                error: "ACCOUNT_REJECTED",
                message: "Your account has been rejected. Please contact an administrator.",
              }),
              {
                status: 403,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          // Verify password
          const passwordHash = await hashPassword(password);
          const storedPasswordHash = (user as any).passwordHash;

          if (!storedPasswordHash) {
            return new Response(
              JSON.stringify({ error: "Invalid email or password" }),
              {
                status: 401,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          if (passwordHash !== storedPasswordHash) {
            return new Response(
              JSON.stringify({ error: "Invalid email or password" }),
              {
                status: 401,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          // Create a session
          const sessionId = crypto.randomUUID();
          const sessionToken = crypto.randomUUID();
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

          await db
            .insertInto("auth_sessions" as any)
            .values({
              id: sessionId,
              userId: (user as any).id,
              token: sessionToken,
              expiresAt,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as any)
            .execute();

          return new Response(
            JSON.stringify({
              user: {
                id: (user as any).id,
                email: (user as any).email,
                name: (user as any).name,
                role,
                status,
              },
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Set-Cookie": setSessionCookie(sessionToken),
              },
            }
          );
        } catch (error) {
          console.error("[Login Error]", error);
          const message = error instanceof Error ? error.message : "Login failed";
          return new Response(
            JSON.stringify({ error: message }),
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
