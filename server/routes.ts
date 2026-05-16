import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { decodeQrFromImage } from "./image-decode";
import { registerDonationRoutes } from "./routes/donation";
import { registerSafeBrowsingRoute } from "./routes/safe-browsing";
import { registerQrActiveRoute } from "./routes/qr-active";
import { validateEmail } from "../lib/utils/email-validator";
import { validateQrContent } from "../lib/analysis/qr-validator";

// ─── Rate Limiter (Redis-backed for serverless deployments) ─────────────────
// CRITICAL SECURITY FIX: File-based rate limiting fails in serverless environments
// (Vercel, Netlify, Cloudflare Workers) where filesystems are ephemeral.
// 
// Solution: Use Redis (Upstash free tier: 10K ops/day) for distributed rate limiting
// that persists across server restarts and scales horizontally.
//
// Fallback: If Redis is unavailable, use in-memory Map (resets on restart - acceptable
// degradation since rate limiting is a soft security measure, not hard enforcement).
// ──────────────────────────────────────────────────────────────────────────────

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

interface RateEntry { count: number; resetAt: number }

// Redis client (lazy-initialized)
let redisClient: any = null;
let redisAvailable = false;

async function getRedisClient(): Promise<any> {
  if (redisClient) return redisClient;
  
  try {
    // Try to load Upstash Redis (optional dependency — falls back to in-memory if absent)
    // @ts-ignore - optional dependency, may not be installed
    const { Redis } = await import('@upstash/redis').catch(() => ({ Redis: null }));
    
    if (Redis && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redisClient = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      redisAvailable = true;
      console.log('[RateLimiter] Redis initialized successfully');
    } else {
      console.warn('[RateLimiter] Redis not configured, using in-memory fallback');
    }
  } catch (e) {
    console.warn('[RateLimiter] Failed to initialize Redis:', e);
  }
  
  return redisClient;
}

// In-memory fallback (for development or when Redis unavailable)
let memoryRateLimitMap = new Map<string, RateEntry>();

// Cleanup interval for in-memory map
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of memoryRateLimitMap.entries()) {
    if (now > entry.resetAt) memoryRateLimitMap.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS);

/**
 * Check rate limit for an IP address
 * @param ip - Client IP address
 * @returns true if request is allowed, false if rate limited
 */
export async function checkRateLimit(ip: string): Promise<boolean> {
  const client = await getRedisClient();
  const now = Date.now();
  
  if (client && redisAvailable) {
    // Redis-based rate limiting (serverless-safe)
    try {
      const key = `ratelimit:${ip}`;
      const current = await client.get(key);
      
      if (!current) {
        // First request in window
        await client.setex(key, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000), '1');
        return true;
      }
      
      const count = parseInt(current as string, 10);
      if (count >= RATE_LIMIT_MAX) {
        return false; // Rate limited
      }
      
      await client.incr(key);
      return true;
    } catch (e) {
      console.warn('[RateLimiter] Redis operation failed, falling back to memory:', e);
      // Fall through to memory-based limiting
    }
  }
  
  // In-memory fallback (development or Redis failure)
  const entry = memoryRateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    memoryRateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return false; // Rate limited
  }
  
  entry.count++;
  return true;
}

/**
 * Get remaining requests for an IP (for debugging/admin purposes)
 */
export async function getRateLimitRemaining(ip: string): Promise<number> {
  const client = await getRedisClient();
  
  if (client && redisAvailable) {
    try {
      const key = `ratelimit:${ip}`;
      const current = await client.get(key);
      if (!current) return RATE_LIMIT_MAX;
      return Math.max(0, RATE_LIMIT_MAX - parseInt(current as string, 10));
    } catch {
      // Fall through to memory
    }
  }
  
  const entry = memoryRateLimitMap.get(ip);
  if (!entry) return RATE_LIMIT_MAX;
  if (Date.now() > entry.resetAt) return RATE_LIMIT_MAX;
  return Math.max(0, RATE_LIMIT_MAX - entry.count);
}

