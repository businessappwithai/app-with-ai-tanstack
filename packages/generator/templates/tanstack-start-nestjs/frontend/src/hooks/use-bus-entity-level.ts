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
          const tableResp = await apiClient.get<{ data: BusTableMeta[] }>('/sys/tables', { limit: 500 });
          // Support both simple (account→bus_account) and kebab-case slugs (sales-order→bus_sales_order)
          const tableNameCandidates = [
            `bus_${entityName}`,
            `bus_${entityName.replace(/-/g, '_')}`,
          ];
          const table = tableResp.data.find((t: BusTableMeta) => tableNameCandidates.includes(t.table_name));
          const windowName = table?.name ?? entityName;
          // Match window by display name or by slug derived from window name
          const win = resp.data.find(
            (w: BusWindowMeta) =>
              w.name.toLowerCase() === windowName.toLowerCase() ||
              w.name.toLowerCase().replace(/\s+/g, '-') === entityName,
          );
          const windowSlug = win?.name.toLowerCase().replace(/\s+/g, '-') ?? entityName;
          return {
            label: win?.name ?? table?.name ?? entityName,
            windowId: win?.sys_window_id,
            windowSlug,
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
  const windowMeta = windowQuery.data as { label: string; windowId?: string; windowSlug: string } | undefined;
  const label = windowMeta?.label ?? entityName;
  const windowSlug = windowMeta?.windowSlug ?? entityName;

  // Derive the name field — first non-id identifier field, then common name fallbacks
  const NAME_FALLBACKS = ['name', 'title', 'first_name', 'description', 'type'];
  const nameField =
    formFields.find((f) => (f as any).is_identifier && f.column_name !== 'id')?.column_name ??
    NAME_FALLBACKS.find((candidate) => formFields.some((f) => f.column_name === candidate)) ??
    'name';

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
        // Route path derived from Window name in Application Dictionary (kebab-case slug)
        baseRoutePath: `/${windowSlug}`,
      };

  return { level, isLoading };
}
