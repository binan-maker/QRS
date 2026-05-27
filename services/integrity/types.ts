export interface AccountTier {
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

export const TIER_CONFIG: Record<number, AccountTier> = {
  0: {
    tier: 0, voteWeight: 0.01, maxCommentsPerDay: 50, maxCommentsPerQr: 5,
    maxReportsPerDay: 20, maxCommentReportsPerDay: 10, minCommentCooldownSeconds: 2,
    canAct: true,
  },
  1: {
    tier: 1, voteWeight: 0.05, maxCommentsPerDay: 100, maxCommentsPerQr: 10,
    maxReportsPerDay: 50, maxCommentReportsPerDay: 25, minCommentCooldownSeconds: 1,
    canAct: true,
  },
  2: {
    tier: 2, voteWeight: 0.3, maxCommentsPerDay: 200, maxCommentsPerQr: 20,
    maxReportsPerDay: 100, maxCommentReportsPerDay: 50, minCommentCooldownSeconds: 0,
    canAct: true,
  },
  3: {
    tier: 3, voteWeight: 0.7, maxCommentsPerDay: 500, maxCommentsPerQr: 50,
    maxReportsPerDay: 200, maxCommentReportsPerDay: 100, minCommentCooldownSeconds: 0,
    canAct: true,
  },
  4: {
    tier: 4, voteWeight: 1.5, maxCommentsPerDay: 1000, maxCommentsPerQr: 100,
    maxReportsPerDay: 500, maxCommentReportsPerDay: 250, minCommentCooldownSeconds: 0,
    canAct: true,
  },
  5: {
    tier: 5, voteWeight: 2.0, maxCommentsPerDay: Infinity, maxCommentsPerQr: Infinity,
    maxReportsPerDay: 1000, maxCommentReportsPerDay: 500, minCommentCooldownSeconds: 0,
    canAct: true,
  },
};
