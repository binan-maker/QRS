import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { decodeQrFromImage } from "./image-decode";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { signPayload } from "./security/response-signer";

// ─── Rate Limiter (file-persisted — survives server restarts) ─────────────────
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_FILE = join("/tmp", "qrguard_ratelimit.json");

interface RateEntry { count: number; resetAt: number }
let rateLimitMap = new Map<string, RateEntry>();

function loadRateLimitState(): void {
  try {
    const raw = readFileSync(RATE_LIMIT_FILE, "utf8");
    const obj: Record<string, RateEntry> = JSON.parse(raw);
    const now = Date.now();
    for (const [ip, entry] of Object.entries(obj)) {
      if (entry.resetAt > now) rateLimitMap.set(ip, entry);
    }
  } catch {
    // No saved state — start fresh
  }
}

function saveRateLimitState(): void {
  try {
    const obj: Record<string, RateEntry> = {};
    for (const [ip, entry] of rateLimitMap.entries()) obj[ip] = entry;
    writeFileSync(RATE_LIMIT_FILE, JSON.stringify(obj));
  } catch {
    // Non-fatal — will retry on next interval
  }
}

loadRateLimitState();

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
  saveRateLimitState();
}, RATE_LIMIT_WINDOW_MS);

process.on("SIGTERM", saveRateLimitState);
process.on("SIGINT", saveRateLimitState);
process.on("exit", saveRateLimitState);

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
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
}, GUARD_CACHE_TTL_MS);

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
  app.get("/status", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/threats", async (_req: Request, res: Response) => {
    const payload = JSON.stringify({
      version: "2025-04-01",
      patterns: DYNAMIC_THREAT_PATTERNS,
    });
    const signature = await signPayload(payload);
    if (signature) {
      res.setHeader("X-Content-Signature", signature);
    }
    res.setHeader("Content-Type", "application/json");
    res.send(payload);
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
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ message: "Too many requests. Please wait a minute and try again." });
    }
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) return res.status(400).json({ message: "Image required" });
      const content = await decodeQrFromImage(imageBase64);
      if (!content) return res.status(404).json({ message: "No QR code found in image" });
      res.json({ content });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
