/**
 * sys_ Entity Hooks — Local-first via TanStack DB + ElectricSQL
 *
 * These hooks replace the HTTP-based equivalents in use-field-metadata.ts
 * for reading sys_ (Application Dictionary) data. Data is served from the
 * local PGlite database that has been synced via ElectricSQL, so every
 * query is a sub-millisecond local lookup — no network round-trip needed.
 *
 * Fallback: when Electric is not yet synced the hooks fall back to the
 * HTTP API so the UI never blocks on the initial sync completing.
 *
 * Generated: 2026-08-17T17:20:18.732Z
 * Project: crm
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useElectric } from '@/providers/electric-provider';
import { getDb } from '@/lib/electric';
import { apiClient, type PaginatedResponse } from '@/lib/api-client';
import type { FieldMetadata, ColumnMetadata, SysTable, SysReference } from './use-field-metadata';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

async function localQuery<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const db = await getDb();
  const result = await db.query<T>(sql, params);
  return result.rows;
}

/* -------------------------------------------------------------------------- */
/*  sys_table                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Fetch a sys_table record by table_name.
 * Reads from local PGlite when synced; falls back to HTTP API.
 */
export function useSysTable(tableName: string) {
  const { isSynced } = useElectric();

  return useQuery<SysTable | undefined>({
    queryKey: ['sys-electric', 'table', tableName, isSynced ? 'local' : 'remote'],
    queryFn: async () => {
      if (isSynced) {
        const rows = await localQuery<SysTable>(
          'SELECT * FROM sys_table WHERE table_name = $1 LIMIT 1',
          [tableName]
        );
        return rows[0];
      }

      // HTTP fallback
      const res = await apiClient.get<PaginatedResponse<SysTable>>(
        `/sys/tables?name=${encodeURIComponent(tableName)}`
      );
      return res.data?.[0];
    },
    staleTime: isSynced ? Number.POSITIVE_INFINITY : 5 * 60 * 1000,
    enabled: !!tableName,
  });
}

/* -------------------------------------------------------------------------- */
/*  sys_column                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Fetch all columns for a table_name, ordered by seq_no.
 * Reads from local PGlite when synced; falls back to HTTP API.
 */
export function useSysColumns(tableName: string) {
  const { isSynced } = useElectric();

  return useQuery<ColumnMetadata[]>({
    queryKey: ['sys-electric', 'columns', tableName, isSynced ? 'local' : 'remote'],
    queryFn: async () => {
      if (isSynced) {
        return localQuery<ColumnMetadata>(
          `SELECT c.*
           FROM sys_column c
           JOIN sys_table t ON t.sys_table_id = c.sys_table_id
           WHERE t.table_name = $1
           ORDER BY c.seq_no`,
          [tableName]
        );
      }

      // HTTP fallback: first resolve table_id
      const tableRes = await apiClient.get<PaginatedResponse<SysTable>>(
        `/sys/tables?name=${encodeURIComponent(tableName)}`
      );
      const tableId = tableRes.data?.[0]?.sys_table_id;
      if (!tableId) return [];

      const colRes = await apiClient.get<PaginatedResponse<ColumnMetadata>>(
        `/sys/columns?table_id=${tableId}`
      );
      return colRes.data ?? [];
    },
    staleTime: isSynced ? Number.POSITIVE_INFINITY : 5 * 60 * 1000,
    enabled: !!tableName,
  });
}

/* -------------------------------------------------------------------------- */
/*  sys_field                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Fetch all fields for a table, ordered by seq_no.
 * Local-first via PGlite / ElectricSQL.
 */
export function useSysFields(tableName: string) {
  const { isSynced } = useElectric();

  return useQuery<FieldMetadata[]>({
    queryKey: ['sys-electric', 'fields', tableName, isSynced ? 'local' : 'remote'],
    queryFn: async () => {
      if (isSynced) {
        return localQuery<FieldMetadata>(
          `SELECT f.*
           FROM sys_field f
           JOIN sys_column c ON c.sys_column_id = f.sys_column_id
           JOIN sys_table t  ON t.sys_table_id  = c.sys_table_id
           WHERE t.table_name = $1
           ORDER BY f.seq_no`,
          [tableName]
        );
      }

      // HTTP fallback
      const tableRes = await apiClient.get<PaginatedResponse<SysTable>>(
        `/sys/tables?name=${encodeURIComponent(tableName)}`
      );
      const tableId = tableRes.data?.[0]?.sys_table_id;
      if (!tableId) return [];

      const fieldRes = await apiClient.get<PaginatedResponse<FieldMetadata>>(
        `/sys/fields?table_id=${tableId}`
      );
      return fieldRes.data ?? [];
    },
    staleTime: isSynced ? Number.POSITIVE_INFINITY : 5 * 60 * 1000,
    enabled: !!tableName,
  });
}

/* -------------------------------------------------------------------------- */
/*  sys_reference                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Fetch all reference types. Extremely fast from local PGlite.
 */
export function useSysReferences() {
  const { isSynced } = useElectric();

  return useQuery<SysReference[]>({
    queryKey: ['sys-electric', 'references', isSynced ? 'local' : 'remote'],
    queryFn: async () => {
      if (isSynced) {
        return localQuery<SysReference>('SELECT * FROM sys_reference ORDER BY name');
      }

      const res = await apiClient.get<PaginatedResponse<SysReference>>('/sys/references');
      return res.data ?? [];
    },
    staleTime: isSynced ? Number.POSITIVE_INFINITY : 30 * 60 * 1000,
  });
}

/* -------------------------------------------------------------------------- */
/*  Mutations (always go to HTTP API to keep server authoritative)            */
/* -------------------------------------------------------------------------- */

export function useUpdateFieldOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fieldId, newSeqNo }: { fieldId: string; newSeqNo: number }) => {
      return apiClient.patch<FieldMetadata>(`/sys/fields/${fieldId}`, { seq_no: newSeqNo });
    },
    onSuccess: () => {
      // Electric will sync the change back automatically; invalidate to trigger local re-query
      queryClient.invalidateQueries({ queryKey: ['sys-electric', 'fields'] });
    },
  });
}

export function useToggleFieldVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fieldId, isDisplayed }: { fieldId: string; isDisplayed: boolean }) => {
      return apiClient.patch<FieldMetadata>(`/sys/fields/${fieldId}`, {
        is_displayed: isDisplayed,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sys-electric', 'fields'] });
    },
  });
}
