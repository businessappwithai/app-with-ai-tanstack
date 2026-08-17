/**
 * Lifecycle handlers for Contract.
 *
 * Declared by the model's `%%hook` directives and wired up in ./index.ts.
 * The bodies are yours: this file is generated once and then left alone, so
 * regenerating the project will not overwrite what you write here.
 */

/**
 * beforeCreate on Contract.
 *
 * Runs before the insert. Return the record to write.
 * Scoped to `contract_number`.
 */
export async function generateContractNumber(data: Record<string, any>): Promise<Record<string, any>> {
  // TODO: implement.
  return data;
}

/**
 * customValidate on Contract.
 *
 * Runs on every create and update. Throw to reject the write.
 * Scoped to `start_date`.
 */
export async function ensureTermMatchesDates(data: Record<string, any>): Promise<void> {
  // TODO: implement.
}

/**
 * afterCreate on Contract.
 *
 * Runs after the insert. Side effects only.
 */
export async function notifyFinanceOfNewContract(record: Record<string, any>): Promise<void> {
  // TODO: implement.
}

/**
 * afterUpdate on Contract.
 *
 * Runs after the update. Side effects only.
 * Scoped to `renewal_notice_days`.
 */
export async function scheduleRenewalReminders(record: Record<string, any>): Promise<void> {
  // TODO: implement.
}
