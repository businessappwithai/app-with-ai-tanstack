/**
 * Projects API route
 * Handles CRUD operations for projects
 */

import { createFileRoute } from "@tanstack/react-router";
import { projectDb, runMigrations } from "@erdwithai/core/services";

// Ensure DB schema exists on first request
let _dbReady = false;
async function ensureDb() {
  if (!_dbReady) {
    _dbReady = true;
    await runMigrations().catch((err) => console.error("[DB] Migration error:", err));
  }
}

export const Route = createFileRoute("/api/projects/")({ server: { handlers: {
  GET: async ({ request }) => {
    await ensureDb();
    try {
      const url = new URL(request.url);
      const search = url.searchParams.get("search");
      const status = url.searchParams.get("status");

      let projects;

      if (search) {
        projects = await projectDb.search(search);
      } else {
        projects = await projectDb.findAll(status ? { status } : undefined);
      }

      return new Response(JSON.stringify({ projects }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : "";
      console.error("Error fetching projects:", errorMessage, errorStack);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch projects",
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },

  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const {
        name,
        description,
        icon,
        iconColor,
        stackType,
        port,
        databaseUrl,
        environmentVariables,
      } = body;

      if (!name) {
        return new Response(JSON.stringify({ error: "Name is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const project = await projectDb.create({
        id: projectId,
        name,
        description,
        icon,
        icon_color: iconColor,
        stack_type: stackType,
        port,
        database_url: databaseUrl,
        environment_variables: environmentVariables,
      });

      return new Response(JSON.stringify({ project }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error creating project:", error);
      return new Response(JSON.stringify({ error: "Failed to create project" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
  },
  },
});
