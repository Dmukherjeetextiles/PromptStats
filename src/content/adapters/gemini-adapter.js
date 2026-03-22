class GeminiAdapter extends BaseAdapter {
  constructor() {
    super();
    this.name = "gemini";
  }

  getInputElement() {
    return DOMUtils.queryFirst(
      'div[contenteditable="true"].ql-editor',
      'rich-textarea div[contenteditable="true"]',
      'textarea[aria-label]',
      'div[contenteditable="true"][aria-multiline="true"]'
    );
  }

  getSendButton() {
    return DOMUtils.queryFirst(
      'button[aria-label="Send message"]',
      'button.send-button',
      'button[data-mat-icon-name="send"]',
      'button mat-icon[fonticon="send"]'
    )?.closest("button");
  }
}
window.GeminiAdapter = GeminiAdapter;
