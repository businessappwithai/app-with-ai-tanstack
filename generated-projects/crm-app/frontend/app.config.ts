/**
 * TanStack Start Configuration
 *
 * Generated: 2026-05-09T16:10:52.369Z
 * Project: my-app
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
});
