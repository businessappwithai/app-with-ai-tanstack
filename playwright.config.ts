import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration for ERDwithAI E2E Tests
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/*.e2e.spec.ts", "**/*.e2e-test.ts"],
  testIgnore: ["**/node_modules/**"],
  fullyParallel: false, // Run tests sequentially for state management
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  timeout: 180000, // Increase global timeout to 3 minutes
  reporter: [
    ["html"],
    ["json", { outputFile: "test-results/results.json" }],
    ["junit", { outputFile: "test-results/results.xml" }],
    ["list"],
  ],

  use: {
    baseURL: "http://localhost:5000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 60000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
});
