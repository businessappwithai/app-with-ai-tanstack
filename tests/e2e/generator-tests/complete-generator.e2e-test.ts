/**
 * Comprehensive E2E Tests for ERDwithAI Generator
 * Tests all framework generators and their generated applications
 */

import { expect, test } from "@playwright/test";

/**
 * Test Data
 */
const TEST_PROJECTS = {
  nextjsNestjs: {
    name: "Test Next.js NestJS App",
    description: "Full stack application with Next.js and NestJS",
    stackType: "nestjs-nextjs" as const,
  },
  odataUi5: {
    name: "Test OData UI5 App",
    description: "Enterprise application with OData and OpenUI5",
    stackType: "odata-ui5" as const,
  },
};

const TEST_ERD = `erDiagram
    Customer ||--o{ Order : places
    Customer {
        string id PK
        string name
        string email
        datetime createdAt
    }
    Order {
        string id PK
        string customerId FK
        decimal total
        string status
        datetime createdAt
    }
}`;

/**
 * Test Suite: ERDwithAI Generator Application
 */
test.describe("ERDwithAI Generator", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto("/");

    // Wait for page to load
    await page.waitForLoadState("networkidle");
  });

  test("should display home page with project list", async ({ page }) => {
    // Check header
    await expect(page.locator("h1, h2").filter({ hasText: /ERD|Builder/i })).toBeVisible();

    // Check for new project button
    await expect(
      page
        .locator('button:has-text("New Project")')
        .or(page.locator('button:has-text("Create")'))
        .or(page.locator('[data-testid="new-project-btn"]'))
        .first()
    ).toBeVisible();
  });

  test("should create a new Next.js NestJS project", async ({ page }) => {
    // Click new project button
    await page.click(
      'button:has-text("New Project"), button:has-text("Create"), [data-testid="new-project-btn"]'
    );

    // Wait for navigation
    await page.waitForURL(/\/projects\/[a-f0-9-]+\/init/);

    // Fill in project details
    await page.fill('input[name="name"], input#project-name', TEST_PROJECTS.nextjsNestjs.name);
    await page.fill(
      'textarea[name="description"], textarea#project-description',
      TEST_PROJECTS.nextjsNestjs.description
    );

    // Submit the form
    await page.click(
      'button[type="submit"]:has-text("Save"), button:has-text("Continue"), button:has-text("Next")'
    );

    // Wait for redirect to design page
    await page.waitForURL(/\/projects\/[a-f0-9-]+\/design/, { timeout: 10000 });
  });

  test("should create a new OData UI5 project", async ({ page }) => {
    // Click new project button
    await page.click(
      'button:has-text("New Project"), button:has-text("Create"), [data-testid="new-project-btn"]'
    );

    // Wait for navigation
    await page.waitForURL(/\/projects\/[a-f0-9-]+\/init/);

    // Fill in project details
    await page.fill('input[name="name"], input#project-name', TEST_PROJECTS.odataUi5.name);
    await page.fill(
      'textarea[name="description"], textarea#project-description',
      TEST_PROJECTS.odataUi5.description
    );

    // Change stack type if UI allows (currently read-only)
    // For now, we'll accept the default

    // Submit the form
    await page.click(
      'button[type="submit"]:has-text("Save"), button:has-text("Continue"), button:has-text("Next")'
    );

    // Wait for redirect to design page
    await page.waitForURL(/\/projects\/[a-f0-9-]+\/design/, { timeout: 10000 });
  });

  test("should design ERD for a project", async ({ page }) => {
    // Create and navigate to a project
    await page.click(
      'button:has-text("New Project"), button:has-text("Create"), [data-testid="new-project-btn"]'
    );
    await page.waitForURL(/\/projects\/[a-f0-9-]+\/init/);

    await page.fill('input[name="name"], input#project-name', TEST_PROJECTS.nextjsNestjs.name);
    await page.fill(
      'textarea[name="description"], textarea#project-description',
      TEST_PROJECTS.nextjsNestjs.description
    );
    await page.click(
      'button[type="submit"]:has-text("Save"), button:has-text("Continue"), button:has-text("Next")'
    );
    await page.waitForURL(/\/projects\/[a-f0-9-]+\/design/);

    // Enter ERD code
    const erdEditor = page
      .locator(
        'textarea[placeholder*="Mermaid"], textarea[name="erdCode"], [data-testid="erd-editor"], .monaco-editor textarea'
      )
      .first();
    await erdEditor.fill(TEST_ERD);

    // Validate ERD
    await page.click('button:has-text("Validate"), button:has-text("Check")');

    // Wait for validation (may show errors or success)
    await page.waitForTimeout(2000);

    // Save the design
    await page.click(
      'button:has-text("Save"), button:has-text("Continue"), button:has-text("Next")'
    );

    // Wait for redirect to generate page
    await page.waitForURL(/\/projects\/[a-f0-9-]+\/generate/, { timeout: 10000 });
  });

  test("should generate Next.js NestJS application", async ({ page }) => {
    // Create project and design ERD
    await page.click(
      'button:has-text("New Project"), button:has-text("Create"), [data-testid="new-project-btn"]'
    );
    await page.waitForURL(/\/projects\/[a-f0-9-]+\/init/);

    await page.fill('input[name="name"], input#project-name', TEST_PROJECTS.nextjsNestjs.name);
    await page.fill(
      'textarea[name="description"], textarea#project-description',
      TEST_PROJECTS.nextjsNestjs.description
    );
    await page.click(
      'button[type="submit"]:has-text("Save"), button:has-text("Continue"), button:has-text("Next")'
    );
    await page.waitForURL(/\/projects\/[a-f0-9-]+\/design/);

    const erdEditor = page
      .locator(
        'textarea[placeholder*="Mermaid"], textarea[name="erdCode"], [data-testid="erd-editor"], .monaco-editor textarea'
      )
      .first();
    await erdEditor.fill(TEST_ERD);
    await page.click(
      'button:has-text("Save"), button:has-text("Continue"), button:has-text("Next")'
    );
    await page.waitForURL(/\/projects\/[a-f0-9-]+\/generate/);

    // Generate the application
    await page.click(
      'button:has-text("Generate"), button:has-text("Build"), button:has-text("Create Application")'
    );

    // Wait for generation to complete
    await expect(
      page
        .locator("text=Generating, text=Building, text=Creating")
        .or(page.locator('.progress, [role="progressbar"]'))
    ).toBeVisible();

    // Wait for success message (may take several minutes)
    await expect(
      page
        .locator("text=Success, text=Complete, text=Generated, text=Ready")
        .or(page.locator('button:has-text("Deploy"), button:has-text("Run")'))
    ).toBeVisible({ timeout: 300000 });
  });

  test("should generate OData UI5 application", async ({ page }) => {
    // Create project with OData UI5 stack
    await page.click(
      'button:has-text("New Project"), button:has-text("Create"), [data-testid="new-project-btn"]'
    );
    await page.waitForURL(/\/projects\/[a-f0-9-]+\/init/);

    await page.fill('input[name="name"], input#project-name', TEST_PROJECTS.odataUi5.name);
    await page.fill(
      'textarea[name="description"], textarea#project-description',
      TEST_PROJECTS.odataUi5.description
    );
    await page.click(
      'button[type="submit"]:has-text("Save"), button:has-text("Continue"), button:has-text("Next")'
    );
    await page.waitForURL(/\/projects\/[a-f0-9-]+\/design/);

    const erdEditor = page
      .locator(
        'textarea[placeholder*="Mermaid"], textarea[name="erdCode"], [data-testid="erd-editor"], .monaco-editor textarea'
      )
      .first();
    await erdEditor.fill(TEST_ERD);
    await page.click(
      'button:has-text("Save"), button:has-text("Continue"), button:has-text("Next")'
    );
    await page.waitForURL(/\/projects\/[a-f0-9-]+\/generate/);

    // Generate the application
    await page.click(
      'button:has-text("Generate"), button:has-text("Build"), button:has-text("Create Application")'
    );

    // Wait for generation to complete
    await expect(
      page
        .locator("text=Success, text=Complete, text=Generated, text=Ready")
        .or(page.locator('button:has-text("Deploy"), button:has-text("Run")'))
    ).toBeVisible({ timeout: 300000 });
  });
});

