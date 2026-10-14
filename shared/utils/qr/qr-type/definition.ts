import { parseAnyPaymentQr } from "@/services/analysis/payment-parser";
import type { QrTypeDefinition } from "./types";

export const truncate = (value: string, length = 40): string =>
  value.length > length ? `${value.slice(0, length)}…` : value;

export function getHost(content: string): string {
  try {
    const url = new URL(content.startsWith("http") ? content : `https://${content}`);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "maps.google.com" || host.includes("goo.gl")) return "Google Maps";
    if (host === "play.google.com") return "Google Play Store";
    if (host === "drive.google.com") return "Google Drive";
    if (host === "docs.google.com") return "Google Docs";
    if (host === "forms.gle") return "Google Form";
    if (host === "calendar.google.com") return "Google Calendar";
    return host;
  } catch {
    return truncate(content, 36);
  }
}

export const QR_CONTENT_TYPES: Record<string, QrTypeDefinition> = {
  payment: {
    key: "payment", label: "Payment", icon: "card-outline", color: "#059669",
    bg: "#ECFDF5", gradient: ["#047857", "#10B981"], category: "payment", openLabel: "Open",
    getDisplayLabel: (c) => {
      const p = parseAnyPaymentQr(c);
      return p?.recipientName || p?.vpa || truncate(p?.recipientId || "Payment QR", 32);
    },
    getSubtitle: (c) => {
      const p = parseAnyPaymentQr(c);
      if (p?.amount) return `${p.vpa ? `${p.vpa} • ` : ""}${p.currency === "INR" ? "₹" : ""}${p.amount}`;
      return p?.vpa || p?.recipientId || truncate(c, 44);
    },
  },
  text: {
    key: "text", label: "Text", icon: "document-text-outline", color: "#6B7280",
    bg: "#F9FAFB", gradient: ["#475569", "#64748B"], category: "text", openLabel: "Copy Text",
    getDisplayLabel: (c) => truncate(c), getSubtitle: () => null,
  },
  url: {
    key: "url", label: "Website", icon: "globe-outline", color: "#1D4ED8",
    bg: "#EFF6FF", gradient: ["#1E3A8A", "#1D4ED8"], category: "web", openLabel: "Open Website",
    getDisplayLabel: getHost, getSubtitle: (c) => truncate(c, 44),
  },
  phone: {
    key: "phone", label: "Phone", icon: "call-outline", color: "#2563EB",
    bg: "#EFF6FF", gradient: ["#1D4ED8", "#3B82F6"], category: "text", openLabel: "Call Phone",
    getDisplayLabel: (c) => c.replace(/^tel:/i, ""), getSubtitle: () => "Phone number",
  },
  email: {
    key: "email", label: "Email", icon: "mail-outline", color: "#7C3AED",
    bg: "#F5F3FF", gradient: ["#6D28D9", "#8B5CF6"], category: "text", openLabel: "Send Email",
    getDisplayLabel: (c) => c.replace(/^mailto:/i, "").split("?")[0], getSubtitle: () => "Email address",
  },
  sms: {
    key: "sms", label: "SMS", icon: "chatbubble-outline", color: "#0891B2",
    bg: "#ECFEFF", gradient: ["#0E7490", "#06B6D4"], category: "text", openLabel: "Send SMS",
    getDisplayLabel: (c) => c.replace(/^smsto?:/i, "").split(":")[0], getSubtitle: () => "Text message",
  },
  wifi: {
    key: "wifi", label: "Wi-Fi", icon: "wifi-outline", color: "#059669",
    bg: "#ECFDF5", gradient: ["#047857", "#10B981"], category: "text", openLabel: "Connect Wi-Fi",
    getDisplayLabel: (c) => c.match(/S:([^;]+)/i)?.[1] || "Wi-Fi Network", getSubtitle: () => "Wireless credentials",
  },
  location: {
    key: "location", label: "Location", icon: "location-outline", color: "#EA580C",
    bg: "#FFF7ED", gradient: ["#C2410C", "#F97316"], category: "web", openLabel: "Open Maps",
    getDisplayLabel: (c) => c.toLowerCase().includes("google") ? "Google Maps" : "Map Location",
    getSubtitle: (c) => truncate(c, 44),
  },
  contact: {
    key: "contact", label: "Contact", icon: "person-outline", color: "#4F46E5",
    bg: "#EEF2FF", gradient: ["#4338CA", "#6366F1"], category: "text", openLabel: "View Contact",
    getDisplayLabel: (c) => c.match(/(?:FN|N):([^\r\n;]+)/i)?.[1]?.trim() || "Contact Card", getSubtitle: () => "vCard details",
  },
  calendar: {
    key: "calendar", label: "Event", icon: "calendar-outline", color: "#D97706",
    bg: "#FFFBEB", gradient: ["#B45309", "#F59E0B"], category: "text", openLabel: "Add Event",
    getDisplayLabel: (c) => c.match(/SUMMARY:([^\r\n]+)/i)?.[1]?.trim() || "Calendar Event", getSubtitle: () => "Event details",
  },
  otp: {
    key: "otp", label: "2FA Code", icon: "key-outline", color: "#0284C7",
    bg: "#F0F9FF", gradient: ["#0369A1", "#0EA5E9"], category: "text", openLabel: "Add to Authenticator",
    getDisplayLabel: (c) => c.match(/otpauth:\/\/[^/]+\/([^?]+)/i)?.[1] || "Authenticator Key", getSubtitle: () => "2FA Key",
  },
  app: {
    key: "app", label: "App Link", icon: "apps-outline", color: "#6366F1",
    bg: "#EEF2FF", gradient: ["#4F46E5", "#818CF8"], category: "web", openLabel: "Open App",
    getDisplayLabel: (c) => c.toLowerCase().includes("play.google") ? "Google Play" : `${c.split(":")[0].toUpperCase()} App`,
    getSubtitle: (c) => truncate(c, 44),
  },
};
