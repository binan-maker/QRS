/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BINRO API: COMMUNITY COMMENTS ROUTER
 * ───────────────────────────────────────────────────────────────────────────────
 * Provides threaded community discussions, notes, and like toggles on QR codes.
 * Stores records in public.qr_comments and public.comment_likes.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getAdminClient } from "../lib/supabase-admin";
import { authenticate, optionalAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { standardLimit, relaxedLimit } from "../middleware/rate-limit-presets";

export const commentsRouter = Router({ mergeParams: true });

const createCommentSchema = z.object({
  text: z.string().min(1).max(1000),
  parentId: z.string().max(100).nullable().optional(),
});

const updateCommentSchema = z.object({
  text: z.string().min(1).max(1000),
});

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

function mapCommentRow(row: Record<string, any>) {
  return {
    id: row.id,
    qrCodeId: row.qr_code_id,
    userId: row.user_id,
    userName: row.user_name,
    parentId: row.parent_id ?? null,
    text: row.text,
    likes: row.likes ?? 0,
    isEdited: row.is_edited ?? false,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

async function adjustQrCommentCount(client: any, qrId: string, delta: number) {
  const { data, error } = await client
    .from("qr_codes")
    .select("comment_count")
    .eq("id", qrId)
    .maybeSingle();

  if (error || !data) return;
  const newCount = Math.max(0, (data.comment_count ?? 0) + delta);
  await client
    .from("qr_codes")
    .update({ comment_count: newCount, updated_at: new Date().toISOString() })
    .eq("id", qrId);
}

/**
 * GET /api/v1/qr/:qrId/comments
 * Returns paginated comments for the given QR code.
 */
commentsRouter.get(
  "/",
  optionalAuth,
  relaxedLimit,
  async (req: Request, res: Response) => {
    const { qrId } = req.params;
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid query params", code: "VALIDATION_ERROR", status: 400 });
    }
    const { limit, cursor } = parsed.data;

    const client = getAdminClient();
    if (!client) {
      return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });
    }

    try {
      let query = client
        .from("qr_comments")
        .select("*")
        .eq("qr_code_id", qrId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(limit + 1);

      if (cursor) {
        query = query.lt("created_at", cursor);
      }

      const { data: rows, error } = await query;
      if (error) throw error;

      const hasMore = (rows?.length ?? 0) > limit;
      const items = (hasMore ? rows!.slice(0, limit) : (rows ?? [])).map(mapCommentRow);
      const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].createdAt : null;

      return res.json({
        data: items,
        pagination: {
          limit,
          nextCursor,
          hasMore,
        },
      });
    } catch (error: any) {
      console.error("[comments/list] Error:", error.message);
      return res.status(500).json({ error: "Failed to list comments", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

/**
 * POST /api/v1/qr/:qrId/comments
 * Adds a new comment or reply to a QR code.
 */
commentsRouter.post(
  "/",
  authenticate,
  standardLimit,
  validateBody(createCommentSchema),
  async (req: Request, res: Response) => {
    const { qrId } = req.params;
    const { text, parentId } = req.body;
    const client = getAdminClient();
    if (!client) {
      return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });
    }

    try {
      const user = req.user!;
      const { data: newComment, error } = await client
        .from("qr_comments")
        .insert({
          qr_code_id: qrId,
          user_id: user.uid,
          user_name: user.name || "Anonymous",
          parent_id: parentId ?? null,
          text: text.trim(),
          likes: 0,
          report_count: 0,
          is_deleted: false,
          is_pinned: false,
          is_edited: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Increment comment count on the QR code record
      await adjustQrCommentCount(client, qrId, 1);

      return res.status(201).json({ data: mapCommentRow(newComment) });
    } catch (error: any) {
      console.error("[comments/create] Error:", error.message);
      return res.status(500).json({ error: "Failed to create comment", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

/**
 * PATCH /api/v1/qr/:qrId/comments/:commentId
 * Edits an existing comment text (author only).
 */
commentsRouter.patch(
  "/:commentId",
  authenticate,
  standardLimit,
  validateBody(updateCommentSchema),
  async (req: Request, res: Response) => {
    const { commentId } = req.params;
    const { text } = req.body;
    const client = getAdminClient();
    if (!client) {
      return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });
    }

    try {
      const user = req.user!;
      const { data: existing, error: fetchErr } = await client
        .from("qr_comments")
        .select("user_id")
        .eq("id", commentId)
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      if (!existing) {
        return res.status(404).json({ error: "Comment not found", code: "COMMENT_NOT_FOUND", status: 404 });
      }
      if (existing.user_id !== user.uid) {
        return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN", status: 403 });
      }

      const { data: updated, error: updateErr } = await client
        .from("qr_comments")
        .update({
          text: text.trim(),
          is_edited: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", commentId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      return res.json({ data: mapCommentRow(updated) });
    } catch (error: any) {
      console.error("[comments/update] Error:", error.message);
      return res.status(500).json({ error: "Failed to update comment", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

/**
 * DELETE /api/v1/qr/:qrId/comments/:commentId
 * Soft-deletes a comment (author only).
 */
commentsRouter.delete(
  "/:commentId",
  authenticate,
  standardLimit,
  async (req: Request, res: Response) => {
    const { qrId, commentId } = req.params;
    const client = getAdminClient();
    if (!client) {
      return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });
    }

    try {
      const user = req.user!;
      const { data: existing, error: fetchErr } = await client
        .from("qr_comments")
        .select("user_id, is_deleted")
        .eq("id", commentId)
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      if (!existing) {
        return res.status(404).json({ error: "Comment not found", code: "COMMENT_NOT_FOUND", status: 404 });
      }
      if (existing.user_id !== user.uid) {
        return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN", status: 403 });
      }

      if (!existing.is_deleted) {
        await client
          .from("qr_comments")
          .update({ is_deleted: true, updated_at: new Date().toISOString() })
          .eq("id", commentId);

        await adjustQrCommentCount(client, qrId, -1);
      }

      return res.json({ ok: true });
    } catch (error: any) {
      console.error("[comments/delete] Error:", error.message);
      return res.status(500).json({ error: "Failed to delete comment", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

/**
 * POST /api/v1/qr/:qrId/comments/:commentId/like
 * Toggles a user's upvote/like on a specific comment.
 */
commentsRouter.post(
  "/:commentId/like",
  authenticate,
  standardLimit,
  async (req: Request, res: Response) => {
    const { commentId } = req.params;
    const client = getAdminClient();
    if (!client) {
      return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });
    }

    try {
      const userId = req.user!.uid;

      // Check if user already liked this comment
      const { data: existingLike, error: likeCheckErr } = await client
        .from("comment_likes")
        .select("comment_id")
        .eq("comment_id", commentId)
        .eq("user_id", userId)
        .maybeSingle();

      if (likeCheckErr) throw likeCheckErr;

      let liked = false;
      if (existingLike) {
        // Unlike
        await client.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", userId);
        liked = false;
      } else {
        // Like
        await client.from("comment_likes").insert({ comment_id: commentId, user_id: userId });
        liked = true;
      }

      // Recompute total likes count for this comment
      const { count, error: countErr } = await client
        .from("comment_likes")
        .select("*", { count: "exact", head: true })
        .eq("comment_id", commentId);

      if (countErr) throw countErr;
      const totalLikes = count ?? 0;

      await client
        .from("qr_comments")
        .update({ likes: totalLikes, updated_at: new Date().toISOString() })
        .eq("id", commentId);

      return res.json({
        data: {
          commentId,
          liked,
          likes: totalLikes,
        },
      });
    } catch (error: any) {
      console.error("[comments/like] Error:", error.message);
      return res.status(500).json({ error: "Failed to toggle like", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);
