/**
 * Dashboard Page - Swiss Clean Design
 *
 * Shows overview of all entities with Swiss Clean aesthetic:
 * - Editorial elegance with Newsreader serif headlines
 * - Technical precision with JetBrains Mono metrics
 * - Clean borders and refined spacing
 *
 * Generated: 2026-05-31T11:58:04.513Z
 * Project: crm-app
 */

import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  Activity,
  ArrowRight,
  FileText,
  Search,
  Settings,
  Loader2,
  AlertCircle,
  User,
  Database,
  Eye,
  FileJson,
  TrendingUp,
  X,
} from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
});

interface TableMetadata {
  sys_table_id: string;
  table_name: string;
  name: string;
  description?: string;
  icon?: string;
  is_active: boolean;
  is_view?: boolean;
  is_document?: boolean;
  is_high_volume?: boolean;
  entity_type?: string;
}

interface TablesResponse {
  data: TableMetadata[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
}

/**
 * Hook to fetch all bus_ tables from sys_table
 */
function useBusTables() {
  return useQuery({
    queryKey: ['sys-tables', 'bus_'],
    queryFn: async () => {
      const response = await apiClient.get<TablesResponse>('/api/sys/tables?prefix=bus_');
      return response;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - table metadata rarely changes
  });
}

/**
 * Badge component for table attributes
 */
function AttributeBadge({
  icon: IconComp,
  label,
  variant = 'default',
}: {
  icon: any;
  label: string;
  variant?: 'default' | 'outline';
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
        variant === 'default'
          ? 'bg-primary/10 text-primary border border-primary/20'
          : 'bg-muted/50 text-muted-foreground border border-border/50'
      )}
      title={label}
    >
      <IconComp className="w-3 h-3" />
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

/**
 * Quick Access Card - Swiss Clean
 * Displays comprehensive information from sys_table
 */
function QuickAccessCard({ table }: { table: TableMetadata }) {
  const attributes = [];
  if (table.is_view) {
    attributes.push({ icon: Eye, label: 'View' });
  }
  if (table.is_document) {
    attributes.push({ icon: FileJson, label: 'Document' });
  }
  if (table.is_high_volume) {
    attributes.push({ icon: TrendingUp, label: 'High Volume' });
  }

  return (
    <Link
      to={`/${table.table_name}`}
      className="swiss-card p-6 group hover:border-primary/50 transition-all hover:shadow-lg"
    >
      <div className="space-y-4">
        {/* Header with icon and name */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Icon from sys_table or default */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-sm flex-shrink-0">
              {table.icon ? (
                <Icon name={table.icon} size={24} className="text-primary-foreground" />
              ) : (
                <FileText className="w-6 h-6 text-primary-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                {table.name}
              </h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {table.table_name}
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
        </div>

        {/* Description from sys_table */}
        {table.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {table.description}
          </p>
        )}

        {/* Metadata badges */}
        <div className="flex flex-wrap gap-2">
          {attributes.map((attr, idx) => (
            <AttributeBadge
              key={idx}
              icon={attr.icon}
              label={attr.label}
              variant="outline"
            />
          ))}
          {table.entity_type && (
            <AttributeBadge
              icon={Database}
              label={`Type: ${table.entity_type}`}
              variant="outline"
            />
          )}
        </div>

        {/* Footer action */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground">Manage records</span>
          <span className="text-xs text-primary font-medium group-hover:underline">
            Open →
          </span>
        </div>
      </div>
    </Link>
  );
}

function DashboardPage() {
  const { data: tablesData, isLoading: tablesLoading, error: tablesError } = useBusTables();
  const [searchQuery, setSearchQuery] = useState('');

  const tables = tablesData?.data ?? [];
  const totalEntities = tablesData?.meta?.total ?? 0;

  // Client-side search filter - no additional API calls
  const filteredTables = searchQuery.trim()
    ? tables.filter((table) => {
        const query = searchQuery.toLowerCase();
        return (
          table.name.toLowerCase().includes(query) ||
          table.table_name.toLowerCase().includes(query) ||
          (table.description?.toLowerCase().includes(query) ?? false)
        );
      })
    : tables;

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="container-swiss">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Activity className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">
                crm-app
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search entities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-8 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-64"
                />
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Link to="/admin">
                <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                </button>
              </Link>
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
                <User className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-swiss py-8 space-y-8">
        {/* Tables Loading State */}
        {tablesLoading && (
          <div className="swiss-card p-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
            <p className="text-muted-foreground">Loading application entities...</p>
          </div>
        )}

        {/* Tables Error State */}
        {tablesError && (
          <div className="swiss-card p-12 text-center border-destructive/50">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <p className="text-foreground font-medium">Failed to load entities</p>
            <p className="text-sm text-muted-foreground mt-2">
              Unable to fetch entity list from Application Dictionary
            </p>
          </div>
        )}

        {/* Quick Access - Only show when tables are loaded */}
        {!tablesLoading && !tablesError && (
          <div className="space-y-4">
            <div className="section-header">
              QUICK ACCESS
              {searchQuery && (
                <span className="text-sm font-normal text-muted-foreground ml-3">
                  ({filteredTables.length} of {tables.length} entities)
                </span>
              )}
            </div>
            {filteredTables.length === 0 ? (
              <div className="swiss-card p-12 text-center">
                <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="font-medium text-foreground">
                  {searchQuery ? 'No entities match your search' : 'No entities registered'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery
                    ? 'Try a different search term or clear the search'
                    : 'Configure entities in the Application Dictionary to get started'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTables.map((table) => (
                  <QuickAccessCard key={table.table_name} table={table} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer Info */}
        <div className="swiss-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-medium text-foreground mb-1">
                {totalEntities} registered {totalEntities === 1 ? 'entity' : 'entities'}
              </h3>
              <p className="text-xs text-muted-foreground">
                Generated: 2026-05-31T11:58:04.513Z
              </p>
            </div>
            <Link to="/admin">
              <button className="text-sm text-primary hover:underline">
                Configure fields →
              </button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
