import { attachListeners } from './interceptor';

let observer: MutationObserver | null = null;

const INPUT_SELECTORS = 'textarea, input[type="text"], input:not([type]), [contenteditable="true"]';

function isInputElement(node: Node): boolean {
  if (!(node instanceof HTMLElement)) return false;
  return node.matches(INPUT_SELECTORS) || node.querySelector(INPUT_SELECTORS) !== null;
}

function handleMutations(mutations: MutationRecord[]): void {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (isInputElement(node)) {
        // Input elements added dynamically — listeners already on document via capture
        // No additional action needed for document-level listeners
        break;
      }
    }
  }
}

export function startObserver(): void {
  if (observer) return;

  observer = new MutationObserver(handleMutations);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

export function stopObserver(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}
