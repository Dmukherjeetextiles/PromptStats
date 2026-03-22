/**
 * ga4.js — Anonymous analytics via GA4 Measurement Protocol.
 *
 * CNIL / GDPR compliance:
 *   - Tracking is OFF by default (enableGA4: false).
 *   - client_id is a random UUID regenerated each session — never
 *     linked to a real user or email address.
 *   - We post to /mp/collect which does NOT capture the sender's IP
 *     address server-side (unlike the JS snippet which leaks IP).
 *   - No PII parameters are ever included in event payloads.
 *   - engagement_time_msec is set to 0 to avoid session linking.
 */
window.GA4Service = {
  _measurementId: "G-XXXXXXXXXX",   // Replace with your GA4 Measurement ID
  _apiSecret:     "REPLACE_ME",     // GA4 Measurement Protocol API secret

  async send(eventName, params = {}) {
    const settings = await this._getSettings();
    if (!settings.enableGA4) return;

    // Strip any accidentally included PII keys
    const safeParams = this._sanitise(params);

    const sessionId = await CryptoUtils.getSessionId();

    const body = {
      client_id:        sessionId,
      non_personalized_ads: true,
      events: [{
        name:   eventName,
        params: {
          engagement_time_msec: 0,
          session_id:           sessionId,
          ...safeParams
        }
      }]
    };

    try {
      await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${this._measurementId}&api_secret=${this._apiSecret}`,
        { method: "POST", body: JSON.stringify(body) }
      );
    } catch (err) {
      console.warn("[PromptStats] GA4 send failed:", err.message);
    }
  },

  _sanitise(params) {
    const BLOCKED_KEYS = ["prompt", "text", "content", "email", "name", "ip"];
    return Object.fromEntries(
      Object.entries(params).filter(([k]) => !BLOCKED_KEYS.includes(k.toLowerCase()))
    );
  },

  _getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get("settings", (r) =>
        resolve(r.settings || { enableGA4: false })
      );
    });
  }
};
