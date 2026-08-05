#!/usr/bin/env bun
/**
 * Production server for the generator app.
 *
 * `vite build` emits two halves: a request handler in `dist/server`, and the
 * client bundle in `dist/client`. The handler renders and answers API routes but
 * knows nothing about the second half — nothing in it serves a `.js` or a font.
 * In development Vite does that job; in production this does.
 *
 * Static files are tried first and the handler gets everything else, because a
 * built asset path is always a real file and an app route never is. Assets carry
 * a content hash in their name, so they are safe to cache indefinitely; anything
 * else (`favicon.ico`, `robots.txt`) is not, and is not told to be.
 *
 * Run with `bun run start` after `bun run build`.
 */

import { file } from "bun";
import { existsSync } from "node:fs";
import { join, normalize } from "node:path";

const handler = (await import("./dist/server/server.js")) as {
  default: { fetch: (request: Request) => Promise<Response> };
};

const port = Number(process.env.PORT ?? 3000);
const clientDir = join(import.meta.dir, "dist", "client");

/**
 * Resolve a URL path to a file inside the client bundle, or null.
 *
 * The normalise-and-prefix check is what stops `/../../etc/passwd` from
 * escaping: a path that does not still start with the client directory after
 * normalisation is not served, whatever it looked like before.
 */
function staticFile(pathname: string): string | null {
  if (pathname === "/") return null;
  const candidate = normalize(join(clientDir, decodeURIComponent(pathname)));
  if (!candidate.startsWith(clientDir)) return null;
  return existsSync(candidate) && !candidate.endsWith("/") ? candidate : null;
}

const server = Bun.serve({
  port,
  idleTimeout: 120,
  async fetch(request) {
    const { pathname } = new URL(request.url);

    const asset = staticFile(pathname);
    if (asset) {
      return new Response(file(asset), {
        headers: {
          "Cache-Control": pathname.startsWith("/assets/")
            ? "public, max-age=31536000, immutable"
            : "public, max-age=0, must-revalidate",
        },
      });
    }

    try {
      return await handler.default.fetch(request);
    } catch (error) {
      // A handler that throws would otherwise take the whole server down and
      // leave the container in a crash loop with no useful log line.
      console.error(`[server] ${request.method} ${pathname} failed:`, error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});

console.log(`ERDwithAI generator listening on http://localhost:${server.port}`);
