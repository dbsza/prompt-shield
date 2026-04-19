export type DomainListCallback = (action: 'remove', domain: string) => void;

export function renderDomainList(
  container: HTMLElement,
  domains: string[],
  callback: DomainListCallback,
  lockDomains = false,
): void {
  if (domains.length === 0) {
    container.innerHTML =
      '<div class="empty-rules">No verified domains \u2014 active on all sites</div>';
    return;
  }

  container.innerHTML = domains
    .map(
      (domain) => `
    <div class="rule-item" data-domain="${escapeHtml(domain)}">
      <div class="rule-info">
        <div class="rule-name">${escapeHtml(domain)}</div>
      </div>
      <div class="rule-actions">
        ${lockDomains
          ? '<span class="managed-lock" title="Managed by administrator">🔒</span>'
          : '<button class="btn btn-danger btn-small" data-action="remove">Remove</button>'
        }
      </div>
    </div>
  `,
    )
    .join('');

  if (!lockDomains) {
    container.querySelectorAll('.rule-item[data-domain]').forEach((item) => {
      const domain = item.getAttribute('data-domain')!;
      item.querySelector('[data-action="remove"]')!.addEventListener('click', () => {
        callback('remove', domain);
      });
    });
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

