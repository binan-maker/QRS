import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { decodeQrFromImage } from "./image-decode";
import { registerV1Routes } from "./routes/index";
import { registerIfscRoute } from "./routes/ifsc";
import { pushRouter } from "./routes/push";
import { validateEmail } from "@shared/utils/email-validator";
import { validateQrContent } from "@services/analysis/qr-validator";
import { checkRateLimit, getClientIp } from "./middleware/rate-limiter";

export async function registerRoutes(app: Express): Promise<Server> {
  // ── Versioned API (all handlers mirrored under /api/v1/) ────────────────────
  registerV1Routes(app);

  // ── Domain route modules ────────────────────────────────────────────────────
  registerIfscRoute(app);
  app.use("/api/push", pushRouter);

  // ── Health check ────────────────────────────────────────────────────────────
  app.get("/status", (_req, res) => {
    res.json({ status: "ok" });
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
