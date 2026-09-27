/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BINRO WEB: PUBLIC QR DATA & DATABASE ACCESS LAYER
 * ───────────────────────────────────────────────────────────────────────────────
 * Queries canonical QR metadata, trust scores, and community notes from Supabase.
 * Connects directly to public.qr_codes and public.qr_comments.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isWebSupabaseConfigured } from "./supabase";

export const ANDROID_APP_URL = "https://play.google.com/store/apps/details?id=com.qrguard.app";

export type PublicTrust = {
  score: number;
  label: string;
  totalReports: number;
};

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
 * Computes deterministic 20-character hex ID for arbitrary text or URL content.
 */
export function getQrIdForContent(content: string): string {
  return createHash("sha256").update(content.trim()).digest("hex").slice(0, 20);
}

let publicClient: SupabaseClient | null = null;

function getPublicSupabase(): SupabaseClient | null {
  if (publicClient) return publicClient;
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey || url.includes("YOUR_PROJECT_REF") || anonKey === "your_supabase_anon_key") {
    return null;
  }

  publicClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return publicClient;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseTimeMs(val: any): number {
  if (!val) return 0;
  if (typeof val === "number") return val;
  const ms = new Date(val).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Exact mobile trust score algorithm from services/trust/trust-service.ts
 */
export function calculateTrustScore(
  reportCounts: Record<string, number>,
  weightedCounts?: Record<string, number>,
): PublicTrust {
  const rawSafe = reportCounts.safe || 0;
  const rawScam = reportCounts.scam || 0;
  const rawSpam = reportCounts.spam || 0;
  const rawFake = reportCounts.fake || 0;
  const rawTotal = rawSafe + rawScam + rawSpam + rawFake;

  if (rawTotal === 0) return { score: -1, label: "Unrated", totalReports: 0 };

  const useWeighted = Boolean(weightedCounts && Object.keys(weightedCounts).length > 0);
  const resolveWeight = (rawCount: number, weightedVal?: number): number => {
    if (rawCount <= 0) return 0;
    if (!useWeighted) return rawCount;
    return weightedVal && weightedVal > 0 ? weightedVal : rawCount;
  };

  let wSafe = resolveWeight(rawSafe, weightedCounts?.safe);
  let wScam = resolveWeight(rawScam, weightedCounts?.scam);
  let wSpam =
    resolveWeight(rawSpam, weightedCounts?.spam) +
    resolveWeight(rawFake, weightedCounts?.fake);

  const wNeg = wScam + wSpam;
  const wPos = wSafe;
  if (useWeighted && rawTotal < 15 && wNeg > wPos * 2) {
    const skepticism = 0.65;
    wScam *= skepticism;
    wSpam *= skepticism;
  }

  const wTotal = wSafe + wScam + wSpam;
  if (wTotal === 0) return { score: -1, label: "Unrated", totalReports: rawTotal };

  const safeRatio = wSafe / wTotal;
  const confidence = Math.min(rawTotal / 20, 1);
  const score = 50 + (safeRatio * 100 - 50) * confidence;

  let label = "Dangerous";
  if (score >= 75) label = "Trusted";
  else if (score >= 55) label = "Likely Safe";
  else if (score >= 40) label = "Uncertain";
  else if (score >= 25) label = "Suspicious";

  return {
    score: Math.round(score),
    label,
    totalReports: rawTotal,
  };
}

interface VoteEntry {
  userId: string;
  reportType: string | null;
  weight: number;
  userRemoved: boolean;
  timestampMs: number;
}

function summarizeReportSources(
  qrReportsRows: any[],
  auditRows: any[],
  rtdbRows: any[],
): {
  reportCounts: Record<string, number>;
  weightedCounts: Record<string, number>;
  trust: PublicTrust;
} {
  const byUser = new Map<string, VoteEntry>();

  for (const r of qrReportsRows) {
    const uid = r.user_id || r.userId;
    if (!uid) continue;
    const ts = Math.max(parseTimeMs(r.updated_at ?? r.updatedAt), parseTimeMs(r.created_at ?? r.createdAt), 1);
    const existing = byUser.get(uid);
    if (!existing || ts >= existing.timestampMs) {
      byUser.set(uid, {
        userId: uid,
        reportType: r.user_removed ? null : (r.report_type ?? null),
        weight: Number(r.weight || 1),
        userRemoved: Boolean(r.user_removed),
        timestampMs: ts,
      });
    }
  }

  for (const row of auditRows) {
    const uid = row.user_id;
    const action: string = row.action || "";
    if (!uid || !action.startsWith("vote:")) continue;
    const voteType = action.slice("vote:".length);
    const isRemoved = voteType === "removed" || !voteType;
    const ts = parseTimeMs(row.created_at) || 2;
    const existing = byUser.get(uid);
    if (!existing || ts >= existing.timestampMs) {
      byUser.set(uid, {
        userId: uid,
        reportType: isRemoved ? null : voteType,
        weight: Number(row.vote_weight || 1),
        userRemoved: isRemoved,
        timestampMs: ts,
      });
    }
  }

  for (const row of rtdbRows) {
    const val = row?.value;
    if (!val || typeof val !== "object") continue;
    const uid = val.userId || String(row.path || "").split(":")[2];
    if (!uid) continue;
    const ts = Number(val.timestampMs) || parseTimeMs(val.updatedAt) || parseTimeMs(row.updated_at) || 3;
    const existing = byUser.get(uid);
    if (!existing || ts >= existing.timestampMs) {
      byUser.set(uid, {
        userId: uid,
        reportType: val.userRemoved ? null : (val.reportType ?? null),
        weight: Number(val.weight || 1),
        userRemoved: Boolean(val.userRemoved),
        timestampMs: ts,
      });
    }
  }

  const reportCounts: Record<string, number> = {};
  const weightedCounts: Record<string, number> = {};

  for (const rec of byUser.values()) {
    if (rec.userRemoved || !rec.reportType) continue;
    reportCounts[rec.reportType] = (reportCounts[rec.reportType] || 0) + 1;
    weightedCounts[rec.reportType] = (weightedCounts[rec.reportType] || 0) + Number(rec.weight || 1);
  }

  const trust = calculateTrustScore(reportCounts, weightedCounts);
  return { reportCounts, weightedCounts, trust };
}

/**
 * Fetches public QR details, real community votes, and comments from Supabase.
 */
export async function getPublicQrRecord(qrId: string, fallbackContent?: string): Promise<PublicQrRecord | null> {
  const supabase = getPublicSupabase();
  if (!supabase) {
    if (!fallbackContent) return null;
    const content = fallbackContent.trim();
    const isUrl =
      /^https?:\/\//i.test(content) ||
      (/^[a-z0-9-]+(\.[a-z0-9-]+)+\/?/i.test(content) && !content.includes(" "));
    return {
      id: qrId,
      content,
      contentType: isUrl ? "url" : "text",
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
    const [qrRes, commentsRes, reportsRes, auditRes, rtdbRes] = await Promise.all([
      supabase.from("qr_codes").select("*").eq("id", qrId).maybeSingle(),
      supabase
        .from("qr_comments")
        .select("id, user_id, user_name, parent_id, text, likes, is_edited, is_deleted, created_at")
        .eq("qr_code_id", qrId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("qr_reports")
        .select("user_id, report_type, weight, user_removed, created_at, updated_at")
        .eq("qr_code_id", qrId)
        .limit(500),
      supabase
        .from("audit_logs")
        .select("user_id, action, vote_weight, created_at")
        .eq("qr_id", qrId)
        .like("action", "vote:%")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("rtdb_store")
        .select("path, value, updated_at")
        .like("path", `qr_vote:${qrId}:%`)
        .limit(500),
    ]);

    const qrData = (qrRes.data ?? null) as Record<string, any> | null;
    const rawContent = asString(
      qrData?.content ??
        qrData?.raw_content ??
        qrData?.destination ??
        qrData?.raw_destination ??
        fallbackContent,
    );

    if (!rawContent && !qrData) return null;
    const content = rawContent || qrId;
    const isUrl =
      /^https?:\/\//i.test(content) ||
      (/^[a-z0-9-]+(\.[a-z0-9-]+)+\/?/i.test(content) && !content.includes(" "));
    const rawType = asString(qrData?.content_type ?? qrData?.contentType);
    const contentType = rawType?.toLowerCase() === "url" || (!rawType && isUrl) ? "url" : (rawType ?? "text");

    const rawComments = Array.isArray(commentsRes.data)
      ? commentsRes.data.filter((row: any) => !row.is_deleted && row.text !== "[deleted]")
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

    const { reportCounts, weightedCounts, trust } = summarizeReportSources(
      Array.isArray(reportsRes.data) ? reportsRes.data : [],
      Array.isArray(auditRes.data) ? auditRes.data : [],
      Array.isArray(rtdbRes.data) ? rtdbRes.data : [],
    );

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
