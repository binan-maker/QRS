/**
 * QR ENGINE — UNIFIED TYPE REGISTRY
 * ─────────────────────────────────────────────────────────────────────────────
 * THE single source of truth for every QR type in the app.
 *
 * Each entry owns its own:
 *   • Visual metadata  (icon, colour, bg, gradient)
 *   • Action metadata  (openLabel, appScheme, webFallback)
 *   • Display logic    (getDisplayLabel, getSubtitle)
 *
 * Adding a new QR type = add ONE object here.
 * Nothing else changes.
 *
 * ALL other metadata files (CONTENT_TYPE_META, CT_META, QR_TYPE_STYLES,
 * QR_TYPE_REGISTRY) are now backward-compat shims that re-export from here.
 */

import type { QrTypeDefinition, QrTypeCategory, QrTypeMeta } from "./types";

// ─── Gradient palette ────────────────────────────────────────────────────────
const G = {
  primary:   ["#1E3A8A", "#1D4ED8"] as const,
  safe:      ["#059669", "#10B981"] as const,
  payment:   ["#B45309", "#F59E0B"] as const,
  danger:    ["#B91C1C", "#EF4444"] as const,
  purple:    ["#6D28D9", "#8B5CF6"] as const,
  slate:     ["#475569", "#64748B"] as const,
  teal:      ["#0891B2", "#06B6D4"] as const,
  whatsapp:  ["#15803D", "#22C55E"] as const,
  instagram: ["#C13584", "#E1306C"] as const,
  twitter:   ["#0C85D0", "#1DA1F2"] as const,
  youtube:   ["#B91C1C", "#EF4444"] as const,
  linkedin:  ["#0A66C2", "#2563EB"] as const,
  telegram:  ["#0077B5", "#0088CC"] as const,
  facebook:  ["#1060CC", "#1877F2"] as const,
  spotify:   ["#158A3E", "#1DB954"] as const,
  discord:   ["#4752CC", "#5865F2"] as const,
  tiktok:    ["#1F2937", "#374151"] as const,
  snapchat:  ["#A37800", "#D4A000"] as const,
  crypto:    ["#B45309", "#F7931A"] as const,
  donation:  ["#BE123C", "#F43F5E"] as const,
  paypal:    ["#002070", "#0070BA"] as const,
  venmo:     ["#006ACC", "#008CFF"] as const,
  razorpay:  ["#2255EE", "#3366FF"] as const,
  zoom:      ["#1A6ECC", "#2D8CFF"] as const,
} satisfies Record<string, readonly [string, string]>;

