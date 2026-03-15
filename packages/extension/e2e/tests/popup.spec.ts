import { test, expect } from '../fixtures/extension';

test.describe('Popup', () => {
  test('opens popup and shows status', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);

    await expect(page.locator('.popup-header h1')).toContainText('Prompt Shield');
    await expect(page.locator('#status-indicator')).toBeVisible();
  });

  test('shows empty rule list initially', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);

    await expect(page.locator('.empty-rules')).toBeVisible();
    await expect(page.locator('.empty-rules')).toContainText('No custom rules');
  });

  test('can add a custom rule', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);

    await page.click('#add-rule-btn');

    await page.fill('#rule-name', 'test_pattern');
    await page.fill('#rule-regex', 'SECRET_[0-9]+');
    await page.selectOption('#rule-severity', 'high');
    await page.selectOption('#rule-action', 'block');

    await page.click('#editor-save');

    // Rule should appear in the list
    await expect(page.locator('.rule-item')).toBeVisible();
    await expect(page.locator('.rule-name')).toContainText('test_pattern');
  });

  test('validates rule before saving', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);

    await page.click('#add-rule-btn');
    await page.click('#editor-save');

    // Should show error
    await expect(page.locator('#regex-error')).toBeVisible();
  });

  test('can cancel rule editing', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);

    await page.click('#add-rule-btn');
    await expect(page.locator('#rule-editor-section')).toBeVisible();

    await page.click('#editor-cancel');
    await expect(page.locator('#rule-editor-section')).not.toBeVisible();
  });
});
