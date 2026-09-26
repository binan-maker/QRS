/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BINRO API: SECURITY & IMAGE UTILITIES ROUTER
 * ───────────────────────────────────────────────────────────────────────────────
 * Provides security utilities including:
 * - Disposable / temporary email filtering
 * - Server-side QR matrix decoding from base64 image data
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Router, type Request, type Response } from "express";
import { decodeQrFromImage } from "../image-decode";
import { validateEmail } from "@shared/utils/email-validator";
import { validateQrContent } from "@services/analysis/qr-validator";
import { checkRateLimit, getClientIp } from "../middleware/rate-limiter";

export const securityRouter = Router();

/**
 * POST /validate-email
 * Checks whether an email address is valid and not from a disposable domain.
 */
securityRouter.post("/validate-email", (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ valid: false, reason: "Email is required." });
  }
  return res.json(validateEmail(email.trim()));
});

/**
 * POST /qr/decode-image
 * Extracts the raw QR content and safety classification from an uploaded base64 image.
 */
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
    if (!content) {
      return res.status(404).json({ message: "No QR code found in image" });
    }

    const validation = validateQrContent(content);
    if (!validation.valid) {
      return res.status(422).json({
        message: validation.error || "QR content rejected by safety check",
        code: "QR_VALIDATION_FAILED",
      });
    }

    return res.json({ content, kind: validation.kind });
  } catch (error: any) {
    console.error("[security/decode-image] Error:", error);
    return res.status(500).json({ message: "Image decode failed" });
  }
});
