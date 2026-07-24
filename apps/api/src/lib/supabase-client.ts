// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT — server-side data access for fast QR redirect lookups.
// ───────────────────────────────────────────────────────────────────────────────
// Replaces apps/api/src/lib/firebase-client.ts.
// Uses Supabase admin client (service role key) to bypass RLS.
// ═══════════════════════════════════════════════════════════════════════════════

import { getAdminSupabase } from "./supabase-admin";
import { cacheGet, cacheSet, cacheDelete } from "./route-cache";
import { isLimitExceeded } from "./qr-limits";

const CACHE_TTL_MS = 30_000;
export const CAUTION_WINDOW_MS = 24 * 60 * 60 * 1000;

// ── Cache helpers ──────────────────────────────────────────────────────────────

function fcGet<T>(key: string): { data: T | null } | null {
  return cacheGet<{ data: T | null }>(key);
}

function fcSet<T>(key: string, data: T | null): void {
  cacheSet<{ data: T | null }>(key, { data }, CACHE_TTL_MS);
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GuardLinkFields {
  currentDestination: string | null;
  previousDestination: string | null;
  businessName: string | null;
  ownerName: string;
  isActive: boolean;
  destinationChangedAt: string | null;
  scanLimit: number | null;
  scanCount: number;
  expiryDate: string | null;
}

export interface StandardLinkFields {
  rawContent: string;
  contentType: string;
  ownerName: string;
  isActive: boolean;
  scanLimit: number | null;
  scanCount: number;
  expiryDate: string | null;
}

export interface UnifiedQrFields {
  ownerId: string;
  ownerName: string;
  qrType: string;
  template: string | null;
  title: string | null;
  isDynamic: boolean;
  destination: string;
  rawDestination: string;
  contentType: string;
  businessName: string | null;
  status: string;
  scanCount: number;
  scanLimit: number | null;
  expiryDate: string | null;
  design: {
    fgColor: string;
    bgColor: string;
    logoPosition: string;
    logoUri: string | null;
    label: string | null;
  };
}

// ── fetchGuardLink ─────────────────────────────────────────────────────────────

export async function fetchGuardLink(uuid: string): Promise<GuardLinkFields | null> {
  const key = `sc-guard:${uuid}`;
  const hit = fcGet<GuardLinkFields>(key);
  if (hit !== null) return hit.data;

  const supabase = getAdminSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("guard_links")
      .select(
        "current_destination,previous_destination,business_name,owner_name,is_active,destination_changed_at,scan_limit,scan_count,expiry_date",
      )
      .eq("id", uuid)
      .maybeSingle();

    if (error || !data) { fcSet(key, null); return null; }

    const d = data as any;
    const link: GuardLinkFields = {
      currentDestination: d.current_destination ?? null,
      previousDestination: d.previous_destination ?? null,
      businessName: d.business_name ?? null,
      ownerName: d.owner_name ?? "Business",
      isActive: d.is_active !== false,
      destinationChangedAt: d.destination_changed_at ?? null,
      scanLimit: d.scan_limit ?? null,
      scanCount: d.scan_count ?? 0,
      expiryDate: d.expiry_date ?? null,
    };
    fcSet(key, link);
    return link;
  } catch {
    return null;
  }
}

// ── fetchStandardLink ──────────────────────────────────────────────────────────

export async function fetchStandardLink(uuid: string): Promise<StandardLinkFields | null> {
  const key = `sc-std:${uuid}`;
  const hit = fcGet<StandardLinkFields>(key);
  if (hit !== null) return hit.data;

  const supabase = getAdminSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("standard_links")
      .select("raw_content,content_type,owner_name,is_active,scan_limit,scan_count,expiry_date")
      .eq("id", uuid)
      .maybeSingle();

    if (error || !data) { fcSet(key, null); return null; }

    const d = data as any;
    const link: StandardLinkFields = {
      rawContent: d.raw_content ?? "",
      contentType: d.content_type ?? "text",
      ownerName: d.owner_name ?? "BinRo User",
      isActive: d.is_active !== false,
      scanLimit: d.scan_limit ?? null,
      scanCount: d.scan_count ?? 0,
      expiryDate: d.expiry_date ?? null,
    };
    fcSet(key, link);
    return link;
  } catch {
    return null;
  }
}

// ── fetchUnifiedQr ─────────────────────────────────────────────────────────────

