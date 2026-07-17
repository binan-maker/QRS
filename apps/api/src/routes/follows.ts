/**
 * /api/v1/follows — QR follow / unfollow and creator follow / unfollow
 *
 * QR follows:     POST/DELETE /api/v1/follows/qr/:qrId
 * Creator follows: POST/DELETE /api/v1/follows/users/:userId
 * Listing:         GET /api/v1/follows/users/:userId/followers
 *
 * All write endpoints require Firebase Auth.
 * TODO markers show where PostgreSQL queries replace Firestore calls.
 */

import { Router, type Request, type Response } from "express";
import { admin, getAdminDb } from "../lib/firebase-admin";
import { authenticate } from "../middleware/auth";
import { standardLimit, relaxedLimit } from "../middleware/rate-limit-presets";

export const followsRouter = Router();

// ─── POST /api/v1/follows/qr/:qrId — follow a QR code ───────────────────────

followsRouter.post(
  "/qr/:qrId",
  authenticate,
  standardLimit,
  async (req: Request, res: Response) => {
    const { qrId } = req.params;
    const uid = req.user!.uid;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO:
      // INSERT INTO qr_followers (qr_code_id, user_id, followed_at) VALUES ($qrId, $uid, NOW())
      // ON CONFLICT (qr_code_id, user_id) DO NOTHING
      // Also UPDATE users SET following_count = following_count + 1 WHERE firebase_uid = $uid (if not already following)
      const followRef = db.collection("qrCodes").doc(qrId).collection("followers").doc(uid);
      const existing = await followRef.get();
      if (existing.exists) {
        return res.json({ data: { followed: true, alreadyFollowing: true } });
      }

      await followRef.set({ followedAt: admin.firestore.FieldValue.serverTimestamp() });

      // Mirror into user's following sub-collection
      await db.collection("users").doc(uid).collection("following").doc(qrId).set({
        followedAt: admin.firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});

      // Increment user followingCount
      await db.collection("users").doc(uid).update({
        followingCount: admin.firestore.FieldValue.increment(1),
      }).catch(() => {});

      return res.status(201).json({ data: { followed: true, qrId } });
    } catch (e: any) {
      console.error("[follows POST /qr/:qrId]", e.message);
      return res.status(500).json({ error: "Failed to follow QR", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── DELETE /api/v1/follows/qr/:qrId — unfollow a QR code ───────────────────

followsRouter.delete(
  "/qr/:qrId",
  authenticate,
  standardLimit,
  async (req: Request, res: Response) => {
    const { qrId } = req.params;
    const uid = req.user!.uid;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO:
      // DELETE FROM qr_followers WHERE qr_code_id = $qrId AND user_id = $uid
      // UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE firebase_uid = $uid
      await db.collection("qrCodes").doc(qrId).collection("followers").doc(uid).delete();
      await db.collection("users").doc(uid).collection("following").doc(qrId).delete().catch(() => {});
      await db.collection("users").doc(uid).update({
        followingCount: admin.firestore.FieldValue.increment(-1),
      }).catch(() => {});

      return res.json({ data: { unfollowed: true, qrId } });
    } catch (e: any) {
      console.error("[follows DELETE /qr/:qrId]", e.message);
      return res.status(500).json({ error: "Failed to unfollow QR", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── GET /api/v1/follows/qr/:qrId — check if current user follows a QR ───────

followsRouter.get(
  "/qr/:qrId",
  authenticate,
  relaxedLimit,
  async (req: Request, res: Response) => {
    const { qrId } = req.params;
    const uid = req.user!.uid;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: SELECT EXISTS(SELECT 1 FROM qr_followers WHERE qr_code_id = $qrId AND user_id = $uid)
      const snap = await db.collection("qrCodes").doc(qrId).collection("followers").doc(uid).get();
      return res.json({ data: { following: snap.exists, qrId } });
    } catch (e: any) {
      console.error("[follows GET /qr/:qrId]", e.message);
      return res.status(500).json({ error: "Failed to check follow status", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── POST /api/v1/follows/users/:userId — follow a creator ───────────────────

followsRouter.post(
  "/users/:userId",
  authenticate,
  standardLimit,
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const uid = req.user!.uid;

    if (userId === uid) {
      return res.status(400).json({ error: "Cannot follow yourself", code: "SELF_FOLLOW", status: 400 });
    }

    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO:
      // INSERT INTO creator_follows (user_id, creator_id, followed_at) VALUES ($uid, $userId, NOW())
      // ON CONFLICT (user_id, creator_id) DO NOTHING
      const followRef = db
        .collection("users").doc(uid)
        .collection("creatorFollowing").doc(userId);

      const existing = await followRef.get();
      if (existing.exists) {
        return res.json({ data: { followed: true, alreadyFollowing: true } });
      }

      await followRef.set({ followedAt: admin.firestore.FieldValue.serverTimestamp() });

      return res.status(201).json({ data: { followed: true, userId } });
    } catch (e: any) {
      console.error("[follows POST /users/:userId]", e.message);
      return res.status(500).json({ error: "Failed to follow user", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── DELETE /api/v1/follows/users/:userId — unfollow a creator ───────────────

followsRouter.delete(
  "/users/:userId",
  authenticate,
  standardLimit,
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const uid = req.user!.uid;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: DELETE FROM creator_follows WHERE user_id = $uid AND creator_id = $userId
      await db
        .collection("users").doc(uid)
        .collection("creatorFollowing").doc(userId)
        .delete();

      return res.json({ data: { unfollowed: true, userId } });
    } catch (e: any) {
      console.error("[follows DELETE /users/:userId]", e.message);
      return res.status(500).json({ error: "Failed to unfollow user", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── GET /api/v1/follows/users/:userId — check if current user follows a creator

followsRouter.get(
  "/users/:userId",
  authenticate,
  relaxedLimit,
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const uid = req.user!.uid;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: SELECT EXISTS(SELECT 1 FROM creator_follows WHERE user_id = $uid AND creator_id = $userId)
      const snap = await db
        .collection("users").doc(uid)
        .collection("creatorFollowing").doc(userId)
        .get();
      return res.json({ data: { following: snap.exists, userId } });
    } catch (e: any) {
      console.error("[follows GET /users/:userId]", e.message);
      return res.status(500).json({ error: "Failed to check follow status", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);
