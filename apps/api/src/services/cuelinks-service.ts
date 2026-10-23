/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CUELINKS V3 API INTEGRATION SERVICE
 * ───────────────────────────────────────────────────────────────────────────────
 * Synchronizes verified merchant coupons and promo codes from Cuelinks V3
 * directly into BinRo's Supabase `public.reward_offers` table.
 *
 * Official Cuelinks V3 Endpoint:
 *   GET https://developers.cuelinks.com/pub_api/v3/offers
 *
 * Header:
 *   Authorization: Token YOUR_CUELINKS_API_KEY
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { getSupabaseAdmin } from "@/lib/core/supabase";

export interface CuelinksRawOffer {
  id: number | string;
  title: string;
  description?: string | null;
  coupon_code?: string | null;
  code?: string | null;
  url?: string | null;
  tracking_url?: string | null;
  image_url?: string | null;
  terms?: string | null;
  terms_and_conditions?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  campaign?: {
    id?: number | string;
    name?: string;
    image_url?: string | null;
    status?: string | null;
  };
  campaign_name?: string;
  store_name?: string;
}

export interface CuelinksSyncResult {
  success: boolean;
  syncedAt: string;
  totalFetched: number;
  newOffers: number;
  updatedOffers: number;
  deactivatedCount: number;
  error?: string;
}

const DEFAULT_CUELINKS_API_URL = "https://developers.cuelinks.com/pub_api/v3/offers";

export function isCuelinksConfigured(): boolean {
  return Boolean(process.env.CUELINKS_API_KEY && process.env.CUELINKS_API_KEY.trim().length > 0);
}

/**
 * Normalizes Cuelinks API payload item into BinRo `reward_offers` schema format.
 */
function normalizeCuelinksOffer(item: CuelinksRawOffer) {
  const sourceOfferId = String(item.id).trim();
  const title = (item.title || "Exclusive Merchant Offer").trim();
  const merchantName = (
    item.campaign?.name ||
    item.campaign_name ||
    item.store_name ||
    "Verified Merchant"
  ).trim();

  const description = (item.description || item.title || "Special discount voucher").trim();
  const couponCode = (item.coupon_code || item.code || "").trim() || null;
  const trackedUrl = (item.tracking_url || item.url || "").trim() || null;
  const imageUrl = (item.image_url || item.campaign?.image_url || "").trim() || null;
  const terms = (
    item.terms ||
    item.terms_and_conditions ||
    "Standard merchant terms and conditions apply. One redemption per user."
  ).trim();

  let expiresAt: string | null = null;
  if (item.end_date) {
    try {
      const d = new Date(item.end_date);
      if (!isNaN(d.getTime())) {
        expiresAt = d.toISOString();
      }
    } catch {}
  }

  let startsAt: string = new Date().toISOString();
  if (item.start_date) {
    try {
      const d = new Date(item.start_date);
      if (!isNaN(d.getTime())) {
        startsAt = d.toISOString();
      }
    } catch {}
  }

  return {
    source_offer_id: sourceOfferId,
    title,
    merchant_name: merchantName,
    description,
    coupon_code: couponCode,
    tracked_url: trackedUrl,
    image_url: imageUrl,
    terms,
    starts_at: startsAt,
    expires_at: expiresAt,
    is_active: true,
    source_network: "cuelinks",
  };
}

/**
 * Fetch offers from Cuelinks V3 API with pagination.
 */
