/**
 * index.js — Content script entry point.
 * Mounts the dashboard on load and wires the background toggle message.
 */
(function () {
  // Auto-show dashboard on supported pages
  PromptStatsDashboard.mount();

  // Background service worker sends TOGGLE_DASHBOARD on toolbar click
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "TOGGLE_DASHBOARD") {
      PromptStatsDashboard.toggle();
    }
  });
})();
