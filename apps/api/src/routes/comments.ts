/**
 * /api/v1/qr/:qrId/comments — CRUD for QR code comments
 *
 * Supports both legacy qrCodes/{id} and unified qrs/{id} QRs.
 * The qrId path param is the Firestore document ID.
 *
 * All write endpoints require Supabase Auth.
 * TODO markers show where PostgreSQL queries replace Firestore calls.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getAdminClient } from "../lib/supabase-admin";
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
    isPinned: data.isPinned ?? false,
    isEdited: data.isEdited ?? false,
    createdAt: data.created_at ?? data.createdAt ?? null,
    updatedAt: data.updated_at ?? data.updatedAt ?? null,
  };
}

async function resolveQrForeignKey(client: any, qrId: string) {
  const [legacy, unified] = await Promise.all([
    client.from("qr_codes").select("id").eq("id", qrId).maybeSingle(),
    client.from("unified_qrs").select("id").eq("id", qrId).maybeSingle(),
  ]);
  if (legacy.error) throw legacy.error;
  if (unified.error) throw unified.error;
  if (legacy.data) return { qr_code_id: qrId };
  if (unified.data) return { unified_qr_id: qrId };
  return null;
}

async function adjustQrCounter(client: any, qrId: string, field: string, delta: number) {
  const foreignKey = await resolveQrForeignKey(client, qrId);
  if (!foreignKey) return false;
  const table = "qr_code_id" in foreignKey ? "qr_codes" : "unified_qrs";
  const { error: rpcError } = await client.rpc("increment_field", {
    p_table: table,
    p_id: qrId,
    p_field: field,
    p_delta: delta,
  });
  if (!rpcError) return true;
  const { data, error } = await client.from(table).select(field).eq("id", qrId).single();
  if (error) throw error;
  const { error: updateError } = await client.from(table).update({ [field]: Number(data?.[field] ?? 0) + delta }).eq("id", qrId);
  if (updateError) throw updateError;
  return true;
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

    const client = getAdminClient();
    if (!client) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      const foreignKey = await resolveQrForeignKey(client, qrId);
      if (!foreignKey) return res.status(404).json({ error: "QR code not found", code: "QR_NOT_FOUND", status: 404 });
      let query = client.from("qr_comments").select("*").match(foreignKey)
        .eq("is_deleted", false).order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(limit + 1);
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

// ─── POST /api/v1/qr/:qrId/comments — create comment ────────────────────────

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
      const [{ data: user, error: userError }, foreignKey] = await Promise.all([
        client.from("users").select("display_name,username").eq("id", uid).maybeSingle(),
        resolveQrForeignKey(client, qrId),
      ]);
      if (userError) throw userError;
      if (!foreignKey) return res.status(404).json({ error: "QR code not found", code: "QR_NOT_FOUND", status: 404 });

      // Validate parent comment exists if provided
      if (parentId) {
        const { data: parent, error: parentError } = await client.from("qr_comments").select("id").eq("id", parentId).match(foreignKey).maybeSingle();
        if (parentError) throw parentError;
        if (!parent) return res.status(404).json({ error: "Parent comment not found", code: "PARENT_NOT_FOUND", status: 404 });
      }

      const commentData = {
        userId: uid,
        userName: user?.display_name ?? user?.username ?? "Anonymous",
        text,
        parentId: parentId ?? null,
        ...foreignKey,
      };
      const { data: inserted, error: insertError } = await client.from("qr_comments").insert({
        ...foreignKey,
        user_id: uid,
        user_name: commentData.userName,
        text,
        parent_id: parentId ?? null,
      }).select("*").single();
      if (insertError) throw insertError;
      await adjustQrCounter(client, qrId, "comment_count", 1);

      return res.status(201).json({
        data: mapCommentDoc(inserted.id, inserted),
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
    const client = getAdminClient();
    if (!client) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      const foreignKey = await resolveQrForeignKey(client, qrId);
      if (!foreignKey) return res.status(404).json({ error: "QR code not found", code: "QR_NOT_FOUND", status: 404 });
      const { data: comment, error: fetchError } = await client.from("qr_comments").select("id,user_id,is_deleted").eq("id", commentId).match(foreignKey).maybeSingle();
      if (fetchError) throw fetchError;
      if (!comment) return res.status(404).json({ error: "Comment not found", code: "COMMENT_NOT_FOUND", status: 404 });
      if (comment.user_id !== req.user!.uid) return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN", status: 403 });
      const { error } = await client.from("qr_comments").update({ text, is_edited: true, updated_at: new Date().toISOString() }).eq("id", commentId);
      if (error) throw error;
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
    const client = getAdminClient();
    if (!client) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      const foreignKey = await resolveQrForeignKey(client, qrId);
      if (!foreignKey) return res.status(404).json({ error: "QR code not found", code: "QR_NOT_FOUND", status: 404 });
      const { data: comment, error: fetchError } = await client.from("qr_comments").select("id,user_id,is_deleted").eq("id", commentId).match(foreignKey).maybeSingle();
      if (fetchError) throw fetchError;
      if (!comment) return res.status(404).json({ error: "Comment not found", code: "COMMENT_NOT_FOUND", status: 404 });
      if (comment.user_id !== req.user!.uid) return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN", status: 403 });
      if (!comment.is_deleted) {
        const { error } = await client.from("qr_comments").update({ is_deleted: true, text: "[deleted]", updated_at: new Date().toISOString() }).eq("id", commentId);
        if (error) throw error;
        await adjustQrCounter(client, qrId, "comment_count", -1);
      }

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
    const client = getAdminClient();
    if (!client) return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });

    try {
      const { data: existing, error: existingError } = await client.from("comment_likes").select("comment_id").eq("comment_id", commentId).eq("user_id", uid).maybeSingle();
      if (existingError) throw existingError;
      let liked: boolean;
      if (existing) {
        const { error } = await client.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", uid);
        if (error) throw error;
        await client.rpc("increment_field", { p_table: "qr_comments", p_id: commentId, p_field: "likes", p_delta: -1 });
        liked = false;
      } else {
        const { error } = await client.from("comment_likes").insert({ comment_id: commentId, user_id: uid });
        if (error) throw error;
        await client.rpc("increment_field", { p_table: "qr_comments", p_id: commentId, p_field: "likes", p_delta: 1 });
        liked = true;
      }
      const { data: updated, error: updatedError } = await client.from("qr_comments").select("likes").eq("id", commentId).single();
      if (updatedError) throw updatedError;
      return res.json({ data: { liked, likes: Number(updated.likes ?? 0), dislikes: 0 } });
    } catch (e: any) {
      console.error("[comments POST /:commentId/like]", e.message);
      return res.status(500).json({ error: "Failed to toggle like", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);
