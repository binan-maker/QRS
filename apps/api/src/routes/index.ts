/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BINRO API: VERSION 1 ROUTE REGISTRY
 * ───────────────────────────────────────────────────────────────────────────────
 * Mounts all domain-specific routers under /api/v1/.
 *
 * Route Map:
 *   /api/v1/users                 User profile, handle update, scan history
 *   /api/v1/qr                    QR details, scan counters
 *   /api/v1/qr/:qrId/comments     QR comments and like toggles
 *   /api/v1/feedback              App crash and feedback submissions
 *   /api/v1/validate-email        Disposable email blocking
 *   /api/v1/qr/decode-image       Server-side QR image matrix decoding
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { Express } from "express";
import { securityRouter } from "./security";
import { usersRouter } from "./users";
import { feedbackRouter } from "./feedback";
import { qrRouter } from "./qr";
import { commentsRouter } from "./comments";

/**
 * Registers all Version 1 API endpoints onto the Express app instance.
 */
export function registerV1Routes(app: Express): void {
  // ── 1. Security & Validation Utilities ──────────────────────────────────────
  app.use("/api/v1", securityRouter);

  // ── 2. User Profiles & Scan Logs ────────────────────────────────────────────
  app.use("/api/v1/users", usersRouter);

  // ── 3. Diagnostic & User Feedback ───────────────────────────────────────────
  app.use("/api/v1/feedback", feedbackRouter);

  // ── 4. QR Codes & Comments ──────────────────────────────────────────────────
  app.use("/api/v1/qr", qrRouter);
  app.use("/api/v1/qr/:qrId/comments", commentsRouter);
}
