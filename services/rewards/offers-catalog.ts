import type { RewardLimitsConfig, RewardOffer, ScratchCardTier } from "./types";

export const DEFAULT_REWARD_LIMITS: RewardLimitsConfig = {
  id: "default",
  dailyCardCap: 3,
  scanMilestones: [3, 8, 15],
  minScanCooldownSeconds: 15,
  dailyCommunityBonusCap: 2,
  minCommentLength: 15,
  welcomeCardEnabled: true,
  referralsEnabled: true,
};

/**
 * All reward offers are 100% dynamic and fetched live from Supabase (public.rewards_deals)
 * and the vCommission automation engine.
 * No affiliate coupons or card copies are hardcoded in the codebase.
 */
export const DEFAULT_REWARD_OFFERS: RewardOffer[] = [];

/**
 * Selects an offer for a given tier from the dynamically loaded pool.
 * If the pool is temporarily empty (e.g., initial sync in progress), returns a fallback template
 * until live Supabase coupons resolve.
 */
export function selectOfferForTier(
  offers: RewardOffer[],
  tier: ScratchCardTier,
  seedString: string
): RewardOffer {
  const activeApproved = (offers || []).filter((o) => o.isActive && o.isApproved);
  const tierMatches = activeApproved.filter((o) => o.tier === tier);
  const pool =
    tierMatches.length > 0
      ? tierMatches
      : activeApproved.length > 0
      ? activeApproved
      : (offers && offers.length > 0)
      ? offers
      : [];

  if (pool.length === 0) {
    return {
      id: `dyn_vcommission_${tier}`,
      networkProvider: "vcommission",
      campaignId: null,
      merchantName: "vCommission Partner",
      merchantLogoUrl: null,
      title: "Partner Bonus Deal",
      description: "Live partner offer synced dynamically from Supabase.",
      couponCode: null,
      destinationUrl: "https://www.binro.in/rewards",
      tier,
      category: "Shopping",
      termsText: "Subject to live merchant and network terms.",
      isApproved: true,
      isActive: true,
      dailyAllocationLimit: 500,
      totalAllocated: 0,
      expiresAt: null,
    };
  }

  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash * 31 + seedString.charCodeAt(i)) >>> 0;
  }
  return pool[hash % pool.length];
}
