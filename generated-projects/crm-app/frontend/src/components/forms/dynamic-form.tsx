"use client";

/**
 * Dynamic Form Component
 *
 * Renders a form based on sys_field metadata from the Application Dictionary.
 * Fields are ordered by seq_no which can be modified at runtime.
 *
 * Features:
 * - Field grouping with section headers
 * - Multi-column layouts based on col_span
 * - Field colors and styling
 * - Dropdown/select fields for reference lists (sys_reference_id >= 1000)
 *
 * Auto-generated component
 */

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { type FieldMetadata, useEntities, useFormFields, useRefList } from "@/hooks/use-entities";
import { apiClient } from "@/lib/api-client";
import { getFieldLabel } from "@/lib/i18n-fields";
import { useTranslations } from "@/lib/translations";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface DynamicFormProps {
  tableName: string;
  initialData?: Record<string, unknown>;
  onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
  isLoading?: boolean;
  isSaving?: boolean;
  mode?: "create" | "edit" | "view";
  readOnly?: boolean;
  serverErrors?: Record<string, string>;
  parentField?: string; // Field name that links to parent (e.g., 'patient_id') - will be hidden from form
  readOnlyFields?: string[]; // Specific field names that should be read-only (e.g., parent_id for child records)
}

// ============================================================================
// Field Type Mapping
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
  PASSWORD: 29,
};

// ============================================================================
// Types
// ============================================================================

type FormValues = Record<string, unknown>;

// ============================================================================
// Field Renderer
// ============================================================================

interface TableReferenceFieldProps {
  field: FieldMetadata;
  fieldApi: any;
  isDisabled: boolean;
  error: string | undefined;
}

/**
 * Component for rendering TABLE reference fields (sys_reference_id === 18)
 * Fetches records from the referenced table and displays them in a dropdown
 */
