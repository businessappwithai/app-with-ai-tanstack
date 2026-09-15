/**
 * The reporting application — its own shell, inside the same tab.
 *
 * Two applications are generated from one model and this is the second of
 * them. Deployed, it is the Enterprise Reporting platform: a separate service,
 * a separate database (`enterprise_config`), a separate user table, reached at
 * `/report` behind the same proxy. A browser tab cannot run a second server, so
 * here it is a second shell over the same runtime — and everything a reader
 * meets is still separate: its own sign-in, its own accounts, its own roles,
 * and reports scoped to what each role may read.
 *
 * What it deliberately does not pretend to be: there is no SQL editor, no
 * report designer, no natural-language query and no scheduled delivery. Those
 * need the platform's servers. A read-only mirror of what the platform would
 * hold is worth more than buttons that answer "not in the browser build".
 */

import { el, empty, mount, spinner, toast } from "../dom.js";
import { reportApi, setReportToken } from "../api.js";
import { reportLoginView } from "./report-login.js";

const state = {
  user: null,
  overview: null,
  /** Which section is showing: dashboard | reports | charts | queries | access. */
  section: "dashboard",
};

/**
 * Repaint the shell.
 *
 * Held here rather than threaded through every screen: the shell is a single
 * function and the screens below it only ever want "show the section I just
 * set". Assigned by `reportAppView`, which is the only thing that can build it.
 */
let rerender = async () => {};

/** Render one SQL scalar as a cell. */
function cell(value) {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * A chart, as SVG, from the rows the query already returned.
 *
 * No charting library, for the same reason the application's own reports screen
 * has none: this runtime has no build step and no dependencies, and the drawing
 * is two column names the pack chose plotted against each other. `pie` and
 * `area` render as bars rather than as nothing — the shape is a presentation
 * preference and refusing to draw would lose the answer.
 */
function chartSvg(kind, xField, yField, rows) {
  const points = rows
    .map((row) => ({ label: cell(row[xField]), value: Number(row[yField]) }))
    .filter((point) => Number.isFinite(point.value))
    .slice(0, 30);
  if (points.length === 0) return null;

  const max = Math.max(...points.map((point) => point.value), 0) || 1;
  const width = 700;
  const height = 200;
  const step = width / points.length;
  const svgns = "http://www.w3.org/2000/svg";

  const svg = document.createElementNS(svgns, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height + 34}`);
  svg.setAttribute("class", "report-chart");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${yField} by ${xField}`);

  if (kind === "line") {
    const line = document.createElementNS(svgns, "polyline");
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", "currentColor");
    line.setAttribute("stroke-width", "2");
    line.setAttribute(
      "points",
      points
        .map((p, i) => `${i * step + step / 2},${height - (p.value / max) * (height - 16)}`)
        .join(" ")
    );
    svg.appendChild(line);
  } else {
    points.forEach((point, index) => {
      const barHeight = (point.value / max) * (height - 16);
      const rect = document.createElementNS(svgns, "rect");
      rect.setAttribute("x", String(index * step + step * 0.15));
      rect.setAttribute("y", String(height - barHeight));
      rect.setAttribute("width", String(step * 0.7));
      rect.setAttribute("height", String(barHeight));
      rect.setAttribute("fill", "currentColor");
      svg.appendChild(rect);
    });
  }

  points.forEach((point, index) => {
    const text = document.createElementNS(svgns, "text");
    text.setAttribute("x", String(index * step + step / 2));
    text.setAttribute("y", String(height + 14));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", "10");
    text.setAttribute("opacity", "0.7");
    text.textContent = point.label.length > 12 ? `${point.label.slice(0, 11)}…` : point.label;
    svg.appendChild(text);
  });

  return svg;
}