// ─── Inline URL helpers (no external deps) ───────────────────────────────────
function _host(c: string): string {
  try {
    return new URL(c.startsWith("http") ? c : `https://${c}`).hostname.replace(/^www\./, "");
  } catch { return c.slice(0, 30); }
}
function _path(c: string): string[] {
  try {
    return new URL(c.startsWith("http") ? c : `https://${c}`).pathname
      .replace(/\/$/, "").split("/").filter(Boolean);
  } catch { return []; }
}
function _handle(c: string, prefix = "@"): string {
  const p = _path(c);
  const last = p[p.length - 1];
  if (last && !last.includes(".") && last.length < 50)
    return prefix + last.replace(/^@/, "");
  return _host(c);
}
function _trunc(s: string, n = 40): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// ─── Master registry ─────────────────────────────────────────────────────────
const QR_REGISTRY: Record<string, QrTypeDefinition> = {

  // ── Text & URL ─────────────────────────────────────────────────────────────
  text: {
    key: "text", label: "Text", icon: "document-text-outline",
    color: "#6B7280", bg: "#F9FAFB", gradient: G.slate, category: "text",
    openLabel: "Copy Text",
    getDisplayLabel: (c) => _trunc(c, 40),
    getSubtitle: () => null,
  },
  url: {
    key: "url", label: "Website", icon: "globe-outline",
    color: "#1D4ED8", bg: "#EFF6FF", gradient: G.primary, category: "web",
    openLabel: "Open Website",
    getDisplayLabel: (c) => {
      try {
        const u = new URL(c.startsWith("http") ? c : `https://${c}`);
        // Internal redirect paths (/guard/, /q/, /go/) are QR redirect links, not destinations
        if (
          u.pathname.startsWith("/guard/") ||
          /^\/q\/[A-Za-z0-9_-]/.test(u.pathname) ||
          /^\/go\/[A-Za-z0-9_-]/.test(u.pathname) ||
          /^(192\.168\.|10\.|172\.)/.test(u.hostname)
        )
          return "Smart Redirect";
        return u.hostname.replace(/^www\./, "");
      } catch { return _trunc(c, 36); }
    },
    getSubtitle: (c) => _trunc(c, 44),
  },
  biolink: {
    key: "biolink", label: "Bio Link", icon: "person-outline",
    color: "#7C3AED", bg: "#F5F3FF", gradient: G.purple, category: "web",
    openLabel: "Open Bio Link",
    getDisplayLabel: (c) => _host(c),
    getSubtitle: () => null,
  },

  // ── Communication ──────────────────────────────────────────────────────────
  email: {
    key: "email", label: "Email", icon: "mail-outline",
    color: "#2563EB", bg: "#EFF6FF", gradient: G.primary, category: "communication",
    openLabel: "Send Email",
    getDisplayLabel: (c) => c.replace(/^mailto:/i, "").split("?")[0].trim(),
    getSubtitle: (c) => {
      try {
        const qs = c.replace(/^mailto:/i, "").split("?")[1];
        return qs ? new URLSearchParams(qs).get("subject") : null;
      } catch { return null; }
    },
  },
  phone: {
    key: "phone", label: "Phone", icon: "call-outline",
    color: "#059669", bg: "#ECFDF5", gradient: G.safe, category: "communication",
    openLabel: "Call Number",
    getDisplayLabel: (c) => c.replace(/^(tel:|callto:|facetime:)/i, "").trim(),
    getSubtitle: () => null,
  },
  sms: {
    key: "sms", label: "SMS", icon: "chatbubble-outline",
    color: "#64748B", bg: "#F9FAFB", gradient: G.slate, category: "communication",
    openLabel: "Send SMS",
    getDisplayLabel: (c) => c.replace(/^SMSTO?:/i, "").split(":")[0].trim() || "SMS",
    getSubtitle: (c) => {
      const msg = c.replace(/^SMSTO?:/i, "").split(":").slice(1).join(":");
      return msg ? _trunc(msg, 44) : null;
    },
  },
  whatsapp: {
    key: "whatsapp", label: "WhatsApp", icon: "logo-whatsapp",
    color: "#16A34A", bg: "#F0FDF4", gradient: G.whatsapp, category: "communication",
    openLabel: "Open WhatsApp", appScheme: "whatsapp://", webFallback: true,
    getDisplayLabel: (c) => {
      try {
        const phone = new URL(c.startsWith("http") ? c : `https://${c}`)
          .pathname.replace(/^\//, "").replace(/\D/g, "");
        return phone ? `+${phone}` : "WhatsApp";
      } catch { return "WhatsApp"; }
    },
    getSubtitle: (c) => {
      const t = c.includes("?text=") ? decodeURIComponent(c.split("?text=")[1] || "") : null;
      return t ? _trunc(t, 44) : null;
    },
  },

  // ── WiFi ────────────────────────────────────────────────────────────────────
  wifi: {
    key: "wifi", label: "Wi-Fi", icon: "wifi-outline",
    color: "#059669", bg: "#ECFDF5", gradient: G.safe, category: "utility",
    openLabel: "Connect to Wi-Fi",
    getDisplayLabel: (c) => c.match(/S:([^;]+)/)?.[1] ?? "Wi-Fi Network",
    getSubtitle: (c) => {
      const sec = c.match(/T:([^;]+)/)?.[1] ?? "WPA";
      return sec === "nopass" ? "Open network" : `${sec} secured`;
    },
  },

  // ── Contact ─────────────────────────────────────────────────────────────────
  contact: {
    key: "contact", label: "Contact", icon: "person-circle-outline",
    color: "#7C3AED", bg: "#F5F3FF", gradient: G.purple, category: "utility",
    openLabel: "Save Contact",
    getDisplayLabel: (c) => {
      const fn = c.match(/FN:([^\r\n]+)/)?.[1]?.trim();
      if (fn) return fn;
      return c.match(/N:([^\r\n]+)/)?.[1]?.trim()?.replace(/;/g, " ").trim() ?? "Contact";
    },
    getSubtitle: (c) => c.match(/TEL[^:]*:([^\r\n]+)/)?.[1]?.trim() ?? null,
  },
  mecard: {
    key: "mecard", label: "Contact", icon: "person-circle-outline",
    color: "#7C3AED", bg: "#F5F3FF", gradient: G.purple, category: "utility",
    openLabel: "Save Contact",
    getDisplayLabel: (c) => c.match(/N:([^;]+)/)?.[1]?.trim() ?? "Contact",
    getSubtitle: (c) => c.match(/TEL:([^;]+)/)?.[1]?.trim() ?? null,
  },

  // ── Calendar / Event ────────────────────────────────────────────────────────
  event: {
    key: "event", label: "Event", icon: "calendar-outline",
    color: "#7C3AED", bg: "#F5F3FF", gradient: G.purple, category: "utility",
    openLabel: "Add to Calendar",
    getDisplayLabel: (c) => c.match(/SUMMARY:([^\r\n]+)/)?.[1]?.trim() ?? "Calendar Event",
    getSubtitle: (c) => {
      const s = c.match(/DTSTART[^:]*:([^\r\n]+)/)?.[1]?.trim();
      return s ? `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}` : null;
    },
  },
  calendar: {
    key: "calendar", label: "Event", icon: "calendar-outline",
    color: "#7C3AED", bg: "#F5F3FF", gradient: G.purple, category: "utility",
    openLabel: "Add to Calendar",
    getDisplayLabel: (c) => c.match(/SUMMARY:([^\r\n]+)/)?.[1]?.trim() ?? "Calendar Event",
    getSubtitle: (c) => {
      const s = c.match(/DTSTART[^:]*:([^\r\n]+)/)?.[1]?.trim();
      return s ? `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}` : null;
    },
  },

  // ── Location ────────────────────────────────────────────────────────────────
  location: {
    key: "location", label: "Location", icon: "location-outline",
    color: "#DC2626", bg: "#FFF1F2", gradient: G.danger, category: "location",
    openLabel: "Open in Maps",
    getDisplayLabel: (c) => {
      const geo = c.match(/geo:(-?[\d.]+),(-?[\d.]+)/);
      return geo ? `${geo[1]}, ${geo[2]}` : _host(c);
    },
    getSubtitle: () => null,
  },
  google_maps: {
    key: "google_maps", label: "Google Maps", icon: "map-outline",
    color: "#DC2626", bg: "#FFF1F2", gradient: G.danger, category: "location",
    openLabel: "Open in Maps",
    getDisplayLabel: (c) => _host(c),
    getSubtitle: () => null,
  },

  // ── Payment ─────────────────────────────────────────────────────────────────
  payment: {
    key: "payment", label: "Payment", icon: "card-outline",
    color: "#D97706", bg: "#FFFBEB", gradient: G.payment, category: "payment",
    openLabel: "Copy UPI ID",
    getDisplayLabel: (c) => {
      if (c.startsWith("upi://pay?")) {
        try {
          const p = new URLSearchParams(c.replace("upi://pay?", ""));
          return p.get("pn") || p.get("pa") || "UPI Payment";
        } catch {}
      }
      return "Payment QR";
    },
    getSubtitle: (c) => {
      if (c.startsWith("upi://pay?")) {
        try {
          const p = new URLSearchParams(c.replace("upi://pay?", ""));
          const pa = p.get("pa"); const pn = p.get("pn");
          return (pa && pn) ? pa : null;
        } catch {}
      }
      return null;
    },
  },
  upi: {
    key: "upi", label: "UPI Payment", icon: "card-outline",
    color: "#D97706", bg: "#FFFBEB", gradient: G.payment, category: "payment",
    openLabel: "Copy UPI ID",
    getDisplayLabel: (c) => {
      if (c.startsWith("upi://pay?")) {
        try {
          const p = new URLSearchParams(c.replace("upi://pay?", ""));
          return p.get("pn") || p.get("pa") || "UPI Payment";
        } catch {}
      }
      return /^[\w.\-+]+@[\w]+$/.test(c) ? c : "UPI Payment";
    },
    getSubtitle: (c) => {
      if (!c.startsWith("upi://pay?")) return null;
      try {
        const p = new URLSearchParams(c.replace("upi://pay?", ""));
        const pa = p.get("pa"); const pn = p.get("pn");
        return (pa && pn) ? pa : null;
      } catch { return null; }
    },
  },
  paymentlink: {
    key: "paymentlink", label: "Payment Link", icon: "card-outline",
    color: "#D97706", bg: "#FFFBEB", gradient: G.payment, category: "payment",
    openLabel: "Copy Payment Link",
    getDisplayLabel: (c) => {
      if (c.startsWith("upi://pay?")) {
        try {
          const p = new URLSearchParams(c.replace("upi://pay?", ""));
          return p.get("pn") || p.get("pa") || "Payment Link";
        } catch {}
      }
      return _host(c);
    },
    getSubtitle: () => null,
  },
  scantopay: {
    key: "scantopay", label: "Scan to Pay", icon: "qr-code-outline",
    color: "#D97706", bg: "#FFFBEB", gradient: G.payment, category: "payment",
    openLabel: "Scan to Pay",
    getDisplayLabel: (c) => /^[\w.\-+]+@[\w]+$/.test(c) ? c : "Scan to Pay",
    getSubtitle: () => null,
  },
  bharatqr: {
    key: "bharatqr", label: "BharatQR", icon: "shield-checkmark-outline",
    color: "#10B981", bg: "#ECFDF5", gradient: G.safe, category: "payment",
    openLabel: "Copy UPI ID",
    getDisplayLabel: () => "BharatQR Payment",
    getSubtitle: () => null,
  },
  razorpay: {
    key: "razorpay", label: "Razorpay", icon: "card-outline",
    color: "#3366FF", bg: "#EFF6FF", gradient: G.razorpay, category: "payment",
    openLabel: "Copy Payment Link", appScheme: "rzp://", webFallback: true,
    getDisplayLabel: (c) => {
      const m = c.match(/rzp\.io\/([\w]+)/);
      return m ? `rzp.io/${m[1]}` : _host(c);
    },
    getSubtitle: () => null,
  },
  paypal: {
    key: "paypal", label: "PayPal", icon: "logo-paypal",
    color: "#003087", bg: "#EFF6FF", gradient: G.paypal, category: "payment",
    openLabel: "Pay via PayPal", appScheme: "paypal://", webFallback: true,
    getDisplayLabel: (c) => {
      const m = c.match(/paypal\.me\/([\w.]+)/);
      return m ? `paypal.me/${m[1]}` : "PayPal";
    },
    getSubtitle: () => null,
  },
  venmo: {
    key: "venmo", label: "Venmo", icon: "logo-venmo",
    color: "#008CFF", bg: "#EFF6FF", gradient: G.venmo, category: "payment",
    openLabel: "Pay via Venmo", appScheme: "venmo://", webFallback: true,
    getDisplayLabel: (c) => {
      const m = c.match(/venmo\.com\/(?:u\/)?([\w.]+)/);
      if (m) return `@${m[1]}`;
      return c.startsWith("@") ? c : `@${c}`;
    },
    getSubtitle: () => null,
  },
  donation: {
    key: "donation", label: "Donation", icon: "heart-outline",
    color: "#F43F5E", bg: "#FFF1F2", gradient: G.donation, category: "payment",
    openLabel: "Donate",
    getDisplayLabel: (c) => _host(c) || "Donation Link",
    getSubtitle: () => null,
  },
  mobilepay: {
    key: "mobilepay", label: "Mobile Pay", icon: "phone-portrait-outline",
    color: "#10B981", bg: "#ECFDF5", gradient: G.safe, category: "payment",
    openLabel: "Open Payment App",
    getDisplayLabel: (c) => _host(c) || "Mobile Payment",
    getSubtitle: () => null,
  },
  grab: {
    key: "grab", label: "GrabPay", icon: "car-outline",
    color: "#00B14F", bg: "#F0FDF4", gradient: G.safe, category: "payment",
    openLabel: "Open GrabPay",
    getDisplayLabel: () => "GrabPay",
    getSubtitle: () => null,
  },

  // ── Social ──────────────────────────────────────────────────────────────────
  instagram: {
    key: "instagram", label: "Instagram", icon: "logo-instagram",
    color: "#E1306C", bg: "#FFF1F2", gradient: G.instagram, category: "social",
    openLabel: "Open Instagram", appScheme: "instagram://", webFallback: true,
    getDisplayLabel: (c) => _handle(c),
    getSubtitle: () => null,
  },
  twitter: {
    key: "twitter", label: "Twitter / X", icon: "logo-twitter",
    color: "#1DA1F2", bg: "#EFF6FF", gradient: G.twitter, category: "social",
    openLabel: "Open Twitter", appScheme: "twitter://", webFallback: true,
    getDisplayLabel: (c) => _handle(c),
    getSubtitle: () => null,
  },
  youtube: {
    key: "youtube", label: "YouTube", icon: "logo-youtube",
    color: "#DC2626", bg: "#FFF1F2", gradient: G.youtube, category: "social",
    openLabel: "Open YouTube", appScheme: "youtube://", webFallback: true,
    getDisplayLabel: (c) => {
      try {
        const u = new URL(c.startsWith("http") ? c : `https://${c}`);
        if (u.pathname.startsWith("/watch")) return "YouTube Video";
        const parts = u.pathname.split("/").filter(Boolean);
        const name = ["channel", "c", "user"].includes(parts[0]) ? parts[1] : parts[0];
        return name ? (name.startsWith("@") ? name : `@${name}`) : "YouTube";
      } catch { return "YouTube"; }
    },
    getSubtitle: () => null,
  },
  linkedin: {
    key: "linkedin", label: "LinkedIn", icon: "logo-linkedin",
    color: "#0A66C2", bg: "#EFF6FF", gradient: G.linkedin, category: "social",
    openLabel: "Open LinkedIn", appScheme: "linkedin://", webFallback: true,
    getDisplayLabel: (c) => {
      const p = _path(c);
      const idx = p.findIndex((s) => s === "in" || s === "company");
      return p[idx + 1] ? `@${p[idx + 1]}` : _host(c);
    },
    getSubtitle: () => null,
  },
  telegram: {
    key: "telegram", label: "Telegram", icon: "paper-plane-outline",
    color: "#0088CC", bg: "#EFF6FF", gradient: G.telegram, category: "social",
    openLabel: "Open Telegram", appScheme: "tg://", webFallback: true,
    getDisplayLabel: (c) => {
      const m = c.match(/(?:t\.me|telegram\.me)\/([\w]+)/);
      return m ? `@${m[1]}` : "Telegram";
    },
    getSubtitle: (c) => {
      const msg = c.includes("?text=") ? decodeURIComponent(c.split("?text=")[1] || "") : null;
      return msg ? _trunc(msg, 44) : null;
    },
  },
  facebook: {
    key: "facebook", label: "Facebook", icon: "logo-facebook",
    color: "#1877F2", bg: "#EFF6FF", gradient: G.facebook, category: "social",
    openLabel: "Open Facebook", appScheme: "fb://", webFallback: true,
    getDisplayLabel: (c) => _handle(c, ""),
    getSubtitle: () => null,
  },
  spotify: {
    key: "spotify", label: "Spotify", icon: "headset-outline",
    color: "#1DB954", bg: "#F0FDF4", gradient: G.spotify, category: "social",
    openLabel: "Play on Spotify", appScheme: "spotify://", webFallback: true,
    getDisplayLabel: (c) => {
      const m = c.match(/spotify\.com\/(track|album|playlist|artist)/);
      if (m) return m[1].charAt(0).toUpperCase() + m[1].slice(1);
      const p = _path(c);
      return p[1] ? p[1].replace(/-/g, " ") : "Spotify";
    },
    getSubtitle: () => null,
  },
  discord: {
    key: "discord", label: "Discord", icon: "logo-discord",
    color: "#5865F2", bg: "#F5F3FF", gradient: G.discord, category: "social",
    openLabel: "Open Discord", appScheme: "discord://", webFallback: true,
    getDisplayLabel: (c) =>
      c.includes("discord.gg") || c.includes("/invite/") ? "Discord Server" : _handle(c, ""),
    getSubtitle: () => null,
  },
  tiktok: {
    key: "tiktok", label: "TikTok", icon: "logo-tiktok",
    color: "#374151", bg: "#F9FAFB", gradient: G.tiktok, category: "social",
    openLabel: "Open TikTok", appScheme: "tiktok://", webFallback: true,
    getDisplayLabel: (c) => {
      const h = c.replace(/.*tiktok\.com\/@?/, "").replace(/\/$/, "");
      if (h && !h.includes(".")) return `@${h.replace(/^@/, "")}`;
      return c.startsWith("@") ? c : _handle(c);
    },
    getSubtitle: () => null,
  },
  snapchat: {
    key: "snapchat", label: "Snapchat", icon: "logo-snapchat",
    color: "#D4A000", bg: "#FEFCE8", gradient: G.snapchat, category: "social",
    openLabel: "Open Snapchat", appScheme: "snapchat://", webFallback: true,
    getDisplayLabel: (c) => !c.includes("snapchat.com")
      ? (c.startsWith("@") ? c : `@${c}`)
      : _handle(c),
    getSubtitle: () => null,
  },
  social: {
    key: "social", label: "Social Profile", icon: "share-social-outline",
    color: "#E1306C", bg: "#FDF2F8", gradient: G.instagram, category: "social",
    openLabel: "Open Profile",
    getDisplayLabel: (c) => _handle(c),
    getSubtitle: () => null,
  },

  // ── Business / Meetings ─────────────────────────────────────────────────────
  zoom: {
    key: "zoom", label: "Zoom Meeting", icon: "videocam-outline",
    color: "#2D8CFF", bg: "#EFF6FF", gradient: G.zoom, category: "utility",
    openLabel: "Join Meeting", appScheme: "zoommtg://", webFallback: true,
    getDisplayLabel: (c) => {
      const m = c.match(/\/j\/(\d+)/);
      return m ? `Meeting ${m[1]}` : "Zoom Meeting";
    },
    getSubtitle: (c) => {
      try { return new URL(c.startsWith("http") ? c : `https://${c}`).hostname; }
      catch { return "zoom.us"; }
    },
  },
  calendly: {
    key: "calendly", label: "Calendly", icon: "calendar-outline",
    color: "#006BFF", bg: "#EFF6FF", gradient: G.zoom, category: "utility",
    openLabel: "Book Appointment",
    getDisplayLabel: (c) => {
      const p = _path(c);
      return p[0] ? `@${p[0]}` : "Calendly";
    },
    getSubtitle: () => null,
  },
  reviewpage: {
    key: "reviewpage", label: "Review Page", icon: "star-outline",
    color: "#F59E0B", bg: "#FFFBEB", gradient: G.payment, category: "utility",
    openLabel: "Leave a Review",
    getDisplayLabel: () => "Google Review Page",
    getSubtitle: () => null,
  },
  googlereview: {
    key: "googlereview", label: "Review Page", icon: "star-outline",
    color: "#F59E0B", bg: "#FFFBEB", gradient: G.payment, category: "utility",
    openLabel: "Leave a Review",
    getDisplayLabel: () => "Google Review Page",
    getSubtitle: () => null,
  },
  menucatalogue: {
    key: "menucatalogue", label: "Menu / Catalogue", icon: "restaurant-outline",
    color: "#EF4444", bg: "#FFF1F2", gradient: G.danger, category: "utility",
    openLabel: "View Menu",
    getDisplayLabel: () => "Menu / Catalogue",
    getSubtitle: () => null,
  },

  // ── Apps ────────────────────────────────────────────────────────────────────
  app: {
    key: "app", label: "App Link", icon: "download-outline",
    color: "#059669", bg: "#ECFDF5", gradient: G.safe, category: "utility",
    openLabel: "Open App",
    getDisplayLabel: (c) => _host(c),
    getSubtitle: () => null,
  },
  appdownload: {
    key: "appdownload", label: "App Download", icon: "download-outline",
    color: "#059669", bg: "#ECFDF5", gradient: G.safe, category: "utility",
    openLabel: "Download App",
    getDisplayLabel: (c) => {
      const h = _host(c);
      if (h === "apps.apple.com") return "App Store";
      if (h === "play.google.com") return "Google Play";
      return h;
    },
    getSubtitle: (c) => {
      const h = _host(c);
      if (h === "apps.apple.com") return "iOS App";
      if (h === "play.google.com") return "Android App";
      return null;
    },
  },

  // ── Crypto ──────────────────────────────────────────────────────────────────
  crypto: {
    key: "crypto", label: "Crypto", icon: "logo-bitcoin",
    color: "#D97706", bg: "#FFFBEB", gradient: G.crypto, category: "crypto",
    openLabel: "Open Wallet",
    getDisplayLabel: (c) => {
      const coin = c.split(":")[0];
      return coin.charAt(0).toUpperCase() + coin.slice(1);
    },
    getSubtitle: (c) => {
      const addr = c.split(":")[1]?.split("?")[0];
      return addr ? _trunc(addr, 22) : null;
    },
  },

  // ── Secure / Special ───────────────────────────────────────────────────────
  encrypted: {
    key: "encrypted", label: "Encrypted", icon: "finger-print-outline",
    color: "#6D28D9", bg: "#F5F3FF", gradient: G.purple, category: "text",
    openLabel: "Open",
    getDisplayLabel: () => "Encrypted Data",
    getSubtitle: () => null,
  },
  otp: {
    key: "otp", label: "OTP / 2FA", icon: "lock-closed-outline",
    color: "#059669", bg: "#ECFDF5", gradient: G.safe, category: "utility",
    openLabel: "Open Authenticator",
    getDisplayLabel: (c) => {
      const issuer = c.match(/issuer=([^&]+)/)?.[1];
      return issuer ? decodeURIComponent(issuer) : "OTP / 2FA";
    },
    getSubtitle: () => null,
  },

  // ── Media / Docs / Other ───────────────────────────────────────────────────
  media: {
    key: "media", label: "Media", icon: "film-outline",
    color: "#7C3AED", bg: "#F5F3FF", gradient: G.purple, category: "web",
    openLabel: "Play Media",
    getDisplayLabel: (c) => _host(c),
    getSubtitle: () => null,
  },
  document: {
    key: "document", label: "Document", icon: "document-outline",
    color: "#2563EB", bg: "#EFF6FF", gradient: G.primary, category: "web",
    openLabel: "Open Document",
    getDisplayLabel: (c) => _host(c),
    getSubtitle: () => null,
  },
  boarding: {
    key: "boarding", label: "Boarding Pass", icon: "airplane-outline",
    color: "#0284C7", bg: "#E0F2FE", gradient: G.teal, category: "utility",
    openLabel: "View Pass",
    getDisplayLabel: () => "Boarding Pass",
    getSubtitle: () => null,
  },
  product: {
    key: "product", label: "Product", icon: "barcode-outline",
    color: "#6B7280", bg: "#F9FAFB", gradient: G.slate, category: "utility",
    openLabel: "View Product",
    getDisplayLabel: (c) => _trunc(c, 30),
    getSubtitle: () => null,
  },
};

// ─── Default fallback ────────────────────────────────────────────────────────
const DEFAULT_DEF: QrTypeDefinition = {
  key: "text", label: "QR Code", icon: "qr-code-outline",
  color: "#6B7280", bg: "#F9FAFB", gradient: G.slate, category: "text",
  openLabel: "Open",
  getDisplayLabel: (c) => _trunc(c, 40),
  getSubtitle: () => null,
};

const GENERIC_TYPES = new Set(["text", "url", "link", "biolink", "social"]);

// ─── Public API ──────────────────────────────────────────────────────────────

/** Full definition — including action metadata and display functions. */
export function getQrTypeDef(contentType: string, templateKey?: string): QrTypeDefinition {
  if (templateKey && !GENERIC_TYPES.has(templateKey) && QR_REGISTRY[templateKey])
    return QR_REGISTRY[templateKey];
  return QR_REGISTRY[contentType] ?? DEFAULT_DEF;
}

/** Visual + category metadata only (safe for type-only consumers). */
export function getQrTypeMeta(contentType: string, templateKey?: string): QrTypeDefinition {
  return getQrTypeDef(contentType, templateKey);
}

/** Backward-compat alias used by smart-open.ts and SocialCard. */
export function getQrTypeStyle(contentType: string, templateKey?: string): QrTypeDefinition {
  return getQrTypeDef(contentType, templateKey);
}

export function getQrTypeCategory(contentType: string): QrTypeCategory {
  return getQrTypeDef(contentType).category;
}

/**
 * Resolve the effective display type, preferring a specific templateKey
 * over a generic contentType (e.g. "url").
 */
export function resolveEffectiveType(contentType: string, templateKey?: string): string {
  if (templateKey && !GENERIC_TYPES.has(templateKey) && QR_REGISTRY[templateKey])
    return templateKey;
  return contentType;
}

/**
 * Get the human-readable display label for a QR code.
 * Replaces: getContentDisplayLabel, getDisplayText, getDetailDisplayTitle
 */
export function getDisplayLabel(
  content: string,
  contentType: string,
  templateKey?: string,
): string {
  const def = getQrTypeDef(contentType, templateKey);
  try { return def.getDisplayLabel(content) || _trunc(content, 40); }
  catch { return _trunc(content, 40); }
}

/**
 * Get the secondary subtitle for a QR code row.
 * Replaces: getContentSubtitle
 */
export function getSubtitle(
  content: string,
  contentType: string,
  templateKey?: string,
): string | null {
  const def = getQrTypeDef(contentType, templateKey);
  try { return def.getSubtitle(content) ?? null; }
  catch { return null; }
}

export { QR_REGISTRY };
export type { QrTypeDefinition, QrTypeMeta, QrTypeCategory };
