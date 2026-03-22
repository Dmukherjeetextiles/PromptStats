/**
 * pii-detector.test.js
 */
const { JSDOM } = require("jsdom");
const dom = new JSDOM("");
global.window = dom.window;
eval(require("fs").readFileSync("./src/content/engines/pii-detector.js", "utf8"));
const PII = window.PIIDetector;

describe("PIIDetector.scan", () => {
  test("returns empty array for clean text", () => {
    expect(PII.scan("Hello, how are you today?")).toHaveLength(0);
    expect(PII.scan("")).toHaveLength(0);
    expect(PII.scan(null)).toHaveLength(0);
  });

  test("detects email addresses", () => {
    const findings = PII.scan("Contact me at user.name+tag@example.co.uk");
    expect(findings.map((f) => f.type)).toContain("email");
  });

  test("detects international phone numbers", () => {
    expect(PII.scan("+33 6 12 34 56 78").map((f) => f.type)).toContain("phone");
    expect(PII.scan("0612345678").map((f) => f.type)).toContain("phone");
  });

  test("detects credit card patterns", () => {
    const findings = PII.scan("My card is 4111 1111 1111 1111");
    expect(findings.map((f) => f.type)).toContain("creditCard");
  });

  test("detects US Social Security Numbers", () => {
    const findings = PII.scan("SSN: 123-45-6789");
    expect(findings.map((f) => f.type)).toContain("usSSN");
  });

  test("detects IPv4 addresses", () => {
    const findings = PII.scan("Server is at 192.168.1.100");
    expect(findings.map((f) => f.type)).toContain("ipv4");
  });

  test("returns correct severity levels", () => {
    const findings = PII.scan("Card: 4111111111111111 and email: a@b.com");
    const types = Object.fromEntries(findings.map((f) => [f.type, f.severity]));
    expect(types.creditCard).toBe("high");
    expect(types.email).toBe("medium");
  });

  test("does NOT return matched raw text values", () => {
    const findings = PII.scan("test@example.com");
    findings.forEach((f) => {
      expect(f).not.toHaveProperty("value");
      expect(f).not.toHaveProperty("match");
    });
  });

  test("hasHighSeverity returns true when high-risk PII present", () => {
    const findings = PII.scan("SSN 123-45-6789");
    expect(PII.hasHighSeverity(findings)).toBe(true);
  });

  test("hasHighSeverity returns false for low/medium-only PII", () => {
    const findings = PII.scan("email: user@example.com");
    // email is medium — no high
    expect(PII.hasHighSeverity(findings)).toBe(false);
  });

  test("multiple PII types detected in one string", () => {
    const text = "Email: foo@bar.com, SSN: 987-65-4321, IP: 10.0.0.1";
    const types = PII.scan(text).map((f) => f.type);
    expect(types).toContain("email");
    expect(types).toContain("usSSN");
    expect(types).toContain("ipv4");
  });
});
