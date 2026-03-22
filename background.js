/**
 * background.js — Service Worker (MV3)
 * Handles toolbar click toggle and settings persistence.
 */

const DEFAULT_SETTINGS = {
  consentGiven: false,
  storeRawPrompts: false,
  enableGA4: false,
  enableSupabase: false,
  showDashboard: true
};

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_DASHBOARD" }, () => {
    // Suppress "no receiver" errors on pages where content script hasn't loaded
    void chrome.runtime.lastError;
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_SETTINGS") {
    chrome.storage.local.get("settings", (result) => {
      sendResponse({ ...DEFAULT_SETTINGS, ...(result.settings || {}) });
    });
    return true; // keep channel open for async response
  }

  if (message.type === "SAVE_SETTINGS") {
    const merged = { ...DEFAULT_SETTINGS, ...message.settings };
    chrome.storage.local.set({ settings: merged }, () => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "GET_STATS") {
    chrome.storage.local.get(["stats", "lastPrompt"], sendResponse);
    return true;
  }
});

// First-install: initialise default settings
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    chrome.storage.local.set({ settings: DEFAULT_SETTINGS, stats: { totalPrompts: 0 } });
  }
});
