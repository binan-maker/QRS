/**
 * QR Engine — Trust Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised trust scoring, phishing detection, and URL analysis.
 *
 * Usage:
 *   import { computeTrustScore, trustLevelColor } from "@/features/qr-engine";
 *   const trust = computeTrustScore({ content, contentType });
 */

export { computeTrustScore, scoreToLevel, trustLevelColor, trustLevelLabel, trustLevelIcon } from "./trust-scorer";
