/**
 * qr-type-styles.ts
 *
 * Single source of truth for QR type visual style, open labels, deep-link
 * schemes, and display-value extractors.  ContentCard, the My QR list, and
 * any other UI surface should import from here instead of maintaining their
 * own hardcoded style maps.
 *
 * Adding a new type: append one entry to QR_TYPE_STYLES.  No other file needs
 * to change for the style to propagate everywhere.
 */

export interface QrTypeStyle {
  icon: string;                                        // Ionicons glyph name
  label: string;                                       // Human display label
  gradient: readonly [string, string];                 // Card gradient [from, to]
  openLabel: string;                                   // Primary action CTA
  appScheme?: string;                                  // Native-app URI scheme to check
  webFallback?: boolean;                               // Offer "Open in browser?" if app absent
  extractDisplayValue?: (content: string) => string;  // Smart label from raw content
}

// ─── Brand palettes ──────────────────────────────────────────────────────────
const P = {
  primary:   ["#1D4ED8", "#3B82F6"],
  safe:      ["#059669", "#10B981"],
  payment:   ["#D97706", "#F59E0B"],
  danger:    ["#DC2626", "#EF4444"],
  purple:    ["#7C3AED", "#8B5CF6"],
  slate:     ["#64748B", "#94A3B8"],
  teal:      ["#0891B2", "#06B6D4"],
  whatsapp:  ["#16A34A", "#22C55E"],
  instagram: ["#E1306C", "#F472B6"],
  twitter:   ["#1DA1F2", "#38BDF8"],
  youtube:   ["#DC2626", "#EF4444"],
  linkedin:  ["#0A66C2", "#2563EB"],
  telegram:  ["#0088CC", "#38BDF8"],
  facebook:  ["#1877F2", "#3B82F6"],
  spotify:   ["#1DB954", "#22C55E"],
  discord:   ["#5865F2", "#818CF8"],
  tiktok:    ["#374151", "#6B7280"],
  zoom:      ["#2D8CFF", "#60A5FA"],
  crypto:    ["#D97706", "#F59E0B"],
  snapchat:  ["#D4A000", "#F59E0B"],
  donation:  ["#F43F5E", "#FB7185"],
  paypal:    ["#003087", "#0070BA"],
  venmo:     ["#008CFF", "#60A5FA"],
  razorpay:  ["#3366FF", "#60A5FA"],
} as const satisfies Record<string, readonly [string, string]>;

// ─── Display-value extractors ─────────────────────────────────────────────────
function handleFrom(url: string, domains: string[], seg = 1): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    for (const d of domains) {
      if (u.hostname.includes(d)) {
        const parts = u.pathname.split("/").filter(Boolean);
        const handle = parts[seg - 1];
        return handle ? `@${handle.replace(/^@/, "")}` : url;
      }
    }
  } catch { /* ignored */ }
  return url;
}

const ext = {
  instagram: (c: string) => handleFrom(c, ["instagram.com", "instagr.am"]),
  twitter:   (c: string) => handleFrom(c, ["twitter.com", "x.com"]),
  linkedin:  (c: string) => handleFrom(c, ["linkedin.com"], 2),
  facebook:  (c: string) => handleFrom(c, ["facebook.com", "fb.com"]),

  tiktok: (c: string) => {
    if (c.startsWith("@")) return c.split("?")[0];
    return handleFrom(c, ["tiktok.com"], 2);
  },
  snapchat: (c: string) => {
    if (!c.includes("snapchat.com")) return c.startsWith("@") ? c : `@${c}`;
    return handleFrom(c, ["snapchat.com"]);
  },
  telegram: (c: string) => {
    const m = c.match(/(?:t\.me|telegram\.me)\/([\w]+)/);
    return m ? `@${m[1]}` : c;
  },
  youtube: (c: string) => {
    try {
      const u = new URL(c.startsWith("http") ? c : `https://${c}`);
      if (u.pathname.startsWith("/watch")) return "YouTube Video";
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0]?.startsWith("@")) return parts[0];
      if (["channel", "c", "user"].includes(parts[0])) return `@${parts[1] ?? "Channel"}`;
    } catch { /* ignored */ }
    return "YouTube";
  },
  spotify: (c: string) => {
    const m = c.match(/spotify\.com\/(track|album|playlist|artist)\/[\w]+/);
    if (!m) return "Spotify";
    return m[1].charAt(0).toUpperCase() + m[1].slice(1);
  },
  discord: (c: string) => {
    if (c.includes("discord.gg") || c.includes("discord.com/invite")) return "Discord Server";
    return handleFrom(c, ["discord.com"]);
  },
  zoom: (c: string) => {
    const m = c.match(/\/j\/(\d+)/);
    return m ? `Meeting ${m[1]}` : "Zoom Meeting";
  },
  paypal: (c: string) => {
    const m = c.match(/paypal\.me\/([\w.]+)/);
    return m ? `paypal.me/${m[1]}` : "PayPal";
  },
  venmo: (c: string) => {
    const m = c.match(/venmo\.com\/(?:u\/)?([\w.]+)/);
    if (m) return `@${m[1]}`;
    return c.startsWith("@") ? c : `@${c}`;
  },
};

