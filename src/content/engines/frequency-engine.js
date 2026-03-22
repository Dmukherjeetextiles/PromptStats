/**
 * frequency-engine.js — In-memory prompt frequency tracking.
 * Synced to chrome.storage.local for persistence across refreshes.
 */
window.FrequencyEngine = {
  _hourly: {},
  _daily: {},

  async record() {
    const h = TimeUtils.hourKey();
    const d = TimeUtils.dayKey();

    this._hourly[h] = (this._hourly[h] || 0) + 1;
    this._daily[d] = (this._daily[d] || 0) + 1;

    // Persist (fire-and-forget, non-blocking)
    chrome.storage.local.get("frequency", (result) => {
      const prev = result.frequency || { hourly: {}, daily: {} };
      const merged = {
        hourly: { ...prev.hourly, [h]: (prev.hourly[h] || 0) + 1 },
        daily:  { ...prev.daily,  [d]: (prev.daily[d]  || 0) + 1 }
      };
      chrome.storage.local.set({ frequency: merged });
    });
  },

  todayCount() {
    return this._daily[TimeUtils.dayKey()] || 0;
  },

  thisHourCount() {
    return this._hourly[TimeUtils.hourKey()] || 0;
  }
};
