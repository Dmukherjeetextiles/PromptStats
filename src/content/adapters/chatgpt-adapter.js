class ChatGPTAdapter extends BaseAdapter {
  constructor() {
    super();
    this.name = "chatgpt";
  }

  getInputElement() {
    return DOMUtils.queryFirst(
      "#prompt-textarea",
      'div[contenteditable="true"][data-testid]',
      'textarea[data-id]',
      'div[contenteditable="true"].ProseMirror'
    );
  }

  getSendButton() {
    return DOMUtils.queryFirst(
      'button[data-testid="send-button"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label="Send message"]'
    );
  }
}
window.ChatGPTAdapter = ChatGPTAdapter;
