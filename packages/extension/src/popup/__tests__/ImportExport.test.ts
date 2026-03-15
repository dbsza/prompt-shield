import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderImportExport } from '../ImportExport';
import type { Rule } from '../../types';

describe('ImportExport', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('renders import and export buttons', () => {
    renderImportExport(container, [], vi.fn());
    expect(container.querySelector('#import-file')).toBeTruthy();
    expect(container.querySelector('#export-btn')).toBeTruthy();
  });

  it('has file input that accepts json', () => {
    renderImportExport(container, [], vi.fn());
    const fileInput = container.querySelector('#import-file') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    expect(fileInput.type).toBe('file');
    expect(fileInput.accept).toBe('.json');
  });

  it('has export button', () => {
    const rules: Rule[] = [
      { guid: '1', name: 'test', regex: 'abc', severity: 'high', action: 'block' },
    ];
    renderImportExport(container, rules, vi.fn());
    const exportBtn = container.querySelector('#export-btn') as HTMLElement;
    expect(exportBtn).toBeTruthy();
    expect(exportBtn.textContent).toContain('Export');
  });
});
