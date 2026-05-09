/**
 * Comprehensive E2E Tests for CRM (Customer Relationship Management) System
 * Next.js + NestJS Stack
 *
 * Tests CRUD functionality for all core CRM entities:
 * - Company, Contact, Deal, DealStage, Pipeline
 * - Activity, Note, Task
 * - EmailMessage, EmailTemplate
 * - Product, Quote, QuoteItem
 * - User, Team
 *
 * Stack: Next.js 14 + NestJS 10
 * Database: SQLite
 *
 * Frontend: http://localhost:3000 (default)
 * Backend:  http://localhost:3001 (default)
 */

import { expect, test } from "@playwright/test";

// ============================================================================
// Configuration
// ============================================================================

const FRONTEND_URL =
  process.env.CRM_FRONTEND_URL || process.env.FRONTEND_URL || "http://localhost:3000";
const BACKEND_URL =
  process.env.CRM_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:3001";

// Entity paths (bus_ prefix added by generator)
const COMPANY_PATH = "/bus_company";
const CONTACT_PATH = "/bus_contact";
const DEAL_PATH = "/bus_deal";
const DEAL_STAGE_PATH = "/bus_deal_stage";
const PIPELINE_PATH = "/bus_pipeline";
const ACTIVITY_PATH = "/bus_activity";
const NOTE_PATH = "/bus_note";
const TASK_PATH = "/bus_task";
const EMAIL_MESSAGE_PATH = "/bus_email_message";
const EMAIL_TEMPLATE_PATH = "/bus_email_template";
const PRODUCT_PATH = "/bus_product";
const QUOTE_PATH = "/bus_quote";
const QUOTE_ITEM_PATH = "/bus_quote_item";
const USER_PATH = "/bus_user";
const TEAM_PATH = "/bus_team";

// API endpoints
const API_BASE = `${BACKEND_URL}/api/bus`;

// Placeholder owner ID for test data (no FK validation in backend)
const TEST_OWNER_ID = "e2e-owner-0000-0000-0000-000000000001";

// ============================================================================
// Helpers
// ============================================================================

async function waitForPageReady(page: any) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
}

// ============================================================================
// Test Suite: API Health Check
// ============================================================================

test.describe("CRM System - API Health", () => {
  test("GET /api/bus/companies - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/companies`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(data).toHaveProperty("meta");
    expect(Array.isArray(data.data)).toBe(true);
  });

  test("GET /api/bus/contacts - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/contacts`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("data");
  });

  test("GET /api/bus/deals - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/deals`);
    expect(response.status()).toBe(200);
  });

  test("GET /api/bus/pipelines - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/pipelines`);
    expect(response.status()).toBe(200);
  });

  test("GET /api/bus/deal_stages - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/deal_stages`);
    expect(response.status()).toBe(200);
  });

  test("GET /api/bus/activities - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/activities`);
    expect(response.status()).toBe(200);
  });

  test("GET /api/bus/notes - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/notes`);
    expect(response.status()).toBe(200);
  });

  test("GET /api/bus/tasks - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/tasks`);
    expect(response.status()).toBe(200);
  });

  test("GET /api/bus/email_messages - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/email_messages`);
    expect(response.status()).toBe(200);
  });

  test("GET /api/bus/email_templates - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/email_templates`);
    expect(response.status()).toBe(200);
  });

  test("GET /api/bus/products - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/products`);
    expect(response.status()).toBe(200);
  });

  test("GET /api/bus/quotes - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/quotes`);
    expect(response.status()).toBe(200);
  });

  test("GET /api/bus/users - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/users`);
    expect(response.status()).toBe(200);
  });

  test("GET /api/bus/teams - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/teams`);
    expect(response.status()).toBe(200);
  });
});

// ============================================================================
// Test Suite: Company Management
// ============================================================================

