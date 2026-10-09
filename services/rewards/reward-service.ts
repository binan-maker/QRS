import { supabase } from "../../lib/supabase";
import { universalAsyncStorage as AsyncStorage } from "../../shared/utils/universal-storage";
import {
  DEFAULT_REWARD_LIMITS,
  DEFAULT_REWARD_OFFERS,
  selectOfferForTier,
} from "./offers-catalog";
import type {
  RewardActionOutcome,
  RewardLimitsConfig,
  RewardOffer,
  RewardWallet,
  ScratchCardItem,
  ScratchCardSource,
  ScratchCardTier,
} from "./types";

const LOCAL_WALLET_PREFIX = "binro_reward_wallet_v1_";
const LOCAL_CARDS_PREFIX = "binro_scratch_cards_v1_";
const LOCAL_SCAN_SET_PREFIX = "binro_reward_scans_v1_";
const LOCAL_CONTRIB_SET_PREFIX = "binro_reward_contribs_v1_";
const PENDING_REFERRAL_CODE_KEY = "binro_pending_referral_code_v1";

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return (
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    })
  );
}

function computeNextMilestoneInfo(
  dailyScans: number,
  dailyCardsUnlocked: number,
  limits: RewardLimitsConfig
): { nextMilestoneTarget: number | null; scansUntilNextCard: number; dailyCapReached: boolean } {
  const dailyCapReached = dailyCardsUnlocked >= limits.dailyCardCap;
  if (dailyCapReached) {
    return { nextMilestoneTarget: null, scansUntilNextCard: 0, dailyCapReached: true };
  }
  for (const milestone of limits.scanMilestones) {
    if (dailyScans < milestone) {
      return {
        nextMilestoneTarget: milestone,
        scansUntilNextCard: Math.max(1, milestone - dailyScans),
        dailyCapReached: false,
      };
    }
  }
  return { nextMilestoneTarget: null, scansUntilNextCard: 0, dailyCapReached: true };
}

function mapRowToOffer(row: any): RewardOffer {
  return {
    id: String(row.id),
    networkProvider: row.network_provider === "cuelinks" ? "cuelinks" : "vcommission",
    campaignId: row.campaign_id ?? null,
    merchantName: String(row.merchant_name ?? "Partner Merchant"),
    merchantLogoUrl: row.merchant_logo_url ?? null,
    title: String(row.title ?? "Special Partner Offer"),
    description: String(row.description ?? ""),
    couponCode: row.coupon_code ?? null,
    destinationUrl: String(row.destination_url ?? "https://www.binro.in"),
    tier:
      row.tier === "gold"
        ? "gold"
        : row.tier === "silver"
          ? "silver"
          : "bronze",
    category: String(row.category ?? "Shopping"),
    termsText: String(
      row.terms_text ??
        "Valid on qualifying orders. Standard merchant & affiliate terms apply."
    ),
    isApproved: row.is_approved !== false,
    isActive: row.is_active !== false,
    dailyAllocationLimit: Number(row.daily_allocation_limit ?? 500),
    totalAllocated: Number(row.total_allocated ?? 0),
    expiresAt: row.expires_at ?? null,
  };
}

