import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderRuleEditor } from '../RuleEditor';
import type { Rule } from '../../types';

describe('RuleEditor', () => {
  let container: HTMLElement;
  let originalRandomUUID: typeof crypto.randomUUID;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    originalRandomUUID = crypto.randomUUID;
    crypto.randomUUID = vi.fn().mockReturnValue('mock-uuid-1234') as any;
  });

  afterEach(() => {
    container.remove();
    crypto.randomUUID = originalRandomUUID;
  });

  it('renders empty form for new rule', () => {
    renderRuleEditor(container, null, vi.fn(), vi.fn());
    expect(container.querySelector('#rule-name')).toBeTruthy();
    expect(container.querySelector('#rule-regex')).toBeTruthy();
    expect(container.querySelector('#rule-severity')).toBeTruthy();
    expect(container.querySelector('#rule-action')).toBeTruthy();
    expect(container.querySelector('#editor-save')?.textContent).toBe('Add');
  });

  it('populates form for existing rule', () => {
    const rule: Rule = {
      guid: '1',
      name: 'test_rule',
      regex: 'abc',
      severity: 'high',
      action: 'block',
    };
    renderRuleEditor(container, rule, vi.fn(), vi.fn());

    const nameInput = container.querySelector('#rule-name') as HTMLInputElement;
    expect(nameInput.value).toBe('test_rule');
    expect(container.querySelector('#editor-save')?.textContent).toBe('Update');
  });

  it('calls onSave with new rule data', () => {
    const onSave = vi.fn();
    renderRuleEditor(container, null, onSave, vi.fn());

    (container.querySelector('#rule-name') as HTMLInputElement).value = 'new_rule';
    (container.querySelector('#rule-regex') as HTMLInputElement).value = 'pattern_[0-9]+';
    (container.querySelector('#rule-severity') as HTMLSelectElement).value = 'critical';
    (container.querySelector('#rule-action') as HTMLSelectElement).value = 'block';

    (container.querySelector('#editor-save') as HTMLElement).click();

    expect(onSave).toHaveBeenCalledWith({
      guid: 'mock-uuid-1234',
      name: 'new_rule',
      regex: 'pattern_[0-9]+',
      severity: 'critical',
      action: 'block',
    });
  });

  it('preserves guid when editing', () => {
    const onSave = vi.fn();
    const rule: Rule = {
      guid: 'existing-guid',
      name: 'test',
      regex: 'abc',
      severity: 'high',
      action: 'block',
    };
    renderRuleEditor(container, rule, onSave, vi.fn());

    (container.querySelector('#editor-save') as HTMLElement).click();
    expect(onSave.mock.calls[0][0].guid).toBe('existing-guid');
  });

  it('calls onCancel when cancel clicked', () => {
    const onCancel = vi.fn();
    renderRuleEditor(container, null, vi.fn(), onCancel);

    (container.querySelector('#editor-cancel') as HTMLElement).click();
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows error for empty name', () => {
    const onSave = vi.fn();
    renderRuleEditor(container, null, onSave, vi.fn());

    (container.querySelector('#rule-regex') as HTMLInputElement).value = 'abc';
    (container.querySelector('#editor-save') as HTMLElement).click();

    expect(onSave).not.toHaveBeenCalled();
    const error = container.querySelector('#regex-error') as HTMLElement;
    expect(error.style.display).toBe('block');
  });

  it('shows error for empty regex', () => {
    const onSave = vi.fn();
    renderRuleEditor(container, null, onSave, vi.fn());

    (container.querySelector('#rule-name') as HTMLInputElement).value = 'test';
    (container.querySelector('#editor-save') as HTMLElement).click();

    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows error for invalid regex', () => {
    const onSave = vi.fn();
    renderRuleEditor(container, null, onSave, vi.fn());

    (container.querySelector('#rule-name') as HTMLInputElement).value = 'test';
    (container.querySelector('#rule-regex') as HTMLInputElement).value = '[invalid';
    (container.querySelector('#editor-save') as HTMLElement).click();

    expect(onSave).not.toHaveBeenCalled();
    const error = container.querySelector('#regex-error') as HTMLElement;
    expect(error.textContent).toContain('Invalid regex');
  });
});
