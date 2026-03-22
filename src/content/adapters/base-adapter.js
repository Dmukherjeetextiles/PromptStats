/**
 * BaseAdapter — Abstract site adapter interface.
 * Each LLM platform subclass implements the selectors and extraction logic
 * specific to that site's DOM structure.
 */
class BaseAdapter {
  constructor() {
    this.name = "unknown";
    this._lastText = "";
  }

  /** Returns the active text input / contenteditable element, or null. */
  getInputElement() { return null; }

  /** Returns the send/submit button element, or null. */
  getSendButton() { return null; }

  /** Extracts the current prompt text from an input element. */
  extractText(el) {
    if (!el) return "";
    return (el.innerText ?? el.value ?? "").trim();
  }

  /**
   * Returns true if this DOM event should trigger prompt processing.
   * Subclasses can override to refine logic.
   */
  isSubmitTrigger(event) {
    if (event.type === "keydown") {
      return event.key === "Enter" && !event.shiftKey && !event.ctrlKey;
    }
    if (event.type === "click") {
      const btn = event.target.closest("button, [role='button']");
      if (!btn) return false;
      const sendBtn = this.getSendButton();
      return sendBtn && (btn === sendBtn || sendBtn.contains(btn));
    }
    return false;
  }

  /** Called by prompt-capture once on page load. Override if special init needed. */
  init() {}
}

window.BaseAdapter = BaseAdapter;
