import type { ExtensionMessage } from '../messages';
import { DOMInspector } from './inspector';

const inspector = new DOMInspector();

console.log('[UI Dissect] Content script initialized.');

// Use capture phase (true) so the extension catches Space and shortcuts first
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyX') {
    e.preventDefault();
    e.stopPropagation();
    inspector.toggle();
    return;
  }

  if (!inspector.isActive()) return;

  if (e.code === 'Space' && !isInputFocused()) {
    e.preventDefault();
    e.stopPropagation();
    inspector.toggleFreeze();
    return;
  }

  if (e.code === 'ArrowUp' && !isInputFocused()) {
    e.preventDefault();
    e.stopPropagation();
    inspector.navigateUp();
    return;
  }
  if (e.code === 'ArrowDown' && !isInputFocused()) {
    e.preventDefault();
    e.stopPropagation();
    inspector.navigateDown();
    return;
  }

  if (e.code === 'KeyC' && !isInputFocused() && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    e.stopPropagation();
    inspector.copyCurrentCode();
    return;
  }

  if (e.code === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    if (isInputFocused()) {
      (document.activeElement as HTMLElement | null)?.blur();
      return;
    }
    if (inspector.getState().isFrozen) {
      inspector.toggleFreeze();
    } else {
      inspector.stop();
    }
  }
}, true);

/**
 * True when a form control has focus -- including the HUD's own sliders and colour
 * pickers, which live inside a shadow root where document.activeElement only ever
 * reports the shadow host.
 */
function isInputFocused(): boolean {
  let active: Element | null = document.activeElement;
  while (active && active.shadowRoot && active.shadowRoot.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  if (!active) return false;
  return (
    active.tagName === 'INPUT' ||
    active.tagName === 'TEXTAREA' ||
    active.tagName === 'SELECT' ||
    (active as HTMLElement).isContentEditable === true
  );
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  switch (message.type) {
    case 'TOGGLE_INSPECTOR':
      inspector.toggle();
      sendResponse({ success: true, state: inspector.getState() });
      break;
    case 'FREEZE_INSPECTOR':
      inspector.toggleFreeze();
      sendResponse({ success: true, state: inspector.getState() });
      break;
    case 'GET_STATE':
      sendResponse({ success: true, state: inspector.getState() });
      break;
    case 'COPY_CODE':
      inspector.copyCurrentCode();
      sendResponse({ success: true });
      break;
  }
  return true;
});
