import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { decodeQrFromImage } from "./image-decode";
import { registerDonationRoutes } from "./routes/donation";
import { registerSafeBrowsingRoute } from "./routes/safe-browsing";
import { registerQrActiveRoute } from "./routes/qr-active";
import { registerV1Routes } from "./routes/index";
import { registerAiQrRoute } from "./routes/ai-qr";
import { registerIfscRoute } from "./routes/ifsc";
import { serveStandardContent } from "./routes/standard-content";
import { pushRouter } from "./routes/push";
import { validateEmail } from "../shared/utils/email-validator";
import { validateQrContent } from "../services/analysis/qr-validator";
import { checkRateLimit, getClientIp } from "./middleware/rate-limiter";
import {
  guardShell, guardRedirectHtml, guardCautionHtml, guardDeactivatedHtml, guardNotFoundHtml,
} from "./templates/guard-html";
import {
  fetchGuardLink, fetchStandardLink, isSafeRedirectDestination,
  recordScanAndEnforce, CAUTION_WINDOW_MS,
  fetchUnifiedQr, recordUnifiedScan,
} from "./lib/firebase-client";
import { cacheGet, cacheSet } from "./lib/route-cache";
import { isLimitExceeded } from "./lib/qr-limits";

// TTL constants for the in-memory route cache
const STANDARD_LINK_TTL_MS = 60_000;   // standard QR content — stable, 60 s
const GUARD_LINK_TTL_MS    = 30_000;   // guard links change destination — 30 s

async function cachedStandardLink(slug: string) {
  const key = `std:${slug}`;
  const hit = cacheGet<Awaited<ReturnType<typeof fetchStandardLink>>>(key);
  if (hit !== null) return hit;
  const data = await fetchStandardLink(slug);
  if (data) cacheSet(key, data, STANDARD_LINK_TTL_MS);
  return data;
}

async function cachedGuardLink(id: string) {
  const key = `guard:${id}`;
  const hit = cacheGet<Awaited<ReturnType<typeof fetchGuardLink>>>(key);
  if (hit !== null) return hit;
  const data = await fetchGuardLink(id);
  if (data) cacheSet(key, data, GUARD_LINK_TTL_MS);
  return data;
}

// ─── Dynamic threat definitions (served to clients for live updates) ──────────
const DYNAMIC_THREAT_PATTERNS: { pattern: string; reason: string }[] = [
  { pattern: "support-paytm-helpline",     reason: "Paytm support impersonation"     },
  { pattern: "sbi-reward-collect",          reason: "SBI reward scam"                 },
  { pattern: "pm-awas-yojana-apply",        reason: "PM housing scheme fraud"         },
  { pattern: "free-data-airtel",            reason: "Airtel free data scam"           },
  { pattern: "hdfc-lucky-winner",           reason: "HDFC lucky draw fraud"           },
  { pattern: "ncert-scholarship-apply",     reason: "Fake scholarship scam"           },
  { pattern: "cbse-result-link",            reason: "CBSE phishing page"             },
  { pattern: "army-recruitment-online",     reason: "Fake army recruitment"           },
  { pattern: "whatsapp-gold-upgrade",       reason: "WhatsApp Gold scam"             },
  { pattern: "trai-sim-block",              reason: "TRAI SIM block threat scam"      },
  { pattern: "epfo-pf-withdrawal",          reason: "EPFO PF withdrawal scam"        },
  { pattern: "driving-license-online-apply", reason: "Fake DL application portal"    },
];

