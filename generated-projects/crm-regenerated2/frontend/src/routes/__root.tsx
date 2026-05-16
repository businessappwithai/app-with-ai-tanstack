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
import { Providers } from '../providers';
import '../styles/globals.css';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>CRM Regenerated 2</title>
        <meta name="description" content="Generated application" />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          <main className="min-h-screen bg-background">
            <Outlet />
          </main>
        </Providers>
      </body>
    </html>
  );
}
