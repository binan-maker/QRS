// ─── QR Engine — Core Types ───────────────────────────────────────────────────
// Single source of truth for every type shape used across the engine.

// ─── Render modes ─────────────────────────────────────────────────────────────
export type QrRenderMode =
  | "full"       // Rich detail card (qr-detail page)
  | "history"    // Icon/badge atoms (history, recent scans)
  | "minimal"    // Tiny type pill/badge (filters, chips)
  | "feed"       // Social-style card (home feed, search results)
  | "hero";      // Full-width hero card (scan result highlight)

export type QrTypeCategory =
  | "web"
  | "payment"
  | "communication"
  | "social"
  | "utility"
  | "location"
  | "crypto"
  | "text";

export interface QrTrustSummary {
  score: number;              // 0–100
  level: TrustLevel;
  flags: TrustFlag[];
  verified: boolean;
  last_analyzed_at?: number;
}

export type TrustLevel = "safe" | "caution" | "suspicious" | "dangerous" | "unknown";

export type TrustFlag =
  | "community_reported"
  | "community_trusted";

// ─── Type definition (registry entry) ────────────────────────────────────────
export interface QrTypeDefinition {
  key: string;
  label: string;
  icon: string;                          // Ionicons glyph name
  color: string;                         // hex accent colour
  bg: string;                            // hex light background tint
  gradient: readonly [string, string];   // LinearGradient colours [from, to]
  category: QrTypeCategory;
  openLabel: string;                     // primary CTA: "Open Website", "Call", …
  appScheme?: string;                    // native-app URI scheme
  webFallback?: boolean;                 // offer "open in browser?" when app absent
  getDisplayLabel: (content: string) => string;
  getSubtitle: (content: string) => string | null;
}

/** Subset used by list-row consumers */
export interface QrTypeMeta {
  key: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  gradient: readonly [string, string];
  category: QrTypeCategory;
}

export interface QrMeta {
  typeMeta: QrTypeDefinition;
  displayLabel: string;
  subtitle: string | null;
}

export interface QrRenderProps {
  content: string;
  contentType: string;
  mode?: QrRenderMode;
  templateKey?: string;
  isDeactivated?: boolean;
  onOpen?: () => void;
  hideOpenAction?: boolean;
  /** Parsed payment data — typed at the usage site; kept loose here to avoid a circular dep with services */
  parsedPayment?: Record<string, unknown> | null;
  risk?: TrustLevel;
  scannedAt?: Date | number;
  isDynamic?: boolean;
  isBusiness?: boolean;
  trustSummary?: QrTrustSummary;
  isLoading?: boolean;
}
