export type OfferSourceNetwork = "manual" | "vcommission" | "cuelinks";

export type ScratchCardStatus = "available" | "revealed" | "expired" | "redeemed";

export interface RewardOffer {
  id: string;
  title: string;
  merchantName: string;
  description: string;
  couponCode?: string | null;
  trackedUrl?: string | null;
  imageUrl?: string | null;
  terms: string;
  startsAt?: string;
  expiresAt?: string | null;
  isActive: boolean;
  sourceNetwork: OfferSourceNetwork;
  sourceOfferId?: string | null;
  inventoryLimit?: number | null;
  inventoryUsed?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserScratchCard {
  id: string;
  userId: string;
  rewardOfferId: string;
  sourceScanId?: string | null;
  qrCodeId?: string | null;
  status: ScratchCardStatus;
  assignedAt: string;
  revealedAt?: string | null;
  expiresAt?: string | null;
  idempotencyKey?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // Embedded / joined offer details
  offer?: RewardOffer;
}

export type RewardEventType = "issued" | "revealed" | "copy_code" | "open_offer" | "expired";

export interface RewardEvent {
  id: string;
  userId: string;
  scratchCardId?: string | null;
  eventType: RewardEventType;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface RewardSettings {
  dailyUserLimit: number;
  qrCooldownHours: number;
  globalDailyCap: number;
  cardValidityDays: number;
}

export interface RewardEligibilityResult {
  eligible: boolean;
  reason?: string;
  card?: UserScratchCard;
  isDuplicate?: boolean;
}

export interface RewardsSummary {
  availableCards: UserScratchCard[];
  revealedCards: UserScratchCard[];
  expiredCards: UserScratchCard[];
  totalAvailableCount: number;
  totalRevealedCount: number;
}
