/**
 * Lifecycle handlers for Opportunity.
 *
 * Declared by the model's `%%hook` directives and wired up in ./index.ts.
 * The bodies are yours: this file is generated once and then left alone, so
 * regenerating the project will not overwrite what you write here.
 */

/**
 * beforeUpdate on Opportunity.
 *
 * Runs before the update. Return the values to write.
 * Scoped to `stage`.
 */
export async function snapshotStageChange(data: Record<string, any>): Promise<Record<string, any>> {
  // TODO: implement.
  return data;
}

/**
 * customValidate on Opportunity.
 *
 * Runs on every create and update. Throw to reject the write.
 * Scoped to `loss_reason`.
 */
export async function requireLossReasonOnLoss(data: Record<string, any>): Promise<void> {
  // TODO: implement.
}

/**
 * afterCreate on Opportunity.
 *
 * Runs after the insert. Side effects only.
 */
export async function notifySellingTeam(record: Record<string, any>): Promise<void> {
  // TODO: implement.
}

/**
 * afterUpdate on Opportunity.
 *
 * Runs after the update. Side effects only.
 * Scoped to `amount`.
 */
export async function recalculateAccountPipeline(record: Record<string, any>): Promise<void> {
  // TODO: implement.
}
