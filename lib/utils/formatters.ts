export function formatRelativeTime(isoStringOrTimestamp: string | number): string {
  const date = typeof isoStringOrTimestamp === "number"
    ? new Date(isoStringOrTimestamp)
    : new Date(isoStringOrTimestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 minute ago";
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return "1 hour ago";
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1 week ago";
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(days / 365);
  if (years === 1) return "1 year ago";
  return `${years} years ago`;
}

export function formatFirstName(name: string): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  return parts[0].length > 10 ? parts[0].substring(0, 9) + "…" : parts[0];
}

export function smartName(name: string): string {
  if (!name) return "User";
  const parts = name.trim().split(/\s+/);
  const first = parts[0];
  if (name.length <= 18) return name;
  if (first.length <= 18) return first;
  return first.substring(0, 16) + "…";
}

export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "..." : s;
}

// ─── Comprehensive content type metadata ────────────────────────────────────

export interface ContentTypeMeta {
  label: string;
  icon: string;
  color: string;
  gradient: [string, string];
}

const CT_META: Record<string, ContentTypeMeta> = {
  url:         { label: "URL",         icon: "link-outline",            color: "#1D4ED8", gradient: ["#1D4ED8", "#2563EB"] },
  text:        { label: "Text",        icon: "text-outline",            color: "#6B7280", gradient: ["#6B7280", "#9CA3AF"] },
  wifi:        { label: "WiFi",        icon: "wifi-outline",            color: "#059669", gradient: ["#059669", "#10B981"] },
  payment:     { label: "Payment",     icon: "card-outline",            color: "#D97706", gradient: ["#D97706", "#F59E0B"] },
  upi:         { label: "UPI",         icon: "card-outline",            color: "#D97706", gradient: ["#D97706", "#F59E0B"] },
  contact:     { label: "Contact",     icon: "person-circle-outline",   color: "#7C3AED", gradient: ["#7C3AED", "#8B5CF6"] },
  email:       { label: "Email",       icon: "mail-outline",            color: "#2563EB", gradient: ["#2563EB", "#3B82F6"] },
  phone:       { label: "Phone",       icon: "call-outline",            color: "#059669", gradient: ["#059669", "#10B981"] },
  sms:         { label: "SMS",         icon: "chatbubble-outline",      color: "#64748B", gradient: ["#64748B", "#94A3B8"] },
  location:    { label: "Location",    icon: "location-outline",        color: "#DC2626", gradient: ["#DC2626", "#EF4444"] },
  event:       { label: "Event",       icon: "calendar-outline",        color: "#7C3AED", gradient: ["#7C3AED", "#8B5CF6"] },
  calendar:    { label: "Event",       icon: "calendar-outline",        color: "#7C3AED", gradient: ["#7C3AED", "#8B5CF6"] },
  whatsapp:    { label: "WhatsApp",    icon: "logo-whatsapp",           color: "#16A34A", gradient: ["#16A34A", "#22C55E"] },
  instagram:   { label: "Instagram",   icon: "logo-instagram",          color: "#E1306C", gradient: ["#E1306C", "#F472B6"] },
  twitter:     { label: "Twitter",     icon: "logo-twitter",            color: "#1DA1F2", gradient: ["#1DA1F2", "#38BDF8"] },
  youtube:     { label: "YouTube",     icon: "logo-youtube",            color: "#DC2626", gradient: ["#DC2626", "#EF4444"] },
  linkedin:    { label: "LinkedIn",    icon: "logo-linkedin",           color: "#0A66C2", gradient: ["#0A66C2", "#2563EB"] },
  telegram:    { label: "Telegram",    icon: "send-outline",            color: "#0088CC", gradient: ["#0088CC", "#38BDF8"] },
  facebook:    { label: "Facebook",    icon: "logo-facebook",           color: "#1877F2", gradient: ["#1877F2", "#3B82F6"] },
  spotify:     { label: "Spotify",     icon: "musical-notes-outline",   color: "#1DB954", gradient: ["#1DB954", "#22C55E"] },
  discord:     { label: "Discord",     icon: "logo-discord",            color: "#5865F2", gradient: ["#5865F2", "#818CF8"] },
  tiktok:      { label: "TikTok",      icon: "musical-note-outline",    color: "#374151", gradient: ["#374151", "#6B7280"] },
  crypto:      { label: "Crypto",      icon: "logo-bitcoin",            color: "#D97706", gradient: ["#D97706", "#F59E0B"] },
  zoom:        { label: "Zoom",        icon: "videocam-outline",        color: "#2D8CFF", gradient: ["#2D8CFF", "#60A5FA"] },
  calendly:    { label: "Calendly",    icon: "calendar-outline",        color: "#006BFF", gradient: ["#006BFF", "#2563EB"] },
  app:         { label: "App",         icon: "download-outline",        color: "#059669", gradient: ["#059669", "#10B981"] },
  appdownload: { label: "App",         icon: "download-outline",        color: "#059669", gradient: ["#059669", "#10B981"] },
  document:    { label: "Document",    icon: "document-outline",        color: "#2563EB", gradient: ["#2563EB", "#3B82F6"] },
  media:       { label: "Media",       icon: "play-circle-outline",     color: "#7C3AED", gradient: ["#7C3AED", "#8B5CF6"] },
  otp:         { label: "OTP / 2FA",   icon: "lock-closed-outline",     color: "#059669", gradient: ["#059669", "#10B981"] },
  social:      { label: "Social",      icon: "share-social-outline",    color: "#E1306C", gradient: ["#E1306C", "#F472B6"] },
  encrypted:   { label: "Encrypted",   icon: "key-outline",             color: "#D97706", gradient: ["#D97706", "#F59E0B"] },
  boarding:    { label: "Boarding",    icon: "airplane-outline",        color: "#0088CC", gradient: ["#0088CC", "#38BDF8"] },
  product:     { label: "Product",     icon: "barcode-outline",         color: "#6B7280", gradient: ["#6B7280", "#9CA3AF"] },
};

