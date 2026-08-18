/**
 * The audit trail.
 *
 * Admin-only to read, written by every path that changes a record and by every
 * sign-in attempt. Failures are recorded too: a run of AUTH_LOGIN with
 * success=false is what an attack looks like from the trail, and a trail that
 * only holds successes cannot show one.
 *
 * `recordAudit` never throws. An audit write must not be able to fail the
 * operation it is describing — losing one line of history is recoverable, and
 * refusing a save the user already saw succeed is not.
 */

import { Router } from "../lib/router.js";
import { json } from "../lib/http.js";
import { requireAdmin } from "../lib/guards.js";

export async function recordAudit(db, entry) {
  try {
    const changed =
      entry.before && entry.after
        ? Object.keys(entry.after).filter(
            (key) => JSON.stringify(entry.before[key]) !== JSON.stringify(entry.after[key])
          )
        : [];
    await db.insert("sys_audit_log", {
      user_id: entry.user ? entry.user.id : null,
      user_email: entry.user ? entry.user.email : entry.email ?? null,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId == null ? null : String(entry.entityId),
      before_value: entry.before ? JSON.stringify(entry.before) : null,
      after_value: entry.after ? JSON.stringify(entry.after) : null,
      changed_fields: JSON.stringify(changed),
      source: entry.source ?? "WEB_UI",
      success: entry.success !== false,
      error_message: entry.error ?? null,
    });
  } catch (error) {
    console.warn("[audit] could not record entry:", error.message);
  }
}

export function auditRoutes() {
  const router = new Router();

  router.get("/", async (_request, { db, query, user }) => {
    requireAdmin(user);
    const page = Math.max(1, Number(query.get("page") || 1));
    const limit = Math.min(200, Math.max(1, Number(query.get("limit") || 50)));
    const entityType = query.get("entityType");

    const where = entityType ? "WHERE entity_type = $1" : "";
    const parameters = entityType ? [entityType] : [];

    const total = await db.value(`SELECT COUNT(*)::int FROM sys_audit_log ${where}`, parameters);
    const data = await db.query(
      `SELECT * FROM sys_audit_log ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      parameters
    );
    return json({ data, total, page, limit });
  });

  router.get("/entity-types", async (_request, { db, user }) => {
    requireAdmin(user);
    const rows = await db.query(
      "SELECT DISTINCT entity_type FROM sys_audit_log WHERE entity_type IS NOT NULL ORDER BY entity_type"
    );
    return json(rows.map((row) => row.entity_type));
  });

  return router;
}
