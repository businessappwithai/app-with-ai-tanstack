/**
 * Root Layout Component - Swiss Clean Design
 *
 * Provides the application shell with:
 * - Theme configuration (light/dark mode)
 * - Provider wrapping
 * - TanStack Router outlet
 *
 * Generated: 2026-05-31T11:58:04.512Z
 * Project: crm-app
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
        <title>crm-app</title>
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