export function getContentTypeMeta(type: string): ContentTypeMeta {
  return CT_META[type] ?? { label: "Text", icon: "document-text-outline", color: "#6B7280", gradient: ["#6B7280", "#9CA3AF"] };
}

export function getContentTypeIcon(type: string): string {
  return getContentTypeMeta(type).icon;
}

// ─── Comprehensive content-type detection ───────────────────────────────────

export function detectContentType(content: string): string {
  if (!content) return "text";
  const c = content.trim();
  const lower = c.toLowerCase();

  // Protocol schemes
  if (lower.startsWith("tel:") || lower.startsWith("callto:") || lower.startsWith("facetime:")) return "phone";
  if (lower.startsWith("mailto:")) return "email";
  if (lower.startsWith("wifi:") || c.startsWith("WIFI:")) return "wifi";
  if (lower.startsWith("geo:") || lower.startsWith("comgooglemaps://")) return "location";
  if (lower.startsWith("smsto:") || lower.startsWith("sms:")) return "sms";
  if (c.startsWith("BEGIN:VCARD") || lower.startsWith("mecard:")) return "contact";
  if (c.startsWith("BEGIN:VCALENDAR") || c.startsWith("BEGIN:VEVENT")) return "event";
  if (lower.startsWith("otpauth://")) return "otp";
  if (
    lower.startsWith("bitcoin:") || lower.startsWith("ethereum:") ||
    lower.startsWith("litecoin:") || lower.startsWith("monero:") ||
    lower.startsWith("solana:") || lower.startsWith("ripple:")
  ) return "crypto";
  if (
    lower.startsWith("upi://") || lower.startsWith("paytm://") ||
    lower.startsWith("phonepe://") || lower.startsWith("gpay://") ||
    lower.startsWith("tez://") || lower.startsWith("bhim://") ||
    lower.startsWith("wxp://") || lower.includes("upi://pay")
  ) return "payment";
  if (lower.startsWith("market://") || lower.startsWith("itms-apps://") || lower.startsWith("itms://")) return "appdownload";
  if (
    lower.startsWith("instagram://") || lower.startsWith("twitter://") ||
    lower.startsWith("fb://") || lower.startsWith("linkedin://") ||
    lower.startsWith("youtube://") || lower.startsWith("tg://") ||
    lower.startsWith("snapchat://") || lower.startsWith("tiktok://")
  ) return "social";

  // URL-based: detect service from hostname
  const isHttp = lower.startsWith("http://") || lower.startsWith("https://");
  if (isHttp) {
    try {
      const u = new URL(c);
      const h = u.hostname.replace(/^www\./, "").toLowerCase();
      if (h === "wa.me" || h === "api.whatsapp.com") return "whatsapp";
      if (h === "instagram.com" || h === "instagr.am") return "instagram";
      if (h === "twitter.com" || h === "x.com" || h === "t.co") return "twitter";
      if (h === "youtube.com" || h === "youtu.be" || h === "m.youtube.com") return "youtube";
      if (h === "linkedin.com" || h === "lnkd.in") return "linkedin";
      if (h === "t.me" || h === "telegram.me" || h === "telegram.dog") return "telegram";
      if (h === "facebook.com" || h === "fb.com" || h === "fb.me" || h === "m.facebook.com") return "facebook";
      if (h === "open.spotify.com" || h === "spotify.com") return "spotify";
      if (h === "discord.gg" || h === "discord.com" || h === "discordapp.com") return "discord";
      if (h === "tiktok.com" || h === "vm.tiktok.com") return "tiktok";
      if (h === "zoom.us" || h.endsWith(".zoom.us")) return "zoom";
      if (h === "calendly.com") return "calendly";
      if (h === "maps.google.com" || h === "goo.gl" || h === "maps.app.goo.gl") return "location";
      if (h === "apps.apple.com" || h === "play.google.com" || h === "appstore.com") return "appdownload";
      if (h === "paypal.me" || h === "paypal.com" || h === "rzp.io") return "payment";
      if (h === "paytm.com") return "payment";
      return "url";
    } catch {}
  }

  // Bare domain check
  try { new URL("https://" + c); return "url"; } catch {}
  return "text";
}

