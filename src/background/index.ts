import type { ExtensionMessage } from '../messages';

async function sendTabMessage(tabId: number, message: ExtensionMessage) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // If content script is not yet injected, inject it on-demand
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/index.js']
      });
      // Retry once after injection
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, message).catch(() => {});
      }, 100);
    } catch (err) {
      console.error('Failed to inject UI Dissect content script:', err);
    }
  }
}

// Handle keyboard shortcuts (Ctrl+Shift+X / Cmd+Shift+X)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-inspect') {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id) {
      await sendTabMessage(activeTab.id, { type: 'TOGGLE_INSPECTOR' });
    }
  }
});

// Handle internal messages
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  if (message.type === 'STATE_CHANGED') {
    // Update badge state
    const tabId = sender.tab?.id;
    if (tabId) {
      const text = message.state.isActive ? (message.state.isFrozen ? '❄' : 'ON') : '';
      chrome.action.setBadgeText({ tabId, text });
      chrome.action.setBadgeBackgroundColor({
        tabId,
        color: message.state.isFrozen ? '#38bdf8' : '#6366f1'
      });
    }
    sendResponse({ success: true });
  }
  return true;
});
