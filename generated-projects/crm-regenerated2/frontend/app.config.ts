/**
 * TanStack Start Configuration
 *
 * Generated: 2026-05-16T05:41:34.315Z
 * Project: CRM Regenerated 2
 */

import { defineConfig } from '@tanstack/start/config';

export default defineConfig({
  tsr: {
    appDirectory: 'src',
    routesDirectory: 'src/routes',
    generatedRouteTree: 'src/routeTree.gen.ts',
    quoteStyle: 'single',
    semicolons: false,
  },
  server: {
    preset: 'node-server',
  },
  react: {
    jsxRuntime: 'automatic',
    jsxImportSource: 'react',
  },
  vite: {
    esbuild: {
      jsx: 'automatic',
      jsxImportSource: 'react',
    },
  },
});
