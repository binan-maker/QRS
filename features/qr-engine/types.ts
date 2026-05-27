// ─── QR Engine — Core Types ───────────────────────────────────────────────────
// Single source of truth for every type shape used across the engine.

// ─── Render modes ─────────────────────────────────────────────────────────────
export type QrRenderMode =
  | "full"       // Rich detail card (qr-detail page)
  | "compact"    // Owner-facing info card (my-qr)
  | "history"    // Icon/badge atoms (history, recent scans)
  | "minimal"    // Tiny type pill/badge (filters, chips)
  | "feed"       // Social-style card (home feed, search results)
  | "analytics"  // Scan count + trust stats card
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

// ─── Schema field types ───────────────────────────────────────────────────────
export type SchemaFieldType =
  | "text"
  | "url"
  | "email"
  | "phone"
  | "number"
  | "password"
  | "textarea"
  | "select"
  | "toggle"
  | "currency";

export interface SchemaField {
  key: string;
  label: string;
  placeholder: string;
  type: SchemaFieldType;
  required?: boolean;
  optional?: boolean;
  maxLength?: number;
  options?: Array<{ label: string; value: string }>;
  hint?: string;
}

// ─── QR Identity Object ───────────────────────────────────────────────────────
// The canonical infrastructure-grade representation of any QR code.
// Pages and services should operate on QrIdentity, never raw strings.
export interface QrIdentity {
  qr_id: string;
  qr_type: string;               // contentType key
  payload: string;               // raw encoded string
  metadata: QrMetadata;
  analytics: QrAnalyticsSummary;
  trust: QrTrustSummary;
  owner_id?: string;
  created_at?: number;
  updated_at?: number;
  is_dynamic?: boolean;
  is_active?: boolean;
  verification?: QrVerification;
}

export interface QrMetadata {
  displayLabel: string;
  subtitle: string | null;
  icon: string;
  color: string;
  bg: string;
  gradient: readonly [string, string];
  category: QrTypeCategory;
}

export interface QrAnalyticsSummary {
  scan_count: number;
  unique_scanners?: number;
  last_scanned_at?: number;
  trust_interactions?: number;
}

export interface QrTrustSummary {
  score: number;              // 0–100
  level: TrustLevel;
  flags: TrustFlag[];
  verified: boolean;
  last_analyzed_at?: number;
}

export type TrustLevel = "safe" | "caution" | "suspicious" | "dangerous" | "unknown";

export type TrustFlag =
  | "phishing_pattern"
  | "malicious_url"
  | "redirect_chain"
  | "suspicious_domain"
  | "community_reported"
  | "url_shortener"
  | "ip_address_url"
  | "typosquatting"
  | "safe_browsing_clear"
  | "verified_merchant"
  | "community_trusted";

export interface QrVerification {
  is_verified: boolean;
  verified_by?: string;
  verified_at?: number;
  signature?: string;
}

// ─── Scan Event (analytics) ───────────────────────────────────────────────────
export interface QrScanEvent {
  qr_id: string;
  scanner_id?: string;
  scanned_at: number;
  platform?: "android" | "ios" | "web";
  location_hint?: string;
  risk_at_scan?: TrustLevel;
}

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

// ─── Schema definition (generator entry) ─────────────────────────────────────
export interface QrSchema {
  key: string;
  label: string;
  icon: string;
  category: QrTypeCategory;
  description: string;
  primaryField: SchemaField;
  extraFields?: SchemaField[];
  build: (primary: string, extra: Record<string, string>) => string;
  validate?: (primary: string, extra: Record<string, string>) => string | null;
  trustRules?: TrustFlag[];
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
  parsedPayment?: any;
  risk?: TrustLevel;
  scannedAt?: Date | number;
  isDynamic?: boolean;
  isBusiness?: boolean;
  analytics?: QrAnalyticsSummary;
  trustSummary?: QrTrustSummary;
  isLoading?: boolean;
}