/**
 * Get client IP address from request headers
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

// ─── Living Shield HTML pages ─────────────────────────────────────────────────

function guardShell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — QR Guard</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    background:#0a0e17;color:#f8fafc;min-height:100vh;
    display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}
  .card{background:#151b2e;border:1px solid #1e2a40;border-radius:20px;
    padding:32px 28px;max-width:420px;width:100%;text-align:center}
  .icon{font-size:48px;margin-bottom:12px}
  h1{font-size:22px;font-weight:700;margin-bottom:8px}
  p{font-size:14px;color:#94a3b8;line-height:1.6;margin-bottom:16px}
  .badge{display:inline-flex;align-items:center;gap:6px;
    padding:5px 14px;border-radius:999px;font-size:12px;font-weight:600;margin-bottom:18px}
  .badge-shield{background:#0d2135;border:1px solid #0ea5e9;color:#38bdf8}
  .badge-warn{background:#2a1b05;border:1px solid #d97706;color:#fbbf24}
  .badge-dead{background:#200a0a;border:1px solid #ef4444;color:#f87171}
  .label{font-size:11px;color:#64748b;letter-spacing:.04em;text-transform:uppercase;margin-bottom:4px}
  .val{font-size:15px;font-weight:600;color:#e2e8f0;margin-bottom:16px;word-break:break-all}
  .url-box{background:#0a0e17;border:1px solid #1e2a40;border-radius:10px;
    padding:10px 14px;font-size:12px;color:#60a5fa;word-break:break-all;text-align:left;margin-bottom:16px}
  .btn{display:block;width:100%;padding:14px;border-radius:12px;
    font-size:16px;font-weight:700;text-decoration:none;border:none;cursor:pointer;margin-top:8px}
  .btn-go{background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff}
  .btn-warn{background:#d97706;color:#fff}
  .btn-back{background:#1e2a40;color:#94a3b8;font-size:14px}
  .divider{border:none;border-top:1px solid #1e2a40;margin:16px 0}
  .app-link{font-size:12px;color:#475569;margin-top:20px}
  .app-link a{color:#3b82f6;text-decoration:none}
</style>
</head><body>
<div class="card">${body}</div>
<p class="app-link">Protected by <a href="https://qrguard.app">QR Guard</a></p>
</body></html>`;
}

function guardRedirectHtml(businessName: string, ownerName: string, destination: string): string {
  return guardShell("Redirecting", `
<div class="icon">🛡️</div>
<div class="badge badge-shield">✦ Living Shield QR</div>
<h1>${escHtml(businessName)}</h1>
<p style="margin-bottom:8px">by ${escHtml(ownerName)}</p>
<hr class="divider">
<div class="label">Destination</div>
<div class="url-box">${escHtml(destination)}</div>
<p>Redirecting you now…</p>
<a href="${escAttr(destination)}" class="btn btn-go">Go to Destination →</a>
<meta http-equiv="refresh" content="0;url=${escAttr(destination)}">
`);
}

function guardCautionHtml(businessName: string, ownerName: string, destination: string, uuid: string): string {
  return guardShell("Caution — Destination Changed", `
<div class="icon">⚠️</div>
<div class="badge badge-warn">⚡ Destination Recently Changed</div>
<h1>${escHtml(businessName)}</h1>
<p style="margin-bottom:8px">by ${escHtml(ownerName)}</p>
<hr class="divider">
<p>This QR code's destination was changed in the last 24 hours. Please verify you trust this business before proceeding.</p>
<div class="label">New Destination</div>
<div class="url-box">${escHtml(destination)}</div>
<a href="${escAttr(destination)}" class="btn btn-warn">I Understand — Proceed Anyway</a>
<button onclick="history.back()" class="btn btn-back" style="margin-top:8px">← Go Back</button>
`);
}

function guardDeactivatedHtml(businessName: string | null): string {
  return guardShell("QR Code Deactivated", `
<div class="icon">🔒</div>
<div class="badge badge-dead">Deactivated</div>
<h1>${escHtml(businessName || "This QR Code")}</h1>
<p>The owner has temporarily deactivated this QR code. Please contact the business directly for assistance.</p>
<button onclick="history.back()" class="btn btn-back">← Go Back</button>
`);
}

function guardNotFoundHtml(): string {
  return guardShell("QR Code Not Found", `
<div class="icon">🔍</div>
<div class="badge badge-dead">Not Found</div>
<h1>QR Code Not Found</h1>
<p>This QR code could not be found. It may have been removed or the link may be incorrect.</p>
<button onclick="history.back()" class="btn btn-back">← Go Back</button>
`);
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escAttr(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ─── Guard link cache (eliminates repeated Firebase round-trips) ──────────────
const GUARD_CACHE_TTL_MS = 30_000;
interface CacheEntry { data: GuardLinkFields | null; expiresAt: number }
const guardLinkCache = new Map<string, CacheEntry>();

interface StandardLinkFields {
  rawContent: string;
  contentType: string;
  ownerName: string;
  isActive: boolean;
}
interface StandardCacheEntry { data: StandardLinkFields | null; expiresAt: number }
const standardLinkCache = new Map<string, StandardCacheEntry>();

const FIREBASE_PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "";
const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || "";
const CAUTION_WINDOW_MS = 24 * 60 * 60 * 1000;

interface GuardLinkFields {
  currentDestination: string | null;
  previousDestination: string | null;
  businessName: string | null;
  ownerName: string;
  isActive: boolean;
  destinationChangedAt: string | null;
}

async function fetchGuardLinkFromFirestore(uuid: string): Promise<GuardLinkFields | null> {
  const now = Date.now();
  const cached = guardLinkCache.get(uuid);
  if (cached && now < cached.expiresAt) return cached.data;

  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/guardLinks/${encodeURIComponent(uuid)}?key=${FIREBASE_API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      guardLinkCache.set(uuid, { data: null, expiresAt: now + GUARD_CACHE_TTL_MS });
      return null;
    }
    const data = await res.json() as any;
    const f = data?.fields;
    if (!f) {
      guardLinkCache.set(uuid, { data: null, expiresAt: now + GUARD_CACHE_TTL_MS });
      return null;
    }
    const link: GuardLinkFields = {
      currentDestination: f.currentDestination?.stringValue || null,
      previousDestination: f.previousDestination?.stringValue || null,
      businessName: f.businessName?.stringValue || null,
      ownerName: f.ownerName?.stringValue || "Business",
      isActive: f.isActive?.booleanValue !== false,
      destinationChangedAt: f.destinationChangedAt?.timestampValue || null,
    };
    guardLinkCache.set(uuid, { data: link, expiresAt: now + GUARD_CACHE_TTL_MS });
    return link;
  } catch {
    return null;
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of guardLinkCache.entries()) {
    if (now >= entry.expiresAt) guardLinkCache.delete(key);
  }
  for (const [key, entry] of standardLinkCache.entries()) {
    if (now >= entry.expiresAt) standardLinkCache.delete(key);
  }
}, GUARD_CACHE_TTL_MS);

async function fetchStandardLinkFromFirestore(uuid: string): Promise<StandardLinkFields | null> {
  const now = Date.now();
  const cached = standardLinkCache.get(uuid);
  if (cached && now < cached.expiresAt) return cached.data;

  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/standardLinks/${encodeURIComponent(uuid)}?key=${FIREBASE_API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      standardLinkCache.set(uuid, { data: null, expiresAt: now + GUARD_CACHE_TTL_MS });
      return null;
    }
    const data = await res.json() as any;
    const f = data?.fields;
    if (!f) {
      standardLinkCache.set(uuid, { data: null, expiresAt: now + GUARD_CACHE_TTL_MS });
      return null;
    }
    const link: StandardLinkFields = {
      rawContent: f.rawContent?.stringValue || "",
      contentType: f.contentType?.stringValue || "text",
      ownerName: f.ownerName?.stringValue || "QR Guard User",
      isActive: f.isActive?.booleanValue !== false,
    };
    standardLinkCache.set(uuid, { data: link, expiresAt: now + GUARD_CACHE_TTL_MS });
    return link;
  } catch {
    return null;
  }
}

function serveStandardContent(res: Response, link: StandardLinkFields, uuid: string): void {
  const { rawContent, contentType, ownerName } = link;

  if (!link.isActive) {
    (res as any).status(200).send(guardShell("QR Code Deactivated", `
<div class="icon">🔒</div>
<div class="badge badge-dead">Deactivated</div>
<h1>QR Code Unavailable</h1>
<p>The owner has deactivated this QR code. Please contact them directly.</p>
<button onclick="history.back()" class="btn btn-back">← Go Back</button>
`));
    return;
  }

  if (rawContent.startsWith("https://") || rawContent.startsWith("http://")) {
    (res as any).setHeader("Cache-Control", "no-store, no-cache");
    (res as any).redirect(302, rawContent);
    return;
  }

  if (rawContent.startsWith("upi://")) {
    (res as any).status(200).send(guardShell("UPI Payment", `
<div class="icon">💳</div>
<div class="badge badge-shield">✦ QR Guard Protected</div>
<h1>UPI Payment</h1>
<p style="margin-bottom:8px">by ${escHtml(ownerName)}</p>
<hr class="divider">
<div class="label">UPI Deep Link</div>
<div class="url-box">${escHtml(rawContent)}</div>
<a href="${escAttr(rawContent)}" class="btn btn-go">Open in UPI App →</a>
<p style="margin-top:14px;font-size:12px;color:#64748b">Works with PhonePe, GPay, Paytm, BHIM and all UPI apps</p>
`));
    return;
  }

  if (rawContent.startsWith("WIFI:")) {
    const ssidMatch = rawContent.match(/S:([^;]+);/);
    const passMatch = rawContent.match(/P:([^;]*);/);
    const typeMatch = rawContent.match(/T:([^;]+);/);
    const ssid = ssidMatch ? ssidMatch[1] : "Unknown";
    const pass = passMatch ? passMatch[1] : "";
    const security = typeMatch ? typeMatch[1] : "WPA";
    (res as any).status(200).send(guardShell("WiFi Credentials", `
<div class="icon">📶</div>
<div class="badge badge-shield">✦ QR Guard Protected</div>
<h1>WiFi Network</h1>
<p style="margin-bottom:8px">Shared by ${escHtml(ownerName)}</p>
<hr class="divider">
<div class="label">Network Name (SSID)</div>
<div class="val">${escHtml(ssid)}</div>
<div class="label">Security</div>
<div class="val">${escHtml(security === "nopass" ? "Open (no password)" : security)}</div>
${pass ? `<div class="label">Password</div><div class="val">${escHtml(pass)}</div>` : ""}
<p style="font-size:12px;color:#64748b;margin-top:8px">Open WiFi settings on your device to connect manually</p>
`));
    return;
  }

  if (rawContent.startsWith("BEGIN:VCARD")) {
    const nameMatch = rawContent.match(/FN:([^\r\n]+)/);
    const telMatch = rawContent.match(/TEL[^:]*:([^\r\n]+)/);
    const emailMatch = rawContent.match(/EMAIL[^:]*:([^\r\n]+)/);
    const displayName = nameMatch ? nameMatch[1] : "Contact";
    const dataUri = `data:text/vcard;charset=utf-8,${encodeURIComponent(rawContent)}`;
    (res as any).status(200).send(guardShell("Contact Card", `
<div class="icon">👤</div>
<div class="badge badge-shield">✦ QR Guard Protected</div>
<h1>${escHtml(displayName)}</h1>
<p style="margin-bottom:8px">Shared by ${escHtml(ownerName)}</p>
<hr class="divider">
${telMatch ? `<div class="label">Phone</div><div class="val">${escHtml(telMatch[1])}</div>` : ""}
${emailMatch ? `<div class="label">Email</div><div class="val">${escHtml(emailMatch[1])}</div>` : ""}
<a href="${escAttr(dataUri)}" download="contact.vcf" class="btn btn-go">Save Contact →</a>
`));
    return;
  }

  if (rawContent.startsWith("BEGIN:VCALENDAR")) {
    const summaryMatch = rawContent.match(/SUMMARY:([^\r\n]+)/);
    const dtStartMatch = rawContent.match(/DTSTART:([^\r\n]+)/);
    const locationMatch = rawContent.match(/LOCATION:([^\r\n]+)/);
    const title = summaryMatch ? summaryMatch[1] : "Event";
    const dtRaw = dtStartMatch ? dtStartMatch[1] : "";
    const dateStr = dtRaw
      ? `${dtRaw.slice(0, 4)}-${dtRaw.slice(4, 6)}-${dtRaw.slice(6, 8)} at ${dtRaw.slice(9, 11)}:${dtRaw.slice(11, 13)}`
      : "";
    const dataUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(rawContent)}`;
    (res as any).status(200).send(guardShell("Calendar Event", `
<div class="icon">📅</div>
<div class="badge badge-shield">✦ QR Guard Protected</div>
<h1>${escHtml(title)}</h1>
<p style="margin-bottom:8px">Shared by ${escHtml(ownerName)}</p>
<hr class="divider">
${dateStr ? `<div class="label">When</div><div class="val">${escHtml(dateStr)}</div>` : ""}
${locationMatch ? `<div class="label">Where</div><div class="val">${escHtml(locationMatch[1])}</div>` : ""}
<a href="${escAttr(dataUri)}" download="event.ics" class="btn btn-go">Add to Calendar →</a>
`));
    return;
  }

  if (rawContent.startsWith("tel:")) {
    const number = rawContent.replace("tel:", "");
    (res as any).status(200).send(guardShell("Phone Call", `
<div class="icon">📞</div>
<div class="badge badge-shield">✦ QR Guard Protected</div>
<h1>Phone Number</h1>
<p style="margin-bottom:8px">Shared by ${escHtml(ownerName)}</p>
<hr class="divider">
<div class="label">Number</div>
<div class="val">${escHtml(number)}</div>
<a href="${escAttr(rawContent)}" class="btn btn-go">Tap to Call →</a>
`));
    return;
  }

  if (rawContent.startsWith("mailto:")) {
    (res as any).setHeader("Cache-Control", "no-store, no-cache");
    (res as any).redirect(302, rawContent);
    return;
  }

  if (rawContent.startsWith("smsto:") || rawContent.startsWith("sms:")) {
    (res as any).setHeader("Cache-Control", "no-store, no-cache");
    (res as any).redirect(302, rawContent);
    return;
  }

  (res as any).status(200).send(guardShell("QR Content", `
<div class="icon">📄</div>
<div class="badge badge-shield">✦ QR Guard Protected</div>
<h1>QR Content</h1>
<p style="margin-bottom:8px">Shared by ${escHtml(ownerName)}</p>
<hr class="divider">
<div class="url-box" style="text-align:center;font-size:14px;padding:16px">${escHtml(rawContent)}</div>
<button onclick="navigator.clipboard&&navigator.clipboard.writeText(${JSON.stringify(escAttr(rawContent))})" class="btn btn-go" style="margin-top:4px">Copy Content</button>
`));
}

const SAFE_REDIRECT_PROTOCOLS = new Set(["https:", "http:"]);

function isSafeRedirectDestination(destination: string): boolean {
  try {
    const url = new URL(destination.startsWith("http") ? destination : `https://${destination}`);
    return SAFE_REDIRECT_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

// ─── Dynamic threat definitions (served to clients for live updates) ──────────
const DYNAMIC_THREAT_PATTERNS: { pattern: string; reason: string }[] = [
  { pattern: "support-paytm-helpline", reason: "Paytm support impersonation" },
  { pattern: "sbi-reward-collect", reason: "SBI reward scam" },
  { pattern: "pm-awas-yojana-apply", reason: "PM housing scheme fraud" },
  { pattern: "free-data-airtel", reason: "Airtel free data scam" },
  { pattern: "hdfc-lucky-winner", reason: "HDFC lucky draw fraud" },
  { pattern: "ncert-scholarship-apply", reason: "Fake scholarship scam" },
  { pattern: "cbse-result-link", reason: "CBSE phishing page" },
  { pattern: "army-recruitment-online", reason: "Fake army recruitment" },
  { pattern: "whatsapp-gold-upgrade", reason: "WhatsApp Gold scam" },
  { pattern: "trai-sim-block", reason: "TRAI SIM block threat scam" },
  { pattern: "epfo-pf-withdrawal", reason: "EPFO PF withdrawal scam" },
  { pattern: "driving-license-online-apply", reason: "Fake DL application portal" },
];

export async function registerRoutes(app: Express): Promise<Server> {
  registerDonationRoutes(app);
  registerSafeBrowsingRoute(app);
  registerQrActiveRoute(app);

  app.get("/status", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Signature applied automatically by signApiResponses middleware.
  app.get("/api/threats", (_req: Request, res: Response) => {
    res.json({
      version: "2025-04-01",
      patterns: DYNAMIC_THREAT_PATTERNS,
    });
  });

  // ─── /go/:slug — Standard QR content lookup (QR Guard Protected QRs) ─────────
  // Looks up rawContent from standardLinks collection and serves it.
  // Other scanners see a branded web page; QR Guard app recognises the URL and
  // fetches content natively — making our database the key to decode the QR.
  app.get("/go/:slug", async (req: Request, res: Response) => {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;

    if (!slug || slug.length < 4) {
      return res.status(400).send(guardNotFoundHtml());
    }

    // 1. Check standardLinks first (Standard QRs — most common for /go/)
    const standardLink = await fetchStandardLinkFromFirestore(slug);
    if (standardLink) {
      return serveStandardContent(res, standardLink, slug);
    }

    // 2. Fall back to guardLinks (legacy Business QRs that used /go/ path)
    const guardLink = await fetchGuardLinkFromFirestore(slug);
    if (!guardLink) {
      return res.status(404).send(guardNotFoundHtml());
    }

    if (!guardLink.isActive) {
      return res.status(200).send(guardDeactivatedHtml(guardLink.businessName));
    }

    const destination = guardLink.currentDestination;
    if (!destination || !isSafeRedirectDestination(destination)) {
      return res.status(404).send(guardNotFoundHtml());
    }

    const changedAt = guardLink.destinationChangedAt ? new Date(guardLink.destinationChangedAt).getTime() : null;
    const changedRecently = changedAt && (Date.now() - changedAt) < CAUTION_WINDOW_MS;

    if (changedRecently) {
      const businessName = guardLink.businessName || "QR Code";
      return res.status(200).send(guardCautionHtml(businessName, guardLink.ownerName, destination, slug));
    }

    res.setHeader("Cache-Control", "no-store, no-cache");
    return res.redirect(302, destination);
  });

  // ─── Living Shield redirect ─────────────────────────────────────────────────
  app.get("/guard/:uuid", async (req: Request, res: Response) => {
    const uuid = Array.isArray(req.params.uuid) ? req.params.uuid[0] : req.params.uuid;

    const link = await fetchGuardLinkFromFirestore(uuid);

    if (!link) {
      return res.status(404).send(guardNotFoundHtml());
    }

    if (!link.isActive) {
      return res.status(200).send(guardDeactivatedHtml(link.businessName));
    }

    const destination = link.currentDestination;
    if (!destination) {
      return res.status(404).send(guardNotFoundHtml());
    }

    if (!isSafeRedirectDestination(destination)) {
      return res.status(400).send(guardShell("Invalid Destination", `
<div class="icon">🚫</div>
<div class="badge badge-dead">Blocked</div>
<h1>Unsafe Destination</h1>
<p>This Guard Link's destination uses an unsupported protocol and has been blocked to protect you.</p>
<button onclick="history.back()" class="btn btn-back">← Go Back</button>
`));
    }

    const businessName = link.businessName || "Business";
    const ownerName = link.ownerName;

    const changedAt = link.destinationChangedAt ? new Date(link.destinationChangedAt).getTime() : null;
    const changedRecently = changedAt && (Date.now() - changedAt) < CAUTION_WINDOW_MS;

    if (changedRecently) {
      return res.status(200).send(guardCautionHtml(businessName, ownerName, destination, uuid));
    }

    return res.status(200).send(guardRedirectHtml(businessName, ownerName, destination));
  });

  app.post("/api/qr/decode-image", async (req: Request, res: Response) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.length < 16) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const ip = getClientIp(req);
    
    // Rate limiting is now async (Redis support)
    const allowed = await checkRateLimit(ip);
    if (!allowed) {
      return res.status(429).json({ message: "Too many requests. Please wait a minute and try again." });
    }
    
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64 || typeof imageBase64 !== "string") {
        return res.status(400).json({ message: "Image required" });
      }
      // Reject overly large uploads (~5MB base64 == ~3.75MB binary).
      if (imageBase64.length > 5 * 1024 * 1024) {
        return res.status(413).json({ message: "Image too large" });
      }
      const content = await decodeQrFromImage(imageBase64);
      if (!content) return res.status(404).json({ message: "No QR code found in image" });

      // SECURITY FIX P1: Validate decoded QR payload before returning to client.
      // Blocks XSS schemes (javascript:, data:text/html, vbscript:), malformed UPI/EMV,
      // disallowed schemes (file:, intent:, blob:), control-char smuggling, and DoS-sized payloads.
      const validation = validateQrContent(content);
      if (!validation.valid) {
        return res.status(422).json({
          message: validation.error || "QR content rejected by safety check",
          code: "QR_VALIDATION_FAILED",
        });
      }

      res.json({ content, kind: validation.kind });
    } catch (e: any) {
      console.error("[decode-image] error:", e);
      res.status(500).json({ message: "Image decode failed" });
    }
  });

  // ── Email validation — disposable/temporary email blocker ─────────────────
  // Called from AuthContext.signUp before Firebase account creation.
  // This is the server-side bypass-proof gate: even if the client-side check
  // is bypassed (e.g. direct SDK calls), this endpoint rejects disposable emails.
  app.post("/api/validate-email", (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ valid: false, reason: "Email is required." });
    }
    const result = validateEmail(email.trim());
    return res.json(result);
  });

  // ── AI QR Builder — smart parser + optional OpenAI ────────────────────────
  app.post("/api/ai/qr-generate", async (req: Request, res: Response) => {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
      return res.status(400).json({ error: "Prompt is required (min 3 characters)." });
    }
    const p = prompt.trim();

    // If OpenAI key is available, use it for best results
    if (process.env.OPENAI_API_KEY) {
      try {
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 256,
            messages: [
              {
                role: "system",
                content: `You are a QR code content generator. Given a description, return ONLY the exact QR content string, no explanation, no markdown.

Use these formats:
- Website: https://example.com  
- UPI Payment: upi://pay?pa=vpa@bank&pn=Name&cu=INR  (add &am=amount and &tn=note if mentioned)
- WiFi: WIFI:S:NetworkName;T:WPA;P:Password;;  (use T:nopass if no password)
- Phone call: tel:+919876543210
- Email: mailto:email@example.com?subject=Subject&body=Body
- Contact card: BEGIN:VCARD\nVERSION:3.0\nFN:Full Name\nTEL;TYPE=CELL:+91number\nEMAIL;TYPE=INTERNET:email\nEND:VCARD
- SMS: SMSTO:+919876543210:Your message here
- Plain text: the text itself

Return ONLY the QR content string.`,
              },
              { role: "user", content: p },
            ],
          }),
        });
        if (openaiRes.ok) {
          const data: any = await openaiRes.json();
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content) {
            return res.json({ content, source: "ai" });
          }
        }
      } catch (e) {
        console.warn("[AI QR] OpenAI call failed, using smart parser:", e);
      }
    }

    // Smart parser fallback (no API key needed)
    const lower = p.toLowerCase();

    // URL — explicit http/https link
    const urlExact = p.match(/https?:\/\/[^\s,]+/);
    if (urlExact) return res.json({ content: urlExact[0], source: "parser", typeName: "Website URL" });

    // Bare domain (binance.com, google.co.in, etc.)
    const bareDomain = p.match(/^(?:www\.)?[\w-]+\.(com|in|org|net|io|app|co|edu|gov|dev|ai|me)(?:\/[^\s]*)?$/i);
    if (bareDomain) return res.json({ content: `https://${p.replace(/^www\./i, "www.")}`, source: "parser", typeName: "Website URL" });

    // WiFi
    if (/\bwi-?fi\b|\bssid\b|\bnetwork\b.*\bpass|\bpass.*\bnetwork/.test(lower)) {
      const ssidMatch = p.match(/(?:ssid|network(?:\s+name)?|named?|called?|for)\s*[:"']?\s*([^,\n"']+?)(?:\s*[,\n]|$)/i)
        ?? p.match(/^([^,]+),/);
      const passMatch = p.match(/(?:password|pwd|pass(?:word)?)\s*[:"']?\s*([^\s,\n"']+)/i);
      const ssid = (ssidMatch?.[1] ?? "").trim() || "MyNetwork";
      const pass = (passMatch?.[1] ?? "").trim();
      const enc = pass ? "WPA" : "nopass";
      return res.json({ content: `WIFI:S:${ssid};T:${enc};P:${pass};;`, source: "parser", typeName: "WiFi Network" });
    }

    // UPI / Payment
    const vpaMatch = p.match(/[\w.\-]+@(?:upi|paytm|razorpay|okaxis|ybl|oksbi|apl|ibl|icici|sbi|hdfc|axis|kotak|freecharge|airtel|juspay|pockets|waicici|okicici|oksbi|okhdfcbank|kkbkupi|barodampay|mahb|unionbank|cnrb|aubank)\b/i)
      ?? p.match(/[\w.\-]{3,}@[\w]{2,}/);
    if (vpaMatch || /\b(?:upi|payment|pay|₹|rupee)\b/.test(lower)) {
      const vpa = vpaMatch?.[0] ?? "user@upi";
      const amountMatch = p.match(/₹\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:rs|rupees?|inr|₹)/i);
      const amount = (amountMatch?.[1] ?? amountMatch?.[2] ?? "").trim();
      const nameMatch = p.match(/(?:for|to|name[:\s]*)\s+([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)*)/i)
        ?? p.match(/(?:payee|recipient)[:\s]+([A-Za-z ]+)/i);
      const name = (nameMatch?.[1] ?? "").trim() || "Payee";
      const noteMatch = p.match(/(?:note|memo|ref|purpose|tn)[:\s]+([^,\n]+)/i);
      const note = (noteMatch?.[1] ?? "").trim();
      let content = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(name)}&cu=INR`;
      if (amount) content += `&am=${amount}`;
      if (note) content += `&tn=${encodeURIComponent(note)}`;
      return res.json({ content, source: "parser", typeName: "UPI Payment" });
    }

    // Phone number
    const phoneKw = /\b(?:call|phone|tel|mobile|contact|ring)\b/.test(lower);
    const phoneNum = p.match(/(\+?[\d][\d\s\-().]{8,14}[\d])/);
    if (phoneKw && phoneNum) {
      const digits = phoneNum[1].replace(/[\s\-()]/g, "");
      return res.json({ content: `tel:${digits}`, source: "parser", typeName: "Phone Number" });
    }

    // Email
    const emailMatch = p.match(/[\w.+\-]+@[\w\-]+\.[a-z]{2,}/i);
    if (emailMatch) {
      const subjectMatch = p.match(/subject[:\s]+([^,\n]+)/i);
      const bodyMatch = p.match(/(?:body|message|msg)[:\s]+([^\n]+)/i);
      let content = `mailto:${emailMatch[0]}`;
      const params: string[] = [];
      if (subjectMatch?.[1]) params.push(`subject=${encodeURIComponent(subjectMatch[1].trim())}`);
      if (bodyMatch?.[1]) params.push(`body=${encodeURIComponent(bodyMatch[1].trim())}`);
      if (params.length) content += `?${params.join("&")}`;
      return res.json({ content, source: "parser", typeName: "Email" });
    }

    // SMS
    if (/\bsms\b|\btext\s+message\b|\bwhatsapp\b/.test(lower) && phoneNum) {
      const digits = phoneNum[1].replace(/[\s\-()]/g, "");
      const msgMatch = p.match(/(?:message|msg|text|saying)[:\s]+([^\n]+)/i);
      const msg = (msgMatch?.[1] ?? "").trim();
      return res.json({ content: `SMSTO:${digits}:${msg}`, source: "parser", typeName: "SMS" });
    }

    // Contact card
    if (/\b(?:contact|vcard|v-card|business card|name card)\b/.test(lower)) {
      const nameM = p.match(/(?:name[:\s]+|^)([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z]+)+)/i);
      const phoneM = p.match(/(\+?[\d][\d\s\-().]{8,14}[\d])/);
      const emailM = p.match(/[\w.+\-]+@[\w\-]+\.[a-z]{2,}/i);
      const orgM = p.match(/(?:company|org|organization|business)[:\s]+([A-Za-z ]+)/i);
      const lines = ["BEGIN:VCARD", "VERSION:3.0"];
      lines.push(`FN:${(nameM?.[1] ?? "Contact").trim()}`);
      if (phoneM) lines.push(`TEL;TYPE=CELL:${phoneM[1].replace(/[\s\-()]/g, "")}`);
      if (emailM) lines.push(`EMAIL;TYPE=INTERNET:${emailM[0]}`);
      if (orgM) lines.push(`ORG:${orgM[1].trim()}`);
      lines.push("END:VCARD");
      return res.json({ content: lines.join("\n"), source: "parser", typeName: "Contact Card" });
    }

    // Default: plain text
    return res.json({ content: p, source: "parser", typeName: "Plain Text" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
