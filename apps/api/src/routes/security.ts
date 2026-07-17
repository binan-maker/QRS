import { Router, type Request, type Response } from "express";
import { decodeQrFromImage } from "../image-decode";
import { validateEmail } from "@shared/utils/email-validator";
import { validateQrContent } from "@services/analysis/qr-validator";
import { analyzeUrl } from "@services/analysis/url-security-analyzer";
import { checkRateLimit, getClientIp } from "../middleware/rate-limiter";

const SAFE_BROWSING_API = "https://safebrowsing.googleapis.com/v4/threatMatches:find";

export const securityRouter = Router();

// POST /api/v1/validate-email
securityRouter.post("/validate-email", (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ valid: false, reason: "Email is required." });
  }
  return res.json(validateEmail(email.trim()));
});

// POST /api/v1/qr/decode-image
securityRouter.post("/qr/decode-image", async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.length < 16) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const ip = getClientIp(req);
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

    return res.json({ content, kind: validation.kind });
  } catch (e: any) {
    console.error("[v1/decode-image] error:", e);
    return res.status(500).json({ message: "Image decode failed" });
  }
});

// POST /api/v1/check-url  — Google Safe Browsing lookup (v1 mirror of /api/check-url)
securityRouter.post("/check-url", async (req: Request, res: Response) => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "url is required" });
  }

  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  if (!apiKey) {
    return res.json({
      isThreat: false, threatType: null, platformType: null,
      source: "api-unavailable",
      message: "Google Safe Browsing API key not configured",
    });
  }

  try {
    const body = {
      client: { clientId: "qr-guard", clientVersion: "1.0.0" },
      threatInfo: {
        threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
        platformTypes: ["ANY_PLATFORM"],
        threatEntryTypes: ["URL"],
        threatEntries: [{ url }],
      },
    };
    const sbRes = await fetch(`${SAFE_BROWSING_API}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!sbRes.ok) throw new Error(`Safe Browsing API returned ${sbRes.status}`);
    const data = (await sbRes.json()) as { matches?: { threatType: string; platformType: string }[] };

    if (data.matches?.length) {
      const match = data.matches[0];
      return res.json({ isThreat: true, threatType: match.threatType, platformType: match.platformType, source: "google-safe-browsing" });
    }
    return res.json({ isThreat: false, threatType: null, platformType: null, source: "google-safe-browsing" });
  } catch (err: any) {
    console.error("[v1/check-url] error:", err?.message);
    return res.status(502).json({
      isThreat: false, threatType: null, platformType: null,
      source: "api-unavailable",
      message: "Threat intelligence service temporarily unavailable",
    });
  }
});

// POST /api/v1/analyze  — local heuristic QR/URL content analysis
securityRouter.post("/analyze", async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const allowed = await checkRateLimit(ip);
  if (!allowed) {
    return res.status(429).json({ message: "Too many requests" });
  }

  try {
    const { content } = req.body;
    if (!content || typeof content !== "string") {
      return res.status(400).json({ message: "content is required" });
    }
    if (content.length > 4096) {
      return res.status(413).json({ message: "Content too long" });
    }

    const validation = validateQrContent(content);
    if (!validation.valid) {
      return res.status(422).json({
        message: validation.error || "Content rejected by safety check",
        code: "QR_VALIDATION_FAILED",
      });
    }

    // Run heuristic analysis for URL content
    const isUrl = /^https?:\/\//i.test(content.trim()) || /^www\./i.test(content.trim());
    if (isUrl) {
      const result = analyzeUrl(content);
      const isSuspicious = result.riskLevel !== "safe" && result.riskLevel !== "low";
      return res.json({
        kind: "url",
        riskLevel: result.riskLevel,
        isSuspicious,
        warnings: result.warnings ?? [],
        heuristic: true,
      });
    }

    return res.json({
      kind: validation.kind ?? "text",
      riskLevel: "safe",
      isSuspicious: false,
      warnings: [],
      heuristic: false,
    });
  } catch (e: any) {
    console.error("[v1/analyze] error:", e);
    return res.status(500).json({ message: "Analysis failed" });
  }
});
