/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BINRO WEB: PUBLIC QR DATA & DATABASE ACCESS LAYER
 * ───────────────────────────────────────────────────────────────────────────────
 * Directly imports trust score and report aggregation services from the mobile
 * source (@services/trust/trust-service, @services/moderation/report-service,
 * @shared/utils/qr-content, @features/qr-detail/content-types).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  calculateTrustScore as calculateMobileTrustScore,
  type TrustScore,
} from "@services/trust/trust-service";
import {
  getMergedQrVotesSummary,
  seedQrReportCountsInMemory,
} from "@services/moderation/report-service";
import { detectContentType } from "@shared/utils/qr-content";
import { normalizeQrDetailContentType } from "@features/qr-detail/content-types";
import { isPaymentQr } from "@services/analysis";

export const ANDROID_APP_URL = "https://play.google.com/store/apps/details?id=com.qrguard.app";

export type PublicTrust = TrustScore;

export type PublicComment = {
  id: string;
  userId: string;
  userName: string;
  userUsername?: string;
  userPhotoURL?: string;
  parentId: string | null;
  text: string;
  likes: number;
  dislikes?: number;
  isEdited?: boolean;
  createdAt: string | null;
};

export type PublicQrRecord = {
  id: string;
  content: string;
  contentType: string;
  createdAt: string | null;
  scanCount: number;
  commentCount: number;
  displayDestination: string | null;
  trust: PublicTrust;
  reportCounts: Record<string, number>;
  weightedCounts: Record<string, number>;
  comments: PublicComment[];
};

/**
 * Computes deterministic 20-character hex ID matching mobile services/qr/qr-service.ts (getQrCodeId).
 */
export function getQrIdForContent(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 20);
}

let serverClient: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient | null {
  if (serverClient) return serverClient;
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key || url.includes("YOUR_PROJECT_REF") || key === "your_supabase_anon_key") {
    return null;
  }

  serverClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serverClient;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export { calculateMobileTrustScore as calculateTrustScore };

/**
 * Fetches public QR details, real community votes, trust score, and comments
 * using the mobile report-service and trust-service implementations.
 */
