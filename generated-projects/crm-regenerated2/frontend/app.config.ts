/**
 * TanStack Start Configuration
 *
 * Generated: 2026-05-16T05:41:34.315Z
 * Project: CRM Regenerated 2
 */

import { defineConfig } from '@tanstack/start/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      dedupe: ['react', 'react-dom', '@tanstack/react-router'],
    },
    esbuild: {
      jsx: 'automatic',
      jsxImportSource: 'react',
    },
  },
});