async function fetchCuelinksPages(apiKey: string, maxPages = 5): Promise<CuelinksRawOffer[]> {
  const allRawOffers: CuelinksRawOffer[] = [];
  const todayStr = new Date().toISOString().slice(0, 10);
  const baseUrl = process.env.CUELINKS_API_URL || DEFAULT_CUELINKS_API_URL;

  // Supports both standard authorization header styles
  const authHeader = apiKey.startsWith("Token ") ? apiKey : `Token ${apiKey}`;

  for (let page = 1; page <= maxPages; page++) {
    const url = new URL(baseUrl);
    url.searchParams.set("offer_type", "coupon");
    url.searchParams.set("valid_on", todayStr);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
          "User-Agent": "BinRo-Rewards-Sync/1.0",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Cuelinks] API error HTTP ${response.status} on page ${page}:`, errorText);
        if (page === 1) {
          throw new Error(`Cuelinks API returned ${response.status}: ${errorText.slice(0, 150)}`);
        }
        break;
      }

      const json = await response.json();
      // Handle both { offers: [...] } and direct array formats
      const offersList: CuelinksRawOffer[] = Array.isArray(json)
        ? json
        : Array.isArray(json.offers)
        ? json.offers
        : Array.isArray(json.data)
        ? json.data
        : [];

      if (offersList.length === 0) {
        break; // No more offers
      }

      allRawOffers.push(...offersList);

      // Stop if fewer than per_page items returned (last page reached)
      if (offersList.length < 100) {
        break;
      }
    } catch (err: any) {
      console.error(`[Cuelinks] Network fetch error on page ${page}:`, err);
      if (page === 1) throw err;
      break;
    }
  }

  return allRawOffers;
}

/**
 * Synchronizes Cuelinks V3 active coupon offers into Supabase `reward_offers`.
 *
 * Steps:
 * 1. Checks `process.env.CUELINKS_API_KEY`.
 * 2. Fetches live coupon offers from Cuelinks API.
 * 3. Normalizes and validates payload fields.
 * 4. Upserts into Supabase `public.reward_offers`.
 * 5. Deactivates stale/expired Cuelinks offers no longer in the active feed.
 */
export async function syncCuelinksOffers(): Promise<CuelinksSyncResult> {
  const syncedAt = new Date().toISOString();
  const apiKey = process.env.CUELINKS_API_KEY?.trim();

  if (!apiKey) {
    return {
      success: false,
      syncedAt,
      totalFetched: 0,
      newOffers: 0,
      updatedOffers: 0,
      deactivatedCount: 0,
      error: "CUELINKS_API_KEY environment variable is not configured",
    };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      success: false,
      syncedAt,
      totalFetched: 0,
      newOffers: 0,
      updatedOffers: 0,
      deactivatedCount: 0,
      error: "Supabase database client unavailable",
    };
  }

  try {
    // 1. Fetch raw offers from Cuelinks
    const rawOffers = await fetchCuelinksPages(apiKey, 5);

    // 2. Filter and normalize only offers with actual coupon codes and not expired
    const nowMs = Date.now();
    const normalizedOffers = rawOffers
      .map(normalizeCuelinksOffer)
      .filter((o) => {
        if (!o.source_offer_id) return false;
        if (!o.coupon_code) return false;
        if (o.expires_at && new Date(o.expires_at).getTime() < nowMs) return false;
        return true;
      });

    const activeOfferIds = new Set(normalizedOffers.map((o) => o.source_offer_id));

    // 3. Query existing Cuelinks offers in Supabase
    const { data: existingRows } = await supabase
      .from("reward_offers")
      .select("id, source_offer_id, is_active")
      .eq("source_network", "cuelinks");

    const existingMap = new Map<string, { id: string; is_active: boolean }>();
    (existingRows || []).forEach((r) => {
      if (r.source_offer_id) existingMap.set(r.source_offer_id, r);
    });

    let newOffers = 0;
    let updatedOffers = 0;

    // 4. Upsert each offer
    for (const offer of normalizedOffers) {
      const existing = existingMap.get(offer.source_offer_id);
      if (existing) {
        // Update existing offer
        const { error: updateErr } = await supabase
          .from("reward_offers")
          .update({
            title: offer.title,
            merchant_name: offer.merchant_name,
            description: offer.description,
            coupon_code: offer.coupon_code,
            tracked_url: offer.tracked_url,
            image_url: offer.image_url,
            terms: offer.terms,
            expires_at: offer.expires_at,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (!updateErr) updatedOffers++;
      } else {
        // Insert new offer
        const { error: insertErr } = await supabase.from("reward_offers").insert({
          title: offer.title,
          merchant_name: offer.merchant_name,
          description: offer.description,
          coupon_code: offer.coupon_code,
          tracked_url: offer.tracked_url,
          image_url: offer.image_url,
          terms: offer.terms,
          starts_at: offer.starts_at,
          expires_at: offer.expires_at,
          is_active: true,
          source_network: "cuelinks",
          source_offer_id: offer.source_offer_id,
          inventory_limit: 500, // Safe default inventory per offer
          inventory_used: 0,
        });

        if (!insertErr) newOffers++;
      }
    }

    // 5. Deactivate old Cuelinks offers not present in current live feed
    let deactivatedCount = 0;
    for (const [sourceId, existing] of existingMap.entries()) {
      if (!activeOfferIds.has(sourceId) && existing.is_active) {
        const { error: deactErr } = await supabase
          .from("reward_offers")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", existing.id);

        if (!deactErr) deactivatedCount++;
      }
    }

    console.log(
      `[Cuelinks] Sync completed: ${rawOffers.length} fetched, ${newOffers} new, ${updatedOffers} updated, ${deactivatedCount} deactivated.`
    );

    return {
      success: true,
      syncedAt,
      totalFetched: rawOffers.length,
      newOffers,
      updatedOffers,
      deactivatedCount,
    };
  } catch (err: any) {
    console.error("[Cuelinks] Sync failed:", err);
    return {
      success: false,
      syncedAt,
      totalFetched: 0,
      newOffers: 0,
      updatedOffers: 0,
      deactivatedCount: 0,
      error: err?.message || "Unknown synchronization error",
    };
  }
}

/**
 * Returns summary stats for Cuelinks integration in Supabase.
 */
export async function getCuelinksSyncStatus() {
  const isConfigured = isCuelinksConfigured();
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return {
      isConfigured,
      totalCuelinksOffers: 0,
      activeCuelinksOffers: 0,
      lastUpdated: null,
    };
  }

  try {
    const { data: offers } = await supabase
      .from("reward_offers")
      .select("id, is_active, updated_at")
      .eq("source_network", "cuelinks");

    const list = offers || [];
    const active = list.filter((o) => o.is_active).length;
    const latestDate = list.reduce((acc, curr) => {
      if (!curr.updated_at) return acc;
      return !acc || new Date(curr.updated_at) > new Date(acc) ? curr.updated_at : acc;
    }, null as string | null);

    return {
      isConfigured,
      totalCuelinksOffers: list.length,
      activeCuelinksOffers: active,
      lastUpdated: latestDate,
    };
  } catch {
    return {
      isConfigured,
      totalCuelinksOffers: 0,
      activeCuelinksOffers: 0,
      lastUpdated: null,
    };
  }
}
