/**
 * Analysis — the questions the model declared with `%%report`.
 *
 * Distinct from /admin/reports, which designs a printable document for one
 * record. These are queries over the whole database: each one is a question the
 * model's author wrote down, with the SQL that answers it, run on demand.
 *
 * The query itself is never sent to the browser — the API returns the report's
 * title, help text and chart axes, and the rows. Pressing a report runs it.
 */

import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Home, Play, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { ADSidebar } from "@/components/admin/ad-sidebar";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

export const Route = createFileRoute("/admin/analysis")({
  component: AnalysisPage,
});

interface ReportMeta {
  id: string;
  name: string;
  title: string;
  entity_name: string | null;
  table_name: string | null;
  chart: "bar" | "line" | "pie" | "area" | null;
  x_axis: string | null;
  y_axis: string | null;
  help: string | null;
  sort_order: number;
}

interface ReportResult {
  report: ReportMeta;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
  durationMs: number;
}

/** Render any SQL scalar as a cell. Dates and numbers arrive as themselves. */
function cell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * A chart, drawn from the result the report already returned.
 *
 * Deliberately SVG and no charting dependency: the axes are two column names
 * the model chose, the data is one query's rows, and adding a library to a
 * generated application is a decision its author should get to make. `pie` and
 * `area` fall back to bars rather than rendering nothing — the shape is a
 * presentation preference, and refusing to draw loses the answer.
 */
function Chart({ result }: { result: ReportResult }) {
  const { chart, x_axis: x, y_axis: y } = result.report;
  if (!chart || !x || !y) return null;

  const points = result.rows
    .map((row) => ({ label: cell(row[x]), value: Number(row[y]) }))
    .filter((p) => Number.isFinite(p.value))
    .slice(0, 30);
  if (points.length === 0) return null;

  const max = Math.max(...points.map((p) => p.value), 0) || 1;
  const width = 720;
  const height = 240;
  const step = width / points.length;

  return (
    <div className="border border-border rounded-lg bg-card p-4 mb-4 overflow-x-auto">
      <svg width={width} height={height + 40} role="img" aria-label={result.report.title}>
        <title>{result.report.title}</title>
        {chart === "line" ? (
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="text-primary"
            points={points
              .map(
                (p, i) =>
                  `${i * step + step / 2},${height - (p.value / max) * (height - 20)}`
              )
              .join(" ")}
          />
        ) : (
          points.map((p, i) => (
            <rect
              key={`${p.label}-${i}`}
              x={i * step + step * 0.15}
              y={height - (p.value / max) * (height - 20)}
              width={step * 0.7}
              height={(p.value / max) * (height - 20)}
              className="fill-primary"
            />
          ))
        )}
        {points.map((p, i) => (
          <text
            key={`label-${p.label}-${i}`}
            x={i * step + step / 2}
            y={height + 16}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 10 }}
          >
            {p.label.length > 12 ? `${p.label.slice(0, 11)}…` : p.label}
          </text>
        ))}
      </svg>
      <p className="text-xs text-muted-foreground mt-1">
        {y} by {x}
        {points.length < result.rows.length ? ` — first ${points.length} of ${result.rows.length}` : ""}
      </p>
    </div>
  );
}

function AnalysisPage() {
  const [selected, setSelected] = useState<string | null>(null);

  const { data: reports, isLoading } = useQuery({
    queryKey: ["sys-reports"],
    queryFn: () => apiClient.get<ReportMeta[]>("/sys/reports"),
  });

  const {
    data: result,
    isFetching,
    error,
  } = useQuery({
    queryKey: ["sys-report-run", selected],
    queryFn: () => apiClient.get<ReportResult>(`/sys/reports/${selected}/run`),
    enabled: !!selected,
  });

  const list: ReportMeta[] = reports ?? [];

  // Grouped by the entity each report is about. Reports that name no entity —
  // the cross-cutting ones — come last under their own heading rather than
  // being dropped or scattered through the others.
  const groups = new Map<string, ReportMeta[]>();
  for (const report of list) {
    const key = report.entity_name ?? "Across the application";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push(report);
  }

  return (
    <ADSidebar>
      <div className="flex flex-col h-full">
        <header className="border-b border-border bg-card px-8 py-8">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <Home className="h-3.5 w-3.5" />
              Dashboard
            </Link>
            <span>/</span>
            <Link to="/admin" className="hover:text-primary transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-foreground">Analysis</span>
          </div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Analysis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {list.length > 0
              ? `${list.length} question${list.length === 1 ? "" : "s"} this model declared, answered against this database.`
              : "This model declares no %%report directives, so there is nothing to ask yet."}
          </p>
        </header>

        <div className="flex-1 flex min-h-0">
          {/* The questions */}
          <nav className="w-80 border-r border-border overflow-y-auto p-4 shrink-0">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              [...groups.entries()].map(([group, items]) => (
                <section key={group} className="mb-5">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    {group}
                  </h2>
                  <ul className="space-y-1">
                    {items.map((report) => (
                      <li key={report.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(report.name)}
                          className={`w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${
                            selected === report.name
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted"
                          }`}
                        >
                          {report.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </nav>

          {/* The answer */}
          <div className="flex-1 overflow-auto p-8">
            {!selected ? (
              <p className="text-sm text-muted-foreground">
                Choose a question to run it.
              </p>
            ) : error ? (
              <div className="border border-destructive/40 bg-destructive/5 rounded-lg p-4 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <div>
                  <p className="font-medium text-sm">This report did not run.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {(error as Error).message}
                  </p>
                </div>
              </div>
            ) : isFetching || !result ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Play className="h-4 w-4" />
                Running…
              </p>
            ) : (
              <>
                <h2 className="text-xl font-semibold">{result.report.title}</h2>
                {result.report.help ? (
                  <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-3xl">
                    {result.report.help}
                  </p>
                ) : null}

                <Chart result={result} />

                <p className="text-xs text-muted-foreground mb-2">
                  {result.rowCount} row{result.rowCount === 1 ? "" : "s"} in {result.durationMs}ms
                  {result.truncated ? " — capped; the report returns more" : ""}
                </p>

                {result.rowCount === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No rows. The question is valid; nothing in the database answers it yet.
                  </p>
                ) : (
                  <div className="border border-border rounded-lg overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          {result.columns.map((column) => (
                            <th
                              key={column}
                              className="text-left font-medium px-3 py-2 whitespace-nowrap"
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.map((row, index) => (
                          <tr
                            // Report rows have no identity of their own — the
                            // query decides what a row is — so the index is the
                            // honest key here.
                            key={`row-${index}`}
                            className="border-t border-border"
                          >
                            {result.columns.map((column) => (
                              <td key={column} className="px-3 py-2 whitespace-nowrap">
                                {cell(row[column])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setSelected(result.report.name)}
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Run again
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </ADSidebar>
  );
}
