import { supabase, isWebSupabaseConfigured } from "@/lib/core/supabase";
import { universalAsyncStorage as AsyncStorage } from "../../shared/utils/universal-storage";
import type {
  UserScratchCard,
  RewardEligibilityResult,
  RewardsSummary,
  RewardSettings,
  RewardEventType,
} from "./types";

const LOCAL_CARDS_PREFIX = "binro_user_scratch_cards_v1_";
const LOCAL_EVENTS_PREFIX = "binro_reward_events_v1_";

// Default configurable reward rules (fallbacks if reward_settings table is queried)
export const DEFAULT_REWARD_SETTINGS: RewardSettings = {
  dailyUserLimit: 3,
  qrCooldownHours: 24,
  globalDailyCap: 500,
  cardValidityDays: 7,
};

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/**
 * Retrieve user's local cached scratch cards (read-only mirror of Supabase data for offline viewing)
 */
async function getLocalCachedCards(userId: string): Promise<UserScratchCard[]> {
  try {
    const raw = await AsyncStorage.getItem(`${LOCAL_CARDS_PREFIX}${userId}`);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
  } catch {}
  return [];
}

/**
 * Save user's confirmed scratch cards to local cache for offline viewing
 */
async function saveLocalCachedCards(userId: string, cards: UserScratchCard[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${LOCAL_CARDS_PREFIX}${userId}`, JSON.stringify(cards));
  } catch {}
}

/**
 * Evaluate scan eligibility and atomically issue a scratch card.
 * 100% strictly enforced inside Supabase Postgres via the `issue_scratch_card` RPC:
 * - Checks authenticated user
 * - Idempotency protection to prevent retry duplicates
 * - Cooldown protection (max 1 reward per user per QR code per 24 hours)
 * - Daily user limit (max 3/day)
 * - Global community issuance cap
 * - Assigns active, valid coupon from `public.reward_offers` with available inventory
 * - NEVER creates prizes in client-side code
 */
export async function evaluateAndIssueScanReward({
  userId,
  qrCodeId,
  scanId,
  isAnonymous = false,
}: {
  userId: string | null | undefined;
  qrCodeId: string;
  scanId?: string;
  isAnonymous?: boolean;
}): Promise<RewardEligibilityResult> {
  // 1. Signed-out / anonymous checks
  if (!userId || isAnonymous) {
    return {
      eligible: false,
      reason: "Sign in to unlock coupon scratch cards on your scans",
    };
  }

  if (!isWebSupabaseConfigured()) {
    return {
      eligible: false,
      reason: "Reward service currently unavailable",
    };
  }

  // Idempotency key: combination of userId, qrCodeId, and current calendar day (or scanId)
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const idempotencyKey = `reward_${userId}_${qrCodeId}_${todayDateStr}`;

  try {
    // 2. Call Supabase atomic RPC directly
    const rpcCall = supabase.rpc("issue_scratch_card", {
      p_user_id: userId,
      p_qr_code_id: qrCodeId,
      p_scan_id: scanId || null,
      p_idempotency_key: idempotencyKey,
    });

    const res = await withTimeout(rpcCall, 5000, null);

    if (res && !res.error && res.data) {
      const data = res.data;
      if (data.eligible && data.card) {
        const rawCard = data.card;
        const formattedCard: UserScratchCard = {
          id: rawCard.id,
          userId,
          rewardOfferId: rawCard.reward_offer_id,
          qrCodeId,
          sourceScanId: scanId || null,
          status: rawCard.status || "available",
          assignedAt: rawCard.assigned_at || new Date().toISOString(),
          expiresAt: rawCard.expires_at || new Date(Date.now() + 7 * 86400000).toISOString(),
          idempotencyKey,
          offer: {
            id: rawCard.reward_offer_id,
            title: rawCard.title,
            merchantName: rawCard.merchant_name,
            description: rawCard.description,
            couponCode: rawCard.coupon_code,
            trackedUrl: rawCard.tracked_url,
            imageUrl: rawCard.image_url,
            terms: rawCard.terms || "",
            isActive: true,
            sourceNetwork: rawCard.source_network || "vcommission",
          },
        };

        // Update read-only local mirror
        const localCards = await getLocalCachedCards(userId);
        const existingIdx = localCards.findIndex((c) => c.id === formattedCard.id);
        if (existingIdx >= 0) {
          localCards[existingIdx] = formattedCard;
        } else {
          localCards.unshift(formattedCard);
        }
        await saveLocalCachedCards(userId, localCards);

        return {
          eligible: true,
          card: formattedCard,
          isDuplicate: Boolean(data.is_duplicate),
        };
      } else {
        return {
          eligible: false,
          reason: data.reason || "Scan not eligible for reward",
        };
      }
    }

    if (res?.error) {
      return {
        eligible: false,
        reason: res.error.message || "Unable to process reward at this time",
      };
    }
  } catch (err) {
    console.warn("[rewards] Error calling Supabase issue_scratch_card:", err);
  }

  return {
    eligible: false,
    reason: "Unable to verify reward eligibility. Please check your connection.",
  };
}

/**
 * Fetch all scratch cards for user from Supabase, strictly joined with `reward_offers`
 */
export async function getUserScratchCards(userId: string): Promise<RewardsSummary> {
  if (!userId) {
    return {
      availableCards: [],
      revealedCards: [],
      expiredCards: [],
      totalAvailableCount: 0,
      totalRevealedCount: 0,
    };
  }

  let allCards: UserScratchCard[] = [];
  let fetchedFromSupabase = false;

  // Query Supabase directly
  if (isWebSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("user_scratch_cards")
        .select(`
          id,
          user_id,
          reward_offer_id,
          source_scan_id,
          qr_code_id,
          status,
          assigned_at,
          revealed_at,
          expires_at,
          idempotency_key,
          reward_offers (
            id,
            title,
            merchant_name,
            description,
            coupon_code,
            tracked_url,
            image_url,
            terms,
            expires_at,
            is_active,
            source_network
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        fetchedFromSupabase = true;
        allCards = data
          .map((row: any) => {
            const off = row.reward_offers;
            // If the offer doesn't exist or is invalid, omit or mark
            if (!off || !off.title) return null;

            return {
              id: row.id,
              userId: row.user_id,
              rewardOfferId: row.reward_offer_id,
              sourceScanId: row.source_scan_id,
              qrCodeId: row.qr_code_id,
              status: row.status as any,
              assignedAt: row.assigned_at,
              revealedAt: row.revealed_at,
              expiresAt: row.expires_at,
              idempotencyKey: row.idempotency_key,
              offer: {
                id: off.id || row.reward_offer_id,
                title: off.title,
                merchantName: off.merchant_name || "Merchant",
                description: off.description || "",
                couponCode: off.coupon_code,
                trackedUrl: off.tracked_url,
                imageUrl: off.image_url,
                terms: off.terms || "",
                expiresAt: off.expires_at,
                isActive: off.is_active ?? true,
                sourceNetwork: off.source_network || "vcommission",
              },
            };
          })
          .filter(Boolean) as UserScratchCard[];

        // Update read-only offline cache
        await saveLocalCachedCards(userId, allCards);
      }
    } catch (err) {
      console.warn("[rewards] Error querying Supabase user_scratch_cards:", err);
    }
  }

  // If network dropped or Supabase was unreachable, fall back to read-only cached cards
  if (!fetchedFromSupabase) {
    allCards = await getLocalCachedCards(userId);
  }

  // Evaluate expiry
  const now = Date.now();
  const availableCards: UserScratchCard[] = [];
  const revealedCards: UserScratchCard[] = [];
  const expiredCards: UserScratchCard[] = [];

  allCards.forEach((card) => {
    const isExpired = card.expiresAt && new Date(card.expiresAt).getTime() < now;
    if (isExpired && card.status === "available") {
      card.status = "expired";
    }

    if (card.status === "revealed") {
      revealedCards.push(card);
    } else if (card.status === "available") {
      availableCards.push(card);
    } else {
      expiredCards.push(card);
    }
  });

  return {
    availableCards,
    revealedCards,
    expiredCards,
    totalAvailableCount: availableCards.length,
    totalRevealedCount: revealedCards.length,
  };
}