test.describe("Company Management", () => {
  test("should display companies list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${COMPANY_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });

    // Table and create button only visible when authenticated
    if (!page.url().includes("/auth/")) {
      const table = page.locator("table").first();
      await expect(table).toBeVisible({ timeout: 10000 });

      const createBtn = page
        .locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add")')
        .first();
      await expect(createBtn).toBeVisible();
    }
  });

  test("should create a company via API", async ({ request }) => {
    const newCompany = {
      name: "E2E Test Corp",
      industry: "Technology",
      website: "https://e2e-test.example.com",
      phone: "555-0100",
      email: "info@e2e-test.example.com",
      employee_count: 50,
      annual_revenue: 1000000.0,
      status: "ACTIVE",
      owner_id: TEST_OWNER_ID,
    };

    const response = await request.post(`${API_BASE}/companies`, {
      data: newCompany,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");
    expect(created.name).toBe(newCompany.name);

    if (created.id) {
      await request.delete(`${API_BASE}/companies/${created.id}`);
    }
  });

  test("should read a company via API", async ({ request }) => {
    const createRes = await request.post(`${API_BASE}/companies`, {
      data: { name: "Read Test Corp", status: "ACTIVE", owner_id: TEST_OWNER_ID },
      headers: { "Content-Type": "application/json" },
    });
    const company = await createRes.json();

    if (company.id) {
      const getRes = await request.get(`${API_BASE}/companies/${company.id}`);
      expect(getRes.status()).toBe(200);
      const fetched = await getRes.json();
      expect(fetched.name).toBe("Read Test Corp");

      await request.delete(`${API_BASE}/companies/${company.id}`);
    }
  });

  test("should update a company via API", async ({ request }) => {
    const createRes = await request.post(`${API_BASE}/companies`, {
      data: { name: "Update Me Corp", status: "ACTIVE", owner_id: TEST_OWNER_ID },
      headers: { "Content-Type": "application/json" },
    });
    const company = await createRes.json();

    if (company.id) {
      const updateRes = await request.patch(`${API_BASE}/companies/${company.id}`, {
        data: { name: "Updated Corp Name", industry: "Finance" },
        headers: { "Content-Type": "application/json" },
      });
      expect([200, 201]).toContain(updateRes.status());

      await request.delete(`${API_BASE}/companies/${company.id}`);
    }
  });

  test("should delete a company via API", async ({ request }) => {
    const createRes = await request.post(`${API_BASE}/companies`, {
      data: { name: "Delete Me Corp", status: "ACTIVE", owner_id: TEST_OWNER_ID },
      headers: { "Content-Type": "application/json" },
    });
    const company = await createRes.json();

    if (company.id) {
      const deleteRes = await request.delete(`${API_BASE}/companies/${company.id}`);
      expect([200, 204]).toContain(deleteRes.status());

      const getRes = await request.get(`${API_BASE}/companies/${company.id}`);
      expect([404, 400]).toContain(getRes.status());
    }
  });
});

// ============================================================================
// Test Suite: Contact Management
// ============================================================================

test.describe("Contact Management", () => {
  test("should display contacts list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${CONTACT_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should create a contact via API", async ({ request }) => {
    const newContact = {
      first_name: "Jane",
      last_name: "Doe",
      email: `jane.doe.e2e.${Date.now()}@example.com`,
      phone: "555-0200",
      job_title: "Product Manager",
      department: "Product",
      status: "ACTIVE",
      lead_source: "WEBSITE",
      owner_id: TEST_OWNER_ID,
    };

    const response = await request.post(`${API_BASE}/contacts`, {
      data: newContact,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");
    expect(created.first_name).toBe(newContact.first_name);

    if (created.id) {
      await request.delete(`${API_BASE}/contacts/${created.id}`);
    }
  });

  test("should create a contact linked to a company via API", async ({ request }) => {
    const companyRes = await request.post(`${API_BASE}/companies`, {
      data: { name: "Contact Test Corp", status: "ACTIVE", owner_id: TEST_OWNER_ID },
      headers: { "Content-Type": "application/json" },
    });
    const company = await companyRes.json();

    const contactRes = await request.post(`${API_BASE}/contacts`, {
      data: {
        first_name: "John",
        last_name: "Smith",
        email: `john.smith.e2e.${Date.now()}@example.com`,
        status: "ACTIVE",
        owner_id: TEST_OWNER_ID,
        ...(company.id ? { company_id: company.id } : {}),
      },
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(contactRes.status());
    const contact = await contactRes.json();
    expect(contact).toHaveProperty("id");

    if (contact.id) await request.delete(`${API_BASE}/contacts/${contact.id}`);
    if (company.id) await request.delete(`${API_BASE}/companies/${company.id}`);
  });
});

// ============================================================================
// Test Suite: Deal / Sales Pipeline
// ============================================================================

test.describe("Deal Management", () => {
  test("should display deals list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${DEAL_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should create a deal via API", async ({ request }) => {
    const newDeal = {
      name: "E2E Test Deal",
      amount: 25000.0,
      currency: "USD",
      stage: "PROSPECTING",
      probability: 20,
      status: "OPEN",
      description: "Created by E2E tests",
      owner_id: TEST_OWNER_ID,
    };

    const response = await request.post(`${API_BASE}/deals`, {
      data: newDeal,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");
    expect(created.name).toBe(newDeal.name);

    if (created.id) {
      await request.delete(`${API_BASE}/deals/${created.id}`);
    }
  });

  test("should create a deal linked to company and contact", async ({ request }) => {
    const companyRes = await request.post(`${API_BASE}/companies`, {
      data: { name: "Deal Test Corp", status: "ACTIVE", owner_id: TEST_OWNER_ID },
      headers: { "Content-Type": "application/json" },
    });
    const company = await companyRes.json();

    const contactRes = await request.post(`${API_BASE}/contacts`, {
      data: {
        first_name: "Deal",
        last_name: "Contact",
        email: `deal.contact.${Date.now()}@example.com`,
        status: "ACTIVE",
        owner_id: TEST_OWNER_ID,
        ...(company.id ? { company_id: company.id } : {}),
      },
      headers: { "Content-Type": "application/json" },
    });
    const contact = await contactRes.json();

    const dealRes = await request.post(`${API_BASE}/deals`, {
      data: {
        name: "Linked Deal",
        amount: 50000.0,
        currency: "USD",
        stage: "QUALIFICATION",
        status: "OPEN",
        owner_id: TEST_OWNER_ID,
        ...(company.id ? { company_id: company.id } : {}),
        ...(contact.id ? { contact_id: contact.id } : {}),
      },
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(dealRes.status());
    const deal = await dealRes.json();

    if (deal.id) await request.delete(`${API_BASE}/deals/${deal.id}`);
    if (contact.id) await request.delete(`${API_BASE}/contacts/${contact.id}`);
    if (company.id) await request.delete(`${API_BASE}/companies/${company.id}`);
  });
});

// ============================================================================
// Test Suite: Pipeline & Deal Stage
// ============================================================================

test.describe("Pipeline Management", () => {
  test("should display pipelines list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${PIPELINE_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should create a pipeline via API", async ({ request }) => {
    const newPipeline = {
      name: "E2E Test Pipeline",
      is_default: false,
      is_active: true,
    };

    const response = await request.post(`${API_BASE}/pipelines`, {
      data: newPipeline,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");

    if (created.id) {
      await request.delete(`${API_BASE}/pipelines/${created.id}`);
    }
  });

  test("should create a deal stage within a pipeline", async ({ request }) => {
    const pipelineRes = await request.post(`${API_BASE}/pipelines`, {
      data: { name: "Stage Test Pipeline", is_default: false, is_active: true },
      headers: { "Content-Type": "application/json" },
    });
    const pipeline = await pipelineRes.json();

    const stageRes = await request.post(`${API_BASE}/deal_stages`, {
      data: {
        name: "Prospecting",
        sort_order: 1,
        default_probability: 10,
        is_won: false,
        is_lost: false,
        ...(pipeline.id ? { pipeline_id: pipeline.id } : {}),
      },
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(stageRes.status());
    const stage = await stageRes.json();

    if (stage.id) await request.delete(`${API_BASE}/deal_stages/${stage.id}`);
    if (pipeline.id) await request.delete(`${API_BASE}/pipelines/${pipeline.id}`);
  });
});

// ============================================================================
// Test Suite: Activity Tracking
// ============================================================================

test.describe("Activity Management", () => {
  test("should display activities list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${ACTIVITY_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should create an activity via API", async ({ request }) => {
    const newActivity = {
      activity_type: "CALL",
      subject: "E2E Test Call",
      description: "Follow-up call logged by E2E tests",
      scheduled_at: new Date(Date.now() + 86400000).toISOString(),
      duration_minutes: 30,
      status: "SCHEDULED",
      owner_id: TEST_OWNER_ID,
    };

    const response = await request.post(`${API_BASE}/activities`, {
      data: newActivity,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");

    if (created.id) {
      await request.delete(`${API_BASE}/activities/${created.id}`);
    }
  });
});

// ============================================================================
// Test Suite: Notes
// ============================================================================

test.describe("Note Management", () => {
  test("should display notes list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${NOTE_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should create a note via API", async ({ request }) => {
    const newNote = {
      content: "This is an E2E test note for CRM.",
      is_pinned: false,
      author_id: TEST_OWNER_ID,
    };

    const response = await request.post(`${API_BASE}/notes`, {
      data: newNote,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");

    if (created.id) {
      await request.delete(`${API_BASE}/notes/${created.id}`);
    }
  });
});

// ============================================================================
// Test Suite: Task Management
// ============================================================================

test.describe("Task Management", () => {
  test("should display tasks list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${TASK_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should create a task via API", async ({ request }) => {
    const newTask = {
      title: "E2E Test Task",
      description: "Task created by E2E tests",
      priority: "HIGH",
      status: "TODO",
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      assigned_to: TEST_OWNER_ID,
      created_by: TEST_OWNER_ID,
    };

    const response = await request.post(`${API_BASE}/tasks`, {
      data: newTask,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");
    expect(created.title).toBe(newTask.title);

    if (created.id) {
      await request.delete(`${API_BASE}/tasks/${created.id}`);
    }
  });
});

// ============================================================================
// Test Suite: Email Tracking
// ============================================================================

test.describe("Email Message Management", () => {
  test("should display email messages list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${EMAIL_MESSAGE_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should create an email message via API", async ({ request }) => {
    const newEmail = {
      subject: "E2E Test Email",
      body_text: "This is a test email body.",
      direction: "OUTBOUND",
      sent_at: new Date().toISOString(),
      open_count: 0,
    };

    const response = await request.post(`${API_BASE}/email_messages`, {
      data: newEmail,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");

    if (created.id) {
      await request.delete(`${API_BASE}/email_messages/${created.id}`);
    }
  });
});

test.describe("Email Template Management", () => {
  test("should display email templates list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${EMAIL_TEMPLATE_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should create an email template via API", async ({ request }) => {
    const newTemplate = {
      name: "E2E Welcome Template",
      subject: "Welcome to our CRM!",
      body_html: "<p>Welcome, {{name}}!</p>",
      body_text: "Welcome, {{name}}!",
      category: "ONBOARDING",
      is_active: true,
    };

    const response = await request.post(`${API_BASE}/email_templates`, {
      data: newTemplate,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");
    expect(created.name).toBe(newTemplate.name);

    if (created.id) {
      await request.delete(`${API_BASE}/email_templates/${created.id}`);
    }
  });
});

// ============================================================================
// Test Suite: Products & Quotes
// ============================================================================

test.describe("Product Management", () => {
  test("should display products list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${PRODUCT_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should create a product via API", async ({ request }) => {
    const newProduct = {
      name: "E2E Test Product",
      sku: `E2E-SKU-${Date.now()}`,
      description: "A product created during E2E testing",
      unit_price: 299.99,
      currency: "USD",
      is_active: true,
    };

    const response = await request.post(`${API_BASE}/products`, {
      data: newProduct,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");
    expect(created.name).toBe(newProduct.name);

    if (created.id) {
      await request.delete(`${API_BASE}/products/${created.id}`);
    }
  });
});

test.describe("Quote Management", () => {
  test("should display quotes list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${QUOTE_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should create a quote with line items via API", async ({ request }) => {
    // Create a deal first
    const dealRes = await request.post(`${API_BASE}/deals`, {
      data: {
        name: "Quote Deal",
        amount: 10000.0,
        currency: "USD",
        stage: "PROPOSAL",
        status: "OPEN",
        owner_id: TEST_OWNER_ID,
      },
      headers: { "Content-Type": "application/json" },
    });
    const deal = await dealRes.json();

    const quoteRes = await request.post(`${API_BASE}/quotes`, {
      data: {
        quote_number: `Q-E2E-${Date.now()}`,
        status: "DRAFT",
        valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        subtotal: 1000.0,
        discount_amount: 0.0,
        tax_amount: 100.0,
        total_amount: 1100.0,
        ...(deal.id ? { deal_id: deal.id } : {}),
      },
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(quoteRes.status());
    const quote = await quoteRes.json();
    expect(quote).toHaveProperty("id");

    // Add a product to the quote
    const productRes = await request.post(`${API_BASE}/products`, {
      data: {
        name: "Quote Line Product",
        sku: `QL-SKU-${Date.now()}`,
        unit_price: 500.0,
        currency: "USD",
        is_active: true,
      },
      headers: { "Content-Type": "application/json" },
    });
    const product = await productRes.json();

    if (quote.id && product.id) {
      const itemRes = await request.post(`${API_BASE}/quote_items`, {
        data: {
          quote_id: quote.id,
          product_id: product.id,
          description: "E2E Quote Line Item",
          quantity: 2,
          unit_price: 500.0,
          discount_percent: 0,
          total_price: 1000.0,
        },
        headers: { "Content-Type": "application/json" },
      });
      expect([200, 201]).toContain(itemRes.status());
      const item = await itemRes.json();

      if (item.id) await request.delete(`${API_BASE}/quote_items/${item.id}`);
    }

    if (quote.id) await request.delete(`${API_BASE}/quotes/${quote.id}`);
    if (product.id) await request.delete(`${API_BASE}/products/${product.id}`);
    if (deal.id) await request.delete(`${API_BASE}/deals/${deal.id}`);
  });
});

// ============================================================================
// Test Suite: User & Team Management
// ============================================================================

test.describe("User Management", () => {
  test("should display users list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${USER_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should create a user via API", async ({ request }) => {
    const newUser = {
      email: `crm.user.${Date.now()}@example.com`,
      first_name: "CRM",
      last_name: "User",
      role: "SALES_REP",
      is_active: true,
    };

    const response = await request.post(`${API_BASE}/users`, {
      data: newUser,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");
    expect(created.email).toBe(newUser.email);

    if (created.id) {
      await request.delete(`${API_BASE}/users/${created.id}`);
    }
  });
});

test.describe("Team Management", () => {
  test("should display teams list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${TEAM_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should create a team via API", async ({ request }) => {
    const newTeam = {
      name: "E2E Sales Team",
    };

    const response = await request.post(`${API_BASE}/teams`, {
      data: newTeam,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");
    expect(created.name).toBe(newTeam.name);

    if (created.id) {
      await request.delete(`${API_BASE}/teams/${created.id}`);
    }
  });

  test("should create a user assigned to a team", async ({ request }) => {
    const teamRes = await request.post(`${API_BASE}/teams`, {
      data: { name: "User Team Test" },
      headers: { "Content-Type": "application/json" },
    });
    const team = await teamRes.json();

    const userRes = await request.post(`${API_BASE}/users`, {
      data: {
        email: `team.member.${Date.now()}@example.com`,
        first_name: "Team",
        last_name: "Member",
        role: "SALES_REP",
        is_active: true,
        ...(team.id ? { team_id: team.id } : {}),
      },
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(userRes.status());
    const user = await userRes.json();

    if (user.id) await request.delete(`${API_BASE}/users/${user.id}`);
    if (team.id) await request.delete(`${API_BASE}/teams/${team.id}`);
  });
});

// ============================================================================
// Test Suite: CRM Dashboard Navigation
// ============================================================================

test.describe("CRM Dashboard Navigation", () => {
  test("should load dashboard/home page", async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await waitForPageReady(page);

    await expect(page).not.toHaveURL(/error/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("should navigate to companies", async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await waitForPageReady(page);

    const companyLink = page
      .locator('a[href*="bus_company"], a:has-text("Company"), a:has-text("Companies")')
      .first();
    if (await companyLink.isVisible()) {
      await companyLink.click();
      await waitForPageReady(page);
      await expect(page).toHaveURL(/bus_company/);
    } else {
      await page.goto(`${FRONTEND_URL}${COMPANY_PATH}`);
      await waitForPageReady(page);
      await expect(page.locator("h1, h2").first()).toBeVisible();
    }
  });

  test("should navigate to contacts", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${CONTACT_PATH}`);
    await waitForPageReady(page);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to deals", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${DEAL_PATH}`);
    await waitForPageReady(page);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to tasks", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${TASK_PATH}`);
    await waitForPageReady(page);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to products", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${PRODUCT_PATH}`);
    await waitForPageReady(page);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================================
// Test Suite: Form UI Interactions (Company)
// ============================================================================

test.describe("Company Form - UI Interactions", () => {
  test("should show form fields on create company page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${COMPANY_PATH}/new`);
    await waitForPageReady(page);

    const form = page.locator("form").first();
    await expect(form).toBeVisible({ timeout: 10000 });

    const inputs = page.locator("input, select, textarea");
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThan(0);
  });

  test("should have save/submit button on create company page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${COMPANY_PATH}/new`);
    await waitForPageReady(page);

    const submitBtn = page
      .locator(
        'button[type="submit"], button:has-text("Save"), button:has-text("Create"), button:has-text("Submit")'
      )
      .first();
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
  });

  test("should have cancel/back button on create company page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${COMPANY_PATH}/new`);
    await waitForPageReady(page);

    const cancelBtn = page
      .locator('button:has-text("Cancel"), button:has-text("Back"), a:has-text("Back")')
      .first();
    await expect(cancelBtn).toBeVisible({ timeout: 10000 });
  });

  test("should show table with headers on company list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${COMPANY_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });

    // Table headers only visible when authenticated
    if (!page.url().includes("/auth/")) {
      const tableHeader = page.locator('table thead tr th, th[role="columnheader"]').first();
      await expect(tableHeader).toBeVisible({ timeout: 10000 });
    }
  });
});

// ============================================================================
// Test Suite: Responsive Design
// ============================================================================

test.describe("CRM App - Responsive Design", () => {
  test("should be usable on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${FRONTEND_URL}${COMPANY_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should be usable on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${FRONTEND_URL}${CONTACT_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("body")).toBeVisible();
  });
});

// ============================================================================
// Test Suite: API Error Handling
// ============================================================================

test.describe("CRM API - Error Handling", () => {
  test("should return 404 for non-existent company", async ({ request }) => {
    const response = await request.get(
      `${API_BASE}/companies/00000000-0000-0000-0000-000000000000`
    );
    expect([404, 400]).toContain(response.status());
  });

  test("should return error for non-existent entity type", async ({ request }) => {
    const response = await request.get(`${API_BASE}/nonexistententity`);
    expect([404, 400, 500]).toContain(response.status());
  });

  test("should handle malformed request body", async ({ request }) => {
    const response = await request.post(`${API_BASE}/companies`, {
      data: "not-valid-json-object",
      headers: { "Content-Type": "application/json" },
    });
    expect([400, 422]).toContain(response.status());
  });
});

// ============================================================================
// Test Suite: Multi-Entity CRM Workflows
// ============================================================================

test.describe("CRM Workflow - Lead to Deal", () => {
  test("should complete a lead-to-deal workflow", async ({ request }) => {
    // Step 1: Create company
    const companyRes = await request.post(`${API_BASE}/companies`, {
      data: {
        name: "Lead Journey Corp",
        industry: "Retail",
        status: "ACTIVE",
        owner_id: TEST_OWNER_ID,
      },
      headers: { "Content-Type": "application/json" },
    });
    expect([200, 201]).toContain(companyRes.status());
    const company = await companyRes.json();

    // Step 2: Create contact at that company
    const contactRes = await request.post(`${API_BASE}/contacts`, {
      data: {
        first_name: "Lead",
        last_name: "Journey",
        email: `lead.journey.${Date.now()}@example.com`,
        status: "ACTIVE",
        lead_source: "COLD_CALL",
        owner_id: TEST_OWNER_ID,
        ...(company.id ? { company_id: company.id } : {}),
      },
      headers: { "Content-Type": "application/json" },
    });
    expect([200, 201]).toContain(contactRes.status());
    const contact = await contactRes.json();

    // Step 3: Create a deal linked to both
    const dealRes = await request.post(`${API_BASE}/deals`, {
      data: {
        name: "Lead Journey Deal",
        amount: 15000.0,
        currency: "USD",
        stage: "PROSPECTING",
        probability: 10,
        status: "OPEN",
        owner_id: TEST_OWNER_ID,
        ...(company.id ? { company_id: company.id } : {}),
        ...(contact.id ? { contact_id: contact.id } : {}),
      },
      headers: { "Content-Type": "application/json" },
    });
    expect([200, 201]).toContain(dealRes.status());
    const deal = await dealRes.json();

    // Step 4: Log an activity on the deal
    if (deal.id) {
      const activityRes = await request.post(`${API_BASE}/activities`, {
        data: {
          activity_type: "EMAIL",
          subject: "Initial Outreach",
          status: "COMPLETED",
          completed_at: new Date().toISOString(),
          owner_id: TEST_OWNER_ID,
          ...(contact.id ? { contact_id: contact.id } : {}),
          ...(deal.id ? { deal_id: deal.id } : {}),
        },
        headers: { "Content-Type": "application/json" },
      });
      expect([200, 201]).toContain(activityRes.status());
      const activity = await activityRes.json();
      if (activity.id) await request.delete(`${API_BASE}/activities/${activity.id}`);
    }

    // Cleanup
    if (deal.id) await request.delete(`${API_BASE}/deals/${deal.id}`);
    if (contact.id) await request.delete(`${API_BASE}/contacts/${contact.id}`);
    if (company.id) await request.delete(`${API_BASE}/companies/${company.id}`);
  });

  test("should complete a deal-to-quote workflow", async ({ request }) => {
    // Create deal
    const dealRes = await request.post(`${API_BASE}/deals`, {
      data: {
        name: "Quote Workflow Deal",
        amount: 20000.0,
        currency: "USD",
        stage: "PROPOSAL",
        status: "OPEN",
        owner_id: TEST_OWNER_ID,
      },
      headers: { "Content-Type": "application/json" },
    });
    const deal = await dealRes.json();

    // Create product
    const productRes = await request.post(`${API_BASE}/products`, {
      data: {
        name: "Workflow Product",
        sku: `WF-SKU-${Date.now()}`,
        unit_price: 1000.0,
        currency: "USD",
        is_active: true,
      },
      headers: { "Content-Type": "application/json" },
    });
    const product = await productRes.json();

    // Create quote
    if (deal.id) {
      const quoteRes = await request.post(`${API_BASE}/quotes`, {
        data: {
          quote_number: `WF-Q-${Date.now()}`,
          status: "SENT",
          subtotal: 2000.0,
          discount_amount: 0,
          tax_amount: 200.0,
          total_amount: 2200.0,
          deal_id: deal.id,
        },
        headers: { "Content-Type": "application/json" },
      });
      expect([200, 201]).toContain(quoteRes.status());
      const quote = await quoteRes.json();

      // Add line item
      if (quote.id && product.id) {
        const itemRes = await request.post(`${API_BASE}/quote_items`, {
          data: {
            quote_id: quote.id,
            product_id: product.id,
            quantity: 2,
            unit_price: 1000.0,
            discount_percent: 0,
            total_price: 2000.0,
          },
          headers: { "Content-Type": "application/json" },
        });
        const item = await itemRes.json();
        if (item.id) await request.delete(`${API_BASE}/quote_items/${item.id}`);
      }

      if (quote.id) await request.delete(`${API_BASE}/quotes/${quote.id}`);
    }

    if (product.id) await request.delete(`${API_BASE}/products/${product.id}`);
    if (deal.id) await request.delete(`${API_BASE}/deals/${deal.id}`);
  });
});