// ─── Smart display label from content ───────────────────────────────────────

export function getContentDisplayLabel(content: string, contentType?: string): string {
  const ct = contentType || detectContentType(content);
  switch (ct) {
    case "wifi": {
      const ssid = content.match(/S:([^;]+)/)?.[1];
      return ssid ? ssid : "Wi-Fi Network";
    }
    case "contact": {
      const fn = content.match(/FN:([^\r\n]+)/)?.[1]?.trim();
      if (fn) return fn;
      const n = content.match(/N:([^\r\n]+)/)?.[1]?.trim();
      return n || "Contact";
    }
    case "sms": return content.replace(/^SMSTO?:/i, "").split(":")[0].trim() || "SMS";
    case "phone": return content.replace(/^tel:/i, "").trim();
    case "email": return content.replace(/^mailto:/i, "").split("?")[0].trim();
    case "event": {
      const s = content.match(/SUMMARY:([^\r\n]+)/)?.[1]?.trim();
      return s || "Calendar Event";
    }
    case "payment": case "upi": {
      if (content.startsWith("upi://pay?")) {
        try {
          const p = new URLSearchParams(content.replace("upi://pay?", ""));
          return p.get("pn") || p.get("pa") || "UPI Payment";
        } catch {}
      }
      return "Payment QR";
    }
    case "crypto": {
      const coin = content.split(":")[0];
      return coin.charAt(0).toUpperCase() + coin.slice(1);
    }
    case "whatsapp": case "instagram": case "twitter": case "telegram":
    case "tiktok": case "facebook": case "discord": {
      try {
        const u = new URL(content.startsWith("http") ? content : `https://${content}`);
        const parts = u.pathname.replace(/^\//, "").replace(/\/$/, "").split("/");
        const handle = parts[parts.length - 1];
        if (handle && !handle.includes(".") && handle.length < 40) return "@" + handle;
      } catch {}
      return getContentTypeMeta(ct).label;
    }
    case "youtube": {
      try {
        const u = new URL(content.startsWith("http") ? content : `https://${content}`);
        const channel = u.pathname.replace(/^\/(c\/|channel\/|@)?/, "").replace(/\/$/, "");
        if (channel && channel !== "watch") return channel;
      } catch {}
      return "YouTube";
    }
    case "linkedin": {
      try {
        const u = new URL(content.startsWith("http") ? content : `https://${content}`);
        const profile = u.pathname.replace(/^\/(in\/|company\/)?/, "").replace(/\/$/, "");
        if (profile) return profile;
      } catch {}
      return "LinkedIn";
    }
    case "spotify": {
      try {
        const u = new URL(content.startsWith("http") ? content : `https://${content}`);
        const parts = u.pathname.split("/").filter(Boolean);
        if (parts.length >= 2) return parts[1].replace(/-/g, " ");
      } catch {}
      return "Spotify";
    }
    case "zoom": {
      if (content.includes("zoom.us/j/")) return "Meeting " + (content.split("/j/")[1]?.split("?")[0] || "");
      return "Zoom Meeting";
    }
    case "calendly": {
      try {
        const u = new URL(content.startsWith("http") ? content : `https://${content}`);
        const parts = u.pathname.replace(/^\//, "").split("/").filter(Boolean);
        return parts[0] ? "@" + parts[0] : "Calendly";
      } catch {}
      return "Calendly";
    }
    case "url": {
      try {
        const u = new URL(content.startsWith("http") ? content : `https://${content}`);
        const h = u.hostname.replace(/^www\./, "");
        const isPrivate = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|127\.|localhost)/.test(h);
        const isGuard = u.pathname.startsWith("/guard/");
        if (isPrivate || isGuard) return "Smart Redirect";
        return h;
      } catch {}
      return content.length > 36 ? content.slice(0, 36) + "…" : content;
    }
    default:
      return content.length > 40 ? content.slice(0, 40) + "…" : content;
  }
}

export function getContentSubtitle(content: string, contentType?: string): string | null {
  const ct = contentType || detectContentType(content);
  switch (ct) {
    case "url": {
      try {
        const u = new URL(content.startsWith("http") ? content : `https://${content}`);
        const h = u.hostname;
        const isPrivate = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|127\.|localhost)/.test(h);
        const isGuard = u.pathname.startsWith("/guard/");
        if (isPrivate || isGuard) return null;
        return content.length > 44 ? content.slice(0, 44) + "…" : content;
      } catch {}
      return null;
    }
    case "payment": case "upi": {
      if (content.startsWith("upi://pay?")) {
        try {
          const p = new URLSearchParams(content.replace("upi://pay?", ""));
          const vpa = p.get("pa");
          const name = p.get("pn");
          if (vpa && name) return vpa;
        } catch {}
      }
      return null;
    }
    case "wifi": {
      const sec = content.match(/T:([^;]+)/)?.[1] || "WPA";
      return sec === "nopass" ? "Open network" : sec + " secured";
    }
    case "contact": {
      const phone = content.match(/TEL[^:]*:([^\r\n]+)/)?.[1]?.trim();
      return phone || null;
    }
    case "sms": {
      const msg = content.split(":").slice(2).join(":");
      return msg.length > 44 ? msg.slice(0, 44) + "…" : msg || null;
    }
    case "email": {
      const parts = content.replace(/^mailto:/i, "").split("?");
      if (parts.length > 1) {
        const subject = new URLSearchParams(parts[1]).get("subject");
        return subject || null;
      }
      return null;
    }
    case "event": {
      const start = content.match(/DTSTART[^:]*:([^\r\n]+)/)?.[1]?.trim();
      if (start) {
        const y = start.slice(0, 4), mo = start.slice(4, 6), d = start.slice(6, 8);
        return `${d}/${mo}/${y}`;
      }
      return null;
    }
    case "whatsapp": case "telegram": {
      const msg = content.includes("?text=") ? decodeURIComponent(content.split("?text=")[1] || "") : null;
      return msg ? msg.slice(0, 44) + (msg.length > 44 ? "…" : "") : null;
    }
    case "zoom": {
      try {
        const u = new URL(content.startsWith("http") ? content : `https://${content}`);
        return u.hostname;
      } catch {}
      return "zoom.us";
    }
    case "crypto": {
      const addr = content.split(":")[1]?.split("?")[0];
      return addr ? addr.slice(0, 18) + "…" : null;
    }
    default:
      return null;
  }
}

export function getNotifIcon(type: string): string {
  if (type === "new_comment") return "chatbubble";
  if (type === "mention") return "at";
  if (type === "new_follow") return "person-add";
  return "warning";
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function extractPaymentName(content: string): string | null {
  if (!content) return null;
  try {
    const lower = content.toLowerCase();
    if (lower.includes("upi://")) {
      const url = new URL(content);
      const name = url.searchParams.get("pn") || url.searchParams.get("tn") || url.searchParams.get("pa");
      return name ? decodeURIComponent(name) : null;
    }
    const match = content.match(/[?&](pn|tn)=([^&]+)/);
    if (match) return decodeURIComponent(match[2]);
  } catch {}
  return null;
}

export function extractPaymentAmount(content: string): string | null {
  try {
    if (!content) return null;
    const url = new URL(content);
    const amount = url.searchParams.get("am");
    if (!amount) return null;
    return `₹${amount}`;
  } catch {
    return null;
  }
}
