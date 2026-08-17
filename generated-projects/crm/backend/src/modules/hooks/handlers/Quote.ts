/**
 * Lifecycle handlers for Quote.
 *
 * Declared by the model's `%%hook` directives and wired up in ./index.ts.
 * The bodies are yours: this file is generated once and then left alone, so
 * regenerating the project will not overwrite what you write here.
 */

/**
 * beforeCreate on Quote.
 *
 * Runs before the insert. Return the record to write.
 * Scoped to `quote_number`.
 */
export async function generateQuoteNumber(data: Record<string, any>): Promise<Record<string, any>> {
  // TODO: implement.
  return data;
}

/**
 * beforeUpdate on Quote.
 *
 * Runs before the update. Return the values to write.
 * Scoped to `grand_total`.
 */
export async function recalculateQuoteTotals(data: Record<string, any>): Promise<Record<string, any>> {
  // TODO: implement.
  return data;
}

/**
 * customValidate on Quote.
 *
 * Runs on every create and update. Throw to reject the write.
 * Scoped to `discount_percent`.
 */
export async function enforceDiscountCeiling(data: Record<string, any>): Promise<void> {
  // TODO: implement.
}

/**
 * afterUpdate on Quote.
 *
 * Runs after the update. Side effects only.
 */
export async function regenerateQuoteDocument(record: Record<string, any>): Promise<void> {
  // TODO: implement.
}
