import { expect, test } from "@playwright/test";

/**
 * Application Dictionary Field Metadata Tests
 *
 * These tests verify that the /fields/grid and /fields/form endpoints
 * return correct metadata after fixing the sys_field_id bug.
 */

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3002";

test.describe("Application Dictionary - Field Metadata", () => {
  test.describe.configure({ mode: "serial" });

  test("GET /api/bus/users/fields/grid should return field metadata for grid display", async ({
    request,
  }) => {
    const response = await request.get(`${BACKEND_URL}/api/bus/users/fields/grid`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);

    // Verify field structure
    const firstField = data.data[0];
    expect(firstField).toHaveProperty("column_name");
    expect(firstField).toHaveProperty("seq_no");
    expect(firstField).toHaveProperty("seq_no_grid");
    expect(firstField).toHaveProperty("is_displayed_grid");

    // Verify expected columns for users
    const columnNames = data.data.map((f: any) => f.column_name);
    expect(columnNames).toContain("id");
    expect(columnNames).toContain("name");
    expect(columnNames).toContain("email");
    expect(columnNames).toContain("createdAt");

    // Verify seq_no_grid is properly ordered
    const seqNoGridValues = data.data.map((f: any) => f.seq_no_grid);
    const sortedSeqNoGrid = [...seqNoGridValues].sort((a, b) => a - b);
    expect(seqNoGridValues).toEqual(sortedSeqNoGrid);
  });

  test("GET /api/bus/users/fields/form should return field metadata for form display", async ({
    request,
  }) => {
    const response = await request.get(`${BACKEND_URL}/api/bus/users/fields/form`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);

    // Verify field structure
    const firstField = data.data[0];
    expect(firstField).toHaveProperty("column_name");
    expect(firstField).toHaveProperty("seq_no");
    expect(firstField).toHaveProperty("is_displayed");
    expect(firstField).toHaveProperty("is_mandatory");
    expect(firstField).toHaveProperty("is_updateable");

    // Verify expected columns for users
    const columnNames = data.data.map((f: any) => f.column_name);
    expect(columnNames).toContain("id");
    expect(columnNames).toContain("name");
    expect(columnNames).toContain("email");
    expect(columnNames).toContain("createdAt");

    // Verify mandatory fields
    const nameField = data.data.find((f: any) => f.column_name === "name");
    expect(nameField).toBeDefined();
    expect(nameField.is_mandatory).toBe(1);

    const emailField = data.data.find((f: any) => f.column_name === "email");
    expect(emailField).toBeDefined();
    expect(emailField.is_mandatory).toBe(1);

    // Verify non-updateable fields
    const idField = data.data.find((f: any) => f.column_name === "id");
    expect(idField).toBeDefined();
    expect(idField.is_updateable).toBe(0);
  });

  test("GET /api/bus/posts/fields/grid should return field metadata for posts", async ({
    request,
  }) => {
    const response = await request.get(`${BACKEND_URL}/api/bus/posts/fields/grid`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);

    // Verify expected columns for posts
    const columnNames = data.data.map((f: any) => f.column_name);
    expect(columnNames).toContain("id");
    expect(columnNames).toContain("userId");
    expect(columnNames).toContain("title");
    expect(columnNames).toContain("content");
    expect(columnNames).toContain("createdAt");
  });

  test("GET /api/bus/posts/fields/form should return field metadata for posts", async ({
    request,
  }) => {
    const response = await request.get(`${BACKEND_URL}/api/bus/posts/fields/form`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);

    // Verify relationship field
    const userIdField = data.data.find((f: any) => f.column_name === "userId");
    expect(userIdField).toBeDefined();
    expect(userIdField.is_mandatory).toBe(1);
  });

  test("fields/grid endpoint should filter out hidden fields", async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/bus/users/fields/grid`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    const allFieldsDisplayed = data.data.every((f: any) => f.is_displayed_grid === true);
    expect(allFieldsDisplayed).toBe(true);
  });

  test("fields/form endpoint should filter out hidden fields", async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/bus/users/fields/form`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    const allFieldsDisplayed = data.data.every((f: any) => f.is_displayed === true);
    expect(allFieldsDisplayed).toBe(true);
  });

  test("field metadata should include reference types", async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/bus/users/fields/grid`);

    expect(response.status()).toBe(200);

    const data = await response.json();
    const firstField = data.data[0];
    expect(firstField).toHaveProperty("sys_reference_id");
    expect(typeof firstField.sys_reference_id).toBe("number");
  });

  test("field metadata should be consistent between grid and form", async ({ request }) => {
    const [gridResponse, formResponse] = await Promise.all([
      request.get(`${BACKEND_URL}/api/bus/users/fields/grid`),
      request.get(`${BACKEND_URL}/api/bus/users/fields/form`),
    ]);

    expect(gridResponse.status()).toBe(200);
    expect(formResponse.status()).toBe(200);

    const gridData = await gridResponse.json();
    const formData = await formResponse.json();

    const gridColumns = gridData.data.map((f: any) => f.column_name).sort();
    const formColumns = formData.data.map((f: any) => f.column_name).sort();

    expect(gridColumns).toEqual(formColumns);
  });
});

test.describe("Application Dictionary - Integration", () => {
  test.describe.configure({ mode: "serial" });

  test("frontend should load user list page using field metadata", async ({ page }) => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";

    // Navigate to user list page
    await page.goto(`${frontendUrl}/bus_user`);

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Verify page title
    const title = await page.textContent("h1");
    expect(title).toContain("User");

    // Verify table headers are rendered (based on field metadata)
    const tableHeaders = await page.locator("th").count();
    expect(tableHeaders).toBeGreaterThan(0);

    // Verify table rows are rendered
    const tableRows = await page.locator("tbody tr").count();
    expect(tableRows).toBeGreaterThan(0);
  });

  test("frontend should display create button", async ({ page }) => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";

    await page.goto(`${frontendUrl}/bus_user`);
    await page.waitForLoadState("networkidle");

    // Verify "Create New" button exists
    const createButton = page.locator('button:has-text("Create New")');
    await expect(createButton).toBeVisible();
  });

  test("API should handle pagination with field metadata", async ({ request }) => {
    // First get field metadata
    const fieldsResponse = await request.get(`${BACKEND_URL}/api/bus/users/fields/grid`);
    expect(fieldsResponse.status()).toBe(200);

    // Then get paginated data
    const dataResponse = await request.get(`${BACKEND_URL}/api/bus/users?page=1&limit=10`);
    expect(dataResponse.status()).toBe(200);

    const data = await dataResponse.json();
    expect(data).toHaveProperty("data");
    expect(data).toHaveProperty("meta");

    // Verify pagination structure
    expect(data.meta).toHaveProperty("total");
    expect(data.meta).toHaveProperty("page");
    expect(data.meta).toHaveProperty("limit");
  });
});

test.describe("Application Dictionary - Error Handling", () => {
  test.describe.configure({ mode: "serial" });

  test("should return 404 for non-existent entity fields", async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/bus/nonexistent/fields/grid`);

    expect(response.status()).toBe(404);
  });

  test("should return 404 for non-existent entity form fields", async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/bus/nonexistent/fields/form`);

    expect(response.status()).toBe(404);
  });

  test("should handle malformed entity names gracefully", async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/bus/../users/fields/grid`);

    // Should either return 404 or 400
    expect([400, 404]).toContain(response.status());
  });
});
