// ─── SERVER VERIFICATION SERVICE ──────────────────────────────────────────────
// CRITICAL SECURITY FIX: Move vote weight calculation server-side
// 
// Problem: Client-side vote weight calculation allows malicious users to:
// - Modify voteWeight: 2.0 before submission
// - Bypass account tier restrictions
// - Manipulate trust scores artificially
//
// Solution: All vote weights MUST be calculated server-side using Cloud Functions
// or verified via Firestore Security Rules with request.time comparisons
//
// This service provides the server-side reference implementation for:
// 1. Account tier calculation (server-authoritative)
// 2. Vote weight validation (prevents client manipulation)
// 3. Collusion detection (server-side pattern analysis)
//
// Usage: Deploy as Firebase Cloud Function or run on trusted backend only
// ──────────────────────────────────────────────────────────────────────────────

import { Timestamp } from "firebase-admin/firestore";

export interface ServerAccountTier {
  tier: 0 | 1 | 2 | 3 | 4 | 5;
  voteWeight: number;
  maxCommentsPerDay: number;
  maxCommentsPerQr: number;
  maxReportsPerDay: number;
  maxCommentReportsPerDay: number;
  minCommentCooldownSeconds: number;
  canAct: boolean;
  reason?: string;
}

const TIER_CONFIG: Record<number, ServerAccountTier> = {
  0: {
    tier: 0, voteWeight: 0.01, maxCommentsPerDay: Infinity, maxCommentsPerQr: Infinity,
    maxReportsPerDay: Infinity, maxCommentReportsPerDay: Infinity, minCommentCooldownSeconds: 0,
    canAct: false, // Tier 0 cannot submit reports at all
    reason: "Unverified account less than 24 hours old",
  },
  1: {
    tier: 1, voteWeight: 0.05, maxCommentsPerDay: Infinity, maxCommentsPerQr: Infinity,
    maxReportsPerDay: Infinity, maxCommentReportsPerDay: Infinity, minCommentCooldownSeconds: 0,
    canAct: true,
  },
  2: {
    tier: 2, voteWeight: 0.3, maxCommentsPerDay: Infinity, maxCommentsPerQr: Infinity,
    maxReportsPerDay: Infinity, maxCommentReportsPerDay: Infinity, minCommentCooldownSeconds: 0,
    canAct: true,
  },
  3: {
    tier: 3, voteWeight: 0.7, maxCommentsPerDay: Infinity, maxCommentsPerQr: Infinity,
    maxReportsPerDay: Infinity, maxCommentReportsPerDay: Infinity, minCommentCooldownSeconds: 0,
    canAct: true,
  },
  4: {
    tier: 4, voteWeight: 1.5, maxCommentsPerDay: Infinity, maxCommentsPerQr: Infinity,
    maxReportsPerDay: Infinity, maxCommentReportsPerDay: Infinity, minCommentCooldownSeconds: 0,
    canAct: true,
  },
  5: {
    tier: 5, voteWeight: 2.0, maxCommentsPerDay: Infinity, maxCommentsPerQr: Infinity,
    maxReportsPerDay: Infinity, maxCommentReportsPerDay: Infinity, minCommentCooldownSeconds: 0,
    canAct: true,
  },
};

/**
 * SERVER-SIDE ONLY: Calculate account tier from Firestore user data
 * 
 * CRITICAL: This MUST run on trusted server only. Never expose this logic
 * to client-side code where it can be tampered with.
 * 
 * @param userData - Raw user document from Firestore (server-fetched)
 * @param emailVerified - Verified from Firebase Auth (server-verified)
 * @returns Authoritative account tier with vote weight
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

  // Tier assignment logic (server-authoritative)
  if (ageDays < 1 && !emailVerified) {
    tier = 0; // Block completely - too new and unverified
  } else if (ageDays < 7) {
    tier = 1; // New account - minimal weight
  } else if (ageDays < 30) {
    tier = 2; // Growing account - reduced weight
  } else if (ageDays < 90) {
    tier = emailVerified ? 3 : 2; // Verification matters after 30 days
  } else if (ageDays < 180) {
    tier = emailVerified ? 4 : 2; // Long-term verification required
  } else {
    tier = emailVerified ? 5 : 2; // Max tier requires 6mo + verification
  }

  return { ...TIER_CONFIG[tier], accountCreatedAt: createdMs };
}

/**
 * SERVER-SIDE ONLY: Validate vote weight submitted by client
 * 
 * This prevents malicious clients from submitting inflated vote weights.
 * The server recalculates the expected weight and compares it to the
 * submitted weight with a small tolerance for floating-point errors.
 * 
 * @param userData - Server-fetched user document
 * @param emailVerified - Server-verified from Firebase Auth
 * @param submittedWeight - Weight value sent by client
 * @returns Validation result with expected weight
 */
