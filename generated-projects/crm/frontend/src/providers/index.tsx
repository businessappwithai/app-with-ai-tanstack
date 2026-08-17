
/**
 * Application Providers
 *
 * Provider order (outer → inner):
 * 1. QueryProvider  — TanStack Query server state
 * 2. AuthProvider   — session / user object
 * 3. ElectricProvider — syncs sys_ metadata for the current user's role into
 *                       TanStack DB Collections (local PGlite); role-scoped so
 *                       only relevant rows are loaded client-side
 * 4. TranslationProvider — i18n
 *
 * Generated: 2026-08-17T16:41:43.701Z
 */

import React, { startTransition, type ReactNode, useEffect, useState } from 'react';
import { QueryProvider } from './query-provider';
import { ElectricProvider } from './electric-provider';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { TranslationProvider } from '@/lib/translations';
import { Toaster } from 'sonner';

interface ProvidersProps {
  children: ReactNode;
}

function ClientToaster() {
  const [mounted, setMounted] = useState(false);
  // Non-urgent on purpose. This sits at the root of every route, so an urgent
  // update here lands while the page is still hydrating and React throws away
  // the server HTML for the whole boundary — "received an update before it
  // finished hydrating". Nothing is waiting on the toaster, so it can arrive a
  // tick late.
  useEffect(() => startTransition(() => setMounted(true)), []);
  return mounted ? <Toaster position="top-right" richColors /> : null;
}

/**
 * Inner wrapper so ElectricProvider can read the role from AuthContext.
 * Sits inside AuthProvider so useAuth() is always available.
 */
function ElectricBridge({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const role  = (user as { role?: string } | null)?.role ?? '';
  const token = (user as { token?: string } | null)?.token;
  return (
    <ElectricProvider role={role} token={token}>
      {children}
    </ElectricProvider>
  );
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider>
        <ElectricBridge>
          <TranslationProvider>
            {children}
            <ClientToaster />
          </TranslationProvider>
        </ElectricBridge>
      </AuthProvider>
    </QueryProvider>
  );
}
