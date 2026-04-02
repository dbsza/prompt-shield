import './styles.css';
import type {
  Rule,
  SetRulesMessage,
  GetRulesMessage,
  SetDomainsMessage,
  ExtensionStatus,
} from '../types';
import { renderStatusIndicator } from './StatusIndicator';
import { renderRuleList } from './RuleList';
import { renderRuleEditor } from './RuleEditor';
import { renderImportExport } from './ImportExport';
import { renderDomainList } from './DomainList';

let currentRules: Rule[] = [];
let currentDomains: string[] = [];

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

function updateUI(): void {
  renderRuleList(ruleListContainer, currentRules, (action, rule) => {
    if (action === 'edit') {
      showEditor(rule);
    } else if (action === 'delete') {
      currentRules = currentRules.filter((r) => r.guid !== rule.guid);
      syncRules();
    }
  });

  renderImportExport(importExportContainer, currentRules, (importedRules) => {
    currentRules = importedRules;
    syncRules();
  });
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
  });
}

function syncDomains(): void {
  const message: SetDomainsMessage = { type: 'SET_DOMAINS', domains: currentDomains };
  chrome.runtime.sendMessage(message, () => {
    updateDomainUI();
  });
}

function addDomain(): void {
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

function loadInitialData(): void {
  renderStatusIndicator(statusContainer);

  const message: GetRulesMessage = { type: 'GET_RULES' };
  chrome.runtime.sendMessage(message, (response: { rules: Rule[] }) => {
    currentRules = response?.rules || [];
    updateUI();
  });

  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response: ExtensionStatus) => {
    currentDomains = response?.allowedDomains || [];
    updateDomainUI();
  });
}

addDomainBtn.addEventListener('click', addDomain);
domainInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addDomain();
});

addRuleBtn.addEventListener('click', () => showEditor(null));

loadInitialData();
