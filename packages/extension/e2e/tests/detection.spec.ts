import { test, expect } from '../fixtures/extension';
import path from 'path';

const TEST_PAGE = `file://${path.resolve(__dirname, '../fixtures/test-page.html')}`;

test.describe('Detection', () => {
  test('shows warning when email is typed', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(TEST_PAGE);

    const textarea = page.locator('#textarea-field');
    await textarea.fill('Please contact user@example.com for details');

    // Wait for debounce + scan
    await page.waitForTimeout(500);

    // Check for warning banner in the page
    const banner = page.locator('prompt-shield-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });
  });

  test('shows warning when JWT is pasted', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(TEST_PAGE);

    const textarea = page.locator('#textarea-field');
    await textarea.focus();

    // Simulate paste with JWT token
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    await page.evaluate(
      (token) => {
        const ta = document.querySelector('#textarea-field') as HTMLTextAreaElement;
        ta.value = token;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      },
      jwt,
    );

    await page.waitForTimeout(500);

    const banner = page.locator('prompt-shield-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });
  });

  test('no warning for normal text', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(TEST_PAGE);

    const textarea = page.locator('#textarea-field');
    await textarea.fill('This is a perfectly normal message about programming');

    await page.waitForTimeout(1000);

    const banner = page.locator('prompt-shield-banner');
    await expect(banner).not.toBeVisible();
  });

  test('detects sensitive data in input fields', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(TEST_PAGE);

    const input = page.locator('#input-field');
    await input.fill('My SSN is 123-45-6789');

    await page.waitForTimeout(500);

    const banner = page.locator('prompt-shield-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });
  });
});
