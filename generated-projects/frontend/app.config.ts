/**
 * TanStack Start Configuration
 *
 * Generated: 2026-05-31T11:58:04.548Z
 * Project: crm-app
 */

import { defineConfig } from '@tanstack/start/config';
import path from 'path';

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
    fastRefresh: false,
  },
  vite: {
    esbuild: {
      jsx: 'automatic',
      jsxImportSource: 'react',
    },
    resolve: {
      alias: {
        '@': path.resolve('./src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:4100',
          changeOrigin: true,
        },
      },
    },
  },
});
