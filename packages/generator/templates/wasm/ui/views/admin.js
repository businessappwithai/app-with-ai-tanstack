/**
 * The administrative screens: dictionary, rules, processes, audit, model.
 *
 * They are grouped in one module because they share a shape — read something
 * the generator seeded, show it next to what the running database now says
 * about it — and because separating five read-only tables into five files would
 * be filing, not structure.
 *
 * The rules screen earns its place. A rule compiled from a flowchart has prose
 * decisions, and the engine's reading of them is a guess that can be wrong;
 * showing the expression each decision became, and marking the ones nothing
 * matched, is the difference between a rule you can trust and a rule that
 * returns "passed".
 */

import { el, mount, spinner, empty, displayValue, toast } from "../dom.js";
import { api } from "../api.js";
import { setHelp } from "../main.js";

export async function dictionaryView(root) {
  mount(root, spinner("Reading the dictionary"));
  const [tables, summary] = await Promise.all([api.get("/sys/tables"), api.get("/sys/model-summary")]);

  mount(
    root,
    panel(
      "Application Dictionary",
      "Every screen in this application is drawn from these rows. Change one and the screen changes.",
      el(
        "div",
        statRow([
          ["Entities", summary.counts.entities],
          ["Rules", summary.counts.rules],
          ["Processes", summary.counts.workflows + summary.counts.sagas],
          ["Hooks", summary.counts.hooks],
        ]),
        el(
          "div.table-wrap",
          el(
            "table.table",
            el(
              "thead",
              el(
                "tr",
                ["Table", "Name", "Category", "Window", "Records"].map((heading) => el("th", heading))
              )
            ),
            el(
              "tbody",
              tables.map((table) =>
                el(
                  "tr",
                  el("td", el("code", table.table_name)),
                  el("td", table.name),
                  el("td", table.category_name || "—"),
                  el("td", table.window_name || "—"),
                  el("td", displayValue(summary.records[entityFor(table.name, summary)] ?? "—"))
                )
              )
            )
          )
        )
      )
    )
  );
}

const entityFor = (name, summary) =>
  Object.keys(summary.records).find((key) => key.toLowerCase() === String(name).replace(/\s+/g, "").toLowerCase()) ??
  name;

export async function rulesView(root) {
  mount(root, spinner("Loading rules"));
  const rules = await api.get("/rules");

  if (!rules.length) {
    mount(root, panel("Business rules", "", empty("This model declares no rules", "Add a %%rule section to the EML and regenerate.")));
    return;
  }

  mount(
    root,
    panel(
      "Business rules",
      "Compiled from the model's %%rule sections into GoRules JDM, and evaluated here by the browser engine.",
      el(
        "div.cards",
        rules.map((rule) =>
          el(
            "article.rule",
            el(
              "header.rule__head",
              el("h3.rule__name", rule.name),
              el("span.badge", `${rule.entity_name} · ${rule.event}`)
            ),
            el(
              "p.rule__meta",
              `${rule.reading.shape === "decision-table" ? "Decision table" : "Decision graph"} · priority ${rule.priority}`
            ),
            rule.reading.decisions.length
              ? el(
                  "ul.decisions",
                  rule.reading.decisions.map((decision) =>
                    el(
                      `li.decision${decision.assumed ? ".decision--assumed" : ""}`,
                      el("span.decision__label", decision.label),
                      el(
                        "span.decision__reading",
                        decision.assumed ? `assumed true — ${decision.reason}` : decision.expression
                      )
                    )
                  )
                )
              : el("p.rule__meta", "No branching decisions."),
            el(
              "button.btn.btn--small",
              { onclick: () => tryRule(rule) },
              "Try this rule"
            )
          )
        )
      )
    )
  );
}

/** Evaluate a rule against a record the reader types, and show the trace. */
async function tryRule(rule) {
  const input = prompt(
    `Evaluate ${rule.name} against a record.\nJSON, e.g. {"status":"draft"}`,
    '{"status":"draft"}'
  );
  if (input == null) return;
  let data;
  try {
    data = JSON.parse(input);
  } catch {
    toast("That is not valid JSON", "error");
    return;
  }
  try {
    const result = await api.post("/rules/evaluate", {
      entity: rule.entity_name,
      operation: rule.operation,
      data,
    });
    const lines = [
      `${result.rulesEvaluated} rule(s) evaluated`,
      `${result.violations.length} refusal(s)`,
      ...result.violations.map((violation) => `  ✗ ${violation.message}`),
      ...Object.entries(result.mutations).map(([field, value]) => `  → sets ${field} = ${value}`),
      ...result.notifications.map((note) => `  ! ${note.message || note.action}`),
    ];
    toast(lines.join("\n"), result.violations.length ? "error" : "success");
  } catch (error) {
    toast(error.message, "error");
  }
}

