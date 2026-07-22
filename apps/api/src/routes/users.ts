/**
 * /api/v1/users — user profile, scan history, notifications, favorites
 *
 * All mutating endpoints require Firebase Auth (authenticate middleware).
 * Firestore Admin SDK used throughout; PostgreSQL queries will replace these
 * once data migration is complete (each query site is marked with a TODO).
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { admin, getAdminDb, getAdminAuth } from "../lib/firebase-admin";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { relaxedLimit, standardLimit } from "../middleware/rate-limit-presets";

export const usersRouter = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(60).optional(),
  photoUrl: z.string().url().max(500).nullable().optional(),
  pushToken: z.string().max(200).nullable().optional(),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/, "Lowercase letters, digits, underscores only").optional(),
});

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

// ─── GET /api/v1/users/me — own profile ──────────────────────────────────────

usersRouter.get(
  "/me",
  authenticate,
  relaxedLimit,
  async (req: Request, res: Response) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: replace with: SELECT * FROM users WHERE firebase_uid = $uid
      const snap = await db.collection("users").doc(req.user!.uid).get();
      if (!snap.exists) {
        return res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND", status: 404 });
      }
      const data = snap.data()!;
      return res.json({
        data: {
          id: snap.id,
          displayName: data.displayName ?? null,
          email: data.email ?? null,
          photoUrl: data.photoURL ?? null,
          username: data.username ?? null,
          scanCount: data.scanCount ?? 0,
          commentCount: data.commentCount ?? 0,
          followingCount: data.followingCount ?? 0,
          totalLikesReceived: data.totalLikesReceived ?? 0,
          isOnline: data.isOnline ?? false,
          lastSeen: data.lastSeen?.toDate?.()?.toISOString() ?? null,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        },
      });
    } catch (e: any) {
      console.error("[users/me GET]", e.message);
      return res.status(500).json({ error: "Failed to fetch profile", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── PATCH /api/v1/users/me — update own profile ─────────────────────────────

usersRouter.patch(
  "/me",
  authenticate,
  standardLimit,
  validateBody(updateProfileSchema),
  async (req: Request, res: Response) => {
    const db = getAdminDb();
    const adminAuth = getAdminAuth();
    if (!db || !adminAuth) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    const { displayName, photoUrl, pushToken, username } = req.body;
    const uid = req.user!.uid;

    try {
      // Username uniqueness check
      if (username !== undefined) {
        const existing = await db.collection("usernames").doc(username).get();
        if (existing.exists && existing.data()?.userId !== uid) {
          return res.status(409).json({ error: "Username already taken", code: "USERNAME_TAKEN", status: 409 });
        }
      }

      const updates: Record<string, any> = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (displayName !== undefined) updates.displayName = displayName;
      if (photoUrl !== undefined) updates.photoURL = photoUrl;
      if (pushToken !== undefined) updates.pushToken = pushToken;
      if (username !== undefined) {
        updates.username = username;
        updates.usernameLastChangedAt = admin.firestore.FieldValue.serverTimestamp();
      }

      // TODO: UPDATE users SET ... WHERE firebase_uid = $uid
      await db.collection("users").doc(uid).set(updates, { merge: true });

      // Keep username registry in sync
      if (username !== undefined) {
        await db.collection("usernames").doc(username).set({
          userId: uid,
          claimedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Mirror to Firebase Auth profile
        await adminAuth.updateUser(uid, {
          ...(displayName ? { displayName } : {}),
          ...(photoUrl ? { photoURL: photoUrl } : {}),
        }).catch(() => {});
      }

      return res.json({ data: { updated: true } });
    } catch (e: any) {
      console.error("[users/me PATCH]", e.message);
      return res.status(500).json({ error: "Failed to update profile", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── GET /api/v1/users/:userId — public profile ───────────────────────────────

usersRouter.get(
  "/:userId",
  relaxedLimit,
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: SELECT id, display_name, photo_url, username, scan_count, ... FROM users WHERE id = $userId AND is_deleted = FALSE
      const snap = await db.collection("users").doc(userId).get();
      if (!snap.exists || snap.data()?.isDeleted) {
        return res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND", status: 404 });
      }
      const data = snap.data()!;
      // Only expose public fields
      return res.json({
        data: {
          id: snap.id,
          displayName: data.displayName ?? null,
          photoUrl: data.photoURL ?? null,
          username: data.username ?? null,
          scanCount: data.scanCount ?? 0,
          commentCount: data.commentCount ?? 0,
          followingCount: data.followingCount ?? 0,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        },
      });
    } catch (e: any) {
      console.error("[users/:userId GET]", e.message);
      return res.status(500).json({ error: "Failed to fetch user", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── GET /api/v1/users/me/scans — own scan history (paginated) ───────────────

usersRouter.get(
  "/me/scans",
  authenticate,
  relaxedLimit,
  async (req: Request, res: Response) => {
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: "Invalid query params", code: "VALIDATION_ERROR", status: 400 });

    const { limit, cursor } = parsed.data;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: SELECT * FROM qr_scans WHERE user_id = $uid ORDER BY scanned_at DESC LIMIT $limit OFFSET $cursor
      let query = db
        .collection("users")
        .doc(req.user!.uid)
        .collection("scans")
        .orderBy("scannedAt", "desc")
        .limit(limit + 1);

      if (cursor) {
        const cursorDoc = await db.collection("users").doc(req.user!.uid).collection("scans").doc(cursor).get();
        if (cursorDoc.exists) query = query.startAfter(cursorDoc);
      }

      const snap = await query.get();
      const hasMore = snap.docs.length > limit;
      const docs = snap.docs.slice(0, limit);
      const nextCursor = hasMore ? docs[docs.length - 1].id : null;

      return res.json({
        data: docs.map((d) => {
          const item = d.data();
          return {
            id: d.id,
            qrCodeId: item.qrCodeId ?? item.qrId ?? null,
            content: item.content ?? null,
            contentType: item.contentType ?? null,
            scanSource: item.scanSource ?? null,
            isAnonymous: item.isAnonymous ?? false,
            scannedAt: item.scannedAt?.toDate?.()?.toISOString() ?? item.timestamp?.toDate?.()?.toISOString() ?? null,
          };
        }),
        pagination: { hasMore, nextCursor, limit },
      });
    } catch (e: any) {
      console.error("[users/me/scans]", e.message);
      return res.status(500).json({ error: "Failed to fetch scans", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── GET /api/v1/users/me/favorites — list favorites ─────────────────────────

usersRouter.get(
  "/me/favorites",
  authenticate,
  relaxedLimit,
  async (req: Request, res: Response) => {
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: "Invalid query params", code: "VALIDATION_ERROR", status: 400 });

    const { limit, cursor } = parsed.data;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: SELECT * FROM user_favorites WHERE user_id = $uid ORDER BY created_at DESC LIMIT $limit
      let query = db
        .collection("users")
        .doc(req.user!.uid)
        .collection("favorites")
        .orderBy("createdAt", "desc")
        .limit(limit + 1);

      if (cursor) {
        const cursorDoc = await db.collection("users").doc(req.user!.uid).collection("favorites").doc(cursor).get();
        if (cursorDoc.exists) query = query.startAfter(cursorDoc);
      }

      const snap = await query.get();
      const hasMore = snap.docs.length > limit;
      const docs = snap.docs.slice(0, limit);

      return res.json({
        data: docs.map((d) => ({
          qrCodeId: d.id,
          createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? null,
        })),
        pagination: { hasMore, nextCursor: hasMore ? docs[docs.length - 1].id : null, limit },
      });
    } catch (e: any) {
      console.error("[users/me/favorites GET]", e.message);
      return res.status(500).json({ error: "Failed to fetch favorites", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── POST /api/v1/users/me/favorites/:qrId — add favorite ────────────────────

usersRouter.post(
  "/me/favorites/:qrId",
  authenticate,
  standardLimit,
  async (req: Request, res: Response) => {
    const { qrId } = req.params;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: INSERT INTO user_favorites (user_id, qr_code_id, created_at) VALUES ($uid, $qrId, NOW()) ON CONFLICT DO NOTHING
      await db.collection("users").doc(req.user!.uid).collection("favorites").doc(qrId).set({
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.status(201).json({ data: { added: true, qrCodeId: qrId } });
    } catch (e: any) {
      console.error("[users/me/favorites POST]", e.message);
      return res.status(500).json({ error: "Failed to add favorite", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── DELETE /api/v1/users/me/favorites/:qrId — remove favorite ───────────────

usersRouter.delete(
  "/me/favorites/:qrId",
  authenticate,
  standardLimit,
  async (req: Request, res: Response) => {
    const { qrId } = req.params;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: DELETE FROM user_favorites WHERE user_id = $uid AND qr_code_id = $qrId
      await db.collection("users").doc(req.user!.uid).collection("favorites").doc(qrId).delete();
      return res.json({ data: { removed: true, qrCodeId: qrId } });
    } catch (e: any) {
      console.error("[users/me/favorites DELETE]", e.message);
      return res.status(500).json({ error: "Failed to remove favorite", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── GET /api/v1/users/me/notifications — list notifications ─────────────────

usersRouter.get(
  "/me/notifications",
  authenticate,
  relaxedLimit,
  async (req: Request, res: Response) => {
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: "Invalid query params", code: "VALIDATION_ERROR", status: 400 });

    const { limit } = parsed.data;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: SELECT * FROM notifications WHERE user_id = $uid ORDER BY created_at DESC LIMIT $limit
      const snap = await db
        .collection("users")
        .doc(req.user!.uid)
        .collection("notifications")
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

      return res.json({
        data: snap.docs.map((d) => {
          const item = d.data();
          return {
            id: d.id,
            type: item.type ?? null,
            message: item.message ?? null,
            qrCodeId: item.qrCodeId ?? null,
            fromUsername: item.fromUsername ?? null,
            isRead: item.read ?? false,
            createdAt: item.createdAt?.toDate?.()?.toISOString() ?? null,
          };
        }),
        pagination: { limit },
      });
    } catch (e: any) {
      console.error("[users/me/notifications GET]", e.message);
      return res.status(500).json({ error: "Failed to fetch notifications", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── PATCH /api/v1/users/me/notifications/:notifId/read — mark one read ──────

usersRouter.patch(
  "/me/notifications/:notifId/read",
  authenticate,
  standardLimit,
  async (req: Request, res: Response) => {
    const { notifId } = req.params;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: UPDATE notifications SET is_read = TRUE WHERE id = $notifId AND user_id = $uid
      await db
        .collection("users")
        .doc(req.user!.uid)
        .collection("notifications")
        .doc(notifId)
        .update({ read: true });
      return res.json({ data: { updated: true } });
    } catch (e: any) {
      console.error("[notifications/read PATCH]", e.message);
      return res.status(500).json({ error: "Failed to mark notification read", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── POST /api/v1/users/me/notifications/read-all — mark all read ────────────

usersRouter.post(
  "/me/notifications/read-all",
  authenticate,
  standardLimit,
  async (req: Request, res: Response) => {
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: UPDATE notifications SET is_read = TRUE WHERE user_id = $uid AND is_read = FALSE
      const unread = await db
        .collection("users")
        .doc(req.user!.uid)
        .collection("notifications")
        .where("read", "==", false)
        .limit(100)
        .get();

      const batch = db.batch();
      unread.docs.forEach((d) => batch.update(d.ref, { read: true }));
      await batch.commit();

      return res.json({ data: { updated: unread.size } });
    } catch (e: any) {
      console.error("[notifications/read-all]", e.message);
      return res.status(500).json({ error: "Failed to mark all notifications read", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── DELETE /api/v1/users/me/notifications/:notifId — delete notification ────

usersRouter.delete(
  "/me/notifications/:notifId",
  authenticate,
  standardLimit,
  async (req: Request, res: Response) => {
    const { notifId } = req.params;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: DELETE FROM notifications WHERE id = $notifId AND user_id = $uid
      await db
        .collection("users")
        .doc(req.user!.uid)
        .collection("notifications")
        .doc(notifId)
        .delete();
      return res.json({ data: { deleted: true } });
    } catch (e: any) {
      console.error("[notifications DELETE]", e.message);
      return res.status(500).json({ error: "Failed to delete notification", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);