export async function fetchUnifiedQr(id: string): Promise<UnifiedQrFields | null> {
  const key = `sc-unified:${id}`;
  const hit = fcGet<UnifiedQrFields>(key);
  if (hit !== null) return hit.data;

  const supabase = getAdminSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("unified_qrs")
      .select(
        "owner_id,owner_name,qr_type,template,title,is_dynamic,destination,raw_destination,content_type,business_name,status,scan_count,scan_limit,expiry_date,design",
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !data) { fcSet(key, null); return null; }

    const d = data as any;
    const design = (d.design as Record<string, any>) ?? {};
    const link: UnifiedQrFields = {
      ownerId: d.owner_id ?? "",
      ownerName: d.owner_name ?? "BinRo User",
      qrType: d.qr_type ?? "individual",
      template: d.template ?? null,
      title: d.title ?? null,
      isDynamic: d.is_dynamic === true,
      destination: d.destination ?? "",
      rawDestination: d.raw_destination ?? d.destination ?? "",
      contentType: d.content_type ?? "text",
      businessName: d.business_name ?? null,
      status: d.status ?? "active",
      scanCount: d.scan_count ?? 0,
      scanLimit: d.scan_limit ?? null,
      expiryDate: d.expiry_date ?? null,
      design: {
        fgColor: design.fgColor ?? design.fg_color ?? "#0A0E17",
        bgColor: design.bgColor ?? design.bg_color ?? "#F8FAFC",
        logoPosition: design.logoPosition ?? design.logo_position ?? "center",
        logoUri: design.logoUri ?? design.logo_uri ?? null,
        label: design.label ?? null,
      },
    };
    fcSet(key, link);
    return link;
  } catch {
    return null;
  }
}

export function bustUnifiedCache(id: string): void {
  cacheDelete(`sc-unified:${id}`);
}

// ── recordScanAndEnforce ───────────────────────────────────────────────────────

export async function recordScanAndEnforce(
  tableName: "standard_links" | "guard_links",
  uuid: string,
  scanLimit: number | null,
): Promise<void> {
  const supabase = getAdminSupabase();
  if (!supabase) return;

  try {
    // Atomic increment via RPC (falls back gracefully if not set up)
    const { error: rpcErr } = await supabase.rpc("increment_field", {
      p_table: tableName,
      p_id: uuid,
      p_field: "scan_count",
      p_delta: 1,
    });

    if (rpcErr) {
      // Fallback non-atomic increment
      const { data: cur } = await supabase
        .from(tableName).select("scan_count").eq("id", uuid).maybeSingle();
      const prev = ((cur as any)?.scan_count as number) ?? 0;
      await supabase.from(tableName).update({ scan_count: prev + 1 }).eq("id", uuid);
    }

    if (scanLimit !== null && scanLimit > 0) {
      const { data: fresh } = await supabase
        .from(tableName).select("scan_count").eq("id", uuid).maybeSingle();
      const freshCount = ((fresh as any)?.scan_count as number) ?? 0;
      if (isLimitExceeded(null, scanLimit, freshCount)) {
        await supabase
          .from(tableName)
          .update({ is_active: false })
          .eq("id", uuid);
        cacheDelete(`sc-guard:${uuid}`);
        cacheDelete(`sc-std:${uuid}`);
      }
    }
  } catch {
    // best-effort
  }
}

// ── recordUnifiedScan ─────────────────────────────────────────────────────────

export async function recordUnifiedScan(id: string, scanLimit: number | null): Promise<void> {
  const supabase = getAdminSupabase();
  if (!supabase) return;

  try {
    const { error: rpcErr } = await supabase.rpc("increment_field", {
      p_table: "unified_qrs",
      p_id: id,
      p_field: "scan_count",
      p_delta: 1,
    });

    if (rpcErr) {
      const { data: cur } = await supabase
        .from("unified_qrs").select("scan_count").eq("id", id).maybeSingle();
      const prev = ((cur as any)?.scan_count as number) ?? 0;
      await supabase.from("unified_qrs").update({ scan_count: prev + 1 }).eq("id", id);
    }

    if (scanLimit !== null && scanLimit > 0) {
      const { data: fresh } = await supabase
        .from("unified_qrs").select("scan_count").eq("id", id).maybeSingle();
      const freshCount = ((fresh as any)?.scan_count as number) ?? 0;
      if (isLimitExceeded(null, scanLimit, freshCount)) {
        await supabase.from("unified_qrs").update({ status: "limit_reached" }).eq("id", id);
        bustUnifiedCache(id);
      }
    }
  } catch {
    // best-effort
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export function isSafeRedirectDestination(destination: string): boolean {
  try {
    const url = new URL(destination.startsWith("http") ? destination : `https://${destination}`);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function wasChangedRecently(destinationChangedAt: string | null): boolean {
  if (!destinationChangedAt) return false;
  return Date.now() - new Date(destinationChangedAt).getTime() < CAUTION_WINDOW_MS;
}