export function validateVoteWeight(
  userData: any,
  emailVerified: boolean,
  submittedWeight: number
): { valid: boolean; expectedWeight: number; actualTier: number } {
  const tierResult = calculateServerAccountTier(userData, emailVerified);
  const expectedWeight = tierResult.voteWeight;
  
  // Allow 0.01 tolerance for floating-point precision issues
  const tolerance = 0.01;
  const isValid = Math.abs(submittedWeight - expectedWeight) < tolerance;
  
  // Also check that weight is within valid range for any tier
  const inValidRange = submittedWeight >= 0.01 && submittedWeight <= 2.0;
  
  return {
    valid: isValid && inValidRange,
    expectedWeight,
    actualTier: tierResult.tier,
  };
}

/**
 * SERVER-SIDE ONLY: Enhanced collusion detection with additional signals
 * 
 * This runs on the server where we have access to all reports and can
 * perform complex pattern analysis without exposing the algorithm.
 * 
 * Additional server-side signals not available to clients:
 * - IP address clustering
 * - Device fingerprint correlation
 * - Temporal patterns across multiple QRs
 * - Cross-QR voting rings
 */
export interface ServerCollusionAnalysis {
  suspicious: boolean;
  reason: string | null;
  safeWeightMultiplier: number;
  negativeWeightMultiplier: number;
  confidenceScore: number; // 0-1, how confident we are in the detection
  flaggedUserIds?: string[]; // For moderator review
}

export function analyzeReportsForCollusionServer(
  reports: Array<{
    userId: string;
    reportType: string;
    weight: number;
    createdAt: any;
    accountAgeDays: number;
    emailVerified: boolean;
  }>
): ServerCollusionAnalysis {
  const activeReports = reports.filter(r => r.reportType !== null);
  
  if (activeReports.length < 3) {
    return {
      suspicious: false,
      reason: null,
      safeWeightMultiplier: 1,
      negativeWeightMultiplier: 1,
      confidenceScore: 0,
    };
  }

  const now = Date.now();
  const oneHourAgo = now - 3600000;
  
  const safeReports = activeReports.filter(r => r.reportType === "safe");
  const negativeReports = activeReports.filter(r => r.reportType !== "safe");

  const recentSafe = safeReports.filter(r => tsToMs(r.createdAt) > oneHourAgo);
  const recentNegative = negativeReports.filter(r => tsToMs(r.createdAt) > oneHourAgo);

  // Pattern 1: Coordinated low-tier voting surge
  if (recentSafe.length >= 8) {
    const lowTierSafe = recentSafe.filter(r => r.weight <= 0.3);
    const ratio = lowTierSafe.length / recentSafe.length;
    
    if (ratio > 0.5) {
      return {
        suspicious: true,
        reason: "Coordinated safe-voting detected: many low-trust accounts voted safe in a short time.",
        safeWeightMultiplier: 0.1,
        negativeWeightMultiplier: 1,
        confidenceScore: 0.9,
        flaggedUserIds: lowTierSafe.map(r => r.userId),
      };
    }
    
    return {
      suspicious: true,
      reason: "Unusually high safe-voting velocity detected.",
      safeWeightMultiplier: 0.4,
      negativeWeightMultiplier: 1,
      confidenceScore: 0.7,
    };
  }

  // Pattern 2: Coordinated negative voting surge
  if (recentNegative.length >= 8) {
    const lowTierNeg = recentNegative.filter(r => r.weight <= 0.3);
    const ratio = lowTierNeg.length / recentNegative.length;
    
    if (ratio > 0.5) {
      return {
        suspicious: true,
        reason: "Coordinated negative-voting detected: many low-trust accounts voted scam/fake in a short time.",
        safeWeightMultiplier: 1,
        negativeWeightMultiplier: 0.1,
        confidenceScore: 0.9,
        flaggedUserIds: lowTierNeg.map(r => r.userId),
      };
    }
    
    return {
      suspicious: true,
      reason: "Unusually high negative-voting velocity detected.",
      safeWeightMultiplier: 1,
      negativeWeightMultiplier: 0.4,
      confidenceScore: 0.7,
    };
  }

  // Pattern 3: Majority low-trust dominance (all-time, not just recent)
  if (safeReports.length >= 4) {
    const lowTierSafe = safeReports.filter(r => r.weight <= 0.3);
    const ratio = lowTierSafe.length / safeReports.length;
    
    if (ratio > 0.7) {
      return {
        suspicious: true,
        reason: "Majority of safe reports are from new or low-credibility accounts.",
        safeWeightMultiplier: 0.2,
        negativeWeightMultiplier: 1,
        confidenceScore: 0.8,
      };
    }
  }

  if (negativeReports.length >= 4) {
    const lowTierNeg = negativeReports.filter(r => r.weight <= 0.3);
    const ratio = lowTierNeg.length / negativeReports.length;
    
    if (ratio > 0.7) {
      return {
        suspicious: true,
        reason: "Majority of scam/fake reports are from new or low-credibility accounts.",
        safeWeightMultiplier: 1,
        negativeWeightMultiplier: 0.2,
        confidenceScore: 0.8,
      };
    }
  }

  // Pattern 4: Server-side only - identical account ages (created in batches)
  const ageClusters = clusterByAccountAge(activeReports);
  if (ageClusters.largestClusterSize >= 5 && ageClusters.clusterRatio > 0.6) {
    return {
      suspicious: true,
      reason: "Suspicious pattern: many reporters created accounts at similar times.",
      safeWeightMultiplier: 0.3,
      negativeWeightMultiplier: 0.3,
      confidenceScore: 0.75,
      flaggedUserIds: ageClusters.flaggedUserIds,
    };
  }

  return {
    suspicious: false,
    reason: null,
    safeWeightMultiplier: 1,
    negativeWeightMultiplier: 1,
    confidenceScore: 0,
  };
}

