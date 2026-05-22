// PII redaction utilities: email, phone, SSN, credit card.
// Imported by both the SDK emit path and apps/ingestion write path.
// See context/ai-workflow-rules.md "PII Redaction Rules".
//
// Applied to input_preview / output_preview ONLY — never to the full
// response stream returned to the user (architecture.md invariant 2).

// Order matters: SSN and credit-card numbers are also digit runs that
// the phone pattern would otherwise swallow, so they are redacted first.
const RULES: ReadonlyArray<{ pattern: RegExp; token: string }> = [
  {
    pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    token: "[REDACTED:EMAIL]",
  },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, token: "[REDACTED:SSN]" },
  { pattern: /\b\d(?:[ -]?\d){12,18}\b/g, token: "[REDACTED:CC]" },
  { pattern: /\+?\d(?:[\s().-]?\d){7,}/g, token: "[REDACTED:PHONE]" },
];

// Replace every known PII pattern in `text` with its redaction token.
// Pure and side-effect free — safe to call from any context.
export function redactPII(text: string): string {
  let out = text;
  for (const { pattern, token } of RULES) {
    out = out.replace(pattern, token);
  }
  return out;
}
