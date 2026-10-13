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
  referrals: ReferralRecord[];
}

export interface RewardWallet {
  userId: string;
  welcomeCardClaimed?: boolean;
  dailyDate?: string;
  dailyEligibleScans?: number;
  dailyCardsUnlocked?: number;
  dailyCommunityBonuses?: number;
  lifetimeEligibleScans?: number;
  lifetimeCardsUnlocked?: number;
  lifetimeCardsScratched?: number;
  referralCount: number;
  ownReferralCode?: string;
  isReferralEligible?: boolean;
  referredByUserId?: string | null;
  referredByCode?: string | null;
  lastRewardedScanAt?: string | null;
  nextMilestoneTarget?: number | null;
  scansUntilNextCard?: number;
  dailyCapReached?: boolean;
}
