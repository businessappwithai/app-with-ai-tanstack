/**
 * Access control — what `%%rbac` compiled to, enforced.
 *
 * The directive restricts; it does not grant. A target no row names is open to
 * any authenticated caller, so a model that declares no `%%rbac` generates an
 * application that behaves exactly as it did before the feature existed. That
 * is the property worth protecting here: the temptation is to read an empty
 * rule set as "deny everything", which turns adding one directive into locking
 * every other entity.
 *
 * Role names match case-insensitively, and a role flagged `is_admin` bypasses —
 * both because a model writes `role:sales_manager` while the dictionary seeds
 * `Sales Manager`, and because an application whose administrator can be locked
 * out of it by its own model is unusable.
 */

import { forbidden, unauthorized } from "./http.js";

const normalize = (value) => String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");

export function holdsRole(user, roleNames) {
  if (!user) return false;
  if (user.isAdmin) return true;
  const held = new Set((user.roles || []).map(normalize));
  return roleNames.some((role) => held.has(normalize(role)));
}

export function requireUser(user) {
  if (!user) throw unauthorized("Sign in to continue");
  return user;
}

export function requireAdmin(user) {
  requireUser(user);
  if (!user.isAdmin) throw forbidden("Administrator role required");
  return user;
}

/**
 * CRUD access for one entity operation.
 *
 * Rows are read for the exact operation and for `*`; a directive written as
 * `%%rbac role:admin on Order.*` has to restrict `read` as well as `delete`,
 * and a read restriction a sibling route ignores is not a restriction.
 */
export async function checkOperationAccess(db, user, tableName, operation) {
  requireUser(user);
  const rows = await db.query(
    `SELECT role_name FROM sys_operation_access
      WHERE table_name = $1 AND operation IN ($2, '*') AND is_active = true`,
    [tableName, operation]
  );
  if (!rows.length) return;
  if (!holdsRole(user, rows.map((row) => row.role_name))) {
    throw forbidden(
      `Your roles do not permit ${operation} on ${tableName} (requires ${[...new Set(rows.map((r) => r.role_name))].join(" or ")})`
    );
  }
}

/**
 * Transition access, matched on the states a write crosses.
 *
 * A transition has no endpoint of its own — moving a record along an edge is an
 * ordinary status update — so the compiler stored the `(from_state, to_state)`
 * pair and the check happens where the update knows both ends. Both are kept
 * because one event can sit on several edges.
 */
export async function checkTransitionAccess(db, user, tableName, before, after, statusColumn) {
  if (!statusColumn) return;
  const from = before ? before[statusColumn] : null;
  const to = after ? after[statusColumn] : null;
  if (!to || from === to) return;

  const rows = await db.query(
    `SELECT role_name, transition FROM sys_transition_access
      WHERE table_name = $1 AND from_state = $2 AND to_state = $3 AND is_active = true`,
    [tableName, String(from ?? ""), String(to)]
  );
  if (!rows.length) return;
  if (!holdsRole(user, rows.map((row) => row.role_name))) {
    throw forbidden(
      `Your roles do not permit the "${rows[0].transition}" transition (${from} to ${to})`
    );
  }
}
