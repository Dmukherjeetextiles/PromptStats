/**
 * token-estimator.test.js
 * Validates accuracy of BPE approximation within ±15% of real Tiktoken cl100k output.
 */

// Provide the module in a non-browser context
const { JSDOM } = require("jsdom");
const dom = new JSDOM("");
global.window = dom.window;
eval(require("fs").readFileSync("./src/content/engines/token-estimator.js", "utf8"));
const TE = window.TokenEstimator;

describe("TokenEstimator.estimateText", () => {
  const TOLERANCE = 0.15; // ±15 %

  function withinTolerance(estimated, actual) {
    return Math.abs(estimated - actual) / actual <= TOLERANCE;
  }

  test("empty string returns zero stats", () => {
    expect(TE.estimateText("").tokens).toBe(0);
    expect(TE.estimateText("  ").tokens).toBe(0);
  });

  test("single common word → 1 token (approx)", () => {
    const { tokens } = TE.estimateText("hello");
    expect(tokens).toBeGreaterThanOrEqual(1);
    expect(tokens).toBeLessThanOrEqual(3);
  });

  test("short sentence word/letter counts are correct", () => {
    const text = "The quick brown fox";
    const { words, letters } = TE.estimateText(text);
    expect(words).toBe(4);
    expect(letters).toBe(text.length);
  });

  test("estimates within ±15% for medium English paragraph (actual ~120 tokens)", () => {
    // 120-token sample from Lorem Ipsum — actual Tiktoken count: ~120
    const text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " +
      "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. " +
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi " +
      "ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit " +
      "in voluptate velit esse cillum dolore eu fugiat nulla pariatur.";
    const { tokens } = TE.estimateText(text);
    expect(withinTolerance(tokens, 120)).toBe(true);
  });

  test("CJK characters inflate token count", () => {
    const ascii  = TE.estimateText("hello world this is a test");
    const cjk    = TE.estimateText("你好世界，这是一个测试句子");
    // CJK tokens-per-char ratio should be higher
    expect(cjk.tokens / cjk.letters).toBeGreaterThan(ascii.tokens / ascii.letters);
  });

  test("null/undefined returns zero stats", () => {
    expect(TE.estimateText(null).tokens).toBe(0);
    expect(TE.estimateText(undefined).tokens).toBe(0);
  });
});

describe("TokenEstimator.estimateFiles", () => {
  test("empty array returns 0", () => {
    expect(TE.estimateFiles([])).toBe(0);
    expect(TE.estimateFiles(null)).toBe(0);
  });

  test("PDF file estimation is positive and proportional to size", () => {
    const small = [{ size: 10 * 1024, type: "application/pdf" }];
    const large = [{ size: 100 * 1024, type: "application/pdf" }];
    expect(TE.estimateFiles(small)).toBeGreaterThan(0);
    expect(TE.estimateFiles(large)).toBeGreaterThan(TE.estimateFiles(small));
  });

  test("image costs less per KB than plain text", () => {
    const img  = [{ size: 50 * 1024, type: "image/png" }];
    const txt  = [{ size: 50 * 1024, type: "text/plain" }];
    expect(TE.estimateFiles(img)).toBeLessThan(TE.estimateFiles(txt));
  });

  test("multiple files sum correctly", () => {
    const files = [
      { size: 10 * 1024, type: "text/plain" },
      { size: 10 * 1024, type: "text/plain" }
    ];
    const single = [{ size: 10 * 1024, type: "text/plain" }];
    expect(TE.estimateFiles(files)).toBe(TE.estimateFiles(single) * 2);
  });
});
