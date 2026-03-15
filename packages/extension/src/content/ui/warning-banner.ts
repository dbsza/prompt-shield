import type { PolicyDecision, Detection } from '../../types';
import { BANNER_STYLES } from './styles';

export type BannerAction = 'block' | 'redact' | 'allow';
export type BannerCallback = (action: BannerAction) => void;

const BANNER_TAG = 'prompt-shield-banner';

function getHighestSeverity(detections: Detection[]): string {
  const order = ['critical', 'high', 'medium', 'low'];
  for (const level of order) {
    if (detections.some((d) => d.severity === level)) {
      return level;
    }
  }
  return 'low';
}

function truncateMatch(text: string, maxLen = 30): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

export function showWarningBanner(decision: PolicyDecision, callback: BannerCallback): void {
  removeWarningBanner();

  const host = document.createElement(BANNER_TAG);
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = BANNER_STYLES;

  const severity = getHighestSeverity(decision.detections);

  const banner = document.createElement('div');
  banner.className = 'shield-banner';
  banner.innerHTML = `
    <div class="shield-header">
      <span class="shield-icon">&#x1f6e1;</span>
      <span>Sensitive Data Detected</span>
      <span class="shield-severity severity-${severity}">${severity}</span>
    </div>
    <ul class="shield-detections">
      ${decision.detections
        .slice(0, 5)
        .map(
          (d) => `
        <li>
          <span class="detection-name">${d.rule_name}</span>
          <span class="detection-match">${truncateMatch(d.matched_text)}</span>
        </li>
      `,
        )
        .join('')}
      ${decision.detections.length > 5 ? `<li><span class="detection-name">...and ${decision.detections.length - 5} more</span></li>` : ''}
    </ul>
    <div class="shield-actions">
      <button class="shield-btn btn-block" data-action="block">Block</button>
      <button class="shield-btn btn-redact" data-action="redact">Redact & Send</button>
      <button class="shield-btn btn-allow" data-action="allow">Send Anyway</button>
    </div>
  `;

  banner.querySelectorAll('.shield-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const action = (e.target as HTMLElement).getAttribute('data-action') as BannerAction;
      callback(action);
      removeWarningBanner();
    });
  });

  shadow.appendChild(style);
  shadow.appendChild(banner);
  document.body.appendChild(host);
}

export function removeWarningBanner(): void {
  const existing = document.querySelector(BANNER_TAG);
  if (existing) {
    existing.remove();
  }
}

export function isBannerVisible(): boolean {
  return document.querySelector(BANNER_TAG) !== null;
}
