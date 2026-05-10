/**
 * CLI Executor Utility
 *
 * Handles execution of external CLI commands (NestJS, TanStack Start, etc.)
 * with proper error handling and logging.
 */

import { execSync, spawn } from "child_process";
import * as path from "path";
import * as fs from "fs/promises";

export interface CliExecutorOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  stdio?: "pipe" | "inherit";
  timeout?: number;
}

export class CliExecutor {
  /**
   * Execute a CLI command synchronously
   */
  static executeSync(
    command: string,
    args: string[],
    options: CliExecutorOptions = {}
  ): string {
    const cwd = options.cwd || process.cwd();
    const env = { ...process.env, ...options.env };
    const fullCommand = `${command} ${args.join(" ")}`;

    try {
      console.log(`  🔧 Running: ${fullCommand}`);
      const output = execSync(fullCommand, {
        cwd,
        env,
        stdio: options.stdio || "pipe",
        timeout: options.timeout || 300000, // 5 minute default timeout
        encoding: "utf-8",
      });
      return output;
    } catch (error) {
      const err = error as Error & { status?: number };
      console.error(`  ❌ Command failed: ${fullCommand}`);
      console.error(`  Error: ${err.message}`);
      throw new Error(`Failed to execute: ${fullCommand}`);
    }
  }

  /**
   * Execute a CLI command asynchronously
   */
  static async executeAsync(
    command: string,
    args: string[],
    options: CliExecutorOptions = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const cwd = options.cwd || process.cwd();
      const env = { ...process.env, ...options.env };

      console.log(`  🔧 Running: ${command} ${args.join(" ")}`);

      const child = spawn(command, args, {
        cwd,
        env,
        stdio: options.stdio === "inherit" ? "inherit" : ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      if (options.stdio !== "inherit") {
        child.stdout?.on("data", (data) => {
          stdout += data.toString();
        });
        child.stderr?.on("data", (data) => {
          stderr += data.toString();
        });
      }

      const timeout = options.timeout || 300000; // 5 minute default timeout
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`Command timeout after ${timeout}ms: ${command} ${args.join(" ")}`));
      }, timeout);

      child.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve(stdout);
        } else {
          console.error(`  ❌ Command failed with code ${code}: ${command} ${args.join(" ")}`);
          if (stderr) console.error(`  Error output:\n${stderr}`);
          reject(new Error(`Command failed with code ${code}: ${command}`));
        }
      });

      child.on("error", (error) => {
        clearTimeout(timer);
        console.error(`  ❌ Failed to start process: ${command}`);
        reject(error);
      });
    });
  }

  /**
   * Check if a command is available in PATH
   */
  static isCommandAvailable(command: string): boolean {
    try {
      execSync(`which ${command}`, { stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the version of a CLI tool
   */
  static getCommandVersion(command: string, versionFlag = "--version"): string | null {
    try {
      const output = execSync(`${command} ${versionFlag}`, {
        stdio: "pipe",
        encoding: "utf-8",
        timeout: 5000,
      });
      return output.trim();
    } catch {
      return null;
    }
  }

  /**
   * Check if a directory exists and has content
   */
  static async isDirectoryEmpty(dirPath: string): Promise<boolean> {
    try {
      const entries = await fs.readdir(dirPath);
      return entries.length === 0;
    } catch {
      return true; // Directory doesn't exist
    }
  }

  /**
   * Remove directory recursively
   */
  static async removeDirectory(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Warning: Could not remove directory ${dirPath}`);
    }
  }

  /**
   * Copy directory recursively
   */
  static async copyDirectory(src: string, dest: string): Promise<void> {
    try {
      await fs.cp(src, dest, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to copy directory from ${src} to ${dest}`);
    }
  }
}
