import { createFileRoute } from "@tanstack/react-router";
import fs from "node:fs/promises";
import path from "node:path";

const MERMAID_DIR = path.join(process.cwd(), "generated-projects", ".mermaid-library");

export const Route = createFileRoute("/api/mermaid/$filename")({ server: { handlers: {
  GET: async ({ params }) => {
    try {
      const { filename } = params;
      const safeFilename = decodeURIComponent(filename).replace(/[^a-z0-9._-]/gi, "_");
      const filePath = path.join(MERMAID_DIR, safeFilename);

      const content = await fs.readFile(filePath, "utf-8");

      const isJson = safeFilename.endsWith(".json");
      const contentType = isJson ? "application/json" : "text/plain";
      const disposition = `attachment; filename="${safeFilename}"`;

      return new Response(content, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": disposition,
          "Cache-Control": "no-cache",
        },
      });
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return new Response(JSON.stringify({ error: "File not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : "Failed to read file" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },

  DELETE: async ({ params }) => {
    try {
      const { filename } = params;
      const safeFilename = decodeURIComponent(filename).replace(/[^a-z0-9._-]/gi, "_");
      const filePath = path.join(MERMAID_DIR, safeFilename);
      const metaPath = `${filePath}.meta.json`;

      await fs.unlink(filePath).catch(() => undefined);
      await fs.unlink(metaPath).catch(() => undefined);

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : "Failed to delete file" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
  },
  },
});
