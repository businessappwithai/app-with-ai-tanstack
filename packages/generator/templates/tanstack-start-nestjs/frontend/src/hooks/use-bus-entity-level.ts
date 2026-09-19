import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { ADChildTabConfig, ADLevel } from "@/components/admin/ad-window-configs";
import type { FieldMetadata } from "@/hooks/use-entities";
import type { ColumnMetadata, SysTab } from "@/hooks/use-field-metadata";
import { useElectric } from "@/providers/electric-provider";
import { getSysCollections, useCollectionRows } from "@/lib/sys-collections";
import { apiClient } from "@/lib/api-client";

interface BusWindowMeta {
  sys_window_id: string;
  name: string;
  description?: string;
}

interface BusTableMeta {
  sys_table_id: string;
  table_name: string;
  name: string;
}

interface WindowMeta {
  label: string;
  windowId?: string;
  windowSlug: string;
}

/**
 * Resolve which window presents an entity, from the window and table lists.
 *
 * Shared by both paths below so the local and HTTP answers cannot drift: only
 * where the two lists come from differs.
 */
function resolveWindowMeta(
  entityName: string,
  windows: BusWindowMeta[],
  tables: BusTableMeta[]
): WindowMeta {
  // Support both simple (account→bus_account) and kebab-case slugs (sales-order→bus_sales_order)
  const tableNameCandidates = [`bus_${entityName}`, `bus_${entityName.replace(/-/g, "_")}`];
  const table = tables.find((t) => tableNameCandidates.includes(t.table_name));
  const windowName = table?.name ?? entityName;
  // Match window by display name or by slug derived from window name
  const win = windows.find(
    (w) =>
      w.name.toLowerCase() === windowName.toLowerCase() ||
      w.name.toLowerCase().replace(/\s+/g, "-") === entityName
  );
  return {
    label: win?.name ?? table?.name ?? entityName,
    windowId: win?.sys_window_id,
    windowSlug: win?.name.toLowerCase().replace(/\s+/g, "-") ?? entityName,
  };
}

/** One line item of the entity being shown: the table it lives in, and the column it links on. */
export interface ChildTabMeta {
  /** The child entity's slug — `invoice_line` for `bus_invoice_line`. */
  entity: string;
  label: string;
  /** The child's own foreign key back to this record. */
  parentField: string;
  seqNo: number;
}

/**
 * The tab rows that hold an entity's line items.
 *
 * `%%entity <Child> parent: <Parent>` is the only place a model can say that an
 * entity has no life away from its owner, and the dictionary is where that
 * survives: the child gets no window of its own, its tab is created inside the
 * parent's at `tab_level` 1, and `sys_tab.link_column_id` names the child's own
 * foreign key back. Everything below reads those rows and nothing else — a
 * screen that decided for itself which entities were line items would be a
 * second opinion on a question the model has already answered.
 */
function childTabRows(entityName: string, tables: BusTableMeta[], tabs: SysTab[]): SysTab[] {
  const tableNameCandidates = [`bus_${entityName}`, `bus_${entityName.replace(/-/g, "_")}`];
  const table = tables.find((t) => tableNameCandidates.includes(t.table_name));
  if (!table) return [];

  const ownTab = tabs.find(
    (t) => t.sys_table_id === table.sys_table_id && (t.tab_level ?? 0) === 0
  );
  if (!ownTab) return [];

  return tabs
    .filter((t) => t.sys_window_id === ownTab.sys_window_id && (t.tab_level ?? 0) > 0)
    .sort((a, b) => Number(a.seq_no ?? 0) - Number(b.seq_no ?? 0));
}

/**
 * Those rows resolved to what a tab needs: the child's entity slug, its label,
 * and the column the detail list filters on.
 *
 * A child tab with no `link_column_id` is dropped rather than shown unfiltered —
 * a list that ignores the record you opened is worse than no list at all.
 */
