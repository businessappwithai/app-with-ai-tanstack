/**
 * Regression: `docker compose up --build` on a downloaded project died in the
 * frontend image with
 *
 *   ENOENT: ... /app/frontend/.vinxi/build/client/_build/.vite/manifest.json
 *   target frontend: failed to solve: ResourceExhausted: ... cannot allocate memory
 *
 * `oven/bun` ships no Node, so `vinxi build` (a `#!/usr/bin/env node` script)
 * ran on Bun, which ignores `--max-old-space-size`. Bundling Monaco and the
 * GoRules editor then outgrew a default Docker VM; the client build never wrote
 * its manifest and the SSR build failed on the missing file.
 *
 * Both build stages therefore run the bundler on real Node, with a heap the
 * reader can set (BUILD_HEAP_MB). Bun is copied in for the install. The runtime
 * stages stay on Bun.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "../../../templates/tanstack-start-nestjs");

describe.each([
  ["frontend/Dockerfile.hbs", "builder"],
  ["Dockerfile.hbs", "build"],
])("%s", (file, stage) => {
  const source = readFileSync(join(ROOT, file), "utf8");

  it(`builds the front end in a Node stage (${stage})`, () => {
    expect(source).toMatch(new RegExp(`^FROM node:\\S+ AS ${stage}$`, "m"));
    expect(source).toContain("COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun");
  });

  it("runs vinxi under node with a configurable heap, never `bun run build`", () => {
    expect(source).toMatch(
      /NODE_OPTIONS=--max-old-space-size=\$\{BUILD_HEAP_MB\} node \.\/node_modules\/\.bin\/vinxi build/
    );
    expect(source).not.toMatch(/cd frontend && bun run build/);
  });

  it("keeps the runtime stage on Bun", () => {
    const last = source.split(/^FROM /m).pop() ?? "";
    expect(last.startsWith("oven/bun:1.4.3-alpine")).toBe(true);
  });
});
