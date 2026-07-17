import { Router } from "express";
import type { Request, Response } from "express";
import { sendExpoPush, isValidExpoPushToken } from "../lib/expo-push";

export const pushRouter = Router();

/**
 * POST /api/push/notify
 * Body: { toUserId: string, title: string, body: string, data?: object }
 *
 * Looks up the recipient's push token via Firebase Admin, then sends via
 * Expo's push gateway. Always returns 200 so callers don't retry on push
 * failures (which are non-critical).
 */
pushRouter.post("/notify", async (req: Request, res: Response) => {
  const { toUserId, title, body, data } = req.body ?? {};

  if (!toUserId || !title || !body) {
    return res.status(400).json({ error: "Missing toUserId / title / body" });
  }

  // Non-blocking — client doesn't need to wait for delivery
  sendPushToUser(toUserId, title, body, data).catch(() => {});

  return res.json({ queued: true });
});

/**
 * POST /api/push/register
 * Body: { userId: string, token: string }
 * Saves the Expo push token on the user document via Firebase Admin.
 */
pushRouter.post("/register", async (req: Request, res: Response) => {
  const { userId, token } = req.body ?? {};

  if (!userId || !token) {
    return res.status(400).json({ error: "Missing userId or token" });
  }
  if (!isValidExpoPushToken(token)) {
    return res.status(400).json({ error: "Invalid Expo push token format" });
  }

  try {
    const { getAdminDb } = await import("../lib/firebase-admin");
    const adminDb = getAdminDb();
    if (!adminDb) return res.status(503).json({ error: "DB not available" });
    await adminDb
      .collection("users")
      .doc(userId)
      .set(
        { pushToken: token, pushTokenUpdatedAt: Date.now() },
        { merge: true }
      );
    return res.json({ ok: true });
  } catch (e) {
    console.error("[Push/register] Failed to save token:", e);
    return res.status(500).json({ error: "Could not save token" });
  }
});

/**
 * POST /api/push/track-open
 * Body: { userId: string }
 * Records the last time the user opened the app (used by re-engagement scheduler).
 */
pushRouter.post("/track-open", async (req: Request, res: Response) => {
  const { userId } = req.body ?? {};
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const { getAdminDb } = await import("../lib/firebase-admin");
    const adminDb = getAdminDb();
    if (!adminDb) return res.json({ ok: false });
    await adminDb
      .collection("users")
      .doc(userId)
      .set({ lastOpenedAt: Date.now() }, { merge: true });
    return res.json({ ok: true });
  } catch {
    return res.json({ ok: false }); // non-critical, silent
  }
});

// ─── Internal helper used by the scheduler ───────────────────────────────────
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    const { getAdminDb } = await import("../lib/firebase-admin");
    const adminDb = getAdminDb();
    if (!adminDb) return;
    const snap = await adminDb.collection("users").doc(userId).get();
    const token: string | undefined = snap.data()?.pushToken;
    if (!token || !isValidExpoPushToken(token)) return;
    await sendExpoPush({ to: token, title, body, data, sound: "default" });
  } catch (e) {
    console.error("[Push] sendPushToUser failed:", e);
  }
}
