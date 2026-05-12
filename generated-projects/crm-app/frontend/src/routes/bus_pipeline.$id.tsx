/**
 * Pipeline Detail/Edit Page
 *
 * Displays and allows editing of a single Pipeline record
 * using dynamic fields driven by sys_field metadata from the
 * Application Dictionary.
 *
 * Features:
 * - Dynamic form rendering via sys_field (field ordering, visibility, read-only, mandatory)
 * - Edit mode with optimistic concurrency via ETag/version
 * - View mode with read-only display
 * - Delete with confirmation dialog
 * - Back button navigating to entity list
 * - Field metadata summary sidebar
 *
 * Supports optimistic concurrency via ETag/version.
 *
 * Generated: 2026-05-12T10:27:33.442Z
 * Project: crm-app
 */

import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useFormFields } from '@/hooks/use-entities';
import { DynamicForm } from '@/components/forms/dynamic-form';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Trash2,
  Pencil,
  Eye,
  Loader2,
  AlertCircle,
  ChevronLeft,
  Info,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/bus_pipeline/$id')({
  component: EntityDetailPage,
});

interface Pipeline {
  id: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
  version?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

function EntityDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = Route.useParams();
  const isNew = id === 'new';

  // Mode: 'view' for read-only display, 'edit' for editing, 'create' for new records
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>(isNew ? 'create' : 'view');

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Server validation errors state
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  // Fetch field metadata from sys_field for this entity
  const { data: formFields, isLoading: isLoadingFields } = useFormFields('bus_pipeline');