function resolveChildTabs(
  entityName: string,
  tables: BusTableMeta[],
  tabs: SysTab[],
  columns: ColumnMetadata[]
): ChildTabMeta[] {
  const tableById = new Map(tables.map((t) => [t.sys_table_id, t]));
  const columnById = new Map(columns.map((c) => [c.sys_column_id, c]));

  return childTabRows(entityName, tables, tabs)
    .map((tab) => {
      const childTable = tableById.get(tab.sys_table_id);
      const linkColumn = tab.link_column_id ? columnById.get(tab.link_column_id) : undefined;
      if (!childTable || !linkColumn) return null;
      return {
        entity: childTable.table_name.replace(/^bus_/, ""),
        label: childTable.name || tab.name || childTable.table_name,
        parentField: linkColumn.column_name,
        seqNo: Number(tab.seq_no ?? 0),
      } satisfies ChildTabMeta;
    })
    .filter((child): child is ChildTabMeta => child !== null);
}

/**
 * The column a record is called by, from the dictionary's own identifier marks.
 *
 * This picks one column because it is used where a single field is wanted; the
 * first identifier is the right one (`first_name` before `last_name`), and the
 * fallbacks cover a table the dictionary marked none on.
 *
 * A reference identifier is skipped: on a join entity the identifiers are the
 * foreign keys to the records it joins, and those hold uuids. Displaying and
 * searching by one is worse than the fallback, which at least reads as words.
 *
 * Shared by the entity being shown and by each of its line items, so a child
 * named in a tab reads the same way it does anywhere else.
 */
/** One shared empty array: a fresh `[]` each render would defeat every memo below. */
const EMPTY_COLUMNS: ColumnMetadata[] = [];

const NAME_FALLBACKS = ["name", "full_name", "title", "first_name", "code", "description", "type"];

function identifierColumn(fields: FieldMetadata[]): string {
  return (
    fields
      .filter((f) => f.is_identifier && !f.is_key && !f.ref_table_name)
      .sort((a, b) => Number(a.seq_no ?? 0) - Number(b.seq_no ?? 0))[0]?.column_name ??
    NAME_FALLBACKS.find((candidate) => fields.some((f) => f.column_name === candidate)) ??
    "name"
  );
}

/**
 * Builds an ADLevel entirely from Application Dictionary metadata. No field
 * lists or display names are hardcoded.
 *
 * The window and table lists come from the local dictionary collections once
 * they have synced. That matters more than it looks: this hook runs on every
 * business screen, and over HTTP it costs two 500-row fetches each time, before
 * anything can render. Locally it is a live query over rows already in memory,
 * and it recomputes only when the dictionary itself changes.
 *
 * The field lists stay on the API. `/bus/:entity/fields/*` is not a plain
 * dictionary read — it resolves reference targets and their label fields across
 * other entities — and reimplementing that here would risk answering differently
 * from the server for the same entity.
 *
 * entityName: the bus_ entity name without prefix, e.g. 'account', 'contact'
 */