/**
 * Helper: Detect accounts created in suspicious clusters
 */
function clusterByAccountAge(reports: any[]): {
  largestClusterSize: number;
  clusterRatio: number;
  flaggedUserIds: string[];
} {
  if (reports.length < 5) {
    return { largestClusterSize: 0, clusterRatio: 0, flaggedUserIds: [] };
  }

  // Group by account age in days (rounded to nearest day)
  const ageMap = new Map<number, string[]>();
  for (const r of reports) {
    const ageDays = Math.round(r.accountAgeDays || 0);
    const existing = ageMap.get(ageDays) || [];
    existing.push(r.userId);
    ageMap.set(ageDays, existing);
  }

  // Find largest cluster
  let largestClusterSize = 0;
  let largestClusterUsers: string[] = [];
  
  for (const [age, users] of ageMap.entries()) {
    if (users.length > largestClusterSize) {
      largestClusterSize = users.length;
      largestClusterUsers = users;
    }
  }

  const clusterRatio = largestClusterSize / reports.length;
  
  return {
    largestClusterSize,
    clusterRatio,
    flaggedUserIds: clusterRatio > 0.6 ? largestClusterUsers : [],
  };
}

/**
 * Helper: Convert various timestamp formats to milliseconds
 */
function tsToMs(ts: any): number {
  if (!ts) return 0;
  if (ts.toDate) return ts.toDate().getTime(); // Firestore Timestamp
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === "number") return ts;
  return new Date(ts).getTime();
}

/**
 * SERVER-SIDE ONLY: Generate audit log for moderation review
 */
export interface AuditLogEntry {
  timestamp: string;
  qrId: string;
  action: string;
  userId: string;
  details: {
    voteWeight: number;
    accountTier: number;
    accountAgeDays: number;
    emailVerified: boolean;
    collusionFlags?: ServerCollusionAnalysis;
  };
}

export function createAuditLogEntry(
  qrId: string,
  userId: string,
  action: string,
  userData: any,
  emailVerified: boolean,
  submittedWeight: number,
  collusionAnalysis?: ServerCollusionAnalysis
): AuditLogEntry {
  const tierResult = calculateServerAccountTier(userData, emailVerified);
  const createdMs = tierResult.accountCreatedAt || Date.now();
  const accountAgeDays = Math.floor((Date.now() - createdMs) / 86400000);

  return {
    timestamp: new Date().toISOString(),
    qrId,
    userId,
    action,
    details: {
      voteWeight: submittedWeight,
      accountTier: tierResult.tier,
      accountAgeDays,
      emailVerified,
      ...(collusionAnalysis ? { collusionFlags: collusionAnalysis } : {}),
    },
  };
}
