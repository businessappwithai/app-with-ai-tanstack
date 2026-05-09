import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration for Complete E2E Tests
 * Tests run against already-running servers on different ports
 *
 * Test suites:
 * - nextjs-nestjs: Original CRUD tests for Next.js + NestJS stack
 * - odata-ui5: Original CRUD tests for OpenUI5 + OData V4 stack
 * - dictionary-nextjs: Compiere dictionary tests for NestJS API & Next.js admin UI
 * - dictionary-odata: Compiere dictionary tests for OData API & OpenUI5 metadata-driven UI
 * - dictionary-generator: Validates DictionaryGenerator output correctness
 * - generator: Tests the ERDwithAI generator UI workflow
 * - hospital-nextjs-nestjs: Hospital Management System (Next.js + NestJS) E2E tests
 * - hospital-odata-ui5: Hospital Management System (OpenUI5 + OData V4) E2E tests
 * - crm-nextjs-nestjs: CRM System (Next.js + NestJS) E2E tests
 */
export default defineConfig({
  testDir: "./complete-tests",
  testMatch: ["**/*.e2e-test.ts"],
  fullyParallel: false, // Run tests sequentially for state management
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "test-results/html" }],
    ["json", { outputFile: "test-results/results.json" }],
    ["junit", { outputFile: "test-results/results.xml" }],
  ],

  use: {
    baseURL: process.env.FRONTEND_URL || "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: "nextjs-nestjs",
      use: { ...devices["Desktop Chrome"] },
      testMatch: ["nextjs-nestjs.e2e-test.ts"],
      dependencies: [],
    },
    {
      name: "odata-ui5",
      use: { ...devices["Desktop Chrome"] },
      testMatch: ["odata-ui5.e2e-test.ts"],
      dependencies: [],
    },
    {
      name: "dictionary-nextjs",
      use: { ...devices["Desktop Chrome"] },
      testMatch: ["nextjs-nestjs-dictionary.e2e-test.ts"],
      dependencies: [],
    },
    {
      name: "dictionary-odata",
      use: { ...devices["Desktop Chrome"] },
      testMatch: ["odata-ui5-dictionary.e2e-test.ts"],
      dependencies: [],
    },
    {
      name: "dictionary-generator",
      use: { ...devices["Desktop Chrome"] },
      testMatch: ["dictionary-generator.e2e-test.ts"],
      dependencies: [],
    },
    {
      name: "hospital-nextjs-nestjs",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.HOSPITAL_FRONTEND_URL || "http://localhost:3000",
      },
      testMatch: ["hospital-nextjs-nestjs.e2e-test.ts"],
      dependencies: [],
    },
    {
      name: "hospital-odata-ui5",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.HOSPITAL_UI5_URL || "http://localhost:3004",
      },
      testMatch: ["hospital-odata-ui5.e2e-test.ts"],
      dependencies: [],
    },
    {
      name: "crm-nextjs-nestjs",
      use: {
        ...devices["Desktop Chrome"],
        baseURL:
          process.env.CRM_FRONTEND_URL || process.env.FRONTEND_URL || "http://localhost:3000",
      },
      testMatch: ["crm-nextjs-nestjs.e2e-test.ts"],
      dependencies: [],
    },
  ],

  // Don't start a web server - we'll use the already-running servers
  webServer: undefined,
});
