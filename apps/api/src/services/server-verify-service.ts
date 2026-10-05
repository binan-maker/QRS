// ─── SERVER VERIFICATION SERVICE ──────────────────────────────────────────────
// SERVER-ONLY: Lives in apps/api/src/services/ — never import from Expo/mobile code.
// CRITICAL SECURITY: All vote weights MUST be calculated server-side.
// Client-side calculation allows weight manipulation and tier bypass.
//
// This service provides the server-side reference implementation for:
// 1. Account tier calculation (server-authoritative)
// 2. Vote weight validation (prevents client manipulation)
// 3. Collusion detection (server-side pattern analysis)
//
// Usage: Import only from Express route handlers or other server-side services.
// ──────────────────────────────────────────────────────────────────────────────

// Timestamp import removed — using plain Date/ISO string handling instead
export type { ServerAccountTier, ServerCollusionAnalysis, AuditLogEntry } from "./server-verify-types";
export { analyzeReportsForCollusionServer } from "./server-collusion";
import { TIER_CONFIG } from "./server-verify-types";
import type { ServerAccountTier, ServerCollusionAnalysis } from "./server-verify-types";

function tsToMs(ts: any): number {
  if (!ts) return 0;
  if (ts.toDate) return ts.toDate().getTime();
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === "number") return ts;
  return new Date(ts).getTime();
}

/**
 * SERVER-SIDE ONLY: Calculate account tier from Firestore user data.
 * CRITICAL: This MUST run on trusted server only.
 */
export function calculateServerAccountTier(
  userData: any,
  emailVerified: boolean
): ServerAccountTier & { accountCreatedAt?: number } {
  if (!userData?.createdAt) {
    return { ...TIER_CONFIG[1], accountCreatedAt: Date.now() };
  }

  const createdMs = tsToMs(userData.createdAt);
  const ageDays = (Date.now() - createdMs) / 86400000;

  let tier: 0 | 1 | 2 | 3 | 4 | 5;

  if (ageDays < 1 && !emailVerified) {
    tier = 0;
  } else if (ageDays < 7) {
    tier = 1;
  } else if (ageDays < 30) {
    tier = 2;
  } else if (ageDays < 90) {
    tier = emailVerified ? 3 : 2;
  } else if (ageDays < 180) {
    tier = emailVerified ? 4 : 2;
  } else {
    tier = emailVerified ? 5 : 2;
  }

  return { ...TIER_CONFIG[tier], accountCreatedAt: createdMs };
}

/**
 * SERVER-SIDE ONLY: Validate vote weight submitted by client.
 * Recalculates expected weight server-side and compares with tolerance.
 */
export function validateVoteWeight(
  userData: any,
  emailVerified: boolean,
  submittedWeight: number
): { valid: boolean; expectedWeight: number; actualTier: number } {
  const tierResult = calculateServerAccountTier(userData, emailVerified);
  const expectedWeight = tierResult.voteWeight;
  const tolerance = 0.01;
  const isValid = Math.abs(submittedWeight - expectedWeight) < tolerance;
  const inValidRange = submittedWeight >= 0.01 && submittedWeight <= 2.0;
  return { valid: isValid && inValidRange, expectedWeight, actualTier: tierResult.tier };
}

/**
 * SERVER-SIDE ONLY: Generate audit log entry for moderation review.
 */
export function createAuditLogEntry(
  qrId: string,
  userId: string,
  action: string,
  userData: any,
  emailVerified: boolean,
  submittedWeight: number,
  collusionAnalysis?: ServerCollusionAnalysis
) {
  const tierResult = calculateServerAccountTier(userData, emailVerified);
  const createdMs = tierResult.accountCreatedAt || Date.now();
  const accountAgeDays = Math.floor((Date.now() - createdMs) / 86400000);
  return {
    timestamp: new Date().toISOString(),
    qrId, userId, action,
    details: {
      voteWeight: submittedWeight,
      accountTier: tierResult.tier,
      accountAgeDays,
      emailVerified,
      ...(collusionAnalysis ? { collusionFlags: collusionAnalysis } : {}),
    },
  };
}
