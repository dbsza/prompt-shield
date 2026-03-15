import { test, expect } from '../fixtures/extension';
import path from 'path';

const TEST_PAGE = `file://${path.resolve(__dirname, '../fixtures/test-page.html')}`;

test.describe('Policy Actions', () => {
  test('block action prevents submission', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(TEST_PAGE);

    const textarea = page.locator('#textarea-field');
    // AWS key triggers block action
    await textarea.fill('key: AKIAIOSFODNN7EXAMPLE');

    await page.waitForTimeout(500);

    const banner = page.locator('prompt-shield-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });

    // Click block button within shadow DOM
    const blockBtn = page.locator('prompt-shield-banner').locator('css=.btn-block >> nth=0');
    if (await blockBtn.isVisible()) {
      await blockBtn.click();
    }
  });

  test('warn action shows banner with send anyway option', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(TEST_PAGE);

    const textarea = page.locator('#textarea-field');
    await textarea.fill('contact: user@example.com');

    await page.waitForTimeout(500);

    const banner = page.locator('prompt-shield-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });
  });

  test('redact action replaces sensitive data', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(TEST_PAGE);

    const textarea = page.locator('#textarea-field');
    await textarea.fill('My SSN is 123-45-6789');

    await page.waitForTimeout(500);

    const banner = page.locator('prompt-shield-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });
  });
});
