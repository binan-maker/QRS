// ═══════════════════════════════════════════════════════════════════════════════
// SERVICES: ANALYSIS MODULE
// ───────────────────────────────────────────────────────────────────────────────
// Provides comprehensive security, fraud detection, and syntax validation
// for QR payloads, URLs, and payment instructions (UPI, SEPA, EMV, Crypto).
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. Types & Data Structures ────────────────────────────────────────────────
export * from "./types";

// ── 2. Payment Parsers (UPI, EMV, Crypto, Bank Account, BBPS) ─────────────────
export * from "./payment-parser";

// ── 3. Payment Safety & Risk Analysis ─────────────────────────────────────────
export { analyzeAnyPaymentQr } from "./payment-analyzer";

// ── 4. QR Content Validation (Payload Size, Encoding, Null-Bytes) ─────────────
export {
  validateQrContent,
  isValidQrContent,
  type QrValidationResult,
} from "./qr-validator";

// ── 5. Scam Signal Detection ──────────────────────────────────────────────────
export {
  detectScamSignals,
  type ScamDetectionResult,
} from "./scam-detector";

// ── 6. URL & Link Security Analyzers ──────────────────────────────────────────
export {
  scanUrl,
  type UrlSafetyResult,
} from "./url-scanner";
export {
  analyzeUrlSecurity,
  type UrlSecurityAnalysis,
} from "./url-security-analyzer";
