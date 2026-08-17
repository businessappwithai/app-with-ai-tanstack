/**
 * Lifecycle handlers for Lead.
 *
 * Declared by the model's `%%hook` directives and wired up in ./index.ts.
 * The bodies are yours: this file is generated once and then left alone, so
 * regenerating the project will not overwrite what you write here.
 */

/**
 * beforeCreate on Lead.
 *
 * Runs before the insert. Return the record to write.
 * Scoped to `lead_source`.
 */
export async function stampLeadSource(data: Record<string, any>): Promise<Record<string, any>> {
  // TODO: implement.
  return data;
}

/**
 * customValidate on Lead.
 *
 * Runs on every create and update. Throw to reject the write.
 * Scoped to `email`.
 */
export async function requireContactChannel(data: Record<string, any>): Promise<void> {
  // TODO: implement.
}

/**
 * afterCreate on Lead.
 *
 * Runs after the insert. Side effects only.
 */
export async function notifyOwnerOfNewLead(record: Record<string, any>): Promise<void> {
  // TODO: implement.
}

/**
 * beforeQuery on Lead.
 *
 * Runs before a query. Return the query to execute.
 * Scoped to `owner_id`.
 */
export async function scopeToOwnedLeads(query: Record<string, any>): Promise<Record<string, any>> {
  // TODO: implement.
  return query;
}

/**
 * afterQuery on Lead.
 *
 * Runs after a query. Post-process the rows.
 * Scoped to `email`.
 */
export async function annotateDuplicateLeads(rows: Record<string, any>[]): Promise<void> {
  // TODO: implement.
}
