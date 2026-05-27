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
  typeMeta: QrTypeMeta;
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
