/**
 * Simple CRM — Business Rules & Workflow E2E Tests
 *
 * Tests that business rules (GoRules/JDM) are enforced during entity CRUD,
 * and that workflow definitions can be created and persisted.
 *
 * Prerequisites:
 *   - Frontend running at http://localhost:3001
 *   - Backend running at http://localhost:3000
 *   - Test user: qaadmin@test.com / QATest123!
 */

import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:3001';
const EMAIL = 'qaadmin@test.com';
const PASSWORD = 'QATest123!';

// ─── Auth helper ────────────────────────────────────────────────────────────

async function login(page: Page) {
  await page.goto(`${BASE}/auth/login`);
  // Wait for form to fully mount before interacting
  await page.waitForSelector('input[type="email"]', { state: 'visible' });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  // Hard navigation to /dashboard — wait for URL change then for DOM to be ready
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 15_000 });
  // Wait for dashboard to fully load (ensures streaming SSR is complete before navigating away,
  // which prevents ERR_HTTP_HEADERS_SENT crash in vinxi's error handler)
  await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => {});
}

/** Dismiss any lingering toasts from a previous step */
async function clearToasts(page: Page) {
  const toasts = page.locator('[data-sonner-toast]');
  const count = await toasts.count();
  for (let i = 0; i < count; i++) {
    try {
      await toasts.nth(i).locator('button[aria-label*="close"], [data-close-button]').click({ timeout: 500 });
    } catch {
      // Toast may have already dismissed
    }
  }
  await page.waitForTimeout(400);
}

/** Open the "New" entity form from the list page */
async function openNewForm(page: Page, entityPath: string) {
  await page.goto(`${BASE}/${entityPath}`);
  await page.waitForSelector('button:has-text("New")', { state: 'visible' });
  await clearToasts(page);
  await page.click('button:has-text("New")');
  await page.waitForTimeout(400);
}

// ─── Account business rules ─────────────────────────────────────────────────

