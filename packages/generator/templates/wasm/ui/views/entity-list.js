/**
 * One entity's window: the record panel, then the grid.
 *
 * The two are one screen rather than two routes because that is how the React
 * application arranges them — you open a record and the list stays underneath,
 * so the row you came from is still in view. It also means the grid does not
 * have to be re-fetched when a save succeeds; the panel hands back the saved
 * record and the row is replaced in place.
 *
 * Which columns appear, in what order and under what label is a dictionary
 * query, so hiding a column is a row change rather than a regeneration. The
 * metadata is cached for the session — it is the same answer for every page of
 * every grid, and re-asking on each navigation showed as a flash of empty table.
 */

import { el, mount, spinner, empty, displayValue, toast } from "../dom.js";
import { api, queryString } from "../api.js";
import { setActions, setHelp } from "../main.js";
import { recordPanel } from "./entity-form.js";

const gridCache = new Map();

async function gridFields(route) {
  if (!gridCache.has(route)) gridCache.set(route, await api.get(`/bus/${route}/fields/grid`));
  return gridCache.get(route);
}

export async function entityListView(root, { entity, recordId, navigate }) {
  const params = new URLSearchParams((window.location.hash.split("?")[1] ?? ""));
  const state = {
    page: 1,
    limit: 25,
    search: params.get("q") ?? "",
    sort: null,
    order: "desc",
  };

  setHelp(
    `${entity.displayName} is stored in ${entity.tableName}. The columns below, and the fields on ` +
      `the form, come from the Application Dictionary — change a row there and this screen changes.`
  );

  const panelSlot = el("div");
  const listSlot = el("div");
  const searchInput = el("input", {
    type: "search",
    placeholder: "Search...",
    value: state.search,
    "aria-label": `Search ${entity.displayName}`,
    oninput: debounce(() => {
      state.search = searchInput.value.trim();
      state.page = 1;
      renderList();
    }, 250),
  });

  mount(root, panelSlot, listSlot);

  const openRecord = async (id) => {
    if (!id) {
      mount(panelSlot);
      setActions({ onNew: () => openRecord("new"), newLabel: entity.singularName, onSearch: focusSearch });
      return;
    }
    await recordPanel(panelSlot, {
      entity,
      id,
      onClose: () => {
        navigate(`/entity/${entity.routeName}`);
      },
      onSaved: async () => {
        await renderList();
      },
      navigate,
    });
  };

  const focusSearch = () => {
    searchInput.focus();
    searchInput.select();
  };

  async function renderList() {
    mount(listSlot, spinner(`Loading ${entity.displayName}`));
    try {
      const [fields, page] = await Promise.all([
        gridFields(entity.routeName),
        api.get(
          `/bus/${entity.routeName}${queryString({
            page: state.page,
            limit: state.limit,
            search: state.search,
            sort: state.sort,
            order: state.order,
          })}`
        ),
      ]);

      const bar = el(
        "div.listbar",
        el("div.listbar__search", searchInput),
        el(
          "span.listbar__count",
          page.total === 0
            ? "No entries"
            : `Showing ${(page.page - 1) * page.limit + 1} to ` +
              `${Math.min(page.page * page.limit, page.total)} of ${page.total} entries`
        )
      );

      if (!page.data.length) {
        mount(
          listSlot,
          bar,
          empty(
            state.search ? "Nothing matched that search" : `No ${entity.displayName} records yet`,
            state.search
              ? "Clear the search to see every record."
              : `Use “New ${entity.singularName}” above to add the first one.`
          )
        );
        return;
      }

      const columns = fields.length
        ? fields
        : entity.attributes
            .slice(0, 6)
            .map((attribute) => ({ column_name: attribute.columnName, name: attribute.displayName }));

      mount(
        listSlot,
        bar,
        el(
          "div.table-wrap",
          el(
            "table.table",
            el(
              "thead",
              el(
                "tr",
                columns.map((column) =>
                  el(
                    "th",
                    {
                      class: state.sort === column.column_name ? "is-sorted" : "",
                      title: `Sort by ${column.name}`,
                      onclick: () => {
                        state.order =
                          state.sort === column.column_name && state.order === "asc" ? "desc" : "asc";
                        state.sort = column.column_name;
                        renderList();
                      },
                    },
                    column.name,
                    el("span.sort", state.sort === column.column_name ? (state.order === "asc" ? "↑" : "↓") : "⇅")
                  )
                )
              )
            ),
            el(
              "tbody",
              page.data.map((row) =>
                el(
                  "tr.table__row",
                  { onclick: () => navigate(`/entity/${entity.routeName}/${row.id}`) },
                  columns.map((column) => {
                    /* A reference cell shows the parent record's name, resolved
                       by the server for the ids on this page. The uuid stays in
                       `row` — the click above navigates by it — but nobody has
                       to read it. */
                    const label = page.labels?.[column.column_name]?.[row[column.column_name]];
                    return el(
                      "td",
                      label === undefined
                        ? displayValue(row[column.column_name], column)
                        : el("span.cell--ref", { title: row[column.column_name] }, label)
                    );
                  })
                )
              )
            )
          )
        ),
        page.totalPages > 1 ? pager(page, state, renderList) : null
      );
    } catch (error) {
      mount(listSlot, empty("Could not load these records", error.message));
      if (error.status !== 403) toast(error.message, "error");
    }
  }

  setActions({ onNew: () => navigate(`/entity/${entity.routeName}/new`), newLabel: entity.singularName, onSearch: focusSearch });

  await Promise.all([openRecord(recordId), renderList()]);
}

function pager(page, state, render) {
  return el(
    "div.pager",
    el("span.pager__page", `Page ${page.page} of ${page.totalPages}`),
    el(
      "div.pager__controls",
      el(
        "button.btn",
        { disabled: page.page <= 1, onclick: () => { state.page -= 1; render(); } },
        "← Previous"
      ),
      el(
        "button.btn",
        { disabled: page.page >= page.totalPages, onclick: () => { state.page += 1; render(); } },
        "Next →"
      )
    )
  );
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
