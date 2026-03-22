/**
 * prompt-capture.js — Listens for prompt submission events.
 * Delegates DOM detection to the active site adapter.
 * Writes results to chrome.storage.local (not postMessage) for persistence.
 */
(function () {
  let adapter = null;
  let currentText = "";

  function initAdapter() {
    const host = location.hostname;
    if (host.includes("chatgpt"))      adapter = new ChatGPTAdapter();
    else if (host.includes("gemini"))  adapter = new GeminiAdapter();
    else if (host.includes("claude"))  adapter = new ClaudeAdapter();
    else if (host.includes("aistudio")) adapter = new AIStudioAdapter();
    else                               adapter = new BaseAdapter();
    adapter.init();
  }

  // Track input changes
  document.addEventListener("input", (e) => {
    if (DOMUtils.isEditable(e.target)) {
      currentText = (e.target.innerText || e.target.value || "").trim();
    }
  }, true);

  // Keydown submit
  document.addEventListener("keydown", async (e) => {
    if (adapter?.isSubmitTrigger(e)) await processPrompt();
  }, true);

  // Click submit
  document.addEventListener("click", async (e) => {
    if (adapter?.isSubmitTrigger(e)) await processPrompt();
  }, true);

  async function processPrompt() {
    // Re-read from DOM as fallback (some SPAs clear input before event fires)
    if (!currentText) {
      const el = adapter?.getInputElement();
      if (el) currentText = adapter.extractText(el);
    }
    if (!currentText) return;

    const textStats  = TokenEstimator.estimateText(currentText);
    const fileTokens = TokenEstimator.estimateFiles(FileCapture.files);
    const tokens     = textStats.tokens + fileTokens;

    const env        = EnvironmentEngine.calculate(tokens);
    const piiFindings = PIIDetector.scan(currentText);
    const promptHash = await CryptoUtils.sha256(currentText);

    await FrequencyEngine.record();

    // ── Write to chrome.storage.local ─────────────────────────────────────
    const entry = {
      ts:         TimeUtils.nowISO(),
      platform:   adapter?.name ?? "unknown",
      words:      textStats.words,
      letters:    textStats.letters,
      tokens,
      fileCount:  FileCapture.files.length,
      env,
      piiFindings,     // [{ type, severity }] — no raw text
      promptHash,      // SHA-256 only
      hasPII:     piiFindings.length > 0,
      highRisk:   PIIDetector.hasHighSeverity(piiFindings)
    };

    // Update cumulative stats
    chrome.storage.local.get(["stats", "settings"], async (result) => {
      const prev = result.stats || { totalPrompts: 0, totalTokens: 0, totalCO2: 0, totalEnergy: 0, totalWater: 0 };
      const updated = {
        totalPrompts: prev.totalPrompts + 1,
        totalTokens:  prev.totalTokens  + tokens,
        totalCO2:     +(prev.totalCO2    + env.co2).toFixed(6),
        totalEnergy:  +(prev.totalEnergy + env.energy).toFixed(6),
        totalWater:   +(prev.totalWater  + env.water).toFixed(6)
      };

      chrome.storage.local.set({ lastPrompt: entry, stats: updated });

      // Backend services (privacy gates are inside each service)
      await SupabaseService.insert({
        ...entry,
        co2:         env.co2,
        water:       env.water,
        energy:      env.energy,
        piiTypes:    piiFindings.map((f) => f.type),
        promptText:  currentText   // Supabase service will null this if not consented
      });

      await GA4Service.send("prompt_sent", { tokens, platform: entry.platform });
    });

    // Reset
    currentText = "";
    FileCapture.clear();
  }

  // Initialise adapter once DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdapter);
  } else {
    initAdapter();
  }
})();
