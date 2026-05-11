/**
 * Root Layout Component - Swiss Clean Design
 *
 * Provides the application shell with:
 * - Theme configuration (light/dark mode)
 * - Provider wrapping
 * - TanStack Router outlet
 *
 * Generated: 2026-05-09T16:10:52.350Z
 * Project: my-app
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
        <title>my-app</title>
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
