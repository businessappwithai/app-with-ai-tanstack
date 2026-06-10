import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Home, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, type PaginatedResponse } from '@/lib/api-client';
import { DynamicForm } from '@/components/forms/dynamic-form';
import { DynamicTable } from '@/components/tables/dynamic-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ADToolbar } from './ad-toolbar';
import { ADRecordNav } from './ad-record-nav';
import {
  buildAdminDetailUrl,
  buildAdminListUrl,
  type ADLevel,
  type ADChildTabConfig,
  type ParentContext,
} from './ad-window-configs';

type AnyRecord = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Inline child tab panel
// Row clicks navigate to the child's detail URL (metadata-derived)
// ---------------------------------------------------------------------------

interface ChildPanelProps {
  childTab: ADChildTabConfig;
  parentRecord: AnyRecord;
  selfLevel: ADLevel;
  parentContext: ParentContext[];
}

function ChildPanel({ childTab, parentRecord, selfLevel, parentContext }: ChildPanelProps) {
  const navigate = useNavigate();
  const childLevel = childTab.level;
  const parentId = parentRecord[selfLevel.idField] as string;

  // Context for child-level URLs includes all ancestors + this record
  const childParentCtx: ParentContext[] = [...parentContext, { level: selfLevel, id: parentId }];

  const params: Record<string, unknown> = { limit: 100 };
  if (childLevel.parentField) params[childLevel.parentField] = parentId;

  const { data, isLoading } = useQuery({
    queryKey: ['ad-child', childLevel.endpoint, parentId],
    queryFn: () => apiClient.get<PaginatedResponse<AnyRecord>>(childLevel.endpoint, params),
    enabled: !!parentId,
  });

  const records = data?.data ?? [];
  const totalCount = data?.meta?.total ?? 0;

  return (
    <div>
      {/* Child list link */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {totalCount} {childLevel.label}{totalCount !== 1 ? 's' : ''}
        </span>
        <Link
          to={buildAdminListUrl(childParentCtx, childLevel) as never}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          View all <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      <div className="p-4">
        <DynamicTable
          tableName={childLevel.id}
          fields={childLevel.gridFields || childLevel.formFields}
          data={records}
          isLoading={isLoading}
          totalCount={totalCount}
          page={1}
          pageSize={100}
          onPageChange={() => {}}
          onRowClick={row => {
            const childId = String(row[childLevel.idField]);
            navigate({ to: buildAdminDetailUrl(childParentCtx, childLevel, childId) as never });
          }}
        />
      </div>
    </div>
  );
}

// Child tab trigger with live count badge
function ChildTabTrigger({ childTab, parentId, isActive }: { childTab: ADChildTabConfig; parentId: string; isActive: boolean }) {
  const childLevel = childTab.level;
  const params: Record<string, unknown> = { limit: 1 };
  if (childLevel.parentField) params[childLevel.parentField] = parentId;

  const { data } = useQuery({
    queryKey: ['ad-child-count', childLevel.endpoint, parentId],
    queryFn: () => apiClient.get<PaginatedResponse<AnyRecord>>(childLevel.endpoint, params),
    enabled: !!parentId && childTab.badge === 'count',
  });

  return (
    <TabsTrigger
      value={childTab.id}
      className={`rounded-none border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {childTab.label}
      {data?.meta?.total !== undefined && (
        <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] px-1.5 text-xs">
          {data.meta.total}
        </Badge>
      )}
    </TabsTrigger>
  );
}

// ---------------------------------------------------------------------------
// ADDetailShell
// ---------------------------------------------------------------------------

export interface ADDetailShellProps {
  level: ADLevel;
  recordId: string;
  /** Ancestor levels with their IDs — drives breadcrumbs, URL construction, and sibling filtering */
  parentContext: ParentContext[];
  dashboardHref?: string;
  /** Whether the detail opens in view-only or edit mode. Defaults to 'edit' (admin behaviour).
   *  Set to 'view' for bus entity pages so users see read-only first, then click Edit. */
  initialMode?: 'view' | 'edit';
}

export function ADDetailShell({ level, recordId, parentContext, dashboardHref = '/dashboard', initialMode = 'edit' }: ADDetailShellProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [formData, setFormData] = useState<AnyRecord>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [activeChildTab, setActiveChildTab] = useState(() => level.childTabs?.[0]?.id ?? '');
  const [isEditing, setIsEditing] = useState(initialMode === 'edit');

  // Fetch each parent record's display name for breadcrumbs
  const parentNameQueries = useQueries({
    queries: parentContext.map(({ level: l, id }) => ({
      queryKey: ['ad-parent-name', l.endpoint, id],
      queryFn: () => apiClient.get<AnyRecord>(`${l.endpoint}/${id}`),
      enabled: !!id,
    })),
  });
  const parentNames: string[] = parentNameQueries.map((q, i) =>
    (q.data as AnyRecord | undefined)?.[parentContext[i].level.nameField] as string ?? parentContext[i].id
  );

  // Build parent filter from metadata (level.parentField)
  const parentFilter: Record<string, unknown> = {};
  if (parentContext.length && level.parentField) {
    parentFilter[level.parentField] = parentContext[parentContext.length - 1].id;
  }

  const fetchParams = { page, limit: 100, ...parentFilter };

  // Fetch the sibling list for prev/next navigation
  const { data: listData, isLoading, refetch } = useQuery({
    queryKey: ['ad-detail-list', level.endpoint, fetchParams],
    queryFn: () => apiClient.get<PaginatedResponse<AnyRecord>>(level.endpoint, fetchParams),
  });

  const records = listData?.data ?? [];
  const totalCount = listData?.meta?.total ?? 0;
  const totalPages = listData?.meta?.totalPages ?? 1;

  // Locate current record in the page; if missing, request adjacent page
  // Use String comparison to handle numeric IDs (e.g. sys_reference_id) vs URL string params
  useEffect(() => {
    if (!records.length) return;
    const idx = records.findIndex(r => String(r[level.idField]) === String(recordId));
    if (idx !== -1) {
      setCurrentIndex(idx);
      setFormData(records[idx]);
      setHasChanges(false);
    }
  }, [records, recordId, level.idField]);

  const currentRecord = records.find(r => String(r[level.idField]) === String(recordId)) ?? null;
  const globalIndex = (page - 1) * 100 + currentIndex;
  const canGoPrev = globalIndex > 0;
  const canGoNext = globalIndex < totalCount - 1;

  // Reset form when record changes
  useEffect(() => {
    if (currentRecord) { setFormData(currentRecord); setHasChanges(false); }
  }, [currentRecord]);

  const saveMutation = useMutation({
    mutationFn: (data: AnyRecord) => apiClient.patch(`${level.endpoint}/${recordId}`, data),
    onSuccess: () => {
      toast.success('Saved');
      setHasChanges(false);
      if (initialMode === 'view') setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['ad-detail-list', level.endpoint] });
      refetch();
    },
    onError: (err: any) => toast.error(Array.isArray(err?.message) ? err.message.join(', ') : (err?.message ?? 'Save failed')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.patch(`${level.endpoint}/${recordId}`, { is_active: false }),
    onSuccess: () => {
      toast.success('Deactivated');
      queryClient.invalidateQueries({ queryKey: ['ad-detail-list', level.endpoint] });
      navigate({ to: buildAdminListUrl(parentContext, level) as never });
    },
    onError: (err: any) => toast.error(err?.message ?? 'Failed'),
  });

  // Record navigation — URL changes to reflect the selected sibling
  const navigateToIndex = useCallback((idx: number, p: number) => {
    const record = records[idx];
    if (!record) return;
    setPage(p); setCurrentIndex(idx);
    navigate({ to: buildAdminDetailUrl(parentContext, level, String(record[level.idField])) as never });
  }, [records, level, parentContext, navigate]);

  const goFirst = () => { setPage(1); navigateToIndex(0, 1); };
  const goPrev = () => currentIndex > 0 ? navigateToIndex(currentIndex - 1, page) : page > 1 && navigateToIndex(99, page - 1);
  const goNext = () => currentIndex < records.length - 1 ? navigateToIndex(currentIndex + 1, page) : page < totalPages && navigateToIndex(0, page + 1);
  const goLast = () => { setPage(totalPages); setCurrentIndex(0); };

  // Breadcrumbs — entirely from metadata + fetched parent names, zero hardcoded strings
  const crumbs: { label: string; href?: string }[] = [];
  for (let i = 0; i < parentContext.length; i++) {
    const { level: pl, id } = parentContext[i];
    const grandParentCtx = parentContext.slice(0, i);
    crumbs.push({ label: pl.label + 's', href: buildAdminListUrl(grandParentCtx, pl) });
    crumbs.push({ label: parentNames[i] ?? id, href: buildAdminDetailUrl(grandParentCtx, pl, id) });
  }
  crumbs.push({ label: level.label + 's', href: buildAdminListUrl(parentContext, level) });
  const currentName = currentRecord ? (currentRecord[level.nameField] as string) : recordId;
  crumbs.push({ label: currentName }); // current record — no link

  const listHref = buildAdminListUrl(parentContext, level);

  return (
    <div className="flex flex-col h-full">
      <ADToolbar
        onSave={() => saveMutation.mutate(formData)}
        onDelete={() => deleteMutation.mutate()}
        onUndo={() => { if (currentRecord) { setFormData(currentRecord); setHasChanges(false); } }}
        onRefresh={() => refetch()}
        onEdit={() => setIsEditing(true)}
        onCancelEdit={() => { setIsEditing(false); if (currentRecord) { setFormData(currentRecord); setHasChanges(false); } }}
        isSaving={saveMutation.isPending}
        isDeleting={deleteMutation.isPending}
        hasChanges={hasChanges}
        canDelete={!!recordId && isEditing}
        canCreate={false}
        isEditing={isEditing}
        isDetailView={true}
      />

      {/* Breadcrumb + record nav */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
        <div className="flex items-center gap-1.5 text-sm flex-wrap">
          <button
            onClick={() => navigate({ to: listHref as never })}
            className="text-primary hover:underline font-medium text-sm flex-shrink-0"
          >
            ← List
          </button>
          <span className="text-muted-foreground">/</span>
          <Link to={dashboardHref as never} className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors flex-shrink-0">
            <Home className="h-3.5 w-3.5" /><span>Dashboard</span>
          </Link>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="text-muted-foreground">/</span>
              {c.href
                ? <Link to={c.href as never} className="text-muted-foreground hover:text-primary transition-colors truncate max-w-[160px]">{c.label}</Link>
                : <span className="font-medium text-foreground truncate max-w-[200px]">{c.label}</span>
              }
            </span>
          ))}
        </div>
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>)}
          </div>
        ) : !currentRecord ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p className="text-lg">Record not found</p>
            <Button variant="link" onClick={() => navigate({ to: listHref as never })}>Back to list</Button>
          </div>
        ) : (
          <>
            {/* Detail form */}
            <div className="p-6 border-b border-border">
              <DynamicForm
                tableName={level.id}
                fields={level.formFields}
                initialData={currentRecord}
                onSubmit={fd => { setFormData(fd); setHasChanges(false); saveMutation.mutate(fd); }}
                onChange={fd => { setFormData(fd); setHasChanges(true); }}
                mode={isEditing ? 'edit' : 'view'}
                readOnly={!isEditing}
                isSaving={saveMutation.isPending}
              />
            </div>

            {/* Inline child tabs — row clicks navigate to child detail URL */}
            {level.childTabs && level.childTabs.length > 0 && (
              <div className="border-t border-border">
                <Tabs value={activeChildTab} onValueChange={setActiveChildTab}>
                  <div className="border-b border-border bg-muted/30">
                    <TabsList className="h-auto p-0 bg-transparent rounded-none">
                      {level.childTabs.map(ct => (
                        <ChildTabTrigger
                          key={ct.id}
                          childTab={ct}
                          parentId={recordId}
                          isActive={activeChildTab === ct.id}
                        />
                      ))}
                    </TabsList>
                  </div>
                  {level.childTabs.map(ct => (
                    <TabsContent key={ct.id} value={ct.id} className="m-0">
                      <ChildPanel
                        childTab={ct}
                        parentRecord={currentRecord}
                        selfLevel={level}
                        parentContext={parentContext}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