export async function registerRoutes(app: Express): Promise<Server> {
  // ── Versioned API (all handlers mirrored under /api/v1/) ────────────────────
  registerV1Routes(app);

  // ── Domain route modules ────────────────────────────────────────────────────
  registerDonationRoutes(app);
  registerSafeBrowsingRoute(app);
  registerQrActiveRoute(app);
  registerAiQrRoute(app);
  registerIfscRoute(app);
  app.use("/api/push", pushRouter);

  // ── Health check ────────────────────────────────────────────────────────────
  app.get("/status", (_req, res) => {
    res.json({ status: "ok" });
  });

  // ── Dynamic threat patterns (served to clients for live updates) ─────────
  app.get("/api/threats", (_req: Request, res: Response) => {
    res.json({ version: "2025-04-01", patterns: DYNAMIC_THREAT_PATTERNS });
  });

  // ── /q/:id — Unified QR route (new architecture) ───────────────────────────
  // All QRs generated after the architecture migration use this route.
  // One doc in qrs/{id} is the single source of truth for scan count,
  // destination, status, limits, and design.
  app.get("/q/:id", async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id || id.length < 4) return res.status(400).send(guardNotFoundHtml());

    const qr = await fetchUnifiedQr(id);
    if (!qr) return res.status(404).send(guardNotFoundHtml());

    // Check status/expiry/limit
    const isExpired = qr.expiryDate && new Date(qr.expiryDate).getTime() < Date.now();
    const isLimitHit = qr.scanLimit !== null && qr.scanCount >= qr.scanLimit;
    const isBlocked = qr.status === "inactive" || qr.status === "limit_reached" || isExpired || isLimitHit;

    if (isBlocked) {
      return res.status(200).send(guardDeactivatedHtml(qr.businessName));
    }

    // Record the scan (non-blocking — serve first)
    recordUnifiedScan(id, qr.scanLimit).catch(() => {});

    const dest = qr.destination;

    // Dynamic (business/guard) QRs: use the branded redirect page
    if (qr.isDynamic) {
      if (!isSafeRedirectDestination(dest)) {
        return res.status(400).send(guardShell("Blocked", `
<div class="icon">🚫</div>
<div class="badge badge-dead">Blocked</div>
<h1>Unsafe Destination</h1>
<p>This QR code's destination has been blocked for your safety.</p>
<button onclick="history.back()" class="btn btn-back">← Go Back</button>
`));
      }
      const businessName = qr.businessName || qr.title || "Business";
      return res.status(200).send(guardRedirectHtml(businessName, qr.ownerName, dest));
    }

    // Standard QRs: reuse the existing content-serving logic by building a
    // compatible StandardLinkFields object and passing it to serveStandardContent.
    const asStandardLink = {
      rawContent: qr.rawDestination || dest,
      contentType: qr.contentType,
      ownerName: qr.ownerName,
      isActive: true,
      scanLimit: qr.scanLimit,
      scanCount: qr.scanCount,
      expiryDate: qr.expiryDate,
    };
    return serveStandardContent(res, asStandardLink, id);
  });

  // ── /go/:slug — Standard QR content lookup ─────────────────────────────────
  app.get("/go/:slug", async (req: Request, res: Response) => {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;

    if (!slug || slug.length < 4) {
      return res.status(400).send(guardNotFoundHtml());
    }

    // 1. Standard QRs (most common for /go/)
    const standardLink = await cachedStandardLink(slug);
    if (standardLink) {
      if (!standardLink.isActive || isLimitExceeded(standardLink.expiryDate, standardLink.scanLimit, standardLink.scanCount)) {
        return res.status(200).send(guardDeactivatedHtml(null));
      }
      // Record scan and enforce limit (non-blocking — serve immediately)
      recordScanAndEnforce("standardLinks", slug, standardLink.scanLimit).catch(() => {});
      return serveStandardContent(res, standardLink, slug);
    }

    // 2. Legacy Business QRs that used /go/ path
    const guardLink = await cachedGuardLink(slug);
    if (!guardLink) {
      return res.status(404).send(guardNotFoundHtml());
    }

    if (!guardLink.isActive || isLimitExceeded(guardLink.expiryDate, guardLink.scanLimit, guardLink.scanCount)) {
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

    recordScanAndEnforce("guardLinks", slug, guardLink.scanLimit).catch(() => {});
    res.setHeader("Cache-Control", "no-store, no-cache");
    return res.redirect(302, destination);
  });

  // ── /guard/:uuid — Living Shield redirect ───────────────────────────────────
  app.get("/guard/:uuid", async (req: Request, res: Response) => {
    const uuid = Array.isArray(req.params.uuid) ? req.params.uuid[0] : req.params.uuid;

    const link = await cachedGuardLink(uuid);
    if (!link) {
      return res.status(404).send(guardNotFoundHtml());
    }

    if (!link.isActive || isLimitExceeded(link.expiryDate, link.scanLimit, link.scanCount)) {
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
    const ownerName    = link.ownerName;
    const changedAt    = link.destinationChangedAt ? new Date(link.destinationChangedAt).getTime() : null;
    const changedRecently = changedAt && (Date.now() - changedAt) < CAUTION_WINDOW_MS;

    if (changedRecently) {
      return res.status(200).send(guardCautionHtml(businessName, ownerName, destination, uuid));
    }

    recordScanAndEnforce("guardLinks", uuid, link.scanLimit).catch(() => {});
    return res.status(200).send(guardRedirectHtml(businessName, ownerName, destination));
  });

  // ── QR image decode ──────────────────────────────────────────────────────────
  app.post("/api/qr/decode-image", async (req: Request, res: Response) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.length < 16) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const ip      = getClientIp(req);
    const allowed = await checkRateLimit(ip);
    if (!allowed) {
      return res.status(429).json({ message: "Too many requests. Please wait a minute and try again." });
    }

    try {
      const { imageBase64 } = req.body;
      if (!imageBase64 || typeof imageBase64 !== "string") {
        return res.status(400).json({ message: "Image required" });
      }
      if (imageBase64.length > 5 * 1024 * 1024) {
        return res.status(413).json({ message: "Image too large" });
      }
      const content = await decodeQrFromImage(imageBase64);
      if (!content) return res.status(404).json({ message: "No QR code found in image" });

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

  // ── Email validation — disposable/temporary email blocker ──────────────────
  app.post("/api/validate-email", (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ valid: false, reason: "Email is required." });
    }
    const result = validateEmail(email.trim());
    return res.json(result);
  });

  const httpServer = createServer(app);
  return httpServer;
}
