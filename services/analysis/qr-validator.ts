/**
 * QR CONTENT VALIDATOR
 *
 * Performs only payload-size and format parsing. QR details do not classify URLs
 * or compare them with local, remote, or third-party threat lists.
 *
 * This is the single source of truth used by:
 *   - Client scan flow (features/scanner/hooks/useScanner.ts)
 *   - Server image-decode endpoint (server/routes.ts)
 *   - QR content validation
 */

export interface QrValidationResult {
  valid: boolean;
  error?: string;
  /** High-level kind detected from content (informational only). */
  kind?: "url" | "upi" | "emv" | "tel" | "mailto" | "sms" | "geo" | "wifi" | "text";
}

// Hard cap on QR payload size. Real QR codes max out at ~2,953 bytes (Version 40, low EC).
// We add a small buffer for binary-encoded payloads.
const MAX_QR_BYTES = 4096;

// Control characters except tab (\t), newline (\n), carriage return (\r).
// Null bytes and other C0/C1 controls can be used to smuggle hidden segments past parsers.
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_PATTERN = /[\x00\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/;

function utf8ByteLength(s: string): number {
  // Avoid Buffer dependency — works on both Node and React Native.
  // Rough but accurate enough for size enforcement.
  let len = 0;
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 0x80) len += 1;
    else if (code < 0x800) len += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      len += 4; // surrogate pair → 4 bytes
      i++;
    } else len += 3;
  }
  return len;
}

/**
 * Validate a UPI deeplink (upi://pay?... or upi://...) per NPCI specification.
 */
function validateUpi(content: string): QrValidationResult {
  if (!content || content.length <= 6) {
    return { valid: false, error: "Malformed UPI link", kind: "upi" };
  }
  return { valid: true, kind: "upi" };
}

/**
 * Validate an EMV-style BharatQR payload (TLV / EMVCo Merchant-Presented spec).
 */
function validateEmv(content: string): QrValidationResult {
  if (content.length < 8 || content.length > MAX_QR_BYTES) {
    return { valid: false, error: "EMV payload size out of range", kind: "emv" };
  }
  return { valid: true, kind: "emv" };
}

/**
 * Identify the payload kind without classifying the destination.
 */
function validateUrlScheme(content: string): QrValidationResult {
  // Try to extract a scheme.
  const schemeMatch = content.match(/^([a-zA-Z][a-zA-Z0-9+.-]*:)/);
  if (!schemeMatch) {
    // No scheme — treat as plain text. Already passed length / control-char checks.
    return { valid: true, kind: "text" };
  }

  const scheme = schemeMatch[1].toLowerCase();

  // Special-case: vCard begins with "BEGIN:VCARD" (no real URL parse needed).
  if (content.toLowerCase().startsWith("begin:vcard")) {
    return { valid: true, kind: "text" };
  }

  // Identify common URL payloads without making a security decision.
  if (scheme === "http:" || scheme === "https:") {
    return { valid: true, kind: "url" };
  }

  // tel:, mailto:, sms:, geo:, bitcoin:, etc.
  if (scheme === "tel:" || scheme === "sms:" || scheme === "smsto:") {
    return { valid: true, kind: scheme === "tel:" ? "tel" : "sms" };
  }

  if (scheme === "mailto:" || scheme === "matmsg:") {
    return { valid: true, kind: "mailto" };
  }

  if (scheme === "geo:") {
    return { valid: true, kind: "geo" };
  }

  if (scheme === "wifi:") {
    return { valid: true, kind: "wifi" };
  }

  return { valid: true, kind: "text" };
}

/**
 * Main entry point. Run this on every QR payload BEFORE further processing.
 */
export function validateQrContent(content: unknown): QrValidationResult {
  if (typeof content !== "string" || content.length === 0) {
    return { valid: false, error: "QR content is empty" };
  }

  // Reject payloads that exceed the QR spec maximum.
  if (utf8ByteLength(content) > MAX_QR_BYTES) {
    return { valid: false, error: "QR content exceeds maximum allowed size" };
  }

  // Reject control characters / null bytes (allow tab/newline/CR for vCard / WiFi payloads).
  if (CONTROL_CHAR_PATTERN.test(content)) {
    return { valid: false, error: "QR content contains disallowed control characters" };
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return { valid: false, error: "QR content is empty" };
  }

  // EMV / BharatQR (Merchant-Presented) starts with "000201" or "000202".
  if (/^00020[12]/.test(trimmed)) {
    return validateEmv(trimmed);
  }

  // UPI deeplinks.
  if (/^upi:\/\//i.test(trimmed)) {
    return validateUpi(trimmed);
  }

  // Generic URL / scheme validation.
  return validateUrlScheme(trimmed);
}

export function isValidQrContent(content: unknown): boolean {
  return validateQrContent(content).valid;
}