/**
 * Test Suite: Generated Next.js Application
 */
test.describe("Generated Next.js Application", () => {
  let generatedAppUrl: string;

  test.beforeAll(async ({ browser: _browser }) => {
    // This would typically start the generated application
    // For now, we'll assume it's running on a specific port
    generatedAppUrl = "http://localhost:3001";
  });

  test("should display customer list", async ({ page }) => {
    await page.goto(`${generatedAppUrl}/customers`);

    // Check table is visible
    await expect(page.locator("table").first()).toBeVisible();

    // Check for page heading
    await expect(page.locator("h1, h2").filter({ hasText: /Customer/i })).toBeVisible();
  });

  test("should create a new customer", async ({ page }) => {
    await page.goto(`${generatedAppUrl}/customers`);

    // Click new/create button
    await page.click('button:has-text("New"), button:has-text("Create"), button:has-text("Add")');

    // Fill out form
    await page.fill('input[name="name"], input#name', "Test Customer");
    await page.fill('input[name="email"], input#email', "test@example.com");

    // Submit form
    await page.click(
      'button[type="submit"]:has-text("Save"), button:has-text("Create"), button:has-text("Submit")'
    );

    // Verify success or redirect
    await expect(
      page
        .locator("text=success, text=created, text=Success")
        .or(page.locator('h1:has-text("Test Customer")'))
    ).toBeVisible({ timeout: 5000 });
  });

  test("should view customer details", async ({ page }) => {
    await page.goto(`${generatedAppUrl}/customers`);

    // Click on first item
    await page.click(
      'table tbody tr:first-child a, table tbody tr:first-child button:has-text("View")'
    );

    // Verify detail page
    await expect(page.locator("h1, h2").filter({ hasText: /Customer/i })).toBeVisible();
    await expect(
      page.locator("text=Test Customer").or(page.locator("text=test@example.com"))
    ).toBeVisible();
  });

  test("should update a customer", async ({ page }) => {
    await page.goto(`${generatedAppUrl}/customers`);

    // Click edit on first item
    await page.click('table tbody tr:first-child a:has-text("Edit"), button:has-text("Edit")');

    // Update field
    await page.fill('input[name="name"], input#name', "Updated Customer");

    // Save
    await page.click('button[type="submit"]:has-text("Save"), button:has-text("Update")');

    // Verify success
    await expect(page.locator("text=updated, text=success, text=Success")).toBeVisible({
      timeout: 5000,
    });
  });

  test("should delete a customer", async ({ page }) => {
    await page.goto(`${generatedAppUrl}/customers`);

    // Get initial count
    const initialCount = await page.locator("table tbody tr").count();

    // Click delete on first item
    await page.click('table tbody tr:first-child button:has-text("Delete")');

    // Confirm if modal appears
    const confirmButton = page.locator(
      'button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")'
    );
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Verify deletion
    await expect(page.locator("table tbody tr")).toHaveCount(initialCount - 1);
  });

  test("should display order list with customer relationship", async ({ page }) => {
    await page.goto(`${generatedAppUrl}/orders`);

    // Check table
    await expect(page.locator("table").first()).toBeVisible();

    // Check for customer reference
    await expect(page.locator("text=Customer").or(page.locator("text=customer"))).toBeVisible();
  });
});

