/**
 * QR CONTENT VALIDATOR — P1 SECURITY FIX
 *
 * Hardened validation for QR code payloads decoded by the scanner.
 * Mitigates:
 *   - XSS via javascript:, data:text/html, vbscript:, inline event handlers
 *   - DoS via oversized payloads (jsQR can decode up to ~3KB; cap conservatively)
 *   - Null-byte / control-character smuggling
 *   - Disallowed URL schemes (file://, blob:, intent://, content://, jar:, etc.)
 *   - Malformed UPI / BharatQR EMV payloads (NPCI / EMVCo spec violations)
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

// Allowlist of URL schemes we'll surface to the user. Anything else with a scheme is rejected
// (plain text without a scheme is still allowed and treated as text).
const ALLOWED_URL_SCHEMES = new Set([
  "http:",
  "https:",
  "tel:",
  "mailto:",
  "sms:",
  "smsto:",
  "geo:",
  "upi:",
  "bitcoin:",
  "ethereum:",
  "matmsg:", // legacy email
  "wifi:",   // WIFI:T:...;S:...;P:...;;
  "mecard:", // legacy contact
  "begin:vcard", // vCard 2.1/3.0/4.0 (case-insensitive)
]);

// Schemes that are explicitly dangerous and must be rejected on sight.
const BLOCKED_URL_SCHEMES = [
  "javascript:",
  "vbscript:",
  "data:text/html",
  "data:application/xhtml",
  "data:application/javascript",
  "data:text/javascript",
  "file:",
  "jar:",
  "blob:",
  "intent:",
  "content:",
  "android-app:",
  "ms-appx:",
  "ms-appx-web:",
];

// XSS / injection patterns to reject regardless of scheme (defense in depth).
const INJECTION_PATTERNS: RegExp[] = [
  /<\s*script\b/i,
  /<\s*iframe\b/i,
  /<\s*object\b/i,
  /<\s*embed\b/i,
  /\son\w+\s*=/i,            // inline event handlers (onclick=, onerror=, ...)
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /data\s*:\s*text\s*\/\s*html/i,
  /expression\s*\(/i,         // CSS expression()
];

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

function startsWithAny(haystack: string, needles: string[]): string | null {
  const lower = haystack.toLowerCase();
  for (const n of needles) {
    if (lower.startsWith(n)) return n;
  }
  return null;
}

/**
 * Validate a UPI deeplink (upi://pay?... or upi://...) per NPCI specification.
 * Required: pa (payee VPA). Recommended: pn, am, cu, tn.
 */
function validateUpi(content: string): QrValidationResult {
  // Accept any case for the scheme.
  const stripped = content.replace(/^upi:\/\//i, "");
  // Parse the action and query string.
  const qIdx = stripped.indexOf("?");
  const query = qIdx >= 0 ? stripped.slice(qIdx + 1) : stripped;

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(query);
  } catch {
    return { valid: false, error: "Malformed UPI link", kind: "upi" };
  }

  const pa = params.get("pa");
  if (!pa) {
    return { valid: false, error: "UPI link missing payee address (pa)", kind: "upi" };
  }
  // VPA format: handle@provider (NPCI: alphanumeric/dot/hyphen/underscore on both sides)
  if (!/^[a-zA-Z0-9._-]{2,}@[a-zA-Z][a-zA-Z0-9._-]{1,}$/.test(pa)) {
    return { valid: false, error: "Invalid UPI payee address format", kind: "upi" };
  }

  const am = params.get("am");
  if (am !== null) {
    // Amount must be a positive decimal with at most 2 fraction digits, ≤ ₹1,00,00,00,000
    if (!/^\d{1,12}(\.\d{1,2})?$/.test(am) || parseFloat(am) <= 0) {
      return { valid: false, error: "Invalid UPI amount", kind: "upi" };
    }
  }

  const cu = params.get("cu");
  if (cu !== null && !/^[A-Z]{3}$/.test(cu)) {
    return { valid: false, error: "Invalid UPI currency code", kind: "upi" };
  }

  return { valid: true, kind: "upi" };
}

/**
 * Validate an EMV-style BharatQR payload (TLV / EMVCo Merchant-Presented spec).
 * Format: TT LL VVV... where TT is the 2-digit tag, LL is the 2-digit length.
 * Tag 00 (Payload Format Indicator) must be present and equal "01".
 * Tag 63 (CRC) must be the final tag and 4 hex chars.
 */
