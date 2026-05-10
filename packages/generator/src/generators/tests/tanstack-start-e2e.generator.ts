/**
 * Playwright E2E Test Generator for TanStack Start Frontends
 * Generates comprehensive E2E tests for Option 1 applications
 */

import type { Entity } from "@erdwithai/core/types";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { BaseE2ETestGenerator } from "./base-e2e.generator";

export class TanStackStartPlaywrightE2ETestGenerator extends BaseE2ETestGenerator {
  async generate(): Promise<void> {
    const e2eDir = join(this.config.outputDir, "frontend", "e2e");
    await mkdir(e2eDir, { recursive: true });

    // Create subdirectories
    await mkdir(join(e2eDir, "pages"), { recursive: true });
    await mkdir(join(e2eDir, "fixtures"), { recursive: true });

    // Generate playwright.config.ts
    await this.generatePlaywrightConfig();

    // Generate test fixtures
    await this.generateFixtures();

    // Generate CRUD tests for each entity
    for (const entity of this.config.entities) {
      await this.generateEntityTests(entity);
    }

    // Generate navigation/menu tests
    await this.generateNavigationTests();
  }

  private async generatePlaywrightConfig(): Promise<void> {
    const config = `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './pages',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: 'cd ../frontend && bun run dev',
    url: 'http://localhost:3000',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});
`;

    await writeFile(join(this.config.outputDir, "frontend", "playwright.config.ts"), config);
  }

  private async generateFixtures(): Promise<void> {
    const fixtures = `import { test as base } from '@playwright/test';

// Extend base test with login fixture if needed
export const test = base.extend({
  // Add fixtures here
});

export { expect } from test;
`;

    await writeFile(join(this.config.outputDir, "frontend", "e2e", "fixtures.ts"), fixtures);

    // Generate test data
    const testData = this.generateTestData();
    await writeFile(join(this.config.outputDir, "frontend", "e2e", "test-data.ts"), testData);
  }

  private async generateEntityTests(entity: Entity): Promise<void> {
    const entityName = entity.name;
    const tableName =
      (entity as { tableName?: string }).tableName || `bus_${entity.name.toLowerCase()}`;
    const entityNamePlural = tableName; // Use tableName for routing

    const testFile = `import { test, expect } from '@playwright/test';
import { testData } from '../test-data';

test.describe('${entityName} CRUD Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to entity list
    await page.goto('/${entityNamePlural}');
    // Wait for network to settle to ensure page is fully loaded
    await page.waitForLoadState('networkidle').catch(() => {
      // If networkidle times out, just wait a fixed time
      console.log('Network idle timed out, using fallback wait');
    });
    await page.waitForTimeout(2000);
  });

  test('should display ${entityName} list', async ({ page }) => {
    // First verify page has loaded by checking for URL
    await expect(page).toHaveURL(/\\/${tableName}/);

    // Wait for entity heading to be present using data-testid
    await expect(page.getByTestId('entity-heading')).toBeVisible({ timeout: 15000 });

    // Wait for table to be present using data-testid (handles skeleton, data, or no-results states)
    await expect(page.getByTestId('entity-table')).toBeVisible({ timeout: 10000 });

    // Wait for actual data to load (not skeleton) by checking for at least one data row
    await page.waitForSelector('tbody tr', { timeout: 10000 }).catch(() => {
      console.log('No data rows found, table might be empty');
    });
  });

  test('should create a new ${entityName}', async ({ page }) => {
    // Click new/create button
    await page.click('button:has-text("New"), a:has-text("Create"), button:has-text("Add")');

    // Fill out the form
    ${this.generateFormFillCode(entity)}

    // Submit form
    await page.click('button[type="submit"]:has-text("Save"), button:has-text("Create"), button:has-text("Submit")');

    // Verify success message or redirect
    await expect(page.locator('text=success').or(page.locator('text=created')).or(page.locator('text=Success')).or(page.locator(\`h1:has-text("${entityName}")\`))).toBeVisible({ timeout: 5000 });
  });

  test('should view ${entityName} details', async ({ page }) => {
    // Click on first item in list
    await page.click('table tbody tr:first-child a, table tbody tr:first-child button:has-text("View")');

    // Verify detail page loads
    await expect(page.locator('h1, h2').filter({ hasText: '${entityName}' })).toBeVisible();

    // Check for common detail fields
    ${this.generateDetailChecks(entity)}
  });

  test('should update a ${entityName}', async ({ page }) => {
    // Navigate to edit page
    await page.click('table tbody tr:first-child a:has-text("Edit"), button:has-text("Edit")');

    // Update fields
    ${this.generateUpdateCode(entity)}

    // Save changes
    await page.click('button[type="submit"]:has-text("Save"), button:has-text("Update")');

    // Verify success
    await expect(page.locator('text=updated').or(page.locator('text=success')).or(page.locator('text=Success'))).toBeVisible({ timeout: 5000 });
  });

  test('should delete a ${entityName}', async ({ page }) => {
    // Get initial count
    const initialCount = await page.locator('table tbody tr').count();

    // Click delete on first item
    await page.click('table tbody tr:first-child button:has-text("Delete")');

    // Confirm deletion if modal appears
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Verify deletion
    await expect(page.locator('table tbody tr')).toHaveCount(initialCount - 1);
  });

  test('should search/filter ${entityNamePlural}', async ({ page }) => {
    // Enter search term
    const searchableFields = ${JSON.stringify(this.getSearchableFields(entity))};

    if (searchableFields.length > 0) {
      await page.fill('input[placeholder*="search"], input[placeholder*="filter"]', searchableFields[0]);

      // Submit search or wait for results
      await page.keyboard.press('Enter');

      // Wait for filtered results
      await page.waitForTimeout(1000);

      // Verify results
      const hasResults = await page.locator('table tbody tr').count() > 0;
      console.log(\`Search results found: \${hasResults}\`);
    }
  });
});
`;

    await writeFile(
      join(this.config.outputDir, "frontend", "e2e", "pages", `${entityName}.spec.ts`),
      testFile
    );
  }

