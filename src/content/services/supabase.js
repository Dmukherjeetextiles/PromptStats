/**
 * supabase.js — Privacy-first data persistence layer.
 *
 * GDPR / CNIL compliance:
 *   - Raw prompt text is NEVER stored unless the user has explicitly
 *     opted-in via settings (storeRawPrompts: true).
 *   - By default, only a SHA-256 hash and token/env metadata are stored.
 *   - No user identifiers (IP, email) are collected.
 *   - Data is stored only when enableSupabase: true in settings.
 */
window.SupabaseService = {
  _url: "https://addxwajeiakecjoougni.supabase.co",
  _key: "sb_publishable_506rjNwSNrfbWl7Oe_8g5g_3wOLne5p",

  async insert(payload) {
    const settings = await this._getSettings();
    if (!settings.enableSupabase) return;

    // Build the row — only hash by default
    const row = {
      created_at:    payload.created_at,
      platform:      payload.platform,
      tokens:        payload.tokens,
      words:         payload.words,
      co2_g:         payload.co2,
      water_ml:      payload.water,
      energy_wh:     payload.energy,
      file_count:    payload.fileCount,
      pii_types:     payload.piiTypes,           // e.g. ["email"] — no raw text
      prompt_hash:   payload.promptHash,         // SHA-256, never reversible
      // Only include raw prompt if user explicitly consented
      prompt_text:   settings.storeRawPrompts ? payload.promptText : null
    };

    try {
      await fetch(`${this._url}/rest/v1/prompts`, {
        method: "POST",
        headers: {
          "apikey":         this._key,
          "Authorization":  `Bearer ${this._key}`,
          "Content-Type":   "application/json",
          "Prefer":         "return=minimal"
        },
        body: JSON.stringify(row)
      });
    } catch (err) {
      console.warn("[PromptStats] Supabase insert failed:", err.message);
    }
  },

  _getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get("settings", (r) =>
        resolve(r.settings || { enableSupabase: false, storeRawPrompts: false })
      );
    });
  }
};
