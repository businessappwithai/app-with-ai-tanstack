/**
 * Hooks Index
 *
 * Runs the lifecycle handlers the model's `%%hook` directives declare.
 * The handlers themselves live in ./handlers, one module per entity.
 *
 * @generated
 */

import { ENTITY_HOOKS, hookKey } from './handlers';

export interface HookRegistry {
  beforeCreate?: Record<string, (...args: unknown[]) => unknown>;
  afterCreate?: Record<string, (...args: unknown[]) => unknown>;
  beforeUpdate?: Record<string, (...args: unknown[]) => unknown>;
  afterUpdate?: Record<string, (...args: unknown[]) => unknown>;
  beforeDelete?: Record<string, (...args: unknown[]) => unknown>;
  afterDelete?: Record<string, (...args: unknown[]) => unknown>;
  beforeQuery?: Record<string, (...args: unknown[]) => unknown>;
  afterQuery?: Record<string, (...args: unknown[]) => unknown>;
  customValidate?: Record<string, (...args: unknown[]) => unknown>;
  beforeRead?: Record<string, (...args: unknown[]) => unknown>;
  afterRead?: Record<string, (...args: unknown[]) => unknown>;
  beforeList?: Record<string, (...args: unknown[]) => unknown>;
  afterList?: Record<string, (...args: unknown[]) => unknown>;
}

/**
 * Get all registered hooks for an entity
 *
 * Accepts any spelling the caller happens to use — `Compound`, `compound`,
 * `compounds`, `bus_compound` and `chemical-inventory` all resolve.
 */
export function getHooks(entity: string): HookRegistry {
  return ENTITY_HOOKS[hookKey(entity)] ?? {};
}

/**
 * Execute beforeCreate hooks for an entity
 */
export async function executeBeforeCreateHooks(
  entity: string,
  data: any
): Promise<any> {
  const hooks = getHooks(entity);
  const beforeHooks = hooks.beforeCreate || {};

  let result = data;
  for (const hookName of Object.keys(beforeHooks)) {
    const hookFn = beforeHooks[hookName];
    result = await hookFn(result);
  }
  return result;
}

/**
 * Execute afterCreate hooks for an entity
 */
export async function executeAfterCreateHooks(
  entity: string,
  data: any
): Promise<void> {
  const hooks = getHooks(entity);
  const afterHooks = hooks.afterCreate || {};

  for (const hookName of Object.keys(afterHooks)) {
    const hookFn = afterHooks[hookName];
    await hookFn(data);
  }
}

/**
 * Execute beforeUpdate hooks for an entity
 */
export async function executeBeforeUpdateHooks(
  entity: string,
  data: any
): Promise<any> {
  const hooks = getHooks(entity);
  const beforeHooks = hooks.beforeUpdate || {};

  let result = data;
  for (const hookName of Object.keys(beforeHooks)) {
    const hookFn = beforeHooks[hookName];
    result = await hookFn(result);
  }
  return result;
}

/**
 * Execute afterUpdate hooks for an entity
 */
export async function executeAfterUpdateHooks(
  entity: string,
  data: any
): Promise<void> {
  const hooks = getHooks(entity);
  const afterHooks = hooks.afterUpdate || {};

  for (const hookName of Object.keys(afterHooks)) {
    const hookFn = afterHooks[hookName];
    await hookFn(data);
  }
}

/**
 * Execute beforeDelete hooks for an entity
 */
export async function executeBeforeDeleteHooks(
  entity: string,
  id: string
): Promise<boolean> {
  const hooks = getHooks(entity);
  const beforeHooks = hooks.beforeDelete || {};

  for (const hookName of Object.keys(beforeHooks)) {
    const hookFn = beforeHooks[hookName];
    const result = await hookFn(id);
    if (result === false) return false;
  }
  return true;
}

/**
 * Execute afterDelete hooks for an entity
 */
export async function executeAfterDeleteHooks(
  entity: string,
  data: any
): Promise<void> {
  const hooks = getHooks(entity);
  const afterHooks = hooks.afterDelete || {};

  for (const hookName of Object.keys(afterHooks)) {
    const hookFn = afterHooks[hookName];
    await hookFn(data);
  }
}

/**
 * Execute beforeRead hooks for an entity
 */
export async function executeBeforeReadHooks(
  entity: string,
  params: any
): Promise<any> {
  const hooks = getHooks(entity);
  const beforeHooks = hooks.beforeRead || {};

  let result = params;
  for (const hookName of Object.keys(beforeHooks)) {
    const hookFn = beforeHooks[hookName];
    result = await hookFn(result);
  }
  return result;
}

/**
 * Execute afterRead hooks for an entity
 */
export async function executeAfterReadHooks(
  entity: string,
  data: any
): Promise<void> {
  const hooks = getHooks(entity);
  const afterHooks = hooks.afterRead || {};

  for (const hookName of Object.keys(afterHooks)) {
    const hookFn = afterHooks[hookName];
    await hookFn(data);
  }
}

/**
 * Execute beforeList hooks for an entity
 */
export async function executeBeforeListHooks(
  entity: string,
  params: any
): Promise<any> {
  const hooks = getHooks(entity);
  const beforeHooks = hooks.beforeList || {};

  let result = params;
  for (const hookName of Object.keys(beforeHooks)) {
    const hookFn = beforeHooks[hookName];
    result = await hookFn(result);
  }
  return result;
}

/**
 * Execute afterList hooks for an entity
 */
export async function executeAfterListHooks(
  entity: string,
  data: any[]
): Promise<void> {
  const hooks = getHooks(entity);
  const afterHooks = hooks.afterList || {};

  for (const hookName of Object.keys(afterHooks)) {
    const hookFn = afterHooks[hookName];
    await hookFn(data);
  }
}

/**
 * Execute customValidate hooks for an entity
 *
 * Runs on every create and update. A handler rejects the write by throwing;
 * the error propagates to the caller as-is so it keeps its own status code.
 */
export async function executeCustomValidateHooks(
  entity: string,
  data: any
): Promise<void> {
  const hooks = getHooks(entity);
  const validators = hooks.customValidate || {};

  for (const hookName of Object.keys(validators)) {
    const hookFn = validators[hookName];
    await hookFn(data);
  }
}