test.describe('Account business rules', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('rejects account with invalid email format', async ({ page }) => {
    await openNewForm(page, 'bus_account');
    await page.fill('#name', 'Bad Email Account');
    await page.fill('#email', 'not-an-email');
    await page.fill('#phone', '555-0001');
    await page.click('button:has-text("Create")');

    const toast = page.locator('[data-sonner-toast]');
    await expect(toast).toContainText(/valid email/i, { timeout: 7_000 });
    // Should stay on list page (no record created)
    await expect(page).toHaveURL(`${BASE}/bus_account`);
  });

  test('rejects account with email missing @ sign via rule engine', async ({ page }) => {
    await openNewForm(page, 'bus_account');
    await page.fill('#name', 'No At Sign');
    // Provide email without @ to bypass HTML5 type=email and hit backend rule
    // Use programmatic fill to bypass type validation
    await page.evaluate(() => {
      const el = document.getElementById('email') as HTMLInputElement;
      if (el) {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(el, 'noemail');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.fill('#phone', '555-0001');
    await page.click('button:has-text("Create")');

    const toast = page.locator('[data-sonner-toast]');
    await expect(toast).toContainText(/email/i, { timeout: 7_000 });
    await expect(page).toHaveURL(`${BASE}/bus_account`);
  });

  test('creates account with valid data and business rules pass', async ({ page }) => {
    await openNewForm(page, 'bus_account');
    const uniqueEmail = `e2e-${Date.now()}@example.com`;
    await page.fill('#name', 'E2E Valid Account');
    await page.fill('#email', uniqueEmail);
    await page.fill('#phone', '555-0003');
    await page.click('button:has-text("Create")');

    const toast = page.locator('[data-sonner-toast]');
    await expect(toast).toContainText(/created/i, { timeout: 7_000 });
    // Navigated to detail page (URL changes)
    await expect(page).not.toHaveURL(`${BASE}/bus_account`, { timeout: 7_000 });
  });

  test('HTML5 required validation prevents empty name submission', async ({ page }) => {
    await openNewForm(page, 'bus_account');
    // Leave #name empty; fill email and phone
    await page.fill('#email', 'test@noname.com');
    await page.fill('#phone', '555-0002');
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1_000);

    // Account should NOT be created — URL stays on list page
    // (HTML5 required attr blocks submission OR backend returns error)
    const url = page.url();
    const stayedOnList = url === `${BASE}/bus_account` || url.endsWith('/bus_account');
    const hadError = (await page.locator('[data-sonner-toast][data-type="error"]').count()) > 0;
    expect(stayedOnList || hadError).toBeTruthy();
  });
});

// ─── Business rules admin ────────────────────────────────────────────────────

test.describe('Business rules admin', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('lists all active rules for all entities', async ({ page }) => {
    await page.goto(`${BASE}/admin/rules`);
    await expect(page.locator('text=Total Rules')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('p:has-text("Active")').first()).toBeVisible();

    for (const entity of ['bus_account', 'bus_contact', 'bus_opportunity', 'bus_activity']) {
      await expect(page.locator(`code:has-text("${entity}")`)).toBeVisible();
    }
  });

  test('filter by entity narrows the rule list', async ({ page }) => {
    await page.goto(`${BASE}/admin/rules`);
    await page.waitForSelector('select, [role="combobox"]', { state: 'visible' });

    // Select bus_account filter
    const entityFilter = page.locator('select').nth(0);
    await entityFilter.selectOption('bus_account');
    await page.waitForTimeout(500);

    await expect(page.locator('code:has-text("bus_account")')).toBeVisible();
    // bus_contact should not be visible
    await expect(page.locator('code:has-text("bus_contact")')).not.toBeVisible();
  });

  test('dry-run detects invalid email via rule engine', async ({ page }) => {
    await page.goto(`${BASE}/admin/rules`);
    // Click edit on the first rule (bus_account)
    await page.locator('a[href*="/edit"]').first().click();
    await page.waitForURL(/\/admin\/rules\/.*\/edit/, { timeout: 8_000 });

    await page.click('button:has-text("Test Rule")');
    await page.waitForSelector('textarea', { state: 'visible' });

    const textarea = page.locator('textarea');
    await textarea.fill('{"name":"Test","email":"no-at-sign","phone":"555"}');
    await page.click('button:has-text("Run Test")');

    await expect(page.locator('text=prevent')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('text=Email must be a valid email address')).toBeVisible({ timeout: 5_000 });
  });

  test('dry-run passes with valid account data', async ({ page }) => {
    await page.goto(`${BASE}/admin/rules`);
    await page.locator('a[href*="/edit"]').first().click();
    await page.waitForURL(/\/admin\/rules\/.*\/edit/);

    await page.click('button:has-text("Test Rule")');
    await page.waitForSelector('textarea', { state: 'visible' });

    const textarea = page.locator('textarea');
    await textarea.fill('{"name":"Good Corp","email":"good@corp.com","phone":"555-1234"}');
    await page.click('button:has-text("Run Test")');

    await page.waitForTimeout(2_000);
    // With valid data: no prevent violations in result
    const preventCount = await page.locator('text=prevent').count();
    expect(preventCount).toBe(0);
  });

  test('"New Rule" button navigates to rule editor', async ({ page }) => {
    await page.goto(`${BASE}/admin/rules`);
    await page.waitForSelector('a[href*="/rules/new"]', { state: 'visible', timeout: 8_000 });
    await page.click('a[href*="/rules/new"]');
    await page.waitForURL(/\/admin\/rules\/new/, { timeout: 8_000 });
    await expect(page).toHaveURL(/\/admin\/rules\/new/);
  });
});

// ─── Workflow definitions ─────────────────────────────────────────────────────

