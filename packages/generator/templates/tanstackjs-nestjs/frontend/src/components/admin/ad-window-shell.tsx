import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient, type PaginatedResponse } from '@/lib/api-client';
import { DynamicForm } from '@/components/forms/dynamic-form';
import { DynamicTable } from '@/components/tables/dynamic-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ADToolbar } from './ad-toolbar';
import { ADBreadcrumb, type BreadcrumbLevel } from './ad-breadcrumb';
import { ADRecordNav } from './ad-record-nav';
import type { ADWindowConfig, ADLevel, ADChildTabConfig } from './ad-window-configs';

// ============================================================================
// Types
// ============================================================================

type AnyRecord = Record<string, unknown>;

interface DrillState {
  levelIndex: number;
  parentId: string;
  parentName: string;
}

// ============================================================================
// Child Tab Panel
// ============================================================================

interface ChildTabPanelProps {
  tab: ADChildTabConfig;
  parentId: string;
  parentIdField: string;
  onDrillDown: (childRecord: AnyRecord, childLevel: ADLevel) => void;
}

function ChildTabPanel({ tab, parentId, parentIdField, onDrillDown }: ChildTabPanelProps) {
  const [page, setPage] = useState(1);
  const level = tab.level;

  const params: Record<string, unknown> = { page, limit: 50 };
  if (level.parentField) {
    params[level.parentField] = parentId;
  }

  const { data, isLoading } = useQuery({
    queryKey: ['ad-child', level.endpoint, parentId, page],
    queryFn: () => apiClient.get<PaginatedResponse<AnyRecord>>(level.endpoint, params),
    enabled: !!parentId,
  });

  const records = data?.data || [];
  const totalCount = data?.meta?.total || 0;

  return (
    <div className="p-4">
      <DynamicTable
        tableName={level.id}
        fields={level.gridFields}
        data={records}
        isLoading={isLoading}
        totalCount={totalCount}
        page={page}
        pageSize={50}
        onPageChange={setPage}
        onRowClick={(row) => onDrillDown(row, level)}
      />
    </div>
  );
}

// ============================================================================
// AD Window Shell
// ============================================================================

interface ADWindowShellProps {
  config: ADWindowConfig;
}

