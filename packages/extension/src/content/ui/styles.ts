export const BANNER_STYLES = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 2147483647;
    max-width: 420px;
    width: 100%;
  }

  .shield-banner {
    background: #1a1a2e;
    border: 1px solid #e94560;
    border-radius: 12px;
    padding: 16px;
    color: #eee;
    box-shadow: 0 8px 32px rgba(233, 69, 96, 0.3);
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateY(100px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .shield-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    font-size: 14px;
    font-weight: 600;
  }

  .shield-icon {
    font-size: 18px;
  }

  .shield-severity {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .severity-critical { background: #e94560; color: white; }
  .severity-high { background: #ff6b35; color: white; }
  .severity-medium { background: #ffc107; color: #1a1a2e; }
  .severity-low { background: #4caf50; color: white; }

  .shield-detections {
    list-style: none;
    padding: 0;
    margin: 0 0 12px 0;
    max-height: 120px;
    overflow-y: auto;
    font-size: 12px;
  }

  .shield-detections li {
    padding: 4px 0;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .detection-name {
    color: #aaa;
  }

  .detection-match {
    color: #e94560;
    font-family: monospace;
    font-size: 11px;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .shield-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .shield-btn {
    padding: 6px 14px;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .shield-btn:hover {
    opacity: 0.85;
  }

  .btn-block {
    background: #e94560;
    color: white;
  }

  .btn-redact {
    background: #ff6b35;
    color: white;
  }

  .btn-allow {
    background: #333;
    color: #aaa;
    border: 1px solid #555;
  }
`;
