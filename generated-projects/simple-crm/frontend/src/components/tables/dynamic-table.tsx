"use client";

/**
 * Dynamic Table Component
 *
 * Renders a data table based on sys_field metadata from the Application Dictionary.
 * Columns are ordered by seq_no_grid which can be modified at runtime.
 *
 * Auto-generated component
 */

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useQueries } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { apiClient, type PaginatedResponse } from "@/lib/api-client";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type FieldMetadata, useGridFields } from "@/hooks/use-entities";
import { useTranslations } from "@/lib/translations";

// ============================================================================
// Types
// ============================================================================

interface DynamicTableProps {
  tableName: string;
  fields?: FieldMetadata[];
  data: Record<string, unknown>[];
  isLoading?: boolean;
  totalCount?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onRowClick?: (row: Record<string, unknown>) => void;
  onDelete?: (id: string) => void | Promise<void>;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  selectedId?: string;
}

// ============================================================================
// Reference Type Constants
// ============================================================================

const REFERENCE_TYPE = {
  STRING: 10,
  INTEGER: 11,
  AMOUNT: 12,
  ID: 13,
  TEXT: 14,
  DATE: 15,
  DATETIME: 16,
  LIST: 17,
  TABLE: 18,
  TABLE_DIRECT: 19,
  YES_NO: 20,
  URL: 24,
  EMAIL: 30,
  PHONE: 31,
};

// ============================================================================
// Cell Formatters
// ============================================================================

function formatCellValue(value: unknown, referenceId: number): string {
  if (value === null || value === undefined) {
    return "-";
  }

  switch (referenceId) {
    case REFERENCE_TYPE.YES_NO:
      return value ? "Yes" : "No";

    case REFERENCE_TYPE.DATE:
      try {
        return format(new Date(value as string), "dd/MM/yyyy");
      } catch {
        return String(value);
      }

    case REFERENCE_TYPE.DATETIME:
      try {
        return format(new Date(value as string), "dd/MM/yyyy HH:mm:ss");
      } catch {
        return String(value);
      }

    case REFERENCE_TYPE.AMOUNT: {
      const numAmt = typeof value === "number" ? value : parseFloat(String(value));
      return isNaN(numAmt)
        ? String(value)
        : numAmt.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
    }

    case REFERENCE_TYPE.INTEGER: {
      const numInt = typeof value === "number" ? value : parseInt(String(value), 10);
      return isNaN(numInt) ? String(value) : numInt.toLocaleString();
    }

    case REFERENCE_TYPE.TEXT: {
      // Truncate long text
      const text = String(value);
      return text.length > 100 ? text.slice(0, 100) + "..." : text;
    }

    case REFERENCE_TYPE.URL:
      return String(value);

    case REFERENCE_TYPE.EMAIL:
      return String(value);

    default:
      return String(value);
  }
}

// ============================================================================
// Column Generator
// ============================================================================

type LookupMap = Record<string, Record<string, string>>; // refTable → id → displayName