export function ADWindowShell({ config }: ADWindowShellProps) {
  const queryClient = useQueryClient();
  const rootLevel = config.levels[0];

  // Navigation state
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [drillStack, setDrillStack] = useState<DrillState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<AnyRecord>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeChildTab, setActiveChildTab] = useState<string>('');

  const currentLevel = drillStack.length > 0
    ? config.levels[drillStack[drillStack.length - 1].levelIndex]
    : rootLevel;

  const parentDrill = drillStack.length > 0 ? drillStack[drillStack.length - 1] : null;

  // Fetch records for current level
  const fetchParams: Record<string, unknown> = {
    page,
    limit: 100,
    ...(searchQuery && currentLevel.searchField ? { search: searchQuery } : {}),
  };
  if (parentDrill && currentLevel.parentField) {
    fetchParams[currentLevel.parentField] = parentDrill.parentId;
  }

  const { data: recordsData, isLoading, refetch } = useQuery({
    queryKey: ['ad-records', currentLevel.endpoint, fetchParams],
    queryFn: () => apiClient.get<PaginatedResponse<AnyRecord>>(currentLevel.endpoint, fetchParams),
  });

  const records = recordsData?.data || [];
  const totalCount = recordsData?.meta?.total || 0;
  const totalPages = recordsData?.meta?.totalPages || 1;

  const currentRecord = isCreating ? null : (records[currentIndex] || null);
  const currentRecordId = currentRecord?.[currentLevel.idField] as string | undefined;
  const currentRecordName = currentRecord?.[currentLevel.nameField] as string | undefined;

  // Set first child tab as active when level changes
  useEffect(() => {
    if (currentLevel.childTabs && currentLevel.childTabs.length > 0) {
      setActiveChildTab(currentLevel.childTabs[0].id);
    }
  }, [currentLevel]);

  // Reset form data when current record changes
  useEffect(() => {
    if (currentRecord && !isCreating) {
      setFormData(currentRecord);
      setHasChanges(false);
    }
  }, [currentRecord, isCreating]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: AnyRecord) => {
      if (isCreating) {
        const createData = { ...data };
        if (parentDrill && currentLevel.parentField) {
          createData[currentLevel.parentField.replace('Id', '_id').replace(/([A-Z])/g, '_$1').toLowerCase()] = parentDrill.parentId;
          createData['sys_' + currentLevel.parentField.replace('Id', '_id')] = parentDrill.parentId;
        }
        return apiClient.post(currentLevel.endpoint, createData);
      }
      return apiClient.patch(`${currentLevel.endpoint}/${currentRecordId}`, data);
    },
    onSuccess: () => {
      toast.success(isCreating ? 'Record created' : 'Record saved');
      setHasChanges(false);
      setIsCreating(false);
      queryClient.invalidateQueries({ queryKey: ['ad-records', currentLevel.endpoint] });
      refetch();
    },
    onError: (error: any) => {
      const msg = error?.message || 'Save failed';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!currentRecordId) throw new Error('No record selected');
      return apiClient.patch(`${currentLevel.endpoint}/${currentRecordId}`, { is_active: false });
    },
    onSuccess: () => {
      toast.success('Record deactivated');
      queryClient.invalidateQueries({ queryKey: ['ad-records', currentLevel.endpoint] });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Delete failed');
    },
  });

  // Navigation
  const globalIndex = (page - 1) * 100 + currentIndex;
  const canGoPrev = globalIndex > 0;
  const canGoNext = globalIndex < totalCount - 1;

  const goFirst = useCallback(() => {
    setPage(1);
    setCurrentIndex(0);
    setIsCreating(false);
  }, []);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (page > 1) {
      setPage(page - 1);
      setCurrentIndex(99);
    }
    setIsCreating(false);
  }, [currentIndex, page]);

  const goNext = useCallback(() => {
    if (currentIndex < records.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (page < totalPages) {
      setPage(page + 1);
      setCurrentIndex(0);
    }
    setIsCreating(false);
  }, [currentIndex, records.length, page, totalPages]);

  const goLast = useCallback(() => {
    setPage(totalPages);
    setCurrentIndex(0);
    setIsCreating(false);
  }, [totalPages]);

  // Drill down into child record
  const handleDrillDown = useCallback((childRecord: AnyRecord, childLevel: ADLevel) => {
    const levelIndex = config.levels.findIndex(l => l.id === childLevel.id);
    if (levelIndex === -1) return;

    setDrillStack(prev => [...prev, {
      levelIndex,
      parentId: currentRecordId!,
      parentName: currentRecordName || '',
    }]);
    setCurrentIndex(0);
    setPage(1);
    setSearchQuery('');
    setIsCreating(false);
    setHasChanges(false);

    // Find the child record index in its list
    const childIdField = childLevel.idField;
    const childId = childRecord[childIdField];
    // We'll set the index after data loads - for now go to 0
  }, [config.levels, currentRecordId, currentRecordName]);

  // Navigate back up the breadcrumb
  const navigateToLevel = useCallback((targetStackIndex: number) => {
    if (targetStackIndex < 0) {
      setDrillStack([]);
    } else {
      setDrillStack(prev => prev.slice(0, targetStackIndex + 1));
    }
    setCurrentIndex(0);
    setPage(1);
    setSearchQuery('');
    setIsCreating(false);
    setHasChanges(false);
  }, []);

  // Build breadcrumb levels
  const breadcrumbLevels: BreadcrumbLevel[] = [
    {
      label: rootLevel.label,
      recordName: drillStack.length > 0 ? undefined : currentRecordName,
      onClick: drillStack.length > 0 ? () => navigateToLevel(-1) : undefined,
    },
  ];

  drillStack.forEach((drill, idx) => {
    const level = config.levels[drill.levelIndex];
    const isLast = idx === drillStack.length - 1;
    breadcrumbLevels.push({
      label: level.label,
      recordName: isLast ? currentRecordName : drill.parentName,
      onClick: isLast ? undefined : () => navigateToLevel(idx),
    });
  });

  // Switch to detail view when clicking a row in list mode
  const handleRowSelect = useCallback((row: AnyRecord) => {
    const idx = records.findIndex(r => r[currentLevel.idField] === row[currentLevel.idField]);
    if (idx !== -1) setCurrentIndex(idx);
    setViewMode('detail');
  }, [records, currentLevel.idField]);

  // Toolbar handlers
  const handleNew = () => {
    setIsCreating(true);
    setViewMode('detail');
    setFormData({});
    setHasChanges(false);
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleUndo = () => {
    if (currentRecord) {
      setFormData(currentRecord);
    } else {
      setFormData({});
    }
    setHasChanges(false);
    setIsCreating(false);
  };

  const handleFormSubmit = async (data: AnyRecord) => {
    setFormData(data);
    saveMutation.mutate(data);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <ADToolbar
        onNew={handleNew}
        onSave={handleSave}
        onDelete={() => deleteMutation.mutate()}
        onUndo={handleUndo}
        onRefresh={() => refetch()}
        searchValue={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setPage(1);
          setCurrentIndex(0);
        }}
        isSaving={saveMutation.isPending}
        isDeleting={deleteMutation.isPending}
        hasChanges={hasChanges || isCreating}
        canDelete={!!currentRecordId && !isCreating}
      />

      {/* Breadcrumb + Record Nav */}
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
          <ADBreadcrumb levels={breadcrumbLevels} />
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

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : viewMode === 'list' ? (
          /* ===== LIST VIEW ===== */
          records.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <p className="text-lg">No records found</p>
              <p className="text-sm mt-1">Click + to create a new {currentLevel.label.toLowerCase()}</p>
            </div>
          ) : (
            <div className="p-4">
              <DynamicTable
                tableName={currentLevel.id}
                fields={currentLevel.gridFields || currentLevel.formFields}
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
          /* ===== DETAIL VIEW ===== */
          records.length === 0 && !isCreating ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <p className="text-lg">No records found</p>
              <p className="text-sm mt-1">Click + to create a new {currentLevel.label.toLowerCase()}</p>
            </div>
          ) : (
            <>
              {/* Form Panel */}
              <div className="p-6 border-b border-border">
                <DynamicForm
                  tableName={currentLevel.id}
                  fields={currentLevel.formFields}
                  initialData={isCreating ? {} : (currentRecord || {})}
                  onSubmit={handleFormSubmit}
                  mode={isCreating ? 'create' : 'edit'}
                  isSaving={saveMutation.isPending}
                />
              </div>

              {/* Child Tabs */}
              {currentLevel.childTabs && currentLevel.childTabs.length > 0 && currentRecordId && !isCreating && (
                <div className="border-t border-border">
                  <Tabs value={activeChildTab} onValueChange={setActiveChildTab}>
                    <div className="border-b border-border bg-muted/30">
                      <TabsList className="h-auto p-0 bg-transparent rounded-none">
                        {currentLevel.childTabs.map((tab) => (
                          <ChildTabTrigger
                            key={tab.id}
                            tab={tab}
                            parentId={currentRecordId}
                            isActive={activeChildTab === tab.id}
                          />
                        ))}
                      </TabsList>
                    </div>
                    {currentLevel.childTabs.map((tab) => (
                      <TabsContent key={tab.id} value={tab.id} className="m-0">
                        <ChildTabPanel
                          tab={tab}
                          parentId={currentRecordId}
                          parentIdField={currentLevel.idField}
                          onDrillDown={handleDrillDown}
                        />
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Child Tab Trigger with count badge
// ============================================================================

function ChildTabTrigger({
  tab,
  parentId,
  isActive,
}: {
  tab: ADChildTabConfig;
  parentId: string;
  isActive: boolean;
}) {
  const level = tab.level;
  const params: Record<string, unknown> = { limit: 1 };
  if (level.parentField) {
    params[level.parentField] = parentId;
  }

  const { data } = useQuery({
    queryKey: ['ad-child-count', level.endpoint, parentId],
    queryFn: () => apiClient.get<PaginatedResponse<AnyRecord>>(level.endpoint, params),
    enabled: !!parentId && tab.badge === 'count',
  });

  const count = data?.meta?.total;

  return (
    <TabsTrigger
      value={tab.id}
      className={`rounded-none border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        isActive
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {tab.label}
      {count !== undefined && (
        <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] px-1.5 text-xs">
          {count}
        </Badge>
      )}
    </TabsTrigger>
  );
}
