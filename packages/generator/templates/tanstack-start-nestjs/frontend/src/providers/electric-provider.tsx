"use client";

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

import type { PGlite } from "@electric-sql/pglite";
import React, {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ELECTRIC_ENABLED,
  getDb,
  type SyncConfig,
  syncSysTablesForRole,
  type UnsubscribeFn,
} from "@/lib/electric";
import { reloadSysCollections } from "@/lib/sys-collections";

/* -------------------------------------------------------------------------- */
/*  Context                                                                    */
/* -------------------------------------------------------------------------- */

interface ElectricContextValue {
  db: PGlite | null;
  isSyncing: boolean;
  isSynced: boolean;
  error: Error | null;
  /** False when VITE_ELECTRIC_URL is unset — hooks read over HTTP instead. */
  isEnabled: boolean;
}

const ElectricContext = createContext<ElectricContextValue>({
  db: null,
  isSyncing: false,
  isSynced: false,
  error: null,
  isEnabled: false,
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
    // Without an Electric endpoint there is nothing to sync, and booting PGlite
    // would download a WASM runtime only to leave it empty. Staying idle here is
    // the supported configuration, not a failure: the sys_ hooks fall back to
    // fetching the Application Dictionary over HTTP.
    if (!ELECTRIC_ENABLED || !role) return;

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
        if (cancelled) {
          unsub();
          return;
        }
        unsubRef.current = unsub;

        await reloadSysCollections();
        if (cancelled) return;

        setIsSynced(true);
      } catch (err) {
        if (!cancelled) {
          // Sync is an optimisation. Record the failure for anything that wants
          // to surface it, warn rather than error, and let the HTTP fallback
          // carry the app — a broken sync must not break the UI.
          const failure = err instanceof Error ? err : new Error(String(err));
          console.warn(
            "[ElectricProvider] sync unavailable, falling back to HTTP:",
            failure.message
          );
          setError(failure);
          setDb(null);
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
    <ElectricContext.Provider
      value={{ db, isSyncing, isSynced, error, isEnabled: ELECTRIC_ENABLED }}
    >
      {children}
    </ElectricContext.Provider>
  );
}
