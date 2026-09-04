import type { ExtensionMessage } from '../messages';
import { DOMInspector } from './inspector';

const inspector = new DOMInspector();

console.log('[UI Dissect] Content script active. Press Ctrl+Shift+X or launch from popup.');

window.addEventListener('keydown', (e) => {
  // Toggle shortcut fallback
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyX') {
    e.preventDefault();
    inspector.toggle();
    console.log('[UI Dissect] Inspector toggled via hotkey:', inspector.isActive());
    return;
  }

  if (!inspector.isActive()) return;

  if (e.code === 'Space' && !isInputFocused()) {
    e.preventDefault();
    inspector.toggleFreeze();
    return;
  }

  if (e.code === 'ArrowUp') {
    e.preventDefault();
    inspector.navigateUp();
    return;
  }
  if (e.code === 'ArrowDown') {
    e.preventDefault();
    inspector.navigateDown();
    return;
  }

  if (e.code === 'KeyC' && !isInputFocused() && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    inspector.copyCurrentCode();
    return;
  }

  if (e.code === 'Escape') {
    e.preventDefault();
    if (inspector.getState().isFrozen) {
      inspector.toggleFreeze();
    } else {
      inspector.stop();
    }
  }
});

function isInputFocused(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  return (
    active.tagName === 'INPUT' ||
    active.tagName === 'TEXTAREA' ||
    (active as HTMLElement).isContentEditable
  );
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  switch (message.type) {
    case 'TOGGLE_INSPECTOR':
      inspector.toggle();
      console.log('[UI Dissect] Inspector toggled via popup message:', inspector.isActive());
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
