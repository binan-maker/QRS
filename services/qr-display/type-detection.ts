const GENERIC_STORED = new Set(["text", "url", "link", "biolink", "social"]);

export function getDetailContentType(item: any): string {
  const stored = (item.contentType as string) || "text";
  const templateKey = (item.templateKey as string) || "";
  if (templateKey && !GENERIC_STORED.has(templateKey)) return templateKey;
  if (stored && !GENERIC_STORED.has(stored)) return stored;
  const displayDest = item.displayDestination as string | null;
  const content = (item.content as string) || "";
  const src = displayDest || content;
  if (!src) return stored;
  if (src.startsWith("tel:")) return "phone";
  if (src.startsWith("WIFI:")) return "wifi";
  if (src.startsWith("upi://")) return "upi";
  if (src.startsWith("BEGIN:VCALENDAR") || src.startsWith("BEGIN:VEVENT")) return "event";
  if (src.startsWith("BEGIN:VCARD")) return "contact";
  if (src.startsWith("SMSTO:") || src.startsWith("sms:")) return "sms";
  if (src.startsWith("mailto:")) return "email";
  if (/^bitcoin:|^ethereum:|^litecoin:|^solana:/.test(src)) return "crypto";
  if (src.includes("wa.me") || src.includes("whatsapp.com")) return "whatsapp";
  if (src.includes("instagram.com") || src.includes("instagr.am")) return "instagram";
  if (src.includes("twitter.com") || src.includes("x.com/")) return "twitter";
  if (src.includes("youtube.com") || src.includes("youtu.be")) return "youtube";
  if (src.includes("linkedin.com")) return "linkedin";
  if (src.includes("t.me/") || src.includes("telegram.me/")) return "telegram";
  if (src.includes("facebook.com") || src.includes("fb.com")) return "facebook";
  if (src.includes("open.spotify.com")) return "spotify";
  if (src.includes("discord.gg") || src.includes("discord.com")) return "discord";
  if (src.includes("tiktok.com")) return "tiktok";
  if (src.includes("paypal.me") || src.includes("paypal.com/paypalme")) return "paypal";
  if (src.includes("venmo.com")) return "venmo";
  if (src.includes("zoom.us")) return "zoom";
  if (src.includes("calendly.com")) return "calendly";
  if (src.includes("maps.google.com") || src.includes("goo.gl/maps") || src.includes("maps.app.goo.gl")) return "location";
  if (src.includes("apps.apple.com") || src.includes("play.google.com") || src.includes("appstore.com")) return "appdownload";
  if (src.includes("rzp.io") || src.includes("razorpay.com") || src.includes("paytm.com/pay")) return "paymentlink";
  if (/^[\w.\-+]+@[\w]{2,}$/.test(src) && !/\.(com|in|org|net|io|co|app)$/.test(src.split("@")[1] || "")) return "upi";
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
