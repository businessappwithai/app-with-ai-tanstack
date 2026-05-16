/**
 * Field Layout Management Page
 *
 * Allows administrators to customize field ordering and visibility
 * for forms and tables. Changes are persisted to sys_field.seq_no.
 *
 * Generated: 2026-05-16T05:41:34.312Z
 * Project: CRM Regenerated 2
 */

import { Suspense } from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createFileRoute, Link, useSearch } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LayoutGrid,
  Layers,
  GripVertical,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  ChevronLeft,
  Table2,
  RefreshCw,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { FieldLayoutEditor } from '@/components/admin/field-layout-editor';
import { FieldGroupManager } from '@/components/admin/field-group-manager';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { apiClient, PaginatedResponse } from '@/lib/api-client';
import { toast } from 'sonner';

export const Route = createFileRoute('/admin/fields')({
  validateSearch: (search: Record<string, unknown>) => ({
    entity: (search.entity as string) || '',
  }),
  component: FieldLayoutPage,
});

type TabValue = 'layout' | 'groups' | 'inline';
type LayoutMode = 'form' | 'grid';

interface SysTable {
  sys_table_id: string;
  name: string;
  table_name: string;
  description?: string;
}

interface SysField {
  sys_field_id: string;
  name: string;
  column_name: string;
  table_name: string;
  data_type: string;
  seq_no: number;
  seq_no_grid: number;
  is_displayed: boolean;
  is_displayed_grid: boolean;
  is_active: boolean;
  description?: string;
}

/**
 * Inline drag-and-drop field item using HTML5 drag events
 */