/**
 * Test Suite: Generated NestJS Backend
 */
test.describe("Generated NestJS Backend API", () => {
  const apiBaseUrl = "http://localhost:3002";

  test("should return customer list", async ({ request }) => {
    const response = await request.get(`${apiBaseUrl}/customers`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test("should create a new customer", async ({ request }) => {
    const newCustomer = {
      name: "API Test Customer",
      email: "apitest@example.com",
    };

    const response = await request.post(`${apiBaseUrl}/customers`, {
      data: newCustomer,
    });

    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data).toMatchObject({
      name: newCustomer.name,
      email: newCustomer.email,
    });
  });

  test("should get customer by ID", async ({ request }) => {
    // First create a customer
    const newCustomer = {
      name: "Get Test Customer",
      email: "gettest@example.com",
    };

    const createResponse = await request.post(`${apiBaseUrl}/customers`, {
      data: newCustomer,
    });

    const created = await createResponse.json();

    // Get the customer
    const response = await request.get(`${apiBaseUrl}/customers/${created.id}`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toMatchObject({
      id: created.id,
      name: newCustomer.name,
    });
  });

  test("should update a customer", async ({ request }) => {
    // First create a customer
    const newCustomer = {
      name: "Update Test Customer",
      email: "updatetest@example.com",
    };

    const createResponse = await request.post(`${apiBaseUrl}/customers`, {
      data: newCustomer,
    });

    const created = await createResponse.json();

    // Update the customer
    const updates = {
      name: "Updated Customer",
    };

    const response = await request.patch(`${apiBaseUrl}/customers/${created.id}`, {
      data: updates,
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.name).toBe(updates.name);
  });

  test("should delete a customer", async ({ request }) => {
    // First create a customer
    const newCustomer = {
      name: "Delete Test Customer",
      email: "deletetest@example.com",
    };

    const createResponse = await request.post(`${apiBaseUrl}/customers`, {
      data: newCustomer,
    });

    const created = await createResponse.json();

    // Delete the customer
    const response = await request.delete(`${apiBaseUrl}/customers/${created.id}`);

    expect(response.status()).toBe(200);

    // Verify deletion
    const getResponse = await request.get(`${apiBaseUrl}/customers/${created.id}`);
    expect(getResponse.status()).toBe(404);
  });
});

/**
 * Test Suite: Generated OData Backend
 */
test.describe("Generated OData Backend API", () => {
  const odataBaseUrl = "http://localhost:3003";

  test("should return customer collection", async ({ request }) => {
    const response = await request.get(`${odataBaseUrl}/odata/Customers`);

    expect(response.status()).toBe(200);

    const text = await response.text();
    expect(text).toContain("value");
  });

  test("should create a new customer via OData", async ({ request }) => {
    const newCustomer = {
      Name: "OData Test Customer",
      Email: "odatatest@example.com",
    };

    const response = await request.post(`${odataBaseUrl}/odata/Customers`, {
      data: newCustomer,
      headers: {
        "Content-Type": "application/json",
      },
    });

    expect(response.status()).toBe(201);
  });

  test("should support OData $top query", async ({ request }) => {
    const response = await request.get(`${odataBaseUrl}/odata/Customers?$top=5`);

    expect(response.status()).toBe(200);
  });

  test("should support OData $filter query", async ({ request }) => {
    const response = await request.get(`${odataBaseUrl}/odata/Customers?$filter=Name eq 'Test'`);

    expect(response.status()).toBe(200);
  });
});

/**
 * Test Suite: Generated OpenUI5 Application
 */
test.describe("Generated OpenUI5 Application", () => {
  const ui5AppUrl = "http://localhost:3004";

  test("should display master list", async ({ page }) => {
    await page.goto(ui5AppUrl);

    // Wait for app to load
    await page.waitForLoadState("networkidle");

    // Check for list or table
    await expect(page.locator(".sapMList, .sapMTable, table[data-sap-ui]").first()).toBeVisible();
  });

  test("should navigate to detail page", async ({ page }) => {
    await page.goto(ui5AppUrl);

    // Wait for app to load
    await page.waitForLoadState("networkidle");

    // Click on first item
    await page.click(".sapMListItems .sapMLIBActive, .sapMList .sapMLIB");

    // Wait for navigation
    await page.waitForTimeout(1000);

    // Check for detail page elements
    await expect(page.locator(".sapMObjectHeader, .sapMPageHeader").first()).toBeVisible();
  });

  test("should create new item", async ({ page }) => {
    await page.goto(ui5AppUrl);

    // Wait for app to load
    await page.waitForLoadState("networkidle");

    // Click create button
    await page.click(
      'button:has-text("Create"), button[data-icon="add"], .sapMBtnIcon[data-icon="add"]'
    );

    // Fill form
    await page.fill('input[name="name"], input[placeholder*="Name"]', "UI5 Test Item");

    // Save
    await page.click('button:has-text("Save"), button[data-icon="save"]');

    // Wait for navigation back to list
    await page.waitForTimeout(2000);
  });
});

/**
 * Test Suite: Complete Workflow Integration
 */
test.describe("Complete Workflow Integration", () => {
  test("should complete full workflow: Create -> Design -> Generate -> Deploy", async ({
    page,
  }) => {
    // Create project
    await page.goto("/");
    await page.click('button:has-text("New Project"), button:has-text("Create")');
    await page.waitForURL(/\/projects\/[a-f0-9-]+\/init/);

    await page.fill('input[name="name"]', "Integration Test Project");
    await page.fill('textarea[name="description"]', "End-to-end integration test");
    await page.click('button[type="submit"]');

    // Design ERD
    await page.waitForURL(/\/projects\/[a-f0-9-]+\/design/);
    const erdEditor = page.locator("textarea").first();
    await erdEditor.fill(TEST_ERD);
    await page.click('button:has-text("Save")');

    // Generate
    await page.waitForURL(/\/projects\/[a-f0-9-]+\/generate/);
    await page.click('button:has-text("Generate")');

    // Wait for generation
    await expect(page.locator("text=Success, text=Complete, text=Generated")).toBeVisible({
      timeout: 300000,
    });

    // Navigate to deploy
    await page.click('a:has-text("Deploy"), button:has-text("Next")');
    await page.waitForURL(/\/projects\/[a-f0-9-]+\/deploy/);

    // Deploy application
    await page.click('button:has-text("Deploy"), button:has-text("Start"), button:has-text("Run")');

    // Wait for deployment
    await expect(page.locator("text=Running, text=Active, text=Deployed")).toBeVisible({
      timeout: 60000,
    });

    // Get deployment URL
    const deploymentUrl = await page.locator('a[href^="http"]').first().getAttribute("href");

    // Verify deployment
    if (deploymentUrl) {
      const newPage = await page.context().newPage();
      await newPage.goto(deploymentUrl);

      // Check deployed app is working
      await expect(newPage.locator("h1, h2").first()).toBeVisible();
      await newPage.close();
    }
  });
});
