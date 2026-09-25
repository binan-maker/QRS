import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const ANDROID_APP_URL =
  "https://play.google.com/store/apps/details?id=com.qrguard.app";

export type PublicTrust = {
  score: number;
  label: string;
  totalReports: number;
};

export type PublicQrRecord = {
  id: string;
  content: string;
  contentType: string;
  createdAt: string | null;
  scanCount: number;
  commentCount: number;
  businessName: string | null;
  displayDestination: string | null;
  isActive: boolean;
  deactivationMessage: string | null;
  trust: PublicTrust;
};

export function getQrIdForContent(content: string) {
  return createHash("sha256").update(content).digest("hex").slice(0, 20);
}

let client: SupabaseClient | null = null;

function getPublicSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Web Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function publicTrust(data: Record<string, any>): PublicTrust {
  const nested = data.public_trust ?? data.publicTrust ?? {};
  const score = asNumber(
    nested.score ?? data.trust_score ?? data.trustScore,
    -1,
  );
  return {
    score: score >= 0 ? Math.round(Math.min(100, score)) : -1,
    label: asString(nested.label ?? data.trust_label ?? data.trustLabel) ??
      (score >= 0 ? "Rated" : "Unrated"),
    totalReports: asNumber(
      nested.total_reports ?? nested.totalReports ?? data.total_reports ?? data.totalReports,
    ),
  };
}

function toPublicQrRecord(id: string, data: Record<string, any>): PublicQrRecord | null {
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
    commentCount: asNumber(data.comment_count ?? data.commentCount),
    businessName: asString(data.business_name ?? data.businessName),
    displayDestination: asString(
      data.display_destination ?? data.displayDestination ?? data.destination,
    ),
    isActive: data.is_active !== false && data.isActive !== false && data.status !== "inactive",
    deactivationMessage: asString(
      data.deactivation_message ?? data.deactivationMessage,
    ),
    trust: publicTrust(data),
  };
}

export async function getPublicQrRecord(qrId: string): Promise<PublicQrRecord | null> {
  const supabase = getPublicSupabase();
  const unified = await supabase
    .from("unified_qrs")
    .select("*")
    .eq("id", qrId)
    .maybeSingle();
  if (unified.error && unified.error.code !== "PGRST116") throw unified.error;
  if (unified.data) return toPublicQrRecord(qrId, unified.data as Record<string, any>);

  const legacy = await supabase
    .from("qr_codes")
    .select("*")
    .eq("id", qrId)
    .maybeSingle();
  if (legacy.error && legacy.error.code !== "PGRST116") throw legacy.error;
  return legacy.data
    ? toPublicQrRecord(qrId, legacy.data as Record<string, any>)
    : null;
}