function DraggableFieldItem({
  field,
  index,
  mode,
  dragIndex,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onToggleVisibility,
  onSeqNoChange,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  field: SysField & { tempSeqNo: number; tempSeqNoGrid: number };
  index: number;
  mode: LayoutMode;
  dragIndex: number | null;
  onDragStart: (index: number) => void;
  onDragEnter: (index: number) => void;
  onDragEnd: () => void;
  onToggleVisibility: (fieldId: string) => void;
  onSeqNoChange: (fieldId: string, value: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const isVisible = mode === 'form' ? field.is_displayed : field.is_displayed_grid;
  const seqNo = mode === 'form' ? field.tempSeqNo : field.tempSeqNoGrid;
  const originalSeqNo = mode === 'form' ? field.seq_no : field.seq_no_grid;
  const isDragging = dragIndex === index;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragEnter={() => onDragEnter(index)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      className={`flex items-center gap-3 p-3 border rounded-lg transition-all ${
        isDragging ? 'opacity-50 bg-accent shadow-lg' : 'bg-background'
      } ${!isVisible ? 'opacity-60' : ''}`}
    >
      {/* Drag handle */}
      <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
        <GripVertical className="h-5 w-5" />
      </div>

      {/* Sequence number input */}
      <div className="w-20 flex-shrink-0">
        <Input
          type="number"
          value={seqNo}
          onChange={(e) => onSeqNoChange(field.sys_field_id, parseInt(e.target.value, 10) || 0)}
          className="h-8 text-center text-sm font-mono"
          min={0}
          step={10}
        />
        {seqNo !== originalSeqNo && (
          <div className="text-xs text-amber-600 text-center mt-0.5">was {originalSeqNo}</div>
        )}
      </div>

      {/* Field info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{field.name}</span>
          {!isVisible && (
            <Badge variant="outline" className="text-xs">hidden</Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {field.column_name} ({field.data_type})
        </div>
      </div>

      {/* Move up/down buttons */}
      <div className="flex flex-col gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => onMoveUp(index)}
          disabled={isFirst}
        >
          <ArrowUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => onMoveDown(index)}
          disabled={isLast}
        >
          <ArrowDown className="h-3 w-3" />
        </Button>
      </div>

      {/* Visibility toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onToggleVisibility(field.sys_field_id)}
        title={isVisible ? 'Hide field' : 'Show field'}
      >
        {isVisible ? (
          <Eye className="h-4 w-4 text-green-600" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
}

function FieldLayoutPageContent() {
  const search = useSearch({ from: '/admin/fields' });
  const queryClient = useQueryClient();
  const initialEntity = search.entity || '';

  const [selectedTable, setSelectedTable] = useState<string>(initialEntity);
  const [activeTab, setActiveTab] = useState<TabValue>('inline');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('form');
  const [fields, setFields] = useState<(SysField & { tempSeqNo: number; tempSeqNoGrid: number })[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  // Fetch sys_table entries for the entity selector
  const { data: tablesResponse, isLoading: tablesLoading } = useQuery({
    queryKey: ['admin', 'sys-tables'],
    queryFn: () => apiClient.get<PaginatedResponse<SysTable>>('/api/sys/tables', { limit: 200 }),
  });

  // Fetch sys_field entries for the selected table
  const {
    data: fieldsResponse,
    isLoading: fieldsLoading,
    refetch: refetchFields,
  } = useQuery({
    queryKey: ['admin', 'fields', selectedTable],
    queryFn: () =>
      apiClient.get<PaginatedResponse<SysField>>('/api/sys/fields', {
        table_name: selectedTable,
        limit: 200,
        sort: layoutMode === 'form' ? 'seq_no' : 'seq_no_grid',
        order: 'ASC',
      }),
    enabled: !!selectedTable,
  });

  const sysTables = tablesResponse?.data || [];

  // Initialize fields when data loads or entity changes
  useEffect(() => {
    if (fieldsResponse?.data) {
      const sortedFields = [...fieldsResponse.data].sort((a, b) => {
        const aSeq = layoutMode === 'form' ? a.seq_no : a.seq_no_grid;
        const bSeq = layoutMode === 'form' ? b.seq_no : b.seq_no_grid;
        return (aSeq || 0) - (bSeq || 0);
      });
      setFields(
        sortedFields.map((f, i) => ({
          ...f,
          tempSeqNo: layoutMode === 'form' ? f.seq_no : (i + 1) * 10,
          tempSeqNoGrid: layoutMode === 'grid' ? f.seq_no_grid : (i + 1) * 10,
        }))
      );
      setHasChanges(false);
    }
  }, [fieldsResponse, layoutMode]);

  // Set initial entity from URL search params
  useEffect(() => {
    if (initialEntity && !selectedTable) {
      setSelectedTable(initialEntity);
    }
  }, [initialEntity, selectedTable]);

  // HTML5 drag-and-drop handlers
  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragEnter = useCallback((index: number) => {
    dragOverIndex.current = index;
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragIndex === null || dragOverIndex.current === null || dragIndex === dragOverIndex.current) {
      setDragIndex(null);
      return;
    }

    setFields((prev) => {
      const newFields = [...prev];
      const [draggedItem] = newFields.splice(dragIndex, 1);
      newFields.splice(dragOverIndex.current!, 0, draggedItem);

      // Recalculate sequence numbers
      return newFields.map((f, i) => ({
        ...f,
        tempSeqNo: layoutMode === 'form' ? (i + 1) * 10 : f.tempSeqNo,
        tempSeqNoGrid: layoutMode === 'grid' ? (i + 1) * 10 : f.tempSeqNoGrid,
      }));
    });

    setHasChanges(true);
    setDragIndex(null);
    dragOverIndex.current = null;
  }, [dragIndex, layoutMode]);

  // Toggle field visibility
  const handleToggleVisibility = useCallback(
    (fieldId: string) => {
      setFields((prev) =>
        prev.map((f) => {
          if (f.sys_field_id !== fieldId) return f;
          return layoutMode === 'form'
            ? { ...f, is_displayed: !f.is_displayed }
            : { ...f, is_displayed_grid: !f.is_displayed_grid };
        })
      );
      setHasChanges(true);
    },
    [layoutMode]
  );

  // Inline seq_no editing
  const handleSeqNoChange = useCallback(
    (fieldId: string, value: number) => {
      setFields((prev) =>
        prev.map((f) => {
          if (f.sys_field_id !== fieldId) return f;
          return layoutMode === 'form'
            ? { ...f, tempSeqNo: value }
            : { ...f, tempSeqNoGrid: value };
        })
      );
      setHasChanges(true);
    },
    [layoutMode]
  );

  // Move field up
  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      setFields((prev) => {
        const newFields = [...prev];
        [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
        return newFields.map((f, i) => ({
          ...f,
          tempSeqNo: layoutMode === 'form' ? (i + 1) * 10 : f.tempSeqNo,
          tempSeqNoGrid: layoutMode === 'grid' ? (i + 1) * 10 : f.tempSeqNoGrid,
        }));
      });
      setHasChanges(true);
    },
    [layoutMode]
  );

  // Move field down
  const handleMoveDown = useCallback(
    (index: number) => {
      setFields((prev) => {
        if (index >= prev.length - 1) return prev;
        const newFields = [...prev];
        [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
        return newFields.map((f, i) => ({
          ...f,
          tempSeqNo: layoutMode === 'form' ? (i + 1) * 10 : f.tempSeqNo,
          tempSeqNoGrid: layoutMode === 'grid' ? (i + 1) * 10 : f.tempSeqNoGrid,
        }));
      });
      setHasChanges(true);
    },
    [layoutMode]
  );

  // Reset to original order
  const handleReset = useCallback(() => {
    if (fieldsResponse?.data) {
      const sortedFields = [...fieldsResponse.data].sort((a, b) => {
        const aSeq = layoutMode === 'form' ? a.seq_no : a.seq_no_grid;
        const bSeq = layoutMode === 'form' ? b.seq_no : b.seq_no_grid;
        return (aSeq || 0) - (bSeq || 0);
      });
      setFields(
        sortedFields.map((f) => ({
          ...f,
          tempSeqNo: f.seq_no,
          tempSeqNoGrid: f.seq_no_grid,
        }))
      );
      setHasChanges(false);
    }
  }, [fieldsResponse, layoutMode]);

  // Save mutation: PUTs updated field order to the API
  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = fields.map((field) => ({
        sys_field_id: field.sys_field_id,
        seq_no: field.tempSeqNo,
        seq_no_grid: field.tempSeqNoGrid,
        is_displayed: field.is_displayed,
        is_displayed_grid: field.is_displayed_grid,
      }));

      await Promise.all(
        updates.map((update) =>
          apiClient.put(`/api/sys/fields/${update.sys_field_id}`, {
            seq_no: update.seq_no,
            seq_no_grid: update.seq_no_grid,
            is_displayed: update.is_displayed,
            is_displayed_grid: update.is_displayed_grid,
          })
        )
      );
    },
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'fields', selectedTable] });
      toast.success('Field layout saved successfully');
    },
    onError: () => {
      toast.error('Failed to save field layout. Please try again.');
    },
  });

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Field Layout Manager</h1>
            <p className="text-muted-foreground">
              Customize field ordering, grouping, and styling for forms and tables
            </p>
          </div>
        </div>
      </div>

      {/* Entity Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table2 className="h-5 w-5" />
            Select Entity
          </CardTitle>
          <CardDescription>
            Choose an entity to customize its field layout. Entities are loaded from sys_table.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select
              value={selectedTable}
              onValueChange={(value) => {
                setSelectedTable(value);
                setHasChanges(false);
              }}
            >
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue placeholder="Select an entity..." />
              </SelectTrigger>
              <SelectContent>
                {/* Dynamic entities from sys_table API */}
                {sysTables.map((table) => (
                  <SelectItem key={table.sys_table_id} value={table.table_name}>
                    {table.name} ({table.table_name})
                  </SelectItem>
                ))}
                {/* Static entities from generator template */}
                {!sysTables.find((t) => t.table_name === 'bus_company') && (
                  <SelectItem value="bus_company">
                    Company (bus_company)
                  </SelectItem>
                )}
                {!sysTables.find((t) => t.table_name === 'bus_contact') && (
                  <SelectItem value="bus_contact">
                    Contact (bus_contact)
                  </SelectItem>
                )}
                {!sysTables.find((t) => t.table_name === 'bus_deal') && (
                  <SelectItem value="bus_deal">
                    Deal (bus_deal)
                  </SelectItem>
                )}
                {!sysTables.find((t) => t.table_name === 'bus_deal_stage') && (
                  <SelectItem value="bus_deal_stage">
                    DealStage (bus_deal_stage)
                  </SelectItem>
                )}
                {!sysTables.find((t) => t.table_name === 'bus_pipeline') && (
                  <SelectItem value="bus_pipeline">
                    Pipeline (bus_pipeline)
                  </SelectItem>
                )}
                {!sysTables.find((t) => t.table_name === 'bus_activity') && (
                  <SelectItem value="bus_activity">
                    Activity (bus_activity)
                  </SelectItem>
                )}
                {!sysTables.find((t) => t.table_name === 'bus_note') && (
                  <SelectItem value="bus_note">
                    Note (bus_note)
                  </SelectItem>
                )}
                {!sysTables.find((t) => t.table_name === 'bus_task') && (
                  <SelectItem value="bus_task">
                    Task (bus_task)
                  </SelectItem>
                )}
                {!sysTables.find((t) => t.table_name === 'bus_email_message') && (
                  <SelectItem value="bus_email_message">
                    EmailMessage (bus_email_message)
                  </SelectItem>
                )}
                {!sysTables.find((t) => t.table_name === 'bus_email_template') && (
                  <SelectItem value="bus_email_template">
                    EmailTemplate (bus_email_template)
                  </SelectItem>
                )}
                {!sysTables.find((t) => t.table_name === 'bus_product') && (
                  <SelectItem value="bus_product">
                    Product (bus_product)
                  </SelectItem>
                )}
                {!sysTables.find((t) => t.table_name === 'bus_quote') && (
                  <SelectItem value="bus_quote">
                    Quote (bus_quote)
                  </SelectItem>
                )}
                {!sysTables.find((t) => t.table_name === 'bus_quote_item') && (
                  <SelectItem value="bus_quote_item">
                    QuoteItem (bus_quote_item)
                  </SelectItem>
                )}
                {!sysTables.find((t) => t.table_name === 'bus_user') && (
                  <SelectItem value="bus_user">
                    User (bus_user)
                  </SelectItem>
                )}
                {!sysTables.find((t) => t.table_name === 'bus_team') && (
                  <SelectItem value="bus_team">
                    Team (bus_team)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {selectedTable && (
              <Badge variant="secondary" className="whitespace-nowrap">
                {fields.length} fields
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedTable && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="inline" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Inline Editor
            </TabsTrigger>
            <TabsTrigger value="layout" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              DnD Editor
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Field Groups
            </TabsTrigger>
          </TabsList>

          {/* Inline Editor Tab - HTML5 drag-and-drop with seq_no editing */}
          <TabsContent value="inline" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Field Order &amp; Visibility</CardTitle>
                    <CardDescription>
                      Drag fields to reorder, edit sequence numbers, and toggle visibility.
                      Changes apply to {layoutMode === 'form' ? 'form layout (seq_no)' : 'grid layout (seq_no_grid)'}.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Layout mode toggle */}
                    <Select value={layoutMode} onValueChange={(v) => setLayoutMode(v as LayoutMode)}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="form">Form (seq_no)</SelectItem>
                        <SelectItem value="grid">Grid (seq_no_grid)</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Reset */}
                    <Button variant="outline" size="sm" onClick={handleReset} disabled={!hasChanges}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reset
                    </Button>
                    {/* Save */}
                    <Button
                      size="sm"
                      onClick={() => saveMutation.mutate()}
                      disabled={!hasChanges || saveMutation.isPending}
                    >
                      {saveMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {fieldsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : fields.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No fields found for this entity. Check that sys_field entries exist for table "{selectedTable}".
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Column headers */}
                    <div className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                      <div className="w-5" />
                      <div className="w-20 text-center">
                        {layoutMode === 'form' ? 'seq_no' : 'seq_no_grid'}
                      </div>
                      <div className="flex-1">Field</div>
                      <div className="w-[52px] text-center">Move</div>
                      <div className="w-8 text-center">Vis</div>
                    </div>
                    {fields.map((field, index) => (
                      <DraggableFieldItem
                        key={field.sys_field_id}
                        field={field}
                        index={index}
                        mode={layoutMode}
                        dragIndex={dragIndex}
                        onDragStart={handleDragStart}
                        onDragEnter={handleDragEnter}
                        onDragEnd={handleDragEnd}
                        onToggleVisibility={handleToggleVisibility}
                        onSeqNoChange={handleSeqNoChange}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        isFirst={index === 0}
                        isLast={index === fields.length - 1}
                      />
                    ))}
                  </div>
                )}

                {/* Instructions */}
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2 text-sm">How to use:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>- Drag fields using the grip handle to reorder them</li>
                    <li>- Edit the sequence number directly in the input field</li>
                    <li>- Use arrow buttons to move fields up or down one position</li>
                    <li>- Toggle the eye icon to show/hide fields in the layout</li>
                    <li>- Switch between Form (seq_no) and Grid (seq_no_grid) modes</li>
                    <li>- Click "Save Changes" to persist updates via PUT to /api/sys/fields</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Original DnD Kit Editor Tab */}
          <TabsContent value="layout" className="space-y-6">
            <FieldLayoutEditor entityName={selectedTable} />
          </TabsContent>

          {/* Field Groups Tab */}
          <TabsContent value="groups" className="space-y-6">
            <FieldGroupManager entityName={selectedTable} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function FieldLayoutPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8">Loading...</div>}>
      <FieldLayoutPageContent />
    </Suspense>
  );
}
