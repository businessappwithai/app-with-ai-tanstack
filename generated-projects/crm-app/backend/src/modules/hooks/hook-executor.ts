/**
 * Hook Executor
 *
 * Executes registered hooks for entity lifecycle events.
 * Generated: 2026-05-12T10:27:31.156Z
 */

import type { HookContext, HookLifecycle } from './hook.types';
import { globalHookRegistry } from './hook-registry';

export class HookExecutor {
  async execute<T>(
    entityName: string,
    lifecycle: HookLifecycle,
    data: T,
    metadata?: Record<string, any>
  ): Promise<T> {
    const hooks = globalHookRegistry.getHooks(entityName, lifecycle);

    let result = data;
    const context: HookContext<T> = {
      entity: entityName,
      lifecycle,
      data: result,
      metadata
    };

    for (const hook of hooks) {
      const hookResult = await hook.execute(context);
      if (hookResult !== undefined) {
        result = hookResult;
        context.data = result;
      }
    }

    return result;
  }
}

export const globalHookExecutor = new HookExecutor();
