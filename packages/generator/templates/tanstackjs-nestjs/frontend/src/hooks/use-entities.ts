/**
 * TanStack Query Hooks for Entity CRUD Operations
 *
 * Generated: 2026-01-26T15:23:31.901Z
 */

import { type UseQueryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ApiError, apiClient, type PaginatedResponse } from "@/lib/api-client";

// ============================================================================
// Types
// ============================================================================

export interface EntityRecord {
  [key: string]: unknown;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface EntityListParams {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: "asc" | "desc";
  search?: string;
  [key: string]: unknown;
}

export interface FieldMetadata {
  sys_field_id: string;
  name: string;
  column_name: string;
  sys_reference_id: number;
  is_mandatory: boolean;
  field_length?: number;
  default_value?: string;
  seq_no: number;
  seq_no_grid: number;
  is_displayed: boolean;
  is_displayed_grid: boolean;
  is_read_only: boolean;
  // Group and styling properties
  sys_field_group_id?: string;
  group_name?: string;
  group_description?: string;
  group_columns?: number;
  group_layout_type?: string;
  col_span?: number;
  row_span?: number;
  color?: string;
  font_weight?: string;
  font_style?: string;
  // Reference table properties (for table reference fields)
  ref_table_id?: string;
  ref_table_name?: string;
  ref_key_column?: string;
  ref_display_column?: string;
}

export interface FieldGroup {
  sys_field_group_id: string;
  sys_tab_id: string;
  name: string;
  description?: string;
  seq_no: number;
  columns: number;
  layout_type: string;
  is_collapsed_by_default: boolean;
}

export interface TableMetadata {
  sys_table_id: string;
  table_name: string;
  name: string;
  description?: string;
  icon?: string;
  access_level: string;
  is_view: boolean;
  is_document: boolean;
  is_high_volume: boolean;
  is_changelog: boolean;
  entity_type: string;
  is_active: boolean;
}

// ============================================================================
// Query Keys
// ============================================================================

export const entityKeys = {
  all: ["entities"] as const,
  lists: () => [...entityKeys.all, "list"] as const,
  list: (entity: string, params?: EntityListParams) =>
    [...entityKeys.lists(), entity, params] as const,
  details: () => [...entityKeys.all, "detail"] as const,
  detail: (entity: string, id: string) => [...entityKeys.details(), entity, id] as const,
  metadata: (entity: string) => [...entityKeys.all, "metadata", entity] as const,
  table: (entity: string) => [...entityKeys.all, "table", entity] as const,
  fields: (entity: string, type: "form" | "grid" | "form-all" | "grid-all") =>
    [...entityKeys.all, "fields", entity, type] as const,
};

// ============================================================================
// List Hook
// ============================================================================

export function useEntities<T extends EntityRecord = EntityRecord>(
  entity: string,
  params?: EntityListParams,
  options?: Omit<UseQueryOptions<PaginatedResponse<T>, ApiError>, "queryKey" | "queryFn">
) {
  return useQuery<PaginatedResponse<T>, ApiError>({
    queryKey: entityKeys.list(entity, params),
    queryFn: () => apiClient.get<PaginatedResponse<T>>(`/bus/${entity}`, params),
    ...options,
  });
}

// ============================================================================
// Detail Hook
// ============================================================================

export function useEntity<T extends EntityRecord = EntityRecord>(
  entity: string,
  id: string,
  options?: Omit<UseQueryOptions<T, ApiError>, "queryKey" | "queryFn">
) {
  return useQuery<T, ApiError>({
    queryKey: entityKeys.detail(entity, id),
    queryFn: () => apiClient.get<T>(`/bus/${entity}/${id}`),
    enabled: !!id,
    ...options,
  });
}

// ============================================================================
// Metadata Hooks
// ============================================================================

export function useEntityMetadata(entity: string) {
  return useQuery({
    queryKey: entityKeys.metadata(entity),
    queryFn: () => apiClient.get(`/bus/${entity}/meta`),
    staleTime: 30 * 60 * 1000, // 30 minutes - metadata rarely changes
  });
}

/**
 * Fetch table metadata (including icon) from sys_table
 */
export function useTableMetadata(entity: string) {
  return useQuery<TableMetadata>({
    queryKey: entityKeys.table(entity),
    queryFn: async () => {
      const response = await apiClient.get<{ data: TableMetadata }>(
        `/sys/table?table_name=${entity}`
      );
      return response.data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - table metadata rarely changes
  });
}

export function useFormFields(entity: string) {
  return useQuery<FieldMetadata[]>({
    queryKey: entityKeys.fields(entity, "form"),
    queryFn: async () => {
      const response = await apiClient.get<{ data: FieldMetadata[] }>(`/bus/${entity}/fields/form`);
      return response.data;
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useGridFields(entity: string) {
  return useQuery<FieldMetadata[]>({
    queryKey: entityKeys.fields(entity, "grid"),
    queryFn: async () => {
      const response = await apiClient.get<{ data: FieldMetadata[] }>(`/bus/${entity}/fields/grid`);
      return response.data;
    },
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Get ALL form fields including hidden ones (for layout editor)
 */
export function useAllFormFields(entity: string) {
  return useQuery<FieldMetadata[]>({
    queryKey: entityKeys.fields(entity, "form-all"),
    queryFn: async () => {
      const response = await apiClient.get<{ data: FieldMetadata[] }>(
        `/bus/${entity}/fields/form/all`
      );
      return response.data;
    },
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Get ALL grid fields including hidden ones (for layout editor)
 */
export function useAllGridFields(entity: string) {
  return useQuery<FieldMetadata[]>({
    queryKey: entityKeys.fields(entity, "grid-all"),
    queryFn: async () => {
      const response = await apiClient.get<{ data: FieldMetadata[] }>(
        `/bus/${entity}/fields/grid/all`
      );
      return response.data;
    },
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Get field groups for an entity
 */
export function useFieldGroups(entity: string) {
  return useQuery<FieldGroup[]>({
    queryKey: ["field-groups", entity],
    queryFn: async () => {
      const response = await apiClient.get<{ data: FieldGroup[] }>(`/bus/${entity}/field-groups`);
      return response.data;
    },
    staleTime: 30 * 60 * 1000,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export function useCreateEntity<T extends EntityRecord = EntityRecord>(entity: string) {
  const queryClient = useQueryClient();

  return useMutation<T, ApiError, Partial<T>>({
    mutationFn: (data) => apiClient.post<T>(`/bus/${entity}`, data),
    onSuccess: () => {
      // Invalidate list queries to refetch
      queryClient.invalidateQueries({ queryKey: entityKeys.lists() });
    },
  });
}

export function useUpdateEntity<T extends EntityRecord = EntityRecord>(entity: string) {
  const queryClient = useQueryClient();

  return useMutation<T, ApiError, { id: string; data: Partial<T>; version?: number }>({
    mutationFn: ({ id, data, version }) =>
      apiClient.patch<T>(`/bus/${entity}/${id}`, data, {
        headers: version ? { "If-Match": `"v${version}"` } : undefined,
      }),
    onSuccess: (_, variables) => {
      // Invalidate specific detail query
      queryClient.invalidateQueries({
        queryKey: entityKeys.detail(entity, variables.id),
      });
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: entityKeys.lists() });
    },
  });
}

export function useDeleteEntity(entity: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => apiClient.delete(`/bus/${entity}/${id}`),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: entityKeys.detail(entity, id) });
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: entityKeys.lists() });
    },
  });
}

// ============================================================================
// Prefetch Utilities
// ============================================================================

export function usePrefetchEntity(entity: string) {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: entityKeys.detail(entity, id),
      queryFn: () => apiClient.get(`/bus/${entity}/${id}`),
    });
  };
}

export function usePrefetchEntityList(entity: string) {
  const queryClient = useQueryClient();

  return (params?: EntityListParams) => {
    queryClient.prefetchQuery({
      queryKey: entityKeys.list(entity, params),
      queryFn: () => apiClient.get(`/bus/${entity}`, params),
    });
  };
}

// ============================================================================
// Field Group Mutations
// ============================================================================

export function useCreateFieldGroup(entity: string) {
  const queryClient = useQueryClient();

  return useMutation<FieldGroup, ApiError, Omit<FieldGroup, "sys_field_group_id" | "sys_tab_id">>({
    mutationFn: (groupData) => apiClient.post<FieldGroup>(`/bus/${entity}/field-groups`, groupData),
    onSuccess: () => {
      // Invalidate field groups query
      queryClient.invalidateQueries({ queryKey: ["field-groups", entity] });
      // Invalidate fields queries (as grouping might change)
      queryClient.invalidateQueries({ queryKey: entityKeys.fields(entity, "form") });
      queryClient.invalidateQueries({ queryKey: entityKeys.fields(entity, "grid") });
    },
  });
}

export function useUpdateFieldGroup(entity: string) {
  const queryClient = useQueryClient();

  return useMutation<FieldGroup, ApiError, { groupId: string; updates: Partial<FieldGroup> }>({
    mutationFn: ({ groupId, updates }) =>
      apiClient.put<FieldGroup>(`/bus/${entity}/field-groups/${groupId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-groups", entity] });
      queryClient.invalidateQueries({ queryKey: entityKeys.fields(entity, "form") });
      queryClient.invalidateQueries({ queryKey: entityKeys.fields(entity, "grid") });
    },
  });
}

export function useDeleteFieldGroup(entity: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (groupId) => apiClient.delete(`/bus/${entity}/field-groups/${groupId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-groups", entity] });
      queryClient.invalidateQueries({ queryKey: entityKeys.fields(entity, "form") });
      queryClient.invalidateQueries({ queryKey: entityKeys.fields(entity, "grid") });
    },
  });
}

export function useAssignFieldToGroup(entity: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, { fieldId: string; groupId: string | null }>({
    mutationFn: ({ fieldId, groupId }) =>
      apiClient.put(`/bus/${entity}/fields/${fieldId}/group`, { groupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-groups", entity] });
      queryClient.invalidateQueries({ queryKey: entityKeys.fields(entity, "form") });
      queryClient.invalidateQueries({ queryKey: entityKeys.fields(entity, "grid") });
    },
  });
}

export function useUpdateFieldStyle(entity: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, { fieldId: string; style: Partial<FieldMetadata> }>({
    mutationFn: ({ fieldId, style }) =>
      apiClient.patch(`/bus/${entity}/fields/${fieldId}/style`, style),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entityKeys.fields(entity, "form") });
      queryClient.invalidateQueries({ queryKey: entityKeys.fields(entity, "grid") });
    },
  });
}

// ============================================================================
// Reference List Hooks (for sys_ref_list dropdowns)
// ============================================================================

interface RefListValue {
  sys_ref_list_id: string;
  sys_reference_id: number;
  value: string;
  name: string;
  description?: string;
  valid_from?: string;
  valid_to?: string;
  entity_type: string;
}

interface TableReferenceValue {
  id: string;
  [key: string]: unknown;
}

/**
 * Fetch dropdown values from sys_ref_list by sys_reference_id
 * Used for List type fields (sys_reference_id >= 1000)
 */
export function useRefList(sysReferenceId: number) {
  return useQuery<RefListValue[]>({
    queryKey: ["ref-list", sysReferenceId],
    queryFn: async () => {
      if (!sysReferenceId || sysReferenceId < 1000) {
        return [];
      }
      const response = await apiClient.get<{ data: RefListValue[] }>(
        `/sys/ref-list?sys_reference_id=${sysReferenceId}`
      );
      return response.data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Fetch table reference data (e.g., patient_id → bus_patient)
 * Used for Table type fields (sys_reference_id in sys_ref_table)
 */
export function useTableReference(
  sysReferenceId: number | undefined,
  tableName: string | undefined
) {
  return useQuery<TableReferenceValue[]>({
    queryKey: ["table-ref", sysReferenceId, tableName],
    queryFn: async () => {
      if (!sysReferenceId || !tableName) {
        return [];
      }
      const response = await apiClient.get<TableReferenceValue[]>(`/bus/${tableName}`);
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - table data changes more frequently
  });
}
