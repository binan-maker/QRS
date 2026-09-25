/**
 * /api/v1/qr — legacy QR code operations
 *
 * Refactored to use the shared `authenticate` middleware instead of
 * copy-pasted inline token verification. Logic is otherwise unchanged.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { admin, getAdminDb } from "../lib/supabase-admin";
import { reportQrCode } from "../services/report-service";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  standardLimit,
  strictLimit,
} from "../middleware/rate-limit-presets";

export const qrRouter = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const reportSchema = z.object({
  reportType: z.string().min(1).max(60),
});

const commentCountSchema = z.object({
  delta: z.literal(1).or(z.literal(-1)),
});

const validateVpaSchema = z.object({
  vpa: z.string().min(3).max(100),
});

// ─── POST /api/v1/qr/validate-vpa — validate a UPI VPA ───────────────────────
// valid=null means the service is unavailable — callers must still allow the payment.
// NOTE: VPA validation via an external gateway is not currently configured.

qrRouter.post(
  "/validate-vpa",
  validateBody(validateVpaSchema),
  standardLimit,
  async (req: Request, res: Response) => {
    const { vpa } = req.body;

    // VPA validation via an external UPI gateway is not currently configured.
    // Callers must treat valid=null as "unknown" and still allow the payment.
    return res.json({ valid: null, customerName: null, reason: "Validation service not configured" });
  },
);

// ─── POST /api/v1/qr/:qrId/report — submit / toggle a fraud report ───────────

qrRouter.post(
  "/:qrId/report",
  authenticate,
  strictLimit,
  validateBody(reportSchema),
  async (req: Request, res: Response) => {
    const { qrId } = req.params;
    const { reportType } = req.body;

    try {
      const result = await reportQrCode(qrId, req.user!.uid, reportType, req.user!.emailVerified);
      return res.json({ data: { success: true, action: result.action } });
    } catch (e: any) {
      console.error("[v1/qr/report]", e.message);
      return res.status(500).json({ error: e?.message ?? "Failed to submit report", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── POST /api/v1/qr/:qrId/comment-count — increment or decrement commentCount

qrRouter.post(
  "/:qrId/comment-count",
  authenticate,
  standardLimit,
  validateBody(commentCountSchema),
  async (req: Request, res: Response) => {
    const { qrId } = req.params;
    const { delta } = req.body;

    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      await db.collection("qrCodes").doc(qrId).update({
        commentCount: admin.firestore.FieldValue.increment(delta),
      });
      return res.json({ data: { success: true } });
    } catch (e: any) {
      console.error("[v1/qr/comment-count]", e.message);
      return res.status(500).json({ error: "Failed to update comment count", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

