import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getDatabase, runMigrations } = await import("@erdwithai/core/services");

        // Simple password hashing using Bun's built-in crypto
        async function hashPassword(password: string): Promise<string> {
          const encoder = new TextEncoder();
          const data = encoder.encode(password + "salt-key");
          const hash = await crypto.subtle.digest("SHA-256", data);
          return Array.from(new Uint8Array(hash))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        }

        try {
          await runMigrations();
          const db = getDatabase();
          const body = await request.json();
          const { email, password, name } = body as {
            email: string;
            password: string;
            name: string;
          };

          if (!email || !password || !name) {
            return new Response(
              JSON.stringify({ error: "Name, email and password are required" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          if (password.length < 8) {
            return new Response(
              JSON.stringify({ error: "Password must be at least 8 characters" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          // Check if user already exists
          const existingUser = await db
            .selectFrom("auth_users" as any)
            .selectAll()
            .where("email" as any, "=", email)
            .executeTakeFirst();

          if (existingUser) {
            return new Response(
              JSON.stringify({ error: "Email already registered" }),
              {
                status: 409,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          // Create user
          const userId = crypto.randomUUID();
          const now = new Date().toISOString();
          const passwordHash = await hashPassword(password);

          await db
            .insertInto("auth_users" as any)
            .values({
              id: userId,
              email,
              name,
              emailVerified: false,
              status: "pending",
              role: "user",
              createdAt: now,
              updatedAt: now,
            } as any)
            .execute();

          return new Response(
            JSON.stringify({
              pending: true,
              message: "Registration successful! Your account is pending admin approval.",
              userId,
            }),
            {
              status: 202,
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (error) {
          console.error("[Register Error]", error);
          const message = error instanceof Error ? error.message : "Registration failed";
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