function TableReferenceField({ field, fieldApi, isDisabled, error }: TableReferenceFieldProps) {
  // Get the referenced table name from metadata (stored in sys_column.ref_table_name)
  // This is populated from the database, not hardcoded
  const referencedTableName = field.ref_table_name || null;

  // Fetch records from the referenced table
  const { data: records, isLoading } = useEntities<any>(referencedTableName || "", undefined, {
    enabled: !!referencedTableName,
  });

  // Get the actual data array from paginated response
  const tableRecords = records?.data || [];

  // If we can't determine the table name, show a text input
  if (!referencedTableName) {
    return (
      <div className="space-y-2">
        <Label htmlFor={field.column_name}>
          {field.name}
          {field.is_mandatory && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Input
          id={field.column_name}
          name={field.column_name}
          value={(fieldApi.state.value as string) || ""}
          onChange={(e) => fieldApi.handleChange(e.target.value)}
          onBlur={fieldApi.handleBlur}
          disabled={isDisabled}
          className={cn(error && "border-destructive")}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={field.column_name}>
        {field.name}
        {field.is_mandatory && <span className="text-destructive ml-1">*</span>}
      </Label>
      {isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <select
          id={field.column_name}
          name={field.column_name}
          value={(fieldApi.state.value as string) || ""}
          onChange={(e) => fieldApi.handleChange(e.target.value)}
          onBlur={fieldApi.handleBlur}
          disabled={isDisabled}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive"
          )}
        >
          <option value="">Select {field.name}...</option>
          {tableRecords.map((record: any) => (
            <option key={record.id} value={record.id}>
              {record.name ||
                `${record.first_name || ""} ${record.last_name || ""}`.trim() ||
                record.id}
            </option>
          ))}
        </select>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

interface FieldRendererProps {
  field: FieldMetadata;
  form: ReturnType<typeof useForm<FormValues>>;
  serverErrors?: Record<string, string>;
  tableName: string;
  readOnlyFields?: string[]; // Additional read-only field names
}

function FieldRenderer({
  field,
  form,
  serverErrors = {},
  tableName,
  readOnlyFields = [],
}: FieldRendererProps) {
  const isFormReadOnly = (form as any).readOnly || false;
  const formMode = (form as any).mode || "edit";

  // Get translated field label (tab_name not yet available from API, using undefined)
  const fieldLabel = getFieldLabel(tableName, (field as any).tab_name, field.name, field.name);

  // For new record creation, ignore is_read_only to allow filling required fields
  // Otherwise respect the is_read_only flag from database
  // Also check if field is in readOnlyFields (for child edits where parent_id should be read-only)
  const isDisabled =
    (field.is_read_only && formMode !== "create") || readOnlyFields.includes(field.column_name);

  // Fetch reference list values for dropdown fields (sys_reference_id >= 1000)
  const { data: refListValues, isLoading: isLoadingRefList } = useRefList(
    field.sys_reference_id >= 1000 ? field.sys_reference_id : 0
  );

  // Determine field color style
  const getFieldColorStyle = () => {
    if (!field.color || field.color === "contrast") return {};
    return {
      color: field.color,
    };
  };

  const fieldColorStyle = getFieldColorStyle();

  return (
    <form.Field
      name={field.column_name}
      validators={{
        onChange: ({ value }: { value: unknown }) => {
          if (field.is_mandatory && !value) {
            return `${fieldLabel} is required`;
          }
          if (
            field.field_length &&
            typeof value === "string" &&
            value.length > field.field_length
          ) {
            return `${fieldLabel} must be at most ${field.field_length} characters`;
          }
          return undefined;
        },
      }}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(fieldApi: any) => {
        const clientError = fieldApi.state.meta.errors?.[0] as string | undefined;
        const serverError = serverErrors?.[field.column_name];
        const error = clientError || serverError;

        // Dropdown/Select for reference lists (sys_reference_id >= 1000)
        if (field.sys_reference_id >= 1000) {
          return (
            <div className="space-y-2">
              <Label htmlFor={field.column_name}>
                {fieldLabel}
                {field.is_mandatory && <span className="text-destructive ml-1">*</span>}
              </Label>
              {isLoadingRefList ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <select
                  id={field.column_name}
                  name={field.column_name}
                  value={(fieldApi.state.value as string) || ""}
                  onChange={(e) => fieldApi.handleChange(e.target.value)}
                  onBlur={fieldApi.handleBlur}
                  disabled={isDisabled || isFormReadOnly}
                  className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    error && "border-destructive"
                  )}
                >
                  <option value="">Select {fieldLabel}...</option>
                  {refListValues?.map((refValue) => (
                    <option key={refValue.sys_ref_list_id} value={refValue.value}>
                      {refValue.name}
                    </option>
                  ))}
                </select>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          );
        }

        // Dropdown/Select for table references (sys_reference_id === 18)
        if (field.sys_reference_id === REFERENCE_TYPE.TABLE) {
          return (
            <TableReferenceField
              field={field}
              fieldApi={fieldApi}
              isDisabled={isDisabled || isFormReadOnly}
              error={error}
            />
          );
        }

        // Render different input types based on sys_reference_id
        switch (field.sys_reference_id) {
          case REFERENCE_TYPE.TEXT:
            return (
              <div className="space-y-2">
                <Label htmlFor={field.column_name}>
                  {fieldLabel}
                  {field.is_mandatory && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Textarea
                  id={field.column_name}
                  name={field.column_name}
                  value={(fieldApi.state.value as string) || ""}
                  onChange={(e) => fieldApi.handleChange(e.target.value)}
                  onBlur={fieldApi.handleBlur}
                  disabled={isDisabled || isFormReadOnly}
                  className={cn(error && "border-destructive")}
                  rows={4}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            );

          case REFERENCE_TYPE.YES_NO:
            return (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={field.column_name}
                  checked={(fieldApi.state.value as boolean) || false}
                  onCheckedChange={(checked) => fieldApi.handleChange(checked)}
                  disabled={isDisabled || isFormReadOnly}
                />
                <Label htmlFor={field.column_name}>{fieldLabel}</Label>
              </div>
            );

          case REFERENCE_TYPE.DATE:
            return (
              <div className="space-y-2">
                <Label htmlFor={field.column_name}>
                  {fieldLabel}
                  {field.is_mandatory && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Input
                  id={field.column_name}
                  name={field.column_name}
                  type="date"
                  value={(fieldApi.state.value as string)?.split("T")[0] || ""}
                  onChange={(e) => fieldApi.handleChange(e.target.value)}
                  onBlur={fieldApi.handleBlur}
                  disabled={isDisabled || isFormReadOnly}
                  className={cn(error && "border-destructive")}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            );

          case REFERENCE_TYPE.DATETIME:
            return (
              <div className="space-y-2">
                <Label htmlFor={field.column_name}>
                  {fieldLabel}
                  {field.is_mandatory && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Input
                  id={field.column_name}
                  name={field.column_name}
                  type="datetime-local"
                  value={(fieldApi.state.value as string)?.slice(0, 16) || ""}
                  onChange={(e) => fieldApi.handleChange(e.target.value)}
                  onBlur={fieldApi.handleBlur}
                  disabled={isDisabled || isFormReadOnly}
                  className={cn(error && "border-destructive")}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            );

          case REFERENCE_TYPE.INTEGER:
          case REFERENCE_TYPE.AMOUNT:
            return (
              <div className="space-y-2">
                <Label htmlFor={field.column_name}>
                  {fieldLabel}
                  {field.is_mandatory && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Input
                  id={field.column_name}
                  name={field.column_name}
                  type="number"
                  step={field.sys_reference_id === REFERENCE_TYPE.AMOUNT ? "0.01" : "1"}
                  value={(fieldApi.state.value as number) ?? ""}
                  onChange={(e) => fieldApi.handleChange(e.target.valueAsNumber || null)}
                  onBlur={fieldApi.handleBlur}
                  disabled={isDisabled || isFormReadOnly}
                  className={cn(error && "border-destructive")}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            );

          case REFERENCE_TYPE.EMAIL:
            return (
              <div className="space-y-2">
                <Label htmlFor={field.column_name}>
                  {fieldLabel}
                  {field.is_mandatory && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Input
                  id={field.column_name}
                  name={field.column_name}
                  type="email"
                  value={(fieldApi.state.value as string) || ""}
                  onChange={(e) => fieldApi.handleChange(e.target.value)}
                  onBlur={fieldApi.handleBlur}
                  disabled={isDisabled || isFormReadOnly}
                  className={cn(error && "border-destructive")}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            );

          case REFERENCE_TYPE.URL:
            return (
              <div className="space-y-2">
                <Label htmlFor={field.column_name}>
                  {fieldLabel}
                  {field.is_mandatory && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Input
                  id={field.column_name}
                  name={field.column_name}
                  type="url"
                  value={(fieldApi.state.value as string) || ""}
                  onChange={(e) => fieldApi.handleChange(e.target.value)}
                  onBlur={fieldApi.handleBlur}
                  disabled={isDisabled || isFormReadOnly}
                  className={cn(error && "border-destructive")}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            );

          case REFERENCE_TYPE.PASSWORD:
            return (
              <div className="space-y-2">
                <Label htmlFor={field.column_name}>
                  {fieldLabel}
                  {field.is_mandatory && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Input
                  id={field.column_name}
                  name={field.column_name}
                  type="password"
                  value={(fieldApi.state.value as string) || ""}
                  onChange={(e) => fieldApi.handleChange(e.target.value)}
                  onBlur={fieldApi.handleBlur}
                  disabled={isDisabled || isFormReadOnly}
                  className={cn(error && "border-destructive")}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            );

          // Default: text input
          default:
            return (
              <div className="space-y-2">
                <Label htmlFor={field.column_name}>
                  {fieldLabel}
                  {field.is_mandatory && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Input
                  id={field.column_name}
                  name={field.column_name}
                  type="text"
                  value={(fieldApi.state.value as string) || ""}
                  onChange={(e) => fieldApi.handleChange(e.target.value)}
                  onBlur={fieldApi.handleBlur}
                  disabled={isDisabled || isFormReadOnly}
                  maxLength={field.field_length}
                  className={cn(error && "border-destructive")}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            );
        }
      }}
    </form.Field>
  );
}

// ============================================================================
// Dynamic Form Component
// ============================================================================

export function DynamicForm({
  tableName,
  initialData = {},
  onSubmit,
  isLoading: externalLoading = false,
  isSaving = false,
  mode = "create",
  readOnly = false,
  serverErrors = {},
  parentField,
  readOnlyFields = [],
}: DynamicFormProps) {
  const { t } = useTranslations();
  const { data: fields, isLoading: fieldsLoading, error } = useFormFields(tableName);

  const form = useForm<FormValues>({
    defaultValues: initialData,
    onSubmit: async ({ value }) => {
      if (readOnly || !onSubmit) return;

      // Filter out non-updateable fields for update mode
      // Only send updateable fields to the backend
      // Never send: id, created_at, updated_at, deleted_at (backend handles these)
      const filteredValues =
        mode === "edit" && fields
          ? Object.entries(value).reduce(
              (acc, [key, val]) => {
                // Skip system fields that backend manages
                if (
                  key === "id" ||
                  key === "created_at" ||
                  key === "updated_at" ||
                  key === "deleted_at"
                ) {
                  return acc;
                }

                // For all other fields, check if they're updateable (not read-only)
                // version field is allowed for optimistic locking
                const field = fields.find((f: FieldMetadata) => f.column_name === key);
                const isUpdateable = field?.is_updateable !== false;
                const isVersionField = key === "version";

                if (isUpdateable || isVersionField) {
                  acc[key] = val;
                }
                return acc;
              },
              {} as Record<string, unknown>
            )
          : value;

      // Call the onSubmit handler with filtered form values
      // Toast notifications are handled by the caller (page component)
      await onSubmit(filteredValues);
    },
  });

  // Attach readOnly and mode to form instance for FieldRenderer to access
  (form as any).readOnly = readOnly;
  (form as any).mode = mode;

  // Update form values when initialData changes (e.g., after API call completes)
  useEffect(() => {
    if (Object.keys(initialData).length > 0) {
      // Batch update all field values at once
      Object.entries(initialData).forEach(([key, value]) => {
        form.setFieldValue(key, value);
      });
    }
  }, [initialData]);

  // Only show skeleton when waiting for field metadata, not entity data
  // Entity data loading should not block form rendering - form fields will populate when data arrives
  const isLoading = fieldsLoading;

  // Group fields by group_name (before early returns, so hooks are called consistently)
  const groupedFields = useMemo(() => {
    if (!fields || fields.length === 0) return new Map();

    // Show all displayed fields except the parent reference field (e.g., patient_id when creating from patient)
    // But DO show other reference fields like department_id, provider_id, etc.
    const displayFields = fields.filter((f) => f.is_displayed && f.column_name !== parentField);

    const groups: Map<string | null, FieldMetadata[]> = new Map();

    // First, separate fields into groups
    displayFields.forEach((field) => {
      const groupName = field.group_name || null;
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName)!.push(field);
    });

    return groups;
  }, [fields, parentField]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/15 p-4 text-destructive">
        Failed to load form fields: {error.message}
      </div>
    );
  }

  if (!fields || fields.length === 0) {
    return (
      <div className="rounded-md bg-muted p-4 text-muted-foreground">
        No fields configured for this entity.
      </div>
    );
  }

  // Manual submit handler that collects form values and calls onSubmit
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (readOnly || !onSubmit) return;

    // Get current form values using TanStack Form's state
    const currentValues = form.state.values;
    const value = currentValues as Record<string, unknown>;

    // Filter out non-updateable fields for update mode
    const filteredValues =
      mode === "edit" && fields
        ? Object.entries(value).reduce(
            (acc, [key, val]) => {
              // Skip system fields that backend manages
              if (
                key === "id" ||
                key === "created_at" ||
                key === "updated_at" ||
                key === "deleted_at"
              ) {
                return acc;
              }

              // For all other fields, check if they're updateable (not read-only)
              // version field is allowed for optimistic locking
              const field = fields.find((f: FieldMetadata) => f.column_name === key);
              const isUpdateable = !field?.is_read_only;
              const isVersionField = key === "version";

              if (isUpdateable || isVersionField) {
                acc[key] = val;
              }
              return acc;
            },
            {} as Record<string, unknown>
          )
        : value;

    await onSubmit(filteredValues);
  };

  return (
    <form.Provider>
      <form role="form" onSubmit={handleFormSubmit} className="space-y-6">
        {/* Submit button - top (hide in view mode) */}
        {!readOnly && onSubmit && (
          <div className="flex justify-end gap-4">
            <form.Subscribe selector={(state: any) => [state.isSubmitting]}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {([isFormSubmitting]: any) => (
                <Button type="submit" disabled={isSaving || isFormSubmitting}>
                  {isSaving || isFormSubmitting
                    ? "Saving..."
                    : mode === "create"
                      ? "Create"
                      : "Save"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        )}

        {/* Render grouped fields */}
        {Array.from(groupedFields.entries()).map(([groupName, fieldsInGroup]) => {
          // Determine group columns (default to 1 if not in a group)
          const groupColumns = fieldsInGroup[0]?.group_columns || 1;

          return (
            <div key={groupName || "ungrouped"} className="space-y-4">
              {/* Group header if fields are in a group */}
              {groupName && (
                <div className="border-b pb-2">
                  <h3 className="text-lg font-semibold" style={{ color: "#6366f1" }}>
                    {groupName}
                  </h3>
                  {fieldsInGroup[0]?.group_description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {fieldsInGroup[0].group_description}
                    </p>
                  )}
                </div>
              )}

              {/* Render fields in multi-column grid using FieldRenderer for proper type handling */}
              <div
                className={cn(
                  "grid gap-4",
                  groupColumns === 1 && "grid-cols-1",
                  groupColumns === 2 && "grid-cols-1 md:grid-cols-2",
                  groupColumns === 3 && "grid-cols-1 md:grid-cols-3",
                  groupColumns === 4 && "grid-cols-1 md:grid-cols-4"
                )}
              >
                {fieldsInGroup.map((field: FieldMetadata) => {
                  return (
                    <div
                      key={field.sys_field_id}
                      className={cn(
                        // Apply custom column span if specified (max span is groupColumns)
                        field.col_span &&
                          field.col_span > 1 &&
                          `md:col-span-${Math.min(groupColumns, field.col_span)}`
                      )}
                    >
                      <FieldRenderer
                        field={field}
                        form={form}
                        serverErrors={serverErrors}
                        tableName={tableName}
                        readOnlyFields={readOnlyFields}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Submit button - hide in view mode */}
        {!readOnly && onSubmit && (
          <div className="flex justify-end gap-4">
            <form.Subscribe selector={(state: any) => [state.isSubmitting]}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {([isFormSubmitting]: any) => (
                <Button type="submit" disabled={isSaving || isFormSubmitting}>
                  {isSaving || isFormSubmitting
                    ? "Saving..."
                    : mode === "create"
                      ? "Create"
                      : "Save"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        )}
      </form>
    </form.Provider>
  );
}
