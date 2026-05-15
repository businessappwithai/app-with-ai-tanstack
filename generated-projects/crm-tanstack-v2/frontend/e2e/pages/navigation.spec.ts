import { test, expect } from '@playwright/test';
import { testData } from '../test-data';

test.describe('Navigation Tests', () => {
  test('should navigate to all entities from menu', async ({ page }) => {
    // Start at dashboard (home page redirects to dashboard)
    await page.goto('/');

    // Navigate to Account
    await page.click('a[href="/bus_account"]');
    await expect(page).toHaveURL(/\/bus_account/);
    await expect(page.locator('h1, h2').filter({ hasText: /Account/i })).toBeVisible();

    // Go back to dashboard
    await page.goto('/dashboard');
    // Navigate to Contact
    await page.click('a[href="/bus_contact"]');
    await expect(page).toHaveURL(/\/bus_contact/);
    await expect(page.locator('h1, h2').filter({ hasText: /Contact/i })).toBeVisible();

    // Go back to dashboard
    await page.goto('/dashboard');
    // Navigate to Opportunity
    await page.click('a[href="/bus_opportunity"]');
    await expect(page).toHaveURL(/\/bus_opportunity/);
    await expect(page.locator('h1, h2').filter({ hasText: /Opportunity/i })).toBeVisible();

    // Go back to dashboard
    await page.goto('/dashboard');
    // Navigate to Activity
    await page.click('a[href="/bus_activity"]');
    await expect(page).toHaveURL(/\/bus_activity/);
    await expect(page.locator('h1, h2').filter({ hasText: /Activity/i })).toBeVisible();

    // Go back to dashboard
    await page.goto('/dashboard');
  });

  test('should display all entities in dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.locator('a[href="/bus_account"]')).toBeVisible();
    await expect(page.locator('a[href="/bus_contact"]')).toBeVisible();
    await expect(page.locator('a[href="/bus_opportunity"]')).toBeVisible();
    await expect(page.locator('a[href="/bus_activity"]')).toBeVisible();
  });
});
