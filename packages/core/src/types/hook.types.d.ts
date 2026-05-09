export type HookLifecycle =
  | "beforeCreate"
  | "afterCreate"
  | "beforeUpdate"
  | "afterUpdate"
  | "beforeDelete"
  | "afterDelete"
  | "beforeQuery"
  | "afterQuery";
export interface HookContext<T = any> {
  entity: string;
  lifecycle: HookLifecycle;
  data: T;
  user?: any;
  metadata?: Record<string, any>;
}
export interface Hook<T = any> {
  name: string;
  lifecycle: HookLifecycle;
  priority: number;
  execute: (context: HookContext<T>) => Promise<void | T>;
}
//# sourceMappingURL=hook.types.d.ts.map
