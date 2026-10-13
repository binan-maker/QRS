export type QrContentType =
  | "url"
  | "payment"
  | "text"
  | "phone"
  | "email"
  | "sms"
  | "wifi"
  | "location"
  | "contact"
  | "calendar"
  | "otp"
  | "app";

export interface QrTypeDefinition {
  key: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  gradient: readonly [string, string];
  category: "web" | "text" | "payment";
  openLabel: string;
  appScheme?: string;
  webFallback?: boolean;
  getDisplayLabel: (content: string) => string;
  getSubtitle: (content: string) => string | null;
}
