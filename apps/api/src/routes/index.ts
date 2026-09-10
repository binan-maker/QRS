/**
 * API route registry
 *
 * All versioned routes are mounted under /api/v1/.
 *
 * ─── Route map ────────────────────────────────────────────────────────────────
 *
 * Users
 *   GET    /api/v1/users/me                             Own profile
 *   PATCH  /api/v1/users/me                             Update profile
 *   GET    /api/v1/users/:userId                        Public profile
 *   GET    /api/v1/users/me/scans                       Scan history (paginated)
 *   GET    /api/v1/users/me/favorites                   Favorited QRs (paginated)
 *   POST   /api/v1/users/me/favorites/:qrId             Add favorite
 *   DELETE /api/v1/users/me/favorites/:qrId             Remove favorite
 *
 * Legacy QR codes
 *   PATCH  /api/v1/qr/:qrId/active                     Toggle active/paused
 *   POST   /api/v1/qr/:qrId/report                     Submit/toggle fraud report
 *   POST   /api/v1/qr/:qrId/comment-count              Increment/decrement counter
 *   POST   /api/v1/qr/validate-vpa                     Validate UPI VPA
 *
 * Unified QRs (new model)
 *   GET    /api/v1/unified-qr                          List own QRs (paginated)
 *   POST   /api/v1/unified-qr                          Create QR
 *   GET    /api/v1/unified-qr/:id                      Get QR (public/private check)
 *   PATCH  /api/v1/unified-qr/:id                      Update design / limits / title
 *   PATCH  /api/v1/unified-qr/:id/destination          Update redirect destination
 *   PATCH  /api/v1/unified-qr/:id/status               Activate / deactivate
 *   DELETE /api/v1/unified-qr/:id                      Delete QR
 *
 * Comments
 *   GET    /api/v1/qr/:qrId/comments                   List comments (paginated)
 *   POST   /api/v1/qr/:qrId/comments                   Create comment
 *   PATCH  /api/v1/qr/:qrId/comments/:commentId        Edit comment
 *   DELETE /api/v1/qr/:qrId/comments/:commentId        Delete comment
 *   POST   /api/v1/qr/:qrId/comments/:commentId/like   Toggle like
 *
 * Security / Utilities
 *   POST   /api/v1/qr/decode-image                    Decode a QR image
 *   GET    /api/v1/ifsc/:ifsc                          IFSC bank lookup
 *   POST   /api/v1/validate-email                      Email validator
 */

import type { Express } from "express";
import { securityRouter } from "./security";
import { qrRouter } from "./qr";
import { usersRouter } from "./users";
import { unifiedQrRouter } from "./unified-qr";
import { commentsRouter } from "./comments";
import { feedbackRouter } from "./feedback";

export function registerV1Routes(app: Express): void {
  // ── Utilities & security (existing) ────────────────────────────────────────
  app.use("/api/v1", securityRouter);

  // ── User profile, favorites, scan history ──────────────────────────────────
  // NOTE: /me routes must be registered before /:userId so Express doesn't
  // match "me" as a userId parameter.
  app.use("/api/v1/users", usersRouter);

  // ── Legacy QR operations ───────────────────────────────────────────────────
  app.use("/api/v1/qr", qrRouter);

  // ── Legacy QR comments (nested under /qr/:qrId/comments) ──────────────────
  app.use("/api/v1/qr/:qrId/comments", commentsRouter);

  // ── Unified QR (new model) ─────────────────────────────────────────────────
  app.use("/api/v1/unified-qr", unifiedQrRouter);

  // ── Feedback & bug reports ─────────────────────────────────────────────────
  app.use("/api/v1/feedback", feedbackRouter);

}
