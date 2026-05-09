/**
 * Admin Dashboard Page - Compiere Application Dictionary
 *
 * Swiss Clean Design - Editorial layout with minimalist aesthetic
 * - Grid-based structure with strong alignment
 * - Bold typography with clear hierarchy
 * - Generous whitespace
 * - Minimal borders, no rounded corners
 * - Black, white, gray palette
 *
 * Generated: 2026-03-20T16:41:26.617Z
 * Project: nextjs-nestjs-test-app
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AppWindow,
  ArrowRight,
  Columns,
  Database,
  Hash,
  LayoutList,
  RefreshCw,
  Settings,
  Table2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { apiClient, type PaginatedResponse } from "@/lib/api-client";

interface SysTable {
  sys_table_id: string;
  name: string;
  table_name: string;
  description?: string;
  is_active?: boolean;
}

interface SysColumn {
  sys_column_id: string;
  name: string;
  table_name?: string;
}

interface SysField {
  sys_field_id: string;
  name: string;
  table_name?: string;
  seq_no?: number;
  is_displayed?: boolean;
}

interface SysWindow {
  sys_window_id: string;
  name: string;
  description?: string;
}

interface SysReference {
  sys_reference_id: string;
  name: string;
}

export default function AdminDashboardPage() {
  const {
    data: tablesResponse,
    isLoading: tablesLoading,
    refetch: refetchTables,
  } = useQuery({
    queryKey: ["admin", "tables"],
    queryFn: () => apiClient.get<PaginatedResponse<SysTable>>("/api/sys/tables", { limit: 200 }),
  });

  const { data: columnsResponse, isLoading: columnsLoading } = useQuery({
    queryKey: ["admin", "columns-count"],
    queryFn: () => apiClient.get<PaginatedResponse<SysColumn>>("/api/sys/columns", { limit: 1 }),
  });

  const { data: fieldsResponse, isLoading: fieldsLoading } = useQuery({
    queryKey: ["admin", "fields-count"],
    queryFn: () => apiClient.get<PaginatedResponse<SysField>>("/api/sys/fields", { limit: 1 }),
  });

  const { data: windowsResponse, isLoading: windowsLoading } = useQuery({
    queryKey: ["admin", "windows-count"],
    queryFn: () => apiClient.get<PaginatedResponse<SysWindow>>("/api/sys/windows", { limit: 1 }),
  });

  const { data: referencesResponse } = useQuery({
    queryKey: ["admin", "references-count"],
    queryFn: () =>
      apiClient.get<PaginatedResponse<SysReference>>("/api/sys/references", { limit: 1 }),
  });

  // Fetch all fields to compute per-entity field counts
  const { data: allFieldsResponse } = useQuery({
    queryKey: ["admin", "all-fields"],
    queryFn: () => apiClient.get<PaginatedResponse<SysField>>("/api/sys/fields", { limit: 500 }),
  });

  const tables = tablesResponse?.data || [];
  const allFields = allFieldsResponse?.data || [];

  // Compute field count per table
  const fieldCountByTable: Record<string, number> = {};
  allFields.forEach((field) => {
    if (field.table_name) {
      fieldCountByTable[field.table_name] = (fieldCountByTable[field.table_name] || 0) + 1;
    }
  });

  const isLoading = tablesLoading || columnsLoading || fieldsLoading || windowsLoading;

  return (
    <div className="min-h-screen bg-white">
      {/* Swiss Clean Header - Editorial Style */}
      <header className="border-b-4 border-black bg-white">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-6xl font-bold tracking-tight text-black mb-4 font-newsreader">
                Application Dictionary
              </h1>
              <p className="text-xl text-gray-600 font-light max-w-2xl leading-relaxed">
                Manage entities, field layouts, and application configuration for
                nextjs-nestjs-test-app
              </p>
            </div>
            <Button
              variant="outline"
              size="default"
              onClick={() => refetchTables()}
              disabled={isLoading}
              className="border-2 border-black hover:bg-black hover:text-white transition-colors rounded-none"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Swiss Clean Overview Cards - Grid Layout */}
        <section className="mb-16">
          <div className="grid grid-cols-5 gap-0 border-l border-r border-black">
            {/* Tables Card */}
            <div className="border-t border-b border-black border-r p-8 flex flex-col justify-between">
              <div>
                <Table2 className="h-8 w-8 mb-6 text-black" />
                <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-2">Tables</h2>
                <p className="text-5xl font-bold text-black mb-2">
                  {tablesResponse?.meta?.total || 0}
                </p>
              </div>
              <p className="text-xs text-gray-600 mt-4">Registered in sys_table</p>
            </div>

            {/* Columns Card */}
            <div className="border-t border-b border-black border-r p-8 flex flex-col justify-between">
              <div>
                <Columns className="h-8 w-8 mb-6 text-black" />
                <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-2">Columns</h2>
                <p className="text-5xl font-bold text-black mb-2">
                  {columnsResponse?.meta?.total || 0}
                </p>
              </div>
              <p className="text-xs text-gray-600 mt-4">Defined in sys_column</p>
            </div>

            {/* Fields Card */}
            <div className="border-t border-b border-black border-r p-8 flex flex-col justify-between">
              <div>
                <LayoutList className="h-8 w-8 mb-6 text-black" />
                <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-2">Fields</h2>
                <p className="text-5xl font-bold text-black mb-2">
                  {fieldsResponse?.meta?.total || 0}
                </p>
              </div>
              <p className="text-xs text-gray-600 mt-4">Layout entries in sys_field</p>
            </div>

            {/* Windows Card */}
            <div className="border-t border-b border-black border-r p-8 flex flex-col justify-between">
              <div>
                <AppWindow className="h-8 w-8 mb-6 text-black" />
                <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-2">Windows</h2>
                <p className="text-5xl font-bold text-black mb-2">
                  {windowsResponse?.meta?.total || 0}
                </p>
              </div>
              <p className="text-xs text-gray-600 mt-4">Defined in sys_window</p>
            </div>

            {/* Entities Card */}
            <div className="border-t border-b border-black p-8 flex flex-col justify-between">
              <div>
                <Settings className="h-8 w-8 mb-6 text-black" />
                <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-2">Entities</h2>
                <p className="text-5xl font-bold text-black mb-2">4</p>
              </div>
              <p className="text-xs text-gray-600 mt-4">Generated business entities</p>
            </div>
          </div>
        </section>

        {/* Swiss Clean Quick Actions */}
        <section className="mb-16">
          <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-0">
            {/* Field Layout Manager */}
            <Link href="/admin/fields" className="group">
              <div className="border-2 border-black p-8 hover:bg-black hover:text-white transition-colors">
                <div className="flex items-start justify-between mb-6">
                  <LayoutList className="h-6 w-6" />
                  <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-2xl font-bold mb-3 font-newsreader">Field Layout Manager</h3>
                <p className="text-sm leading-relaxed opacity-80">
                  Customize the order and visibility of fields in forms and grid views.
                  Drag-and-drop reordering with seq_no and seq_no_grid editing.
                </p>
              </div>
            </Link>

            {/* Table Browser */}
            <Link href="/admin/tables" className="group">
              <div className="border-2 border-black border-l-0 p-8 hover:bg-black hover:text-white transition-colors">
                <div className="flex items-start justify-between mb-6">
                  <Database className="h-6 w-6" />
                  <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-2xl font-bold mb-3 font-newsreader">Table Browser</h3>
                <p className="text-sm leading-relaxed opacity-80">
                  View and manage Application Dictionary tables and their column definitions
                </p>
              </div>
            </Link>

            {/* Reference Types */}
            <Link href="/admin/references" className="group">
              <div className="border-2 border-black border-l-0 p-8 hover:bg-black hover:text-white transition-colors">
                <div className="flex items-start justify-between mb-6">
                  <Hash className="h-6 w-6" />
                  <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-2xl font-bold mb-3 font-newsreader">Reference Types</h3>
                <p className="text-sm leading-relaxed opacity-80">
                  View data type definitions, validation rules, and their column mappings
                </p>
              </div>
            </Link>
          </div>
        </section>

        {/* Swiss Clean Entities Table - Editorial Layout */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm uppercase tracking-widest text-gray-500 mb-1">
                Registered Entities
              </h2>
              <p className="text-sm text-gray-600">
                All entities from sys_table with their field counts and configuration status
              </p>
            </div>
            <Link href="/admin/fields">
              <Button
                variant="outline"
                size="default"
                className="border-2 border-black hover:bg-black hover:text-white transition-colors rounded-none"
              >
                <LayoutList className="h-4 w-4 mr-2" />
                Edit Field Layouts
              </Button>
            </Link>
          </div>

          {tables.length === 0 && !tablesLoading ? (
            <div className="text-center py-16 text-gray-500 border-2 border-black">
              No entities registered in the Application Dictionary yet.
            </div>
          ) : (
            <div className="border-2 border-black">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-black bg-gray-50">
                    <th className="text-left py-4 px-6 font-bold uppercase tracking-wider text-xs">
                      Entity Name
                    </th>
                    <th className="text-left py-4 px-6 font-bold uppercase tracking-wider text-xs">
                      Table Name
                    </th>
                    <th className="text-center py-4 px-6 font-bold uppercase tracking-wider text-xs">
                      Fields
                    </th>
                    <th className="text-center py-4 px-6 font-bold uppercase tracking-wider text-xs">
                      Status
                    </th>
                    <th className="text-right py-4 px-6 font-bold uppercase tracking-wider text-xs">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          )}

          {/* Quick Entity Links */}
          <div className="mt-8 p-8 bg-gray-50 border-2 border-black">
            <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-4">
              Generated Entity Quick Links
            </h3>
            <div className="flex flex-wrap gap-2"></div>
          </div>
        </section>
      </main>

      {/* Swiss Clean Footer */}
      <footer className="border-t-2 border-black mt-16">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <p className="text-sm text-gray-500">
            nextjs-nestjs-test-app · Generated by ERDwithAI · Swiss Clean Design
          </p>
        </div>
      </footer>
    </div>
  );
}
