import type { GeneratedQrItem } from "@/services/generator";
import { getContentTypeMeta } from "@/shared/constants/content-types";

const GENERIC_CT = new Set(["text", "url", "link", "biolink", "social"]);

export function getEffectiveContentType(item: GeneratedQrItem): string {
  const stored   = (item as any).contentType   as string         || "text";
  const tmplKey  = (item as any).templateKey   as string | undefined;
  if (tmplKey && !GENERIC_CT.has(tmplKey)) return tmplKey;
  if (stored  && !GENERIC_CT.has(stored))  return stored;

  const displayDest = (item as any).displayDestination as string | null;
  const content     = item.content || "";
  const src         = displayDest || content;
  if (!src) return stored;

  if (src.startsWith("tel:"))                                             return "phone";
  if (src.startsWith("WIFI:"))                                            return "wifi";
  if (src.startsWith("upi://"))                                           return "upi";
  if (src.startsWith("BEGIN:VCALENDAR") || src.startsWith("BEGIN:VEVENT")) return "event";
  if (src.startsWith("BEGIN:VCARD"))                                      return "contact";
  if (src.startsWith("SMSTO:") || src.startsWith("sms:"))                return "sms";
  if (src.startsWith("mailto:"))                                          return "email";
  if (/^bitcoin:|^ethereum:|^litecoin:|^solana:/.test(src))              return "crypto";
  if (src.includes("wa.me") || src.includes("whatsapp.com"))             return "whatsapp";
  if (src.includes("instagram.com") || src.includes("instagr.am"))       return "instagram";
  if (src.includes("twitter.com") || src.includes("x.com/"))             return "twitter";
  if (src.includes("youtube.com") || src.includes("youtu.be"))           return "youtube";
  if (src.includes("linkedin.com"))                                       return "linkedin";
  if (src.includes("t.me/") || src.includes("telegram.me/"))             return "telegram";
  if (src.includes("facebook.com") || src.includes("fb.com"))            return "facebook";
  if (src.includes("open.spotify.com"))                                   return "spotify";
  if (src.includes("discord.gg") || src.includes("discord.com"))         return "discord";
  if (src.includes("tiktok.com"))                                         return "tiktok";
  if (src.includes("paypal.me") || src.includes("paypal.com/paypalme"))  return "paypal";
  if (src.includes("venmo.com"))                                          return "venmo";
  if (src.includes("rzp.io") || src.includes("razorpay.com"))            return "payment";
  if (src.includes("zoom.us"))                                            return "zoom";
  if (src.includes("calendly.com"))                                       return "calendly";
  if (src.includes("maps.google.com") || src.includes("goo.gl/maps") || src.includes("maps.app.goo.gl")) return "location";
  if (src.includes("apps.apple.com") || src.includes("play.google.com") || src.includes("appstore.com")) return "appdownload";
  if (/^[\w.\-+]+@[\w]+$/.test(src) && !/\.(com|in|org|net|io|co|app)$/.test(src.split("@")[1] || "")) return "upi";
  if (/^\+?[\d]{7,15}$/.test(src.replace(/[\s\-()]/g, ""))) return "phone";

  const withScheme = src.startsWith("http") ? src : `https://${src}`;
  try {
    const u = new URL(withScheme);
    const h = u.hostname;
    if (h.includes(".") && h.length >= 4
      && !/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|127\.|localhost)/.test(h)
      && !u.pathname.startsWith("/guard/") && !u.pathname.startsWith("/go/"))
      return "url";
  } catch {}
  return stored;
}

export function extractSocialHandle(url: string, prefix = "@"): string | null {
  try {
    const u     = new URL(url.startsWith("http") ? url : `https://${url}`);
    const parts = u.pathname.replace(/\/$/, "").split("/").filter(Boolean);
    const last  = parts[parts.length - 1] || "";
    if (last && !last.includes(".") && last.length > 0) return prefix + last.replace(/^@/, "");
  } catch {}
  return null;
}

