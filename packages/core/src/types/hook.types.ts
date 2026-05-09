export type HookLifecycle =
  | "beforeCreate"
  | "afterCreate"
  | "beforeUpdate"
  | "afterUpdate"
  | "beforeDelete"
  | "afterDelete"
  | "beforeQuery"
  | "afterQuery";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface HookContext<T = any> {
  entity: string;
  lifecycle: HookLifecycle;
  data: T;
  user?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Hook<T = any> {
  name: string;
  lifecycle: HookLifecycle;
  priority: number;
  execute: (context: HookContext<T>) => Promise<void | T>;
}
