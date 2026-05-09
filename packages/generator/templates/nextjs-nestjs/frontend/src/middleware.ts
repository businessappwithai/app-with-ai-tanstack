/**
 * Authentication Middleware
 *
 * Protects routes by checking for valid user sessions.
 * Redirects unauthenticated users to login page.
 *
 * Public routes (no authentication required):
 * - / (home page)
 * - /auth/login
 * - /auth/signup
 * - /api/* (API routes - proxied to backend)
 *
 * Protected routes (authentication required):
 * - /dashboard
 * - /bus_* (all entity pages)
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Define public routes that don't require authentication
const publicRoutes = ["/", "/auth/login", "/auth/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes (exact match for '/', prefix match for others)
  if (
    publicRoutes.some((route) => (route === "/" ? pathname === "/" : pathname.startsWith(route)))
  ) {
    return NextResponse.next();
  }

  // Allow all API routes (proxied to backend, auth handled server-side)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check for session cookie (matches better-auth cookiePrefix)
  // The cookie name follows the pattern: {cookiePrefix}.session_token
  // where cookiePrefix is set in better-auth config
  const sessionToken = request.cookies.get("hospital_app.session_token")?.value;

  if (!sessionToken) {
    // No session - redirect to login
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Session exists - allow request
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
