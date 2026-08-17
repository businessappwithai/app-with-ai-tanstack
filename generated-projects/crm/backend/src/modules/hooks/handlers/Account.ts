/**
 * Lifecycle handlers for Account.
 *
 * Declared by the model's `%%hook` directives and wired up in ./index.ts.
 * The bodies are yours: this file is generated once and then left alone, so
 * regenerating the project will not overwrite what you write here.
 */

/**
 * beforeCreate on Account.
 *
 * Runs before the insert. Return the record to write.
 * Scoped to `name`.
 */
export async function normalizeAccountName(data: Record<string, any>): Promise<Record<string, any>> {
  // TODO: implement.
  return data;
}

/**
 * beforeCreate on Account.
 *
 * Runs before the insert. Return the record to write.
 * Scoped to `account_number`.
 */
export async function assignAccountNumber(data: Record<string, any>): Promise<Record<string, any>> {
  // TODO: implement.
  return data;
}

/**
 * customValidate on Account.
 *
 * Runs on every create and update. Throw to reject the write.
 * Scoped to `account_number`.
 */
export async function ensureAccountNumberUnique(data: Record<string, any>): Promise<void> {
  // TODO: implement.
}

/**
 * afterCreate on Account.
 *
 * Runs after the insert. Side effects only.
 */
export async function seedAccountTeam(record: Record<string, any>): Promise<void> {
  // TODO: implement.
}

/**
 * beforeList on Account.
 *
 * Runs before a list. Return the filter/sort/paging params.
 * Scoped to `territory_id`.
 */
export async function scopeToTerritory(params: Record<string, any>): Promise<Record<string, any>> {
  // TODO: implement.
  return params;
}

/**
 * afterList on Account.
 *
 * Runs after a list. Post-process the page.
 * Scoped to `health_score`.
 */
export async function attachHealthScore(rows: Record<string, any>[]): Promise<void> {
  // TODO: implement.
}

/**
 * beforeDelete on Account.
 *
 * Runs before the delete. Return false to block it.
 */
export async function blockDeleteWithOpenBusiness(id: string): Promise<boolean> {
  // TODO: implement. Return false to block the delete.
  return true;
}
