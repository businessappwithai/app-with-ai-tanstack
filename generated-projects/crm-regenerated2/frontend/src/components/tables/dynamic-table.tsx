import { useMemo } from 'react'
import { useGridFields, type FieldMetadata } from '@/hooks/use-entities'
import { Button } from '@/components/ui/button'
import {
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'

interface DynamicTableProps {
  tableName: string
  data: Record<string, unknown>[]
  isLoading: boolean
  totalCount: number
  onView: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  page: number
  pageSize: number
  onPageChange: (page: number) => void
}

function formatCellValue(value: unknown, field: FieldMetadata): string {
  if (value === null || value === undefined) return '—'
  // Boolean (YesNo = 20)
  if (field.sys_reference_id === 20) return value ? 'Yes' : 'No'
  // Date (15) / DateTime (16)
  if (field.sys_reference_id === 15 || field.sys_reference_id === 16) {
    try {
      return new Date(value as string).toLocaleDateString()
    } catch {
      return String(value)
    }
  }
  return String(value)
}

export function DynamicTable({
  tableName,
  data,
  isLoading,
  totalCount,
  onView,
  onEdit,
  onDelete,
  page,
  pageSize,
  onPageChange,
}: DynamicTableProps) {
  const { data: gridFields, isLoading: isLoadingFields } = useGridFields(tableName)

  const columns = useMemo(() => {
    if (!gridFields || gridFields.length === 0) return []
    return gridFields
      .filter((f) => f.is_displayed_grid)
      .sort((a, b) => a.seq_no_grid - b.seq_no_grid)
      .slice(0, 8) // cap at 8 columns to avoid overflow
  }, [gridFields])

  const totalPages = Math.ceil(totalCount / pageSize)

  if (isLoading || isLoadingFields) {
    return (
      <div className="flex items-center justify-center h-64 rounded-xl border border-border/60 bg-card">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary/60" />
          <p className="text-sm text-muted-foreground">Loading records...</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-border/60 bg-muted/20 text-center">
        <p className="text-muted-foreground font-medium">No records found</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Try adjusting your search filters</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-xl border border-border/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                {columns.length > 0 ? (
                  columns.map((col) => (
                    <th
                      key={col.sys_field_id || col.column_name}
                      className="px-4 py-3 text-left font-semibold text-foreground/80 whitespace-nowrap"
                    >
                      {col.name || col.column_name}
                    </th>
                  ))
                ) : (
                  <th className="px-4 py-3 text-left font-semibold text-foreground/80">ID</th>
                )}
                <th className="px-4 py-3 text-right font-semibold text-foreground/80">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr
                  key={String(row['id'] || idx)}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
                >
                  {columns.length > 0 ? (
                    columns.map((col) => (
                      <td
                        key={col.sys_field_id || col.column_name}
                        className="px-4 py-3 text-foreground/80 max-w-[200px] truncate"
                        title={String(row[col.column_name] ?? '')}
                      >
                        {formatCellValue(row[col.column_name], col)}
                      </td>
                    ))
                  ) : (
                    <td className="px-4 py-3 text-foreground/80 font-mono text-xs">
                      {String(row['id'] || '—')}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10"
                        onClick={() => onView(String(row['id']))}
                        title="View"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10"
                        onClick={() => onEdit(String(row['id']))}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onDelete(String(row['id']))}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of{' '}
            {totalCount} records
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm font-medium px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="shadow-sm"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
