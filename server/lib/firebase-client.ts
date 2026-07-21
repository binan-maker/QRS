import { cacheGet, cacheSet, cacheDelete } from "./route-cache";
import { isLimitExceeded } from "./qr-limits";

const FIREBASE_PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "";
const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || "";
const CACHE_TTL_MS = 30_000;
const CAUTION_WINDOW_MS = 24 * 60 * 60 * 1000;

export { CAUTION_WINDOW_MS };

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

// ── Cache helpers ──────────────────────────────────────────────────────────────
// We wrap stored values in `{ data }` so null results (404, parse error) are
// cached as `{ data: null }` and are distinguishable from a cache miss
// (cacheGet returns null on miss).

function fcGet<T>(key: string): { data: T | null } | null {
  return cacheGet<{ data: T | null }>(key);
}

function fcSet<T>(key: string, data: T | null): void {
  cacheSet<{ data: T | null }>(key, { data }, CACHE_TTL_MS);
}

// ── Firestore helpers ─────────────────────────────────────────────────────────

function firestoreUrl(collection: string, docId: string): string {
  return `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}/${encodeURIComponent(docId)}?key=${FIREBASE_API_KEY}`;
}

function parseIntField(f: any): number | null {
  if (!f) return null;
  if (f.integerValue !== undefined) return parseInt(f.integerValue, 10);
  if (f.doubleValue !== undefined) return Math.floor(f.doubleValue);
  return null;
}

// ── fetchGuardLink ─────────────────────────────────────────────────────────────

export async function fetchGuardLink(uuid: string): Promise<GuardLinkFields | null> {
  const key = `fc-guard:${uuid}`;
  const hit = fcGet<GuardLinkFields>(key);
  if (hit !== null) return hit.data;

  try {
    const res = await fetch(firestoreUrl("guardLinks", uuid), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) { fcSet(key, null); return null; }
    const data = await res.json() as any;
    const f = data?.fields;
    if (!f) { fcSet(key, null); return null; }
    const link: GuardLinkFields = {
      currentDestination: f.currentDestination?.stringValue || null,
      previousDestination: f.previousDestination?.stringValue || null,
      businessName: f.businessName?.stringValue || null,
      ownerName: f.ownerName?.stringValue || "Business",
      isActive: f.isActive?.booleanValue !== false,
      destinationChangedAt: f.destinationChangedAt?.timestampValue || null,
      scanLimit: parseIntField(f.scanLimit),
      scanCount: parseIntField(f.scanCount) ?? 0,
      expiryDate: f.expiryDate?.stringValue || null,
    };
    fcSet(key, link);
    return link;
  } catch {
    return null;
  }
}

// ── fetchStandardLink ──────────────────────────────────────────────────────────

export async function fetchStandardLink(uuid: string): Promise<StandardLinkFields | null> {
  const key = `fc-std:${uuid}`;
  const hit = fcGet<StandardLinkFields>(key);
  if (hit !== null) return hit.data;

  try {
    const res = await fetch(firestoreUrl("standardLinks", uuid), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) { fcSet(key, null); return null; }
    const data = await res.json() as any;
    const f = data?.fields;
    if (!f) { fcSet(key, null); return null; }
    const link: StandardLinkFields = {
      rawContent: f.rawContent?.stringValue || "",
      contentType: f.contentType?.stringValue || "text",
      ownerName: f.ownerName?.stringValue || "BinRo User",
      isActive: f.isActive?.booleanValue !== false,
      scanLimit: parseIntField(f.scanLimit),
      scanCount: parseIntField(f.scanCount) ?? 0,
      expiryDate: f.expiryDate?.stringValue || null,
    };
    fcSet(key, link);
    return link;
  } catch {
    return null;
  }
}

// ── recordScanAndEnforce ───────────────────────────────────────────────────────
// Atomically increment scanCount and auto-deactivate if scan limit is hit.
// collection is either "standardLinks" or "guardLinks".