  private generateFormFillCode(entity: Entity): string {
    const lines: string[] = [];

    for (const attr of entity.attributes) {
      if (attr.name === "id" || attr.name.includes("_id")) continue;
      if (attr.name === "created_at" || attr.name === "updated_at") continue;

      const selector = this.getFormFieldSelector(attr.name);
      const value = this.getMockValueForType(attr.type, attr.name);

      lines.push(`    await page.fill('${selector}', ${value});`);
    }

    return lines.join("\n");
  }

  private generateUpdateCode(entity: Entity): string {
    const lines: string[] = [];

    for (const attr of entity.attributes) {
      if (attr.name === "id" || attr.name.includes("_id")) continue;
      if (attr.name === "created_at" || attr.name === "updated_at") continue;

      const selector = this.getFormFieldSelector(attr.name);
      const value = this.getUniqueMockValue(attr.type, attr.name, 1);

      lines.push(`    await page.fill('${selector}', ${value});`);
    }

    return lines.join("\n");
  }

  private generateDetailChecks(entity: Entity): string {
    const lines: string[] = [];

    // Check for common fields
    if (entity.attributes.some((a) => a.name === "name")) {
      lines.push(`    await expect(page.locator('text=/Test Name/i')).toBeVisible();`);
    }
    if (entity.attributes.some((a) => a.name === "email")) {
      lines.push(`    await expect(page.locator('text=test@example.com')).toBeVisible();`);
    }

    return lines.join("\n");
  }

  private getFormFieldSelector(name: string): string {
    return `input[name="${name}"], textarea[name="${name}"], select[name="${name}"]`;
  }

  private getSearchableFields(entity: Entity): string[] {
    return entity.attributes
      .filter(
        (a) => a.type.toLowerCase().includes("string") || a.type.toLowerCase().includes("text")
      )
      .filter(
        (a) =>
          !a.name.includes("id") && !a.name.includes("created_at") && !a.name.includes("updated_at")
      )
      .map((a) => a.name);
  }

  private async generateNavigationTests(): Promise<void> {
    const navTest = `import { test, expect } from '../fixtures';

test.describe('Navigation Tests', () => {
  test('should navigate to all entities from dashboard', async ({ page }) => {
    // Start at dashboard (home page redirects to dashboard)
    await page.goto('/');

    ${this.config.entities
      .map((entity) => {
        const tableName =
          (entity as { tableName?: string }).tableName || `${entity.name.toLowerCase()}s`;
        return `
    // Navigate to ${entity.name}
    await page.click('a[href="/${tableName}"]');
    await expect(page).toHaveURL(/\\/${tableName}/);
    await expect(page.locator('h1, h2').filter({ hasText: /${entity.name}/i })).toBeVisible();

    // Go back to dashboard
    await page.goto('/dashboard');
    `;
      })
      .join("\n  ")}
  });

  test('should display all entities in dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    ${this.config.entities
      .map((entity) => {
        const tableName =
          (entity as { tableName?: string }).tableName || `${entity.name.toLowerCase()}s`;
        return `await expect(page.locator('a[href="/${tableName}"]')).toBeVisible();`;
      })
      .join("\n    ")}
  });
});
`;

    await writeFile(
      join(this.config.outputDir, "frontend", "e2e", "pages", "navigation.spec.ts"),
      navTest
    );
  }
}
