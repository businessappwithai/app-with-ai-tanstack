'use client';

/**
 * Application Providers
 *
 * Wraps the app with all necessary providers:
 * - TanStack Query (React Query) for server state
 * - AuthProvider for authentication
 * - TranslationProvider for i18n
 * - Toaster for notifications
 *
  * Note: TanStack Router provides built-in client-side routing
  * via @tanstack/react-router, so no custom router provider is needed.
 *
 * Generated: 2026-05-12T11:57:05.729Z
 */

import React, { type ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { AuthProvider } from '@/contexts/auth-context';
import { TranslationProvider } from '@/lib/translations';
import { Toaster } from 'sonner';

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