export async function recordScanAndEnforce(
  collection: "standardLinks" | "guardLinks",
  uuid: string,
  scanLimit: number | null
): Promise<void> {
  if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) return;
  try {
    const commitUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:commit?key=${FIREBASE_API_KEY}`;
    const docPath = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}/${encodeURIComponent(uuid)}`;

    // Increment scanCount atomically
    await fetch(commitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        writes: [{
          transform: {
            document: docPath,
            fieldTransforms: [{
              fieldPath: "scanCount",
              increment: { integerValue: "1" },
            }],
          },
        }],
      }),
    });

    // If a limit is set, re-fetch to check if we've crossed it
    if (scanLimit !== null && scanLimit > 0) {
      const freshRes = await fetch(firestoreUrl(collection, uuid), { signal: AbortSignal.timeout(8000) });
      if (!freshRes.ok) return;
      const freshData = await freshRes.json() as any;
      const freshCount = parseIntField(freshData?.fields?.scanCount) ?? 0;
      if (isLimitExceeded(null, scanLimit, freshCount)) {
        await fetch(commitUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            writes: [{
              update: { name: docPath, fields: { isActive: { booleanValue: false } } },
              updateMask: { fieldPaths: ["isActive"] },
            }],
          }),
        });
        // Bust cache so the next scan sees isActive: false immediately
        cacheDelete(`fc-guard:${uuid}`);
        cacheDelete(`fc-std:${uuid}`);
      }
    }
  } catch {
    // Non-fatal — scan counting is best-effort
  }
}

// ── Unified QR model (/q/:id) ─────────────────────────────────────────────────

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

function parseStringField(f: any): string | null {
  if (!f) return null;
  return f.stringValue ?? null;
}

function parseBoolField(f: any, defaultVal = true): boolean {
  if (!f) return defaultVal;
  if (f.booleanValue !== undefined) return f.booleanValue;
  return defaultVal;
}

function parseMapField(f: any): Record<string, any> | null {
  if (!f?.mapValue?.fields) return null;
  return f.mapValue.fields;
}

export async function fetchUnifiedQr(id: string): Promise<UnifiedQrFields | null> {
  const key = `fc-unified:${id}`;
  const hit = fcGet<UnifiedQrFields>(key);
  if (hit !== null) return hit.data;

  try {
    const res = await fetch(firestoreUrl("qrs", id), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) { fcSet(key, null); return null; }
    const raw = await res.json() as any;
    const f = raw?.fields;
    if (!f) { fcSet(key, null); return null; }

    const designFields = parseMapField(f.design);
    const link: UnifiedQrFields = {
      ownerId: parseStringField(f.ownerId) ?? "",
      ownerName: parseStringField(f.ownerName) ?? "BinRo User",
      qrType: parseStringField(f.qrType) ?? "individual",
      template: parseStringField(f.template),
      title: parseStringField(f.title),
      isDynamic: parseBoolField(f.isDynamic, false),
      destination: parseStringField(f.destination) ?? "",
      rawDestination: parseStringField(f.rawDestination) ?? parseStringField(f.destination) ?? "",
      contentType: parseStringField(f.contentType) ?? "text",
      businessName: parseStringField(f.businessName),
      status: parseStringField(f.status) ?? "active",
      scanCount: parseIntField(f.scanCount) ?? 0,
      scanLimit: parseIntField(f.scanLimit),
      expiryDate: parseStringField(f.expiryDate),
      design: {
        fgColor: parseStringField(designFields?.fgColor) ?? "#0A0E17",
        bgColor: parseStringField(designFields?.bgColor) ?? "#F8FAFC",
        logoPosition: parseStringField(designFields?.logoPosition) ?? "center",
        logoUri: parseStringField(designFields?.logoUri),
        label: parseStringField(designFields?.label),
      },
    };
    fcSet(key, link);
    return link;
  } catch {
    return null;
  }
}

export function bustUnifiedCache(id: string): void {
  cacheDelete(`fc-unified:${id}`);
}

export async function recordUnifiedScan(id: string, scanLimit: number | null): Promise<void> {
  if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) return;
  try {
    const commitUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:commit?key=${FIREBASE_API_KEY}`;
    const docPath = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/qrs/${encodeURIComponent(id)}`;

    await fetch(commitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        writes: [{
          transform: {
            document: docPath,
            fieldTransforms: [{ fieldPath: "scanCount", increment: { integerValue: "1" } }],
          },
        }],
      }),
    });

    if (scanLimit !== null && scanLimit > 0) {
      const freshRes = await fetch(firestoreUrl("qrs", id), { signal: AbortSignal.timeout(8000) });
      if (!freshRes.ok) return;
      const freshData = await freshRes.json() as any;
      const freshCount = parseIntField(freshData?.fields?.scanCount) ?? 0;
      if (isLimitExceeded(null, scanLimit, freshCount)) {
        await fetch(commitUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            writes: [{
              update: {
                name: docPath,
                fields: { status: { stringValue: "limit_reached" } },
              },
              updateMask: { fieldPaths: ["status"] },
            }],
          }),
        });
        bustUnifiedCache(id);
      }
    }
  } catch {
    // best-effort
  }
}

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
  const changedAt = new Date(destinationChangedAt).getTime();
  return (Date.now() - changedAt) < CAUTION_WINDOW_MS;
}
