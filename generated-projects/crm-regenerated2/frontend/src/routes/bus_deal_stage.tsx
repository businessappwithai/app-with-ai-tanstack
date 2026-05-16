/**
 * DealStage List Page
 *
 * Displays a paginated, sortable list of DealStage records
 * using TanStack Table with dynamic columns from sys_field.
 *
 * Features:
 * - Quick Search: client-side filtering across all visible columns
 * - Advanced Search: toggle-able panel with field selection, operator, and value
 * - Dynamic columns driven by sys_field metadata (is_displayed_grid, seq_no_grid)
 * - Server-side pagination
 * - Row actions (View, Edit, Delete)
 *
 * Generated: 2026-05-16T05:41:34.304Z
 * Project: CRM Regenerated 2
 */

import { useState, useMemo, useCallback } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, PaginatedResponse } from '@/lib/api-client';
import { useGridFields, type FieldMetadata } from '@/hooks/use-entities';
import { DynamicTable } from '@/components/tables/dynamic-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
  ChevronLeft,
  Trash2,
  FileText,
} from 'lucide-react';

export const Route = createFileRoute('/bus_deal_stage/')({
  component: EntityListPage,
});

interface DealStage {
  id: string;
  pipeline_id: string;
  name: string;
  sort_order: number;
  default_probability: number;
  is_won: boolean;
  is_lost: boolean;
  version?: number;
  [key: string]: unknown;
}

// Operators available for advanced search based on field type
const TEXT_OPERATORS = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with', label: 'Ends with' },
  { value: 'not_equals', label: 'Not equals' },
];

