// src/background/index.ts
async function sendTabMessage(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content/index.js"]
      });
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, message).catch(() => {
        });
      }, 100);
    } catch (err) {
      console.error("Failed to inject UI Dissect content script:", err);
    }
  }
}
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-inspect") {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id) {
      await sendTabMessage(activeTab.id, { type: "TOGGLE_INSPECTOR" });
    }
  }
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "STATE_CHANGED") {
    const tabId = sender.tab?.id;
    if (tabId) {
      const text = message.state.isActive ? message.state.isFrozen ? "\u2744" : "ON" : "";
      chrome.action.setBadgeText({ tabId, text });
      chrome.action.setBadgeBackgroundColor({
        tabId,
        color: message.state.isFrozen ? "#38bdf8" : "#6366f1"
      });
    }
    sendResponse({ success: true });
  }
  return true;
});
