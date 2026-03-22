class ClaudeAdapter extends BaseAdapter {
  constructor() {
    super();
    this.name = "claude";
  }

  getInputElement() {
    return DOMUtils.queryFirst(
      'div[contenteditable="true"].ProseMirror',
      'div[contenteditable="true"][data-testid="compose-area"]',
      'div[contenteditable="true"]'
    );
  }

  getSendButton() {
    return DOMUtils.queryFirst(
      'button[aria-label="Send Message"]',
      'button[aria-label="Send message"]',
      'button[data-testid="send-button"]'
    );
  }
}
window.ClaudeAdapter = ClaudeAdapter;
