import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getAdminClient } from "../lib/supabase-admin";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { standardLimit } from "../middleware/rate-limit-presets";

export const qrRouter = Router();

// ─── GET /api/v1/qr/:qrId ────────────────────────────────────────────────────
// Return QR code details only (read-only)
qrRouter.get("/:qrId", standardLimit, async (req: Request, res: Response) => {
  const { qrId } = req.params;
  const client = getAdminClient();
  if (!client) {
    return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });
  }

  try {
    const { data: qr, error } = await client
      .from("qr_codes")
      .select("id,content,content_type,qr_type,display_destination,scan_count,comment_count,created_at,updated_at")
      .eq("id", qrId)
      .maybeSingle();

    if (error) throw error;
    if (!qr) return res.status(404).json({ error: "QR code not found", code: "QR_NOT_FOUND", status: 404 });

    return res.json({
      data: {
        id: qr.id,
        content: qr.content,
        contentType: qr.content_type,
        qrType: qr.qr_type,
        displayDestination: qr.display_destination,
        scanCount: qr.scan_count ?? 0,
        commentCount: qr.comment_count ?? 0,
        createdAt: qr.created_at,
        updatedAt: qr.updated_at,
      },
    });
  } catch (e: any) {
    console.error("[v1/qr/:qrId]", e.message);
    return res.status(500).json({ error: "Failed to fetch QR details", code: "INTERNAL_ERROR", status: 500 });
  }
});

const commentCountSchema = z.object({
  delta: z.number().int().min(-1).max(1),
});

// ─── POST /api/v1/qr/:qrId/comment-count ─────────────────────────────────────

qrRouter.post(
  "/:qrId/comment-count",
  authenticate,
  standardLimit,
  validateBody(commentCountSchema),
  async (req: Request, res: Response) => {
    const { qrId } = req.params;
    const { delta } = req.body;

    const client = getAdminClient();
    if (!client) {
      return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });
    }

    try {
      const { data: qr, error: findError } = await client
        .from("qr_codes")
        .select("id,comment_count")
        .eq("id", qrId)
        .maybeSingle();

      if (findError) throw findError;
      if (!qr) return res.status(404).json({ error: "QR code not found", code: "QR_NOT_FOUND", status: 404 });

      const newCount = Math.max(0, (qr.comment_count ?? 0) + delta);
      const { error: updateError } = await client
        .from("qr_codes")
        .update({ comment_count: newCount, updated_at: new Date().toISOString() })
        .eq("id", qrId);

      if (updateError) throw updateError;
      return res.json({ data: { success: true, commentCount: newCount } });
    } catch (e: any) {
      console.error("[v1/qr/comment-count]", e.message);
      return res.status(500).json({ error: "Failed to update comment count", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);
