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

interface CacheEntry<T> { data: T | null; expiresAt: number }

const guardCache = new Map<string, CacheEntry<GuardLinkFields>>();
const standardCache = new Map<string, CacheEntry<StandardLinkFields>>();

setInterval(() => {
  const now = Date.now();
  for (const [k, e] of guardCache.entries()) { if (now >= e.expiresAt) guardCache.delete(k); }
  for (const [k, e] of standardCache.entries()) { if (now >= e.expiresAt) standardCache.delete(k); }
}, CACHE_TTL_MS);

function firestoreUrl(collection: string, docId: string): string {
  return `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}/${encodeURIComponent(docId)}?key=${FIREBASE_API_KEY}`;
}

function parseIntField(f: any): number | null {
  if (!f) return null;
  if (f.integerValue !== undefined) return parseInt(f.integerValue, 10);
  if (f.doubleValue !== undefined) return Math.floor(f.doubleValue);
  return null;
}

export async function fetchGuardLink(uuid: string): Promise<GuardLinkFields | null> {
  const now = Date.now();
  const cached = guardCache.get(uuid);
  if (cached && now < cached.expiresAt) return cached.data;

  try {
    const res = await fetch(firestoreUrl("guardLinks", uuid));
    if (!res.ok) { guardCache.set(uuid, { data: null, expiresAt: now + CACHE_TTL_MS }); return null; }
    const data = await res.json() as any;
    const f = data?.fields;
    if (!f) { guardCache.set(uuid, { data: null, expiresAt: now + CACHE_TTL_MS }); return null; }
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
    guardCache.set(uuid, { data: link, expiresAt: now + CACHE_TTL_MS });
    return link;
  } catch {
    return null;
  }
}

export async function fetchStandardLink(uuid: string): Promise<StandardLinkFields | null> {
  const now = Date.now();
  const cached = standardCache.get(uuid);
  if (cached && now < cached.expiresAt) return cached.data;

  try {
    const res = await fetch(firestoreUrl("standardLinks", uuid));
    if (!res.ok) { standardCache.set(uuid, { data: null, expiresAt: now + CACHE_TTL_MS }); return null; }
    const data = await res.json() as any;
    const f = data?.fields;
    if (!f) { standardCache.set(uuid, { data: null, expiresAt: now + CACHE_TTL_MS }); return null; }
    const link: StandardLinkFields = {
      rawContent: f.rawContent?.stringValue || "",
      contentType: f.contentType?.stringValue || "text",
      ownerName: f.ownerName?.stringValue || "BinRo User",
      isActive: f.isActive?.booleanValue !== false,
      scanLimit: parseIntField(f.scanLimit),
      scanCount: parseIntField(f.scanCount) ?? 0,
      expiryDate: f.expiryDate?.stringValue || null,
    };
    standardCache.set(uuid, { data: link, expiresAt: now + CACHE_TTL_MS });
    return link;
  } catch {
    return null;
  }
}

// Atomically increment scanCount for a link and auto-deactivate if limit reached.
// collection is either "standardLinks" or "guardLinks".
export async function recordScanAndEnforce(
  collection: "standardLinks" | "guardLinks",
  uuid: string,
  scanLimit: number | null
): Promise<void> {
  if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) return;
  try {
    // Firestore REST atomic increment via runQuery / commit
    const commitUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:commit?key=${FIREBASE_API_KEY}`;
    const docPath = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}/${encodeURIComponent(uuid)}`;

    const writes: any[] = [{
      transform: {
        document: docPath,
        fieldTransforms: [{
          fieldPath: "scanCount",
          increment: { integerValue: "1" },
        }],
      },
    }];

    // If scan limit is set, also check and deactivate
    if (scanLimit !== null && scanLimit > 0) {
      // Fetch fresh scanCount after increment via a second request
      // We'll do it optimistically: after the increment, if scanCount >= scanLimit, deactivate
      // We use a conditional update (precondition) to avoid double-deactivation
      // Simple approach: always add a deactivate write conditional on the new count
      writes.push({
        update: {
          name: docPath,
          fields: { isActive: { booleanValue: false } },
        },
        currentDocument: { exists: true },
        updateMask: { fieldPaths: ["isActive"] },
      });
    }

    const body = scanLimit !== null && scanLimit > 0
      ? JSON.stringify({ writes: [writes[0]] }) // increment only; deactivation handled below
      : JSON.stringify({ writes });

    const commitRes = await fetch(commitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ writes: [writes[0]] }),
    });

    if (!commitRes.ok) return;

    // If there's a limit, re-fetch the fresh doc to check if we've hit it
    if (scanLimit !== null && scanLimit > 0) {
      const freshRes = await fetch(firestoreUrl(collection, uuid));
      if (!freshRes.ok) return;
      const freshData = await freshRes.json() as any;
      const freshCount = parseIntField(freshData?.fields?.scanCount) ?? 0;
      if (freshCount >= scanLimit) {
        // Deactivate
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
        // Bust the cache so next scan sees isActive: false immediately
        guardCache.delete(uuid);
        standardCache.delete(uuid);
      }
    }
  } catch {
    // Non-fatal — scan counting is best-effort
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
