import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.{test,spec}.{js,jsx,ts,tsx}"],
    exclude: ["node_modules", "dist", ".next", "out"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "test/",
        "**/*.config.*",
        "**/*.d.ts",
        "**/types/**",
        "**/__tests__/**",
      ],
      all: true,
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    isolate: true,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./packages/web/src"),
      "@erdwithai/core": path.resolve(__dirname, "./packages/core/src"),
      "@erdwithai/core/*": path.resolve(__dirname, "./packages/core/src/*"),
      "@erdwithai/generator": path.resolve(__dirname, "./packages/generator/src"),
      "@erdwithai/generator/*": path.resolve(__dirname, "./packages/generator/src/*"),
      "@erdwithai/ai": path.resolve(__dirname, "./packages/ai/src"),
      "@erdwithai/ai/*": path.resolve(__dirname, "./packages/ai/src/*"),
      "@erdwithai/web": path.resolve(__dirname, "./packages/web/src"),
      "@erdwithai/web/*": path.resolve(__dirname, "./packages/web/src/*"),
    },
  },
});
