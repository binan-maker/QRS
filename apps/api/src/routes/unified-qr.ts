/**
 * /api/v1/unified-qr — new unified QR model CRUD
 *
 * Mirrors the Firestore `qrs/{id}` collection (createUnifiedQr / updateUnifiedQr etc.
 * in services/qr-unified.ts) but enforces server-side validation and ownership checks
 * via the Firebase Admin SDK.
 *
 * All write endpoints require Firebase Auth (authenticate middleware).
 * TODO markers show where Drizzle/PostgreSQL queries will replace Firestore calls.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { admin, getAdminDb } from "../lib/firebase-admin";
import { authenticate, optionalAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  relaxedLimit,
  standardLimit,
  strictLimit,
} from "../middleware/rate-limit-presets";

export const unifiedQrRouter = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const designSchema = z.object({
  fgColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  bgColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  logoPosition: z.enum(["center", "top-left", "top-right", "bottom-left", "bottom-right"]).optional(),
  logoUri: z.string().url().max(500).nullable().optional(),
  label: z.string().max(60).nullable().optional(),
});

const createQrSchema = z.object({
  template: z.string().max(60).nullable().optional(),
  title: z.string().min(1).max(120).nullable().optional(),
  isDynamic: z.boolean().default(false),
  destination: z.string().min(1).max(2000),
  rawDestination: z.string().min(1).max(2000).optional(),
  contentType: z.string().min(1).max(50).default("url"),
  qrType: z.enum(["individual", "business", "government"]).default("individual"),
  businessName: z.string().max(120).nullable().optional(),
  scanLimit: z.number().int().min(1).max(1_000_000).nullable().optional(),
  expiryDate: z.string().datetime({ offset: true }).nullable().optional(),
  expiryPreset: z.enum(["24h", "7d", "30d", "90d", "1y"]).nullable().optional(),
  design: designSchema.optional(),
  formValues: z.object({
    value: z.string(),
    extra: z.record(z.string()),
  }).nullable().optional(),
});

const updateQrSchema = z.object({
  title: z.string().min(1).max(120).nullable().optional(),
  scanLimit: z.number().int().min(1).max(1_000_000).nullable().optional(),
  expiryDate: z.string().datetime({ offset: true }).nullable().optional(),
  expiryPreset: z.enum(["24h", "7d", "30d", "90d", "1y"]).nullable().optional(),
  design: designSchema.optional(),
});

const updateDestinationSchema = z.object({
  destination: z.string().url().min(1).max(2000),
});

const updateStatusSchema = z.object({
  status: z.enum(["active", "inactive"]),
  deactivationMessage: z.string().max(120).nullable().optional(),
});

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeStatus(data: any): string {
  if (data.status === "inactive") return "inactive";
  if (data.expiryDate && new Date(data.expiryDate).getTime() < Date.now()) return "expired";
  if (data.scanLimit != null && (data.scanCount ?? 0) >= data.scanLimit) return "limit_reached";
  return "active";
}

function mapQrDoc(id: string, data: any) {
  return {
    id,
    ownerId: data.ownerId ?? null,
    ownerName: data.ownerName ?? null,
    qrType: data.qrType ?? "individual",
    template: data.template ?? null,
    title: data.title ?? null,
    isDynamic: data.isDynamic === true,
    destination: data.destination ?? null,
    rawDestination: data.rawDestination ?? data.destination ?? null,
    contentType: data.contentType ?? "text",
    businessName: data.businessName ?? null,
    status: computeStatus(data),
    scanCount: data.scanCount ?? 0,
    downloads: data.downloads ?? 0,
    shares: data.shares ?? 0,
    scanLimit: data.scanLimit ?? null,
    expiryDate: data.expiryDate ?? null,
    expiryPreset: data.expiryPreset ?? null,
    design: {
      fgColor: data.design?.fgColor ?? "#0A0E17",
      bgColor: data.design?.bgColor ?? "#F8FAFC",
      logoPosition: data.design?.logoPosition ?? "center",
      logoUri: data.design?.logoUri ?? null,
      label: data.design?.label ?? null,
    },
    formValues: data.formValues ?? null,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
  };
}

// ─── GET /api/v1/unified-qr — list own QRs (paginated) ───────────────────────

unifiedQrRouter.get(
  "/",
  authenticate,
  relaxedLimit,
  async (req: Request, res: Response) => {
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: "Invalid query params", code: "VALIDATION_ERROR", status: 400 });

    const { limit, cursor } = parsed.data;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: SELECT * FROM unified_qrs WHERE owner_id = $uid ORDER BY created_at DESC LIMIT $limit
      let query = db
        .collection("qrs")
        .where("ownerId", "==", req.user!.uid)
        .orderBy("createdAt", "desc")
        .limit(limit + 1);

      if (cursor) {
        const cursorDoc = await db.collection("qrs").doc(cursor).get();
        if (cursorDoc.exists) query = query.startAfter(cursorDoc);
      }

      const snap = await query.get();
      const hasMore = snap.docs.length > limit;
      const docs = snap.docs.slice(0, limit);

      return res.json({
        data: docs.map((d) => mapQrDoc(d.id, d.data())),
        pagination: {
          hasMore,
          nextCursor: hasMore ? docs[docs.length - 1].id : null,
          limit,
        },
      });
    } catch (e: any) {
      console.error("[unified-qr GET /]", e.message);
      return res.status(500).json({ error: "Failed to list QRs", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── POST /api/v1/unified-qr — create new QR ─────────────────────────────────

unifiedQrRouter.post(
  "/",
  authenticate,
  standardLimit,
  validateBody(createQrSchema),
  async (req: Request, res: Response) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    const uid = req.user!.uid;
    const body = req.body;

    try {
      // Resolve ownerName from user profile
      // TODO: SELECT display_name FROM users WHERE firebase_uid = $uid
      const userSnap = await db.collection("users").doc(uid).get();
      const ownerName: string = userSnap.data()?.displayName ?? userSnap.data()?.username ?? "Unknown";

      // Generate a nano-id style document ID
      const { nanoid } = await import("nanoid").catch(() => ({ nanoid: () => crypto.randomUUID() }));
      const id = (nanoid as any)(21);

      const docData: Record<string, any> = {
        ownerId: uid,
        ownerName,
        qrType: body.qrType ?? "individual",
        template: body.template ?? null,
        title: body.title ?? null,
        isDynamic: body.isDynamic ?? false,
        destination: body.destination,
        rawDestination: body.rawDestination ?? body.destination,
        contentType: body.contentType ?? "url",
        businessName: body.businessName ?? null,
        status: "active",
        scanCount: 0,
        downloads: 0,
        shares: 0,
        scanLimit: body.scanLimit ?? null,
        expiryDate: body.expiryDate ?? null,
        expiryPreset: body.expiryPreset ?? null,
        design: {
          fgColor: body.design?.fgColor ?? "#0A0E17",
          bgColor: body.design?.bgColor ?? "#F8FAFC",
          logoPosition: body.design?.logoPosition ?? "center",
          logoUri: body.design?.logoUri ?? null,
          label: body.design?.label ?? null,
        },
        formValues: body.formValues ?? null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // TODO: INSERT INTO unified_qrs (...) VALUES (...)
      await db.collection("qrs").doc(id).set(docData);

      return res.status(201).json({ data: { id, ...docData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } });
    } catch (e: any) {
      console.error("[unified-qr POST /]", e.message);
      return res.status(500).json({ error: "Failed to create QR", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── GET /api/v1/unified-qr/:id — get single QR ──────────────────────────────

unifiedQrRouter.get(
  "/:id",
  optionalAuth,
  relaxedLimit,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: SELECT * FROM unified_qrs WHERE id = $id
      const snap = await db.collection("qrs").doc(id).get();
      if (!snap.exists) {
        return res.status(404).json({ error: "QR not found", code: "QR_NOT_FOUND", status: 404 });
      }
      const data = snap.data()!;

      // Private-mode QRs only visible to owner
      if (data.privateMode && data.ownerId !== req.user?.uid) {
        return res.status(403).json({ error: "This QR is private", code: "FORBIDDEN", status: 403 });
      }

      return res.json({ data: mapQrDoc(id, data) });
    } catch (e: any) {
      console.error("[unified-qr GET /:id]", e.message);
      return res.status(500).json({ error: "Failed to fetch QR", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── PATCH /api/v1/unified-qr/:id — update design / limits / title ───────────

unifiedQrRouter.patch(
  "/:id",
  authenticate,
  standardLimit,
  validateBody(updateQrSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: SELECT owner_id FROM unified_qrs WHERE id = $id
      const snap = await db.collection("qrs").doc(id).get();
      if (!snap.exists) return res.status(404).json({ error: "QR not found", code: "QR_NOT_FOUND", status: 404 });
      if (snap.data()!.ownerId !== req.user!.uid) return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN", status: 403 });

      const body = req.body;
      const updates: Record<string, any> = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (body.title !== undefined) updates.title = body.title;
      if (body.scanLimit !== undefined) updates.scanLimit = body.scanLimit;
      if (body.expiryDate !== undefined) updates.expiryDate = body.expiryDate;
      if (body.expiryPreset !== undefined) updates.expiryPreset = body.expiryPreset;
      if (body.design) {
        const current = snap.data()!.design ?? {};
        updates.design = { ...current, ...body.design };
      }

      // TODO: UPDATE unified_qrs SET ... WHERE id = $id AND owner_id = $uid
      await db.collection("qrs").doc(id).update(updates);
      return res.json({ data: { updated: true } });
    } catch (e: any) {
      console.error("[unified-qr PATCH /:id]", e.message);
      return res.status(500).json({ error: "Failed to update QR", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── PATCH /api/v1/unified-qr/:id/destination — update redirect destination ──

unifiedQrRouter.patch(
  "/:id/destination",
  authenticate,
  standardLimit,
  validateBody(updateDestinationSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { destination } = req.body;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: SELECT owner_id, is_dynamic FROM unified_qrs WHERE id = $id
      const snap = await db.collection("qrs").doc(id).get();
      if (!snap.exists) return res.status(404).json({ error: "QR not found", code: "QR_NOT_FOUND", status: 404 });
      const data = snap.data()!;
      if (data.ownerId !== req.user!.uid) return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN", status: 403 });
      if (!data.isDynamic) return res.status(400).json({ error: "Only dynamic QRs can have their destination changed", code: "NOT_DYNAMIC", status: 400 });

      // TODO: UPDATE unified_qrs SET destination = $dest, raw_destination = $dest, updated_at = NOW() WHERE id = $id AND owner_id = $uid
      await db.collection("qrs").doc(id).update({
        destination,
        rawDestination: destination,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.json({ data: { updated: true, destination } });
    } catch (e: any) {
      console.error("[unified-qr PATCH /:id/destination]", e.message);
      return res.status(500).json({ error: "Failed to update destination", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── PATCH /api/v1/unified-qr/:id/status — activate / deactivate ─────────────

unifiedQrRouter.patch(
  "/:id/status",
  authenticate,
  standardLimit,
  validateBody(updateStatusSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, deactivationMessage } = req.body;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: SELECT owner_id, qr_type FROM unified_qrs WHERE id = $id
      const snap = await db.collection("qrs").doc(id).get();
      if (!snap.exists) return res.status(404).json({ error: "QR not found", code: "QR_NOT_FOUND", status: 404 });
      const data = snap.data()!;
      if (data.ownerId !== req.user!.uid) return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN", status: 403 });
      if (data.qrType === "government") return res.status(403).json({ error: "Government QRs cannot be deactivated", code: "FORBIDDEN", status: 403 });

      const updates: Record<string, any> = {
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (status === "inactive" && deactivationMessage) {
        updates.deactivationMessage = String(deactivationMessage).trim().slice(0, 120);
      } else {
        updates.deactivationMessage = null;
      }

      // TODO: UPDATE unified_qrs SET status = $status, deactivation_message = $msg, updated_at = NOW() WHERE id = $id AND owner_id = $uid
      await db.collection("qrs").doc(id).update(updates);
      return res.json({ data: { updated: true, status } });
    } catch (e: any) {
      console.error("[unified-qr PATCH /:id/status]", e.message);
      return res.status(500).json({ error: "Failed to update status", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── DELETE /api/v1/unified-qr/:id — delete QR ───────────────────────────────

unifiedQrRouter.delete(
  "/:id",
  authenticate,
  strictLimit,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: DELETE FROM unified_qrs WHERE id = $id AND owner_id = $uid
      const snap = await db.collection("qrs").doc(id).get();
      if (!snap.exists) return res.status(404).json({ error: "QR not found", code: "QR_NOT_FOUND", status: 404 });
      if (snap.data()!.ownerId !== req.user!.uid) return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN", status: 403 });

      await db.collection("qrs").doc(id).delete();
      return res.json({ data: { deleted: true } });
    } catch (e: any) {
      console.error("[unified-qr DELETE /:id]", e.message);
      return res.status(500).json({ error: "Failed to delete QR", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── GET /api/v1/unified-qr/:id/analytics — scan analytics (owner-only) ──────

unifiedQrRouter.get(
  "/:id/analytics",
  authenticate,
  relaxedLimit,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: SELECT * FROM unified_qrs WHERE id = $id AND owner_id = $uid
      const snap = await db.collection("qrs").doc(id).get();
      if (!snap.exists) return res.status(404).json({ error: "QR not found", code: "QR_NOT_FOUND", status: 404 });
      if (snap.data()!.ownerId !== req.user!.uid) return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN", status: 403 });

      const qrData = snap.data()!;
      const totalScans: number = qrData.scanCount ?? 0;

      // TODO: complex scan analytics query — replace with:
      // SELECT
      //   COUNT(*) FILTER (WHERE scanned_at > NOW() - INTERVAL '7 days') AS scans_7d,
      //   COUNT(*) FILTER (WHERE scanned_at > NOW() - INTERVAL '30 days') AS scans_30d,
      //   platform, COUNT(*) FROM qr_scans WHERE unified_qr_id = $id GROUP BY platform
      const scansSnap = await db
        .collection("qrs")
        .doc(id)
        .collection("events")
        .orderBy("timestamp", "desc")
        .limit(2000)
        .get()
        .catch(() => null);

      const now = Date.now();
      const MS_7D = 7 * 24 * 60 * 60 * 1000;
      const MS_30D = 30 * 24 * 60 * 60 * 1000;

      let scans7d = 0;
      let scans30d = 0;
      const trend7d = new Array(7).fill(0);
      const platformBreakdown = { android: 0, ios: 0, web: 0, unknown: 0 };
      const topHours = new Array(24).fill(0);

      if (scansSnap) {
        for (const doc of scansSnap.docs) {
          const d = doc.data();
          const ts: number = d.timestamp?.toDate?.()?.getTime?.() ?? now;
          const age = now - ts;
          if (age < MS_7D) { scans7d++; trend7d[Math.min(6, Math.floor(age / 86_400_000))]++; }
          if (age < MS_30D) scans30d++;
          const plat = d.platform || "unknown";
          if (plat in platformBreakdown) (platformBreakdown as any)[plat]++;
          else platformBreakdown.unknown++;
          topHours[new Date(ts).getHours()]++;
        }
      }

      return res.json({
        data: {
          totalScans,
          scans7d,
          scans30d,
          trend7d,
          platformBreakdown,
          topHours,
          cachedAt: now,
        },
      });
    } catch (e: any) {
      console.error("[unified-qr GET /:id/analytics]", e.message);
      return res.status(500).json({ error: "Analytics query failed", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);
