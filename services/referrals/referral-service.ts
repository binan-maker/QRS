import { supabase, isWebSupabaseConfigured } from "@/lib/core/supabase";
import { universalAsyncStorage as AsyncStorage } from "../../shared/utils/universal-storage";
import type { ReferralRecord, RewardWallet, UserReferralsDashboard } from "./types";

const LOCAL_REFERRALS_PREFIX = "binro_referrals_v1_";
const PENDING_REFERRAL_CODE_KEY = "binro_pending_referral_code_v1";

const REF_CODE_LETTERS = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const REF_CODE_DIGITS = "23456789";
const REF_CODE_CHARS = REF_CODE_LETTERS + REF_CODE_DIGITS;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/**
 * Generates an immutable, unique 7-character mix of letters and numbers (e.g. yn5i82v).
 */
export function generate7CharReferralCode(): string {
  for (let attempt = 0; attempt < 30; attempt++) {
    let result = "";
    for (let i = 0; i < 7; i++) {
      result += REF_CODE_CHARS.charAt(Math.floor(Math.random() * REF_CODE_CHARS.length));
    }
    if (/[a-zA-Z]/.test(result) && /[0-9]/.test(result)) {
      return result;
    }
  }
  return "yn5i82v";
}

/**
 * Retrieves the user's permanent 7-character referral code or generates one.
 */
export async function getOrCreateUserReferralCode(userId: string): Promise<string> {
  if (!userId) return "krzryn4";
  const localKey = `binro_user_ref_code_v1_${userId}`;

  // 1. Check Supabase first
  if (isWebSupabaseConfigured()) {
    try {
      const userRow = await withTimeout(
        (async () => {
          const { data } = await supabase
            .from("users")
            .select("referral_code")
            .eq("id", userId)
            .maybeSingle();
          return data;
        })(),
        2500,
        null
      );

      if (userRow?.referral_code && String(userRow.referral_code).trim().length > 0) {
        const code = String(userRow.referral_code).trim().toLowerCase();
        await AsyncStorage.setItem(localKey, code).catch(() => {});
        return code;
      }
    } catch {}
  }

  // 2. Check local storage
  try {
    const cached = await AsyncStorage.getItem(localKey);
    if (cached && cached.trim().length > 0) {
      const cleanCached = cached.trim().toLowerCase();
      if (isWebSupabaseConfigured()) {
        try {
          await supabase
            .from("users")
            .update({ referral_code: cleanCached })
            .eq("id", userId)
            .is("referral_code", null);
        } catch {}
      }
      return cleanCached;
    }
  } catch {}

  // 3. Generate new code and lock in Supabase
  let candidate = generate7CharReferralCode();
  if (isWebSupabaseConfigured()) {
    try {
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("referral_code", candidate)
        .maybeSingle();
      if (existing) {
        candidate = generate7CharReferralCode();
      }
      await supabase
        .from("users")
        .update({ referral_code: candidate })
        .eq("id", userId);
    } catch {}
  }

  await AsyncStorage.setItem(localKey, candidate).catch(() => {});
  return candidate;
}

/**
 * Validates a candidate referral code format and checks existence in Supabase.
 */
export async function verifyReferralCode(
  rawCode: string,
  currentUserId?: string | null
): Promise<{ valid: boolean; code?: string; error?: string }> {
  const clean = (rawCode || "").trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, "").slice(0, 7);

  if (clean.length !== 7) {
    return { valid: false, error: "Referral code must be 7 characters." };
  }

  if (isWebSupabaseConfigured()) {
    try {
      const { data: owner } = await supabase
        .from("users")
        .select("id, referral_code")
        .ilike("referral_code", clean)
        .maybeSingle();

      if (!owner) {
        return { valid: false, error: "This referral code does not exist." };
      }

      if (currentUserId && owner.id === currentUserId) {
        return { valid: false, error: "You cannot use your own referral code." };
      }

      return { valid: true, code: clean };
    } catch {
      return { valid: true, code: clean };
    }
  }

  return { valid: true, code: clean };
}

export async function savePendingReferralCode(code: string): Promise<void> {
  const clean = (code || "").trim().toLowerCase().slice(0, 7);
  if (!clean) return;
  try {
    await AsyncStorage.setItem(PENDING_REFERRAL_CODE_KEY, clean);
    await AsyncStorage.setItem("binro_pending_referral_code", clean);
  } catch {}
}

export async function getPendingReferralCode(): Promise<string | null> {
  try {
    const code =
      (await AsyncStorage.getItem(PENDING_REFERRAL_CODE_KEY)) ||
      (await AsyncStorage.getItem("binro_pending_referral_code"));
    return code ? code.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

export async function clearPendingReferralCode(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_REFERRAL_CODE_KEY);
    await AsyncStorage.removeItem("binro_pending_referral_code");
  } catch {}
}

/**
 * Applies a referral code to a user account.
 */
