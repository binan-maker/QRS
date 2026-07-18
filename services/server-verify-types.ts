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

export interface ServerCollusionAnalysis {
  suspicious: boolean;
  reason: string | null;
  safeWeightMultiplier: number;
  negativeWeightMultiplier: number;
  confidenceScore: number;
  flaggedUserIds?: string[];
}

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

export const TIER_CONFIG: Record<number, ServerAccountTier> = {
  0: {
    tier: 0, voteWeight: 0.01, maxCommentsPerDay: Infinity, maxCommentsPerQr: Infinity,
    maxReportsPerDay: Infinity, maxCommentReportsPerDay: Infinity, minCommentCooldownSeconds: 0,
    canAct: false,
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
