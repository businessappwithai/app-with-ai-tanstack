import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Providers } from "../providers";
import "../app/globals.css";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>ERDwithAI</title>
        <meta name="description" content="AI-Powered ERD Design Platform" />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Providers>
          <Outlet />
        </Providers>
      </body>
    </html>
  );
}
