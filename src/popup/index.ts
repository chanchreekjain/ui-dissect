import type { ExtensionMessage } from '../messages';
import type { InspectorState } from '../types';

const toggleBtn = document.getElementById('toggleBtn') as HTMLButtonElement;
const statusBadge = document.getElementById('statusBadge') as HTMLSpanElement;
const defaultFormatSelect = document.getElementById('defaultFormat') as HTMLSelectElement;

// Load stored preferences
chrome.storage.local.get(['defaultFormat'], (result) => {
  if (result.defaultFormat) {
    defaultFormatSelect.value = result.defaultFormat;
  }
});

defaultFormatSelect.addEventListener('change', () => {
  chrome.storage.local.set({ defaultFormat: defaultFormatSelect.value });
});

function updateUI(state: InspectorState) {
  if (state.isFrozen) {
    statusBadge.textContent = 'Frozen ❄';
    statusBadge.className = 'badge frozen';
    toggleBtn.innerHTML = '<span>Resume Hover</span>';
  } else if (state.isActive) {
    statusBadge.textContent = 'Active';
    statusBadge.className = 'badge active';
    toggleBtn.innerHTML = '<span>Deactivate</span>';
  } else {
    statusBadge.textContent = 'Standby';
    statusBadge.className = 'badge';
    toggleBtn.innerHTML = '<span>Launch Inspector</span>';
  }
}

async function getActiveTabId(): Promise<number | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? null;
}

// Request active state from tab
async function checkCurrentState() {
  const tabId = await getActiveTabId();
  if (!tabId) return;

  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'GET_STATE' } as ExtensionMessage);
    if (response?.state) {
      updateUI(response.state);
    }
  } catch {
    // Content script might not be injected yet
    updateUI({ isActive: false, isFrozen: false, hasTarget: false });
  }
}

toggleBtn.addEventListener('click', async () => {
  const tabId = await getActiveTabId();
  if (!tabId) return;

  try {
    await chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_INSPECTOR' } as ExtensionMessage);
    setTimeout(checkCurrentState, 50);
  } catch {
    // Inject and trigger
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/index.js']
    });
    setTimeout(async () => {
      await chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_INSPECTOR' } as ExtensionMessage);
      checkCurrentState();
    }, 150);
  }
});

checkCurrentState();
