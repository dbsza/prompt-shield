import type { ExtensionStatus, GetStatusMessage } from '../types';

export function renderStatusIndicator(container: HTMLElement): void {
  container.innerHTML = `
    <div class="status">
      <span class="status-dot inactive" id="status-dot"></span>
      <span id="status-text">Loading...</span>
    </div>
  `;

  refreshStatus(container);
}

export function refreshStatus(container: HTMLElement): void {
  const message: GetStatusMessage = { type: 'GET_STATUS' };

  chrome.runtime.sendMessage(message, (response: ExtensionStatus) => {
    const dot = container.querySelector('#status-dot');
    const text = container.querySelector('#status-text');

    if (!dot || !text) return;

    if (response?.enabled) {
      dot.className = 'status-dot active';
      text.textContent = `${response.rulesCount} rules | ${response.totalDetections} detections`;
    } else {
      dot.className = 'status-dot inactive';
      text.textContent = 'Disabled';
    }
  });
}
