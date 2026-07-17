/**
 * /api/v1/friends — friend request, accept, decline, unfriend, list
 *
 * Friend relationships are stored directionally in Firestore:
 *   users/{uid}/friends/{friendId}  — each side writes its own entry
 *
 * All endpoints require Firebase Auth.
 * TODO markers show where PostgreSQL queries replace Firestore calls.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { admin, getAdminDb } from "../lib/firebase-admin";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { standardLimit, relaxedLimit, strictLimit } from "../middleware/rate-limit-presets";

export const friendsRouter = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
  status: z.enum(["pending", "friends", "all"]).default("friends"),
});

// ─── GET /api/v1/friends — list friends / pending requests ───────────────────

friendsRouter.get(
  "/",
  authenticate,
  relaxedLimit,
  async (req: Request, res: Response) => {
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: "Invalid query params", code: "VALIDATION_ERROR", status: 400 });
    const { limit, cursor, status } = parsed.data;

    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO:
      // SELECT uf.friend_id, uf.status, uf.added_at, u.display_name, u.photo_url, u.username
      // FROM user_friends uf JOIN users u ON u.id = uf.friend_id
      // WHERE uf.user_id = $uid AND ($status = 'all' OR uf.status = $status)
      // ORDER BY uf.added_at DESC LIMIT $limit
      let query: any = db
        .collection("users")
        .doc(req.user!.uid)
        .collection("friends")
        .orderBy("addedAt", "desc")
        .limit(limit + 1);

      if (status !== "all") query = query.where("status", "==", status);

      if (cursor) {
        const cursorDoc = await db
          .collection("users").doc(req.user!.uid).collection("friends").doc(cursor).get();
        if (cursorDoc.exists) query = query.startAfter(cursorDoc);
      }

      const snap = await query.get();
      const hasMore = snap.docs.length > limit;
      const docs = snap.docs.slice(0, limit);

      return res.json({
        data: docs.map((d: any) => ({
          userId: d.id,
          status: d.data().status ?? "pending",
          addedAt: d.data().addedAt?.toDate?.()?.toISOString() ?? null,
        })),
        pagination: { hasMore, nextCursor: hasMore ? docs[docs.length - 1].id : null, limit },
      });
    } catch (e: any) {
      console.error("[friends GET /]", e.message);
      return res.status(500).json({ error: "Failed to list friends", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── POST /api/v1/friends/request/:userId — send friend request ──────────────

friendsRouter.post(
  "/request/:userId",
  authenticate,
  standardLimit,
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const uid = req.user!.uid;

    if (userId === uid) {
      return res.status(400).json({ error: "Cannot send a friend request to yourself", code: "SELF_FRIEND", status: 400 });
    }

    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // Verify target user exists
      // TODO: SELECT id FROM users WHERE id = $userId
      const targetSnap = await db.collection("users").doc(userId).get();
      if (!targetSnap.exists) return res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND", status: 404 });

      // Check if already friends or request pending
      // TODO: SELECT status FROM user_friends WHERE user_id = $uid AND friend_id = $userId
      const existingSnap = await db
        .collection("users").doc(uid).collection("friends").doc(userId).get();

      if (existingSnap.exists) {
        const status = existingSnap.data()?.status;
        if (status === "friends") return res.status(409).json({ error: "Already friends", code: "ALREADY_FRIENDS", status: 409 });
        if (status === "pending") return res.status(409).json({ error: "Friend request already sent", code: "REQUEST_PENDING", status: 409 });
      }

      const now = admin.firestore.FieldValue.serverTimestamp();

      // TODO:
      // INSERT INTO user_friends (user_id, friend_id, status, added_at)
      // VALUES ($uid, $userId, 'pending', NOW()) ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'pending'
      await db.collection("users").doc(uid).collection("friends").doc(userId).set({
        status: "pending",
        addedAt: now,
        direction: "outgoing",
      });

      // Write incoming request to target's friends sub-collection
      await db.collection("users").doc(userId).collection("friends").doc(uid).set({
        status: "pending",
        addedAt: now,
        direction: "incoming",
      });

      return res.status(201).json({ data: { sent: true, toUserId: userId } });
    } catch (e: any) {
      console.error("[friends POST /request/:userId]", e.message);
      return res.status(500).json({ error: "Failed to send friend request", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── PATCH /api/v1/friends/request/:userId/accept — accept request ────────────

friendsRouter.patch(
  "/request/:userId/accept",
  authenticate,
  standardLimit,
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const uid = req.user!.uid;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: SELECT status FROM user_friends WHERE user_id = $uid AND friend_id = $userId
      const snap = await db.collection("users").doc(uid).collection("friends").doc(userId).get();
      if (!snap.exists || snap.data()?.status !== "pending") {
        return res.status(404).json({ error: "No pending friend request from this user", code: "REQUEST_NOT_FOUND", status: 404 });
      }

      const now = admin.firestore.FieldValue.serverTimestamp();

      // TODO: UPDATE user_friends SET status = 'friends' WHERE (user_id = $uid AND friend_id = $userId) OR (user_id = $userId AND friend_id = $uid)
      const batch = db.batch();
      batch.update(db.collection("users").doc(uid).collection("friends").doc(userId), { status: "friends", acceptedAt: now });
      batch.update(db.collection("users").doc(userId).collection("friends").doc(uid), { status: "friends", acceptedAt: now });
      // Increment friends counts
      batch.update(db.collection("users").doc(uid), { friendsCount: admin.firestore.FieldValue.increment(1) });
      batch.update(db.collection("users").doc(userId), { friendsCount: admin.firestore.FieldValue.increment(1) });
      await batch.commit();

      return res.json({ data: { accepted: true, friendId: userId } });
    } catch (e: any) {
      console.error("[friends PATCH /request/:userId/accept]", e.message);
      return res.status(500).json({ error: "Failed to accept friend request", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── PATCH /api/v1/friends/request/:userId/decline — decline request ──────────

friendsRouter.patch(
  "/request/:userId/decline",
  authenticate,
  standardLimit,
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const uid = req.user!.uid;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: DELETE FROM user_friends WHERE (user_id = $uid AND friend_id = $userId) OR (user_id = $userId AND friend_id = $uid)
      const batch = db.batch();
      batch.delete(db.collection("users").doc(uid).collection("friends").doc(userId));
      batch.delete(db.collection("users").doc(userId).collection("friends").doc(uid));
      await batch.commit();

      return res.json({ data: { declined: true, fromUserId: userId } });
    } catch (e: any) {
      console.error("[friends PATCH /request/:userId/decline]", e.message);
      return res.status(500).json({ error: "Failed to decline request", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── DELETE /api/v1/friends/:userId — unfriend ───────────────────────────────

friendsRouter.delete(
  "/:userId",
  authenticate,
  strictLimit,
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const uid = req.user!.uid;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: DELETE FROM user_friends WHERE (user_id = $uid AND friend_id = $userId) OR (user_id = $userId AND friend_id = $uid)
      const batch = db.batch();
      batch.delete(db.collection("users").doc(uid).collection("friends").doc(userId));
      batch.delete(db.collection("users").doc(userId).collection("friends").doc(uid));
      batch.update(db.collection("users").doc(uid), { friendsCount: admin.firestore.FieldValue.increment(-1) });
      batch.update(db.collection("users").doc(userId), { friendsCount: admin.firestore.FieldValue.increment(-1) });
      await batch.commit();

      return res.json({ data: { unfriended: true, userId } });
    } catch (e: any) {
      console.error("[friends DELETE /:userId]", e.message);
      return res.status(500).json({ error: "Failed to unfriend", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);
