import type { Rule } from '../types';

export type ImportCallback = (rules: Rule[]) => void;

export function renderImportExport(
  container: HTMLElement,
  rules: Rule[],
  onImport: ImportCallback,
): void {
  container.innerHTML = `
    <div class="import-export-actions">
      <label class="file-label" for="import-file">Import JSON</label>
      <input type="file" id="import-file" accept=".json">
      <button class="btn btn-secondary" id="export-btn">Export JSON</button>
    </div>
  `;

  const fileInput = container.querySelector('#import-file') as HTMLInputElement;
  fileInput.addEventListener('change', () => handleImport(fileInput, onImport));

  container.querySelector('#export-btn')!.addEventListener('click', () => handleExport(rules));
}

function handleImport(fileInput: HTMLInputElement, onImport: ImportCallback): void {
  const file = fileInput.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target?.result as string;
      const parsed = JSON.parse(text);
      const rules: Rule[] = Array.isArray(parsed) ? parsed : parsed.rules || parsed.patterns || [];

      // Validate
      for (const rule of rules) {
        if (!rule.guid || !rule.name || !rule.regex || !rule.severity || !rule.action) {
          throw new Error(`Invalid rule: ${JSON.stringify(rule)}`);
        }
      }

      onImport(rules);
    } catch (error) {
      alert(`Failed to import rules: ${error}`);
    }
  };

  reader.readAsText(file);
  fileInput.value = '';
}

function handleExport(rules: Rule[]): void {
  const json = JSON.stringify(rules, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'prompt-shield-rules.json';
  link.click();

  URL.revokeObjectURL(url);
}