export function getDisplayText(item: GeneratedQrItem, index: number): string {
  if (item.label?.trim())        return item.label.trim();
  if (item.businessName?.trim()) return item.businessName.trim();

  const ct = getEffectiveContentType(item);
  const c  = (item as any).displayDestination || item.content || "";

  if (ct === "wifi") {
    const ssid = c.match(/S:([^;]*)/)?.[1];
    if (ssid) return ssid;
  }
  if (ct === "contact") {
    const name = c.match(/FN:([^\r\n]+)/)?.[1] || c.match(/MECARD:N:([^;]+)/)?.[1];
    if (name) return name.trim();
  }
  if (ct === "email")  return c.replace(/^mailto:/i, "").split("?")[0] || c;
  if (ct === "phone")  return c.replace(/^(tel:|callto:)/i, "").trim();
  if (ct === "whatsapp") {
    try {
      const u = new URL(c.startsWith("http") ? c : `https://${c}`);
      const p = u.pathname.replace(/^\//, "").replace(/\D/g, "");
      if (p) return `+${p}`;
    } catch {}
  }
  if (ct === "sms") return c.replace(/^SMSTO?:/i, "").split(":")[0].trim() || c;
  if (ct === "crypto") {
    const m = c.match(/^(bitcoin|ethereum|litecoin|solana):([^?]{6,})/i);
    if (m) return `${m[1].charAt(0).toUpperCase() + m[1].slice(1)}: ${m[2].slice(0, 14)}…`;
  }
  if (ct === "calendar" || ct === "event") {
    const summary = c.match(/SUMMARY:([^\r\n]+)/)?.[1];
    if (summary) return summary.trim();
  }
  if (ct === "location") {
    const q = c.match(/[?&]q=([^&\n]+)/)?.[1];
    if (q) return decodeURIComponent(q);
    const geo = c.replace(/^geo:/i, "").split("?")[0];
    if (geo && geo !== c) return `Location (${geo})`;
  }
  if (["upi", "scantopay", "bharatqr"].includes(ct)) {
    if (c.startsWith("upi://pay?")) {
      try {
        const pa = new URLSearchParams(c.replace("upi://pay?", "")).get("pa");
        if (pa) return pa;
      } catch {}
    }
    if (/^[\w.\-+]+@[\w]+$/.test(c)) return c;
  }
  if (["paymentlink", "payment", "razorpay"].includes(ct)) {
    if (c.startsWith("http")) {
      try { return new URL(c).hostname.replace(/^www\./, ""); } catch {}
    }
    const vpa = c.match(/pa=([^&\s]+)/i)?.[1];
    if (vpa) return decodeURIComponent(vpa);
  }
  if (["instagram", "twitter", "telegram", "snapchat"].includes(ct)) {
    const handle = extractSocialHandle(c);
    if (handle) return handle;
  }
  if (ct === "tiktok") {
    const handle = c.replace(/.*tiktok\.com\/@?/, "").replace(/\/$/, "");
    if (handle && !handle.includes(".")) return "@" + handle.replace(/^@/, "");
  }
  if (ct === "youtube") {
    try {
      const u     = new URL(c.startsWith("http") ? c : `https://${c}`);
      const parts = u.pathname.replace(/\/$/, "").split("/").filter(Boolean);
      const special = ["c", "channel", "user"];
      const name  = special.includes(parts[0]) ? parts[1] || parts[0] : parts[0];
      if (name) return "@" + name.replace(/^@/, "");
    } catch {}
  }
  if (["linkedin", "facebook", "discord"].includes(ct)) {
    const handle = extractSocialHandle(c, "");
    if (handle) return handle;
  }
  if (ct === "spotify") {
    try {
      const u     = new URL(c.startsWith("http") ? c : `https://${c}`);
      const parts = u.pathname.replace(/\/$/, "").split("/").filter(Boolean);
      if (parts[1]) return parts[1];
    } catch {}
  }
  if (["reviewpage", "googlereview"].includes(ct))        return "Google Review Page";
  if (["menucatalogue", "restaurantmenu"].includes(ct))   return "Menu / Catalogue";
  if (ct === "donation")                                   return "Donation Link";
  if (ct === "paypal") {
    const me = c.match(/paypal\.me\/([^/?#]+)/i);
    return me ? "PayPal: " + me[1] : "PayPal";
  }
  if (ct === "venmo") {
    const me = c.match(/venmo\.com\/(?:u\/)?([^/?#]+)/i);
    return me ? "Venmo: " + me[1] : "Venmo";
  }
  if (ct === "appdownload") return "App Download";
  if (ct === "calendly") {
    try {
      const u     = new URL(c.startsWith("http") ? c : `https://${c}`);
      const parts = u.pathname.replace(/\/$/, "").split("/").filter(Boolean);
      if (parts[0]) return "Calendly: " + parts[0];
    } catch {}
    return "Calendly";
  }
  if (ct === "zoom") {
    if (c.includes("zoom.us/j/"))
      return "Meeting " + (c.split("/j/")[1]?.split("?")[0] || "");
    return "Zoom Meeting";
  }
  if (c.startsWith("http")) {
    try { return new URL(c).hostname.replace(/^www\./, ""); } catch {}
  }
  return `QR Code ${index + 1}`;
}

export { getContentTypeMeta };
