import { createAPIFileRoute } from "@tanstack/start/api";
import fs from "node:fs/promises";
import path from "node:path";

const MERMAID_DIR = path.join(process.cwd(), "generated-projects", ".mermaid-library");

async function ensureDir() {
  await fs.mkdir(MERMAID_DIR, { recursive: true });
}

export const Route = createAPIFileRoute("/api/mermaid")({
  GET: async ({ request }) => {
    try {
      await ensureDir();
      const url = new URL(request.url);
      const projectId = url.searchParams.get("projectId");
      const type = url.searchParams.get("type");

      const entries = await fs.readdir(MERMAID_DIR, { withFileTypes: true });
      const metaFiles = entries
        .filter((e) => e.isFile() && e.name.endsWith(".meta.json"))
        .map((e) => e.name);

      const files = await Promise.all(
        metaFiles.map(async (metaFile) => {
          try {
            const raw = await fs.readFile(path.join(MERMAID_DIR, metaFile), "utf-8");
            return JSON.parse(raw);
          } catch {
            return null;
          }
        })
      );

      let filtered = files.filter(Boolean);

      if (projectId) {
        filtered = filtered.filter((f) => f.projectId === projectId);
      }
      if (type) {
        filtered = filtered.filter((f) => f.type === type);
      }

      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return new Response(JSON.stringify({ files: filtered }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : "Failed to list files" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },

  POST: async ({ request }) => {
    try {
      await ensureDir();
      const body = (await request.json()) as {
        projectId: string;
        projectName: string;
        filename: string;
        type: "erd" | "rules";
        content: string;
      };

      const { projectId, projectName, filename, type, content } = body;

      if (!projectId || !filename || !content) {
        return new Response(
          JSON.stringify({ error: "projectId, filename, and content are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const safeFilename = filename.replace(/[^a-z0-9._-]/gi, "_");
      const contentPath = path.join(MERMAID_DIR, safeFilename);
      const metaPath = path.join(MERMAID_DIR, `${safeFilename}.meta.json`);

      await fs.writeFile(contentPath, content, "utf-8");

      const meta = {
        filename: safeFilename,
        type: type ?? "erd",
        projectId,
        projectName,
        content,
        createdAt: new Date().toISOString(),
        downloadUrl: `/api/mermaid/${encodeURIComponent(safeFilename)}`,
      };

      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");

      return new Response(JSON.stringify({ success: true, file: meta }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : "Failed to save file" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
});
