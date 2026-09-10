import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Home } from "lucide-react";
import { useMemo } from "react";
import { ADSidebar } from "@/components/admin/ad-sidebar";
import { ReportDesigner } from "@/components/reports/ReportDesigner";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";

export const Route = createFileRoute("/admin/reports/$tableName")({
  component: ReportDesignPage,
});

interface ColumnMeta {
  column_name: string;
  name?: string;
}

interface ColumnMetaResponse {
  columns?: ColumnMeta[];
}

function ReportDesignPage() {
  const { tableName } = Route.useParams();

  // `/bus/:entity/meta` is the Application Dictionary reading of a table — the
  // same one every business screen builds its form from, and it accepts either
  // the physical name (`bus_account`) or the bare one. The path this used to
  // call, `/sys/entity-metadata/:table`, is served by nothing: the designer's
  // data-source tree came back empty for every entity, so no field could be
  // bound and no report could be designed.
  const { data: meta, isLoading } = useQuery({
    queryKey: ["report-designer-columns", tableName],
    queryFn: () => apiClient.get<ColumnMetaResponse>(`/bus/${tableName}/meta`),
    enabled: !!tableName,
  });

  // Memoised: `ReportDesigner` keys its mount effect on this array, and a fresh
  // one every render would tear the designer down and rebuild it — losing
  // whatever the user had just placed on the page.
  const columns: string[] = useMemo(
    () => (meta?.columns ?? []).map((c) => c.column_name).filter(Boolean),
    [meta]
  );

  return (
    <ADSidebar>
      <div className="flex flex-col h-full">
        <header className="border-b border-border bg-card px-8 py-6 shrink-0">
          <div className="flex items-center gap-3 mb-1 text-sm text-muted-foreground">
            <Link
              to="/dashboard"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <Home className="h-3.5 w-3.5" />
              Dashboard
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <Link
              to="/admin"
              className="hover:text-primary transition-colors"
            >
              Admin
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <Link
              to="/admin/reports"
              className="hover:text-primary transition-colors"
            >
              Report Designs
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-foreground font-medium">{tableName}</span>
          </div>
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              Report Designer — <span className="text-primary">{tableName}</span>
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Design the document layout for this entity. Users will see a Print button when viewing records.
          </p>
        </header>

        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <ReportDesigner tableName={tableName} columns={columns} />
          )}
        </div>
      </div>
    </ADSidebar>
  );
}
