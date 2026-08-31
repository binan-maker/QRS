import { EXTERNAL } from "@/config/app";

/**
 * Generator QR Type Registry
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for all generator-facing QR types.
 * This is the FORM layer: it defines how types appear in the generator UI.
 *
 * For display metadata (icons, colors, labels for scan/history views),
 * use the QR Engine registry at features/qr-engine/registry.ts.
 *
 * Each entry defines:
 *   • primaryField  — the main input
 *   • extraFields   — additional inputs
 *   • build()       — encodes inputs into the final QR payload string
 *   • validate()    — returns an error string or null
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
  hint?: string;
  options?: Array<{ label: string; value: string }>;
  isToggle?: boolean;
  isTextArea?: boolean;
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
  category?: string;
}

// ─── Full registry ────────────────────────────────────────────────────────────
export const QR_REGISTRY: QrTypeEntry[] = [

  // ── Web ──────────────────────────────────────────────────────────────────────
  {
    key: "url",
    label: "Website URL", icon: "globe-outline",
    placeholder: "https://example.com",
    keyboardType: "url", contentType: "url",
    hint: "Enter a full website URL",
    emptyMessage: "Please enter a URL (e.g. example.com).",
    category: "web",
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

  // ── Payment ───────────────────────────────────────────────────────────────────
  {
    key: "upi",
    label: "UPI Payment", icon: "card-outline",
    placeholder: "name@paytm",
    keyboardType: "email-address", contentType: "upi",
    hint: "Enter UPI ID (VPA) — e.g. name@paytm, 9876543210@upi",
    emptyMessage: "Please enter a UPI ID (e.g. name@paytm).",
    category: "payment",
    extraFields: [
      { key: "name", label: "Payee / Business Name (optional)", placeholder: "My Store", keyboardType: "default", optional: true },
      { key: "amount", label: "Amount ₹ (optional)", placeholder: "100.00", keyboardType: "decimal-pad", optional: true },
      { key: "note", label: "Transaction Note (optional)", placeholder: "Payment for services", keyboardType: "default", optional: true },
    ],
    build: (v, extra) => {
      const name = extra.name?.trim() ?? "";
      const amount = extra.amount?.trim() ?? "";
      const note = extra.note?.trim() ?? "";
      let url = `upi://pay?pa=${encodeURIComponent(v)}&cu=INR`;
      if (name) url += `&pn=${encodeURIComponent(name)}`;
      if (amount) url += `&am=${amount}`;
      if (note) url += `&tn=${encodeURIComponent(note)}`;
      return url;
    },
    validate: (v) => {
      if (!v.trim()) return "Please enter a UPI ID.";
      if (!/^[\w.\-+]+@[\w]+$/.test(v.trim()))
        return "Invalid UPI ID. Format: name@bank (e.g. user@paytm)";
      return null;
    },
  },


  // ── WhatsApp ─────────────────────────────────────────────────────────────────
  {
    key: "whatsapp",
    label: "WhatsApp", icon: "logo-whatsapp",
    placeholder: "+919876543210",
    keyboardType: "phone-pad", contentType: "whatsapp",
    hint: "Include country code, no spaces (e.g. +919876543210)",
    emptyMessage: "Please enter a phone number with country code.",
    category: "communication",
    extraFields: [
      { key: "message", label: "Pre-filled Message (optional)", placeholder: "Hello! I scanned your QR code.", keyboardType: "default", optional: true, isTextArea: true },
    ],
    build: (v, extra) => {
      const cleaned = v.replace(/[\s\-().]/g, "").replace(/^\+/, "");
      const msg = extra.message?.trim() ?? "";
      let url = `${EXTERNAL.WHATSAPP}${cleaned}`;
      if (msg) url += `?text=${encodeURIComponent(msg)}`;
      return url;
    },
    validate: (v) => {
      const digits = v.replace(/[\s\-().+]/g, "");
      if (digits.length < 10) return "Please enter a valid phone number with country code.";
      return null;
    },
  },


  // ── Phone ─────────────────────────────────────────────────────────────────────
  {
    key: "phone",
    label: "Phone Call", icon: "call-outline",
    placeholder: "+91 98765 43210",
    keyboardType: "phone-pad", contentType: "phone",
    hint: "Include country code for international numbers",
    emptyMessage: "Please enter a phone number.",
    category: "communication",
    build: (v) => `tel:${v.replace(/\s/g, "")}`,
    validate: (v) => {
      const digits = v.replace(/[\s\-().+]/g, "");
      if (digits.length < 7) return "Please enter a valid phone number.";
      return null;
    },
  },

  // ── SMS ───────────────────────────────────────────────────────────────────────
  {
    key: "sms",
    label: "SMS Message", icon: "chatbubble-outline",
    placeholder: "+91 98765 43210",
    keyboardType: "phone-pad", contentType: "sms",
    hint: "Send a pre-filled SMS on scan",
    emptyMessage: "Please enter a phone number.",
    category: "communication",
    extraFields: [
      { key: "message", label: "Message (optional)", placeholder: "Your message here…", keyboardType: "default", optional: true, isTextArea: true },
    ],
    build: (v, extra) => {
      const msg = extra.message?.trim() ?? "";
      return `SMSTO:${v.replace(/\s/g, "")}:${msg}`;
    },
    validate: (v) => {
      const digits = v.replace(/[\s\-().+]/g, "");
      if (digits.length < 7) return "Please enter a valid phone number.";
      return null;
    },
  },

  // ── Location ──────────────────────────────────────────────────────────────────
  {
    key: "location",
    label: "Location / Map", icon: "location-outline",
    placeholder: "Taj Mahal, Agra, India",
    keyboardType: "default", contentType: "location",
    hint: "Enter an address, landmark, or lat/lng coordinates",
    emptyMessage: "Please enter a location name or address.",
    category: "location",
    extraFields: [
      { key: "lat", label: "Latitude (optional, for precise location)", placeholder: "27.1751", keyboardType: "decimal-pad", optional: true },
      { key: "lng", label: "Longitude (optional)", placeholder: "78.0421", keyboardType: "decimal-pad", optional: true },
    ],
    build: (v, extra) => {
      const lat = extra.lat?.trim() ?? "";
      const lng = extra.lng?.trim() ?? "";
      if (lat && lng) return `geo:${lat},${lng}?q=${encodeURIComponent(v)}`;
      return `${EXTERNAL.GOOGLE_MAPS}${encodeURIComponent(v)}`;
    },
    validate: (v) => {
      if (!v.trim()) return "Please enter a location name or address.";
      return null;
    },
  },

  // ── Calendar Event ────────────────────────────────────────────────────────────
  {
    key: "event",
    label: "Calendar Event", icon: "calendar-outline",
    placeholder: "Team Meeting",
    keyboardType: "default", contentType: "event",
    hint: "Adds an event to the scanner's calendar on scan",
    emptyMessage: "Please enter an event title.",
    category: "utility",
    extraFields: [
      { key: "start", label: "Start (YYYYMMDDTHHMMSS)", placeholder: "20250101T090000", keyboardType: "default" },
      { key: "end", label: "End (YYYYMMDDTHHMMSS, optional)", placeholder: "20250101T100000", keyboardType: "default", optional: true },
      { key: "location", label: "Location (optional)", placeholder: "Conference Room", keyboardType: "default", optional: true },
      { key: "description", label: "Description (optional)", placeholder: "Agenda…", keyboardType: "default", optional: true, isTextArea: true },
    ],
    build: (v, extra) => {
      const start = extra.start?.trim() ?? "";
      const end = extra.end?.trim() ?? start;
      const loc = extra.location?.trim() ?? "";
      const desc = extra.description?.trim() ?? "";
      let cal = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${v}\n`;
      if (start) cal += `DTSTART:${start}\n`;
      if (end) cal += `DTEND:${end}\n`;
      if (loc) cal += `LOCATION:${loc}\n`;
      if (desc) cal += `DESCRIPTION:${desc}\n`;
      cal += `END:VEVENT\nEND:VCALENDAR`;
      return cal;
    },
    validate: (_v, extra) => {
      if (!extra.start?.trim()) return "Please enter a start date/time (e.g. 20250101T090000).";
      return null;
    },
  },

  // ── Crypto ────────────────────────────────────────────────────────────────────
  {
    key: "crypto",
    label: "Crypto Wallet", icon: "logo-bitcoin",
    placeholder: "1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf...",
    keyboardType: "default", contentType: "crypto",
    hint: "Share a crypto wallet address for payments",
    emptyMessage: "Please enter a wallet address.",
    category: "crypto",
    extraFields: [
      { key: "coin", label: "Cryptocurrency (bitcoin / ethereum / etc.)", placeholder: "bitcoin", keyboardType: "default", optional: true },
      { key: "amount", label: "Amount (optional)", placeholder: "0.001", keyboardType: "decimal-pad", optional: true },
      { key: "label", label: "Label (optional)", placeholder: "Donation", keyboardType: "default", optional: true },
    ],
    build: (v, extra) => {
      const coin = extra.coin?.trim() || "bitcoin";
      const amount = extra.amount?.trim() ?? "";
      const label = extra.label?.trim() ?? "";
      let uri = `${coin}:${v}`;
      const params: string[] = [];
      if (amount) params.push(`amount=${amount}`);
      if (label) params.push(`label=${encodeURIComponent(label)}`);
      if (params.length) uri += `?${params.join("&")}`;
      return uri;
    },
    validate: (v) => {
      if (!v.trim()) return "Please enter a wallet address.";
      if (v.trim().length < 10) return "Wallet address appears too short.";
      return null;
    },
  },

  // ── Social Profile ────────────────────────────────────────────────────────────
  {
    key: "social",
    label: "Social Profile", icon: "share-social-outline",
    placeholder: "https://instagram.com/yourhandle",
    keyboardType: "url", contentType: "social",
    hint: "Paste the full link to any social media profile",
    emptyMessage: "Please enter a social profile URL.",
    category: "social",
    build: (v) => (v.startsWith("http") ? v : `https://${v}`),
    validate: (v) => {
      if (!v.trim()) return "Please enter a profile URL.";
      return null;
    },
  },

  // ── Plain Text ────────────────────────────────────────────────────────────────
  {
    key: "text",
    label: "Plain Text", icon: "document-text-outline",
    placeholder: "Enter your message, coupon code, or any text…",
    keyboardType: "default", contentType: "text",
    multiline: true,
    hint: "Encode any text, coupon code, or message (up to 2000 characters)",
    emptyMessage: "Please enter some text.",
    category: "utility",
    build: (v) => v.trim(),
    validate: (v) => {
      if (!v.trim()) return "Please enter some text.";
      if (v.length > 2000) return "Text must be under 2000 characters.";
      return null;
    },
  },
];

// ─── Category groupings ────────────────────────────────────────────────────────
export const QR_CATEGORY_KEYS: { label: string; icon: string; keys: string[] }[] = [
  { label: "Payments",             icon: "card-outline",          keys: ["upi", "crypto"] },
  { label: "Contact & Messaging",  icon: "person-outline",        keys: ["phone", "sms", "whatsapp"] },
  { label: "Web & Social",         icon: "globe-outline",         keys: ["url", "social"] },
  { label: "Utility",              icon: "apps-outline",          keys: ["location", "event", "text"] },
];

// ─── Lookup helpers ────────────────────────────────────────────────────────────
export function getRegistryEntryByKey(key: string): QrTypeEntry | undefined {
  return QR_REGISTRY.find((e) => e.key === key);
}

export function getRegistryEntryByIndex(idx: number): QrTypeEntry | undefined {
  return QR_REGISTRY[idx];
}

export function getRegistryEntriesByCategory(category: string): QrTypeEntry[] {
  return QR_REGISTRY.filter((e) => e.category === category);
}
