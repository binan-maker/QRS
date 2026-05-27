/**
 * QR ENGINE — CANONICAL CONTENT-TYPE DETECTOR
 * ─────────────────────────────────────────────────────────────────────────────
 * Single implementation of detectContentType for the entire app.
 *
 * This replaces:
 *   • services/qr-content-type.ts   (now a 1-line re-export shim)
 *   • shared/utils/formatters/content-type.ts detectContentType (removed)
 *
 * Covers 25+ scheme types, 100+ hostname patterns, boarding pass, product
 * barcodes, encrypted blobs, and high-entropy tokens.
 *
 * NO external imports — this file must remain dependency-free so that
 * services/ can safely re-export it without any circular-dep risk.
 */

// ─── Payment detection (inline — avoids importing from services/analysis) ─────
function _isPaymentContent(t: string): boolean {
  const lower = t.toLowerCase();
  // UPI and Indian payment apps
  if (
    lower.startsWith("upi://") || lower.startsWith("paytm://") ||
    lower.startsWith("phonepe://") || lower.startsWith("gpay://") ||
    lower.startsWith("tez://") || lower.startsWith("bhim://") ||
    lower.startsWith("wxp://") || lower.startsWith("cred://") ||
    lower.startsWith("freecharge://") || lower.startsWith("mobikwik://") ||
    lower.startsWith("airtel://")
  ) return true;
  // EMV / BharatQR / CPS standards
  if (t.startsWith("000201") || t.startsWith("00020")) return true;
  // UPI pay URL embedded
  if (t.includes("upi://pay?")) return true;
  // SEPA / international payment schemes
  if (lower.startsWith("bcd\n") || lower.startsWith("sepa:")) return true;
  // PayNow (Singapore), PromptPay (Thailand), etc.
  if (lower.startsWith("paynow:") || lower.startsWith("promptpay:") ||
      lower.startsWith("duitnow:") || lower.startsWith("fawrypay:")) return true;
  // VPA / UPI ID standalone (xxx@yyy)
  if (/^[\w.\-+]+@[\w]+$/.test(t) && !t.includes(".") && t.length < 50) return true;
  return false;
}

