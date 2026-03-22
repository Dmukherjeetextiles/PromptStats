/**
 * E2E: Tests extension injection against a local mock LLM page.
 *
 * Run:  npx playwright test
 * Requires: `npm run mock-server` to serve e2e/mock-page/index.html on :3999
 */
const { test, expect } = require("@playwright/test");

const MOCK_URL = "http://localhost:3999";

test.describe("PromptStats Extension Injection", () => {
  test("dashboard is injected into the page", async ({ page }) => {
    await page.goto(MOCK_URL);
    // Shadow DOM host must exist
    const host = await page.locator("#promptstats-host");
    await expect(host).toHaveCount(1);
  });

  test("dashboard collapse/expand toggle works", async ({ page }) => {
    await page.goto(MOCK_URL);
    // Reach into shadow DOM
    const collapseBtn = page.locator("#promptstats-host").locator("pierce/#ps-collapse-btn");
    await collapseBtn.click();
    const body = page.locator("#promptstats-host").locator("pierce/#ps-body");
    await expect(body).toHaveClass(/collapsed/);
    await collapseBtn.click();
    await expect(body).not.toHaveClass(/collapsed/);
  });

  test("typing and submitting a prompt updates the dashboard", async ({ page }) => {
    await page.goto(MOCK_URL);
    // Type into mock textarea
    const input = page.locator("#mock-input");
    await input.fill("Hello world, this is a test prompt for PromptStats.");
    // Click the mock send button
    await page.locator("#mock-send").click();
    // Wait for storage write + UI refresh (storage.onChanged)
    await page.waitForTimeout(500);
    // Token count should be visible and > 0
    const tokenEl = page.locator("#promptstats-host").locator("pierce/#ps-tokens");
    const tokenText = await tokenEl.innerText();
    expect(parseInt(tokenText, 10)).toBeGreaterThan(0);
  });

  test("PII warning appears for prompt containing email", async ({ page }) => {
    await page.goto(MOCK_URL);
    await page.locator("#mock-input").fill("My email is test.user@example.com please contact me.");
    await page.locator("#mock-send").click();
    await page.waitForTimeout(500);
    const piiEl = page.locator("#promptstats-host").locator("pierce/#ps-pii");
    await expect(piiEl).toContainText("email");
  });

  test("settings panel toggles open and closed", async ({ page }) => {
    await page.goto(MOCK_URL);
    const settingsBtn = page.locator("#promptstats-host").locator("pierce/#ps-settings-btn");
    await settingsBtn.click();
    const panel = page.locator("#promptstats-host").locator("pierce/#ps-settings");
    await expect(panel).toHaveClass(/open/);
    await settingsBtn.click();
    await expect(panel).not.toHaveClass(/open/);
  });

  test("dashboard is draggable via keyboard arrow keys", async ({ page }) => {
    await page.goto(MOCK_URL);
    const header = page.locator("#promptstats-host").locator("pierce/#ps-header");
    await header.focus();
    const root = page.locator("#promptstats-host").locator("pierce/#ps-root");
    const before = await root.boundingBox();
    await header.press("ArrowLeft");
    const after = await root.boundingBox();
    expect(after.x).toBeLessThan(before.x);
  });
});
