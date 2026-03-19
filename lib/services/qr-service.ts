import { db, rtdb } from "../db";
import { isPaymentQr } from "../qr-analysis";
import * as Crypto from "expo-crypto";
import { tsToString } from "./utils";
import { calculateTrustScore } from "./trust-service";
import { getQrReportCounts, getQrWeightedReportCounts, getUserQrReport } from "./report-service";
import { isUserFollowingQrCode, getFollowCount } from "./follow-service";
import { isUserFavorite } from "./user-service";
import type { QrCodeData, TrustScore } from "./types";

export { SIGNATURE_SALT } from "./types";
export type { QrCodeData, TrustScore };

// ─── Comprehensive global QR content type classifier ────────────────────────
// Detects 20+ content types across every country and platform worldwide.
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
  if (lower.startsWith("market://") || lower.startsWith("itms://") ||
      lower.startsWith("itms-appss://") || lower.startsWith("itms-apps://") ||
      lower.startsWith("appgallery://")) return "app";

  // ── 3. STANDARD TEXT FORMAT TYPES ──
  // vCard (universal business card standard)
  if (t.startsWith("BEGIN:VCARD") || lower.startsWith("mecard:") || lower.startsWith("mebkm:")) return "contact";
  // iCalendar / VCALENDAR events (meetings, appointments)
  if (t.startsWith("BEGIN:VCALENDAR") || t.startsWith("BEGIN:VEVENT")) return "event";

  // ── 4. SPECIAL DOCUMENT FORMATS ──
  // IATA BCBP boarding pass (M1 = 1 segment, M2 = 2 segments…)
  if (/^M\d[A-Z ]{2,}/.test(t) && t.length > 40) return "boarding";
  // ISBN / product barcode (13 digits = EAN-13; book ISBNs may be prefixed)
  if (/^\d{13}$/.test(t) || /^97[89]\d{10}$/.test(t)) return "product";
  // Plain phone number (no scheme) — international formats, Indian mobile, etc.
  if (/^\+?[\d\s\-().]{7,16}$/.test(t) && /\d{6,}/.test(t)) return "phone";
  // Plain email address (no scheme)
  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(lower)) return "email";

  // ── 5. URL ANALYSIS ──
  let url: URL | null = null;
  try { url = new URL(t); } catch {}

  if (url) {
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = url.pathname.toLowerCase();
    const scheme = url.protocol;

    // Non-http schemes = app deep links or social deep links
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

    // ── App Stores ──
    if (host === "play.google.com" && path.startsWith("/store")) return "app";
    if (host === "apps.apple.com") return "app";
    if (host === "appgallery.huawei.com") return "app";
    if (host === "www.amazon.com" && path.includes("/appstore")) return "app";
    if (host === "galaxy.store") return "app";
    if (host === "apps.microsoft.com") return "app";

    // ── Social Media ──
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

    // ── Maps & Location ──
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
    const isMapParam = url.searchParams.has("q") || url.searchParams.has("ll") || url.searchParams.has("center") ||
      url.searchParams.has("daddr") || url.searchParams.has("saddr") || url.searchParams.has("destination");
    if (isMapHost && (isMapPath || isMapParam)) return "location";

    // ── Streaming / Media ──
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

    // ── Events & Calendars ──
    const EVENT_HOSTS = new Set([
      "eventbrite.com", "eventbrite.in",
      "meetup.com", "lu.ma", "luma.com",
      "airmeet.com", "hopin.com", "zoom.us",
      "bookmyshow.com", "ticketmaster.com", "paytm.com",
      "insider.in", "allevents.in",
    ]);
    if (EVENT_HOSTS.has(host) || [...EVENT_HOSTS].some((d) => host.endsWith("." + d))) return "event";

    // ── Documents & Files ──
    const DOC_HOSTS = new Set([
      "docs.google.com", "drive.google.com", "sheets.google.com", "slides.google.com", "forms.google.com",
      "dropbox.com", "onedrive.live.com", "sharepoint.com",
      "notion.so", "airtable.com", "coda.io",
      "figma.com", "miro.com", "canva.com",
      "github.com", "gitlab.com", "bitbucket.org",
    ]);
    if (DOC_HOSTS.has(host) || [...DOC_HOSTS].some((d) => host.endsWith("." + d))) return "document";

    // ── Messaging Platforms (not social profiles) ──
    const MSG_HOSTS = new Set(["wa.me", "api.whatsapp.com", "chat.whatsapp.com"]);
    if (MSG_HOSTS.has(host)) return "social";

    // ── URL shorteners and everything else → generic url ──
    return "url";
  }

  // ── 6. NON-URL PLAIN TEXT FALLBACK ──
  return "text";
}

export async function getQrCodeId(content: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, content);
  return hash.slice(0, 20);
}

