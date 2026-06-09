import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient, type PaginatedResponse } from '@/lib/api-client';
import { useFormFields, useGridFields, type FieldMetadata } from '@/hooks/use-entities';
import { DynamicForm } from '@/components/forms/dynamic-form';
import { DynamicTable } from '@/components/tables/dynamic-table';
import { Skeleton } from '@/components/ui/skeleton';
import { ADToolbar } from './ad-toolbar';
import { ADRecordNav } from './ad-record-nav';

type AnyRecord = Record<string, unknown>;

interface EntityWindowShellProps {
  tableName: string;
  entityLabel: string;
}

export function EntityWindowShell({ tableName, entityLabel }: EntityWindowShellProps) {
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<AnyRecord>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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
  }, [records]);

  const handleNew = () => {
    setIsCreating(true);
    setViewMode('detail');
    setFormData({});
    setHasChanges(false);
  };

  const handleSave = () => { saveMutation.mutate(formData); };

  const handleUndo = () => {
    if (currentRecord) setFormData(currentRecord);
    else setFormData({});
    setHasChanges(false);
    setIsCreating(false);
  };

  const handleFormSubmit = async (data: AnyRecord) => {
    setFormData(data);
    saveMutation.mutate(data);
  };

  return (
    <div className="flex flex-col h-full">
      <ADToolbar
        onNew={handleNew}
        onSave={handleSave}
        onDelete={() => deleteMutation.mutate()}
        onUndo={handleUndo}
        onRefresh={() => refetch()}
        searchValue={searchQuery}
        onSearchChange={(val) => { setSearchQuery(val); setPage(1); setCurrentIndex(0); }}
        isSaving={saveMutation.isPending}
        isDeleting={deleteMutation.isPending}
        hasChanges={hasChanges || isCreating}
        canDelete={!!currentRecordId && !isCreating && viewMode === 'detail'}
      />

      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
        <div className="flex items-center gap-2">
          {viewMode === 'detail' && (
            <button
              onClick={() => { setViewMode('list'); setIsCreating(false); setHasChanges(false); }}
              className="text-sm text-primary hover:underline font-medium"
            >
              ← Back to List
            </button>
          )}
          <span className="text-sm font-medium text-muted-foreground">
            {entityLabel}
            {viewMode === 'detail' && currentRecord && !isCreating && (
              <span>: {(currentRecord.name as string) || (currentRecord.id as string)}</span>
            )}
            {isCreating && ': New Record'}
          </span>
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
              <p className="text-lg">No records found</p>
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
          <div className="p-6">
            <DynamicForm
              tableName={tableName}
              initialData={isCreating ? {} : (currentRecord || {})}
              onSubmit={handleFormSubmit}
              mode={isCreating ? 'create' : 'edit'}
              isSaving={saveMutation.isPending}
            />
          </div>
        )}
      </div>
    </div>
  );
}
