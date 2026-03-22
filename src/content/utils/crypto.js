/**
 * crypto.js — Privacy-safe hashing utilities.
 * Uses SubtleCrypto (Web Crypto API) for local-only one-way SHA-256 hashing.
 * Raw prompt text is NEVER sent to any backend by default.
 */
window.CryptoUtils = {
  /**
   * Returns a hex-encoded SHA-256 digest of the input string.
   * Used to store a fingerprint of prompts without exposing content.
   */
  async sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  },

  /**
   * Returns a stable, anonymous session ID stored in chrome.storage.local.
   * Never transmitted with PII; reset on each install.
   */
  async getSessionId() {
    return new Promise((resolve) => {
      chrome.storage.local.get("sessionId", async (result) => {
        if (result.sessionId) return resolve(result.sessionId);
        const id = crypto.randomUUID();
        chrome.storage.local.set({ sessionId: id });
        resolve(id);
      });
    });
  }
};