/** Run one definition and render the answer into `panel`. */
async function run(panel, kind, item) {
  mount(panel, spinner("Running"));

  let result;
  try {
    result = await reportApi.get(
      `/reporting/${kind}/${encodeURIComponent(item.key)}/run`
    );
  } catch (error) {
    /* A 403 here is the reporting role working, not a failure, and it names the
       table it refused — so it is shown as the answer rather than as an error
       the reader is meant to do something about. */
    return void mount(
      panel,
      empty(
        error.status === 403 ? "This role may not read that" : "This report did not run",
        error.message || String(error)
      )
    );
  }

  const parts = [el("h2", item.name)];
  if (item.description) parts.push(el("p.muted", item.description));

  if (kind === "charts") {
    const svg = chartSvg(item.chartType, item.xField, item.yField, result.rows);
    if (svg) parts.push(el("div.report-chart-wrap", svg, el("p.muted", `${item.yField} by ${item.xField}`)));
  }

  parts.push(
    el(
      "p.muted",
      `${result.rowCount} row${result.rowCount === 1 ? "" : "s"} in ${result.durationMs}ms` +
        (result.truncated ? " — capped; the query returns more" : "")
    )
  );

  if (result.rowCount === 0) {
    parts.push(
      el("p.muted", "No rows. The query is valid; nothing in the application's data answers it yet.")
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

  /* Where the number came from. A reporting user's next question about any
     figure is always this one, and the platform answers it with the saved query
     the report is built on. The SQL itself is not in this response — `/run`
     returns the definition without it, so that a client cannot become the place
     a query is read from — and **Saved queries** is the screen that has it. */
  parts.push(
    el(
      "details.report-sql",
      el("summary", `Saved query — ${result.query.name}`),
      el("p.muted", result.query.description),
      el("p.muted", `Reads ${result.query.tables.join(", ") || "no business table"}.`),
      el(
        "button.link",
        {
          onclick: async () => {
            state.section = "queries";
            await rerender();
          },
        },
        "See its SQL under Saved queries"
      )
    )
  );

  parts.push(
    el(
      "button.btn",
      {
        onclick: () => {
          run(panel, kind, item);
          toast("Re-running", "info");
        },
      },
      "Run again"
    )
  );

  mount(panel, ...parts);
}

/** A list of definitions on the left, the answer on the right. */
function browser(items, kind, emptyTitle, emptyDetail) {
  if (items.length === 0) return empty(emptyTitle, emptyDetail);

  // Grouped by the table the query reads, because that is what a reporting
  // role is a statement about — and on a scoped role it is the grouping that
  // shows which half of the application it has.
  const groups = new Map();
  for (const item of items) {
    const key = (item.tables || [])[0] || "Across the application";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const panel = el(
    "div.report-panel",
    empty("Choose one", "Pick a definition on the left to run it against the application's data.")
  );

  const list = el(
    "nav.report-list",
    ...[...groups.entries()].map(([group, groupItems]) =>
      el(
        "section",
        el("h3", group),
        el(
          "ul",
          ...groupItems.map((item) =>
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
                    run(panel, kind, item);
                  },
                },
                item.name
              )
            )
          )
        )
      )
    )
  );

  return el("div.report-layout", list, panel);
}

