/**
 * Application Providers
 *
 * Wraps the app with all necessary providers:
 * - TanStack Query (React Query) for server state
 * - AuthProvider for authentication
 * - TranslationProvider for i18n
 * - Toaster for notifications
 *
 * Generated: 2026-05-31T11:58:04.514Z
 */

import { type ReactNode, useEffect, useState } from 'react';
import { QueryProvider } from './query-provider';
import { AuthProvider } from '@/contexts/auth-context';
import { TranslationProvider } from '@/lib/translations';
import { Toaster } from 'sonner';

interface ProvidersProps {
  children: ReactNode;
}

function ClientToaster() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <Toaster position="top-right" richColors /> : null;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider>
        <TranslationProvider>
          {children}
          <ClientToaster />
        </TranslationProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
