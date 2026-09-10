export const AuditAction = {
  // Authentication
  AUTH_LOGIN: "AUTH_LOGIN",
  AUTH_LOGOUT: "AUTH_LOGOUT",
  AUTH_LOGIN_FAILED: "AUTH_LOGIN_FAILED",
  AUTH_PASSWORD_RESET: "AUTH_PASSWORD_RESET",
  AUTH_SESSION_EXPIRED: "AUTH_SESSION_EXPIRED",

  // Business entity
  ENTITY_CREATE: "ENTITY_CREATE",
  ENTITY_UPDATE: "ENTITY_UPDATE",
  ENTITY_DELETE: "ENTITY_DELETE",
  ENTITY_BULK_CREATE: "ENTITY_BULK_CREATE",

  // Record transactions — the two halves of a write.
  //
  // A save commits the row as a draft and stops there; a second transaction,
  // run by Trigger.dev, executes the record's rules and workflows and either
  // finalises it or leaves it a draft carrying the reason. Both halves are
  // recorded here because the second one runs outside any HTTP request, where
  // the audit interceptor cannot see it — and because the user who saved the
  // record has no other way to learn how it ended up.
  ENTITY_DRAFT: "ENTITY_DRAFT",
  ENTITY_FINALIZE: "ENTITY_FINALIZE",

  // System dictionary
  SYS_FIELD_UPDATE: "SYS_FIELD_UPDATE",
  SYS_FIELD_GROUP_CHANGE: "SYS_FIELD_GROUP_CHANGE",
  SYS_TABLE_CHANGE: "SYS_TABLE_CHANGE",
  SYS_WINDOW_CHANGE: "SYS_WINDOW_CHANGE",

  // AI agent
  AI_SQL_GENERATED: "AI_SQL_GENERATED",
  AI_SQL_EXECUTED: "AI_SQL_EXECUTED",
  AI_REPORT_GENERATED: "AI_REPORT_GENERATED",
  AI_WORKFLOW_APPROVED: "AI_WORKFLOW_APPROVED",
  AI_WORKFLOW_REJECTED: "AI_WORKFLOW_REJECTED",
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];

export type AuditSource = "WEB_UI" | "API" | "AGENT" | "SYSTEM";

/**
 * The actions a user sees in their notification list.
 *
 * The notification feed is read from the audit trail and from nowhere else, so
 * this set is what separates "a transaction of mine" from the rest of the
 * trail — logins, reads, dictionary edits — which belong on the audit page
 * rather than in a personal notification list.
 */
export const TRANSACTION_ACTIONS: readonly string[] = [
  "ENTITY_DRAFT",
  "ENTITY_FINALIZE",
];

export interface AuditEvent {
  id?: string;
  immudb_key?: string;
  timestamp?: string;
  user_id?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  session_id?: string | null;
  action: AuditActionType | string;
  entity_type?: string | null;
  entity_id?: string | null;
  before_value?: Record<string, unknown> | null;
  after_value?: Record<string, unknown> | null;
  changed_fields?: string[];
  ip_address?: string | null;
  user_agent?: string | null;
  source?: AuditSource;
  request_id?: string | null;
  correlation_id?: string | null;
  success?: boolean;
  error_message?: string | null;
}

export interface AuditSearchParams {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  user_id?: string;
  user_email?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  source?: AuditSource;
  success?: boolean;
  search?: string;
}

/** Fields whose values are masked before storage. */
export const SENSITIVE_FIELDS = new Set([
  "password",
  "password_hash",
  "token",
  "access_token",
  "refresh_token",
  "api_key",
  "secret",
  "private_key",
  "credit_card",
  "card_number",
  "cvv",
  "ssn",
  "national_id",
]);

export function maskSensitive(
  obj: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!obj) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = SENSITIVE_FIELDS.has(k.toLowerCase()) ? "[REDACTED]" : v;
  }
  return out;
}

export function diffFields(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
): string[] {
  if (!before || !after) return [];
  return Object.keys(after).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
}
