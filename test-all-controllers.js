import { spawn } from "child_process";
import { existsSync } from "fs";
import * as path from "path";

const BACKEND_DIR = path.join(
  process.cwd(),
  "generated-projects/proj_1769269156396_69m2d66eu/backend"
);
const SERVER_PORT = 3002;

console.log("Starting backend server...");
const server = spawn("bun", ["start"], {
  cwd: BACKEND_DIR,
  stdio: "pipe",
  detached: true,
});

server.unref();

// Wait for server to start
await new Promise((resolve) => setTimeout(resolve, 10000));

console.log("Testing OData endpoints...\n");

// Test each endpoint
const endpoints = [
  { name: "SysReferences", path: "/odata/SysReferences" },
  { name: "SysRefLists", path: "/odata/SysRefLists" },
  { name: "SysValRules", path: "/odata/SysValRules" },
  { name: "SysTables", path: "/odata/SysTables" },
  { name: "SysColumns", path: "/odata/SysColumns" },
  { name: "SysWindows", path: "/odata/SysWindows" },
  { name: "SysTabs", path: "/odata/SysTabs" },
  { name: "SysFields", path: "/odata/SysFields" },
  { name: "SysRoles", path: "/odata/SysRoles" },
  { name: "SysUsers", path: "/odata/SysUsers" },
  { name: "SysUserRoles", path: "/odata/SysUserRoles" },
  { name: "SysAccess", path: "/odata/SysAccess" },
];

let passCount = 0;
let failCount = 0;

for (const endpoint of endpoints) {
  try {
    const response = await fetch(`http://localhost:${SERVER_PORT}${endpoint.path}?$top=1`);
    const text = await response.text();

    if (response.ok) {
      console.log(`✅ ${endpoint.name}: PASS (HTTP ${response.status})`);
      passCount++;
    } else {
      console.log(`❌ ${endpoint.name}: FAIL (HTTP ${response.status})`);
      console.log(`   Error: ${text.substring(0, 200)}`);
      failCount++;
    }
  } catch (error) {
    console.log(`❌ ${endpoint.name}: ERROR - ${error.message}`);
    failCount++;
  }
}

console.log(`\n📊 Results: ${passCount} passed, ${failCount} failed`);

// Kill server
const killCommand = spawn("lsof", ["-ti", ":3002"], { stdio: "pipe" });
killCommand.on("close", () => {
  spawn("kill", ["-9", "3002"], { stdio: "inherit" });
});

process.exit(failCount > 0 ? 1 : 0);
