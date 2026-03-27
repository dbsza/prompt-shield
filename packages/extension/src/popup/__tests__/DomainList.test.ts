import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderDomainList } from '../DomainList';

afterEach(() => {
  document.body.innerHTML = '';
});

function makeContainer(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

describe('renderDomainList', () => {
  it('shows empty message when domains list is empty', () => {
    const container = makeContainer();
    renderDomainList(container, [], vi.fn());
    expect(container.textContent).toContain('No domains configured');
    expect(container.querySelector('.rule-item')).toBeNull();
  });

  it('renders one item per domain', () => {
    const container = makeContainer();
    renderDomainList(container, ['claude.ai', 'chatgpt.com'], vi.fn());
    const items = container.querySelectorAll('.rule-item');
    expect(items).toHaveLength(2);
  });

  it('displays the domain name in the item', () => {
    const container = makeContainer();
    renderDomainList(container, ['claude.ai'], vi.fn());
    expect(container.textContent).toContain('claude.ai');
  });

  it('calls callback with remove action and correct domain on button click', () => {
    const container = makeContainer();
    const callback = vi.fn();
    renderDomainList(container, ['claude.ai', 'chatgpt.com'], callback);

    const removeBtn = container.querySelector(
      '[data-domain="claude.ai"] [data-action="remove"]',
    ) as HTMLElement;
    removeBtn.click();

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith('remove', 'claude.ai');
  });

  it('escapes HTML in displayed domain text', () => {
    const container = makeContainer();
    renderDomainList(container, ['<script>alert(1)</script>'], vi.fn());
    // No actual <script> element should be injected into the DOM
    expect(container.querySelector('script')).toBeNull();
    // The visible text content should contain the literal string
    expect(container.textContent).toContain('<script>alert(1)</script>');
  });
});
