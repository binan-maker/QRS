// ═══════════════════════════════════════════════════════════════════════════════
// SERVICES: ANALYSIS MODULE
// ───────────────────────────────────────────────────────────────────────────────
// Provides syntax validation for QR payloads, URLs, and payment instructions.
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. Types & Data Structures ────────────────────────────────────────────────
export * from "./types";

// ── 2. Payment Parsers (UPI, EMVCo, Crypto) ───────────────────────────────────
export * from "./payment-parser";

// ── 3. QR Content Validation (Payload Size, Encoding, Null-Bytes) ─────────────
export {
  validateQrContent,
  isValidQrContent,
  type QrValidationResult,
} from "./qr-validator";

// ── 4. Scam Signal Detection ──────────────────────────────────────────────────
export {
  detectScamSignals,
  type ScamDetectionResult,
} from "./scam-detector";
