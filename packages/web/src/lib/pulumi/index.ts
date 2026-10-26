import { spawn } from "node:child_process";

/** Whether the `pulumi` binary is reachable, and why not when it is not. */
export async function pulumiAvailable(): Promise<{ ok: boolean; reason?: string }> {
  return new Promise((resolve) => {
    const probe = spawn("pulumi", ["version"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    probe.stderr.on("data", (chunk) => { stderr += String(chunk); });
    probe.on("error", () =>
      resolve({
        ok: false,
        reason:
          "the pulumi command is not installed. Install it from https://www.pulumi.com/docs/install/",
      })
    );
    probe.on("close", (code) => {
      if (code === 0) return resolve({ ok: true });
      resolve({ ok: false, reason: stderr.trim() || "pulumi exited with non-zero status" });
    });
  });
}

export { deployAWS } from "./aws";
export { deployGCP } from "./gcp";
export { deployAzure } from "./azure";
export { deployOracle } from "./oracle";
export type {
  CloudProvider,
  AWSCredentials,
  GCPCredentials,
  AzureCredentials,
  OracleCredentials,
  CloudCredentials,
  DeployInput,
} from "./types";
