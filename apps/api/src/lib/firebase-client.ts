import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./firebase-admin";
import { cacheGet, cacheSet, cacheDelete } from "./route-cache";
import { isLimitExceeded } from "./qr-limits";

const CACHE_TTL_MS = 30_000;
export const CAUTION_WINDOW_MS = 24 * 60 * 60 * 1000;

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
  design: Record<string, any>;
}

async function fetchDocument<T>(collection: string, id: string): Promise<T | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snapshot = await db.collection(collection).doc(id).get();
  return snapshot.exists ? snapshot.data() as T : null;
}

export async function fetchGuardLink(id: string): Promise<GuardLinkFields | null> {
  const key = `sc-guard:${id}`;
  const hit = cacheGet<{ data: GuardLinkFields | null }>(key);
  if (hit !== null) return hit.data;
  const data = await fetchDocument<any>("guardLinks", id);
  const link = data ? {
    currentDestination: data.currentDestination ?? data.current_destination ?? null,
    previousDestination: data.previousDestination ?? data.previous_destination ?? null,
    businessName: data.businessName ?? data.business_name ?? null,
    ownerName: data.ownerName ?? data.owner_name ?? "Business",
    isActive: data.isActive !== false && data.is_active !== false,
    destinationChangedAt: data.destinationChangedAt ?? data.destination_changed_at ?? null,
    scanLimit: data.scanLimit ?? data.scan_limit ?? null,
    scanCount: data.scanCount ?? data.scan_count ?? 0,
    expiryDate: data.expiryDate ?? data.expiry_date ?? null,
  } : null;
  cacheSet(key, { data: link }, CACHE_TTL_MS);
  return link;
}

export async function fetchStandardLink(id: string): Promise<StandardLinkFields | null> {
  const key = `sc-std:${id}`;
  const hit = cacheGet<{ data: StandardLinkFields | null }>(key);
  if (hit !== null) return hit.data;
  const data = await fetchDocument<any>("standardLinks", id);
  const link = data ? {
    rawContent: data.rawContent ?? data.raw_content ?? "",
    contentType: data.contentType ?? data.content_type ?? "text",
    ownerName: data.ownerName ?? data.owner_name ?? "BinRo User",
    isActive: data.isActive !== false && data.is_active !== false,
    scanLimit: data.scanLimit ?? data.scan_limit ?? null,
    scanCount: data.scanCount ?? data.scan_count ?? 0,
    expiryDate: data.expiryDate ?? data.expiry_date ?? null,
  } : null;
  cacheSet(key, { data: link }, CACHE_TTL_MS);
  return link;
}

export async function fetchUnifiedQr(id: string): Promise<UnifiedQrFields | null> {
  const key = `sc-unified:${id}`;
  const hit = cacheGet<{ data: UnifiedQrFields | null }>(key);
  if (hit !== null) return hit.data;
  const data = await fetchDocument<any>("qrs", id);
  const design = data?.design ?? {};
  const link = data ? {
    ownerId: data.ownerId ?? data.owner_id ?? "",
    ownerName: data.ownerName ?? data.owner_name ?? "BinRo User",
    qrType: data.qrType ?? data.qr_type ?? "individual",
    template: data.template ?? null,
    title: data.title ?? null,
    isDynamic: data.isDynamic ?? data.is_dynamic ?? false,
    destination: data.destination ?? "",
    rawDestination: data.rawDestination ?? data.raw_destination ?? data.destination ?? "",
    contentType: data.contentType ?? data.content_type ?? "text",
    businessName: data.businessName ?? data.business_name ?? null,
    status: data.status ?? "active",
    scanCount: data.scanCount ?? data.scan_count ?? 0,
    scanLimit: data.scanLimit ?? data.scan_limit ?? null,
    expiryDate: data.expiryDate ?? data.expiry_date ?? null,
    design,
  } : null;
  cacheSet(key, { data: link }, CACHE_TTL_MS);
  return link;
}

export function bustUnifiedCache(id: string) {
  cacheDelete(`sc-unified:${id}`);
}

async function incrementAndCheck(collection: string, id: string, scanLimit: number | null, statusField?: string) {
  const db = getAdminDb();
  if (!db) return;
  const ref = db.collection(collection).doc(id);
  await ref.update({ scanCount: FieldValue.increment(1), scan_count: FieldValue.increment(1) });
  if (scanLimit !== null && scanLimit > 0) {
    const snapshot = await ref.get();
    const count = (snapshot.data()?.scanCount ?? snapshot.data()?.scan_count ?? 0) as number;
    if (isLimitExceeded(null, scanLimit, count)) {
      await ref.update(statusField ? { [statusField]: "limit_reached" } : { isActive: false, is_active: false });
      cacheDelete(`sc-${collection === "qrs" ? "unified" : collection === "guardLinks" ? "guard" : "std"}:${id}`);
    }
  }
}

export function recordScanAndEnforce(table: "standard_links" | "guard_links" | "standardLinks" | "guardLinks", id: string, limit: number | null) {
  return incrementAndCheck(table === "guard_links" || table === "guardLinks" ? "guardLinks" : "standardLinks", id, limit);
}

export function recordUnifiedScan(id: string, limit: number | null) {
  return incrementAndCheck("qrs", id, limit, "status");
}

export function isSafeRedirectDestination(destination: string) {
  try {
    const url = new URL(destination.startsWith("http") ? destination : `https://${destination}`);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}