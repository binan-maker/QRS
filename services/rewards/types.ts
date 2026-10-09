export type NetworkProvider = "vcommission" | "cuelinks";
export type ScratchCardTier = "bronze" | "silver" | "gold";
export type ScratchCardStatus = "locked" | "unlocked" | "scratched" | "redeemed" | "expired";
export type ScratchCardSource =
  | "welcome"
  | "milestone"
  | "referral_friend"
  | "referral_host"
  | "community";

export interface RewardOffer {
  id: string;
  networkProvider: NetworkProvider;
  campaignId: string | null;
  merchantName: string;
  merchantLogoUrl?: string | null;
  title: string;
  description: string;
  couponCode: string | null;
  destinationUrl: string;
  tier: ScratchCardTier;
  category: string;
  termsText: string;
  isApproved: boolean;
  isActive: boolean;
  dailyAllocationLimit: number;
  totalAllocated: number;
  expiresAt?: string | null;
}

export interface RewardLimitsConfig {
  id: string;
  dailyCardCap: number;
  scanMilestones: number[];
  minScanCooldownSeconds: number;
  dailyCommunityBonusCap: number;
  minCommentLength: number;
  welcomeCardEnabled: boolean;
  referralsEnabled: boolean;
}

export interface RewardWallet {
  userId: string;
  welcomeCardClaimed: boolean;
  dailyDate: string;
  dailyEligibleScans: number;
  dailyCardsUnlocked: number;
  dailyCommunityBonuses: number;
  lifetimeEligibleScans: number;
  lifetimeCardsUnlocked: number;
  lifetimeCardsScratched: number;
  referralCount: number;
  ownReferralCode?: string;
  isReferralEligible?: boolean;
  referredByUserId?: string | null;
  referredByCode?: string | null;
  lastRewardedScanAt?: string | null;
  nextMilestoneTarget: number | null;
  scansUntilNextCard: number;
  dailyCapReached: boolean;
}

export interface ScratchCardItem {
  id: string;
  userId: string;
  tier: ScratchCardTier;
  sourceType: ScratchCardSource;
  sourceLabel: string;
  status: ScratchCardStatus;
  offerId: string | null;
  offer: RewardOffer;
  unlockRequirementText?: string | null;
  scratchedAt?: string | null;
  redeemedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export interface RewardEventItem {
  id: string;
  userId: string;
  eventType:
    | "eligible_scan"
    | "welcome_card"
    | "milestone_card"
    | "community_contribution"
    | "referral_welcome"
    | "referral_reward"
    | "offer_redeemed";
  qrCodeId?: string | null;
  referenceId?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface ReferralRecord {
  id: string;
  referrerUserId: string;
  referrerCode: string;
  invitedUserId: string;
  invitedUserUsername?: string;
  invitedUserDisplayName?: string;
  invitedUserPhotoUrl?: string | null;
  status: "pending_first_scan" | "qualified" | "flagged_fraud";
  qualifyingQrCodeId?: string | null;
  friendCardId?: string | null;
  referrerCardId?: string | null;
  qualifiedAt?: string | null;
  createdAt: string;
}

export interface UserReferralsDashboard {
  referralCode: string;
  referralLink: string;
  shortLink: string;
  totalInvited: number;
  totalQualified: number;
  totalPending: number;
  goldCardsEarned: number;
  referrals: ReferralRecord[];
}

export interface RewardActionOutcome {
  accepted: boolean;
  reason?: string;
  unlockedCards: ScratchCardItem[];
  wallet: RewardWallet;
}

