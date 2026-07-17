/**
 * /api/v1/qr/:qrId/comments — CRUD for QR code comments
 *
 * Supports both legacy qrCodes/{id} and unified qrs/{id} QRs.
 * The qrId path param is the Firestore document ID.
 *
 * All write endpoints require Firebase Auth.
 * TODO markers show where PostgreSQL queries replace Firestore calls.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { admin, getAdminDb } from "../lib/firebase-admin";
import { authenticate, optionalAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { relaxedLimit, standardLimit, strictLimit } from "../middleware/rate-limit-presets";

export const commentsRouter = Router({ mergeParams: true });

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createCommentSchema = z.object({
  text: z.string().min(1).max(2000).trim(),
  parentId: z.string().max(128).nullable().optional(),
});

const editCommentSchema = z.object({
  text: z.string().min(1).max(2000).trim(),
});

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapCommentDoc(id: string, data: any) {
  return {
    id,
    userId: data.userId ?? null,
    userName: data.userName ?? null,
    text: data.text ?? null,
    parentId: data.parentId ?? null,
    likes: data.likes ?? 0,
    isVerifiedOwner: data.isVerifiedOwner ?? false,
    isPinned: data.isPinned ?? false,
    isEdited: data.isEdited ?? false,
    isHidden: data.isHidden ?? false,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
  };
}

// ─── GET /api/v1/qr/:qrId/comments — list comments (paginated) ───────────────

commentsRouter.get(
  "/",
  optionalAuth,
  relaxedLimit,
  async (req: Request, res: Response) => {
    const { qrId } = req.params;
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: "Invalid query params", code: "VALIDATION_ERROR", status: 400 });
    const { limit, cursor } = parsed.data;

    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO:
      // SELECT * FROM qr_comments
      // WHERE qr_code_id = $qrId AND is_deleted = FALSE AND parent_id IS NULL
      // ORDER BY is_pinned DESC, created_at DESC
      // LIMIT $limit OFFSET cursor
      let query = db
        .collection("qrCodes")
        .doc(qrId)
        .collection("comments")
        .where("isHidden", "==", false)
        .orderBy("isPinned", "desc")
        .orderBy("createdAt", "desc")
        .limit(limit + 1);

      if (cursor) {
        const cursorDoc = await db
          .collection("qrCodes").doc(qrId).collection("comments").doc(cursor).get();
        if (cursorDoc.exists) query = query.startAfter(cursorDoc);
      }

      const snap = await query.get();
      const hasMore = snap.docs.length > limit;
      const docs = snap.docs.slice(0, limit);

      return res.json({
        data: docs.map((d) => mapCommentDoc(d.id, d.data())),
        pagination: { hasMore, nextCursor: hasMore ? docs[docs.length - 1].id : null, limit },
      });
    } catch (e: any) {
      console.error("[comments GET /]", e.message);
      return res.status(500).json({ error: "Failed to fetch comments", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── POST /api/v1/qr/:qrId/comments — create comment ────────────────────────

commentsRouter.post(
  "/",
  authenticate,
  standardLimit,
  validateBody(createCommentSchema),
  async (req: Request, res: Response) => {
    const { qrId } = req.params;
    const { text, parentId } = req.body;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    const uid = req.user!.uid;

    try {
      // Resolve user display name and whether they own this QR
      // TODO: SELECT display_name FROM users WHERE firebase_uid = $uid
      const userSnap = await db.collection("users").doc(uid).get();
      const userName: string = userSnap.data()?.displayName ?? userSnap.data()?.username ?? "Anonymous";

      // TODO: SELECT owner_id FROM qr_codes WHERE id = $qrId
      const qrSnap = await db.collection("qrCodes").doc(qrId).get();
      if (!qrSnap.exists) return res.status(404).json({ error: "QR code not found", code: "QR_NOT_FOUND", status: 404 });
      const isVerifiedOwner = qrSnap.data()?.ownerId === uid;

      // Validate parent comment exists if provided
      if (parentId) {
        const parentSnap = await db.collection("qrCodes").doc(qrId).collection("comments").doc(parentId).get();
        if (!parentSnap.exists) return res.status(404).json({ error: "Parent comment not found", code: "PARENT_NOT_FOUND", status: 404 });
      }

      const commentData = {
        userId: uid,
        userName,
        text,
        parentId: parentId ?? null,
        likes: 0,
        isVerifiedOwner,
        isPinned: false,
        isHidden: false,
        isEdited: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // TODO:
      // INSERT INTO qr_comments (qr_code_id, user_id, user_name, text, parent_id, is_verified_owner, ...)
      // VALUES ($qrId, $uid, $userName, $text, $parentId, $isVerifiedOwner, ...)
      const ref = await db.collection("qrCodes").doc(qrId).collection("comments").add(commentData);

      // Bump comment count via Admin SDK (bypasses Firestore security rules)
      await db.collection("qrCodes").doc(qrId).update({
        commentCount: admin.firestore.FieldValue.increment(1),
      }).catch(() => {});

      return res.status(201).json({
        data: {
          id: ref.id,
          ...commentData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (e: any) {
      console.error("[comments POST /]", e.message);
      return res.status(500).json({ error: "Failed to create comment", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── PATCH /api/v1/qr/:qrId/comments/:commentId — edit comment ───────────────

commentsRouter.patch(
  "/:commentId",
  authenticate,
  standardLimit,
  validateBody(editCommentSchema),
  async (req: Request, res: Response) => {
    const { qrId, commentId } = req.params;
    const { text } = req.body;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: SELECT user_id, is_deleted FROM qr_comments WHERE id = $commentId AND qr_code_id = $qrId
      const snap = await db.collection("qrCodes").doc(qrId).collection("comments").doc(commentId).get();
      if (!snap.exists) return res.status(404).json({ error: "Comment not found", code: "COMMENT_NOT_FOUND", status: 404 });
      if (snap.data()!.userId !== req.user!.uid) return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN", status: 403 });

      // TODO: UPDATE qr_comments SET text = $text, is_edited = TRUE, updated_at = NOW() WHERE id = $commentId AND user_id = $uid
      await snap.ref.update({
        text,
        isEdited: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.json({ data: { updated: true } });
    } catch (e: any) {
      console.error("[comments PATCH /:commentId]", e.message);
      return res.status(500).json({ error: "Failed to edit comment", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── DELETE /api/v1/qr/:qrId/comments/:commentId — delete comment ────────────

commentsRouter.delete(
  "/:commentId",
  authenticate,
  strictLimit,
  async (req: Request, res: Response) => {
    const { qrId, commentId } = req.params;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO: SELECT user_id FROM qr_comments WHERE id = $commentId AND qr_code_id = $qrId
      const snap = await db.collection("qrCodes").doc(qrId).collection("comments").doc(commentId).get();
      if (!snap.exists) return res.status(404).json({ error: "Comment not found", code: "COMMENT_NOT_FOUND", status: 404 });

      // Allow: comment owner OR QR owner can delete
      const qrSnap = await db.collection("qrCodes").doc(qrId).get();
      const isQrOwner = qrSnap.data()?.ownerId === req.user!.uid;
      const isCommentOwner = snap.data()!.userId === req.user!.uid;
      if (!isCommentOwner && !isQrOwner) return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN", status: 403 });

      // Soft delete — mark hidden and anonymise text
      // TODO: UPDATE qr_comments SET is_deleted = TRUE, text = '[deleted]', updated_at = NOW() WHERE id = $commentId
      await snap.ref.update({
        isHidden: true,
        text: "[deleted]",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await db.collection("qrCodes").doc(qrId).update({
        commentCount: admin.firestore.FieldValue.increment(-1),
      }).catch(() => {});

      return res.json({ data: { deleted: true } });
    } catch (e: any) {
      console.error("[comments DELETE /:commentId]", e.message);
      return res.status(500).json({ error: "Failed to delete comment", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── POST /api/v1/qr/:qrId/comments/:commentId/like — toggle like ────────────

commentsRouter.post(
  "/:commentId/like",
  authenticate,
  standardLimit,
  async (req: Request, res: Response) => {
    const { qrId, commentId } = req.params;
    const uid = req.user!.uid;
    const db = getAdminDb();
    if (!db) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      // TODO:
      // SELECT EXISTS(SELECT 1 FROM comment_likes WHERE comment_id = $commentId AND user_id = $uid)
      // If exists: DELETE FROM comment_likes ...; UPDATE qr_comments SET likes = likes - 1 ...
      // Else:      INSERT INTO comment_likes ...; UPDATE qr_comments SET likes = likes + 1 ...
      const likeRef = db
        .collection("qrCodes").doc(qrId)
        .collection("comments").doc(commentId)
        .collection("likes").doc(uid);

      const commentRef = db.collection("qrCodes").doc(qrId).collection("comments").doc(commentId);

      const likeSnap = await likeRef.get();
      let liked: boolean;

      if (likeSnap.exists) {
        await likeRef.delete();
        await commentRef.update({ likes: admin.firestore.FieldValue.increment(-1) });
        liked = false;
      } else {
        await likeRef.set({ likedAt: admin.firestore.FieldValue.serverTimestamp() });
        await commentRef.update({ likes: admin.firestore.FieldValue.increment(1) });
        liked = true;
      }

      return res.json({ data: { liked } });
    } catch (e: any) {
      console.error("[comments POST /:commentId/like]", e.message);
      return res.status(500).json({ error: "Failed to toggle like", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);