function mapRowToScratchCard(row: any, offersPool: RewardOffer[]): ScratchCardItem {
  const tier: ScratchCardTier =
    row.tier === "gold" ? "gold" : row.tier === "silver" ? "silver" : "bronze";
  const snapshot =
    row.offer_snapshot && typeof row.offer_snapshot === "object" && row.offer_snapshot.title
      ? (row.offer_snapshot as RewardOffer)
      : selectOfferForTier(offersPool, tier, String(row.id ?? "seed"));

  return {
    id: String(row.id),
    userId: String(row.user_id),
    tier,
    sourceType: (row.source_type as ScratchCardSource) || "milestone",
    sourceLabel: String(row.source_label || "Scan Milestone Reward"),
    status: row.status || "unlocked",
    offerId: row.offer_id ?? snapshot.id,
    offer: snapshot,
    unlockRequirementText: row.unlock_requirement_text ?? null,
    scratchedAt: row.scratched_at ?? null,
    redeemedAt: row.redeemed_at ?? null,
    expiresAt: row.expires_at ?? null,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export async function getRewardLimits(): Promise<RewardLimitsConfig> {
  try {
    const { data, error } = await supabase
      .from("reward_limits")
      .select("*")
      .eq("id", "default")
      .maybeSingle();
    if (!error && data) {
      return {
        id: "default",
        dailyCardCap: Number(data.daily_card_cap ?? DEFAULT_REWARD_LIMITS.dailyCardCap),
        scanMilestones:
          Array.isArray(data.scan_milestones) && data.scan_milestones.length > 0
            ? data.scan_milestones.map(Number)
            : DEFAULT_REWARD_LIMITS.scanMilestones,
        minScanCooldownSeconds: Number(
          data.min_scan_cooldown_seconds ?? DEFAULT_REWARD_LIMITS.minScanCooldownSeconds
        ),
        dailyCommunityBonusCap: Number(
          data.daily_community_bonus_cap ?? DEFAULT_REWARD_LIMITS.dailyCommunityBonusCap
        ),
        minCommentLength: Number(data.min_comment_length ?? DEFAULT_REWARD_LIMITS.minCommentLength),
        welcomeCardEnabled: data.welcome_card_enabled !== false,
        referralsEnabled: data.referrals_enabled !== false,
      };
    }
  } catch {}
  return DEFAULT_REWARD_LIMITS;
}

export async function getApprovedRewardOffers(): Promise<RewardOffer[]> {
  try {
    const { data, error } = await supabase
      .from("reward_offers")
      .select("*")
      .eq("is_active", true)
      .eq("is_approved", true);
    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map(mapRowToOffer);
    }
  } catch {}
  return DEFAULT_REWARD_OFFERS;
}

async function loadLocalWallet(userId: string, limits: RewardLimitsConfig): Promise<RewardWallet> {
  const today = getTodayDateString();
  try {
    const raw = await AsyncStorage.getItem(`${LOCAL_WALLET_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      const isSameDay = parsed.dailyDate === today;
      const dailyEligibleScans = isSameDay ? Number(parsed.dailyEligibleScans ?? 0) : 0;
      const dailyCardsUnlocked = isSameDay ? Number(parsed.dailyCardsUnlocked ?? 0) : 0;
      const dailyCommunityBonuses = isSameDay ? Number(parsed.dailyCommunityBonuses ?? 0) : 0;
      const milestoneInfo = computeNextMilestoneInfo(dailyEligibleScans, dailyCardsUnlocked, limits);
      return {
        userId,
        welcomeCardClaimed: Boolean(parsed.welcomeCardClaimed),
        dailyDate: today,
        dailyEligibleScans,
        dailyCardsUnlocked,
        dailyCommunityBonuses,
        lifetimeEligibleScans: Number(parsed.lifetimeEligibleScans ?? 0),
        lifetimeCardsUnlocked: Number(parsed.lifetimeCardsUnlocked ?? 0),
        lifetimeCardsScratched: Number(parsed.lifetimeCardsScratched ?? 0),
        referralCount: Number(parsed.referralCount ?? 0),
        referredByUserId: parsed.referredByUserId ?? null,
        referredByCode: parsed.referredByCode ?? null,
        lastRewardedScanAt: parsed.lastRewardedScanAt ?? null,
        ...milestoneInfo,
      };
    }
  } catch {}

  const milestoneInfo = computeNextMilestoneInfo(0, 0, limits);
  return {
    userId,
    welcomeCardClaimed: false,
    dailyDate: today,
    dailyEligibleScans: 0,
    dailyCardsUnlocked: 0,
    dailyCommunityBonuses: 0,
    lifetimeEligibleScans: 0,
    lifetimeCardsUnlocked: 0,
    lifetimeCardsScratched: 0,
    referralCount: 0,
    referredByUserId: null,
    referredByCode: null,
    lastRewardedScanAt: null,
    ...milestoneInfo,
  };
}

async function saveLocalWallet(wallet: RewardWallet): Promise<void> {
  try {
    await AsyncStorage.setItem(`${LOCAL_WALLET_PREFIX}${wallet.userId}`, JSON.stringify(wallet));
  } catch {}
}

async function loadLocalScratchCards(userId: string): Promise<ScratchCardItem[]> {
  try {
    const raw = await AsyncStorage.getItem(`${LOCAL_CARDS_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

async function saveLocalScratchCards(userId: string, cards: ScratchCardItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${LOCAL_CARDS_PREFIX}${userId}`, JSON.stringify(cards));
  } catch {}
}

export async function getUserRewardWallet(userId: string): Promise<RewardWallet> {
  const limits = await getRewardLimits();
  const today = getTodayDateString();
  const local = await loadLocalWallet(userId, limits);

  try {
    const { data, error } = await supabase
      .from("reward_wallet")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) {
      const dbDate = String(data.daily_date ?? today).slice(0, 10);
      const isSameDay = dbDate === today;
      const dailyEligibleScans = Math.max(
        local.dailyEligibleScans,
        isSameDay ? Number(data.daily_eligible_scans ?? 0) : 0
      );
      const dailyCardsUnlocked = Math.max(
        local.dailyCardsUnlocked,
        isSameDay ? Number(data.daily_cards_unlocked ?? 0) : 0
      );
      const dailyCommunityBonuses = Math.max(
        local.dailyCommunityBonuses,
        isSameDay ? Number(data.daily_community_bonuses ?? 0) : 0
      );
      const milestoneInfo = computeNextMilestoneInfo(dailyEligibleScans, dailyCardsUnlocked, limits);

      const merged: RewardWallet = {
        userId,
        welcomeCardClaimed: Boolean(data.welcome_card_claimed || local.welcomeCardClaimed),
        dailyDate: today,
        dailyEligibleScans,
        dailyCardsUnlocked,
        dailyCommunityBonuses,
        lifetimeEligibleScans: Math.max(
          local.lifetimeEligibleScans,
          Number(data.lifetime_eligible_scans ?? 0)
        ),
        lifetimeCardsUnlocked: Math.max(
          local.lifetimeCardsUnlocked,
          Number(data.lifetime_cards_unlocked ?? 0)
        ),
        lifetimeCardsScratched: Math.max(
          local.lifetimeCardsScratched,
          Number(data.lifetime_cards_scratched ?? 0)
        ),
        referralCount: Math.max(local.referralCount, Number(data.referral_count ?? 0)),
        referredByUserId: data.referred_by_user_id ?? local.referredByUserId ?? null,
        referredByCode: data.referred_by_code ?? local.referredByCode ?? null,
        lastRewardedScanAt: data.last_rewarded_scan_at ?? local.lastRewardedScanAt ?? null,
        ...milestoneInfo,
      };
      await saveLocalWallet(merged);
      return merged;
    }
  } catch {}

  return local;
}

export async function getUserScratchCards(userId: string): Promise<ScratchCardItem[]> {
  const [offers, localCards] = await Promise.all([
    getApprovedRewardOffers(),
    loadLocalScratchCards(userId),
  ]);

  try {
    const { data, error } = await supabase
      .from("scratch_cards")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && Array.isArray(data)) {
      const dbCards = data.map((row) => mapRowToScratchCard(row, offers));
      const byId = new Map<string, ScratchCardItem>();
      for (const c of localCards) byId.set(c.id, c);
      for (const c of dbCards) byId.set(c.id, c);
      const merged = Array.from(byId.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      await saveLocalScratchCards(userId, merged);
      return merged;
    }
  } catch {}

  return localCards;
}

async function allocateScratchCard(params: {
  userId: string;
  tier: ScratchCardTier;
  sourceType: ScratchCardSource;
  sourceLabel: string;
  status?: "locked" | "unlocked";
  unlockRequirementText?: string | null;
  offers: RewardOffer[];
  idempotencyKey: string;
}): Promise<ScratchCardItem> {
  const cardId = generateId();
  const offer = selectOfferForTier(params.offers, params.tier, `${params.userId}:${params.idempotencyKey}`);
  const now = new Date().toISOString();
  const card: ScratchCardItem = {
    id: cardId,
    userId: params.userId,
    tier: params.tier,
    sourceType: params.sourceType,
    sourceLabel: params.sourceLabel,
    status: params.status ?? "unlocked",
    offerId: offer.id,
    offer,
    unlockRequirementText: params.unlockRequirementText ?? null,
    scratchedAt: null,
    redeemedAt: null,
    expiresAt: null,
    createdAt: now,
  };

  const existingLocal = await loadLocalScratchCards(params.userId);
  await saveLocalScratchCards(params.userId, [card, ...existingLocal]);

  try {
    await supabase.from("scratch_cards").insert({
      id: card.id,
      user_id: card.userId,
      tier: card.tier,
      source_type: card.sourceType,
      source_label: card.sourceLabel,
      status: card.status,
      offer_id: card.offerId,
      offer_snapshot: card.offer,
      unlock_requirement_text: card.unlockRequirementText,
      created_at: card.createdAt,
      updated_at: card.createdAt,
    });
  } catch {}

  try {
    await supabase.from("reward_events").insert({
      user_id: params.userId,
      event_type:
        params.sourceType === "welcome"
          ? "welcome_card"
          : params.sourceType === "community"
            ? "community_contribution"
            : params.sourceType === "referral_friend"
              ? "referral_welcome"
              : params.sourceType === "referral_host"
                ? "referral_reward"
                : "milestone_card",
      reference_id: card.id,
      idempotency_key: params.idempotencyKey,
      metadata: {
        tier: card.tier,
        offerId: offer.id,
        merchantName: offer.merchantName,
        sourceLabel: card.sourceLabel,
      },
      created_at: now,
    });
  } catch {}

  return card;
}

async function persistWalletToSupabase(wallet: RewardWallet): Promise<void> {
  await saveLocalWallet(wallet);
  try {
    await supabase.from("reward_wallet").upsert(
      {
        user_id: wallet.userId,
        welcome_card_claimed: wallet.welcomeCardClaimed,
        daily_date: wallet.dailyDate,
        daily_eligible_scans: wallet.dailyEligibleScans,
        daily_cards_unlocked: wallet.dailyCardsUnlocked,
        daily_community_bonuses: wallet.dailyCommunityBonuses,
        lifetime_eligible_scans: wallet.lifetimeEligibleScans,
        lifetime_cards_unlocked: wallet.lifetimeCardsUnlocked,
        lifetime_cards_scratched: wallet.lifetimeCardsScratched,
        referral_count: wallet.referralCount,
        referred_by_user_id: wallet.referredByUserId ?? null,
        referred_by_code: wallet.referredByCode ?? null,
        last_rewarded_scan_at: wallet.lastRewardedScanAt ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  } catch {}
}

/**
 * Evaluates a user's QR scan for reward eligibility.
 * Enforces:
 *  - Authenticated non-anonymous account
 *  - Lifetime per-QR deduplication (scanning the same QR twice does not grant duplicate progress)
 *  - 15-second burst cooldown between rewarded scans
 *  - 1st eligible scan ever unlocks Welcome Card
 *  - Daily progressive scan milestones (3, 8, 15) with configurable daily cap
 *  - Qualifies any pending friend referral on first verified scan
 */
export async function processEligibleScanReward(
  userId: string | null,
  qrId: string,
  isAnonymous: boolean = false
): Promise<RewardActionOutcome | null> {
  if (!userId || isAnonymous || !qrId) return null;

  const [limits, offers, wallet] = await Promise.all([
    getRewardLimits(),
    getApprovedRewardOffers(),
    getUserRewardWallet(userId),
  ]);

  // 1. Check unique QR deduplication for this user
  const scanSetKey = `${LOCAL_SCAN_SET_PREFIX}${userId}`;
  let scannedQrIds: string[] = [];
  try {
    const raw = await AsyncStorage.getItem(scanSetKey);
    if (raw) scannedQrIds = JSON.parse(raw);
  } catch {}

  if (scannedQrIds.includes(qrId)) {
    return {
      accepted: false,
      reason: "already_scanned_qr",
      unlockedCards: [],
      wallet,
    };
  }

  // 2. Check burst cooldown (default 15 seconds between rewarded scans)
  const nowMs = Date.now();
  if (wallet.lastRewardedScanAt) {
    const lastMs = new Date(wallet.lastRewardedScanAt).getTime();
    if (Number.isFinite(lastMs) && nowMs - lastMs < limits.minScanCooldownSeconds * 1000) {
      return {
        accepted: false,
        reason: "cooldown_active",
        unlockedCards: [],
        wallet,
      };
    }
  }

  // Mark QR as rewarded for this user
  scannedQrIds.unshift(qrId);
  if (scannedQrIds.length > 1000) scannedQrIds = scannedQrIds.slice(0, 1000);
  try {
    await AsyncStorage.setItem(scanSetKey, JSON.stringify(scannedQrIds));
  } catch {}

  const nowIso = new Date(nowMs).toISOString();
  const unlockedCards: ScratchCardItem[] = [];

  wallet.dailyEligibleScans += 1;
  wallet.lifetimeEligibleScans += 1;
  wallet.lastRewardedScanAt = nowIso;

  // 3. First eligible QR scan ever -> 1 Welcome Card
  if (limits.welcomeCardEnabled && !wallet.welcomeCardClaimed) {
    wallet.welcomeCardClaimed = true;
    wallet.lifetimeCardsUnlocked += 1;
    const welcomeCard = await allocateScratchCard({
      userId,
      tier: "bronze",
      sourceType: "welcome",
      sourceLabel: "First Scan Welcome Reward",
      offers,
      idempotencyKey: `welcome_${userId}`,
    });
    unlockedCards.push(welcomeCard);
  }

  // 4. Unlock any locked Referral Friend Card on first scan
  const existingCards = await getUserScratchCards(userId);
  for (const card of existingCards) {
    if (card.status === "locked" && card.sourceType === "referral_friend") {
      card.status = "unlocked";
      card.unlockRequirementText = null;
      unlockedCards.push(card);
      try {
        await supabase
          .from("scratch_cards")
          .update({ status: "unlocked", unlock_requirement_text: null, updated_at: nowIso })
          .eq("id", card.id);
      } catch {}
    }
  }
  if (unlockedCards.some((c) => c.sourceType === "referral_friend")) {
    await saveLocalScratchCards(userId, existingCards);
    await qualifyReferralOnFirstScan(userId, qrId, offers);
  }

  // 5. Daily progressive scan milestones (3, 8, 15) within daily card cap
  if (
    wallet.dailyCardsUnlocked < limits.dailyCardCap &&
    limits.scanMilestones.includes(wallet.dailyEligibleScans)
  ) {
    wallet.dailyCardsUnlocked += 1;
    wallet.lifetimeCardsUnlocked += 1;
    const milestoneIndex = limits.scanMilestones.indexOf(wallet.dailyEligibleScans);
    const tier: ScratchCardTier =
      milestoneIndex >= 2 ? "gold" : milestoneIndex === 1 ? "silver" : "bronze";

    const milestoneCard = await allocateScratchCard({
      userId,
      tier,
      sourceType: "milestone",
      sourceLabel: `Daily Milestone (${wallet.dailyEligibleScans} Unique Scans)`,
      offers,
      idempotencyKey: `milestone_${userId}_${wallet.dailyDate}_${wallet.dailyEligibleScans}`,
    });
    unlockedCards.push(milestoneCard);
  }

  const milestoneInfo = computeNextMilestoneInfo(
    wallet.dailyEligibleScans,
    wallet.dailyCardsUnlocked,
    limits
  );
  wallet.nextMilestoneTarget = milestoneInfo.nextMilestoneTarget;
  wallet.scansUntilNextCard = milestoneInfo.scansUntilNextCard;
  wallet.dailyCapReached = milestoneInfo.dailyCapReached;

  await persistWalletToSupabase(wallet);

  try {
    await supabase.from("reward_events").insert({
      user_id: userId,
      event_type: "eligible_scan",
      qr_code_id: qrId,
      idempotency_key: `scan_${userId}_${qrId}`,
      metadata: {
        dailyEligibleScans: wallet.dailyEligibleScans,
        lifetimeEligibleScans: wallet.lifetimeEligibleScans,
      },
      created_at: nowIso,
    });
  } catch {}

  return {
    accepted: true,
    unlockedCards,
    wallet,
  };
}

/**
 * Evaluates a quality-checked community contribution (neutral safety report or 15+ char review).
 * Strictly independent of safety verdict (Safe, Scam, Fake, and Spam are treated identically).
 */
export async function processCommunityContributionReward(params: {
  userId: string | null;
  qrId: string;
  contributionType: "safety_report" | "helpful_comment";
  commentText?: string;
}): Promise<RewardActionOutcome | null> {
  const { userId, qrId, contributionType, commentText } = params;
  if (!userId || !qrId) return null;

  const [limits, offers, wallet] = await Promise.all([
    getRewardLimits(),
    getApprovedRewardOffers(),
    getUserRewardWallet(userId),
  ]);

  if (
    contributionType === "helpful_comment" &&
    (!commentText || commentText.trim().length < limits.minCommentLength)
  ) {
    return {
      accepted: false,
      reason: "comment_too_short",
      unlockedCards: [],
      wallet,
    };
  }

  if (wallet.dailyCommunityBonuses >= limits.dailyCommunityBonusCap) {
    return {
      accepted: false,
      reason: "daily_community_cap_reached",
      unlockedCards: [],
      wallet,
    };
  }

  const contribKey = `${LOCAL_CONTRIB_SET_PREFIX}${userId}`;
  const dedupToken = `${contributionType}:${qrId}`;
  let history: string[] = [];
  try {
    const raw = await AsyncStorage.getItem(contribKey);
    if (raw) history = JSON.parse(raw);
  } catch {}

  if (history.includes(dedupToken)) {
    return {
      accepted: false,
      reason: "already_rewarded_for_qr",
      unlockedCards: [],
      wallet,
    };
  }

  history.unshift(dedupToken);
  if (history.length > 500) history = history.slice(0, 500);
  try {
    await AsyncStorage.setItem(contribKey, JSON.stringify(history));
  } catch {}

  wallet.dailyCommunityBonuses += 1;
  wallet.dailyEligibleScans += 1;
  const unlockedCards: ScratchCardItem[] = [];

  if (
    wallet.dailyCardsUnlocked < limits.dailyCardCap &&
    limits.scanMilestones.includes(wallet.dailyEligibleScans)
  ) {
    wallet.dailyCardsUnlocked += 1;
    wallet.lifetimeCardsUnlocked += 1;
    const card = await allocateScratchCard({
      userId,
      tier: "silver",
      sourceType: "community",
      sourceLabel: "Community Contributor Reward",
      offers,
      idempotencyKey: `community_${userId}_${wallet.dailyDate}_${wallet.dailyEligibleScans}`,
    });
    unlockedCards.push(card);
  }

  const milestoneInfo = computeNextMilestoneInfo(
    wallet.dailyEligibleScans,
    wallet.dailyCardsUnlocked,
    limits
  );
  wallet.nextMilestoneTarget = milestoneInfo.nextMilestoneTarget;
  wallet.scansUntilNextCard = milestoneInfo.scansUntilNextCard;
  wallet.dailyCapReached = milestoneInfo.dailyCapReached;

  await persistWalletToSupabase(wallet);

  return {
    accepted: true,
    unlockedCards,
    wallet,
  };
}

/**
 * Marks a Scratch Card as scratched and reveals the underlying coupon/offer.
 */
export async function scratchRewardCard(
  userId: string,
  cardId: string
): Promise<ScratchCardItem | null> {
  const cards = await getUserScratchCards(userId);
  const target = cards.find((c) => c.id === cardId);
  if (!target || target.status === "locked") return null;

  if (target.status === "unlocked") {
    const now = new Date().toISOString();
    target.status = "scratched";
    target.scratchedAt = now;
    await saveLocalScratchCards(userId, cards);

    const wallet = await getUserRewardWallet(userId);
    wallet.lifetimeCardsScratched += 1;
    await persistWalletToSupabase(wallet);

    try {
      await supabase
        .from("scratch_cards")
        .update({ status: "scratched", scratched_at: now, updated_at: now })
        .eq("id", cardId)
        .eq("user_id", userId);
    } catch {}
  }

  return target;
}

/**
 * Records when a user taps "Copy & Redeem" on a scratched card.
 */
export async function recordOfferRedemption(
  userId: string,
  cardId: string
): Promise<void> {
  const now = new Date().toISOString();
  const cards = await loadLocalScratchCards(userId);
  const target = cards.find((c) => c.id === cardId);
  if (target) {
    target.status = "redeemed";
    target.redeemedAt = now;
    await saveLocalScratchCards(userId, cards);
  }

  try {
    await supabase
      .from("scratch_cards")
      .update({ status: "redeemed", redeemed_at: now, updated_at: now })
      .eq("id", cardId)
      .eq("user_id", userId);

    await supabase.from("reward_events").insert({
      user_id: userId,
      event_type: "offer_redeemed",
      reference_id: cardId,
      idempotency_key: `redeem_${userId}_${cardId}`,
      metadata: {
        offerId: target?.offerId,
        networkProvider: target?.offer?.networkProvider,
      },
      created_at: now,
    });
  } catch {}
}

/**
 * Stores or applies a referral code for two-sided referral rewards.
 * Invited friend receives a locked Silver Welcome Card that unlocks on their 1st verified QR scan.
 * Referrer receives a Gold VIP Card once the friend completes their 1st verified QR scan.
 */
export async function savePendingReferralCode(code: string): Promise<void> {
  const cleaned = code.trim().replace(/^@/, "").toLowerCase();
  if (!cleaned) return;
  try {
    await AsyncStorage.setItem(PENDING_REFERRAL_CODE_KEY, cleaned);
  } catch {}
}

export async function getPendingReferralCode(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PENDING_REFERRAL_CODE_KEY);
  } catch {
    return null;
  }
}

export async function applyReferralCodeForUser(
  invitedUserId: string,
  rawCode?: string | null
): Promise<{ ok: boolean; message: string; card?: ScratchCardItem }> {
  const code = (rawCode ?? (await getPendingReferralCode()) ?? "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();

  if (!code) {
    return { ok: false, message: "Please enter a valid referral username or code." };
  }

  const [limits, offers, wallet] = await Promise.all([
    getRewardLimits(),
    getApprovedRewardOffers(),
    getUserRewardWallet(invitedUserId),
  ]);

  if (!limits.referralsEnabled) {
    return { ok: false, message: "Referrals are currently paused." };
  }

  if (wallet.referredByCode || wallet.referredByUserId) {
    return { ok: false, message: "A referral code has already been applied to your account." };
  }

  let referrerUserId: string | null = null;
  try {
    const { data: userRow } = await supabase
      .from("users")
      .select("id, username")
      .ilike("username", code)
      .maybeSingle();

    if (userRow?.id) {
      referrerUserId = String(userRow.id);
    }
  } catch {}

  if (referrerUserId && referrerUserId === invitedUserId) {
    return { ok: false, message: "You cannot use your own referral code." };
  }

  wallet.referredByCode = code;
  wallet.referredByUserId = referrerUserId;
  await persistWalletToSupabase(wallet);

  try {
    await AsyncStorage.removeItem(PENDING_REFERRAL_CODE_KEY);
  } catch {}

  const isAlreadyActiveScanner = wallet.lifetimeEligibleScans > 0;
  const friendCard = await allocateScratchCard({
    userId: invitedUserId,
    tier: "silver",
    sourceType: "referral_friend",
    sourceLabel: `Gift from @${code}`,
    status: isAlreadyActiveScanner ? "unlocked" : "locked",
    unlockRequirementText: isAlreadyActiveScanner
      ? null
      : `Gift from @${code} — Scan your first QR code to unlock & scratch!`,
    offers,
    idempotencyKey: `referral_friend_${invitedUserId}`,
  });

  if (referrerUserId) {
    try {
      await supabase.from("referrals").insert({
        referrer_user_id: referrerUserId,
        referrer_code: code,
        invited_user_id: invitedUserId,
        status: isAlreadyActiveScanner ? "qualified" : "pending_first_scan",
        friend_card_id: friendCard.id,
        qualified_at: isAlreadyActiveScanner ? new Date().toISOString() : null,
      });
    } catch {}

    if (isAlreadyActiveScanner) {
      await qualifyReferralOnFirstScan(invitedUserId, "initial_scan", offers);
    }
  }

  return {
    ok: true,
    message: isAlreadyActiveScanner
      ? `Unlocked your Silver Welcome Card from @${code}!`
      : `Saved gift from @${code}! Scan 1 QR code to unlock your Silver Scratch Card.`,
    card: friendCard,
  };
}

async function qualifyReferralOnFirstScan(
  invitedUserId: string,
  qrId: string,
  offers: RewardOffer[]
): Promise<void> {
  try {
    const { data: refRow } = await supabase
      .from("referrals")
      .select("*")
      .eq("invited_user_id", invitedUserId)
      .eq("status", "pending_first_scan")
      .maybeSingle();

    if (!refRow || !refRow.referrer_user_id) return;

    const referrerId = String(refRow.referrer_user_id);
    const referrerCard = await allocateScratchCard({
      userId: referrerId,
      tier: "gold",
      sourceType: "referral_host",
      sourceLabel: "Verified Friend Referral Reward (Gold VIP)",
      status: "unlocked",
      offers,
      idempotencyKey: `referral_host_${referrerId}_${invitedUserId}`,
    });

    const now = new Date().toISOString();
    await supabase
      .from("referrals")
      .update({
        status: "qualified",
        qualifying_qr_code_id: qrId,
        referrer_card_id: referrerCard.id,
        qualified_at: now,
        updated_at: now,
      })
      .eq("id", refRow.id);
  } catch {}
}