async function dashboardSection(outlet) {
  mount(outlet, spinner("Loading the dashboard"));
  const [dashboards, charts] = await Promise.all([
    reportApi.get("/reporting/dashboards"),
    reportApi.get("/reporting/charts"),
  ]);

  const byKey = new Map(charts.map((chart) => [chart.key, chart]));
  const parts = [];

  for (const dashboard of dashboards) {
    parts.push(el("h2", dashboard.name));
    if (dashboard.description) parts.push(el("p.muted", dashboard.description));
    if (dashboard.hiddenWidgets > 0) {
      /* Said rather than left as a gap: a role that may not read a table gets a
         shorter dashboard, and a shorter dashboard with no explanation looks
         like a build that half-worked. */
      parts.push(
        el(
          "p.muted",
          `${dashboard.hiddenWidgets} tile${dashboard.hiddenWidgets === 1 ? "" : "s"} hidden — ` +
            `${state.user.role ?? "this role"} may not read the tables behind them.`
        )
      );
    }

    if (dashboard.widgets.length === 0) {
      parts.push(empty("Nothing on this dashboard", "Every tile reads a table this role may not."));
      continue;
    }

    const tiles = [];
    for (const widget of dashboard.widgets) {
      const chart = widget.chartKey ? byKey.get(widget.chartKey) : null;
      const tile = el("div.report-tile", el("h3", widget.title), spinner("Loading"));
      tiles.push(tile);
      if (!chart) continue;

      /* Each tile runs its own query. Sequential rather than parallel would be
         tidier to read and slower to watch: six queries against a database in
         this tab finish in well under a second each, and the reader sees the
         grid fill in. */
      reportApi
        .get(`/reporting/charts/${encodeURIComponent(chart.key)}/run`)
        .then((result) => {
          const svg = chartSvg(chart.chartType, chart.xField, chart.yField, result.rows);
          mount(
            tile,
            el("h3", widget.title),
            svg ?? el("p.muted", "No rows yet."),
            el("p.muted", `${result.rowCount} row${result.rowCount === 1 ? "" : "s"}`)
          );
        })
        .catch((error) => {
          mount(tile, el("h3", widget.title), el("p.muted", error.message || String(error)));
        });
    }
    parts.push(el("div.report-grid", ...tiles));
  }

  mount(outlet, ...parts);
}

async function accessSection(outlet) {
  const role = state.overview.role;
  const tables = role.tables;

  mount(
    outlet,
    el("h2", "What this reporting role may read"),
    el(
      "p.muted",
      tables === null
        ? `${role.name ?? "This role"} reads every table of the attached application — all ${role.tableTotal}.`
        : `${role.name ?? "This role"} reads ${tables.length} of the application's ${role.tableTotal} tables. ` +
            "A report whose query names any other table is not offered, and is refused if asked for."
    ),
    el(
      "p.muted",
      "This role mirrors a %%rbac role in the model, and only its read rules: the directive also " +
        "restricts create, update and delete, and none of that means anything to somebody who " +
        "cannot write through the reporting application at all."
    ),
    tables === null
      ? null
      : el("ul.report-tables", ...tables.map((table) => el("li", el("code", table)))),
    el("h3", "This is a mirror, not a shared system"),
    el(
      "p.muted",
      "The application and the reporting application keep their own accounts, and neither " +
        "password works on the other side. Deployed, they are two services with two databases; " +
        "the role names line up so an administrator can see which is which, and nothing else is shared."
    )
  );
}

async function queriesSection(outlet) {
  mount(outlet, spinner("Loading the saved queries"));
  const queries = await reportApi.get("/reporting/queries");
  mount(
    outlet,
    el("h2", `${queries.length} saved quer${queries.length === 1 ? "y" : "ies"}`),
    el(
      "p.muted",
      "Every report and chart is a definition over one of these. Only the queries this role may " +
        "run are listed."
    ),
    ...queries.map((query) =>
      el(
        "details.report-sql",
        el("summary", query.name),
        el("p.muted", query.description),
        el("p.muted", `Reads ${query.tables.join(", ") || "no business table"}.`),
        el("pre", el("code", query.sql))
      )
    )
  );
}

/**
 * The reporting application's shell.
 *
 * `onLeave` goes back to the application it reports on. It is a link rather
 * than a shared header because the two are not one product with two tabs: a
 * reader leaving here keeps their reporting session, and arriving at the
 * application still has to be signed into *that*.
 */
