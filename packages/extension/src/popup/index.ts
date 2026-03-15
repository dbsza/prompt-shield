import './styles.css';
import type { Rule, SetRulesMessage, GetRulesMessage } from '../types';
import { renderStatusIndicator } from './StatusIndicator';
import { renderRuleList } from './RuleList';
import { renderRuleEditor } from './RuleEditor';
import { renderImportExport } from './ImportExport';

let currentRules: Rule[] = [];

const statusContainer = document.getElementById('status-indicator')!;
const ruleListContainer = document.getElementById('rule-list')!;
const editorSection = document.getElementById('rule-editor-section')!;
const editorContainer = document.getElementById('rule-editor')!;
const editorTitle = document.getElementById('editor-title')!;
const addRuleBtn = document.getElementById('add-rule-btn')!;
const importExportContainer = document.getElementById('import-export')!;

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
}

addRuleBtn.addEventListener('click', () => showEditor(null));

loadInitialData();
