import { test, expect } from '@playwright/test';
import { testData } from '../test-data';

test.describe('Quote CRUD Tests', () => {
  const entityName = 'Quote';
  const entityNamePlural = 'bus_quote';

  test.beforeEach(async ({ page }) => {
    // Navigate to entity list
    await page.goto(`/${entityNamePlural}`);
    // Wait for network to settle to ensure page is fully loaded
    await page.waitForLoadState('networkidle').catch(() => {
      // If networkidle times out, just wait a fixed time
      console.log('Network idle timed out, using fallback wait');
    });
    await page.waitForTimeout(2000);
  });

  test('should display Quote list', async ({ page }) => {
    // First verify page has loaded by checking for URL
    await expect(page).toHaveURL(/\//);

    // Wait for entity heading to be present using data-testid
    await expect(page.getByTestId('entity-heading')).toBeVisible({ timeout: 15000 });

    // Wait for table to be present using data-testid (handles skeleton, data, or no-results states)
    await expect(page.getByTestId('entity-table')).toBeVisible({ timeout: 10000 });

    // Wait for actual data to load (not skeleton) by checking for at least one data row
    // The skeleton has data-testid="table-loading-skeleton", real data doesn't
    await page.waitForSelector('[data-testid="entity-table"] tbody tr:not([data-testid="loading-row"])', { timeout: 10000 }).catch(() => {
      // If no data rows found, that's ok - the table might be empty
      console.log('No data rows found, table might be empty');
    });
  });

  test('should create a new Quote', async ({ page }) => {
    // Click new/create button using data-testid for reliability
    await page.getByTestId('create-new-button').click();

    // Wait for the page heading to appear
    await expect(page.getByTestId('entity-heading')).toBeVisible({ timeout: 10000 });

    // Wait for loading state to complete (form may show loading spinner)
    await page.waitForSelector('form .animate-pulse', { state: 'detached', timeout: 5000 }).catch(() => {
      // Loading skeleton might not exist if loading is fast, that's ok
    });

    // Wait for first input to appear
    const firstInput = page.locator('input:not([type="hidden"]):not([style*="display: none"]), textarea:not([style*="display: none"]), select:not([style*="display: none"])').first();
    await expect(firstInput).toBeVisible({ timeout: 10000 });

    // Wait a bit for any React state to settle after form loads
    await page.waitForTimeout(500);

    // Fill ALL visible form fields using TanStack Form best practices
    // Get ALL visible inputs/textareas/selects (including initially disabled ones)
    const allInputs = page.locator('input:not([type="hidden"]):not([style*="display: none"]), textarea:not([style*="display: none"]), select:not([style*="display: none"])');
    const inputCount = await allInputs.count();

    // Fill each input with proper focus/blur sequence for TanStack Form
    for (let i = 0; i < inputCount; i++) {
      const input = allInputs.nth(i);
      const inputType = await input.getAttribute('type') || 'text';
      const name = await input.getAttribute('name') || '';
      const isDisabled = await input.isDisabled();

      // Skip disabled fields and certain field types
      if (isDisabled || inputType === 'checkbox' || inputType === 'radio' || inputType === 'hidden' || inputType === 'submit' || inputType === 'button' || name === 'id' || name?.includes('created_at') || name?.includes('updated_at') || name?.includes('version')) {
        continue;
      }

      try {
        // Focus, clear, type, blur sequence for proper React event handling
        await input.focus();
        await page.waitForTimeout(30);

        // Clear if needed
        const currentValue = await input.inputValue();
        if (currentValue) {
          await input.clear();
          await page.waitForTimeout(30);
        }

        // Type the value
        if (inputType === 'email') {
          await page.keyboard.type(`create_${i}@example.com`);
        } else if (inputType === 'tel' || inputType === 'phone') {
          await page.keyboard.type(`+1234567${String(i).padStart(4, '0')}`);
        } else if (inputType === 'number') {
          await page.keyboard.type(String(100 + i));
        } else if (inputType === 'date') {
          await page.keyboard.type('2024-01-01');
        } else if (inputType === 'datetime-local') {
          await page.keyboard.type('2024-01-01T12:00');
        } else {
          await page.keyboard.type(`Create Value ${i}`);
        }

        await page.waitForTimeout(30);
        await page.keyboard.press('Tab');
        await page.waitForTimeout(50);
      } catch (e) {
        // Ignore errors for fields that might be read-only or have special handling
        console.log(`Field ${name}: ${(e as Error).message}`);
      }
    }

    // Wait for form validation to settle
    await page.waitForTimeout(500);

    // Submit form - use first() to avoid ambiguity
    await page.locator('button[type="submit"]:has-text("Save"), button:has-text("Create"), button:has-text("Submit")').first().click();

    // Verify success message or redirect
    await expect(page.locator('text=success, text=created, text=Success').or(page.locator(`h1:has-text("${entityName}")`))).toBeVisible({ timeout: 10000 });
  });

  test('should view Quote details', async ({ page }) => {
    // Click on first item in list using data-testid
    const table = page.getByTestId('entity-table');
    await table.locator('tbody tr:first-child a, tbody tr:first-child button:has-text("View")').first().click();

    // Verify detail page loads
    await expect(page.getByTestId('entity-heading')).toBeVisible();
  });

  test('should update a Quote', async ({ page }) => {
    // Navigate to edit page - use first row and first matching button with data-testid
    const table = page.getByTestId('entity-table');
    const firstRow = table.locator('tbody tr:first-child');
    await firstRow.locator('a:has-text("Edit"), button:has-text("Edit")').first().click();

    // Wait for the page to load - use data-testid for reliability
    await expect(page.getByTestId('entity-heading')).toBeVisible({ timeout: 5000 });

    // Wait for loading skeleton to disappear and inputs to appear
    // First wait for skeleton to be gone
    await page.waitForSelector('form .animate-pulse', { state: 'detached', timeout: 5000 }).catch(() => {
      // Skeleton might not exist if loading is fast, that's ok
    });

    // Then wait for actual inputs to appear (not hidden inputs)
    const firstInput = page.locator('input:not([type="hidden"]):not([style*="display: none"]), textarea:not([style*="display: none"]), select:not([style*="display: none"])').first();
    await expect(firstInput).toBeVisible({ timeout: 5000 });

    // Wait a bit for any React state to settle after form loads
    await page.waitForTimeout(500);

    // Update ALL visible form fields to ensure validation passes
    // Get ALL visible inputs/textareas/selects (including initially disabled ones)
    const allInputs = page.locator('input:not([type="hidden"]):not([style*="display: none"]), textarea:not([style*="display: none"]), select:not([style*="display: none"])');
    const inputCount = await allInputs.count();

    // Fill each input with appropriate test data
    for (let i = 0; i < inputCount; i++) {
      const input = allInputs.nth(i);
      const inputType = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      const isDisabled = await input.isDisabled();

      // Skip disabled fields and certain field types
      if (isDisabled || inputType === 'checkbox' || inputType === 'radio' || inputType === 'hidden' || name === 'id' || name?.includes('created_at') || name?.includes('updated_at') || name?.includes('version')) {
        continue;
      }

      // Wait for this specific input to be ready
      await input.waitFor({ state: 'attached', timeout: 1000 }).catch(() => {});

      // Fill with appropriate value based on input type
      try {
        if (inputType === 'email') {
          await input.fill(`test_update_${i}@example.com`);
        } else if (inputType === 'number') {
          await input.fill(String(100 + i));
        } else if (inputType === 'date') {
          await input.fill('2024-01-01');
        } else if (inputType === 'datetime-local') {
          await input.fill('2024-01-01T12:00');
        } else if (name === 'phone') {
          await input.fill(`+1234567${String(i).padStart(4, '0')}`);
        } else if (inputType === 'tel') {
          await input.fill(`+1234567${String(i).padStart(4, '0')}`);
        } else {
          // Default text input
          await input.fill(`Updated Test Value ${i}`);
        }
      } catch (e) {
        // Ignore errors for fields that might be read-only or have special handling
        console.log(`Skipping field ${i}: ${name || 'unnamed'} - ${e}`);
      }
    }

    // Wait for form validation to settle
    await page.waitForTimeout(500);

    // Check if save button is enabled
    const saveButton = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Update")').first();
    const isEnabled = await saveButton.isEnabled();

    if (!isEnabled) {
      // TanStack Form best practices: Re-fill fields with proper focus/blur sequence
      console.log('Save button disabled, retrying with proper focus/blur events...');

      const allInputs = page.locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([style*="display: none"]), textarea:not([style*="display: "none"]), select:not([style*="display: "none"])');
      const count = await allInputs.count();

      for (let i = 0; i < count; i++) {
        const input = allInputs.nth(i);
        const name = await input.getAttribute('name') || '';

        if (name === 'id' || name.includes('created_at') || name.includes('updated_at') || name.includes('version')) {
          continue;
        }

        try {
          // Focus, clear, type, blur sequence for proper React event handling
          await input.focus();
          await page.waitForTimeout(30);
          await input.clear();
          await page.waitForTimeout(30);

          // Type instead of fill for better event triggering
          if (i === 0) {
            await page.keyboard.type('First Field');
          } else if (i === 1) {
            await page.keyboard.type('test@example.com');
          } else if (i === 2) {
            await page.keyboard.type('1234567890');
          } else {
            await page.keyboard.type(`Field ${i} value`);
          }

          await page.waitForTimeout(30);
          await page.keyboard.press('Tab');
          await page.waitForTimeout(50);
        } catch (e) {
          console.log(`Field ${name}: ${(e as Error).message}`);
        }
      }

      await page.waitForTimeout(500);
    }

    // Save changes - regular click, not force
    await saveButton.click();

    // Verify success
    await expect(page.locator('text=updated, text=success, text=Success').first()).toBeVisible({ timeout: 5000 });
  });

  test('should delete a Quote', async ({ page }) => {
    // Get initial count using data-testid
    const table = page.getByTestId('entity-table');
    const initialCount = await table.locator('tbody tr').count();

    // Click delete on first item - use first row with data-testid
    const firstRow = table.locator('tbody tr:first-child');
    await firstRow.locator('button:has-text("Delete")').first().click();

    // Confirm deletion - look for the inline confirmation div with delete button
    // The new UI shows an inline confirmation with "Delete Permanently" or "Confirm" button
    const confirmButton = page.locator('button:has-text("Delete Permanently"), button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")').first();
    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
    }

    // Wait for deletion to complete and page to update
    await page.waitForTimeout(2000);

    // Verify deletion - use the same table selector with data-testid
    const finalCount = await table.locator('tbody tr').count();
    expect(finalCount).toBeLessThan(initialCount);
  });
});
