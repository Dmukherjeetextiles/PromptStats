/**
 * dashboard.js — Shadow DOM dashboard widget.
 *
 * Encapsulated in a Shadow DOM so host-site CSS cannot bleed in.
 * Draggable, collapsible, keyboard-navigable (WCAG 2.1 AA).
 * All data is read from chrome.storage.local — no postMessage dependency.
 */
window.PromptStatsDashboard = (() => {
  const STORAGE_POS_KEY = "dashboardPos";

  // ── Template ─────────────────────────────────────────────────────────────
  const CSS = `
    :host { all: initial; font-family: system-ui, -apple-system, sans-serif; }

    #ps-root {
      position: fixed;
      z-index: 2147483647;
      width: 300px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.18);
      overflow: hidden;
      transition: box-shadow 0.2s;
      user-select: none;
    }
    #ps-root:focus-within { box-shadow: 0 4px 24px rgba(0,0,0,0.28); }

    /* Drag handle / header */
    #ps-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      background: #1a1a2e;
      color: #fff;
      cursor: grab;
      border-radius: 12px 12px 0 0;
    }
    #ps-header:active { cursor: grabbing; }
    #ps-title { font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 8px; }
    #ps-logo  { width: 22px; height: 22px; border-radius: 5px; display: block; flex-shrink: 0; }

    /* Collapse / close buttons */
    .ps-btn {
      background: none; border: none; color: #fff; cursor: pointer;
      padding: 2px 6px; border-radius: 4px; font-size: 14px; line-height: 1;
    }
    .ps-btn:hover  { background: rgba(255,255,255,0.15); }
    .ps-btn:focus  { outline: 2px solid #e040fb; outline-offset: 2px; }

    /* Body */
    #ps-body { padding: 10px; }
    #ps-body.collapsed { display: none; }

    /* Cards */
    .ps-card {
      background: #f7f7fb;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 8px;
      font-size: 12px;
    }
    .ps-card:last-child { margin-bottom: 0; }
    .ps-card h3 {
      margin: 0 0 6px; font-size: 11px; text-transform: uppercase;
      letter-spacing: 0.06em; color: #888; font-weight: 600;
    }
    .ps-row { display: flex; justify-content: space-between; align-items: center; margin: 3px 0; }
    .ps-label { color: #555; }
    .ps-value { font-weight: 600; color: #1a1a2e; }

    /* PII badges */
    .pii-badge {
      display: inline-block; padding: 2px 7px; border-radius: 10px;
      font-size: 10px; font-weight: 700; margin: 2px 2px 0 0; text-transform: uppercase;
    }
    .pii-high   { background: #fde8e8; color: #c0392b; }
    .pii-medium { background: #fef3cd; color: #856404; }
    .pii-low    { background: #e8f4fd; color: #1a6fa8; }
    .pii-none   { color: #27ae60; font-weight: 600; }

    /* Totals footer */
    #ps-footer {
      background: #f0eeff;
      padding: 8px 12px;
      font-size: 11px;
      color: #555;
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #e0ddf5;
    }
    .ps-total-item { text-align: center; }
    .ps-total-num  { font-weight: 700; color: #1a1a2e; font-size: 13px; display: block; }

    /* Settings panel */
    #ps-settings {
      padding: 10px 12px;
      background: #fff;
      border-top: 1px solid #eee;
      font-size: 12px;
      display: none;
    }
    #ps-settings.open { display: block; }
    .ps-setting-row {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 8px;
    }
    .ps-setting-row label { color: #333; cursor: pointer; }
    .ps-toggle {
      position: relative; width: 34px; height: 18px; cursor: pointer;
    }
    .ps-toggle input { opacity: 0; width: 0; height: 0; }
    .ps-slider {
      position: absolute; inset: 0; background: #ccc; border-radius: 18px;
      transition: background 0.2s;
    }
    .ps-slider::before {
      content: ""; position: absolute;
      width: 14px; height: 14px; left: 2px; top: 2px;
      background: white; border-radius: 50%; transition: transform 0.2s;
    }
    .ps-toggle input:checked + .ps-slider { background: #7c3aed; }
    .ps-toggle input:checked + .ps-slider::before { transform: translateX(16px); }
    .ps-toggle input:focus + .ps-slider { outline: 2px solid #7c3aed; outline-offset: 2px; }
  `;

  const HTML = `
    <style>${CSS}</style>
    <div id="ps-root" role="complementary" aria-label="PromptStats dashboard">
      <div id="ps-header" role="toolbar" aria-label="PromptStats toolbar">
        <div id="ps-title" aria-label="PromptStats">
          <img id="ps-logo" alt="PromptStats logo" aria-hidden="true"/>
          PromptStats
        </div>
        <div style="display:flex;gap:4px">
          <button class="ps-btn" id="ps-settings-btn" aria-label="Toggle settings" title="Settings">⚙</button>
          <button class="ps-btn" id="ps-collapse-btn" aria-label="Collapse dashboard" aria-expanded="true" title="Collapse">−</button>
        </div>
      </div>

      <div id="ps-body" aria-live="polite" aria-atomic="false">
        <div class="ps-card" aria-label="Prompt statistics">
          <h3>Last Prompt</h3>
          <div class="ps-row"><span class="ps-label">Words</span>      <span class="ps-value" id="ps-words">—</span></div>
          <div class="ps-row"><span class="ps-label">Letters</span>    <span class="ps-value" id="ps-letters">—</span></div>
          <div class="ps-row"><span class="ps-label">Files</span>      <span class="ps-value" id="ps-files">—</span></div>
          <div class="ps-row"><span class="ps-label">Tokens (est.)</span><span class="ps-value" id="ps-tokens">—</span></div>
          <div class="ps-row"><span class="ps-label">Platform</span>   <span class="ps-value" id="ps-platform">—</span></div>
        </div>

        <div class="ps-card" aria-label="Environmental impact">
          <h3>Environmental Impact</h3>
          <div class="ps-row"><span class="ps-label">Energy</span>     <span class="ps-value" id="ps-energy">—</span></div>
          <div class="ps-row"><span class="ps-label">CO₂</span>        <span class="ps-value" id="ps-co2">—</span></div>
          <div class="ps-row"><span class="ps-label">Water</span>      <span class="ps-value" id="ps-water">—</span></div>
        </div>

      

      <div id="ps-footer" aria-label="Cumulative totals">
        <div class="ps-total-item"><span class="ps-total-num" id="ps-total-prompts">0</span>Prompts</div>
        <div class="ps-total-item"><span class="ps-total-num" id="ps-total-energy">0</span>Energy</div>
        <div class="ps-total-item"><span class="ps-total-num" id="ps-total-co2">0g</span>CO₂</div>
        <div class="ps-total-item"><span class="ps-total-num" id="ps-total-water">0mL</span>Water</div>
      </div>

      <div id="ps-settings" role="region" aria-label="Settings">
        <div class="ps-setting-row">
          <label for="ps-toggle-supabase">Enable Supabase sync</label>
          <label class="ps-toggle">
            <input type="checkbox" id="ps-toggle-supabase" role="switch" aria-checked="false">
            <span class="ps-slider"></span>
          </label>
        </div>
        <div class="ps-setting-row">
          <label for="ps-toggle-ga4">Enable analytics (GA4)</label>
          <label class="ps-toggle">
            <input type="checkbox" id="ps-toggle-ga4" role="switch" aria-checked="false">
            <span class="ps-slider"></span>
          </label>
        </div>
        <div class="ps-setting-row">
          <label for="ps-toggle-rawprompt">Store raw prompts (⚠ opt-in)</label>
          <label class="ps-toggle">
            <input type="checkbox" id="ps-toggle-rawprompt" role="switch" aria-checked="false">
            <span class="ps-slider"></span>
          </label>
        </div>
      </div>
    </div>
  `;

  // ── Mount ─────────────────────────────────────────────────────────────────
  function mount() {
    if (document.getElementById("promptstats-host")) return;

    const host = document.createElement("div");
    host.id = "promptstats-host";
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = HTML;

    const root = shadow.getElementById("ps-root");

    // Set logo src via chrome.runtime.getURL — must be done in JS,
    // not hardcoded in the HTML string, because the extension origin
    // is not known at template-definition time.
    const logoEl = shadow.getElementById("ps-logo");
    logoEl.src = chrome.runtime.getURL("assets/logo.svg");

    // ── Restore position from storage ──
    chrome.storage.local.get(STORAGE_POS_KEY, (result) => {
      const pos = result[STORAGE_POS_KEY] || { top: "80px", right: "20px" };
      root.style.top   = pos.top;
      root.style.right = pos.right;
      root.style.left  = pos.left  || "auto";
    });

    // ── Drag logic ─────────────────────────────────────────────────────────
    const header = shadow.getElementById("ps-header");
    let dragging = false, startX, startY, origLeft, origTop;

    header.addEventListener("mousedown", (e) => {
      if (e.target.classList.contains("ps-btn")) return;
      dragging = true;
      const rect = root.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      origLeft = rect.left;
      origTop  = rect.top;
      root.style.right = "auto";
      root.style.left  = origLeft + "px";
      root.style.top   = origTop  + "px";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup",   onMouseUp);
    });

    // Keyboard drag: arrow keys on header
    header.setAttribute("tabindex", "0");
    header.addEventListener("keydown", (e) => {
      const STEP = 20;
      const rect = root.getBoundingClientRect();
      let left = rect.left, top = rect.top;
      if (e.key === "ArrowLeft")  left -= STEP;
      if (e.key === "ArrowRight") left += STEP;
      if (e.key === "ArrowUp")    top  -= STEP;
      if (e.key === "ArrowDown")  top  += STEP;
      if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)) {
        e.preventDefault();
        root.style.right = "auto";
        root.style.left = left + "px";
        root.style.top  = top  + "px";
        savePosition(left + "px", top + "px");
      }
    });

    function onMouseMove(e) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      root.style.left = Math.max(0, origLeft + dx) + "px";
      root.style.top  = Math.max(0, origTop  + dy) + "px";
    }

    function onMouseUp() {
      dragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup",   onMouseUp);
      const rect = root.getBoundingClientRect();
      savePosition(rect.left + "px", rect.top + "px");
    }

    function savePosition(left, top) {
      chrome.storage.local.set({ [STORAGE_POS_KEY]: { left, top, right: "auto" } });
    }

    // ── Collapse toggle ────────────────────────────────────────────────────
    const body       = shadow.getElementById("ps-body");
    const collapseBtn = shadow.getElementById("ps-collapse-btn");
    let collapsed = false;

    collapseBtn.addEventListener("click", () => {
      collapsed = !collapsed;
      body.classList.toggle("collapsed", collapsed);
      collapseBtn.textContent    = collapsed ? "+" : "−";
      collapseBtn.title          = collapsed ? "Expand" : "Collapse";
      collapseBtn.setAttribute("aria-expanded", String(!collapsed));
    });

    // ── Settings panel ─────────────────────────────────────────────────────
    const settingsPanel = shadow.getElementById("ps-settings");
    const settingsBtn   = shadow.getElementById("ps-settings-btn");
    settingsBtn.addEventListener("click", () => settingsPanel.classList.toggle("open"));

    const toggleSupabase  = shadow.getElementById("ps-toggle-supabase");
    const toggleGA4       = shadow.getElementById("ps-toggle-ga4");
    const toggleRawPrompt = shadow.getElementById("ps-toggle-rawprompt");

    // Load current settings into toggles
    chrome.storage.local.get("settings", (result) => {
      const s = result.settings || {};
      toggleSupabase.checked  = !!s.enableSupabase;
      toggleGA4.checked       = !!s.enableGA4;
      toggleRawPrompt.checked = !!s.storeRawPrompts;
    });

    function saveSettings() {
      chrome.storage.local.get("settings", (result) => {
        const current = result.settings || {};
        chrome.storage.local.set({
          settings: {
            ...current,
            enableSupabase:  toggleSupabase.checked,
            enableGA4:       toggleGA4.checked,
            storeRawPrompts: toggleRawPrompt.checked
          }
        });
      });
    }

    [toggleSupabase, toggleGA4, toggleRawPrompt].forEach((t) => {
      t.addEventListener("change", saveSettings);
    });

    // ── Real-time data refresh ──────────────────────────────────────────────
    function refreshUI() {
      chrome.storage.local.get(["lastPrompt", "stats"], (result) => {
        const p = result.lastPrompt;
        const s = result.stats || {};

        if (p) {
          shadow.getElementById("ps-words").textContent    = p.words ?? "—";
          shadow.getElementById("ps-letters").textContent  = p.letters ?? "—";
          shadow.getElementById("ps-files").textContent    = p.fileCount ?? "—";
          shadow.getElementById("ps-tokens").textContent   = p.tokens ?? "—";
          shadow.getElementById("ps-platform").textContent = (p.platform ?? "—").toUpperCase();
          shadow.getElementById("ps-energy").textContent   = p.env?.energy != null ? p.env.energy.toFixed(4) + " Wh" : "—";
          shadow.getElementById("ps-co2").textContent      = p.env?.co2    != null ? p.env.co2.toFixed(4)    + " g"  : "—";
          shadow.getElementById("ps-water").textContent    = p.env?.water  != null ? p.env.water.toFixed(4)  + " mL" : "—";

          const piiEl = shadow.getElementById("ps-pii");
          if (p.piiFindings?.length) {
            piiEl.innerHTML = p.piiFindings.map(
              (f) => `<span class="pii-badge pii-${f.severity}" title="${f.type}">${f.type}</span>`
            ).join("");
          } else {
            piiEl.innerHTML = '<span class="pii-none">✓ None detected</span>';
          }
        }

        if (s.totalPrompts != null) {
          shadow.getElementById("ps-total-prompts").textContent = s.totalPrompts;
          shadow.getElementById("ps-total-tokens").textContent  = s.totalTokens ?? 0;
          shadow.getElementById("ps-total-co2").textContent     = (s.totalCO2 ?? 0).toFixed(2) + "g";
          shadow.getElementById("ps-total-water").textContent   = (s.totalWater ?? 0).toFixed(1) + "mL";
        }
      });
    }

    // Listen for storage changes (written by prompt-capture.js)
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && (changes.lastPrompt || changes.stats)) refreshUI();
    });

    refreshUI();

    return { shadow, root };
  }

  function unmount() {
    document.getElementById("promptstats-host")?.remove();
  }

  function toggle() {
    const host = document.getElementById("promptstats-host");
    host ? unmount() : mount();
  }

  return { mount, unmount, toggle };
})();
