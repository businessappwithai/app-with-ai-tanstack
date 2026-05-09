import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/components/workflow/__tests__/setup.ts"],
    include: [
      "src/**/*.{test,spec}.{js,jsx,ts,tsx}",
      "../core/src/**/*.{test,spec}.{js,jsx,ts,tsx}",
      "../generator/src/**/*.{test,spec}.{js,jsx,ts,tsx}",
    ],
    exclude: ["node_modules", "dist", ".next"],
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@erdwithai/core": path.resolve(__dirname, "../core/src"),
      "@erdwithai/core/types": path.resolve(__dirname, "../core/src/types"),
      "@erdwithai/core/hooks": path.resolve(__dirname, "../core/src/hooks"),
      "@erdwithai/core/services": path.resolve(__dirname, "../core/src/services"),
      "@erdwithai/generator": path.resolve(__dirname, "../generator/src"),
    },
  },
});
