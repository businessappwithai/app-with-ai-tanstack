'use client';

/**
 * ElectricSQL Provider
 *
 * Initialises PGlite + ElectricSQL sync for sys_ (Application Dictionary) tables.
 * Only rows visible to the authenticated user's role are synced to the local
 * PGlite database and loaded into TanStack DB Collections — nothing else is
 * pulled client-side.
 *
 * The `role` prop must match a role string known to the backend Electric proxy
 * so the server-side WHERE clause is applied before rows leave the server.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { syncSysTablesForRole, getDb, type SyncConfig, type UnsubscribeFn } from '@/lib/electric';
import { reloadSysCollections } from '@/lib/sys-collections';
import type { PGlite } from '@electric-sql/pglite';

/* -------------------------------------------------------------------------- */
/*  Context                                                                    */
/* -------------------------------------------------------------------------- */

interface ElectricContextValue {
  db: PGlite | null;
  isSyncing: boolean;
  isSynced: boolean;
  error: Error | null;
}

const ElectricContext = createContext<ElectricContextValue>({
  db: null,
  isSyncing: false,
  isSynced: false,
  error: null,
});

export function useElectric(): ElectricContextValue {
  return useContext(ElectricContext);
}

/* -------------------------------------------------------------------------- */
/*  Provider                                                                   */
/* -------------------------------------------------------------------------- */

export interface ElectricProviderProps {
  children: ReactNode;
  /** Role of the authenticated user — scopes the Electric shape subscription. */
  role: string;
  /** Session token forwarded to the Electric proxy for auth. */
  token?: string;
}

export function ElectricProvider({ children, role, token }: ElectricProviderProps) {
  const [db, setDb] = useState<PGlite | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const unsubRef = useRef<UnsubscribeFn | null>(null);

  useEffect(() => {
    if (!role) return;

    let cancelled = false;

    async function init() {
      try {
        setIsSyncing(true);
        setIsSynced(false);
        setError(null);

        const database = await getDb();
        if (cancelled) return;
        setDb(database);

        const config: SyncConfig = { role, token };
        const unsub = await syncSysTablesForRole(config);
        if (cancelled) { unsub(); return; }
        unsubRef.current = unsub;

        await reloadSysCollections();
        if (cancelled) return;

        setIsSynced(true);
      } catch (err) {
        if (!cancelled) {
          console.error('[ElectricProvider] sync error:', err);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    }

    void init();

    return () => {
      cancelled = true;
      unsubRef.current?.();
      unsubRef.current = null;
      setIsSynced(false);
    };
  }, [role, token]);

  return (
    <ElectricContext.Provider value={{ db, isSyncing, isSynced, error }}>
      {children}
    </ElectricContext.Provider>
  );
}
