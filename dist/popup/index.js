// src/popup/index.ts
var toggleBtn = document.getElementById("toggleBtn");
var statusBadge = document.getElementById("statusBadge");
var defaultFormatSelect = document.getElementById("defaultFormat");
chrome.storage.local.get(["defaultFormat"], (result) => {
  if (result.defaultFormat) {
    defaultFormatSelect.value = result.defaultFormat;
  }
});
defaultFormatSelect.addEventListener("change", () => {
  chrome.storage.local.set({ defaultFormat: defaultFormatSelect.value });
});
function updateUI(state) {
  if (state.isFrozen) {
    statusBadge.textContent = "Frozen \u2744";
    statusBadge.className = "badge frozen";
    toggleBtn.innerHTML = "<span>Resume Hover</span>";
  } else if (state.isActive) {
    statusBadge.textContent = "Active";
    statusBadge.className = "badge active";
    toggleBtn.innerHTML = "<span>Deactivate</span>";
  } else {
    statusBadge.textContent = "Standby";
    statusBadge.className = "badge";
    toggleBtn.innerHTML = "<span>Launch Inspector</span>";
  }
}
async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? null;
}
async function checkCurrentState() {
  const tabId = await getActiveTabId();
  if (!tabId) return;
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: "GET_STATE" });
    if (response?.state) {
      updateUI(response.state);
    }
  } catch {
    updateUI({ isActive: false, isFrozen: false, hasTarget: false });
  }
}
toggleBtn.addEventListener("click", async () => {
  const tabId = await getActiveTabId();
  if (!tabId) return;
  try {
    await chrome.tabs.sendMessage(tabId, { type: "TOGGLE_INSPECTOR" });
    setTimeout(checkCurrentState, 50);
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content/index.js"]
    });
    setTimeout(async () => {
      await chrome.tabs.sendMessage(tabId, { type: "TOGGLE_INSPECTOR" });
      checkCurrentState();
    }, 150);
  }
});
checkCurrentState();
