/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BINRO API: PUSH NOTIFICATIONS ROUTER
 * ───────────────────────────────────────────────────────────────────────────────
 * Manages push notification registration, open tracking, and outbound delivery.
 * Backed by Supabase public.users table.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Router, type Request, type Response } from "express";
import { sendExpoPush, isValidExpoPushToken } from "../lib/expo-push";
import { getAdminClient } from "../lib/supabase-admin";

export const pushRouter = Router();

/**
 * POST /api/push/notify
 * Dispatches an outbound push notification to a specific user asynchronously.
 */
pushRouter.post("/notify", async (req: Request, res: Response) => {
  const { toUserId, title, body, data } = req.body ?? {};

  if (!toUserId || !title || !body) {
    return res.status(400).json({ error: "Missing toUserId / title / body" });
  }

  // Non-blocking asynchronous delivery
  sendPushToUser(toUserId, title, body, data).catch((error) => {
    console.error("[push/notify] Dispatch error:", error);
  });

  return res.json({ queued: true });
});

/**
 * POST /api/push/register
 * Saves the recipient's Expo push token in public.users.
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
    const client = getAdminClient();
    if (!client) {
      return res.status(503).json({ error: "Database not available" });
    }

    const { error } = await client
      .from("users")
      .update({
        push_token: token,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw error;
    return res.json({ ok: true });
  } catch (error: any) {
    console.error("[push/register] Failed to save token:", error.message);
    return res.status(500).json({ error: "Could not save token" });
  }
});

/**
 * POST /api/push/track-open
 * Records app opening activity for re-engagement analytics.
 */
pushRouter.post("/track-open", async (req: Request, res: Response) => {
  const { userId } = req.body ?? {};
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const client = getAdminClient();
    if (!client) return res.json({ ok: false });

    await client
      .from("users")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    return res.json({ ok: true });
  } catch {
    return res.json({ ok: false });
  }
});

/**
 * Dispatches an Expo push notification to the recipient user.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<void> {
  try {
    const client = getAdminClient();
    if (!client) return;

    const { data: user, error } = await client
      .from("users")
      .select("push_token")
      .eq("id", userId)
      .maybeSingle();

    if (error || !user) return;
    const token = user.push_token;
    if (!token || !isValidExpoPushToken(token)) return;

    await sendExpoPush({ to: token, title, body, data, sound: "default" });
  } catch (error) {
    console.error("[push/sendPushToUser] Delivery error:", error);
  }
}
