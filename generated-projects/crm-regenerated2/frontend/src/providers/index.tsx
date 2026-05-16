/**
 * Application Providers
 *
 * Wraps the app with all necessary providers:
 * - TanStack Query (React Query) for server state
 * - AuthProvider for authentication
 * - TranslationProvider for i18n
 * - Toaster for notifications
 *
 * Generated: 2026-05-16T05:41:34.290Z
 */

import { type ReactNode } from 'react';
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
