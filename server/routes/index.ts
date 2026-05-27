import type { Express } from "express";
import { securityRouter } from "./security";
import { qrRouter } from "./qr";
import { paymentsRouter } from "./payments";

/**
 * Registers all versioned API routes under /api/v1/.
 *
 * Route layout:
 *   /api/v1/validate-email         POST  — email validator
 *   /api/v1/qr/decode-image        POST  — server-side QR image decode
 *   /api/v1/check-url              POST  — Google Safe Browsing lookup
 *   /api/v1/analyze                POST  — local heuristic QR/URL analysis
 *   /api/v1/qr/:qrId/active        PATCH — toggle QR active state
 *   /api/v1/qr/:uuid/analytics     GET   — aggregated analytics (owner-only)
 *   /api/v1/donation/create-order  POST  — Razorpay order
 *   /api/v1/donation/verify        POST  — Razorpay verification
 */
export function registerV1Routes(app: Express): void {
  app.use("/api/v1", securityRouter);
  app.use("/api/v1/qr", qrRouter);
  app.use("/api/v1/donation", paymentsRouter);
}
