import { test, expect } from '../fixtures/extension';

const TEST_PAGE = 'http://localhost:4173';

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

  // Regression test: last CPF not redacted when user pastes after typing
  // Repro: paste CPF, space, paste CPF, space, type "ab ", paste CPF → click Redact & Send
  //
  // Root cause — race condition in handleInput (interceptor.ts):
  //   handleInput captures `text` at input-event time and fires the callback 300ms later.
  //   If a paste happens within that 300ms window:
  //     t=0ms   paste → handlePaste scans "...ab 418.523.110-53" → banner shows 3 CPFs ✓
  //     t=300ms debounce fires with stale captured text "...ab " → banner replaced with 2 CPFs ✗
  //   The user clicks Redact & Send on the stale 2-CPF banner and the last CPF is never redacted.
  test('redacts all CPF occurrences when paste is followed by a stale debounced scan', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(TEST_PAGE);

    const CPF = '418.523.110-53';

    // Simulates a paste event and then applies the text to the element (mimicking browser behavior)
    const simulatePaste = async (selector: string, text: string) => {
      await page.evaluate(
        ({ sel, pastedText }) => {
          const el = document.querySelector(sel) as HTMLTextAreaElement;
          const dt = new DataTransfer();
          dt.setData('text/plain', pastedText);
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: dt,
          });
          el.dispatchEvent(pasteEvent);
          // Browser inserts the pasted text at the cursor position
          const pos = el.selectionEnd ?? el.value.length;
          el.value = el.value.slice(0, pos) + pastedText + el.value.slice(pos);
          el.selectionStart = pos + pastedText.length;
          el.selectionEnd = pos + pastedText.length;
        },
        { sel: selector, pastedText: text },
      );
    };

    const textarea = page.locator('#textarea-field');
    await textarea.focus();

    // Step 1: paste CPF
    await simulatePaste('#textarea-field', CPF);

    // Step 2: type a space
    await textarea.pressSequentially(' ');

    // Step 3: paste CPF again
    await simulatePaste('#textarea-field', CPF);

    // Step 4: type a space
    await textarea.pressSequentially(' ');

    // Step 5: type "ab " — the space starts a 300ms debounce timer capturing "...ab "
    await textarea.pressSequentially('ab');
    await textarea.pressSequentially(' ');

    // Step 6: paste CPF immediately — handlePaste scans the correct full text (3 CPFs),
    // but 300ms later the debounce fires with the stale "...ab " text (only 2 CPFs),
    // replacing the correct banner with a stale one before the user can click.
    await simulatePaste('#textarea-field', CPF);

    // Wait for debounce + async scan round-trip
    await page.waitForTimeout(600);

    const banner = page.locator('prompt-shield-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });

    // Click "Redact & Send" inside the shadow root
    await page.evaluate(() => {
      const host = document.querySelector('prompt-shield-banner');
      if (host?.shadowRoot) {
        const btn = host.shadowRoot.querySelector('[data-action="redact"]') as HTMLButtonElement;
        btn?.click();
      }
    });

    await page.waitForTimeout(300);

    const value = await textarea.inputValue();

    // All 3 CPFs must be redacted — this currently FAILS because the stale debounce scan
    // overwrites the banner with only 2 detections before the user clicks
    expect(value).not.toContain(CPF);
    expect(value.match(/\[REDACTED\]/g)?.length).toBe(3);
  });
});
