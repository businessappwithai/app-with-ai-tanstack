/**
 * What a user sees in the bell beside the Log out button.
 *
 * A notification is not a stored object — it is one row of the audit trail,
 * rendered for the person who caused it. Nothing here is written anywhere; the
 * only thing this module stores is whether a user has read a given row.
 */

/** What became of the transaction. */
export type TransactionOutcome = "pending" | "succeeded" | "failed";

export interface TransactionNotification {
  /** The `audit_log` row this came from. Also the id a read mark is keyed on. */
  id: string;
  /** ISO timestamp of the audit row — the list is ordered on this, newest first. */
  at: string;
  read: boolean;
  outcome: TransactionOutcome;
  /** `draft` (the save) or `finalize` (the second transaction). */
  phase: "draft" | "finalize";
  operation: "create" | "update" | "delete" | "save";
  /** Physical table, e.g. `bus_account`. */
  entityTable: string;
  /** What that table is called in the Application Dictionary, e.g. `Account`. */
  entityLabel: string;
  recordId: string | null;
  /** The record's own name, where it has one; otherwise a short form of its id. */
  recordLabel: string;
  /** One line, written for a person: "Account “Acme Corp” is now final". */
  title: string;
  /** The detail under it — for a failure, why it failed and what to do. */
  detail: string;
  /** Where to go to see the record. Null when the record no longer exists. */
  href: string | null;
}

export interface NotificationPage {
  data: TransactionNotification[];
  meta: {
    /** Unread transactions for this user across the whole trail, not just this page. */
    unread: number;
    limit: number;
    /** Pass as `before` to fetch the next, older page. Null when at the end. */
    nextCursor: string | null;
  };
}