export async function processesView(root) {
  mount(root, spinner("Loading processes"));
  const [definitions, runs] = await Promise.all([
    api.get("/workflows/definitions"),
    api.get("/workflows/runs?limit=25"),
  ]);

  mount(
    root,
    panel(
      "Processes",
      "State machines and sagas the model declared. A record moves through one by being updated — there is no side door.",
      el(
        "div",
        definitions.length
          ? el(
              "div.cards",
              definitions.map((definition) => {
                const parsed = typeof definition.definition === "string" ? JSON.parse(definition.definition) : definition.definition;
                return el(
                  "article.rule",
                  el(
                    "header.rule__head",
                    el("h3.rule__name", definition.name),
                    el("span.badge", `${definition.entity_name} · ${definition.kind}`)
                  ),
                  parsed.states
                    ? el(
                        "div.states",
                        parsed.states.map((state) =>
                          el(
                            `span.state${state === parsed.initial ? ".state--initial" : ""}`,
                            typeof state === "string" ? state : state.name
                          )
                        )
                      )
                    : null,
                  parsed.transitions
                    ? el(
                        "ul.transitions",
                        parsed.transitions.map((transition) =>
                          el("li", `${transition.from} → ${transition.to}`, transition.trigger ? el("span.badge.badge--soft", transition.trigger) : null)
                        )
                      )
                    : null,
                  parsed.steps
                    ? el("ol.transitions", parsed.steps.map((step) => el("li", `${step.name} (${step.type})`)))
                    : null
                );
              })
            )
          : empty("This model declares no processes"),
        el("h2.section-title", "Recent transitions"),
        runs.data.length
          ? el(
              "div.table-wrap",
              el(
                "table.table",
                el("thead", el("tr", ["When", "Process", "Entity", "From", "To", "Modelled"].map((h) => el("th", h)))),
                el(
                  "tbody",
                  runs.data.map((run) =>
                    el(
                      "tr",
                      el("td", displayValue(run.created_at)),
                      el("td", run.workflow_name),
                      el("td", run.entity_name),
                      el("td", run.from_state || "—"),
                      el("td", run.to_state),
                      el("td", run.status === "completed" ? "Yes" : "No")
                    )
                  )
                )
              )
            )
          : empty("Nothing has moved yet", "Change a record's status to see it here.")
      )
    )
  );
}

export async function auditView(root) {
  mount(root, spinner("Loading the audit trail"));
  try {
    const page = await api.get("/audit?limit=100");
    mount(
      root,
      panel(
        "Audit trail",
        "Every write and every sign-in, successful or not.",
        page.data.length
          ? el(
              "div.table-wrap",
              el(
                "table.table",
                el("thead", el("tr", ["When", "Who", "Action", "Entity", "Record", "OK"].map((h) => el("th", h)))),
                el(
                  "tbody",
                  page.data.map((entry) =>
                    el(
                      `tr${entry.success ? "" : ".table__row--bad"}`,
                      el("td", displayValue(entry.created_at)),
                      el("td", entry.user_email || "—"),
                      el("td", el("code", entry.action)),
                      el("td", entry.entity_type || "—"),
                      el("td", entry.entity_id ? el("code", String(entry.entity_id).slice(0, 8)) : "—"),
                      el("td", entry.success ? "✓" : "✗")
                    )
                  )
                )
              )
            )
          : empty("Nothing recorded yet")
      )
    );
  } catch (error) {
    mount(root, panel("Audit trail", "", empty("Not available", error.message)));
  }
}

export async function modelView(root) {
  mount(root, spinner("Loading the model"));
  // Through the client, not a bare fetch: the session is a bearer token the
  // client holds, so a direct fetch here would be the one unauthenticated
  // request in the application and would answer 401.
  const [model, source] = await Promise.all([
    api.get("/model"),
    api.get("/model/source").catch(() => ""),
  ]);

  mount(
    root,
    panel(
      "The model",
      "The EML this application was compiled from. It ships inside the app so the app can describe itself.",
      el(
        "div",
        statRow([
          ["Entities", model.entities.length],
          ["Relationships", model.relationships.length],
          ["Rules", model.rules.length],
          ["Processes", model.workflows.length + (model.sagas || []).length],
          ["Hooks", model.hooks.length],
          ["Access rules", model.rbac.operations.length + model.rbac.transitions.length],
        ]),
        model.rbac.operations.length || model.rbac.transitions.length
          ? el(
              "div",
              el("h2.section-title", "Access control"),
              el(
                "ul.plain-list",
                model.rbac.operations.map((rule) =>
                  el("li", el("code", `${rule.entity}.${rule.operation}`), ` restricted to ${rule.roles.join(" or ")}`)
                ),
                model.rbac.transitions.map((rule) =>
                  el("li", el("code", `${rule.entity}.${rule.transition}`), ` (transition) restricted to ${rule.roles.join(" or ")}`)
                )
              )
            )
          : null,
        el("h2.section-title", "Source"),
        el("pre.source", el("code", source || "— not shipped with this application —"))
      )
    )
  );
}

/** Every administrative screen has the same shape: a title, a lede, a body. */
function panel(title, subtitle, body) {
  if (subtitle) setHelp(subtitle);
  return el("section", el("h2.section-title", title), subtitle ? el("p.lede", subtitle) : null, body);
}

function statRow(entries) {
  return el(
    "div.stats",
    entries.map(([label, value]) => el("div.stat", el("span.stat__value", String(value)), el("span.stat__label", label)))
  );
}
