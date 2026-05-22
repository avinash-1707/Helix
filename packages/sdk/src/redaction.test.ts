import { describe, expect, it } from "vitest";
import { redactPII } from "./redaction.js";

describe("redactPII", () => {
  it("redacts email addresses", () => {
    expect(redactPII("ping jane.doe@example.com please")).toBe(
      "ping [REDACTED:EMAIL] please",
    );
  });

  it("redacts SSNs", () => {
    expect(redactPII("ssn 123-45-6789 on file")).toBe(
      "ssn [REDACTED:SSN] on file",
    );
  });

  it("redacts credit card numbers", () => {
    expect(redactPII("card 4111 1111 1111 1111 ok")).toBe(
      "card [REDACTED:CC] ok",
    );
  });

  it("redacts phone numbers", () => {
    expect(redactPII("call 555-867-5309 now")).toBe(
      "call [REDACTED:PHONE] now",
    );
  });

  it("redacts multiple PII types in one string", () => {
    const out = redactPII("mail a@b.com or call 555-867-5309");
    expect(out).toBe("mail [REDACTED:EMAIL] or call [REDACTED:PHONE]");
  });

  it("does not redact an SSN as a phone number", () => {
    expect(redactPII("123-45-6789")).toBe("[REDACTED:SSN]");
  });

  it("leaves clean text untouched", () => {
    expect(redactPII("no pii here")).toBe("no pii here");
  });

  it("is pure — repeated calls are stable", () => {
    const once = redactPII("a@b.com");
    expect(redactPII("a@b.com")).toBe(once);
  });
});