export async function getPublicQrRecord(
  qrId: string,
  fallbackContent?: string,
): Promise<PublicQrRecord | null> {
  const supabase = getServerSupabase();
  if (!supabase) {
    if (!fallbackContent) return null;
    const content = fallbackContent.trim();
    const contentType = isPaymentQr(content)
      ? "payment"
      : normalizeQrDetailContentType(detectContentType(content));
    return {
      id: qrId,
      content,
      contentType,
      createdAt: null,
      scanCount: 1,
      commentCount: 0,
      displayDestination: content,
      trust: { score: -1, label: "Unrated", totalReports: 0 },
      reportCounts: {},
      weightedCounts: {},
      comments: [],
    };
  }

  try {
    const [qrRes, commentsRes, voteSummaryRes] = await Promise.all([
      supabase.from("qr_codes").select("*").eq("id", qrId).maybeSingle(),
      supabase
        .from("qr_comments")
        .select("*")
        .eq("qr_code_id", qrId)
        .order("created_at", { ascending: false })
        .limit(150),
      getMergedQrVotesSummary(qrId, supabase),
    ]);

    const qrData = (qrRes.data ?? null) as Record<string, any> | null;
    const dbContent = asString(
      qrData?.content ??
        qrData?.raw_content ??
        qrData?.destination ??
        qrData?.raw_destination,
    );
    const fallback = asString(fallbackContent);

    const isCorruptedDb =
      !dbContent ||
      dbContent.trim().toLowerCase() === "tel:" ||
      /^(tel|sms|smsto|mailto):?$/i.test(dbContent.trim());
    const rawContent =
      isCorruptedDb && fallback && fallback.trim().length > 4
        ? fallback
        : dbContent || fallback;

    if (!rawContent && !qrData) return null;
    const content = rawContent || qrId;
    const rawType = asString(qrData?.content_type ?? qrData?.contentType);
    const detectedType = String(detectContentType(content));
    const isPayment = isPaymentQr(content) || rawType === "payment";
    const isPhone = !isPayment && (/^tel:/i.test(content) || /^\+?[\d\s\-().]{7,20}$/.test(content));
    const isEmail = !isPayment && /^mailto:/i.test(content);
    const isSms = !isPayment && /^smsto?:/i.test(content);
    const contentType = isPayment
      ? "payment"
      : isPhone
        ? "phone"
        : isEmail
          ? "email"
          : isSms
            ? "sms"
            : normalizeQrDetailContentType(rawType || detectedType);

    let reportCounts = voteSummaryRes.counts;
    let weightedCounts = voteSummaryRes.weighted;

    // If no votes found under qrId and content produces an alternate hash (e.g. trimmed vs raw), check that too
    if (Object.keys(reportCounts).length === 0 && content && content !== qrId) {
      const candidateIds = Array.from(
        new Set([
          getQrIdForContent(content),
          getQrIdForContent(content.trim()),
        ]),
      ).filter((cid) => cid !== qrId);

      for (const altId of candidateIds) {
        const altSummary = await getMergedQrVotesSummary(altId, supabase);
        if (Object.keys(altSummary.counts).length > 0) {
          reportCounts = altSummary.counts;
          weightedCounts = altSummary.weighted;
          break;
        }
      }
    }

    seedQrReportCountsInMemory(qrId, reportCounts, weightedCounts);

    const collusionFlags = qrData?.suspicious_vote_flag
      ? {
          suspicious: true,
          safeWeightMultiplier: Number(qrData?.suspicious_safe_multiplier ?? 1),
          negativeWeightMultiplier: Number(qrData?.suspicious_neg_multiplier ?? 1),
        }
      : undefined;

    const trust = calculateMobileTrustScore(reportCounts, weightedCounts, collusionFlags);

    const rawComments = Array.isArray(commentsRes.data)
      ? commentsRes.data.filter(
          (row: any) =>
            !row.is_deleted &&
            row.text !== "[deleted]" &&
            !String(row.text ?? "").startsWith("__qr_vote__:"),
        )
      : [];

    // Enrich comment authors from public_profiles / users
    const userIds = Array.from(
      new Set(rawComments.map((r: any) => String(r.user_id ?? "")).filter(Boolean)),
    );
    const profileMap = new Map<string, { username?: string; displayName?: string; photoURL?: string }>();
    if (userIds.length > 0) {
      const [pubProfiles, userRows] = await Promise.allSettled([
        supabase.from("public_profiles").select("id, username, display_name, photo_url").in("id", userIds),
        supabase.from("users").select("id, username, display_name, photo_url").in("id", userIds),
      ]);
      if (userRows.status === "fulfilled" && Array.isArray(userRows.value.data)) {
        for (const u of userRows.value.data as any[]) {
          if (u?.id) {
            profileMap.set(String(u.id), {
              username: asString(u.username) ?? undefined,
              displayName: asString(u.display_name) ?? undefined,
              photoURL: asString(u.photo_url) ?? undefined,
            });
          }
        }
      }
      if (pubProfiles.status === "fulfilled" && Array.isArray(pubProfiles.value.data)) {
        for (const p of pubProfiles.value.data as any[]) {
          if (p?.id) {
            const prev = profileMap.get(String(p.id));
            profileMap.set(String(p.id), {
              username: asString(p.username) ?? prev?.username,
              displayName: asString(p.display_name) ?? prev?.displayName,
              photoURL: asString(p.photo_url) ?? prev?.photoURL,
            });
          }
        }
      }
    }

    const comments: PublicComment[] = rawComments.map((row: any) => {
      const uid = String(row.user_id ?? "");
      const prof = profileMap.get(uid);
      const rawName = String(prof?.displayName || row.user_name || "User");
      const rawUsername = String(prof?.username || rawName).replace(/^@/, "");
      return {
        id: String(row.id),
        userId: uid,
        userName: rawName,
        userUsername: rawUsername,
        userPhotoURL: prof?.photoURL,
        parentId: row.parent_id ? String(row.parent_id) : null,
        text: String(row.text ?? ""),
        likes: Number(row.likes ?? 0),
        dislikes: 0,
        isEdited: Boolean(row.is_edited),
        createdAt: asString(row.created_at),
      };
    });

    return {
      id: qrId,
      content,
      contentType,
      createdAt: asString(qrData?.created_at ?? qrData?.createdAt),
      scanCount: Math.max(1, asNumber(qrData?.scan_count ?? qrData?.scanCount, 1)),
      commentCount: comments.length,
      displayDestination: asString(qrData?.display_destination ?? qrData?.displayDestination ?? content),
      trust,
      reportCounts,
      weightedCounts,
      comments,
    };
  } catch (error) {
    console.warn("[BinRo Web] Failed to fetch QR record:", error);
    return null;
  }
}