const NUMERIC_OPERATORS = [
  { value: 'equals', label: '=' },
  { value: 'not_equals', label: '!=' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
];

const BOOLEAN_OPERATORS = [
  { value: 'equals', label: 'Is' },
];

interface AdvancedFilter {
  id: string;
  field: string;
  operator: string;
  value: string;
}

/**
 * Determine which operators to show for a given field's data type
 */
function getOperatorsForField(field?: FieldMetadata): { value: string; label: string }[] {
  if (!field) return TEXT_OPERATORS;
  const refId = field.sys_reference_id;
  // Boolean-like reference IDs (from Compiere: 20 = YesNo)
  if (refId === 20) return BOOLEAN_OPERATORS;
  // Numeric types (from Compiere: 11 = Integer, 12 = Amount, 22 = Number, 29 = Quantity)
  if ([11, 12, 22, 29].includes(refId)) return NUMERIC_OPERATORS;
  return TEXT_OPERATORS;
}

/**
 * Build query string parameters from advanced filters
 */
function buildFilterParams(filters: AdvancedFilter[]): Record<string, string> {
  const params: Record<string, string> = {};
  filters.forEach((f) => {
    if (f.field && f.value) {
      // Send as field[operator]=value for the backend to parse
      params[`filter.${f.field}`] = `${f.operator}:${f.value}`;
    }
  });
  return params;
}

/**
 * Client-side quick filter: checks if any visible cell value contains the search term
 */
function matchesQuickSearch(
  record: Record<string, unknown>,
  searchTerm: string,
  visibleColumns: string[]
): boolean {
  if (!searchTerm) return true;
  const lower = searchTerm.toLowerCase();
  return visibleColumns.some((col) => {
    const val = record[col];
    if (val === null || val === undefined) return false;
    return String(val).toLowerCase().includes(lower);
  });
}

function EntityListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Quick Search (client-side)
  const [quickSearch, setQuickSearch] = useState('');

  // Advanced Search
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilter[]>([]);

  // Fetch field metadata from sys_field for dynamic column rendering
  const { data: gridFields } = useGridFields('bus_deal_stage');

  // Visible column names (from sys_field metadata) for quick search matching
  const visibleColumns = useMemo(() => {
    if (!gridFields || gridFields.length === 0) return ['id', 'name'];
    return gridFields
      .filter((f) => f.is_displayed_grid)
      .sort((a, b) => a.seq_no_grid - b.seq_no_grid)
      .map((f) => f.column_name);
  }, [gridFields]);

  // Build server-side filter params from advanced search
  const filterParams = useMemo(() => buildFilterParams(advancedFilters), [advancedFilters]);

  // Fetch entity data with pagination and advanced filters
  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['deal-stage', 'list', page, pageSize, filterParams],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        ...filterParams,
      });
      return apiClient.get<PaginatedResponse<DealStage>>(
        `/api/bus/bus_deal_stage?${params.toString()}`
      );
    },
  });

  // Apply client-side quick search filtering on fetched data
  const filteredData = useMemo(() => {
    const data = response?.data || [];
    if (!quickSearch.trim()) return data;
    return data.filter((record) =>
      matchesQuickSearch(record as Record<string, unknown>, quickSearch, visibleColumns)
    );
  }, [response?.data, quickSearch, visibleColumns]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/bus/bus_deal_stage/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-stage'] });
    },
  });

  // Advanced filter management
  const addFilter = useCallback(() => {
    const defaultField = visibleColumns[0] || '';
    const defaultOps = gridFields
      ? getOperatorsForField(gridFields.find((f) => f.column_name === defaultField))
      : TEXT_OPERATORS;
    setAdvancedFilters((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        field: defaultField,
        operator: defaultOps[0]?.value || 'contains',
        value: '',
      },
    ]);
  }, [visibleColumns, gridFields]);

  const updateFilter = useCallback((id: string, updates: Partial<AdvancedFilter>) => {
    setAdvancedFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  }, []);

  const removeFilter = useCallback((id: string) => {
    setAdvancedFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearAllFilters = useCallback(() => {
    setAdvancedFilters([]);
    setQuickSearch('');
    setPage(1);
  }, []);

  const applyAdvancedSearch = useCallback(() => {
    setPage(1); // Reset to first page when applying new filters
  }, []);

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto py-8 px-4">
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-muted/30 p-12 text-center backdrop-blur-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 mb-4">
              <RefreshCw className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-destructive text-lg font-semibold">Error loading DealStage records</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please check your connection and try again.
            </p>
            <Button onClick={() => refetch()} variant="outline" className="mt-6 shadow-sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const activeFilterCount = advancedFilters.filter((f) => f.field && f.value).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto py-8 px-4 space-y-6">
        {/* Header - Enhanced Design */}
        <div className="rounded-2xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20 backdrop-blur-sm p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="hover:bg-primary/10">
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground" data-testid="entity-heading">DealStage</h1>
                  <p className="text-muted-foreground">
                    DealStage entity
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => refetch()} variant="outline" size="sm" className="shadow-sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Link to="/bus_deal_stage/new">
                <Button size="sm" data-testid="create-new-button" className="shadow-md shadow-primary/20">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New
                </Button>
              </Link>
            </div>
          </div>
        </div>

      {/* Search Bar - Enhanced Design */}
      <div className="space-y-4">
        {/* Quick Search + Advanced Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground/70" />
            <Input
              placeholder="Quick search across all columns..."
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              className="pl-10 h-10 bg-background/80 backdrop-blur-sm border-border/60 focus:border-primary/50 focus:ring-primary/20 shadow-sm"
            />
            {quickSearch && (
              <button
                onClick={() => setQuickSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant={showAdvanced ? 'default' : 'outline'}
            size="default"
            onClick={() => {
              setShowAdvanced(!showAdvanced);
              if (!showAdvanced && advancedFilters.length === 0) {
                addFilter();
              }
            }}
            className={showAdvanced ? 'shadow-md shadow-primary/20' : 'shadow-sm hover:shadow-md transition-shadow'}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Advanced
            {activeFilterCount > 0 && (
              <span className="ml-1.5 flex h-5.5 w-5.5 items-center justify-center rounded-full bg-primary-foreground text-primary text-xs font-semibold shadow-sm">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {(quickSearch || activeFilterCount > 0) && (
            <Button variant="ghost" size="default" onClick={clearAllFilters} className="hover:bg-muted/50">
              Clear all
            </Button>
          )}
        </div>

        {/* Advanced Search Panel - Enhanced Design */}
        {showAdvanced && (
          <div className="rounded-xl border border-border/60 bg-gradient-to-br from-muted/40 to-muted/20 backdrop-blur-sm p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4.5 w-4.5 text-primary/70" />
                <h3 className="text-sm font-semibold text-foreground">Advanced Search</h3>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={addFilter} className="shadow-sm">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Filter
                </Button>
                <Button size="sm" onClick={applyAdvancedSearch} className="shadow-md shadow-primary/20">
                  <Search className="mr-1.5 h-3.5 w-3.5" />
                  Apply
                </Button>
              </div>
            </div>

            {advancedFilters.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mb-3">
                  <Search className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No filters added. Click &quot;Add Filter&quot; to build a search query.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {advancedFilters.map((filter) => {
                  const selectedField = gridFields?.find(
                    (f) => f.column_name === filter.field
                  );
                  const operators = getOperatorsForField(selectedField);

                  return (
                    <div key={filter.id} className="flex items-center gap-2.5">
                      {/* Field Selector */}
                      <Select
                        value={filter.field}
                        onValueChange={(value) => {
                          const newField = gridFields?.find((f) => f.column_name === value);
                          const newOps = getOperatorsForField(newField);
                          updateFilter(filter.id, {
                            field: value,
                            operator: newOps[0]?.value || 'contains',
                            value: '',
                          });
                        }}
                      >
                        <SelectTrigger className="w-[200px] bg-background/80 backdrop-blur-sm border-border/60 shadow-sm">
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          {gridFields
                            ?.filter((f) => f.is_displayed_grid)
                            .sort((a, b) => a.seq_no_grid - b.seq_no_grid)
                            .map((f) => (
                              <SelectItem key={f.column_name} value={f.column_name}>
                                {f.name || f.column_name}
                              </SelectItem>
                            )) ||
                            visibleColumns.map((col) => (
                              <SelectItem key={col} value={col}>
                                {col}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>

                      {/* Operator Selector */}
                      <Select
                        value={filter.operator}
                        onValueChange={(value) =>
                          updateFilter(filter.id, { operator: value })
                        }
                      >
                        <SelectTrigger className="w-[140px] bg-background/80 backdrop-blur-sm border-border/60 shadow-sm">
                          <SelectValue placeholder="Operator" />
                        </SelectTrigger>
                        <SelectContent>
                          {operators.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Value Input */}
                      <Input
                        placeholder="Value..."
                        value={filter.value}
                        onChange={(e) =>
                          updateFilter(filter.id, { value: e.target.value })
                        }
                        className="flex-1 bg-background/80 backdrop-blur-sm border-border/60 shadow-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            applyAdvancedSearch();
                          }
                        }}
                      />

                      {/* Remove Filter */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFilter(filter.id)}
                        className="shrink-0 hover:bg-muted/50"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground/70" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Data Table (columns dynamically rendered from sys_field via DynamicTable) */}
      <DynamicTable
        tableName="bus_deal_stage"
        data={filteredData}
        isLoading={isLoading}
        totalCount={
          quickSearch
            ? filteredData.length
            : response?.meta?.total || 0
        }
        onView={(id) => navigate({ to: '/bus_deal_stage/$id', params: { id } })}
        onEdit={(id) => navigate({ to: '/bus_deal_stage/$id', params: { id } })}
        onDelete={(id) => {
          if (confirm('Are you sure you want to delete this record?')) {
            deleteMutation.mutate(id);
          }
        }}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </div>
    </div>
  );
}
