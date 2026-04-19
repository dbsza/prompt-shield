import type { Rule } from '../types';

export type RuleListAction = 'edit' | 'delete';
export type RuleListCallback = (action: RuleListAction, rule: Rule) => void;

export function renderRuleList(
  container: HTMLElement,
  rules: Rule[],
  callback: RuleListCallback,
  lockRules = false,
): void {
  if (rules.length === 0) {
    container.innerHTML = '<div class="empty-rules">No custom rules defined</div>';
    return;
  }

  container.innerHTML = rules
    .map(
      (rule) => `
    <div class="rule-item" data-guid="${rule.guid}">
      <div class="rule-info">
        <div class="rule-name">${escapeHtml(rule.name)}</div>
        <div class="rule-meta">${rule.severity} | ${rule.action} | <code>${escapeHtml(truncate(rule.regex, 30))}</code></div>
      </div>
      <div class="rule-actions">
        ${lockRules
          ? '<span class="managed-lock" title="Managed by administrator">🔒</span>'
          : '<button class="btn btn-secondary btn-small" data-action="edit">Edit</button><button class="btn btn-danger btn-small" data-action="delete">Del</button>'
        }
      </div>
    </div>
  `,
    )
    .join('');

  if (!lockRules) {
    container.querySelectorAll('.rule-item').forEach((item) => {
      const guid = item.getAttribute('data-guid')!;
      const rule = rules.find((r) => r.guid === guid)!;
      item.querySelectorAll('button[data-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const action = btn.getAttribute('data-action') as RuleListAction;
          callback(action, rule);
        });
      });
    });
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

