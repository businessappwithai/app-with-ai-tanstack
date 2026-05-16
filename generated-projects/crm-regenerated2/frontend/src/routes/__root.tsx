/**
 * Root Layout Component - Swiss Clean Design
 *
 * Provides the application shell with:
 * - Theme configuration (light/dark mode)
 * - Provider wrapping
 * - TanStack Router outlet
 *
 * Generated: 2026-05-16T05:41:34.287Z
 * Project: CRM Regenerated 2
 */

import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Meta, Scripts } from '@tanstack/start/client';
import { Providers } from '../providers';
import '../styles/globals.css';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const isDev = import.meta.env.DEV;
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>CRM Regenerated 2</title>
        <meta name="description" content="Generated application" />
        {isDev && (
          <link rel="stylesheet" href="/_build/src/styles/globals.css?direct" />
        )}
        <Meta />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          <main className="min-h-screen bg-background">
            <Outlet />
          </main>
        </Providers>
        <Scripts />
        {isDev && (
          <>
            <script type="module" src="/_build/src/react-preamble.ts" suppressHydrationWarning />
            <script type="module" src="/_build/src/dev-entry.ts" suppressHydrationWarning />
          </>
        )}
      </body>
    </html>
  );
}
