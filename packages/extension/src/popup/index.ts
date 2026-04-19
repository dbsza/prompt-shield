import './styles.css';
import type { Rule, SetRulesMessage, GetRulesMessage, SetDomainsMessage, ExtensionStatus } from '../types';
import { renderStatusIndicator } from './StatusIndicator';
import { renderRuleList } from './RuleList';
import { renderRuleEditor } from './RuleEditor';
import { renderImportExport } from './ImportExport';
import { renderDomainList } from './DomainList';

let currentRules: Rule[] = [];
let currentDomains: string[] = [];
let managedRules: Rule[] = [];
let managedDomains: string[] = [];
let lockRules = false;
let lockDomains = false;
let tabsInitialized = false;

const statusContainer = document.getElementById('status-indicator')!;
const ruleListContainer = document.getElementById('rule-list')!;
const editorSection = document.getElementById('rule-editor-section')!;
const editorContainer = document.getElementById('rule-editor')!;
const editorTitle = document.getElementById('editor-title')!;
const addRuleBtn = document.getElementById('add-rule-btn')!;
const importExportContainer = document.getElementById('import-export')!;
const domainListContainer = document.getElementById('domain-list')!;
const domainInput = document.getElementById('domain-input') as HTMLInputElement;
const addDomainBtn = document.getElementById('add-domain-btn')!;
const domainAddRow = document.getElementById('domain-add-row')!;
const managedDomainListContainer = document.getElementById('managed-domain-list')!;
const managedRuleListContainer = document.getElementById('managed-rule-list')!;
const tabBar = document.getElementById('tab-bar')!;
const tabEnterprise = document.getElementById('tab-enterprise')!;
const tabUser = document.getElementById('tab-user')!;

// ── Tab management ────────────────────────────────────────────────────────────

function setupTabs(isManaged: boolean): void {
  if (tabsInitialized) return;
  tabsInitialized = true;

  if (isManaged) {
    tabBar.style.display = 'flex';
    switchTab('enterprise');
    tabBar.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')!));
    });
  } else {
    tabUser.style.display = 'block';
  }
}

function switchTab(tab: string): void {
  tabBar.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
  });
  tabEnterprise.style.display = tab === 'enterprise' ? 'block' : 'none';
  tabUser.style.display = tab === 'user' ? 'block' : 'none';
}

// ── Managed content (Enterprise tab) ─────────────────────────────────────────

function updateManagedUI(): void {
  // Domains
  if (managedDomains.length === 0) {
    managedDomainListContainer.innerHTML =
      '<div class="empty-rules">No managed domains configured</div>';
  } else {
    managedDomainListContainer.innerHTML = managedDomains
      .map(
        (d) => `
      <div class="rule-item rule-item--managed">
        <div class="rule-info"><div class="rule-name">${escapeHtml(d)}</div></div>
        <div class="rule-actions"><span class="managed-lock" title="Managed by administrator">🔒</span></div>
      </div>`,
      )
      .join('');
  }

  // Rules
  if (managedRules.length === 0) {
    managedRuleListContainer.innerHTML =
      '<div class="empty-rules">No managed rules configured</div>';
  } else {
    managedRuleListContainer.innerHTML = managedRules
      .map(
        (r) => `
      <div class="rule-item rule-item--managed">
        <div class="rule-info">
          <div class="rule-name">${escapeHtml(r.name)}</div>
          <div class="rule-meta">${r.severity} | ${r.action} | <code>${escapeHtml(truncate(r.regex, 30))}</code></div>
        </div>
        <div class="rule-actions"><span class="managed-lock" title="Managed by administrator">🔒</span></div>
      </div>`,
      )
      .join('');
  }
}

// ── User tab ──────────────────────────────────────────────────────────────────

function updateUI(): void {
  renderRuleList(ruleListContainer, currentRules, (action, rule) => {
    if (action === 'edit') {
      showEditor(rule);
    } else if (action === 'delete') {
      currentRules = currentRules.filter((r) => r.guid !== rule.guid);
      syncRules();
    }
  }, lockRules);

  addRuleBtn.style.display = lockRules ? 'none' : '';

  renderImportExport(importExportContainer, currentRules, (importedRules) => {
    currentRules = importedRules;
    syncRules();
  }, lockRules);
}

function showEditor(rule: Rule | null): void {
  editorSection.style.display = 'block';
  editorTitle.textContent = rule ? 'Edit Rule' : 'Add Rule';

  renderRuleEditor(
    editorContainer,
    rule,
    (savedRule) => {
      const existingIndex = currentRules.findIndex((r) => r.guid === savedRule.guid);
      if (existingIndex >= 0) {
        currentRules[existingIndex] = savedRule;
      } else {
        currentRules.push(savedRule);
      }
      hideEditor();
      syncRules();
    },
    () => hideEditor(),
  );
}

function hideEditor(): void {
  editorSection.style.display = 'none';
  editorContainer.innerHTML = '';
}

function updateDomainUI(): void {
  renderDomainList(domainListContainer, currentDomains, (action, domain) => {
    if (action === 'remove') {
      currentDomains = currentDomains.filter((d) => d !== domain);
      syncDomains();
    }
  }, lockDomains);

  domainAddRow.style.display = lockDomains ? 'none' : '';
}

function syncDomains(): void {
  const message: SetDomainsMessage = { type: 'SET_DOMAINS', domains: currentDomains };
  chrome.runtime.sendMessage(message, () => {
    updateDomainUI();
  });
}

function addDomain(): void {
  if (lockDomains) return;

  const raw = domainInput.value.trim().toLowerCase();
  if (!raw) return;

  let domain = raw;
  try {
    if (raw.includes('://')) {
      domain = new URL(raw).hostname;
    }
  } catch {
    // use raw value as-is
  }

  if (currentDomains.includes(domain)) return;
  currentDomains = [...currentDomains, domain];
  domainInput.value = '';
  syncDomains();
}

function syncRules(): void {
  const message: SetRulesMessage = { type: 'SET_RULES', rules: currentRules };
  chrome.runtime.sendMessage(message, () => {
    updateUI();
    renderStatusIndicator(statusContainer);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncate(text: string, maxLen: number): string {
  return text.length <= maxLen ? text : text.slice(0, maxLen) + '...';
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

function loadInitialData(): void {
  renderStatusIndicator(statusContainer);

  const message: GetRulesMessage = { type: 'GET_RULES' };
  chrome.runtime.sendMessage(message, (response: { rules: Rule[] }) => {
    currentRules = response?.rules || [];
    updateUI();
  });

  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response: ExtensionStatus) => {
    currentDomains = response?.allowedDomains || [];
    managedRules = response?.managedRules || [];
    managedDomains = response?.managedDomains || [];
    lockRules = response?.lockRules ?? false;
    lockDomains = response?.lockDomains ?? false;

    setupTabs(response?.managed ?? false);
    updateDomainUI();
    updateManagedUI();
    updateUI();
  });
}

addDomainBtn.addEventListener('click', addDomain);
domainInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addDomain();
});

addRuleBtn.addEventListener('click', () => {
  if (!lockRules) showEditor(null);
});

loadInitialData();
