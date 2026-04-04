import { BUILT_IN_BLACKLIST, saveOfflineBlacklist } from "./blacklist";
import { verifyThreatSignature } from "../security/signature-verifier";

export interface ThreatDefinitions {
  patterns: { pattern: string; reason: string }[];
  version: string;
  fetchedAt: number;
}

const THREAT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
let _cache: ThreatDefinitions | null = null;

// SECURITY FIX P1: Require signature verification in production
const REQUIRE_SIGNATURE_VERIFICATION = process.env.NODE_ENV === 'production';

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

    // SECURITY FIX P1: Enforce signature verification for MITM protection
    if (!signature) {
      if (REQUIRE_SIGNATURE_VERIFICATION) {
        console.error("[ThreatService] CRITICAL: No signature header in production — rejecting response");
        return null;
      }
      console.warn("[ThreatService] No signature header — accepting in development mode only");
    } else {
      const valid = await verifyThreatSignature(rawBody, signature);
      if (!valid) {
        console.error("[ThreatService] CRITICAL: Signature verification failed — possible MITM attack");
        return null;
      }
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
