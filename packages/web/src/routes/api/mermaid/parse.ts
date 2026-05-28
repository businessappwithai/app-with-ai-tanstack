// POST /api/mermaid/parse
// Converts Mermaid erDiagram or flowchart TD → structured definitions via TypeScript AST parsers.
// No AI involved — pure deterministic parsing.

import { createFileRoute } from "@tanstack/react-router";
import { parseMermaid } from "@/lib/mermaid";

export const Route = createFileRoute("/api/mermaid/parse")({ server: { handlers: {
  POST: async ({ request }) => {
    try {
      const { code } = (await request.json()) as { code: string };

      if (!code?.trim()) {
        return new Response(JSON.stringify({ error: "Mermaid code is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const result = parseMermaid(code);

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : "Parse failed" }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }
  },
  },
  },
});
