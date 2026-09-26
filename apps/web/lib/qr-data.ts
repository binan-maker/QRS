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
  text: string;
  likes: number;
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

function parseTrust(data: Record<string, any>): PublicTrust {
  const nested = data.public_trust ?? data.publicTrust ?? {};
  const score = asNumber(
    nested.score ?? data.trust_score ?? data.trustScore,
    -1,
  );
  return {
    score: score >= 0 ? Math.round(Math.min(100, score)) : -1,
    label: asString(nested.label ?? data.trust_label ?? data.trustLabel) ?? (score >= 0 ? "Rated" : "Unrated"),
    totalReports: asNumber(
      nested.total_reports ?? nested.totalReports ?? data.total_reports ?? data.totalReports,
    ),
  };
}

function toPublicQrRecord(id: string, data: Record<string, any>, comments: PublicComment[] = []): PublicQrRecord | null {
  const content = asString(
    data.content ?? data.raw_content ?? data.destination ?? data.raw_destination,
  );
  if (!content) return null;

  return {
    id,
    content,
    contentType: asString(data.content_type ?? data.contentType) ?? "text",
    createdAt: asString(data.created_at ?? data.createdAt),
    scanCount: asNumber(data.scan_count ?? data.scanCount),
    commentCount: asNumber(data.comment_count ?? data.commentCount, comments.length),
    displayDestination: asString(
      data.display_destination ?? data.displayDestination ?? data.destination,
    ),
    trust: parseTrust(data),
    comments,
  };
}

/**
 * Fetches public QR details and associated community comments from Supabase.
 * Returns null if Supabase is offline or the record does not exist yet.
 */
export async function getPublicQrRecord(qrId: string): Promise<PublicQrRecord | null> {
  const supabase = getPublicSupabase();
  if (!supabase) return null;

  try {
    // 1. Fetch QR record
    const { data: qrData, error: qrError } = await supabase
      .from("qr_codes")
      .select("*")
      .eq("id", qrId)
      .maybeSingle();

    if (qrError && qrError.code !== "PGRST116") {
      console.warn("[BinRo Web] Supabase QR query error:", qrError.message);
    }

    if (!qrData) return null;

    // 2. Fetch public community comments
    let comments: PublicComment[] = [];
    try {
      const { data: commentRows } = await supabase
        .from("qr_comments")
        .select("id, user_id, user_name, text, likes, created_at")
        .eq("qr_code_id", qrId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (commentRows && Array.isArray(commentRows)) {
        comments = commentRows.map((row: any) => ({
          id: String(row.id),
          userId: String(row.user_id ?? ""),
          userName: String(row.user_name ?? "Community member"),
          text: String(row.text ?? ""),
          likes: Number(row.likes ?? 0),
          createdAt: asString(row.created_at),
        }));
      }
    } catch (commentsErr) {
      console.warn("[BinRo Web] Could not load comments:", commentsErr);
    }

    return toPublicQrRecord(qrId, qrData as Record<string, any>, comments);
  } catch (error) {
    console.warn("[BinRo Web] Failed to fetch QR record:", error);
    return null;
  }
}
