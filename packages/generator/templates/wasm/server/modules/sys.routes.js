/**
 * `/sys` — the Application Dictionary.
 *
 * Reads are open to any signed-in user and writes are administrator-only, which
 * is not symmetry for its own sake: every list and every form in this
 * application is drawn from these rows, so gating reads leaves a non-admin
 * looking at empty pages, while a write changes what everyone else sees.
 *
 * The write guard keys on the HTTP method rather than on per-route decoration.
 * There are more write routes than anyone remembers, and one added later would
 * otherwise default to open.
 */

import { Router } from "../lib/router.js";
import { json, notFound, readJson } from "../lib/http.js";
import { requireAdmin, requireUser } from "../lib/guards.js";

export function sysRoutes(model) {
  const router = new Router();

  router.use(async (request, { user }) => {
    requireUser(user);
    if (request.method !== "GET") requireAdmin(user);
  });

  router.get("/tables", async (_request, { db, query }) => {
    const prefix = query.get("prefix");
    const rows = await db.query(
      `SELECT t.*, w.name AS window_name, c.name AS category_name
         FROM sys_table t
         LEFT JOIN sys_window w ON w.sys_window_id = t.sys_window_id
         LEFT JOIN sys_category c ON c.sys_category_id = t.sys_category_id
        WHERE ($1::text IS NULL OR t.table_name LIKE $1 || '%')
        ORDER BY t.name`,
      [prefix ?? null]
    );
    return json(rows);
  });

  router.get("/tables/:id", async (_request, { db, params }) => {
    const row = await db.one("SELECT * FROM sys_table WHERE sys_table_id = $1", [params.id]);
    if (!row) throw notFound("No such table");
    return json(row);
  });

  router.get("/columns", async (_request, { db, query }) => {
    const tableId = query.get("tableId");
    const rows = tableId
      ? await db.select("sys_column", { where: { sys_table_id: tableId }, orderBy: "seq_no" })
      : await db.select("sys_column", { orderBy: "seq_no" });
    return json(rows);
  });

  router.get("/windows", async (_request, { db }) => json(await db.select("sys_window", { orderBy: "name" })));
  router.get("/tabs", async (_request, { db }) => json(await db.select("sys_tab", { orderBy: "seq_no" })));
  router.get("/references", async (_request, { db }) =>
    json(await db.select("sys_reference", { orderBy: "sys_reference_id" }))
  );
  router.get("/roles", async (_request, { db }) => json(await db.select("sys_role", { orderBy: "name" })));

  router.get("/ref-list", async (_request, { db, query }) => {
    const referenceId = query.get("referenceId") || query.get("sys_reference_id");
    const rows = referenceId
      ? await db.select("sys_ref_list", {
          where: { sys_reference_id: Number(referenceId) },
          orderBy: "seq_no",
        })
      : await db.select("sys_ref_list", { orderBy: "seq_no" });
    return json(rows);
  });

  /**
   * Options for a Table Direct lookup.
   *
   * The dictionary already knows which table a reference column points at
   * (`sys_column.ref_table_name`); this turns that into something a select can
   * render — an id and the label a person recognises. The label column is the
   * one the dictionary marks `is_identifier` and is not the key, which is
   * `name` for most entities; failing that, the first text column; failing
   * that, the id itself, because a lookup that lists ids is still better than
   * a text box asking for one.
   */
  router.get("/lookup", async (_request, { db, query }) => {
    const table = query.get("table");
    if (!table) return json({ options: [], label: null });

    /* sys_column keys its table by id, so the dictionary is asked for the
       table first — which also means a table nobody declared cannot be read
       through this route. */
    const owner = await db.one("SELECT sys_table_id FROM sys_table WHERE table_name = $1", [table]);
    if (!owner) return json({ options: [], label: null });

    const columns = await db.select("sys_column", {
      where: { sys_table_id: owner.sys_table_id },
      orderBy: "seq_no",
    });
    if (columns.length === 0) return json({ options: [], label: null });

    const key = columns.find((column) => column.is_key)?.column_name ?? "id";
    const has = (name) => columns.some((column) => column.column_name === name);
    const named = ["name", "full_name", "title", "label", "display_name", "subject"];
    const readable = (column) =>
      !column.is_key &&
      !column.column_name.endsWith("_id") &&
      [10, 14, 30].includes(Number(column.sys_reference_id));

    /* What a person would call the record, in the order they would reach for
       it: a name-ish column, then a first/last pair — a person table rarely
       carries either of the names above, and listing staff by e-mail address
       when their names are right there is the sort of thing that makes a
       generated screen feel generated — then whatever the dictionary marks as
       the identifier, then the first readable column, then the key: a lookup
       listing ids still beats a text box asking for one. */
    const name = columns.find((column) => named.includes(column.column_name))?.column_name;
    const person = !name && has("first_name") && has("last_name");
    const label = name
      ? name
      : person
        ? "first_name last_name"
        : (columns.find((column) => column.is_identifier && !column.is_key)?.column_name ??
          columns.find(readable)?.column_name ??
          key);

    const expression = person
      ? `TRIM(CONCAT_WS(' ', ${quoted("first_name")}, ${quoted("last_name")}))`
      : quoted(label);

    const limit = Math.min(Number(query.get("limit") ?? 500) || 500, 1000);
    const rows = await db.query(
      `SELECT ${quoted(key)} AS id, ${expression} AS label
         FROM ${quoted(table)}
        ORDER BY 2
        LIMIT ${limit}`
    );
    return json({ options: rows, label });
  });

  router.get("/users", async (_request, { db }) =>
    json(
      await db.query(
        `SELECT u.sys_user_id, u.name, u.email, u.is_active, u.last_login,
                COALESCE(json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '[]') AS roles
           FROM sys_user u
           LEFT JOIN sys_user_roles ur ON ur.user_id = u.sys_user_id AND ur.is_active = true
           LEFT JOIN sys_role r ON r.sys_role_id = ur.role_id
          GROUP BY u.sys_user_id
          ORDER BY u.name`
      )
    )
  );

  router.get("/categories", async (_request, { db }) =>
    json(await db.select("sys_category", { orderBy: "seq_no" }))
  );

  router.get("/categories/with-entities", async (_request, { db }) => {
    const categories = await db.select("sys_category", { orderBy: "seq_no" });
    const tables = await db.query(
      `SELECT t.table_name, t.name, t.sys_category_id FROM sys_table t
        WHERE t.entity_type = 'bus' ORDER BY t.name`
    );
    return json(
      categories.map((category) => ({
        ...category,
        entities: tables.filter((table) => table.sys_category_id === category.sys_category_id),
      }))
    );
  });

  router.get("/fields", async (_request, { db, query }) => {
    const tabId = query.get("tabId");
    const rows = tabId
      ? await db.select("sys_field", { where: { sys_tab_id: tabId }, orderBy: "seq_no" })
      : await db.select("sys_field", { orderBy: "seq_no" });
    return json(rows);
  });

  router.get("/field-groups", async (_request, { db }) =>
    json(await db.select("sys_field_group", { orderBy: "seq_no" }))
  );

  /**
   * Toggling a field's visibility is the one dictionary write the application
   * itself offers, because it is the one that pays off immediately: a column
   * hidden here disappears from every grid and form without regenerating.
   */
  router.patch("/fields/:id", async (request, { db, params }) => {
    const body = await readJson(request);
    const allowed = {};
    for (const key of [
      "name",
      "is_displayed",
      "is_displayed_grid",
      "is_read_only",
      "is_mandatory",
      "seq_no",
      "seq_no_grid",
    ]) {
      if (key in body) allowed[key] = body[key];
    }
    const updated = await db.update("sys_field", allowed, { sys_field_id: params.id });
    if (!updated) throw notFound("No such field");
    return json(updated);
  });

  /** What the model said, for the screens that show the model rather than the data. */
  router.get("/model-summary", async (_request, { db }) => {
    const counts = {
      entities: model.entities.length,
      rules: (model.rules || []).length,
      workflows: (model.workflows || []).length,
      sagas: (model.sagas || []).length,
      hooks: (model.hooks || []).length,
      categories: (model.categories || []).length,
    };
    const records = {};
    for (const entity of model.entities) {
      records[entity.name] = await db.value(
        `SELECT COUNT(*)::int FROM ${quoted(entity.tableName)} WHERE deleted_at IS NULL`
      );
    }
    // The seeded password belongs on the sign-in screen (/auth/config), which
    // says why it is shown there. Repeating it in every summary response is
    // just a wider blast radius for no gain.
    const { adminPassword: _password, ...project } = model.project;
    return json({ project, counts, records });
  });

  return router;
}

const quoted = (name) => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`Unsafe identifier: ${name}`);
  return `"${name}"`;
};
