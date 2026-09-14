/**
 * Reports — the questions the model declared with `%%report`.
 *
 * A separate module from `admin.js` because it is not the same shape as the
 * five screens in there. Those read a table the generator seeded and show it.
 * This one runs a query on demand, against the business data the reader has
 * been creating in the tab, and the answer changes as they use the application.
 *
 * The queries themselves never come down to the browser. The list is titles,
 * help text and chart axes; `/reports/:name/run` is what holds the SQL.
 */

import { el, mount, spinner, empty, toast } from "../dom.js";
import { api } from "../api.js";
import { setHelp } from "../main.js";

/** Render one SQL scalar as a cell. */
function cell(value) {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * A chart, as SVG, from the rows the report already returned.
 *
 * No charting library: this runtime has no build step and no dependencies, and
 * the whole drawing is two column names the model chose plotted against each
 * other. `pie` and `area` render as bars rather than as nothing — the shape is
 * a presentation preference and refusing to draw would lose the answer.
 */
function chart(result) {
  const { chart: kind, x, y } = result.report;
  if (!kind || !x || !y) return null;

  const points = result.rows
    .map((row) => ({ label: cell(row[x]), value: Number(row[y]) }))
    .filter((point) => Number.isFinite(point.value))
    .slice(0, 30);
  if (points.length === 0) return null;

  const max = Math.max(...points.map((point) => point.value), 0) || 1;
  const width = 700;
  const height = 220;
  const step = width / points.length;
  const svgns = "http://www.w3.org/2000/svg";

  const svg = document.createElementNS(svgns, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height + 34}`);
  svg.setAttribute("class", "report-chart");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${y} by ${x}`);

  points.forEach((point, index) => {
    const barHeight = (point.value / max) * (height - 16);
    if (kind === "line") {
      if (index === 0) {
        const line = document.createElementNS(svgns, "polyline");
        line.setAttribute("fill", "none");
        line.setAttribute("stroke", "currentColor");
        line.setAttribute("stroke-width", "2");
        line.setAttribute(
          "points",
          points
            .map(
              (p, i) =>
                `${i * step + step / 2},${height - (p.value / max) * (height - 16)}`
            )
            .join(" ")
        );
        svg.appendChild(line);
      }
    } else {
      const rect = document.createElementNS(svgns, "rect");
      rect.setAttribute("x", String(index * step + step * 0.15));
      rect.setAttribute("y", String(height - barHeight));
      rect.setAttribute("width", String(step * 0.7));
      rect.setAttribute("height", String(barHeight));
      rect.setAttribute("fill", "currentColor");
      svg.appendChild(rect);
    }

    const text = document.createElementNS(svgns, "text");
    text.setAttribute("x", String(index * step + step / 2));
    text.setAttribute("y", String(height + 14));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", "10");
    text.setAttribute("opacity", "0.7");
    text.textContent =
      point.label.length > 12 ? `${point.label.slice(0, 11)}…` : point.label;
    svg.appendChild(text);
  });

  return el("div.report-chart-wrap", svg, el("p.muted", `${y} by ${x}`));
}

/** The answer to one question, rendered into `panel`. */
async function runReport(panel, name) {
  mount(panel, spinner("Running"));

  let result;
  try {
    result = await api.get(`/reports/${encodeURIComponent(name)}/run`);
  } catch (error) {
    // The query came out of the model, so the message names the report and
    // quotes the database — see reports.routes.js. Show it rather than "failed".
    return void mount(
      panel,
      empty("This report did not run", error.message || String(error))
    );
  }

  const parts = [el("h2", result.report.title)];
  if (result.report.help) parts.push(el("p.muted", result.report.help));

  const drawn = chart(result);
  if (drawn) parts.push(drawn);

  parts.push(
    el(
      "p.muted",
      `${result.rowCount} row${result.rowCount === 1 ? "" : "s"} in ${result.durationMs}ms` +
        (result.truncated ? " — capped; the report returns more" : "")
    )
  );

  if (result.rowCount === 0) {
    parts.push(
      el("p.muted", "No rows. The question is valid; nothing in the database answers it yet.")
    );
  } else {
    parts.push(
      el(
        "div.table-wrap",
        el(
          "table",
          el("thead", el("tr", ...result.columns.map((column) => el("th", column)))),
          el(
            "tbody",
            ...result.rows.map((row) =>
              el("tr", ...result.columns.map((column) => el("td", cell(row[column]))))
            )
          )
        )
      )
    );
  }

  parts.push(
    el(
      "button.btn",
      {
        onclick: () => {
          runReport(panel, name);
          toast("Re-running", "info");
        },
      },
      "Run again"
    )
  );

  mount(panel, ...parts);
}

export async function reportsView(root) {
  mount(root, spinner("Loading reports"));
  setHelp(
    "Each of these is a question the model's author wrote into the document with %%report, " +
      "together with the query that answers it. They run against this application's own " +
      "database, so the answers change as you use it."
  );

  const reports = await api.get("/reports");

  if (reports.length === 0) {
    return void mount(
      root,
      empty(
        "This model declares no reports",
        "Add a %%report directive to the model — a title, the entity it is about, and the SQL that answers it — and regenerate."
      )
    );
  }

  // Grouped by the entity each is about. The ones that name no entity are
  // cross-cutting rather than unclassified, so they get their own heading at
  // the end instead of being dropped in with the first group.
  const groups = new Map();
  for (const report of reports) {
    const key = report.entity || "Across the application";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(report);
  }

  const panel = el("div.report-panel", empty("Choose a question", "Pick one on the left to run it."));

  const list = el(
    "nav.report-list",
    ...[...groups.entries()].map(([group, items]) =>
      el(
        "section",
        el("h3", group),
        el(
          "ul",
          ...items.map((report) =>
            el(
              "li",
              el(
                "button.link",
                {
                  onclick: (event) => {
                    for (const active of list.querySelectorAll(".is-active")) {
                      active.classList.remove("is-active");
                    }
                    event.currentTarget.classList.add("is-active");
                    runReport(panel, report.name);
                  },
                },
                report.title
              )
            )
          )
        )
      )
    )
  );

  mount(root, el("div.report-layout", list, panel));
}
