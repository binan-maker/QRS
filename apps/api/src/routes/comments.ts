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

function mapCommentDoc(id: string, data: Record<string, any>) {
  return {
    id,
    qrCodeId: data.qr_code_id ?? data.qrCodeId ?? null,
    userId: data.user_id ?? data.userId,
    userName: data.user_name ?? data.userName,
    parentId: data.parent_id ?? data.parentId ?? null,
    text: data.text,
    likes: data.likes ?? 0,
    isEdited: data.isEdited ?? false,
    createdAt: data.created_at ?? data.createdAt ?? null,
    updatedAt: data.updated_at ?? data.updatedAt ?? null,
  };
}

async function adjustQrCommentCount(client: any, qrId: string, delta: number) {
  const { data, error } = await client.from("qr_codes").select("comment_count").eq("id", qrId).maybeSingle();
  if (error || !data) return;
  const newCount = Math.max(0, (data.comment_count ?? 0) + delta);
  await client.from("qr_codes").update({ comment_count: newCount, updated_at: new Date().toISOString() }).eq("id", qrId);
}

// ─── GET /api/v1/qr/:qrId/comments ───────────────────────────────────────────

commentsRouter.get(
  "/",
  optionalAuth,
  relaxedLimit,
  async (req: Request, res: Response) => {
    const { qrId } = req.params;
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: "Invalid query params", code: "VALIDATION_ERROR", status: 400 });
    const { limit, cursor } = parsed.data;

    const client = getAdminClient();
    if (!client) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      const { data: qr, error: qrError } = await client.from("qr_codes").select("id").eq("id", qrId).maybeSingle();
      if (qrError) throw qrError;
      if (!qr) return res.status(404).json({ error: "QR code not found", code: "QR_NOT_FOUND", status: 404 });

      let query = client.from("qr_comments")
        .select("*")
        .eq("qr_code_id", qrId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(limit + 1);

      if (cursor) {
        const cursorRow = await client.from("qr_comments").select("created_at").eq("id", cursor).maybeSingle();
        if (cursorRow.error) throw cursorRow.error;
        if (cursorRow.data?.created_at) query = query.lt("created_at", cursorRow.data.created_at);
      }
      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const hasMore = rows.length > limit;
      const docs = rows.slice(0, limit);

      return res.json({
        data: docs.map((row) => mapCommentDoc(row.id, row)),
        pagination: { hasMore, nextCursor: hasMore ? docs[docs.length - 1].id : null, limit },
      });
    } catch (e: any) {
      console.error("[comments GET /]", e.message);
      return res.status(500).json({ error: "Failed to fetch comments", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── POST /api/v1/qr/:qrId/comments ──────────────────────────────────────────

commentsRouter.post(
  "/",
  authenticate,
  standardLimit,
  validateBody(createCommentSchema),
  async (req: Request, res: Response) => {
    const { qrId } = req.params;
    const { text, parentId } = req.body;
    const client = getAdminClient();
    if (!client) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    const uid = req.user!.uid;

    try {
      const [{ data: user, error: userError }, { data: qr, error: qrError }] = await Promise.all([
        client.from("users").select("display_name,username").eq("id", uid).maybeSingle(),
        client.from("qr_codes").select("id").eq("id", qrId).maybeSingle(),
      ]);
      if (userError) throw userError;
      if (qrError) throw qrError;
      if (!qr) return res.status(404).json({ error: "QR code not found", code: "QR_NOT_FOUND", status: 404 });

      if (parentId) {
        const { data: parent, error: parentError } = await client
          .from("qr_comments")
          .select("id")
          .eq("id", parentId)
          .eq("qr_code_id", qrId)
          .maybeSingle();
        if (parentError) throw parentError;
        if (!parent) return res.status(404).json({ error: "Parent comment not found", code: "PARENT_NOT_FOUND", status: 404 });
      }

      const userName = user?.display_name ?? user?.username ?? "Anonymous";
      const { data: inserted, error: insertError } = await client.from("qr_comments").insert({
        qr_code_id: qrId,
        user_id: uid,
        user_name: userName,
        text,
        parent_id: parentId ?? null,
      }).select("*").single();
      if (insertError) throw insertError;

      await adjustQrCommentCount(client, qrId, 1);

      return res.status(201).json({
        data: mapCommentDoc(inserted.id, inserted),
      });
    } catch (e: any) {
      console.error("[comments POST /]", e.message);
      return res.status(500).json({ error: "Failed to create comment", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── PATCH /api/v1/qr/:qrId/comments/:commentId ──────────────────────────────

commentsRouter.patch(
  "/:commentId",
  authenticate,
  standardLimit,
  validateBody(updateCommentSchema),
  async (req: Request, res: Response) => {
    const { qrId, commentId } = req.params;
    const { text } = req.body;
    const client = getAdminClient();
    if (!client) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    const uid = req.user!.uid;

    try {
      const { data: comment, error: commentError } = await client
        .from("qr_comments")
        .select("id,user_id,is_deleted")
        .eq("id", commentId)
        .eq("qr_code_id", qrId)
        .maybeSingle();

      if (commentError) throw commentError;
      if (!comment || comment.is_deleted) return res.status(404).json({ error: "Comment not found", code: "COMMENT_NOT_FOUND", status: 404 });
      if (comment.user_id !== uid) return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN", status: 403 });

      const { data: updated, error: updateError } = await client
        .from("qr_comments")
        .update({ text, is_edited: true, updated_at: new Date().toISOString() })
        .eq("id", commentId)
        .select("*")
        .single();

      if (updateError) throw updateError;
      return res.json({ data: mapCommentDoc(updated.id, updated) });
    } catch (e: any) {
      console.error("[comments PATCH /:commentId]", e.message);
      return res.status(500).json({ error: "Failed to update comment", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── DELETE /api/v1/qr/:qrId/comments/:commentId ─────────────────────────────

commentsRouter.delete(
  "/:commentId",
  authenticate,
  standardLimit,
  async (req: Request, res: Response) => {
    const { qrId, commentId } = req.params;
    const client = getAdminClient();
    if (!client) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    const uid = req.user!.uid;

    try {
      const { data: comment, error: commentError } = await client
        .from("qr_comments")
        .select("id,user_id")
        .eq("id", commentId)
        .eq("qr_code_id", qrId)
        .maybeSingle();

      if (commentError) throw commentError;
      if (!comment) return res.status(404).json({ error: "Comment not found", code: "COMMENT_NOT_FOUND", status: 404 });
      if (comment.user_id !== uid) return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN", status: 403 });

      const { error: deleteError } = await client
        .from("qr_comments")
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq("id", commentId);

      if (deleteError) throw deleteError;
      await adjustQrCommentCount(client, qrId, -1);

      return res.json({ data: { success: true } });
    } catch (e: any) {
      console.error("[comments DELETE /:commentId]", e.message);
      return res.status(500).json({ error: "Failed to delete comment", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── POST /api/v1/qr/:qrId/comments/:commentId/like ──────────────────────────

commentsRouter.post(
  "/:commentId/like",
  authenticate,
  standardLimit,
  async (req: Request, res: Response) => {
    const { commentId } = req.params;
    const client = getAdminClient();
    if (!client) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    const uid = req.user!.uid;

    try {
      const { data: existing, error: existingError } = await client
        .from("comment_likes")
        .select("comment_id")
        .eq("comment_id", commentId)
        .eq("user_id", uid)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        await client.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", uid);
        const { data: comment } = await client.from("qr_comments").select("likes").eq("id", commentId).single();
        const newLikes = Math.max(0, (comment?.likes ?? 1) - 1);
        await client.from("qr_comments").update({ likes: newLikes }).eq("id", commentId);
        return res.json({ data: { liked: false, likes: newLikes } });
      }

      await client.from("comment_likes").insert({ comment_id: commentId, user_id: uid });
      const { data: comment } = await client.from("qr_comments").select("likes").eq("id", commentId).single();
      const newLikes = (comment?.likes ?? 0) + 1;
      await client.from("qr_comments").update({ likes: newLikes }).eq("id", commentId);
      return res.json({ data: { liked: true, likes: newLikes } });
    } catch (e: any) {
      console.error("[comments POST /:commentId/like]", e.message);
      return res.status(500).json({ error: "Failed to toggle like", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);
