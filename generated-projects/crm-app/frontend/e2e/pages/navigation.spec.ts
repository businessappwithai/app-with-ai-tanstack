import { test, expect } from '@playwright/test';
import { testData } from '../test-data';

test.describe('Navigation Tests', () => {
  test('should navigate to all entities from menu', async ({ page }) => {
    // Start at dashboard (home page redirects to dashboard)
    await page.goto('/');

    // Navigate to Company
    await page.click('a[href="/bus_company"]');
    await expect(page).toHaveURL(/\/bus_company/);
    await expect(page.locator('h1, h2').filter({ hasText: /Company/i })).toBeVisible();

    // Go back to dashboard
    await page.goto('/dashboard');
    // Navigate to Contact
    await page.click('a[href="/bus_contact"]');
    await expect(page).toHaveURL(/\/bus_contact/);
    await expect(page.locator('h1, h2').filter({ hasText: /Contact/i })).toBeVisible();

    // Go back to dashboard
    await page.goto('/dashboard');
    // Navigate to Deal
    await page.click('a[href="/bus_deal"]');
    await expect(page).toHaveURL(/\/bus_deal/);
    await expect(page.locator('h1, h2').filter({ hasText: /Deal/i })).toBeVisible();

    // Go back to dashboard
    await page.goto('/dashboard');
    // Navigate to Deal Stage
    await page.click('a[href="/bus_deal_stage"]');
    await expect(page).toHaveURL(/\/bus_deal_stage/);
    await expect(page.locator('h1, h2').filter({ hasText: /Deal Stage/i })).toBeVisible();

    // Go back to dashboard
    await page.goto('/dashboard');
    // Navigate to Pipeline
    await page.click('a[href="/bus_pipeline"]');
    await expect(page).toHaveURL(/\/bus_pipeline/);
    await expect(page.locator('h1, h2').filter({ hasText: /Pipeline/i })).toBeVisible();

    // Go back to dashboard
    await page.goto('/dashboard');
    // Navigate to Activity
    await page.click('a[href="/bus_activity"]');
    await expect(page).toHaveURL(/\/bus_activity/);
    await expect(page.locator('h1, h2').filter({ hasText: /Activity/i })).toBeVisible();

    // Go back to dashboard
    await page.goto('/dashboard');
    // Navigate to Note
    await page.click('a[href="/bus_note"]');
    await expect(page).toHaveURL(/\/bus_note/);
    await expect(page.locator('h1, h2').filter({ hasText: /Note/i })).toBeVisible();

    // Go back to dashboard
    await page.goto('/dashboard');
    // Navigate to Task
    await page.click('a[href="/bus_task"]');
    await expect(page).toHaveURL(/\/bus_task/);
    await expect(page.locator('h1, h2').filter({ hasText: /Task/i })).toBeVisible();

    // Go back to dashboard
    await page.goto('/dashboard');
    // Navigate to Email Message
    await page.click('a[href="/bus_email_message"]');
    await expect(page).toHaveURL(/\/bus_email_message/);
    await expect(page.locator('h1, h2').filter({ hasText: /Email Message/i })).toBeVisible();

    // Go back to dashboard
    await page.goto('/dashboard');
    // Navigate to Email Template
    await page.click('a[href="/bus_email_template"]');
    await expect(page).toHaveURL(/\/bus_email_template/);
    await expect(page.locator('h1, h2').filter({ hasText: /Email Template/i })).toBeVisible();

    // Go back to dashboard
    await page.goto('/dashboard');
    // Navigate to Product
    await page.click('a[href="/bus_product"]');
    await expect(page).toHaveURL(/\/bus_product/);
    await expect(page.locator('h1, h2').filter({ hasText: /Product/i })).toBeVisible();

    // Go back to dashboard
    await page.goto('/dashboard');
    // Navigate to Quote
    await page.click('a[href="/bus_quote"]');
    await expect(page).toHaveURL(/\/bus_quote/);
    await expect(page.locator('h1, h2').filter({ hasText: /Quote/i })).toBeVisible();

    // Go back to dashboard
    await page.goto('/dashboard');
    // Navigate to Quote Item
    await page.click('a[href="/bus_quote_item"]');
    await expect(page).toHaveURL(/\/bus_quote_item/);
    await expect(page.locator('h1, h2').filter({ hasText: /Quote Item/i })).toBeVisible();

    // Go back to dashboard
    await page.goto('/dashboard');
    // Navigate to User
    await page.click('a[href="/bus_user"]');
    await expect(page).toHaveURL(/\/bus_user/);
    await expect(page.locator('h1, h2').filter({ hasText: /User/i })).toBeVisible();

    // Go back to dashboard
    await page.goto('/dashboard');
    // Navigate to Team
    await page.click('a[href="/bus_team"]');
    await expect(page).toHaveURL(/\/bus_team/);
    await expect(page.locator('h1, h2').filter({ hasText: /Team/i })).toBeVisible();

    // Go back to dashboard
    await page.goto('/dashboard');
  });

  test('should display all entities in dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.locator('a[href="/bus_company"]')).toBeVisible();
    await expect(page.locator('a[href="/bus_contact"]')).toBeVisible();
    await expect(page.locator('a[href="/bus_deal"]')).toBeVisible();
    await expect(page.locator('a[href="/bus_deal_stage"]')).toBeVisible();
    await expect(page.locator('a[href="/bus_pipeline"]')).toBeVisible();
    await expect(page.locator('a[href="/bus_activity"]')).toBeVisible();
    await expect(page.locator('a[href="/bus_note"]')).toBeVisible();
    await expect(page.locator('a[href="/bus_task"]')).toBeVisible();
    await expect(page.locator('a[href="/bus_email_message"]')).toBeVisible();
    await expect(page.locator('a[href="/bus_email_template"]')).toBeVisible();
    await expect(page.locator('a[href="/bus_product"]')).toBeVisible();
    await expect(page.locator('a[href="/bus_quote"]')).toBeVisible();
    await expect(page.locator('a[href="/bus_quote_item"]')).toBeVisible();
    await expect(page.locator('a[href="/bus_user"]')).toBeVisible();
    await expect(page.locator('a[href="/bus_team"]')).toBeVisible();
  });
});
