import { useQueries } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { FieldMetadata } from '@/hooks/use-entities';
import type { ADLevel } from '@/components/admin/ad-window-configs';

interface BusWindowMeta {
  sys_window_id: string;
  name: string;
  description?: string;
}

interface BusTableMeta {
  sys_table_id: string;
  table_name: string;
  name: string;
}

/**
 * Builds an ADLevel entirely from Application Dictionary metadata fetched
 * from the backend.  No field lists or display names are hardcoded.
 *
 * entityName: the bus_ entity name without prefix, e.g. 'account', 'contact'
 */
export function useBusEntityLevel(entityName: string) {
  const results = useQueries({
    queries: [
      {
        queryKey: ['bus-form-fields', entityName],
        queryFn: () => apiClient.get<FieldMetadata[]>(`/bus/${entityName}/fields/form`),
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['bus-grid-fields', entityName],
        queryFn: () => apiClient.get<FieldMetadata[]>(`/bus/${entityName}/fields/grid`),
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['sys-window-for-entity', entityName],
        queryFn: async () => {
          const resp = await apiClient.get<{ data: BusWindowMeta[] }>('/sys/windows', { limit: 500 });
          // Match the window whose name equals the entity label from sys_table
          const tableResp = await apiClient.get<{ data: BusTableMeta[] }>('/sys/tables', {
            limit: 500,
          });
          const table = tableResp.data.find(
            (t: BusTableMeta) => t.table_name === `bus_${entityName}`,
          );
          const windowName = table?.name ?? entityName;
          const win = resp.data.find(
            (w: BusWindowMeta) => w.name.toLowerCase() === windowName.toLowerCase(),
          );
          return {
            label: win?.name ?? table?.name ?? entityName,
            windowId: win?.sys_window_id,
          };
        },
        staleTime: 5 * 60 * 1000,
      },
    ],
  });

  const [formQuery, gridQuery, windowQuery] = results;
  const isLoading =
    formQuery.isLoading || gridQuery.isLoading || windowQuery.isLoading;

  const formFields: FieldMetadata[] = (formQuery.data as FieldMetadata[]) ?? [];
  const gridFields: FieldMetadata[] = (gridQuery.data as FieldMetadata[]) ?? [];
  const windowMeta = windowQuery.data as { label: string; windowId?: string } | undefined;
  const label = windowMeta?.label ?? entityName;

  // Derive the name field — the first field that is_identifier, or 'name' as fallback
  const nameField =
    formFields.find((f) => (f as any).is_identifier)?.column_name ?? 'name';

  const level: ADLevel | null = isLoading
    ? null
    : {
        id: entityName,
        label,
        endpoint: `/bus/${entityName}`,
        idField: 'id',
        nameField,
        searchField: nameField,
        formFields,
        gridFields,
        baseRoutePath: `/bus_${entityName}`,
      };

  return { level, isLoading };
}