/**
 * Reveal a scratch card strictly inside Supabase via `reveal_scratch_card` RPC
 */
export async function revealScratchCard(
  userId: string,
  cardId: string
): Promise<{ success: boolean; card?: UserScratchCard; error?: string }> {
  if (!userId || !cardId) {
    return { success: false, error: "Missing parameters" };
  }

  if (!isWebSupabaseConfigured()) {
    return { success: false, error: "Service unavailable" };
  }

  try {
    // Call Supabase RPC
    const { data, error } = await supabase.rpc("reveal_scratch_card", {
      p_card_id: cardId,
    });

    if (!error && data && data.success) {
      // Update local read-only mirror
      const localCards = await getLocalCachedCards(userId);
      const idx = localCards.findIndex((c) => c.id === cardId);
      if (idx >= 0) {
        localCards[idx].status = "revealed";
        localCards[idx].revealedAt = new Date().toISOString();
        await saveLocalCachedCards(userId, localCards);
      }
      return { success: true };
    }

    if (error) {
      return { success: false, error: error.message };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to reveal card" };
  }

  return { success: false, error: "Unable to reveal card" };
}

/**
 * Log non-sensitive reward interaction events (copy_code, open_offer, etc.) to Supabase
 */
export async function logRewardEvent(
  userId: string,
  cardId: string | null,
  eventType: RewardEventType,
  metadata: Record<string, any> = {}
): Promise<void> {
  if (!userId) return;

  if (isWebSupabaseConfigured()) {
    try {
      await supabase.from("reward_events").insert({
        user_id: userId,
        scratch_card_id: cardId || null,
        event_type: eventType,
        metadata,
        created_at: new Date().toISOString(),
      });
    } catch {}
  }

  // Local event log mirror
  try {
    const raw = await AsyncStorage.getItem(`${LOCAL_EVENTS_PREFIX}${userId}`);
    const events = raw ? JSON.parse(raw) : [];
    events.unshift({
      id: `ev-${Date.now()}`,
      userId,
      scratchCardId: cardId,
      eventType,
      metadata,
      createdAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem(`${LOCAL_EVENTS_PREFIX}${userId}`, JSON.stringify(events.slice(0, 100)));
  } catch {}
}
