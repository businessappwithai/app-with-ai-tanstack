"use client";

/**
 * Application Providers
 *
 * Wraps the app with all necessary providers:
 * - TanStack Query (React Query) for server state
 * - AuthProvider for authentication
 * - TranslationProvider for i18n
 * - Toaster for notifications
 *
 * Note: Next.js App Router provides built-in client-side routing
 * via next/navigation, so no custom router provider is needed.
 *
 * Generated: 2026-03-20T16:41:26.606Z
 */

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/auth-context";
import { TranslationProvider } from "@/lib/translations";
import { QueryProvider } from "./query-provider";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider>
        <TranslationProvider>
          {children}
          <Toaster position="top-right" richColors />
        </TranslationProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
