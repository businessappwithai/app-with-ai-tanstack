/**
 * The dashboard — entities grouped by the categories the model declared.
 *
 * The arrangement mirrors the React application's: a coloured monospace heading
 * per category with its count, the category's own description underneath, then
 * a grid of cards reading "Manage X records". The Application Dictionary is the
 * last group, listed like any other, because from the reader's point of view it
 * is another set of windows.
 *
 * Record counts come from one endpoint rather than one request per entity — a
 * model with forty entities would otherwise open with forty round trips through
 * the Service Worker before showing anything.
 */

import { el, mount, spinner } from "../dom.js";
import { api } from "../api.js";
import { setHelp } from "../main.js";

/** The administrative windows every generated application has. */
const DICTIONARY = [
  ["Audit Log", "audit", "Every write and sign-in", "▤"],
  ["Business Rules", "rules", "What the model decides", "◇"],
  ["Processes", "processes", "State machines and sagas", "⇄"],
  ["Table and Column", "dictionary", "The Application Dictionary", "▦"],
  ["The Model", "model", "The EML this was built from", "◈"],
];

export async function dashboardView(root, { entities, navigate, project }) {
  mount(root, spinner("Loading"));
  setHelp(
    "Each card opens a window onto one entity. What the window shows — which columns, " +
      "in what order, under what labels — comes from the Application Dictionary, so it can be " +
      "changed without regenerating the application."
  );

  const [summary, health] = await Promise.all([
    api.get("/sys/model-summary"),
    api.get("/health").catch(() => null),
  ]);

  const byCategory = new Map();
  for (const entity of entities) {
    const key = entity.category || "General";
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push(entity);
  }

  const descriptions = new Map(
    (summary.model?.categories ?? []).map((category) => [category.name, category.description])
  );

  mount(
    root,
    el(
      "div",
      [...byCategory.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, group]) =>
          el(
            "section.category",
            el(
              "div.category__head",
              el("span.category__name", category),
              el("span.category__count", `(${group.length})`)
            ),
            el("p.category__desc", descriptions.get(category) || `${group.length} entities in this group`),
            el(
              "div.cards",
              group.map((entity) =>
                el(
                  "button.card",
                  { onclick: () => navigate(`/entity/${entity.routeName}`) },
                  el(
                    "div.card__top",
                    el("span.card__icon", "▤"),
                    el("span.card__name", entity.displayName)
                  ),
                  el("span.card__arrow", "→"),
                  el(
                    "p.card__sub",
                    `Manage ${entity.displayName} records · `,
                    el("span.card__count", `${summary.records[entity.name] ?? 0}`)
                  )
                )
              )
            )
          )
        ),

      el(
        "section.category",
        el(
          "div.category__head",
          el("span.category__name", "Application Dictionary"),
          el("span.category__count", `(${DICTIONARY.length})`)
        ),
        el(
          "p.category__desc",
          "The metadata every screen above is drawn from, and the record of what the application did"
        ),
        el(
          "div.cards",
          DICTIONARY.map(([name, route, description, icon]) =>
            el(
              "button.card",
              { onclick: () => navigate(`/${route}`) },
              el("div.card__top", el("span.card__icon", icon), el("span.card__name", name)),
              el("span.card__arrow", "→"),
              el("p.card__sub", description)
            )
          )
        )
      ),

      health
        ? el(
            "p.runtime-note",
            `${summary.counts.entities} entities · ${summary.counts.rules} rules · `,
            `${summary.counts.workflows + summary.counts.sagas} processes · `,
            `${Object.values(summary.records).reduce((total, value) => total + (Number(value) || 0), 0)} records`,
            el("span.runtime-note__db", `${health.runtime} — ${String(health.database).split(",")[0]}`)
          )
        : null
    )
  );
}
