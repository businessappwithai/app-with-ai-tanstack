/**
 * Entity List Page
 *
 * Displays a list of records for a business entity with:
 * - Dynamic table columns from sys_field (seq_no_grid)
 * - Pagination
 * - Search and filtering
 * - Create, Edit, Delete actions
 *
 * Generated: {{now}}
 */

import { Edit, Eye, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { DynamicForm } from "@/components/forms/dynamic-form";
import { AppLayout } from "@/components/layout/app-layout";
import { DynamicTable } from "@/components/tables/dynamic-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type EntityRecord,
  useCreateEntity,
  useDeleteEntity,
  useEntities,
  useEntity,
  useUpdateEntity,
} from "@/hooks/use-entities";

interface EntityListPageProps {
  entity: string;
}

export default function EntityListPage({ entity }: EntityListPageProps) {
  return <EntityListContent entityName={entity} />;
}

function EntityListContent({ entityName }: { entityName: string }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Queries
  const { data, isLoading, error } = useEntities(entityName, { page, limit: pageSize });
  const { data: selectedRecord, isLoading: isLoadingRecord } = useEntity(
    entityName,
    selectedId || ""
  );

  // Mutations
  const createMutation = useCreateEntity(entityName);
  const updateMutation = useUpdateEntity(entityName);
  const deleteMutation = useDeleteEntity(entityName);

  // Handlers
  const handleCreate = async (data: Record<string, unknown>) => {
    try {
      await createMutation.mutateAsync(data);
      setIsCreateModalOpen(false);
      toast.success("Record created successfully");
    } catch (error) {
      toast.error("Failed to create record");
      console.error(error);
    }
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!selectedId) return;

    try {
      await updateMutation.mutateAsync({
        id: selectedId,
        data,
        version: selectedRecord?.version,
      });
      setIsEditModalOpen(false);
      setSelectedId(null);
      toast.success("Record updated successfully");
    } catch (error) {
      toast.error("Failed to update record");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;

    try {
      await deleteMutation.mutateAsync(id);
      if (selectedId === id) {
        setSelectedId(null);
      }
      toast.success("Record deleted successfully");
    } catch (error) {
      toast.error("Failed to delete record");
      console.error(error);
    }
  };

  const handleRowClick = (row: Record<string, unknown>) => {
    const id = row.id as string;
    setSelectedId(id);
    setIsViewModalOpen(true);
  };

  const handleEdit = (id: string) => {
    setSelectedId(id);
    setIsViewModalOpen(false);
    setIsEditModalOpen(true);
  };

  const handleView = (id: string) => {
    setSelectedId(id);
    setIsEditModalOpen(false);
    setIsViewModalOpen(true);
  };

  // Format entity name for display
  const displayEntityName = entityName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{displayEntityName}</h1>
            <p className="text-muted-foreground">
              Manage {displayEntityName.toLowerCase()} records
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Record
          </Button>
        </div>

        {/* Table */}
        <DynamicTable
          tableName={entityName}
          data={data?.data || []}
          isLoading={isLoading}
          totalCount={data?.meta.total || 0}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onRowClick={handleRowClick}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          selectedId={selectedId || undefined}
        />

        {/* Create Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Record</DialogTitle>
              <DialogDescription>
                Fill in the form below to create a new {displayEntityName.toLowerCase()} record.
              </DialogDescription>
            </DialogHeader>
            <DynamicForm
              tableName={entityName}
              onSubmit={handleCreate}
              mode="create"
              isSaving={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog
          open={isEditModalOpen}
          onOpenChange={(open) => {
            setIsEditModalOpen(open);
            if (!open) setSelectedId(null);
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Record</DialogTitle>
              <DialogDescription>
                Update the {displayEntityName.toLowerCase()} record information.
              </DialogDescription>
            </DialogHeader>
            {!isLoadingRecord && selectedRecord && (
              <DynamicForm
                tableName={entityName}
                initialData={selectedRecord}
                onSubmit={handleUpdate}
                mode="edit"
                isSaving={updateMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* View Modal */}
        <Dialog
          open={isViewModalOpen}
          onOpenChange={(open) => {
            setIsViewModalOpen(open);
            if (!open) setSelectedId(null);
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>View Record</DialogTitle>
              <DialogDescription>{displayEntityName} record details.</DialogDescription>
            </DialogHeader>
            {!isLoadingRecord && selectedRecord && (
              <Tabs defaultValue="details" className="w-full">
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="edit">Edit</TabsTrigger>
                </TabsList>
                <TabsContent value="details">
                  <DynamicForm
                    tableName={entityName}
                    initialData={selectedRecord}
                    mode="view"
                    readOnly
                  />
                </TabsContent>
                <TabsContent value="edit">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Switch to Edit mode to modify this record.
                    </p>
                    <Button
                      onClick={() => {
                        setIsViewModalOpen(false);
                        setIsEditModalOpen(true);
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Record
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