// ─── Master style registry ────────────────────────────────────────────────────
export const QR_TYPE_STYLES: Record<string, QrTypeStyle> = {
  // Text & URL
  text:    { icon: "document-text-outline", label: "Text",         gradient: P.slate,   openLabel: "Open"         },
  url:     { icon: "globe-outline",         label: "Website URL",  gradient: P.primary, openLabel: "Open Link"    },
  biolink: { icon: "link-outline",          label: "Bio Link",     gradient: P.primary, openLabel: "Open Link"    },

  // Contact
  contact: { icon: "person-circle-outline", label: "Contact Card", gradient: P.purple, openLabel: "Call / Email"  },
  mecard:  { icon: "person-outline",        label: "MeCard",       gradient: P.purple, openLabel: "Save Contact"  },

  // Communication
  email: { icon: "mail-outline",       label: "Email",        gradient: P.primary, openLabel: "Send Email"    },
  phone: { icon: "call-outline",       label: "Phone Number", gradient: P.safe,    openLabel: "Call Number"   },
  sms:   { icon: "chatbubble-outline", label: "SMS Message",  gradient: P.slate,   openLabel: "Send SMS"      },

  // WhatsApp
  whatsapp: {
    icon: "logo-whatsapp", label: "WhatsApp", gradient: P.whatsapp,
    openLabel: "Open WhatsApp", appScheme: "whatsapp://", webFallback: true,
  },

  // Social networks
  instagram: {
    icon: "logo-instagram", label: "Instagram", gradient: P.instagram,
    openLabel: "Open Instagram", appScheme: "instagram://", webFallback: true,
    extractDisplayValue: ext.instagram,
  },
  twitter: {
    icon: "logo-twitter", label: "Twitter / X", gradient: P.twitter,
    openLabel: "Open Twitter", appScheme: "twitter://", webFallback: true,
    extractDisplayValue: ext.twitter,
  },
  youtube: {
    icon: "logo-youtube", label: "YouTube", gradient: P.youtube,
    openLabel: "Open YouTube", appScheme: "youtube://", webFallback: true,
    extractDisplayValue: ext.youtube,
  },
  linkedin: {
    icon: "logo-linkedin", label: "LinkedIn", gradient: P.linkedin,
    openLabel: "Open LinkedIn", appScheme: "linkedin://", webFallback: true,
    extractDisplayValue: ext.linkedin,
  },
  telegram: {
    icon: "send-outline", label: "Telegram", gradient: P.telegram,
    openLabel: "Open Telegram", appScheme: "tg://", webFallback: true,
    extractDisplayValue: ext.telegram,
  },
  facebook: {
    icon: "logo-facebook", label: "Facebook", gradient: P.facebook,
    openLabel: "Open Facebook", appScheme: "fb://", webFallback: true,
    extractDisplayValue: ext.facebook,
  },
  spotify: {
    icon: "musical-notes-outline", label: "Spotify", gradient: P.spotify,
    openLabel: "Play on Spotify", appScheme: "spotify://", webFallback: true,
    extractDisplayValue: ext.spotify,
  },
  discord: {
    icon: "logo-discord", label: "Discord", gradient: P.discord,
    openLabel: "Open Discord", appScheme: "discord://", webFallback: true,
    extractDisplayValue: ext.discord,
  },
  tiktok: {
    icon: "musical-note-outline", label: "TikTok", gradient: P.tiktok,
    openLabel: "Open TikTok", appScheme: "tiktok://", webFallback: true,
    extractDisplayValue: ext.tiktok,
  },
  snapchat: {
    icon: "camera-outline", label: "Snapchat", gradient: P.snapchat,
    openLabel: "Open Snapchat", appScheme: "snapchat://", webFallback: true,
    extractDisplayValue: ext.snapchat,
  },
  social: { icon: "share-social-outline", label: "Social Profile", gradient: P.instagram, openLabel: "Open Profile" },

  // Payments & Finance
  payment:     { icon: "card-outline",           label: "Payment",        gradient: P.payment,  openLabel: "Open Payment"       },
  upi:         { icon: "card-outline",           label: "UPI Payment",    gradient: P.payment,  openLabel: "Open Payment"       },
  googlepay:   { icon: "card-outline",           label: "Google Pay",     gradient: P.payment,  openLabel: "Pay Now"            },
  paymentlink: { icon: "card-outline",           label: "Payment Link",   gradient: P.payment,  openLabel: "Pay Now"            },
  scantopay:   { icon: "qr-code-outline",        label: "Scan-to-Pay",   gradient: P.payment,  openLabel: "Pay Now"            },
  razorpay:    { icon: "card-outline",           label: "Razorpay",       gradient: P.razorpay, openLabel: "Pay Now"            },
  mobilepay:   { icon: "phone-portrait-outline", label: "Mobile Pay",     gradient: P.safe,     openLabel: "Open Payment App"   },
  crypto:      { icon: "logo-bitcoin",           label: "Crypto Address", gradient: P.crypto,   openLabel: "Open Wallet"        },
  paypal: {
    icon: "wallet-outline", label: "PayPal", gradient: P.paypal,
    openLabel: "Pay via PayPal", appScheme: "paypal://", webFallback: true,
    extractDisplayValue: ext.paypal,
  },
  venmo: {
    icon: "people-outline", label: "Venmo", gradient: P.venmo,
    openLabel: "Pay via Venmo", appScheme: "venmo://", webFallback: true,
    extractDisplayValue: ext.venmo,
  },

  // Productivity & Meetings
  zoom: {
    icon: "videocam-outline", label: "Zoom Meeting", gradient: P.zoom,
    openLabel: "Join Meeting", appScheme: "zoommtg://", webFallback: true,
    extractDisplayValue: ext.zoom,
  },
  calendar: { icon: "calendar-outline",  label: "Calendar Event", gradient: P.purple,  openLabel: "Add to Calendar"    },
  event:    { icon: "calendar-outline",  label: "Calendar Event", gradient: P.purple,  openLabel: "Add to Calendar"    },
  calendly: { icon: "calendar-outline",  label: "Calendly",       gradient: P.primary, openLabel: "Book Appointment"   },
  otp:      { icon: "lock-closed-outline", label: "OTP / 2FA",   gradient: P.safe,    openLabel: "Open Authenticator" },

  // Connectivity
  wifi:     { icon: "wifi-outline",     label: "Wi-Fi Network",  gradient: P.safe,    openLabel: "Connect to Wi-Fi" },
  location: { icon: "location-outline", label: "Location",       gradient: P.danger,  openLabel: "Open in Maps"     },

  // Business & Commerce
  reviewpage:    { icon: "star-outline",       label: "Review Page",      gradient: P.payment,  openLabel: "Leave a Review" },
  menucatalogue: { icon: "restaurant-outline", label: "Menu / Catalogue", gradient: P.danger,   openLabel: "View Menu"      },
  donation:      { icon: "heart-outline",      label: "Donation",         gradient: P.donation, openLabel: "Donate"         },
  google_maps:   { icon: "map-outline",        label: "Google Maps",      gradient: P.danger,   openLabel: "Open in Maps"   },

  // Apps & Media
  appdownload: { icon: "download-outline",    label: "App Download",  gradient: P.safe,   openLabel: "Download App"  },
  app:         { icon: "download-outline",    label: "App Link",      gradient: P.safe,   openLabel: "Open App"      },
  media:       { icon: "play-circle-outline", label: "Media",         gradient: P.purple, openLabel: "Play Media"    },
  document:    { icon: "document-outline",    label: "Document",      gradient: P.slate,  openLabel: "Open Document" },
  boarding:    { icon: "airplane-outline",    label: "Boarding Pass", gradient: P.teal,   openLabel: "View Pass"     },
  product:     { icon: "barcode-outline",     label: "Product",       gradient: P.slate,  openLabel: "View Product"  },
  encrypted:   { icon: "key-outline",         label: "Encrypted",     gradient: P.payment, openLabel: "Open"         },
};

const DEFAULT_STYLE: QrTypeStyle = {
  icon: "qr-code-outline",
  label: "QR Code",
  gradient: P.slate,
  openLabel: "Open",
};

/**
 * Resolve the best visual style for a given contentType + optional templateKey.
 * templateKey wins whenever it maps to a richer entry than contentType.
 * Falls back to DEFAULT_STYLE for any unrecognised type.
 */
export function getQrTypeStyle(contentType: string, templateKey?: string): QrTypeStyle {
  if (templateKey && QR_TYPE_STYLES[templateKey]) return QR_TYPE_STYLES[templateKey];
  return QR_TYPE_STYLES[contentType] ?? DEFAULT_STYLE;
}
