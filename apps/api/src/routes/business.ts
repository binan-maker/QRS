import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate";
import { getAdminDb, getAdminAuth } from "../lib/firebase-admin";

export const businessRouter = Router();

const RegisterSchema = z.object({
  displayName: z.string().min(1).max(120),
});

businessRouter.post(
  "/register",
  validateBody(RegisterSchema),
  async (req: Request, res: Response) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED", status: 401 });
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    if (!adminAuth || !adminDb) {
      return res.status(503).json({
        error: "Server not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON.",
        code: "SERVICE_UNAVAILABLE",
        status: 503,
      });
    }

    try {
      const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
      const uid = decoded.uid;
      const { displayName } = req.body as z.infer<typeof RegisterSchema>;

      const docRef = adminDb.collection("businessAccounts").doc(uid);
      const existing = await docRef.get();

      if (existing.exists) {
        return res.status(409).json({
          error: "Business account already exists",
          code: "ALREADY_EXISTS",
          status: 409,
        });
      }

      const now = new Date().toISOString();
      const account = {
        uid,
        displayName,
        plan: "free",
        createdAt: now,
        updatedAt: now,
      };

      await docRef.set(account);

      return res.status(201).json({ account });
    } catch (e: any) {
      if (e.code === "auth/argument-error" || e.code === "auth/id-token-expired") {
        return res.status(401).json({ error: "Invalid or expired token", code: "INVALID_TOKEN", status: 401 });
      }
      console.error("[v1/business/register] error:", e);
      return res.status(500).json({ error: "Failed to create business account", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);
