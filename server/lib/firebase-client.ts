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
}

export interface StandardLinkFields {
  rawContent: string;
  contentType: string;
  ownerName: string;
  isActive: boolean;
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
    };
    standardCache.set(uuid, { data: link, expiresAt: now + CACHE_TTL_MS });
    return link;
  } catch {
    return null;
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
