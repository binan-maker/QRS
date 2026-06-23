import { Router, type Request, type Response } from "express";
import { admin, getAdminDb, getAdminAuth } from "../lib/firebase-admin";
import { reportQrCode } from "@/services/report-service";

export const qrRouter = Router();

// PATCH /api/v1/qr/:qrId/active  — toggle QR active/paused state
qrRouter.patch("/:qrId/active", async (req: Request, res: Response) => {
  const qrId = req.params.qrId as string;
  const { isActive, deactivationMessage } = req.body;

  if (!qrId) return res.status(400).json({ error: "Invalid QR code ID" });
  if (typeof isActive !== "boolean") return res.status(400).json({ error: "isActive must be a boolean" });

  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });

  const adminAuth = getAdminAuth();
  const db = getAdminDb();
  if (!adminAuth || !db) {
    return res.status(503).json({ error: "Server not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON." });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken((authHeader as string).slice(7));
    const uid = decodedToken.uid;

    const docRef = db.collection("qrCodes").doc(qrId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) return res.status(404).json({ error: "QR code not found" });
    const data = docSnap.data()!;
    if (data.ownerId !== uid) return res.status(403).json({ error: "Forbidden" });
    if (data.qrType === "government") return res.status(403).json({ error: "Government QR codes cannot be modified" });

    const msg = isActive
      ? null
      : typeof deactivationMessage === "string"
        ? deactivationMessage.trim().slice(0, 100) || null
        : null;

    const updateData: Record<string, any> = {
      isActive,
      deactivationMessage: msg,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await docRef.update(updateData);
    return res.json({ success: true, isActive });
  } catch (e: any) {
    if (e.code === "auth/argument-error" || e.code === "auth/id-token-expired") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    console.error("[v1/qr/active] error:", e);
    return res.status(500).json({ error: "Failed to update QR code" });
  }
});

// POST /api/v1/qr/validate-vpa  — validate a UPI VPA via Razorpay (free endpoint)
// Returns { valid: boolean|null, customerName: string|null }
// valid=null means the service is unavailable — callers must still allow the payment.
qrRouter.post("/validate-vpa", async (req: Request, res: Response) => {
  const { vpa } = req.body as { vpa?: string };
  if (!vpa || typeof vpa !== "string" || !vpa.trim()) {
    return res.status(400).json({ error: "Missing vpa" });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return res.json({ valid: null, customerName: null, reason: "Validation service not configured" });
  }

  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const rzpRes = await fetch("https://api.razorpay.com/v1/payments/validate/vpa", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify({ vpa: vpa.trim().toLowerCase() }),
    });

    if (rzpRes.ok) {
      const data = await rzpRes.json() as { success?: boolean; customer_name?: string; vpa?: string };
      return res.json({
        valid: data.success === true,
        customerName: data.customer_name || null,
        vpa: data.vpa || vpa,
      });
    }

    // Razorpay returned an error code — treat as invalid VPA
    const errBody = await rzpRes.json().catch(() => ({})) as any;
    const desc: string = errBody?.error?.description ?? "";
    return res.json({ valid: false, customerName: null, reason: desc || "UPI ID not found or inactive" });
  } catch (e: any) {
    console.error("[v1/qr/validate-vpa] error:", e?.message ?? e);
    // Network / unexpected error — don't block the payment
    return res.json({ valid: null, customerName: null, reason: "Validation check failed" });
  }
});

// POST /api/v1/qr/:qrId/report  — submit or toggle a report (safe/scam/spam/fake/…)
// Uses Admin SDK server-side, so Firestore security rules are bypassed.
// Auth token is verified here to establish the caller's identity.
qrRouter.post("/:qrId/report", async (req: Request, res: Response) => {
  const qrId = req.params.qrId as string;
  const { reportType } = req.body as { reportType?: string };

  if (!qrId) return res.status(400).json({ error: "Missing qrId" });
  if (!reportType || typeof reportType !== "string") {
    return res.status(400).json({ error: "Missing or invalid reportType" });
  }

  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    return res.status(503).json({ error: "Server not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON." });
  }

  let uid: string;
  let emailVerified: boolean;
  try {
    const decoded = await adminAuth.verifyIdToken((authHeader as string).slice(7));
    uid = decoded.uid;
    emailVerified = decoded.email_verified ?? false;
  } catch (e: any) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    const result = await reportQrCode(qrId, uid, reportType, emailVerified);
    return res.json({ success: true, action: result.action });
  } catch (e: any) {
    console.error("[v1/qr/report] error:", e?.message ?? e);
    return res.status(500).json({ error: e?.message ?? "Failed to submit report" });
  }
});

