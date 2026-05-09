/**
 * Field Layout Management Page
 *
 * Allows administrators to customize field ordering and visibility
 * for forms and tables. Changes are persisted to sys_field.seq_no.
 *
 * Features:
 * - Drag-and-drop field reordering
 * - Toggle field visibility
 * - Field grouping with multi-column layouts
 * - Field color and styling customization
 *
 * Generated: {{now}}
 */

"use client";

import { Layers, LayoutGrid } from "lucide-react";
import { useState } from "react";
import { FieldGroupManager } from "@/components/admin/field-group-manager";
import { FieldLayoutEditor } from "@/components/admin/field-layout-editor";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabValue = "layout" | "groups";

// Available business entities for field customization
const BUSINESS_ENTITIES = [
  { value: "bus_customer", label: "Customers" },
  { value: "bus_product", label: "Products" },
  { value: "bus_sales_order", label: "Sales Orders" },
  { value: "bus_sales_order_line", label: "Sales Order Lines" },
];

export default function FieldLayoutPage() {
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabValue>("layout");

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Field Layout Manager</h1>
          <p className="text-muted-foreground">
            Customize field ordering, grouping, and styling for forms and tables
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Entity</CardTitle>
            <CardDescription>Choose an entity to customize its field layout</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue placeholder="Select an entity..." />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_ENTITIES.map((entity) => (
                  <SelectItem key={entity.value} value={entity.value}>
                    {entity.label} ({entity.value})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedTable && (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabValue)}
            className="space-y-6"
          >
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="layout" className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                Field Layout
              </TabsTrigger>
              <TabsTrigger value="groups" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Field Groups
              </TabsTrigger>
            </TabsList>

            <TabsContent value="layout" className="space-y-6">
              <FieldLayoutEditor entityName={selectedTable} />
            </TabsContent>

            <TabsContent value="groups" className="space-y-6">
              <FieldGroupManager entityName={selectedTable} />
            </TabsContent>
          </Tabs>
        )}

        {!selectedTable && (
          <Card className="bg-muted/50">
            <CardContent className="p-12 text-center">
              <LayoutGrid className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Select an entity above to start customizing its field layout
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
