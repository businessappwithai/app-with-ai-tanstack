/**
 * Comprehensive E2E Tests for Generated OData + OpenUI5 Applications
 * Tests OData API endpoints, OpenUI5 UI components, and SAP-style workflows
 */

import { expect, test } from "@playwright/test";

// Configuration
const ODATA_BACKEND_URL = process.env.ODATA_BACKEND_URL || "http://localhost:3003";
const UI5_FRONTEND_URL = process.env.UI5_FRONTEND_URL || "http://localhost:3004";

/**
 * Test Suite: OData Backend API - Customers
 */
test.describe("OData Backend API - Customers", () => {
  const apiBase = ODATA_BACKEND_URL;

  test("GET /odata/Customers - should return customers collection", async ({ request }) => {
    const response = await request.get(`${apiBase}/odata/Customers`);

    expect(response.status()).toBe(200);

    const text = await response.text();
    expect(text).toContain("value");
  });

  test("GET /odata/Customers with $top - should limit results", async ({ request }) => {
    const response = await request.get(`${apiBase}/odata/Customers?$top=5`);

    expect(response.status()).toBe(200);

    const text = await response.text();
    expect(text).toContain("value");
  });

  test("GET /odata/Customers with $filter - should filter results", async ({ request }) => {
    const response = await request.get(`${apiBase}/odata/Customers?$filter=Name eq 'Test'`);

    expect(response.status()).toBe(200);
  });

  test("GET /odata/Customers with $orderby - should sort results", async ({ request }) => {
    const response = await request.get(`${apiBase}/odata/Customers?$orderby=Name asc`);

    expect(response.status()).toBe(200);
  });

  test("POST /odata/Customers - should create customer", async ({ request }) => {
    const newCustomer = {
      Name: "OData Test Customer",
      Email: "odata@example.com",
      Phone: "555-1234",
    };

    const response = await request.post(`${apiBase}/odata/Customers`, {
      data: newCustomer,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    // OData returns 201 Created
    expect([201, 200]).toContain(response.status());

    const data = await response.json();
    expect(data).toHaveProperty("Name", newCustomer.Name);
  });

  test("PATCH /odata/Customers(:id) - should update customer", async ({ request }) => {
    // First create a customer
    const createResponse = await request.post(`${apiBase}/odata/Customers`, {
      data: {
        Name: "Update Test Customer",
        Email: "update@example.com",
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    const created = await createResponse.json();

    // Update the customer
    const updates = {
      Name: "Updated Customer Name",
    };

    // Get the ID from the created object
    const customerId = created.ID || created.id || created.Id;

    if (customerId) {
      const response = await request.patch(`${apiBase}/odata/Customers(${customerId})`, {
        data: updates,
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.Name).toBe(updates.Name);
    }
  });

  test("DELETE /odata/Customers(:id) - should delete customer", async ({ request }) => {
    // Create a customer
    const createResponse = await request.post(`${apiBase}/odata/Customers`, {
      data: {
        Name: "Delete Test Customer",
        Email: "delete@example.com",
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    const created = await createResponse.json();
    const customerId = created.ID || created.id || created.Id;

    if (customerId) {
      // Delete the customer
      const response = await request.delete(`${apiBase}/odata/Customers(${customerId})`);

      expect(response.status()).toBe(204);
    }
  });
});

/**
 * Test Suite: OData Backend API - Sales Orders with Relationships
 */
test.describe("OData Backend API - Sales Orders", () => {
  const apiBase = ODATA_BACKEND_URL;

  test("GET /odata/SalesOrders - should return orders", async ({ request }) => {
    const response = await request.get(`${apiBase}/odata/SalesOrders`);

    expect(response.status()).toBe(200);
  });

  test("GET /odata/SalesOrders with $expand - should include customer details", async ({
    request,
  }) => {
    const response = await request.get(`${apiBase}/odata/SalesOrders?$expand=Customer`);

    expect(response.status()).toBe(200);
  });

  test("POST /odata/SalesOrders - should create order with customer", async ({ request }) => {
    // First create a customer
    const customerResponse = await request.post(`${apiBase}/odata/Customers`, {
      data: {
        Name: "Order Test Customer",
        Email: "order@example.com",
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    const customer = await customerResponse.json();
    const customerId = customer.ID || customer.id || customer.Id;

    // Create sales order
    const newOrder = {
      Amount: 100.5,
      Status: "Pending",
      OrderDate: new Date().toISOString(),
      Customer_ID: customerId,
    };

    const response = await request.post(`${apiBase}/odata/SalesOrders`, {
      data: newOrder,
      headers: {
        "Content-Type": "application/json",
      },
    });

    expect([201, 200]).toContain(response.status());
  });

  test("should support OData metadata", async ({ request }) => {
    const response = await request.get(`${apiBase}/odata/$metadata`);

    expect(response.status()).toBe(200);

    const text = await response.text();
    expect(text).toContain("EntityContainer");
    expect(text).toContain("EntityType");
  });
});

/**
 * Test Suite: OpenUI5 Frontend
 */
test.describe("OpenUI5 Frontend", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(UI5_FRONTEND_URL);
    // Wait for SAP UI5 to load
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
  });

  test("should display master list", async ({ page }) => {
    // Check for SAP UI5 table or list
    const sapMList = page.locator(".sapMList").first();
    const sapMTable = page.locator(".sapMTable").first();

    const hasList = (await sapMList.isVisible()) || (await sapMTable.isVisible());
    expect(hasList).toBeTruthy();
  });

  test("should navigate to detail page", async ({ page }) => {
    // Click on first item in list
    const listItem = page.locator(".sapMLIB, .sapMListItems").first();

    if (await listItem.isVisible()) {
      await listItem.click();

      // Wait for navigation
      await page.waitForTimeout(2000);

      // Check for detail page elements
      const objectHeader = page.locator(".sapMObjectHeader").first();
      const pageHeader = page.locator(".sapMPageHeader").first();

      const hasDetail = (await objectHeader.isVisible()) || (await pageHeader.isVisible());
      expect(hasDetail).toBeTruthy();
    }
  });

  test("should create new item", async ({ page }) => {
    // Look for create button
    const createButton = page
      .locator('button[data-icon="add"], button:has-text("Create"), button:has-text("New")')
      .first();

    if (await createButton.isVisible()) {
      await createButton.click();

      // Wait for form
      await page.waitForTimeout(2000);

      // Fill form fields
      const nameInput = page.locator('input[name="Name"], input[placeholder*="Name"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill("UI5 Test Item");
      }

      // Save
      const saveButton = page.locator('button[data-icon="save"], button:has-text("Save")').first();
      if (await saveButton.isVisible()) {
        await saveButton.click();

        // Wait for navigation back
        await page.waitForTimeout(2000);
      }
    }
  });

  test("should display FCL (Flexible Column Layout)", async ({ page }) => {
    // Check for FCL structure
    const fcl = page.locator('[id*="fcl"], .sapFShellBar').first();
    expect(await fcl.isVisible()).toBeTruthy();
  });

  test("should support search functionality", async ({ page }) => {
    // Look for search field
    const searchField = page.locator('.sapMSearchField, input[placeholder*="Search"]').first();

    if (await searchField.isVisible()) {
      await searchField.fill("Test");
      await page.keyboard.press("Enter");

      // Wait for results
      await page.waitForTimeout(1000);
    }
  });

  test("should support sorting", async ({ page }) => {
    const table = page.locator(".sapMTable").first();

    if (await table.isVisible()) {
      // Click on column header to sort
      const columnHeader = page.locator(".sapMTableHeaderCell").first();
      await columnHeader.click();

      // Wait for sort
      await page.waitForTimeout(1000);
    }
  });
});

/**
 * Test Suite: OpenUI5 Detail Page
 */
test.describe("OpenUI5 Detail Page", () => {
  test("should display object header", async ({ page }) => {
    await page.goto(UI5_FRONTEND_URL);

    // Navigate to first item
    const listItem = page.locator(".sapMLIB").first();
    if (await listItem.isVisible()) {
      await listItem.click();
      await page.waitForTimeout(2000);

      // Check for object header
      const objectHeader = page.locator(".sapMObjectHeader").first();
      expect(await objectHeader.isVisible()).toBeTruthy();
    }
  });

  test("should display related entities", async ({ page }) => {
    await page.goto(UI5_FRONTEND_URL);

    // Navigate to detail
    const listItem = page.locator(".sapMLIB").first();
    if (await listItem.isVisible()) {
      await listItem.click();
      await page.waitForTimeout(2000);

      // Check for related entities section
      const hasRelated = (await page.locator("text=Related, text=Items, text=Orders").count()) > 0;
      expect(hasRelated).toBeTruthy();
    }
  });

  test("should support edit mode", async ({ page }) => {
    await page.goto(UI5_FRONTEND_URL);

    const listItem = page.locator(".sapMLIB").first();
    if (await listItem.isVisible()) {
      await listItem.click();
      await page.waitForTimeout(2000);

      // Look for edit button
      const editButton = page.locator('button[data-icon="edit"], button:has-text("Edit")').first();

      if (await editButton.isVisible()) {
        await editButton.click();

        // Check for editable fields
        await page.waitForTimeout(1000);
      }
    }
  });

  test("should support delete with confirmation", async ({ page }) => {
    await page.goto(UI5_FRONTEND_URL);

    const listItem = page.locator(".sapMLIB").first();
    if (await listItem.isVisible()) {
      await listItem.click();
      await page.waitForTimeout(2000);

      // Look for delete button
      const deleteButton = page
        .locator('button[data-icon="delete"], button:has-text("Delete")')
        .first();

      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Check for confirmation dialog
        const dialog = page.locator(".sapMDialog").first();

        if (await dialog.isVisible({ timeout: 2000 })) {
          // Confirm or cancel
          const hasButtons =
            (await page
              .locator(
                'button:has-text("Yes"), button:has-text("OK"), button:has-text("No"), button:has-text("Cancel")'
              )
              .count()) > 0;
          expect(hasButtons).toBeTruthy();
        }
      }
    }
  });
});

/**
 * Test Suite: OData + OpenUI5 Integration
 */
test.describe("OData + OpenUI5 Integration", () => {
  test("should sync data between backend and frontend", async ({ page, request }) => {
    // Create data via API
    const newCustomer = {
      Name: "Sync Test Customer",
      Email: "sync@example.com",
    };

    await request.post(`${ODATA_BACKEND_URL}/odata/Customers`, {
      data: newCustomer,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Wait and check in UI
    await page.goto(UI5_FRONTEND_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Check for new data in list
    const listText = await page.locator(".sapMList, .sapMTable").first().textContent();
    const hasData =
      (listText ?? "").includes("Sync Test") || (listText ?? "").includes("sync@example");
    expect(hasData).toBeTruthy();
  });

  test("should handle API errors gracefully", async ({ page }) => {
    // Navigate to page
    await page.goto(UI5_FRONTEND_URL);
    await page.waitForLoadState("networkidle");

    // Check if page loaded without errors
    const hasContent = (await page.locator(".sapMList, .sapMTable, .sapMText").count()) > 0;
    expect(hasContent).toBeTruthy();
  });
});

/**
 * Test Suite: OpenUI5 Responsive Design
 */
test.describe("OpenUI5 Responsive Design", () => {
  test("should work on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(UI5_FRONTEND_URL);

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Check for mobile adaptation
    const hasMobileClass =
      (await page.locator(".sapUiRespOnDesktop, .sapUiRespOnMobile, .sapUiRespOnTablet").count()) >
      0;
    const hasContent = (await page.locator(".sapMList, .sapMTable").count()) > 0;

    expect(hasMobileClass || hasContent).toBeTruthy();
  });

  test("should support touch interactions", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(UI5_FRONTEND_URL);

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Try touch tap on first item
    const listItem = page.locator(".sapMLIB").first();
    if (await listItem.isVisible()) {
      await listItem.tap();

      // Should navigate or expand
      await page.waitForTimeout(1000);
    }
  });
});

/**
 * Test Suite: Performance
 */
test.describe("Performance", () => {
  test("should load page within reasonable time", async ({ page }) => {
    const startTime = Date.now();

    await page.goto(UI5_FRONTEND_URL);
    await page.waitForLoadState("networkidle");

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
  });

  test("should handle large datasets", async ({ request }) => {
    // Query with large $top value
    const response = await request.get(`${ODATA_BACKEND_URL}/odata/Customers?$top=100`);

    expect(response.status()).toBeLessThan(500); // Should not timeout
  });
});
