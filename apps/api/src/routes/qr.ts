/**
 * /api/v1/qr — legacy QR code operations
 *
 * Refactored to use the shared `authenticate` middleware instead of
 * copy-pasted inline token verification. Logic is otherwise unchanged.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { admin, getAdminDb } from "../lib/firebase-admin";
import { reportQrCode } from "../services/report-service";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  relaxedLimit,
  standardLimit,
  strictLimit,
} from "../middleware/rate-limit-presets";

export const qrRouter = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const toggleActiveSchema = z.object({
  isActive: z.boolean(),
  deactivationMessage: z.string().max(100).nullable().optional(),
});

const reportSchema = z.object({
  reportType: z.string().min(1).max(60),
});

const commentCountSchema = z.object({
  delta: z.literal(1).or(z.literal(-1)),
});

const validateVpaSchema = z.object({
  vpa: z.string().min(3).max(100),
});

// ─── PATCH /api/v1/qr/:qrId/active — toggle active/paused state ──────────────

qrRouter.patch(
  "/:qrId/active",
  authenticate,
  standardLimit,
  validateBody(toggleActiveSchema),
  async (req: Request, res: Response) => {
    const { qrId } = req.params;
    const { isActive, deactivationMessage } = req.body;
    const uid = req.user!.uid;

    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      const docRef = db.collection("qrCodes").doc(qrId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) return res.status(404).json({ error: "QR code not found", code: "QR_NOT_FOUND", status: 404 });
      const data = docSnap.data()!;
      if (data.ownerId !== uid) return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN", status: 403 });
      if (data.qrType === "government") return res.status(403).json({ error: "Government QR codes cannot be modified", code: "FORBIDDEN", status: 403 });

      const msg = isActive
        ? null
        : typeof deactivationMessage === "string"
          ? deactivationMessage.trim().slice(0, 100) || null
          : null;

      await docRef.update({
        isActive,
        deactivationMessage: msg,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.json({ data: { success: true, isActive } });
    } catch (e: any) {
      console.error("[v1/qr/active]", e.message);
      return res.status(500).json({ error: "Failed to update QR code", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

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

// ─── GET /api/v1/qr/:uuid/analytics — aggregated scan analytics (owner-only) ──

qrRouter.get(
  "/:uuid/analytics",
  authenticate,
  relaxedLimit,
  async (req: Request, res: Response) => {
    const { uuid } = req.params;
    const uid = req.user!.uid;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // Resolve qrDocId: try direct ID, then query by uuid field
      let qrDocId: string | null = null;
      const direct = await db.collection("qrCodes").doc(uuid).get();
      if (direct.exists && direct.data()?.ownerId === uid) {
        qrDocId = uuid;
      } else {
        const q = await db.collection("qrCodes").where("uuid", "==", uuid).limit(1).get();
        if (!q.empty && q.docs[0].data().ownerId === uid) qrDocId = q.docs[0].id;
      }

      if (!qrDocId) return res.status(403).json({ error: "QR code not found or you do not own it", code: "FORBIDDEN", status: 403 });

      const qrDoc = await db.collection("qrCodes").doc(qrDocId).get();
      const authoritativeScanCount: number = qrDoc.data()?.scanCount ?? 0;

      const eventsSnap = await db
        .collection("qrCodes").doc(qrDocId)
        .collection("events")
        .orderBy("timestamp", "desc")
        .limit(2000)
        .get();

      const now = Date.now();
      const MS_7D  = 7  * 24 * 60 * 60 * 1000;
      const MS_30D = 30 * 24 * 60 * 60 * 1000;

      let scans7d = 0;
      let scans30d = 0;
      const trend7d    = new Array(7).fill(0);
      const platformBreakdown = { android: 0, ios: 0, web: 0, unknown: 0 };
      const verdictBreakdown  = { safe: 0, flagged: 0, unknown: 0 };
      const topHours   = new Array(24).fill(0);

      for (const doc of eventsSnap.docs) {
        const d = doc.data();
        const ts: number = d.timestamp?.toDate?.()?.getTime?.() ?? now;
        const age = now - ts;
        if (age < MS_7D)  { scans7d++; trend7d[Math.min(6, Math.floor(age / 86_400_000))]++; }
        if (age < MS_30D) scans30d++;
        const plat = d.platform || "unknown";
        if (plat in platformBreakdown) (platformBreakdown as any)[plat]++; else platformBreakdown.unknown++;
        const ver = d.verdict || "unknown";
        if (ver in verdictBreakdown)   (verdictBreakdown as any)[ver]++;  else verdictBreakdown.unknown++;
        topHours[new Date(ts).getHours()]++;
      }

      const totalScans = authoritativeScanCount > 0 ? authoritativeScanCount : eventsSnap.size;

      return res.json({
        data: { totalScans, scans7d, scans30d, trend7d, platformBreakdown, verdictBreakdown, topHours, cachedAt: now },
      });
    } catch (e: any) {
      console.error("[v1/qr/analytics]", e.message);
      return res.status(500).json({ error: "Analytics query failed", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);
