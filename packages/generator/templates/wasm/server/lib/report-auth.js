/**
 * The reporting application's sessions — separate, on purpose.
 *
 * Passwords are hashed and verified by `auth.js`: there is one PBKDF2
 * implementation in this runtime and both applications use it, because two
 * would be two chances to get a password hash wrong and no benefit at all.
 *
 * Everything *identifying* is separate. A different session table
 * (`rpt_session`, not `sys_session`), a different cookie, a different bearer
 * token in the browser's storage. Signing into the application does not sign
 * you into the reporting platform and signing out of one leaves the other
 * alone — which is true of the deployed pair, where they are two servers with
 * two databases, and would quietly stop being true here the moment the two
 * shared a token.
 */

import { randomToken } from "./auth.js";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export const REPORT_SESSION_COOKIE = "appwithai_report_session";

export function reportSessionCookie(token, maxAgeSeconds = SESSION_TTL_MS / 1000) {
  // No `Secure`, for the same reason the application's cookie has none: this is
  // routinely opened over plain http on localhost, and a cookie the browser
  // declines to store is a sign-in that appears to work and does not stick.
  return `${REPORT_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Max-Age=${Math.floor(maxAgeSeconds)}`;
}

export const clearedReportSessionCookie = () =>
  `${REPORT_SESSION_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0`;

export async function createReportSession(db, userId, userAgent) {
  const token = randomToken();
  await db.insert("rpt_session", {
    token,
    rpt_user_id: userId,
    expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    user_agent: userAgent || null,
  });
  return token;
}

/**
 * The bearer token for the *reporting* side of a request.
 *
 * Read from `X-Reporting-Authorization` before the ordinary `Authorization`
 * header, and that header exists for one reason: a reader can be signed into
 * both applications at once in the same tab, and a Service Worker does not pass
 * cookies through to a request it intercepts — so both sessions travel as
 * bearer tokens, and one header cannot carry two of them. The application's
 * token arriving here must not be mistaken for a reporting session: it would be
 * looked up in `rpt_session`, found nowhere, and answered 401, which is correct
 * but only by accident.
 */
function readReportToken(request) {
  const scoped = request.headers.get("x-reporting-authorization");
  if (scoped) return scoped.replace(/^Bearer\s+/i, "") || null;

  const cookie = request.headers.get("cookie");
  if (cookie) {
    for (const part of cookie.split(";")) {
      const [key, ...rest] = part.trim().split("=");
      if (key === REPORT_SESSION_COOKIE) return decodeURIComponent(rest.join("=")) || null;
    }
  }
  return null;
}

/**
 * Resolve the reporting caller: the account, its role, and the tables it reads.
 *
 * `tables` is `null` for "every table" rather than a set containing all of
 * them, and the distinction is the one that matters: an administrator and a
 * role that happens to be allowed everything today are different answers, and
 * only the first should stay right when an entity is added tomorrow.
 */
export async function resolveReportSession(db, request) {
  const token = readReportToken(request);
  if (!token) return null;

  const row = await db.one(
    `SELECT u.rpt_user_id, u.name, u.email, u.is_active, s.expires_at,
            r.name AS role_name, r.declared_as, r.is_admin, r.rpt_role_id
       FROM rpt_session s
       JOIN rpt_user u ON u.rpt_user_id = s.rpt_user_id
       LEFT JOIN rpt_role r ON r.rpt_role_id = u.rpt_role_id
      WHERE s.token = $1`,
    [token]
  );
  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await db.remove("rpt_session", { token });
    return null;
  }
  if (row.is_active === false) return null;

  const scoped = row.rpt_role_id
    ? await db.query("SELECT table_name FROM rpt_role_tables WHERE rpt_role_id = $1", [
        row.rpt_role_id,
      ])
    : [];

  return {
    id: row.rpt_user_id,
    name: row.name,
    email: row.email,
    token,
    role: row.role_name || null,
    declaredAs: row.declared_as || null,
    isAdmin: row.is_admin === true,
    /*
     * `null` means every table, and only an administrator gets it.
     *
     * An ordinary role with no rows reads *nothing*, which is not the same
     * answer and is a real case: the built-in `User` role holds no functional
     * role, so no `read` rule admits it and the pack gives it an empty table
     * list. Reading "no rows" as "unrestricted" handed the least-privileged
     * account on the system permission to read every table in the application
     * — the exact inversion of what it is for, and invisible because its
     * dashboard then looked like an administrator's.
     *
     * The pack's own `tables: []` carries the same two meanings and is
     * disambiguated the same way, by `isAdmin`.
     */
    tables: row.is_admin === true ? null : new Set(scoped.map((s) => s.table_name)),
  };
}

export async function destroyReportSession(db, token) {
  if (token) await db.remove("rpt_session", { token });
}
