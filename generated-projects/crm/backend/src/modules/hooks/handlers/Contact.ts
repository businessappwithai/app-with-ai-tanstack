/**
 * Lifecycle handlers for Contact.
 *
 * Declared by the model's `%%hook` directives and wired up in ./index.ts.
 * The bodies are yours: this file is generated once and then left alone, so
 * regenerating the project will not overwrite what you write here.
 */

/**
 * beforeCreate on Contact.
 *
 * Runs before the insert. Return the record to write.
 * Scoped to `email`.
 */
export async function normalizeEmail(data: Record<string, any>): Promise<Record<string, any>> {
  // TODO: implement.
  return data;
}

/**
 * customValidate on Contact.
 *
 * Runs on every create and update. Throw to reject the write.
 * Scoped to `email`.
 */
export async function ensureUniqueEmail(data: Record<string, any>): Promise<void> {
  // TODO: implement.
}

/**
 * afterCreate on Contact.
 *
 * Runs after the insert. Side effects only.
 */
export async function enqueueWelcomeSequence(record: Record<string, any>): Promise<void> {
  // TODO: implement.
}

/**
 * afterUpdate on Contact.
 *
 * Runs after the update. Side effects only.
 * Scoped to `email_opt_out`.
 */
export async function syncToMarketingPlatform(record: Record<string, any>): Promise<void> {
  // TODO: implement.
}

/**
 * beforeRead on Contact.
 *
 * Runs before a single-record read. Return the lookup params.
 */
export async function enforceFieldLevelSecurity(params: Record<string, any>): Promise<Record<string, any>> {
  // TODO: implement.
  return params;
}

/**
 * afterRead on Contact.
 *
 * Runs after a single-record read. Redact or enrich in place.
 * Scoped to `phone`.
 */
export async function maskPersonalData(record: Record<string, any>): Promise<void> {
  // TODO: implement.
}

/**
 * afterDelete on Contact.
 *
 * Runs after the delete. Clean up related state.
 */
export async function purgeMarketingConsent(record: Record<string, any>): Promise<void> {
  // TODO: implement.
}
