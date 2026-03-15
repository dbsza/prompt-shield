import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderRuleList } from '../RuleList';
import type { Rule } from '../../types';

describe('RuleList', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('shows empty state when no rules', () => {
    renderRuleList(container, [], vi.fn());
    expect(container.textContent).toContain('No custom rules defined');
  });

  it('renders rule items', () => {
    const rules: Rule[] = [
      { guid: '1', name: 'test_rule', regex: 'abc', severity: 'high', action: 'block' },
    ];
    renderRuleList(container, rules, vi.fn());
    expect(container.querySelector('.rule-item')).toBeTruthy();
    expect(container.textContent).toContain('test_rule');
    expect(container.textContent).toContain('high');
    expect(container.textContent).toContain('block');
  });

  it('renders multiple rules', () => {
    const rules: Rule[] = [
      { guid: '1', name: 'rule_a', regex: 'a', severity: 'high', action: 'block' },
      { guid: '2', name: 'rule_b', regex: 'b', severity: 'low', action: 'warn' },
    ];
    renderRuleList(container, rules, vi.fn());
    expect(container.querySelectorAll('.rule-item')).toHaveLength(2);
  });

  it('calls callback on edit click', () => {
    const callback = vi.fn();
    const rules: Rule[] = [
      { guid: '1', name: 'test', regex: 'abc', severity: 'high', action: 'block' },
    ];
    renderRuleList(container, rules, callback);

    const editBtn = container.querySelector('[data-action="edit"]') as HTMLElement;
    editBtn.click();
    expect(callback).toHaveBeenCalledWith('edit', rules[0]);
  });

  it('calls callback on delete click', () => {
    const callback = vi.fn();
    const rules: Rule[] = [
      { guid: '1', name: 'test', regex: 'abc', severity: 'high', action: 'block' },
    ];
    renderRuleList(container, rules, callback);

    const deleteBtn = container.querySelector('[data-action="delete"]') as HTMLElement;
    deleteBtn.click();
    expect(callback).toHaveBeenCalledWith('delete', rules[0]);
  });

  it('truncates long regex', () => {
    const rules: Rule[] = [
      {
        guid: '1',
        name: 'test',
        regex: 'a'.repeat(50),
        severity: 'high',
        action: 'block',
      },
    ];
    renderRuleList(container, rules, vi.fn());
    const codeEl = container.querySelector('code');
    expect(codeEl?.textContent?.length).toBeLessThan(50);
    expect(codeEl?.textContent).toContain('...');
  });
});