// POST /api/v1/qr/:qrId/comment-count  — increment or decrement commentCount via Admin SDK.
// Firestore client rules lock commentCount against direct client writes, so this
// endpoint acts as the authoritative write path (Admin SDK bypasses rules).
// delta must be +1 or -1.
qrRouter.post("/:qrId/comment-count", async (req: Request, res: Response) => {
  const qrId = req.params.qrId as string;
  const { delta } = req.body as { delta?: number };

  if (!qrId) return res.status(400).json({ error: "Missing qrId" });
  if (delta !== 1 && delta !== -1) return res.status(400).json({ error: "delta must be 1 or -1" });

  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });

  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();
  if (!adminAuth || !adminDb) {
    return res.status(503).json({ error: "Server not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON." });
  }

  try {
    await adminAuth.verifyIdToken((authHeader as string).slice(7));
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    await adminDb.collection("qrCodes").doc(qrId).update({
      commentCount: admin.firestore.FieldValue.increment(delta),
    });
    return res.json({ success: true });
  } catch (e: any) {
    console.error("[v1/qr/comment-count] error:", e?.message ?? e);
    return res.status(500).json({ error: "Failed to update comment count" });
  }
});

// GET /api/v1/qr/:uuid/analytics  — aggregated scan analytics (owner-only)
qrRouter.get("/:uuid/analytics", async (req: Request, res: Response) => {
  const { uuid } = req.params;
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });

  const adminAuth = getAdminAuth();
  const db = getAdminDb();
  if (!adminAuth || !db) {
    return res.status(503).json({ error: "Server not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON." });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken((authHeader as string).slice(7));
    const uid = decodedToken.uid;

    // Resolve qrDocId: try direct doc by id, then by uuid field
    const uuidStr = uuid as string;
    let qrDocId: string | null = null;
    const directDoc = await db.collection("qrCodes").doc(uuidStr).get();
    if (directDoc.exists && directDoc.data()?.ownerId === uid) {
      qrDocId = uuidStr;
    } else {
      const q = await db.collection("qrCodes").where("uuid", "==", uuid).limit(1).get();
      if (!q.empty && q.docs[0].data().ownerId === uid) {
        qrDocId = q.docs[0].id;
      }
    }

    if (!qrDocId) {
      return res.status(403).json({ error: "QR code not found or you do not own it" });
    }

    // Authoritative scan count from the QR doc (fraud-guarded, accurate at any scale)
    const qrDoc = await db.collection("qrCodes").doc(qrDocId!).get();
    const authoritativeScanCount: number = qrDoc.data()?.scanCount ?? 0;

    const eventsSnap = await db
      .collection("qrCodes").doc(qrDocId!).collection("events")
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

      if (age < MS_7D) {
        scans7d++;
        trend7d[Math.min(6, Math.floor(age / 86_400_000))]++;
      }
      if (age < MS_30D) scans30d++;

      const plat = d.platform || "unknown";
      if (plat in platformBreakdown) (platformBreakdown as any)[plat]++;
      else platformBreakdown.unknown++;

      const ver = d.verdict || "unknown";
      if (ver in verdictBreakdown) (verdictBreakdown as any)[ver]++;
      else verdictBreakdown.unknown++;

      topHours[new Date(ts).getHours()]++;
    }

    // Use authoritative counter for totalScans; fall back to event count if doc has no counter yet
    const totalScans = authoritativeScanCount > 0 ? authoritativeScanCount : eventsSnap.size;

    return res.json({
      totalScans,
      scans7d,
      scans30d,
      trend7d,
      platformBreakdown,
      verdictBreakdown,
      topHours,
      cachedAt: now,
    });
  } catch (e: any) {
    if (e.code === "auth/argument-error" || e.code === "auth/id-token-expired") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    console.error("[v1/qr/analytics] error:", e);
    return res.status(500).json({ error: "Analytics query failed" });
  }
});
