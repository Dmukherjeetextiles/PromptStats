const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./e2e/tests",
  timeout: 30_000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 }
  },
  projects: [
    {
      name: "chromium-extension",
      use: {
        browserName: "chromium",
        // Launch with extension loaded
        launchOptions: {
          args: [
            "--disable-extensions-except=../../",
            "--load-extension=../../"
          ]
        }
      }
    }
  ]
});
