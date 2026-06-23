import type { Request, Response, Express } from "express";
import * as admin from "firebase-admin";

function getAdminApp(): admin.app.App | null {
  try {
    if (admin.apps.length > 0) {
      return admin.apps[0]!;
    }
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccount) return null;
    return admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
    });
  } catch {
    return null;
  }
}

export function registerQrActiveRoute(app: Express) {
  app.patch("/api/qr/:qrId/active", async (req: Request, res: Response) => {
    const { qrId } = req.params;
    const { isActive, deactivationMessage } = req.body;

    if (typeof qrId !== "string" || !qrId) {
      return res.status(400).json({ error: "Invalid QR code ID" });
    }
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ error: "isActive must be a boolean" });
    }

    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const idToken = authHeader.slice(7);

    const adminApp = getAdminApp();
    if (!adminApp) {
      return res.status(503).json({
        error: "Server not configured for this operation. Set FIREBASE_SERVICE_ACCOUNT_JSON.",
      });
    }

    try {
      const decoded = await admin.auth(adminApp).verifyIdToken(idToken);
      const userId = decoded.uid;

      const db = admin.firestore(adminApp);
      const docRef = db.collection("qrCodes").doc(qrId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return res.status(404).json({ error: "QR code not found" });
      }

      const data = docSnap.data()!;

      if (data.qrType === "government") {
        return res.status(403).json({ error: "Government QR codes cannot be modified" });
      }
      if (data.ownerId !== userId) {
        return res.status(403).json({ error: "Only the owner can modify this QR code" });
      }

      const msg = isActive
        ? null
        : typeof deactivationMessage === "string"
          ? deactivationMessage.trim().slice(0, 100) || null
          : null;

      await docRef.update({
        isActive,
        deactivationMessage: msg,
      });

      return res.json({ success: true });
    } catch (err: any) {
      console.error("[qr-active] error:", err?.code, err?.message);
      if (
        err?.code === "auth/id-token-expired" ||
        err?.code === "auth/argument-error" ||
        err?.code === "auth/id-token-revoked"
      ) {
        return res.status(401).json({ error: "Invalid or expired auth token" });
      }
      return res.status(500).json({ error: err?.message || "Update failed" });
    }
  });
}