export async function getOrCreateQrCode(content: string): Promise<QrCodeData> {
  const qrId = await getQrCodeId(content);
  const contentType = detectContentType(content);
  const fallback: QrCodeData = {
    id: qrId, content, contentType,
    createdAt: new Date().toISOString(),
    scanCount: 0, commentCount: 0,
  };
  try {
    const data = await db.get(["qrCodes", qrId]);
    if (data) {
      return {
        id: qrId,
        content: data.content || content,
        contentType: data.contentType || detectContentType(data.content || content),
        createdAt: tsToString(data.createdAt),
        scanCount: data.scanCount || 0,
        commentCount: data.commentCount || 0,
        ownerId: data.ownerId,
        ownerName: data.ownerName,
        brandedUuid: data.brandedUuid,
        isBranded: data.isBranded || false,
        signature: data.signature,
        ownerVerified: data.ownerVerified || false,
      };
    }
    await db.set(["qrCodes", qrId], {
      content, contentType,
      createdAt: db.timestamp(),
      scanCount: 0, commentCount: 0,
    });
  } catch (e) {
    console.warn("[db] getOrCreateQrCode failed:", e);
  }
  return fallback;
}

export async function getQrCodeById(qrId: string): Promise<QrCodeData | null> {
  try {
    const data = await db.get(["qrCodes", qrId]);
    if (!data) return null;
    return {
      id: qrId,
      content: data.content,
      contentType: data.contentType,
      createdAt: tsToString(data.createdAt),
      scanCount: data.scanCount || 0,
      commentCount: data.commentCount || 0,
    };
  } catch (e) {
    console.warn("[db] getQrCodeById failed:", e);
    return null;
  }
}

export function subscribeToQrStats(
  qrId: string,
  onUpdate: (data: { scanCount: number; commentCount: number }) => void
): () => void {
  return db.onDoc(["qrCodes", qrId], (data) => {
    if (data) onUpdate({ scanCount: data.scanCount || 0, commentCount: data.commentCount || 0 });
  });
}

export async function recordScan(
  qrId: string,
  content: string,
  contentType: string,
  userId: string | null,
  isAnonymous: boolean
): Promise<void> {
  try {
    await db.increment(["qrCodes", qrId], "scanCount", 1);
  } catch (e) {
    console.warn("[db] recordScan: failed to increment scanCount:", e);
  }
  if (userId && !isAnonymous) {
    try {
      await db.add(["users", userId, "scans"], {
        qrCodeId: qrId, content, contentType,
        isAnonymous: false, scannedAt: db.timestamp(),
      });
    } catch {}
  }
  try {
    await rtdb.push(`qrScanVelocity/${qrId}`, { ts: Date.now() });
  } catch {}
}

export async function getUserScans(userId: string): Promise<any[]> {
  const { docs } = await db.query(
    ["users", userId, "scans"],
    { orderBy: { field: "scannedAt", direction: "desc" }, limit: 100 }
  );
  return docs.map((d) => ({
    id: d.id,
    ...d.data,
    scannedAt: tsToString(d.data.scannedAt),
  }));
}

export async function getUserScansPaginated(
  userId: string,
  pageSize: number = 20,
  cursor?: any
): Promise<{ items: any[]; cursor: any; hasMore: boolean }> {
  const { docs, cursor: newCursor } = await db.query(
    ["users", userId, "scans"],
    { orderBy: { field: "scannedAt", direction: "desc" }, limit: pageSize + 1, cursor }
  );
  const hasMore = docs.length > pageSize;
  const items = hasMore ? docs.slice(0, pageSize) : docs;
  return {
    items: items.map((d) => ({ id: d.id, ...d.data, scannedAt: tsToString(d.data.scannedAt) })),
    cursor: items.length > 0 ? newCursor : null,
    hasMore,
  };
}

export async function loadQrDetail(qrId: string, userId: string | null) {
  const qrCode = await getQrCodeById(qrId);
  if (!qrCode) return null;

  let reportCounts: Record<string, number> = {};
  let weightedCounts: Record<string, number> = {};
  let followCount = 0;
  let collusionFlags = { suspicious: false, safeWeightMultiplier: 1, negativeWeightMultiplier: 1 };
  try {
    const [rc, wc, fc, qrDoc] = await Promise.all([
      getQrReportCounts(qrId),
      getQrWeightedReportCounts(qrId),
      getFollowCount(qrId),
      db.get(["qrCodes", qrId]),
    ]);
    reportCounts = rc;
    weightedCounts = wc;
    followCount = fc;
    if (qrDoc?.suspiciousVoteFlag) {
      collusionFlags = {
        suspicious: true,
        safeWeightMultiplier: qrDoc.suspiciousSafeMultiplier ?? 1,
        negativeWeightMultiplier: qrDoc.suspiciousNegMultiplier ?? 1,
      };
    }
  } catch {}

  const trustScore = calculateTrustScore(reportCounts, weightedCounts, collusionFlags);
  let userReport: string | null = null;
  let isFavorite = false;
  let isFollowing = false;

  if (userId) {
    try {
      [userReport, isFavorite, isFollowing] = await Promise.all([
        getUserQrReport(qrId, userId),
        isUserFavorite(qrId, userId),
        isUserFollowingQrCode(qrId, userId),
      ]);
    } catch {}
  }

  return {
    qrCode,
    reportCounts,
    totalScans: qrCode.scanCount,
    totalComments: qrCode.commentCount,
    trustScore,
    followCount,
    userReport,
    isFavorite,
    isFollowing,
  };
}