export async function reportAppView(root, { project, onLeave }) {
  const render = async () => {
    if (!state.user) {
      await reportLoginView(root, {
        project,
        onLeave,
        onSignedIn: async (user) => {
          state.user = user;
          state.overview = null;
          await render();
        },
      });
      return;
    }

    if (!state.overview) {
      mount(root, spinner("Loading the reporting layer"));
      state.overview = await reportApi.get("/reporting");
    }

    const outlet = el("main.outlet");
    const sections = [
      ["dashboard", "Dashboard"],
      ["reports", `Reports (${state.overview.counts.reports})`],
      ["charts", `Charts (${state.overview.counts.charts})`],
      ["queries", "Saved queries"],
      ["access", "Access"],
    ];

    mount(
      root,
      el(
        "div.shell.shell--report",
        el(
          "header.masthead.masthead--report",
          el("span.masthead__badge", "Enterprise Reporting"),
          el("span.masthead__name", state.overview.application?.name ?? project.name),
          el("div.masthead__spacer"),
          el(
            "div.masthead__user",
            el("span.avatar.avatar--report", "ER"),
            el(
              "div",
              el("div.masthead__who", state.user.email),
              el(
                "div.masthead__roles",
                state.user.role
                  ? state.overview.role.tables === null
                    ? `${state.user.role} — every table`
                    : `${state.user.role} — ${state.overview.role.tables.length} of ${state.overview.role.tableTotal} tables`
                  : "no reporting role"
              )
            ),
            el(
              "button.btn.btn--ghost.btn--icon",
              {
                title: "Sign out of reporting",
                "aria-label": "Sign out of reporting",
                onclick: async () => {
                  await reportApi.post("/report-auth/logout").catch(() => {});
                  setReportToken(null);
                  state.user = null;
                  state.overview = null;
                  await render();
                },
              },
              "⇥"
            )
          )
        ),
        el(
          "div.actionbar",
          ...sections.map(([key, label]) =>
            el(
              "button.btn",
              {
                class: state.section === key ? "is-active" : "",
                onclick: async () => {
                  state.section = key;
                  await render();
                },
              },
              label
            )
          ),
          el("div.actionbar__spacer"),
          el(
            "button.btn.btn--ghost",
            { onclick: () => onLeave() },
            `← ${project.name}`
          )
        ),
        el(
          "nav.crumbs",
          el(
            "span.crumbs__current",
            `Reporting on ${state.overview.dataSource?.name ?? project.name}`
          ),
          state.overview.counts.reports < state.overview.counts.reportsTotal
            ? el(
                "span.crumbs__note",
                ` · ${state.overview.counts.reports} of ${state.overview.counts.reportsTotal} reports visible to this role`
              )
            : null
        ),
        outlet
      )
    );

    try {
      if (state.section === "dashboard") await dashboardSection(outlet);
      else if (state.section === "access") await accessSection(outlet);
      else if (state.section === "queries") await queriesSection(outlet);
      else {
        mount(outlet, spinner("Loading"));
        const items = await reportApi.get(`/reporting/${state.section}`);
        mount(
          outlet,
          browser(
            items,
            state.section,
            `No ${state.section} for this role`,
            "Every definition reads a table this reporting role may not."
          )
        );
      }
    } catch (error) {
      mount(outlet, empty("Something went wrong", error.message || String(error)));
    }
  };

  rerender = render;

  /* Reattach to a session the reader already has: they may have signed in,
     gone back to the application and returned, and being asked for a password
     again on the way back is the kind of friction that makes the two
     applications feel like one broken one. */
  if (!state.user) {
    try {
      state.user = await reportApi.get("/report-auth/me");
    } catch {
      state.user = null;
    }
  }

  await render();
}

/** Forget the reporting session in memory, without ending it on the server. */
export function resetReportView() {
  state.overview = null;
}

/**
 * A reporting call came back 401. Was there a session to lose?
 *
 * Asked here because only this module knows. The shell probes
 * `/report-auth/me` on every entry to find out whether the reader is already
 * signed in, and a "no" to that probe is an ordinary 401 — not an expired
 * session. Treating the two alike produced a toast per probe *and* a repaint
 * per toast, and the repaint probed again: a reporting sign-in screen buried
 * under an endless column of "your reporting session ended".
 *
 * Returns true only when a session really ended, which is the only case worth
 * telling the reader about.
 */
export function reportSessionEnded() {
  if (!state.user) return false;
  state.user = null;
  state.overview = null;
  return true;
}
