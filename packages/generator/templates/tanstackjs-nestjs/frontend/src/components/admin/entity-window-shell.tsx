import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { Home, Info, Tag, Hash, Calendar, Shield, FileText, Database, Layers } from 'lucide-react';
import { apiClient, type PaginatedResponse } from '@/lib/api-client';
import { useFormFields, useGridFields, useTableMetadata, type FieldMetadata } from '@/hooks/use-entities';
import { getFieldTypeLabel, getFieldTypeColor } from '@/lib/field-schema';
import { DynamicForm } from '@/components/forms/dynamic-form';
import { DynamicTable } from '@/components/tables/dynamic-table';
import { DeleteConfirmDialog } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ADToolbar } from './ad-toolbar';
import { ADRecordNav } from './ad-record-nav';

type AnyRecord = Record<string, unknown>;

interface EntityWindowShellProps {
  tableName: string;
  entityLabel: string;
}

function MetadataPanel({ record, fields, tableName, entityLabel }: {
  record: AnyRecord;
  fields?: FieldMetadata[];
  tableName: string;
  entityLabel: string;
}) {
  const { data: tableMeta } = useTableMetadata(tableName);

  const displayedFields = fields?.filter(f => f.is_displayed) ?? [];
  const fieldCount = displayedFields.length;
  const mandatoryCount = displayedFields.filter(f => f.is_mandatory).length;
  const readOnlyCount = displayedFields.filter(f => f.is_read_only).length;

  const typeDistribution = displayedFields.reduce((acc, f) => {
    const label = getFieldTypeLabel(f.sys_reference_id);
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="w-72 flex-shrink-0 border-l border-border bg-muted/20 overflow-auto">
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center gap-2 mb-1">
          <Info className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
            Record Info
          </h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Tag className="w-3.5 h-3.5 text-primary/60 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Entity</p>
              <p className="text-sm font-medium text-foreground truncate">{entityLabel}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Database className="w-3.5 h-3.5 text-primary/60 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Table</p>
              <p className="text-sm font-mono text-foreground">{tableName}</p>
            </div>
          </div>

          {tableMeta?.description && (
            <div className="flex items-start gap-2">
              <FileText className="w-3.5 h-3.5 text-primary/60 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Description</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{tableMeta.description}</p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border pt-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Field Summary</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-center">
              <p className="text-lg font-semibold text-primary">{fieldCount}</p>
              <p className="text-[10px] text-primary/70">Fields</p>
            </div>
            <div className="rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-center">
              <p className="text-lg font-semibold text-amber-600">{mandatoryCount}</p>
              <p className="text-[10px] text-amber-600/70">Required</p>
            </div>
            <div className="rounded-lg bg-muted px-2.5 py-1.5 text-center">
              <p className="text-lg font-semibold text-muted-foreground">{readOnlyCount}</p>
              <p className="text-[10px] text-muted-foreground/70">Read-only</p>
            </div>
            <div className="rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-center">
              <p className="text-lg font-semibold text-emerald-600">{fieldCount - readOnlyCount}</p>
              <p className="text-[10px] text-emerald-600/70">Editable</p>
            </div>
          </div>
        </div>

        {Object.keys(typeDistribution).length > 0 && (
          <div className="border-t border-border pt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Layers className="w-3 h-3 text-muted-foreground" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Field Types</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(typeDistribution).map(([type, count]) => {
                const refId = displayedFields.find(f => getFieldTypeLabel(f.sys_reference_id) === type)?.sys_reference_id ?? 0;
                const colorClass = getFieldTypeColor(refId);
                return (
                  <span key={type} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${colorClass}`}>
                    {type} <span className="opacity-70">({count})</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {record.id && (
          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Record Details</p>
            <div className="flex items-start gap-2">
              <Hash className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">ID</p>
                <p className="text-xs font-mono text-foreground truncate">{String(record.id)}</p>
              </div>
            </div>
            {record.created_at && (
              <div className="flex items-start gap-2">
                <Calendar className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Created</p>
                  <p className="text-xs text-foreground">{new Date(record.created_at as string).toLocaleString()}</p>
                </div>
              </div>
            )}
            {record.updated_at && (
              <div className="flex items-start gap-2">
                <Calendar className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Updated</p>
                  <p className="text-xs text-foreground">{new Date(record.updated_at as string).toLocaleString()}</p>
                </div>
              </div>
            )}
            {record.version != null && (
              <div className="flex items-start gap-2">
                <Shield className="w-3.5 h-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Version</p>
                  <p className="text-xs font-mono text-foreground">{String(record.version)}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function EntityWindowShell({ tableName, entityLabel }: EntityWindowShellProps) {
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const authNavigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      authNavigate({ to: '/auth/login' });
    }
  }, [authLoading, isAuthenticated, authNavigate]);

  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<AnyRecord>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: formFields, isLoading: isLoadingFields } = useFormFields(tableName);
  const { data: gridFields, isLoading: isLoadingGrid } = useGridFields(tableName);

  const fetchParams: Record<string, unknown> = {
    page,
    limit: 100,
    ...(searchQuery ? { search: searchQuery } : {}),
  };

  const { data: recordsData, isLoading, refetch } = useQuery({
    queryKey: ['entity-records', tableName, fetchParams],
    queryFn: () => apiClient.get<PaginatedResponse<AnyRecord>>(`/bus/${tableName}`, fetchParams),
  });

  const records = recordsData?.data || [];
  const totalCount = recordsData?.meta?.total || 0;
  const totalPages = recordsData?.meta?.totalPages || 1;

  const currentRecord = isCreating ? null : (records[currentIndex] || null);
  const currentRecordId = currentRecord?.id as string | undefined;

  useEffect(() => {
    if (currentRecord && !isCreating) {
      setFormData(currentRecord);
      setHasChanges(false);
    }
  }, [currentRecord, isCreating]);

  const saveMutation = useMutation({
    mutationFn: async (data: AnyRecord) => {
      if (isCreating) {
        return apiClient.post(`/bus/${tableName}`, data);
      }
      return apiClient.patch(`/bus/${tableName}/${currentRecordId}`, data, {
        headers: currentRecord?.version ? { 'If-Match': `"${currentRecord.version}"` } : {},
      });
    },
    onSuccess: () => {
      toast.success(isCreating ? `${entityLabel} created` : `${entityLabel} saved`);
      setHasChanges(false);
      setIsCreating(false);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['entity-records', tableName] });
      refetch();
    },
    onError: (error: any) => {
      if (error.statusCode === 412) {
        toast.error('Record was modified by another user. Please refresh and try again.');
        return;
      }
      const msg = error?.message || 'Save failed';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!currentRecordId) throw new Error('No record selected');
      return apiClient.delete(`/bus/${tableName}/${currentRecordId}`);
    },
    onSuccess: () => {
      toast.success(`${entityLabel} deleted`);
      setDeleteDialogOpen(false);
      setViewMode('list');
      queryClient.invalidateQueries({ queryKey: ['entity-records', tableName] });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Delete failed');
    },
  });

  const globalIndex = (page - 1) * 100 + currentIndex;
  const canGoPrev = globalIndex > 0;
  const canGoNext = globalIndex < totalCount - 1;

  const goFirst = useCallback(() => { setPage(1); setCurrentIndex(0); setIsCreating(false); }, []);
  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    else if (page > 1) { setPage(page - 1); setCurrentIndex(99); }
    setIsCreating(false);
  }, [currentIndex, page]);
  const goNext = useCallback(() => {
    if (currentIndex < records.length - 1) setCurrentIndex(currentIndex + 1);
    else if (page < totalPages) { setPage(page + 1); setCurrentIndex(0); }
    setIsCreating(false);
  }, [currentIndex, records.length, page, totalPages]);
  const goLast = useCallback(() => { setPage(totalPages); setCurrentIndex(0); setIsCreating(false); }, [totalPages]);

  const handleRowSelect = useCallback((row: AnyRecord) => {
    const idx = records.findIndex(r => r.id === row.id);
    if (idx !== -1) setCurrentIndex(idx);
    setViewMode('detail');
    setIsEditing(false);
  }, [records]);

  const handleNew = () => {
    setIsCreating(true);
    setIsEditing(true);
    setViewMode('detail');
    setFormData({});
    setHasChanges(false);
  };

  const handleSave = () => { saveMutation.mutate(formData); };

  const handleDelete = () => {
    if (currentRecordId && !isCreating && viewMode === 'detail') {
      setDeleteDialogOpen(true);
    }
  };

  const handleUndo = () => {
    if (currentRecord) setFormData(currentRecord);
    else setFormData({});
    setHasChanges(false);
    setIsCreating(false);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (currentRecord) setFormData(currentRecord);
    setHasChanges(false);
    setIsEditing(false);
  };

  const handleFormChange = useCallback(() => {
    if (!hasChanges) setHasChanges(true);
  }, [hasChanges]);

  const handleFormSubmit = async (data: AnyRecord) => {
    setFormData(data);
    saveMutation.mutate(data);
  };

  return (
    <div className="flex flex-col h-full">
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        itemName={(currentRecord?.name as string) || entityLabel}
        onConfirm={() => deleteMutation.mutate()}
        isConfirming={deleteMutation.isPending}
      />

      <ADToolbar
        onNew={handleNew}
        onSave={handleSave}
        onDelete={handleDelete}
        onUndo={handleUndo}
        onEdit={handleEdit}
        onCancelEdit={handleCancelEdit}
        onRefresh={() => refetch()}
        searchValue={searchQuery}
        onSearchChange={(val) => { setSearchQuery(val); setPage(1); setCurrentIndex(0); }}
        isSaving={saveMutation.isPending}
        isDeleting={deleteMutation.isPending}
        hasChanges={hasChanges || isCreating}
        canDelete={!!currentRecordId && !isCreating && viewMode === 'detail'}
        isEditing={isEditing || isCreating}
        isDetailView={viewMode === 'detail' && !isCreating}
      />

      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-gradient-to-r from-indigo-100 to-sky-50">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
            <Home className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
          <span className="text-muted-foreground/40">/</span>
          {viewMode === 'detail' ? (
            <>
              <button
                onClick={() => { setViewMode('list'); setIsCreating(false); setIsEditing(false); setHasChanges(false); }}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {entityLabel}
              </button>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-xs font-medium text-foreground">
                {isCreating ? 'New Record' : ((currentRecord?.name as string) || (currentRecord?.id as string) || '')}
              </span>
            </>
          ) : (
            <>
              <span className="text-xs font-medium text-foreground">{entityLabel}</span>
              {totalCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium">
                  {totalCount} records
                </span>
              )}
            </>
          )}
        </div>
        {viewMode === 'detail' && !isCreating && (
          <ADRecordNav
            currentIndex={currentIndex}
            totalCount={totalCount}
            page={page}
            pageSize={100}
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
            onFirst={goFirst}
            onPrev={goPrev}
            onNext={goNext}
            onLast={goLast}
          />
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading || isLoadingFields || isLoadingGrid ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : viewMode === 'list' ? (
          records.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Database className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-lg font-medium">No records found</p>
              <p className="text-sm mt-1">Click + to create a new {entityLabel.toLowerCase()}</p>
            </div>
          ) : (
            <div className="p-4">
              <DynamicTable
                tableName={tableName}
                fields={gridFields}
                data={records}
                isLoading={isLoading}
                totalCount={totalCount}
                page={page}
                pageSize={100}
                onPageChange={setPage}
                onRowClick={handleRowSelect}
              />
            </div>
          )
        ) : (
          <div className="flex h-full">
            <div className="flex-1 overflow-auto p-6" onChange={handleFormChange}>
              <DynamicForm
                key={isCreating ? 'new' : currentRecordId || 'empty'}
                tableName={tableName}
                initialData={isCreating ? {} : (currentRecord || {})}
                onSubmit={handleFormSubmit}
                mode={isCreating ? 'create' : isEditing ? 'edit' : 'view'}
                readOnly={!isEditing && !isCreating}
                isSaving={saveMutation.isPending}
              />
            </div>
            {!isCreating && currentRecord && (
              <MetadataPanel
                record={currentRecord}
                fields={formFields}
                tableName={tableName}
                entityLabel={entityLabel}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
