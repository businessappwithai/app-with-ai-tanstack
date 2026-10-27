// The Pulumi SDK and its providers are optional: no manifest declares them, so
// `bun install` never pulls in the provider packages (hundreds of megabytes, and
// `scripts/ensure-packages-built.ts` would otherwise require them before every
// `bun run dev`). `/api/cloud-deploy` loads them with `await import(...)` only
// when someone deploys; an installation that deploys installs them beside the app.
//
// These declarations exist so `bun check` passes without them. The automation API
// and the core helpers are typed as the subset this directory calls, matching
// Pulumi's own signatures; the providers are left untyped, because the resource
// surface used here is large and a hand-written copy of it would only drift. An
// ambient declaration shadows a real package, so delete this file if the
// `@pulumi/*` packages are ever added as dependencies.

declare module "@pulumi/pulumi" {
  export interface Output<T> {
    apply<U>(fn: (value: T) => U | Output<U> | Promise<U>): Output<U>;
  }

  export function interpolate(
    literals: TemplateStringsArray,
    ...placeholders: unknown[]
  ): Output<string>;

  export class Config {
    constructor(name?: string);
    get(key: string): string | undefined;
    require(key: string): string;
  }
}

declare module "@pulumi/pulumi/automation" {
  export interface ConfigValue {
    value: string;
    secret?: boolean;
  }

  export interface OutputValue {
    value: unknown;
    secret: boolean;
  }

  export interface UpOptions {
    onOutput?: (out: string) => void;
  }

  export interface UpResult {
    stdout: string;
    stderr: string;
    outputs: Record<string, OutputValue>;
  }

  export interface Workspace {
    installPlugin(name: string, version: string, kind?: string): Promise<void>;
  }

  export interface Stack {
    readonly workspace: Workspace;
    setConfig(key: string, value: ConfigValue): Promise<void>;
    up(opts?: UpOptions): Promise<UpResult>;
  }

  export interface InlineProgramArgs {
    stackName: string;
    projectName: string;
    program: () => Promise<Record<string, unknown> | void>;
  }

  export interface LocalWorkspaceOptions {
    envVars?: Record<string, string>;
  }

  export class LocalWorkspace {
    static createOrSelectStack(
      args: InlineProgramArgs,
      opts?: LocalWorkspaceOptions
    ): Promise<Stack>;
  }
}

declare module "@pulumi/aws";
declare module "@pulumi/azure-native";
declare module "@pulumi/docker";
declare module "@pulumi/gcp";
declare module "@pulumi/oci";
