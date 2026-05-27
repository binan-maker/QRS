/**
 * QR Engine — Unified Type Registry
 *
 * Single source of truth for ALL QR type visual metadata.
 * Consolidates CT_META (gradients) + CONTENT_TYPE_META (bg + color) into one
 * authoritative map that all pages, cards, and list rows consume.
 *
 * Adding a new QR type: add one entry here. Every renderer picks it up
 * automatically.
 */

import type { QrTypeMeta, QrTypeCategory } from "./types";

const R: Record<string, QrTypeMeta> = {
  // ── Web ──────────────────────────────────────────────────────────────────────
  url: {
    key: "url", label: "Website", icon: "link-outline",
    color: "#1D4ED8", bg: "#EFF6FF",
    gradient: ["#1E3A8A", "#1D4ED8"], category: "web",
  },
  biolink: {
    key: "biolink", label: "Bio Link", icon: "person-outline",
    color: "#7C3AED", bg: "#F5F3FF",
    gradient: ["#6D28D9", "#7C3AED"], category: "web",
  },

  // ── Text ─────────────────────────────────────────────────────────────────────
  text: {
    key: "text", label: "Text", icon: "text-outline",
    color: "#6B7280", bg: "#F9FAFB",
    gradient: ["#6B7280", "#9CA3AF"], category: "text",
  },
  encrypted: {
    key: "encrypted", label: "Encrypted", icon: "key-outline",
    color: "#D97706", bg: "#FFFBEB",
    gradient: ["#B45309", "#D97706"], category: "text",
  },

  // ── Communication ────────────────────────────────────────────────────────────
  email: {
    key: "email", label: "Email", icon: "mail-outline",
    color: "#2563EB", bg: "#EFF6FF",
    gradient: ["#1D4ED8", "#3B82F6"], category: "communication",
  },
  phone: {
    key: "phone", label: "Phone", icon: "call-outline",
    color: "#059669", bg: "#ECFDF5",
    gradient: ["#059669", "#10B981"], category: "communication",
  },
  sms: {
    key: "sms", label: "SMS", icon: "chatbubble-outline",
    color: "#64748B", bg: "#F9FAFB",
    gradient: ["#475569", "#64748B"], category: "communication",
  },
  whatsapp: {
    key: "whatsapp", label: "WhatsApp", icon: "logo-whatsapp",
    color: "#16A34A", bg: "#F0FDF4",
    gradient: ["#15803D", "#22C55E"], category: "communication",
  },

  // ── WiFi ─────────────────────────────────────────────────────────────────────
  wifi: {
    key: "wifi", label: "WiFi", icon: "wifi-outline",
    color: "#059669", bg: "#ECFDF5",
    gradient: ["#059669", "#10B981"], category: "utility",
  },

  // ── Contact ──────────────────────────────────────────────────────────────────
  contact: {
    key: "contact", label: "Contact", icon: "person-circle-outline",
    color: "#7C3AED", bg: "#F5F3FF",
    gradient: ["#6D28D9", "#8B5CF6"], category: "utility",
  },
  mecard: {
    key: "mecard", label: "Contact", icon: "person-circle-outline",
    color: "#7C3AED", bg: "#F5F3FF",
    gradient: ["#6D28D9", "#8B5CF6"], category: "utility",
  },

  // ── Calendar / Event ─────────────────────────────────────────────────────────
  event: {
    key: "event", label: "Event", icon: "calendar-outline",
    color: "#7C3AED", bg: "#F5F3FF",
    gradient: ["#6D28D9", "#8B5CF6"], category: "utility",
  },
  calendar: {
    key: "calendar", label: "Event", icon: "calendar-outline",
    color: "#7C3AED", bg: "#F5F3FF",
    gradient: ["#6D28D9", "#8B5CF6"], category: "utility",
  },

  // ── Location ─────────────────────────────────────────────────────────────────
  location: {
    key: "location", label: "Location", icon: "location-outline",
    color: "#DC2626", bg: "#FFF1F2",
    gradient: ["#B91C1C", "#EF4444"], category: "location",
  },
  google_maps: {
    key: "google_maps", label: "Maps", icon: "map-outline",
    color: "#DC2626", bg: "#FFF1F2",
    gradient: ["#B91C1C", "#EF4444"], category: "location",
  },

  // ── Payment (India-centric + global) ─────────────────────────────────────────
  payment: {
    key: "payment", label: "Payment", icon: "card-outline",
    color: "#D97706", bg: "#FFFBEB",
    gradient: ["#B45309", "#F59E0B"], category: "payment",
  },
  upi: {
    key: "upi", label: "UPI", icon: "card-outline",
    color: "#D97706", bg: "#FFFBEB",
    gradient: ["#B45309", "#F59E0B"], category: "payment",
  },
  paymentlink: {
    key: "paymentlink", label: "UPI Payment", icon: "card-outline",
    color: "#D97706", bg: "#FFFBEB",
    gradient: ["#B45309", "#F59E0B"], category: "payment",
  },
  scantopay: {
    key: "scantopay", label: "Scan to Pay", icon: "qr-code-outline",
    color: "#D97706", bg: "#FFFBEB",
    gradient: ["#B45309", "#F59E0B"], category: "payment",
  },
  razorpay: {
    key: "razorpay", label: "Razorpay", icon: "card-outline",
    color: "#3366FF", bg: "#EFF6FF",
    gradient: ["#2255EE", "#3366FF"], category: "payment",
  },
  paypal: {
    key: "paypal", label: "PayPal", icon: "wallet-outline",
    color: "#003087", bg: "#EFF6FF",
    gradient: ["#002070", "#0070BA"], category: "payment",
  },
  venmo: {
    key: "venmo", label: "Venmo", icon: "people-outline",
    color: "#008CFF", bg: "#EFF6FF",
    gradient: ["#006ACC", "#008CFF"], category: "payment",
  },
  donation: {
    key: "donation", label: "Donation", icon: "heart-outline",
    color: "#F43F5E", bg: "#FFF1F2",
    gradient: ["#BE123C", "#F43F5E"], category: "payment",
  },

  // ── Social ───────────────────────────────────────────────────────────────────
  instagram: {
    key: "instagram", label: "Instagram", icon: "logo-instagram",
    color: "#E1306C", bg: "#FFF1F2",
    gradient: ["#C13584", "#E1306C"], category: "social",
  },
  twitter: {
    key: "twitter", label: "Twitter / X", icon: "logo-twitter",
    color: "#1DA1F2", bg: "#EFF6FF",
    gradient: ["#0C85D0", "#1DA1F2"], category: "social",
  },
  youtube: {
    key: "youtube", label: "YouTube", icon: "logo-youtube",
    color: "#DC2626", bg: "#FFF1F2",
    gradient: ["#B91C1C", "#EF4444"], category: "social",
  },
  linkedin: {
    key: "linkedin", label: "LinkedIn", icon: "logo-linkedin",
    color: "#0A66C2", bg: "#EFF6FF",
    gradient: ["#0A66C2", "#2563EB"], category: "social",
  },
  telegram: {
    key: "telegram", label: "Telegram", icon: "send-outline",
    color: "#0088CC", bg: "#EFF6FF",
    gradient: ["#0077B5", "#0088CC"], category: "social",
  },
  facebook: {
    key: "facebook", label: "Facebook", icon: "logo-facebook",
    color: "#1877F2", bg: "#EFF6FF",
    gradient: ["#1060CC", "#1877F2"], category: "social",
  },
  spotify: {
    key: "spotify", label: "Spotify", icon: "musical-notes-outline",
    color: "#1DB954", bg: "#F0FDF4",
    gradient: ["#158A3E", "#1DB954"], category: "social",
  },
  discord: {
    key: "discord", label: "Discord", icon: "logo-discord",
    color: "#5865F2", bg: "#F5F3FF",
    gradient: ["#4752CC", "#5865F2"], category: "social",
  },
  tiktok: {
    key: "tiktok", label: "TikTok", icon: "musical-note-outline",
    color: "#374151", bg: "#F9FAFB",
    gradient: ["#1F2937", "#374151"], category: "social",
  },
  snapchat: {
    key: "snapchat", label: "Snapchat", icon: "camera-outline",
    color: "#D4A000", bg: "#FEFCE8",
    gradient: ["#A37800", "#D4A000"], category: "social",
  },

  // ── Business / Utility ───────────────────────────────────────────────────────
  zoom: {
    key: "zoom", label: "Zoom", icon: "videocam-outline",
    color: "#2D8CFF", bg: "#EFF6FF",
    gradient: ["#1A6ECC", "#2D8CFF"], category: "utility",
  },
  calendly: {
    key: "calendly", label: "Calendly", icon: "calendar-outline",
    color: "#006BFF", bg: "#EFF6FF",
    gradient: ["#0055CC", "#006BFF"], category: "utility",
  },
  reviewpage: {
    key: "reviewpage", label: "Review Page", icon: "star-outline",
    color: "#F59E0B", bg: "#FFFBEB",
    gradient: ["#D97706", "#F59E0B"], category: "utility",
  },
  menucatalogue: {
    key: "menucatalogue", label: "Menu", icon: "list-outline",
    color: "#EF4444", bg: "#FFF1F2",
    gradient: ["#DC2626", "#EF4444"], category: "utility",
  },
  app: {
    key: "app", label: "App", icon: "download-outline",
    color: "#059669", bg: "#ECFDF5",
    gradient: ["#047857", "#10B981"], category: "utility",
  },
  appdownload: {
    key: "appdownload", label: "App Download", icon: "download-outline",
    color: "#059669", bg: "#ECFDF5",
    gradient: ["#047857", "#10B981"], category: "utility",
  },

  // ── Crypto ───────────────────────────────────────────────────────────────────
  crypto: {
    key: "crypto", label: "Crypto", icon: "logo-bitcoin",
    color: "#D97706", bg: "#FFFBEB",
    gradient: ["#B45309", "#F7931A"], category: "crypto",
  },
};

const DEFAULT_META: QrTypeMeta = {
  key: "text", label: "QR Code", icon: "qr-code-outline",
  color: "#6B7280", bg: "#F9FAFB",
  gradient: ["#6B7280", "#9CA3AF"], category: "text",
};

export function getQrTypeMeta(type: string): QrTypeMeta {
  return R[type] ?? DEFAULT_META;
}

export function getQrTypeCategory(type: string): QrTypeCategory {
  return getQrTypeMeta(type).category;
}

export { R as QR_TYPE_REGISTRY };
