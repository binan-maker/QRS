import { BUILT_IN_BLACKLIST, saveOfflineBlacklist } from "./blacklist";
import { verifyThreatSignature } from "../security/signature-verifier";

export interface ThreatDefinitions {
  patterns: { pattern: string; reason: string }[];
  version: string;
  fetchedAt: number;
}

const THREAT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
let _cache: ThreatDefinitions | null = null;

function getBaseUrl(): string {
  if (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_DOMAIN) {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    return domain.startsWith("http") ? domain : `https://${domain}`;
  }
  return "";
}

export async function fetchThreatDefinitions(): Promise<ThreatDefinitions | null> {
  const now = Date.now();
  if (_cache && now - _cache.fetchedAt < THREAT_CACHE_TTL_MS) return _cache;

  const base = getBaseUrl();
  if (!base) return null;

  try {
    const res = await fetch(`${base}/api/threats`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const rawBody = await res.text();
    const signature = res.headers.get("x-content-signature");

    if (signature) {
      const valid = await verifyThreatSignature(rawBody, signature);
      if (!valid) {
        console.warn("[ThreatService] Signature verification failed — discarding response");
        return null;
      }
    } else {
      console.warn("[ThreatService] No signature header — response accepted without verification");
    }

    const data = JSON.parse(rawBody) as { patterns: { pattern: string; reason: string }[]; version: string };
    const defs: ThreatDefinitions = { ...data, fetchedAt: now };
    _cache = defs;
    const extra = defs.patterns.filter(
      (p) => !BUILT_IN_BLACKLIST.some((b) => b.pattern === p.pattern)
    );
    if (extra.length > 0) {
      await saveOfflineBlacklist(extra).catch(() => {});
    }
    return defs;
  } catch {
    return null;
  }
}

export function getCachedThreats(): ThreatDefinitions | null {
  return _cache;
}