test.describe('Workflow definitions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('displays workflow list page with stats', async ({ page }) => {
    await page.goto(`${BASE}/admin/workflow-definitions`);
    await expect(page.locator('text=Workflow Designer')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('text=Total workflows')).toBeVisible();
  });

  test('new workflow form shows BPMN canvas and node palette', async ({ page }) => {
    await page.goto(`${BASE}/admin/workflow-definitions/new`);
    await expect(page.locator('text=New Workflow Definition')).toBeVisible({ timeout: 8_000 });
    // BPMN canvas
    await expect(page.locator('text=Start')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('End').first()).toBeVisible();
    // Node palette
    await expect(page.locator('text=UpdateEntity')).toBeVisible();
    await expect(page.locator('text=CreateEntity')).toBeVisible();
    await expect(page.locator('text=Formula')).toBeVisible();
    await expect(page.locator('text=REST')).toBeVisible();
  });

  test('saves a new workflow and shows it in the list', async ({ page }) => {
    await page.goto(`${BASE}/admin/workflow-definitions/new`);
    await page.waitForSelector('input[placeholder*="Gold"]', { state: 'visible' });

    const name = `E2E Workflow ${Date.now()}`;
    await page.fill('input[placeholder*="Gold"]', name);

    await page.click('[role="combobox"]');
    await page.waitForSelector('[role="option"]:has-text("Account")', { state: 'visible' });
    await page.click('[role="option"]:has-text("Account")');

    await page.click('button:has-text("Save Workflow")');
    // Wait for navigation or list to update
    await page.waitForURL(`${BASE}/admin/workflow-definitions`, { timeout: 15_000 }).catch(() => {});
    await page.goto(`${BASE}/admin/workflow-definitions`);

    await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 8_000 });
  });

  test('can edit an existing workflow definition', async ({ page }) => {
    await page.goto(`${BASE}/admin/workflow-definitions`);
    await page.waitForSelector('text=Total workflows', { state: 'visible' });

    const editLink = page.locator('text=Edit').first();
    const count = await editLink.count();
    if (count === 0) {
      test.skip(); // No workflows to edit
      return;
    }
    await editLink.click();
    await page.waitForURL(/\/admin\/workflow-definitions\/.*/, { timeout: 8_000 });
    await expect(page.locator('text=Start')).toBeVisible({ timeout: 8_000 });
  });
});

// ─── Cross-entity rule coverage ──────────────────────────────────────────────

test.describe('Cross-entity business rule coverage', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('contact creation enforces required field rules', async ({ page }) => {
    await openNewForm(page, 'bus_contact');
    // Submit with nothing filled in
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1_500);

    const url = page.url();
    const stayedOnList = url.includes('/bus_contact') && !url.match(/\/bus_contact\/[0-9a-f-]{36}/);
    const hadError = (await page.locator('[data-sonner-toast][data-type="error"]').count()) > 0;
    expect(stayedOnList || hadError).toBeTruthy();
  });

  test('opportunity creation enforces required field rules', async ({ page }) => {
    await openNewForm(page, 'bus_opportunity');
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1_500);

    const url = page.url();
    const stayedOnList = url.includes('/bus_opportunity') && !url.match(/\/bus_opportunity\/[0-9a-f-]{36}/);
    const hadError = (await page.locator('[data-sonner-toast][data-type="error"]').count()) > 0;
    expect(stayedOnList || hadError).toBeTruthy();
  });

  test('activity creation enforces required field rules', async ({ page }) => {
    await openNewForm(page, 'bus_activity');
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1_500);

    const url = page.url();
    const stayedOnList = url.includes('/bus_activity') && !url.match(/\/bus_activity\/[0-9a-f-]{36}/);
    const hadError = (await page.locator('[data-sonner-toast][data-type="error"]').count()) > 0;
    expect(stayedOnList || hadError).toBeTruthy();
  });
});

// ─── Dashboard smoke test ────────────────────────────────────────────────────

test.describe('Dashboard', () => {
  test('renders after login and shows navigation links', async ({ page }) => {
    await login(page);
    // Dashboard should load at /dashboard
    await expect(page).toHaveURL(`${BASE}/dashboard`);
    // Dashboard header and entity cards should be visible
    await expect(page.locator('header, main')).toBeVisible({ timeout: 8_000 });
  });

  test('dashboard links navigate to entity list pages', async ({ page }) => {
    await login(page);
    // Click on Accounts link in sidebar/nav
    const accountsLink = page.locator('a[href*="bus_account"], a:has-text("Account")').first();
    const exists = await accountsLink.count();
    if (exists > 0) {
      await accountsLink.click();
      await page.waitForURL(`${BASE}/bus_account`, { timeout: 8_000 });
      await expect(page).toHaveURL(`${BASE}/bus_account`);
    } else {
      await page.goto(`${BASE}/bus_account`);
      await expect(page.locator('table').or(page.getByText('No records'))).toBeVisible({ timeout: 8_000 });
    }
  });
});
