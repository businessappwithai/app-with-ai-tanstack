#!/usr/bin/env node
/**
 * Complete Hospital App Test
 * Tests 3 critical bug fixes in generator templates
 */

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const BACKEND_DIR =
  "/Users/pramodkoshy/projects/dynamic/test/app-with-ai/test-output/comprehensive-e2e/option1-sqlite/backend";
const FRONTEND_DIR =
  "/Users/pramodkoshy/projects/dynamic/test/app-with-ai/test-output/comprehensive-e2e/option1-sqlite/frontend";
const TEST_DIR = "/Users/pramodkoshy/projects/dynamic/test/app-with-ai";

let backendPid = null;
let frontendPid = null;

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function exec(command, options = {}) {
  try {
    const output = execSync(command, { encoding: "utf-8", ...options });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout || "" };
  }
}

function spawnProcess(command, args, cwd, logFile) {
  return new Promise((resolve, reject) => {
    const logStream = fs.createWriteStream(logFile);

    const proc = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });

    proc.stdout.pipe(logStream);
    proc.stderr.pipe(logStream);

    proc.on("error", (err) => {
      logStream.close();
      reject(err);
    });

    // Resolve immediately with PID
    setTimeout(() => {
      if (proc.pid) {
        logStream.close();
        resolve(proc.pid);
      }
    }, 2000);
  });
}

function killProcess(pid) {
  try {
    process.kill(pid, "SIGTERM");
  } catch (error) {
    // Process already dead
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  try {
    log("==========================================");
    log("Starting Complete Hospital App Test");
    log("Testing 3 Bug Fixes in Generator Templates");
    log("==========================================\n");

    // Step 1: Verify directories
    log("Step 1: Verifying directories...");
    if (!fs.existsSync(BACKEND_DIR)) {
      throw new Error(`Backend directory not found: ${BACKEND_DIR}`);
    }
    if (!fs.existsSync(FRONTEND_DIR)) {
      throw new Error(`Frontend directory not found: ${FRONTEND_DIR}`);
    }
    const migrationsDir = path.join(BACKEND_DIR, "migrations");
    const seedsDir = path.join(BACKEND_DIR, "seeds");
    if (!fs.existsSync(migrationsDir)) {
      throw new Error("Migrations directory not found");
    }
    if (!fs.existsSync(seedsDir)) {
      throw new Error("Seeds directory not found");
    }

    const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".ts"));
    const seedFiles = fs.readdirSync(seedsDir).filter((f) => f.endsWith(".ts"));

    log(`✅ Directories verified`);
    log(`   Migrations: ${migrationFiles.length}`);
    log(`   Seeds: ${seedFiles.length}\n`);

    // Step 2: Create data directory
    log("Step 2: Creating data directory...");
    const dataDir = path.join(BACKEND_DIR, "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    log("✅ Data directory created\n");

    // Step 3: Run migrations
    log("Step 3: Running migrations...");
    const migrateResult = exec("npx tsx run-migrations.ts", { cwd: BACKEND_DIR });
    if (migrateResult.success) {
      log("✅ Migrations completed\n");
    } else {
      log("❌ Migrations failed");
      log(migrateResult.output);
      throw new Error("Migration failed");
    }

    // Step 4: Run seeds
    log("Step 4: Running seeds...");
    const seedResult = exec("npx tsx run-seed.ts", { cwd: BACKEND_DIR });
    if (seedResult.success) {
      log("✅ Seeds completed\n");
    } else {
      log("❌ Seeds failed (continuing anyway)");
      log(seedResult.output);
    }

    // Step 5: Start backend
    log("Step 5: Starting backend server...");
    backendPid = await spawnProcess(
      "bun",
      ["run", "start:dev"],
      BACKEND_DIR,
      "/tmp/hospital-backend.log"
    );
    log(`✅ Backend started (PID: ${backendPid})\n`);

    await sleep(10);

    // Step 6: Start frontend
    log("Step 6: Starting frontend server...");
    frontendPid = await spawnProcess(
      "bun",
      ["run", "dev"],
      FRONTEND_DIR,
      "/tmp/hospital-frontend.log"
    );
    log(`✅ Frontend started (PID: ${frontendPid})\n`);

    await sleep(15);

    // Step 7: Run tests
    log("Step 7: Running Playwright tests...");
    const testResult = exec("npx tsx test-hospital-entities.ts", { cwd: TEST_DIR });

    log("\n==========================================");
    log("Test Results");
    log("==========================================\n");
    log(testResult.output);

    if (testResult.success) {
      log("\n✅ ALL TESTS PASSED");
      log("Verified Bug Fixes:");
      log("  ✅ Migration Template Fix (no duplicate columns)");
      log("  ✅ Frontend Data Display Fix (shows actual data)");
      log("  ✅ Knexfile Module Fix (ES modules work)");
    } else {
      log("\n❌ SOME TESTS FAILED");
    }
  } catch (error) {
    log(`\n❌ Error: ${error.message}`);
  } finally {
    // Cleanup
    log("\n==========================================");
    log("Cleaning up...");
    log("==========================================");

    if (backendPid) {
      killProcess(backendPid);
      log(`Killed backend (PID: ${backendPid})`);
    }
    if (frontendPid) {
      killProcess(frontendPid);
      log(`Killed frontend (PID: ${frontendPid})`);
    }

    // Show logs
    if (fs.existsSync("/tmp/hospital-backend.log")) {
      log("\n--- Backend Log (last 30 lines) ---");
      const backendLog = exec("tail -30 /tmp/hospital-backend.log").output || "";
      log(backendLog);
    }
    if (fs.existsSync("/tmp/hospital-frontend.log")) {
      log("\n--- Frontend Log (last 30 lines) ---");
      const frontendLog = exec("tail -30 /tmp/hospital-frontend.log").output || "";
      log(frontendLog);
    }

    log("\n✅ Cleanup complete");
  }
}

main();