export async function applyReferralCodeForUser(
  userId: string,
  rawCode: string
): Promise<{ ok: boolean; message: string }> {
  if (!userId) return { ok: false, message: "Sign in required." };
  const clean = (rawCode || "").trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, "").slice(0, 7);

  if (clean.length !== 7) {
    return { ok: false, message: "Referral code must be 7 characters." };
  }

  if (isWebSupabaseConfigured()) {
    try {
      // 1. Verify code owner
      const { data: referrer } = await supabase
        .from("users")
        .select("id, referral_code")
        .ilike("referral_code", clean)
        .maybeSingle();

      if (!referrer) {
        return { ok: false, message: "Invalid referral code." };
      }

      if (referrer.id === userId) {
        return { ok: false, message: "You cannot claim your own code." };
      }

      // 2. Check if current user already used a referral code
      const { data: currentUser } = await supabase
        .from("users")
        .select("referred_by_code, referred_by_user_id")
        .eq("id", userId)
        .maybeSingle();

      if (currentUser?.referred_by_code || currentUser?.referred_by_user_id) {
        return { ok: false, message: "You have already claimed a referral code." };
      }

      // 3. Update user record
      await supabase
        .from("users")
        .update({
          referred_by_code: clean,
          referred_by_user_id: referrer.id,
        })
        .eq("id", userId);

      // 4. Create referral link record
      await supabase.from("referrals").upsert({
        referrer_user_id: referrer.id,
        referrer_code: clean,
        invited_user_id: userId,
        status: "qualified",
        created_at: new Date().toISOString(),
      }, { onConflict: "invited_user_id" });

      await clearPendingReferralCode();
      return { ok: true, message: "Referral code applied successfully!" };
    } catch (err: any) {
      return { ok: false, message: err?.message || "Could not apply referral code." };
    }
  }

  await clearPendingReferralCode();
  return { ok: true, message: "Referral code applied!" };
}

/**
 * Builds user's referrals dashboard.
 */
export async function getUserReferralsDashboard(userId: string): Promise<UserReferralsDashboard> {
  const code = await getOrCreateUserReferralCode(userId);
  const baseUrl = "https://www.binro.in/register?ref=";

  let totalInvited = 0;
  let totalQualified = 0;
  let referrals: ReferralRecord[] = [];

  if (isWebSupabaseConfigured()) {
    try {
      const { data: rows } = await supabase
        .from("referrals")
        .select("id, referrer_user_id, referrer_code, invited_user_id, status, created_at, users:invited_user_id(username, display_name, photo_url)")
        .eq("referrer_user_id", userId)
        .order("created_at", { ascending: false });

      if (rows && rows.length > 0) {
        totalInvited = rows.length;
        referrals = rows.map((r: any) => {
          const u = r.users || {};
          if (r.status === "qualified") totalQualified++;
          return {
            id: r.id,
            referrerUserId: r.referrer_user_id,
            referrerCode: r.referrer_code,
            invitedUserId: r.invited_user_id,
            invitedUserUsername: u.username,
            invitedUserDisplayName: u.display_name,
            invitedUserPhotoUrl: u.photo_url,
            status: r.status || "qualified",
            createdAt: r.created_at,
          };
        });
      }
    } catch {}
  }

  return {
    referralCode: code,
    referralLink: `${baseUrl}${code}`,
    shortLink: `${baseUrl}${code}`,
    totalInvited,
    totalQualified,
    totalPending: Math.max(0, totalInvited - totalQualified),
    referrals,
  };
}

/**
 * Returns wallet status for referral eligibility.
 */
export async function getUserRewardWallet(userId: string): Promise<RewardWallet> {
  if (!userId) {
    return {
      userId: "",
      referralCount: 0,
      dailyEligibleScans: 0,
      lifetimeEligibleScans: 0,
    };
  }

  let referredByCode: string | null = null;
  let referredByUserId: string | null = null;
  let scanCount = 0;
  const ownReferralCode = await getOrCreateUserReferralCode(userId);

  if (isWebSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from("users")
        .select("referred_by_code, referred_by_user_id, scan_count")
        .eq("id", userId)
        .maybeSingle();

      if (data) {
        referredByCode = data.referred_by_code || null;
        referredByUserId = data.referred_by_user_id || null;
        scanCount = data.scan_count || 0;
      }
    } catch {}
  }

  return {
    userId,
    ownReferralCode,
    referredByCode,
    referredByUserId,
    dailyEligibleScans: scanCount,
    lifetimeEligibleScans: scanCount,
    referralCount: 0,
    isReferralEligible: !referredByCode && !referredByUserId,
  };
}

/**
 * Constructs a shareable referral message.
 */
export function buildReferralShareMessage(referralCode: string): string {
  const code = (referralCode || "krzryn4").toUpperCase();
  return `Scan QR codes safely with BinRo — inspect hidden links, verify payment details, and check trust scores before opening!\n\nUse my code ${code} to join: https://www.binro.in/register?ref=${code.toLowerCase()}`;
}
