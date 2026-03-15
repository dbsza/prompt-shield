import { test, expect } from '../fixtures/extension';
import path from 'path';

const TEST_PAGE = `file://${path.resolve(__dirname, '../fixtures/test-page.html')}`;

test.describe('Performance', () => {
  test('scans large text within acceptable time', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(TEST_PAGE);

    // Generate a large text with some sensitive data
    const largeText =
      'Normal text content. '.repeat(500) +
      'user@example.com ' +
      'More normal content. '.repeat(500);

    const textarea = page.locator('#textarea-field');

    const startTime = Date.now();

    await page.evaluate(
      (text) => {
        const ta = document.querySelector('#textarea-field') as HTMLTextAreaElement;
        ta.value = text;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      },
      largeText,
    );

    // Wait for debounce + scan
    await page.waitForTimeout(500);

    const banner = page.locator('prompt-shield-banner');
    await expect(banner).toBeVisible({ timeout: 10000 });

    const elapsed = Date.now() - startTime;
    // Total time including debounce (300ms) + scan should be under 2 seconds
    expect(elapsed).toBeLessThan(2000);
  });

  test('handles rapid input without performance degradation', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(TEST_PAGE);

    const textarea = page.locator('#textarea-field');
    await textarea.focus();

    // Type rapidly
    for (const char of 'user@example.com') {
      await page.keyboard.type(char, { delay: 20 });
    }

    // Should eventually show warning after debounce
    await page.waitForTimeout(500);

    const banner = page.locator('prompt-shield-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });
  });
});
