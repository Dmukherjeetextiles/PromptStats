/**
 * dom.js — Generic DOM utilities (site-specific logic lives in adapters/).
 */
window.DOMUtils = {
  isEditable(el) {
    if (!el) return false;
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") return true;
    const ce = el.getAttribute("contenteditable");
    return ce === "true" || ce === "";
  },
  isEmpty(el) {
    return !(el?.innerText?.trim() || el?.value?.trim());
  },
  queryFirst(...selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch (_) { /* invalid selector guard */ }
    }
    return null;
  }
};
