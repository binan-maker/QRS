/**
 * QR Type Registry — single source of truth for all QR code types.
 *
 * Only 5 templates are supported:
 *   0 — Website URL
 *   1 — Email
 *   2 — WiFi
 *   3 — UPI Payment  (Personal Payment)
 *   4 — Contact/vCard
 */

import type { KeyboardTypeOptions } from "react-native";

export interface ExtraFieldDef {
  key: string;
  label: string;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  optional?: boolean;
  secureText?: boolean;
  maxLength?: number;
}

export interface QrTypeEntry {
  key: string;
  label: string;
  icon: string;
  placeholder: string;
  keyboardType: KeyboardTypeOptions;
  multiline?: boolean;
  hint?: string;
  contentType: string;
  extraFields?: ExtraFieldDef[];
  emptyMessage: string;
  build: (value: string, extra: Record<string, string>) => string;
  getRaw?: (value: string, extra: Record<string, string>) => string;
  validate?: (value: string, extra: Record<string, string>) => string | null;
}

export const QR_REGISTRY: QrTypeEntry[] = [
  // ── index 0
  {
    key: "url",
    label: "Website URL", icon: "globe-outline", placeholder: "https://example.com",
    keyboardType: "url", contentType: "url",
    hint: "Enter a full website URL",
    emptyMessage: "Please enter a URL (e.g. example.com).",
    build: (v) => v.startsWith("http") ? v : `https://${v}`,
    validate: (v) => {
      const withScheme = v.startsWith("http") ? v : `https://${v}`;
      try {
        const url = new URL(withScheme);
        if (!url.hostname.includes(".") || url.hostname.length < 4)
          return "Please enter a valid URL (e.g. https://example.com).";
      } catch {
        return "Please enter a valid URL (e.g. https://example.com).";
      }
      return null;
    },
  },
  // ── index 1
  {
    key: "email",
    label: "Email", icon: "mail-outline", placeholder: "email@example.com",
    keyboardType: "email-address", contentType: "email",
    hint: "Enter a valid email address (e.g. name@example.com)",
    emptyMessage: "Please enter an email address (e.g. name@example.com).",
    build: (v) => `mailto:${v}`,
    getRaw: (v) => v,
    validate: (v) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))
        return "Invalid email address. Please enter a valid one (e.g. name@example.com).";
      return null;
    },
  },
  // ── index 2
  {
    key: "wifi",
    label: "WiFi", icon: "wifi-outline", placeholder: "NetworkName",
    keyboardType: "default", contentType: "wifi",
    hint: "Scanning will auto-connect to this WiFi network",
    emptyMessage: "Please enter the WiFi network name (SSID).",
    extraFields: [
      { key: "password", label: "Password", placeholder: "WiFi password", keyboardType: "default", secureText: true, maxLength: 63 },
      { key: "encryption", label: "Security (WPA / WEP / nopass)", placeholder: "WPA", keyboardType: "default", optional: true },
      { key: "hidden", label: "Hidden network? (true / false)", placeholder: "false", keyboardType: "default", optional: true },
    ],
    build: (v, extra) => {
      const password = extra.password?.trim() || "";
      const enc = extra.encryption?.trim().toUpperCase() || "WPA";
      const hidden = extra.hidden?.trim().toLowerCase() === "true" ? "true" : "false";
      return `WIFI:T:${enc};S:${v};P:${password};H:${hidden};;`;
    },
    validate: (v) => {
      if (v.length < 1) return "Please enter the WiFi network name (SSID).";
      return null;
    },
  },
  // ── index 3  (Personal Payment / UPI)
  {
    key: "paymentlink",
    label: "UPI Payment", icon: "card-outline", placeholder: "name@upi",
    keyboardType: "email-address", contentType: "paymentlink",
    hint: "Enter UPI ID (VPA) — e.g. name@paytm, 9876543210@upi",
    emptyMessage: "Please enter a UPI ID (e.g. name@paytm).",
    extraFields: [
      { key: "name", label: "Payee / Business Name (optional)", placeholder: "My Store", keyboardType: "default", optional: true },
      { key: "amount", label: "Amount ₹ (optional)", placeholder: "100.00", keyboardType: "decimal-pad", optional: true },
    ],
    build: (v, extra) => {
      const name = extra.name?.trim() || "";
      const amount = extra.amount?.trim() || "";
      let url = `upi://pay?pa=${encodeURIComponent(v)}&cu=INR`;
      if (name) url += `&pn=${encodeURIComponent(name)}`;
      if (amount) url += `&am=${amount}`;
      return url;
    },
  },
  // ── index 4
  {
    key: "contact",
    label: "Contact / vCard", icon: "person-circle-outline", placeholder: "Full Name",
    keyboardType: "default", contentType: "contact",
    hint: "Creates a vCard — scanners can save directly to their address book",
    emptyMessage: "Please enter the contact's full name.",
    extraFields: [
      { key: "phone", label: "Phone", placeholder: "+1 555 000 0000", keyboardType: "phone-pad" },
      { key: "email", label: "Email (optional)", placeholder: "name@example.com", keyboardType: "email-address", optional: true },
      { key: "org", label: "Organisation (optional)", placeholder: "Company Name", keyboardType: "default", optional: true },
      { key: "url", label: "Website (optional)", placeholder: "https://example.com", keyboardType: "url", optional: true },
    ],
    build: (v, extra) => {
      const phone = extra.phone?.trim() || "";
      const email = extra.email?.trim() || "";
      const org = extra.org?.trim() || "";
      const url = extra.url?.trim() || "";
      let vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${v}\nN:${v};;;;\n`;
      if (phone) vcard += `TEL:${phone}\n`;
      if (email) vcard += `EMAIL:${email}\n`;
      if (org) vcard += `ORG:${org}\n`;
      if (url) vcard += `URL:${url}\n`;
      vcard += `END:VCARD`;
      return vcard;
    },
    validate: (_v, extra) => {
      if (!extra.phone?.trim()) return "Please enter at least a phone number for the contact.";
      return null;
    },
  },
];

// ─── Categories ────────────────────────────────────────────────────────────
export const QR_CATEGORY_KEYS: { label: string; icon: string; keys: string[] }[] = [
  {
    label: "All Templates",
    icon: "apps-outline",
    keys: ["url", "email", "wifi", "paymentlink", "contact"],
  },
];

// ─── Lookup helpers ─────────────────────────────────────────────────────────
export function getRegistryEntryByKey(key: string): QrTypeEntry | undefined {
  return QR_REGISTRY.find((e) => e.key === key);
}

export function getRegistryEntryByIndex(idx: number): QrTypeEntry | undefined {
  return QR_REGISTRY[idx];
}