function generateColumns(fields: FieldMetadata[], lookupMap: LookupMap = {}): ColumnDef<Record<string, unknown>>[] {
  return fields.map((field) => ({
    id: field.column_name,
    accessorKey: field.column_name,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8"
        >
          {field.name}
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => {
      const value = row.getValue(field.column_name);
      const isLookup = field.sys_reference_id === REFERENCE_TYPE.TABLE || field.sys_reference_id === REFERENCE_TYPE.TABLE_DIRECT;
      if (isLookup && value != null && field.ref_table_name) {
        const tableMap = lookupMap[field.ref_table_name];
        const displayName = tableMap?.[String(value)];
        return (
          <span className="block truncate max-w-[200px]">
            {displayName ?? String(value)}
          </span>
        );
      }
      return (
        <span className="block truncate max-w-[200px]">
          {formatCellValue(value, field.sys_reference_id)}
        </span>
      );
    },
    enableSorting: true,
    enableFiltering: true,
  }));
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function TableSkeleton() {
  return (
    <div className="space-y-4" data-testid="table-loading-skeleton">
      <div className="flex gap-2">
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="rounded-md border">
        <Table data-testid="entity-table">
          <TableHeader>
            <TableRow>
              {[1, 2, 3, 4].map((i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-24" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((row) => (
              <TableRow key={row}>
                {[1, 2, 3, 4].map((cell) => (
                  <TableCell key={cell}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ============================================================================
// Dynamic Table Component
// ============================================================================

export function DynamicTable({
  tableName,
  fields: externalFields,
  data,
  isLoading: dataLoading = false,
  totalCount = 0,
  page = 1,
  pageSize = 20,
  onPageChange,
  onPageSizeChange: _onPageSizeChange,
  onRowClick,
  onDelete: _onDelete,
  onView,
  onEdit,
  selectedId,
}: DynamicTableProps) {
  const { t } = useTranslations();
  const { data: fetchedFields, isLoading: fetchFieldsLoading, error } = useGridFields(tableName, { enabled: !externalFields });
  const fields = externalFields || fetchedFields;
  const fieldsLoading = externalFields ? false : fetchFieldsLoading;

  // Collect unique lookup fields from the current data
  const lookupFieldDefs = useMemo(() => {
    if (!fields) return [];
    return fields.filter(
      f => (f.sys_reference_id === REFERENCE_TYPE.TABLE || f.sys_reference_id === REFERENCE_TYPE.TABLE_DIRECT) && !!f.ref_table_name
    );
  }, [fields]);

  // For each lookup field, collect unique FK values from data
  const lookupQueries = useMemo(() => {
    return lookupFieldDefs.map(f => {
      const uniqueIds = Array.from(new Set(data.map(row => row[f.column_name]).filter(v => v != null).map(String)));
      return { field: f, uniqueIds };
    }).filter(q => q.uniqueIds.length > 0);
  }, [lookupFieldDefs, data]);

  // Derive entity name from ref_table_name (strip bus_ prefix)
  const lookupResults = useQueries({
    queries: lookupQueries.map(({ field }) => {
      const entity = field.ref_table_name!.replace(/^bus_/, '');
      const endpoint = field.ref_endpoint ?? `/bus/${entity}`;
      return {
        queryKey: ['lookup', field.ref_table_name, tableName],
        queryFn: () => apiClient.get<PaginatedResponse<Record<string, unknown>>>(endpoint, { limit: 500 }),
        staleTime: 60_000,
      };
    }),
  });

  // Build a lookup map: { refTableName: { id: displayName } }
  const lookupMap = useMemo<LookupMap>(() => {
    const map: LookupMap = {};
    lookupQueries.forEach(({ field }, i) => {
      const result = lookupResults[i];
      if (!result.data) return;
      const records = Array.isArray(result.data) ? result.data : (result.data as any).data ?? [];
      const idField = field.ref_id_field ?? 'id';
      const labelField = field.ref_label_field ?? 'name';
      const tableMap: Record<string, string> = {};
      for (const rec of records) {
        const id = String((rec as any)[idField] ?? '');
        // Try configured label, then full-name fallback, then first_name, then id
        const label = (rec as any)[labelField] != null
          ? String((rec as any)[labelField])
          : (rec as any).first_name != null
            ? [String((rec as any).first_name), String((rec as any).last_name ?? '')].filter(Boolean).join(' ')
            : id;
        if (id) tableMap[id] = label;
      }
      map[field.ref_table_name!] = tableMap;
    });
    return map;
  }, [lookupQueries, lookupResults]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<{ id: string; name?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle delete with confirmation
  const handleDeleteClick = (rowId: string) => {
    const row = data.find((r) => (r as any).id === rowId);
    const rowName = row
      ? (row as any).name || (row as any).title || (row as any).patient_name || `Record #${rowId}`
      : undefined;
    setRowToDelete({ id: rowId, name: rowName });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!rowToDelete || !_onDelete) return;

    setIsDeleting(true);
    try {
      await _onDelete(rowToDelete.id);
      setDeleteDialogOpen(false);
      setRowToDelete(null);

      // Show success toast (handled by the parent component's mutation)
    } catch (error) {
      // Show error toast
      const errorMessage =
        error instanceof Error ? error.message : t("common.unexpectedError" as any);
      toast.error(t("table.deleteFailed" as any), {
        description: errorMessage,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Generate columns from field metadata (ordered by seq_no_grid)
  const columns = useMemo(() => {
    const baseColumns = !fields ? [] : generateColumns(fields, lookupMap);

    // Add actions column FIRST if callbacks are provided
    if (onView || onEdit || _onDelete) {
      baseColumns.unshift({
        id: "actions",
        header: t("common.actions" as any),
        cell: ({ row }) => {
          // The primary key column is always 'id' in the database schema
          const rowId = row.original.id as string;

          return (
            <div className="flex gap-2">
              {onView && (
                <button
                  onClick={() => onView(rowId)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  View
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => onEdit(rowId)}
                  className="text-green-600 hover:text-green-800 text-sm"
                >
                  Edit
                </button>
              )}
              {_onDelete && (
                <button
                  onClick={() => handleDeleteClick(rowId)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              )}
            </div>
          );
        },
        enableSorting: false,
        // enableFiltering is not supported in TanStack Table v8
      });
    }

    return baseColumns;
  }, [fields, onView, onEdit, _onDelete, tableName, t, lookupMap]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pageSize),
  });

  if (fieldsLoading || dataLoading) {
    return <TableSkeleton />;
  }

  if (error && !externalFields) {
    return (
      <div className="rounded-md bg-destructive/15 p-4 text-destructive">
        Failed to load table columns: {error.message}
      </div>
    );
  }

  if (!fields || fields.length === 0) {
    return (
      <div className="rounded-md bg-muted p-4 text-muted-foreground">
        No columns configured for grid display.
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-4">
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        itemName={rowToDelete?.name}
        onConfirm={confirmDelete}
        isConfirming={isDeleting}
      />

      {/* Search */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8"
          />
        </div>
        {/* Record Count - Moved above table */}
        {totalCount > 0 && (
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of{" "}
            {totalCount} entries
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border" data-testid="entity-table-container">
        <Table data-testid="entity-table">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-slate-700 hover:bg-slate-700">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-white font-semibold">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                // The primary key column is always 'id' in the database schema
                const rowId = row.original.id as string;
                const isSelected = selectedId === rowId;

                return (
                  <TableRow
                    key={row.id}
                    data-state={isSelected && "selected"}
                    className={`${onRowClick ? "cursor-pointer hover:bg-primary/10" : ""} ${row.index % 2 === 1 ? "bg-primary/[0.04]" : ""} transition-colors`}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow data-testid="no-results-row">
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(1)}
            disabled={page === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(page + 1)}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(totalPages)}
            disabled={page === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
