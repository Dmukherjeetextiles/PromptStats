/**
 * pii-detector.js — Local-only PII scanning.
 *
 * PRIVACY GUARANTEE: This module runs entirely in the browser.
 * Matched values are NEVER extracted or transmitted — only the
 * detected TYPE is reported (e.g. "email", "iban").
 * Compliant with GDPR Art. 25 (data minimisation by design).
 */
window.PIIDetector = {
  patterns: {
    // Standard email
    email: /\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b/i,

    // International phone: +33 6 12 34 56 78, 0612345678, +1-800-555-0100
    phone: /(\+\d{1,3}[\s\-]?)?(\(?\d{1,4}\)?[\s\-]?)(\d[\s\-]?){7,14}\d/,

    // Credit card: 13–16 digits, optionally space/dash separated
    creditCard: /\b(\d{4}[\s\-]?){3}\d{1,4}\b/,

    // IBAN (EU focus: FR, DE, GB, ES, IT, BE, NL, CH)
    iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b/,

    // French NIR (sécurité sociale): 1 or 2 + 12 digits + optional 2-digit key
    frenchSSN: /\b[12]\d{2}(0[1-9]|1[0-2]|2[0-9]|3[0-9]|4[0-9]|5[0-9]|6[0-9]|7[0-9]|8[0-9]|9[0-9])\d{6}\d{2}\b/,

    // IPv4
    ipv4: /\b((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)\b/,

    // US Social Security Number  
    usSSN: /\b\d{3}-\d{2}-\d{4}\b/,

    // Passport-like patterns (letter + 6-9 digits)
    passport: /\b[A-Z]{1,2}\d{6,9}\b/
  },

  /** Severity levels for UI colouring */
  severity: {
    email: "medium",
    phone: "medium",
    creditCard: "high",
    iban: "high",
    frenchSSN: "high",
    ipv4: "low",
    usSSN: "high",
    passport: "high"
  },

  /**
   * Scans text for PII patterns.
   * Returns an array of { type, severity } objects.
   * Raw matched values are deliberately NOT returned.
   */
  scan(text) {
    if (!text) return [];
    const findings = [];
    for (const [type, regex] of Object.entries(this.patterns)) {
      if (regex.test(text)) {
        findings.push({ type, severity: this.severity[type] || "medium" });
      }
    }
    return findings;
  },

  hasHighSeverity(findings) {
    return findings.some((f) => f.severity === "high");
  }
};