export function useBusEntityLevel(entityName: string) {
  const { isSynced } = useElectric();
  const collections = getSysCollections();
  const local = isSynced && !!collections;

  const localWindows = useCollectionRows<BusWindowMeta>(collections?.windows);
  const localTables = useCollectionRows<BusTableMeta>(collections?.tables);
  const localTabs = useCollectionRows<SysTab>(collections?.tabs);
  const localColumns = useCollectionRows<ColumnMetadata>(collections?.columns);

  /*
   * The dictionary lists, when they have to come over HTTP.
   *
   * One query per list, keyed by the list rather than by the entity — which is
   * the whole point. These used to be fetched inside two entity-keyed queries
   * that each needed `sys_table`, so React Query, which caches by key, had no
   * way to know they were the same request: every entity page fetched
   * `/sys/tables?limit=500` twice, and the next entity page fetched it twice
   * again. Keyed by the list, the second reader is a cache hit and so is every
   * later screen, for the five minutes the rows stay fresh.
   *
   * All three are skipped entirely while the dictionary is local — the same
   * rows are already in memory.
   */
  const dictionaryLists = useQueries({
    queries: [
      {
        queryKey: ["sys-tables-all"],
        queryFn: async () =>
          (await apiClient.get<{ data: BusTableMeta[] }>("/sys/tables", { limit: 500 })).data,
        staleTime: 5 * 60 * 1000,
        enabled: !local,
      },
      {
        queryKey: ["sys-windows-all"],
        queryFn: async () =>
          (await apiClient.get<{ data: BusWindowMeta[] }>("/sys/windows", { limit: 500 })).data,
        staleTime: 5 * 60 * 1000,
        enabled: !local,
      },
      {
        queryKey: ["sys-tabs-all"],
        queryFn: async () =>
          (await apiClient.get<{ data: SysTab[] }>("/sys/tabs", { limit: 500 })).data,
        staleTime: 5 * 60 * 1000,
        enabled: !local,
      },
    ],
  });

  const [tablesQuery, windowsQuery, tabsQuery] = dictionaryLists;
  const httpTables: BusTableMeta[] = (tablesQuery?.data as BusTableMeta[] | undefined) ?? [];
  const httpWindows: BusWindowMeta[] = (windowsQuery?.data as BusWindowMeta[] | undefined) ?? [];
  const httpTabs: SysTab[] = (tabsQuery?.data as SysTab[] | undefined) ?? [];

  /*
   * Only the child tables' own columns are needed, and most entities have no
   * children at all — so this asks for nothing in the common case rather than
   * pulling the whole sys_column table on every record that is opened. Keyed by
   * the table ids, so two entities sharing a line-item table share the answer.
   */
  /*
   * Memoised, and not as a micro-optimisation.
   *
   * These joins used to sit inside a cached `queryFn`, so they ran once per
   * fetch. Moving the fetches out from under them left the joins in the render
   * body, where they re-scan up to 1000 dictionary rows on every render of a
   * hook that is mounted on every business screen — a rebuild of the arrays
   * below on each keystroke in a filter box. The array identity matters too:
   * `childTableIds` feeds a query key, and a fresh array each render makes
   * `.join(",")` recompute for nothing.
   */
  const childTableIds = useMemo(
    () =>
      local
        ? []
        : [
            ...new Set(childTabRows(entityName, httpTables, httpTabs).map((t) => t.sys_table_id)),
          ].sort(),
    [local, entityName, httpTables, httpTabs]
  );

  const childColumnsQuery = useQueries({
    queries: [
      {
        queryKey: ["sys-columns-for-tables", childTableIds.join(",")],
        queryFn: async () => {
          const pages = await Promise.all(
            childTableIds.map((tableId) =>
              apiClient.get<{ data: ColumnMetadata[] }>("/sys/columns", { tableId, limit: 200 })
            )
          );
          return pages.flatMap((page) => page.data);
        },
        staleTime: 5 * 60 * 1000,
        enabled: !local && childTableIds.length > 0,
      },
    ],
  })[0];

  const results = useQueries({
    queries: [
      {
        queryKey: ["bus-form-fields", entityName],
        queryFn: () => apiClient.get<FieldMetadata[]>(`/bus/${entityName}/fields/form`),
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ["bus-grid-fields", entityName],
        queryFn: () => apiClient.get<FieldMetadata[]>(`/bus/${entityName}/fields/grid`),
        staleTime: 5 * 60 * 1000,
      },
    ],
  });

  const [formQuery, gridQuery] = results;

  const httpChildColumns = (childColumnsQuery?.data as ColumnMetadata[] | undefined) ?? EMPTY_COLUMNS;

  const childMetas: ChildTabMeta[] = useMemo(
    () =>
      local
        ? resolveChildTabs(entityName, localTables, localTabs, localColumns)
        : resolveChildTabs(entityName, httpTables, httpTabs, httpChildColumns),
    [
      local,
      entityName,
      localTables,
      localTabs,
      localColumns,
      httpTables,
      httpTabs,
      httpChildColumns,
    ]
  );

  /*
   * A child's own field lists, on the same two endpoints the parent uses. They
   * are fetched here rather than inside the panel because `ADChildTabConfig`
   * carries a whole `ADLevel`, and a level with no fields renders an empty
   * table that looks like an entity with no rows.
   */
  const childFieldResults = useQueries({
    queries: childMetas.flatMap((child) => [
      {
        queryKey: ["bus-form-fields", child.entity],
        queryFn: () => apiClient.get<FieldMetadata[]>(`/bus/${child.entity}/fields/form`),
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ["bus-grid-fields", child.entity],
        queryFn: () => apiClient.get<FieldMetadata[]>(`/bus/${child.entity}/fields/grid`),
        staleTime: 5 * 60 * 1000,
      },
    ]),
  });

  const windowMeta: WindowMeta | undefined = useMemo(
    () =>
      local
        ? resolveWindowMeta(entityName, localWindows, localTables)
        : resolveWindowMeta(entityName, httpWindows, httpTables),
    [local, entityName, localWindows, localTables, httpWindows, httpTables]
  );

  /*
   * Does the dictionary have this entity at all?
   *
   * `/$entity` is a catch-all: any unmatched path reaches it and becomes an
   * entity name. `/login` — the address people type, while the sign-in screen
   * is at `/auth/login` — arrived here as the entity "login", and everything
   * below answered for it: the field endpoints 404, `formFields` falls back to
   * `[]`, and `ADListShell` renders a titled, empty, perfectly functional grid
   * for a table that does not exist. A typo in a URL looked like an entity with
   * no records.
   *
   * Asserted from the table list rather than from the field fetches failing: a
   * 404 on `/bus/x/fields/form` is also what a momentary outage looks like, and
   * "this does not exist" is a claim worth making only from a list that
   * actually arrived. Hence the `length > 0` — an empty list is a failed fetch,
   * not an application with no entities.
   */
  const tablesKnown = local ? localTables : httpTables;
  const isUnknownEntity = useMemo(() => {
    if (tablesKnown.length === 0) return false;
    const candidates = [`bus_${entityName}`, `bus_${entityName.replace(/-/g, "_")}`];
    return !tablesKnown.some((table) => candidates.includes(table.table_name));
  }, [tablesKnown, entityName]);

  const windowLoading = local ? false : windowsQuery.isLoading || tablesQuery.isLoading;
  const isLoading = formQuery.isLoading || gridQuery.isLoading || windowLoading;

  const formFields: FieldMetadata[] = (formQuery.data as FieldMetadata[]) ?? [];
  const gridFields: FieldMetadata[] = (gridQuery.data as FieldMetadata[]) ?? [];
  const label = windowMeta?.label ?? entityName;
  const windowSlug = windowMeta?.windowSlug ?? entityName;

  const nameField = identifierColumn(formFields);

  /*
   * One tab per line item, in the order the dictionary sequenced them. A child
   * whose fields have not arrived yet is left out rather than shown empty; the
   * tab appears when its query settles.
   */
  const childTabs: ADChildTabConfig[] = childMetas
    .map((child, index): ADChildTabConfig | null => {
      const childForm = (childFieldResults[index * 2]?.data as FieldMetadata[] | undefined) ?? [];
      const childGrid =
        (childFieldResults[index * 2 + 1]?.data as FieldMetadata[] | undefined) ?? [];
      if (childForm.length === 0 && childGrid.length === 0) return null;
      const childName = identifierColumn(childForm);
      return {
        id: child.entity,
        label: child.label,
        badge: "count",
        level: {
          id: child.entity,
          label: child.label,
          endpoint: `/bus/${child.entity}`,
          idField: "id",
          nameField: childName,
          searchField: childName,
          parentField: child.parentField,
          formFields: childForm,
          gridFields: childGrid.length > 0 ? childGrid : childForm,
          baseRoutePath: `/${child.entity.replace(/_/g, "-")}`,
        },
      };
    })
    .filter((tab): tab is ADChildTabConfig => tab !== null);

  const level: ADLevel | null = isLoading
    ? null
    : {
        id: entityName,
        label,
        endpoint: `/bus/${entityName}`,
        idField: "id",
        nameField,
        searchField: nameField,
        formFields,
        gridFields,
        childTabs,
        // Route path derived from Window name in Application Dictionary (kebab-case slug)
        baseRoutePath: `/${windowSlug}`,
      };

  return { level, isLoading, isUnknownEntity };
}
