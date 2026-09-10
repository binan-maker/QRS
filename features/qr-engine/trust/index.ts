/**
 * QR Engine — Trust Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised community trust scoring.
 *
 * Usage:
 *   import { computeTrustScore, trustLevelColor } from "@/features/qr-engine";
 *   const trust = computeTrustScore({ communityScore: 72 });
 */

export { computeTrustScore, scoreToLevel, trustLevelColor, trustLevelLabel, trustLevelIcon } from "./trust-scorer";