  // Fetch the record data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['pipeline', id],
    queryFn: () => apiClient.get<Pipeline>(`/api/bus/bus_pipeline/${id}`),
    enabled: !isNew && !!id,
  });

  // Save mutation (create or update)
  const saveMutation = useMutation({
    mutationFn: async (formData: Partial<Pipeline>) => {
      if (isNew) {
        return apiClient.post<Pipeline>('/api/bus/bus_pipeline', formData);
      } else {
        return apiClient.patch<Pipeline>(
          `/api/bus/bus_pipeline/${id}`,
          formData,
          {
            headers: data?.version ? { 'If-Match': `"${data.version}"` } : {},
          }
        );
      }
    },
    onSuccess: (savedData) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      setServerErrors({}); // Clear errors on success
      toast.success('Pipeline ' + (isNew ? 'created' : 'updated') + ' successfully');
      if (isNew) {
        navigate({ to: '/bus_pipeline/$id', params: { id: String(savedData['id']) } });
      } else {
        // Switch back to view mode after successful save
        setMode('view');
        refetch();
      }
    },
    onError: async (error: any) => {
      console.error('Save error:', error);
      // Clear previous errors
      setServerErrors({});
      // Handle 412 Conflict - record modified by another user
      if (error.statusCode === 412) {
        toast.error('Record was modified by another user. Please refresh and try again.');
        return;
      }
      // Handle 400 Validation errors with field-level details
      if (error.errors && typeof error.errors === 'object') {
        const fieldErrors: Record<string, string> = {};
        for (const [field, messages] of Object.entries(error.errors)) {
          if (Array.isArray(messages)) {
            fieldErrors[field] = messages.join(', ');
          } else if (typeof messages === 'string') {
            fieldErrors[field] = messages;
          }
        }
        setServerErrors(fieldErrors);
        const errorMessages = Object.entries(fieldErrors)
          .map(([field, msg]) => `${field}: ${msg}`)
          .join('; ');
        toast.error('Validation failed', {
          description: errorMessages || 'Please check the form for errors',
        });
        return;
      }
      // Generic error handler
      let message = 'Failed to save Pipeline';
      if (typeof error.message === 'string') {
        message = error.message;
      } else if (Array.isArray(error.message) && error.message.length > 0) {
        message = error.message.join(', ');
      } else if (error.error) {
        message = error.error;
      }
      toast.error('Save failed', {
        description: message,
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiClient.delete(`/api/bus/bus_pipeline/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      navigate({ to: '/bus_pipeline' });
    },
    onError: () => {
      setShowDeleteConfirm(false);
    },
  });

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto py-8 px-4">
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-muted/30 p-12 text-center backdrop-blur-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-destructive text-lg font-semibold">Error loading Pipeline</p>
            <p className="text-sm text-muted-foreground mt-2">
              The record may not exist or the server may be unavailable.
            </p>
            <div className="flex gap-3 mt-6">
              <Link to="/bus_pipeline">
                <Button variant="outline" className="shadow-sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to List
                </Button>
              </Link>
              <Button onClick={() => refetch()} variant="outline" className="shadow-sm">
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compute field metadata summary
  const fieldSummary = formFields
    ? {
        total: formFields.length,
        displayed: formFields.filter((f) => f.is_displayed).length,
        mandatory: formFields.filter((f) => f.is_mandatory).length,
        readOnly: formFields.filter((f) => f.is_read_only).length,
      }
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto py-8 px-4 space-y-6">
        {/* Navigation + Header - Enhanced Design */}
        <div className="rounded-2xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20 backdrop-blur-sm p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/bus_pipeline">
                <Button variant="ghost" size="sm" className="hover:bg-primary/10">
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Pipeline List
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground" data-testid="entity-heading">
                    {isNew
                      ? 'Create Pipeline'
                      : mode === 'edit'
                        ? 'Edit Pipeline'
                        : 'Pipeline Detail'}
                  </h1>
                  {!isNew && data && (
                    <p className="text-muted-foreground text-sm">
                      ID: {data['id']}
                      {data.version !== undefined && (
                        <span className="ml-3">Version: {data.version}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {!isNew && mode === 'view' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMode('edit')}
                    className="shadow-sm"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleteMutation.isPending}
                    className="shadow-md shadow-destructive/20"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </>
              )}
              {!isNew && mode === 'edit' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode('view')}
                  className="shadow-sm"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Cancel Edit
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog - Enhanced Design */}
        {showDeleteConfirm && (
          <div className="rounded-xl border-2 border-destructive/50 bg-gradient-to-br from-destructive/10 to-destructive/5 backdrop-blur-sm p-6 shadow-lg shadow-destructive/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold text-destructive text-lg">Confirm Deletion</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This action cannot be undone. This will permanently delete the
                    Pipeline record.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteMutation.isPending}
                  className="shadow-sm"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="default"
                  onClick={() => deleteMutation.mutateAsync()}
                  disabled={deleteMutation.isPending}
                  className="shadow-md shadow-destructive/20"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Permanently
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Form - takes 3/4 width on large screens */}
          <div className="lg:col-span-3">
            <div className="rounded-xl border border-border/60 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm p-6 shadow-md">
              {isLoading || isLoadingFields ? (
                <div className="flex items-center justify-center h-64">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary/70" />
                    <p className="text-sm text-muted-foreground">Loading form fields...</p>
                  </div>
                </div>
              ) : (
                <DynamicForm
                  tableName="bus_pipeline"
                  initialData={data}
                  onSubmit={async (formData) => { await saveMutation.mutateAsync(formData); }}
                  isSaving={saveMutation.isPending}
                  mode={isNew ? 'create' : mode === 'edit' ? 'edit' : 'view'}
                  readOnly={mode === 'view' && !isNew}
                  serverErrors={serverErrors}
                />
              )}
            </div>
          </div>

          {/* Sidebar - field metadata summary - Enhanced Design */}
          <div className="lg:col-span-1 space-y-4">
            {/* Field Metadata Info */}
            {fieldSummary && (
              <div className="rounded-xl border border-border/60 bg-gradient-to-br from-muted/40 to-muted/20 backdrop-blur-sm p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                    <Info className="h-4 w-4 text-primary/70" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Field Metadata</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Fields loaded from <code className="text-xs bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">sys_field</code>
                </p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center pb-2 border-b border-border/40">
                    <span className="text-muted-foreground">Total fields</span>
                    <span className="font-semibold text-foreground">{fieldSummary.total}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-border/40">
                    <span className="text-muted-foreground">Displayed</span>
                    <span className="font-semibold text-foreground">{fieldSummary.displayed}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-border/40">
                    <span className="text-muted-foreground">Mandatory</span>
                    <span className="font-semibold text-foreground">{fieldSummary.mandatory}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Read-only</span>
                    <span className="font-semibold text-foreground">{fieldSummary.readOnly}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Record Info (for existing records) - Enhanced Design */}
            {!isNew && data && (
              <div className="rounded-xl border border-border/60 bg-gradient-to-br from-muted/40 to-muted/20 backdrop-blur-sm p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                    <FileText className="h-4 w-4 text-primary/70" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Record Info</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center pb-2 border-b border-border/40">
                    <span className="text-muted-foreground">Status</span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      mode === 'edit'
                        ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border border-yellow-200'
                        : 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200'
                    }`}>
                      {mode === 'edit' ? 'Editing' : 'Saved'}
                    </span>
                  </div>
                  {data.version !== undefined && (
                    <div className="flex justify-between items-center pb-2 border-b border-border/40">
                      <span className="text-muted-foreground">Version</span>
                      <span className="font-mono text-xs bg-muted/60 px-2 py-1 rounded border border-border/40">{data.version}</span>
                    </div>
                  )}
                  {data.created_at && (
                    <div className="flex justify-between items-center pb-2 border-b border-border/40">
                      <span className="text-muted-foreground">Created</span>
                      <span className="text-xs font-mono">
                        {new Date(data.created_at as string).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false
                        })}
                      </span>
                    </div>
                  )}
                  {data.updated_at && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Updated</span>
                      <span className="text-xs font-mono">
                        {new Date(data.updated_at as string).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions - Enhanced Design */}
            <div className="rounded-xl border border-border/60 bg-gradient-to-br from-muted/40 to-muted/20 backdrop-blur-sm p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                  <FileText className="h-4 w-4 text-primary/70" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
              </div>
              <div className="flex flex-col gap-2">
                <Link to="/bus_pipeline/new">
                  <Button variant="outline" size="sm" className="w-full justify-start shadow-sm hover:shadow-md transition-shadow">
                    Create New Pipeline
                  </Button>
                </Link>
                <Link to="/bus_pipeline">
                  <Button variant="outline" size="sm" className="w-full justify-start shadow-sm hover:shadow-md transition-shadow">
                    View All Pipeline Records
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button variant="outline" size="sm" className="w-full justify-start shadow-sm hover:shadow-md transition-shadow">
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
