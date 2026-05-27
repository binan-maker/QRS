// ─── QR Engine — Core Types ───────────────────────────────────────────────────
// Single source of truth for every type shape used across the engine.

export type QrRenderMode = "full" | "compact" | "history" | "minimal";

export type QrTypeCategory =
  | "web"
  | "payment"
  | "communication"
  | "social"
  | "utility"
  | "location"
  | "crypto"
  | "text";

/**
 * The canonical definition of a QR type.
 * Every piece of metadata, visual style, action label, and display logic
 * for a type lives in ONE object here — nowhere else.
 */
export interface QrTypeDefinition {
  key: string;
  label: string;
  icon: string;                          // Ionicons glyph name
  color: string;                         // hex accent colour
  bg: string;                            // hex light background tint
  gradient: readonly [string, string];   // LinearGradient colours [from, to]
  category: QrTypeCategory;
  openLabel: string;                     // primary CTA: "Open Website", "Call", …
  appScheme?: string;                    // native-app URI scheme for canOpenURL check
  webFallback?: boolean;                 // offer "open in browser?" when app absent
  getDisplayLabel: (content: string) => string;
  getSubtitle: (content: string) => string | null;
}

/** Subset used by list-row consumers (HistoryItem, RecentScanCard, FollowingSection) */
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
  risk?: "safe" | "caution" | "dangerous";
  scannedAt?: Date | number;
  isDynamic?: boolean;
  isBusiness?: boolean;
}
