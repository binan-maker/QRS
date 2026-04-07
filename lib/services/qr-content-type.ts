// ─── QR Content Type Classifier ──────────────────────────────────────────────
// Detects 20+ content types across every country and platform worldwide.
// Single responsibility: takes raw QR string → returns a content type string.
// No database access, no side-effects.

import { isPaymentQr } from "../qr-analysis";

export function detectContentType(content: string): string {
  if (!content) return "text";
  const t = content.trim();
  const lower = t.toLowerCase();

  // ── 1. PAYMENT — highest priority (UPI, all apps, crypto, EMV, SEPA, Pix…) ──
  if (isPaymentQr(t)) return "payment";

  // ── 2. STANDARD QR SCHEMES ──
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

  // ── 3. STANDARD TEXT FORMAT TYPES ──
  if (t.startsWith("BEGIN:VCARD") || lower.startsWith("mecard:") || lower.startsWith("mebkm:")) return "contact";
  if (t.startsWith("BEGIN:VCALENDAR") || t.startsWith("BEGIN:VEVENT")) return "event";

  // ── 4. SPECIAL DOCUMENT FORMATS ──
  if (/^M\d[A-Z ]{2,}/.test(t) && t.length > 40) return "boarding";
  if (/^\d{13}$/.test(t) || /^97[89]\d{10}$/.test(t)) return "product";
  if (/^\+?[\d\s\-().]{7,16}$/.test(t) && /\d{6,}/.test(t)) return "phone";
  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(lower)) return "email";

  // ── 5. URL ANALYSIS ──
  let url: URL | null = null;
  try { url = new URL(t); } catch {}

  if (url) {
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = url.pathname.toLowerCase();
    const scheme = url.protocol;

    if (scheme !== "http:" && scheme !== "https:") {
      const socialSchemes = new Set([
        "instagram:", "twitter:", "fb:", "facebook:", "linkedin:", "tiktok:",
        "snapchat:", "pinterest:", "reddit:", "tumblr:", "whatsapp:", "wa:",
        "tg:", "telegram:", "signal:", "discord:", "twitch:", "youtube:",
        "weibo:", "line:", "viber:", "kakaotalk:", "wechat:", "zalo:",
        "vk:", "ok:", "naver:", "band:", "kakao:",
      ]);
      if (socialSchemes.has(scheme)) return "social";
      return "app";
    }

    if (host === "play.google.com" && path.startsWith("/store")) return "app";
    if (host === "apps.apple.com") return "app";
    if (host === "appgallery.huawei.com") return "app";
    if (host === "www.amazon.com" && path.includes("/appstore")) return "app";
    if (host === "galaxy.store") return "app";
    if (host === "apps.microsoft.com") return "app";

    const SOCIAL = new Set([
      "instagram.com", "twitter.com", "x.com", "facebook.com", "fb.com",
      "linkedin.com", "tiktok.com", "youtube.com", "youtu.be",
      "snapchat.com", "pinterest.com", "reddit.com", "tumblr.com",
      "threads.net", "bsky.app", "mastodon.social",
      "wa.me", "t.me", "telegram.me", "discord.gg", "discord.com",
      "slack.com", "twitch.tv", "vk.com", "ok.ru",
      "weibo.com", "line.me", "viber.com", "naver.com",
      "band.us", "kakaostory.com",
      "clubhouse.com", "truth.social", "parler.com",
      "mewe.com", "minds.com", "gab.com",
    ]);
    if (SOCIAL.has(host) || [...SOCIAL].some((d) => host.endsWith("." + d))) return "social";

    const MAP_HOSTS = new Set([
      "maps.google.com", "google.com", "google.co.in", "goo.gl",
      "maps.apple.com", "waze.com", "bing.com",
      "here.com", "openstreetmap.org", "osm.org", "maps.me",
      "yandex.ru", "yandex.com", "2gis.ru", "2gis.com",
      "baidu.com", "amap.com", "gaode.com",
      "naver.com", "kakaomap.com", "mapy.cz",
    ]);
    const isMapHost = MAP_HOSTS.has(host) || [...MAP_HOSTS].some((d) => host.endsWith("." + d));
    const isMapPath = path.includes("/map") || path.includes("/dir") || path.includes("/place") || path.includes("/search");
    const isMapParam =
      url.searchParams.has("q") || url.searchParams.has("ll") || url.searchParams.has("center") ||
      url.searchParams.has("daddr") || url.searchParams.has("saddr") || url.searchParams.has("destination");
    if (isMapHost && (isMapPath || isMapParam)) return "location";

    const MEDIA = new Set([
      "youtube.com", "youtu.be", "music.youtube.com",
      "spotify.com", "open.spotify.com",
      "soundcloud.com", "deezer.com", "tidal.com",
      "netflix.com", "primevideo.com", "disneyplus.com", "hotstar.com",
      "hulu.com", "hbomax.com", "max.com", "appletv.apple.com",
      "jiocinema.com", "sonyliv.com", "zee5.com", "voot.com",
      "erosnow.com", "altbalaji.com", "mxplayer.in",
      "vimeo.com", "dailymotion.com", "twitch.tv",
      "bilibili.com", "iqiyi.com", "youku.com", "v.qq.com",
      "naver.com", "vlive.tv",
      "tving.com", "wavve.com", "watcha.com",
    ]);
    if (MEDIA.has(host) || [...MEDIA].some((d) => host.endsWith("." + d))) return "media";

    const EVENT_HOSTS = new Set([
      "eventbrite.com", "eventbrite.in",
      "meetup.com", "lu.ma", "luma.com",
      "airmeet.com", "hopin.com", "zoom.us",
      "bookmyshow.com", "ticketmaster.com", "paytm.com",
      "insider.in", "allevents.in",
    ]);
    if (EVENT_HOSTS.has(host) || [...EVENT_HOSTS].some((d) => host.endsWith("." + d))) return "event";

    const DOC_HOSTS = new Set([
      "docs.google.com", "drive.google.com", "sheets.google.com", "slides.google.com", "forms.google.com",
      "dropbox.com", "onedrive.live.com", "sharepoint.com",
      "notion.so", "airtable.com", "coda.io",
      "figma.com", "miro.com", "canva.com",
      "github.com", "gitlab.com", "bitbucket.org",
    ]);
    if (DOC_HOSTS.has(host) || [...DOC_HOSTS].some((d) => host.endsWith("." + d))) return "document";

    const MSG_HOSTS = new Set(["wa.me", "api.whatsapp.com", "chat.whatsapp.com"]);
    if (MSG_HOSTS.has(host)) return "social";

    return "url";
  }

  // ── 6. ENCRYPTED / PROPRIETARY DATA DETECTION ──
  // Base64-encoded data (e.g. election QR codes, government tokens, bank tokens)
  const isBase64Like = /^[A-Za-z0-9+/]{20,}={0,2}$/.test(t) && !t.includes(" ");
  // Pure hex blob (e.g. cryptographic hashes, hardware tokens)
  const isHexBlob = /^[0-9a-fA-F]{40,}$/.test(t);
  // High-entropy short token (URL-safe Base64 or JWT-like, no spaces, high char diversity)
  const charDiversity = new Set(t.replace(/[=.]/g, "").split("")).size;
  const isHighEntropy = t.length >= 24 && !t.includes(" ") && charDiversity >= 18 &&
    /^[A-Za-z0-9+/=_\-]+$/.test(t) && !/^[A-Za-z]+$/.test(t);
  if (isBase64Like || isHexBlob || isHighEntropy) return "encrypted";

  // ── 7. NON-URL PLAIN TEXT FALLBACK ──
  return "text";
}
