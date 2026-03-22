class AIStudioAdapter extends BaseAdapter {
  constructor() {
    super();
    this.name = "aistudio";
  }

  getInputElement() {
    return DOMUtils.queryFirst(
      'textarea[aria-label="Type something"]',
      'div[contenteditable="true"].input-area',
      'ms-prompt-input textarea',
      'textarea.gmat-body-1'
    );
  }

  getSendButton() {
    return DOMUtils.queryFirst(
      'button[aria-label="Run"]',
      'run-button button',
      'button.run-button'
    );
  }

  isSubmitTrigger(event) {
    if (event.type === "keydown") {
      // AI Studio uses Ctrl+Enter to run
      return event.key === "Enter" && (event.ctrlKey || event.metaKey);
    }
    return super.isSubmitTrigger(event);
  }
}
window.AIStudioAdapter = AIStudioAdapter;
