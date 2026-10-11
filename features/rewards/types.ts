import type { RewardOffer, RewardWallet, ScratchCardItem } from "@/services/rewards";

export interface DisplayBonusCard {
  id: string;
  headline: string;
  merchantName: string;
  status: "unlocked" | "scratched" | "expired" | "locked";
  validityText: string;
  bannerUrl: string;
  merchantLogoUrl?: string | null;
  subtitle?: string | null;
  creativeUrls?: string[];
  badgeType: "lock" | "pink" | "citrus" | "wog" | "arena" | "scissors" | "visa" | "brand";
  isWide?: boolean;
  createdAt?: string | null;
  scratchedAt?: string | null;
  offer: RewardOffer;
}

export type { RewardOffer, RewardWallet, ScratchCardItem };
