/**
 * file-capture.js — Intercepts file attachments across all LLM platforms.
 * Handles both <input type="file"> changes and drag-and-drop onto the page.
 */
window.FileCapture = {
  files: [],

  init() {
    // Input[type=file] change (standard file picker)
    document.addEventListener("change", (e) => {
      if (e.target.type === "file" && e.target.files?.length) {
        this.files = Array.from(e.target.files);
      }
    }, true);

    // Drag-and-drop: capture files dropped anywhere on the page
    document.addEventListener("drop", (e) => {
      const transferred = e.dataTransfer?.files;
      if (transferred?.length) {
        this.files = Array.from(transferred);
      }
    }, true);

    // Paste: images pasted via clipboard (Ctrl+V)
    document.addEventListener("paste", (e) => {
      const items = Array.from(e.clipboardData?.items || []);
      const pastedFiles = items
        .filter((item) => item.kind === "file")
        .map((item) => item.getAsFile())
        .filter(Boolean);
      if (pastedFiles.length) {
        this.files = [...this.files, ...pastedFiles];
      }
    }, true);
  },

  clear() {
    this.files = [];
  }
};

FileCapture.init();
