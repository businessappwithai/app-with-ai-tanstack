import { createFileRoute } from "@tanstack/react-router";
import { getDatabase, runMigrations } from "@erdwithai/core/services";
import { getCurrentUser } from "@/lib/auth-server";

let _dbReady = false;
async function ensureDb() {
  if (!_dbReady) {
    _dbReady = true;
    await runMigrations().catch((err) => console.error("[DB] Migration error:", err));
  }
}

async function checkProjectAccess(
  db: any,
  projectId: string,
  userId: string,
  requiredPermission?: "read_write"
): Promise<{ allowed: boolean; reason?: string }> {
  const project = await db
    .selectFrom("projects")
    .selectAll()
    .where("id", "=", projectId)
    .executeTakeFirst();

  if (!project) {
    return { allowed: false, reason: "Project not found" };
  }

  if ((project as any).owner_user_id === userId) {
    return { allowed: true };
  }

  const membership = await db
    .selectFrom("project_members")
    .selectAll()
    .where("project_id", "=", projectId)
    .where("user_id", "=", userId)
    .executeTakeFirst();

  if (!membership) {
    return { allowed: false, reason: "Access denied" };
  }

  if (requiredPermission === "read_write" && (membership as any).permission !== "read_write") {
    return { allowed: false, reason: "Insufficient permissions" };
  }

  return { allowed: true };
}

export const Route = createFileRoute("/api/projects/$id/")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        await ensureDb();
        try {
          const user = await getCurrentUser(request);
          if (!user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          const db = getDatabase();
          const id = params.id as string;

          const access = await checkProjectAccess(db, id, user.id);
          if (!access.allowed) {
            return new Response(JSON.stringify({ error: access.reason ?? "Access denied" }), {
              status: 403,
              headers: { "Content-Type": "application/json" },
            });
          }

          const dbProject = await db
            .selectFrom("projects")
            .selectAll()
            .where("id", "=", id)
            .executeTakeFirst();

          if (!dbProject) {
            return new Response(JSON.stringify({ error: "Project not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
          }

          const project = {
            id: (dbProject as any).id,
            name: (dbProject as any).name,
            description: (dbProject as any).description,
            icon: (dbProject as any).icon,
            iconColor: (dbProject as any).icon_color,
            createdAt: (dbProject as any).created_at,
            updatedAt: (dbProject as any).updated_at,
            status: (dbProject as any).status,
            isDeleted: (dbProject as any).is_deleted,
            ownerId: (dbProject as any).owner_user_id,
            stackType: (dbProject as any).stack_type,
            port: (dbProject as any).port,
            databaseUrl: (dbProject as any).database_url,
            generatedPath: (dbProject as any).generated_path,
          };

          return new Response(JSON.stringify({ project }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Error fetching project:", error);
          return new Response(JSON.stringify({ error: "Failed to fetch project" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },

      PATCH: async ({ request, params }) => {
        await ensureDb();
        try {
          const user = await getCurrentUser(request);
          if (!user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (user.role === "admin") {
            return new Response(JSON.stringify({ error: "Admins cannot modify projects" }), {
              status: 403,
              headers: { "Content-Type": "application/json" },
            });
          }

          const db = getDatabase();
          const id = params.id as string;

          const access = await checkProjectAccess(db, id, user.id, "read_write");
          if (!access.allowed) {
            return new Response(JSON.stringify({ error: access.reason ?? "Access denied" }), {
              status: 403,
              headers: { "Content-Type": "application/json" },
            });
          }

          const body = await request.json();
          const now = new Date().toISOString();

          await db
            .updateTable("projects")
            .set({ ...body, updated_at: now })
            .where("id", "=", id)
            .execute();

          const dbProject = await db
            .selectFrom("projects")
            .selectAll()
            .where("id", "=", id)
            .executeTakeFirst();

          const project = dbProject ? {
            id: (dbProject as any).id,
            name: (dbProject as any).name,
            description: (dbProject as any).description,
            icon: (dbProject as any).icon,
            iconColor: (dbProject as any).icon_color,
            createdAt: (dbProject as any).created_at,
            updatedAt: (dbProject as any).updated_at,
            status: (dbProject as any).status,
            isDeleted: (dbProject as any).is_deleted,
            ownerId: (dbProject as any).owner_user_id,
            stackType: (dbProject as any).stack_type,
            port: (dbProject as any).port,
            databaseUrl: (dbProject as any).database_url,
            generatedPath: (dbProject as any).generated_path,
          } : null;

          return new Response(JSON.stringify({ project }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Error updating project:", error);
          return new Response(JSON.stringify({ error: "Failed to update project" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },

      DELETE: async ({ request, params }) => {
        await ensureDb();
        try {
          const user = await getCurrentUser(request);
          if (!user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (user.role === "admin") {
            return new Response(JSON.stringify({ error: "Admins cannot delete projects" }), {
              status: 403,
              headers: { "Content-Type": "application/json" },
            });
          }

          const db = getDatabase();
          const id = params.id as string;

          const access = await checkProjectAccess(db, id, user.id, "read_write");
          if (!access.allowed) {
            return new Response(JSON.stringify({ error: access.reason ?? "Access denied" }), {
              status: 403,
              headers: { "Content-Type": "application/json" },
            });
          }

          const now = new Date().toISOString();
          await db
            .updateTable("projects")
            .set({ is_deleted: true, updated_at: now })
            .where("id", "=", id)
            .execute();

          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Error deleting project:", error);
          return new Response(JSON.stringify({ error: "Failed to delete project" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
