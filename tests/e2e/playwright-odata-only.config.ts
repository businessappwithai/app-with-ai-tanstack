import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration for OData UI5 Tests Only
 */
export default defineConfig({
  testDir: "./complete-tests",
  testMatch: "**/odata-ui5.e2e-test.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "test-results/odata-ui5/html" }],
    ["json", { outputFile: "test-results/odata-ui5/results.json" }],
    ["junit", { outputFile: "test-results/odata-ui5/results.xml" }],
  ],

  use: {
    baseURL: (process.env.UI5_FRONTEND_URL || "http://localhost:8080") + "/index.html",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: "odata-ui5",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: undefined,
});
