import type { Request, Response, Express } from "express";
import { verifyFirebaseIdToken } from "../lib/verify-firebase-token";
import { fsGet, fsUpdate } from "../lib/firestore-rest";

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

    let userId: string;
    try {
      const decoded = await verifyFirebaseIdToken(idToken);
      userId = decoded.uid;
    } catch (err: any) {
      if (
        err?.code === "auth/id-token-expired" ||
        err?.code === "auth/id-token-revoked"
      ) {
        return res.status(401).json({ error: "Invalid or expired auth token" });
      }
      return res.status(401).json({ error: "Invalid auth token" });
    }

    try {
      const doc = await fsGet(`qrCodes/${qrId}`, idToken);
      if (!doc.exists) {
        return res.status(404).json({ error: "QR code not found" });
      }

      const data = doc.data!;
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

      await fsUpdate(`qrCodes/${qrId}`, { isActive, deactivationMessage: msg }, idToken);

      return res.json({ success: true });
    } catch (err: any) {
      console.error("[qr-active] error:", err?.message);
      return res.status(500).json({ error: err?.message || "Update failed" });
    }
  });
}
