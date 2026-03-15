import type { Rule, Severity, Action } from '../types';

export type RuleEditorCallback = (rule: Rule) => void;

export function renderRuleEditor(
  container: HTMLElement,
  rule: Rule | null,
  onSave: RuleEditorCallback,
  onCancel: () => void,
): void {
  const isEdit = rule !== null;

  container.innerHTML = `
    <div class="form-group">
      <label for="rule-name">Name</label>
      <input type="text" id="rule-name" value="${rule?.name || ''}" placeholder="e.g. internal_api_key">
    </div>
    <div class="form-group">
      <label for="rule-regex">Regex Pattern</label>
      <input type="text" id="rule-regex" value="${escapeAttr(rule?.regex || '')}" placeholder="e.g. SK_[A-Z0-9]{32}">
      <div id="regex-error" class="form-error" style="display:none"></div>
    </div>
    <div class="form-group">
      <label for="rule-severity">Severity</label>
      <select id="rule-severity">
        <option value="critical" ${rule?.severity === 'critical' ? 'selected' : ''}>Critical</option>
        <option value="high" ${rule?.severity === 'high' ? 'selected' : ''}>High</option>
        <option value="medium" ${!rule || rule.severity === 'medium' ? 'selected' : ''}>Medium</option>
        <option value="low" ${rule?.severity === 'low' ? 'selected' : ''}>Low</option>
      </select>
    </div>
    <div class="form-group">
      <label for="rule-action">Action</label>
      <select id="rule-action">
        <option value="block" ${rule?.action === 'block' ? 'selected' : ''}>Block</option>
        <option value="warn" ${!rule || rule.action === 'warn' ? 'selected' : ''}>Warn</option>
        <option value="redact" ${rule?.action === 'redact' ? 'selected' : ''}>Redact</option>
        <option value="allow" ${rule?.action === 'allow' ? 'selected' : ''}>Allow</option>
      </select>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" id="editor-cancel">Cancel</button>
      <button class="btn btn-primary" id="editor-save">${isEdit ? 'Update' : 'Add'}</button>
    </div>
  `;

  container.querySelector('#editor-cancel')!.addEventListener('click', onCancel);

  container.querySelector('#editor-save')!.addEventListener('click', () => {
    const name = (container.querySelector('#rule-name') as HTMLInputElement).value.trim();
    const regex = (container.querySelector('#rule-regex') as HTMLInputElement).value.trim();
    const severity = (container.querySelector('#rule-severity') as HTMLSelectElement)
      .value as Severity;
    const action = (container.querySelector('#rule-action') as HTMLSelectElement).value as Action;

    // Validation
    if (!name) {
      showError(container, 'Name is required');
      return;
    }

    if (!regex) {
      showError(container, 'Regex pattern is required');
      return;
    }

    try {
      new RegExp(regex);
    } catch {
      showError(container, 'Invalid regex pattern');
      return;
    }

    const newRule: Rule = {
      guid: rule?.guid || crypto.randomUUID(),
      name,
      regex,
      severity,
      action,
    };

    onSave(newRule);
  });
}

function showError(container: HTMLElement, message: string): void {
  const errorEl = container.querySelector('#regex-error') as HTMLElement;
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

function escapeAttr(text: string): string {
  return text.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