export function detectContentType(content: string): string {
  if (!content) return "text";
  const t     = content.trim();
  const lower = t.toLowerCase();

  // ── 1. PAYMENT (highest priority) ─────────────────────────────────────────
  if (_isPaymentContent(t)) return "payment";

  // ── 2. STANDARD SCHEMES ───────────────────────────────────────────────────
  if (lower.startsWith("tel:") || lower.startsWith("callto:") || lower.startsWith("facetime:")) return "phone";
  if (lower.startsWith("mailto:") || lower.startsWith("matmsg:")) return "email";
  if (t.startsWith("WIFI:") || lower.startsWith("wifi:")) return "wifi";
  if (lower.startsWith("geo:") || lower.startsWith("maps:") || lower.startsWith("comgooglemaps://")) return "location";
  if (lower.startsWith("sms:") || lower.startsWith("smsto:") || lower.startsWith("mms:") || lower.startsWith("mmsto:")) return "sms";
  if (lower.startsWith("otpauth://")) return "otp";

  // App store deep links
  if (
    lower.startsWith("market://") || lower.startsWith("itms://") ||
    lower.startsWith("itms-appss://") || lower.startsWith("itms-apps://") ||
    lower.startsWith("appgallery://")
  ) return "app";

  // ── 3. STRUCTURED TEXT FORMATS ────────────────────────────────────────────
  if (t.startsWith("BEGIN:VCARD") || lower.startsWith("mecard:") || lower.startsWith("mebkm:")) return "contact";
  if (t.startsWith("BEGIN:VCALENDAR") || t.startsWith("BEGIN:VEVENT")) return "event";

  // ── 4. SPECIAL DATA FORMATS ───────────────────────────────────────────────
  if (/^M\d[A-Z ]{2,}/.test(t) && t.length > 40) return "boarding";           // IATA boarding
  if (/^\d{13}$/.test(t) || /^97[89]\d{10}$/.test(t)) return "product";       // EAN-13 / ISBN-13
  if (/^\+?[\d\s\-().]{7,16}$/.test(t) && /\d{6,}/.test(t)) return "phone";  // plain phone number
  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(t)) return "email";               // plain email address

  // ── 5. URL ANALYSIS ───────────────────────────────────────────────────────
  let url: URL | null = null;
  try { url = new URL(t); } catch {}

  if (url) {
    const host   = url.hostname.toLowerCase().replace(/^www\./, "");
    const path   = url.pathname.toLowerCase();
    const scheme = url.protocol;

    // Non-http schemes
    if (scheme !== "http:" && scheme !== "https:") {
      if (scheme === "whatsapp:" || scheme === "wa:") return "whatsapp";
      const socialSchemes = new Set([
        "instagram:", "twitter:", "fb:", "facebook:", "linkedin:", "tiktok:",
        "snapchat:", "pinterest:", "reddit:", "tumblr:", "tg:", "telegram:",
        "signal:", "discord:", "twitch:", "youtube:", "weibo:", "line:",
        "viber:", "kakaotalk:", "wechat:", "zalo:", "vk:", "ok:", "naver:",
        "band:", "kakao:", "spotify:",
      ]);
      if (socialSchemes.has(scheme)) return "social";
      return "app";
    }

    // App stores
    if (host === "play.google.com" && path.startsWith("/store")) return "app";
    if (host === "apps.apple.com") return "app";
    if (host === "appgallery.huawei.com" || host === "galaxy.store" || host === "apps.microsoft.com") return "app";

    // WhatsApp
    const WHATSAPP = new Set(["wa.me", "api.whatsapp.com", "chat.whatsapp.com", "web.whatsapp.com"]);
    if (WHATSAPP.has(host) || [...WHATSAPP].some((d) => host.endsWith(`.${d}`))) return "whatsapp";

    // Specific social/platform hosts
    if (host === "instagram.com" || host === "instagr.am")                    return "instagram";
    if (host === "twitter.com" || host === "x.com" || host === "t.co")       return "twitter";
    if (host === "youtube.com" || host === "youtu.be" || host === "music.youtube.com") return "youtube";
    if (host === "linkedin.com" || host === "lnkd.in")                       return "linkedin";
    if (host === "t.me" || host === "telegram.me" || host === "telegram.dog") return "telegram";
    if (host === "facebook.com" || host === "fb.com" || host === "fb.me" || host === "m.facebook.com") return "facebook";
    if (host === "open.spotify.com" || host === "spotify.com")               return "spotify";
    if (host === "discord.gg" || host === "discord.com" || host === "discordapp.com") return "discord";
    if (host === "tiktok.com" || host === "vm.tiktok.com")                   return "tiktok";
    if (host === "snapchat.com" || host === "story.snapchat.com")             return "snapchat";
    if (host === "zoom.us" || host.endsWith(".zoom.us"))                     return "zoom";
    if (host === "calendly.com")                                              return "calendly";
    if (host === "rzp.io" || host === "razorpay.com")                        return "razorpay";
    if (host === "paypal.me" || host === "paypal.com")                       return "paypal";
    if (host === "venmo.com")                                                 return "venmo";
    if (host === "paytm.com")                                                 return "payment";

    // Payment / finance domains
    const PAYMENT_HOSTS = new Set([
      "paypal.me", "paypal.com", "venmo.com", "rzp.io", "paytm.com",
      "phonepe.com", "gpay.app.goo.gl",
    ]);
    if (PAYMENT_HOSTS.has(host)) return "payment";

    // Social (broad)
    const SOCIAL_HOSTS = new Set([
      "twitter.com", "x.com", "facebook.com", "fb.com", "linkedin.com",
      "tiktok.com", "youtube.com", "youtu.be", "snapchat.com",
      "pinterest.com", "reddit.com", "tumblr.com", "threads.net",
      "bsky.app", "mastodon.social", "slack.com", "twitch.tv",
      "vk.com", "ok.ru", "weibo.com", "line.me", "viber.com",
      "naver.com", "band.us", "kakaostory.com", "clubhouse.com",
      "truth.social", "mewe.com", "minds.com", "gab.com",
    ]);
    if (SOCIAL_HOSTS.has(host) || [...SOCIAL_HOSTS].some((d) => host.endsWith(`.${d}`))) return "social";

    // Maps
    const MAP_HOSTS = new Set([
      "maps.google.com", "google.com", "google.co.in", "goo.gl",
      "maps.apple.com", "waze.com", "bing.com", "here.com",
      "openstreetmap.org", "osm.org", "maps.me", "yandex.ru",
      "2gis.ru", "baidu.com", "amap.com", "naver.com", "kakaomap.com",
    ]);
    const isMapHost  = MAP_HOSTS.has(host) || [...MAP_HOSTS].some((d) => host.endsWith(`.${d}`));
    const isMapPath  = path.includes("/map") || path.includes("/dir") || path.includes("/place");
    const isMapParam = url.searchParams.has("q") || url.searchParams.has("ll") || url.searchParams.has("destination");
    if (isMapHost && (isMapPath || isMapParam)) return "location";
    if (host === "maps.app.goo.gl") return "location";

    // Media
    const MEDIA_HOSTS = new Set([
      "open.spotify.com", "spotify.com", "soundcloud.com", "deezer.com",
      "tidal.com", "netflix.com", "primevideo.com", "disneyplus.com",
      "hotstar.com", "hulu.com", "max.com", "jiocinema.com", "sonyliv.com",
      "zee5.com", "voot.com", "vimeo.com", "dailymotion.com", "twitch.tv",
      "bilibili.com", "iqiyi.com",
    ]);
    if (MEDIA_HOSTS.has(host) || [...MEDIA_HOSTS].some((d) => host.endsWith(`.${d}`))) return "media";

    // Documents / dev tools
    const DOC_HOSTS = new Set([
      "docs.google.com", "drive.google.com", "sheets.google.com",
      "slides.google.com", "forms.google.com", "dropbox.com",
      "onedrive.live.com", "sharepoint.com", "notion.so", "airtable.com",
      "coda.io", "figma.com", "miro.com", "canva.com",
      "github.com", "gitlab.com", "bitbucket.org",
    ]);
    if (DOC_HOSTS.has(host) || [...DOC_HOSTS].some((d) => host.endsWith(`.${d}`))) return "document";

    // Review / business
    if (path.includes("maps/place") || host === "g.page") return "reviewpage";

    return "url";
  }

  // ── 6. ENCRYPTED / HIGH-ENTROPY DETECTION ─────────────────────────────────
  const isBase64Like  = /^[A-Za-z0-9+/]{20,}={0,2}$/.test(t) && !t.includes(" ");
  const isHexBlob     = /^[0-9a-fA-F]{40,}$/.test(t);
  const charDiversity = new Set(t.replace(/[=.]/g, "").split("")).size;
  const isHighEntropy = t.length >= 24 && !t.includes(" ") && charDiversity >= 18 &&
                        /^[A-Za-z0-9+/=_\-]+$/.test(t) && !/^[A-Za-z]+$/.test(t);
  if (isBase64Like || isHexBlob || isHighEntropy) return "encrypted";

  // ── 7. PLAIN TEXT FALLBACK ────────────────────────────────────────────────
  return "text";
}