function validateEmv(content: string): QrValidationResult {
  if (content.length < 8 || content.length > MAX_QR_BYTES) {
    return { valid: false, error: "EMV payload size out of range", kind: "emv" };
  }
  // CRC tag must end the payload.
  if (!/63\d{2}[0-9A-Fa-f]{4}$/.test(content)) {
    return { valid: false, error: "EMV payload missing or invalid CRC tag", kind: "emv" };
  }
  // Sanity walk of the TLV structure (best-effort, do not fail on unknown tags).
  let i = 0;
  let sawFormatIndicator = false;
  while (i < content.length) {
    if (i + 4 > content.length) {
      return { valid: false, error: "Truncated EMV TLV", kind: "emv" };
    }
    const tag = content.slice(i, i + 2);
    const lenStr = content.slice(i + 2, i + 4);
    const len = parseInt(lenStr, 10);
    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lenStr) || isNaN(len)) {
      return { valid: false, error: "Malformed EMV tag/length", kind: "emv" };
    }
    if (i + 4 + len > content.length) {
      return { valid: false, error: "EMV TLV length exceeds payload", kind: "emv" };
    }
    if (tag === "00") {
      const value = content.slice(i + 4, i + 4 + len);
      if (value !== "01") {
        return { valid: false, error: "Unsupported EMV payload format", kind: "emv" };
      }
      sawFormatIndicator = true;
    }
    i += 4 + len;
  }
  if (!sawFormatIndicator) {
    return { valid: false, error: "EMV payload missing format indicator (tag 00)", kind: "emv" };
  }
  return { valid: true, kind: "emv" };
}

/**
 * Validate that a URL scheme is in the allowlist and the URL parses cleanly.
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

  if (!ALLOWED_URL_SCHEMES.has(scheme) && !ALLOWED_URL_SCHEMES.has(scheme.replace(/:$/, "") + ":")) {
    // Give friendly, specific messages for common-but-unsupported schemes
    if (scheme === "otpauth:") {
      return { valid: false, error: "This is a 2FA setup code for an authenticator app (like Google Authenticator). It can't be opened here — use your authenticator app to scan it instead." };
    }
    if (scheme === "market:" || scheme === "itms-apps:" || scheme === "itms:") {
      return { valid: false, error: "This QR code links to an app store listing and can't be opened in BinRo." };
    }
    if (scheme === "intent:") {
      return { valid: false, error: "This QR code contains an Android deep link that can't be opened here." };
    }
    return { valid: false, error: "This QR code contains a link type that isn't supported. It may be for a specific app — try scanning it with that app directly." };
  }

  // For http/https, run through URL parser to catch malformed inputs.
  if (scheme === "http:" || scheme === "https:") {
    try {
      // URL is available in both Node 20 and React Native (Hermes 0.74+).
      const u = new URL(content);
      if (!u.hostname) {
        return { valid: false, error: "URL is missing a hostname" };
      }
      // Reject userinfo to thwart phishing like https://paytm.com@evil.com
      if (u.username || u.password) {
        return { valid: false, error: "URLs with embedded credentials are not allowed" };
      }
      return { valid: true, kind: "url" };
    } catch {
      return { valid: false, error: "Malformed URL" };
    }
  }

  // tel:, mailto:, sms:, geo:, bitcoin:, etc.
  if (scheme === "tel:" || scheme === "sms:" || scheme === "smsto:") {
    const num = content.slice(scheme.length).split(/[?,;]/)[0];
    if (!/^\+?[0-9*#\s().-]{3,20}$/.test(num)) {
      return { valid: false, error: `Invalid ${scheme.slice(0, -1)} number` };
    }
    return { valid: true, kind: scheme === "tel:" ? "tel" : "sms" };
  }

  if (scheme === "mailto:" || scheme === "matmsg:") {
    return { valid: true, kind: "mailto" };
  }

  if (scheme === "geo:") {
    const coord = content.slice(4).split("?")[0];
    if (!/^-?\d+(\.\d+)?,-?\d+(\.\d+)?(,-?\d+(\.\d+)?)?$/.test(coord)) {
      return { valid: false, error: "Invalid geo: coordinates" };
    }
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

  // Block known-dangerous schemes outright.
  const blocked = startsWithAny(content.trim(), BLOCKED_URL_SCHEMES);
  if (blocked) {
    return { valid: false, error: `Blocked URL scheme: ${blocked}` };
  }

  // Defense in depth: reject anything that looks like inline script / event-handler injection.
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(content)) {
      return { valid: false, error: "Potentially malicious content detected" };
    }
  }

  const trimmed = content.trim();

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
