import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = defineConfig({
  server: {
    watch: {
      // /api/generate writes the generated app under
      // packages/web/generated-projects/<projectId> (see .gitignore). That is
      // inside Vite's watch root, so finishing a generation dropped hundreds of
      // files at once and triggered a full-page reload — which unmounted the
      // Generate step mid-run and threw away its logs and completion state.
      ignored: ["**/generated-projects/**"],
    },
  },
  optimizeDeps: {
    // Native .node binaries and Node-only drivers can't be bundled by Rolldown — exclude them
    exclude: [
      "@mastra/fastembed",
      "@anush008/tokenizers",
      "@anush008/tokenizers-darwin-universal",
      "pg",
      "@erdwithai/core",
    ],
    // CJS interop: pre-bundle elkjs bundled JS so Vite handles it as ESM
    include: ["elkjs/lib/elk.bundled.js"],
  },
  ssr: {
    // Treat workspace packages as Node.js externals so their dist/index.js
    // files are used directly instead of being re-processed by Vite SSR.
    // Without this, Vite SSR fails to resolve named exports (e.g. entityToBusEntity)
    // from subpath exports like @erdwithai/core/types.
    external: ["@erdwithai/core", "@erdwithai/generator", "@erdwithai/ai"],
  },
  resolve: {
    tsconfigPaths: true,
    alias: [
      // Replace @tanstack/start-api-routes@1.120 (Vinxi-based) with a Vite-compatible shim.
      // The original imports 'vinxi/routes' which doesn't exist in @tanstack/react-start@1.167+.
      // The shim also adds .update() to Route objects so routeTree.gen.ts works without error.
      {
        find: /^@tanstack\/start-api-routes$/,
        replacement: path.resolve(__dirname, "src/lib/start-api-routes-compat.js"),
      },
      { find: "#", replacement: path.resolve(__dirname, "src") },
      { find: "@", replacement: path.resolve(__dirname, "src") },
    ],
  },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart({
      tsr: {
        // Exclude API routes from the router tree — they're handled by TanStack Start's
        // API routing system separately and don't export a Route with .update().
        routeFileIgnorePattern: "^api",
      },
    }),
    viteReact(),
  ],
});

export default config;
