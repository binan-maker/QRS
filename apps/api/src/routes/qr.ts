/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BINRO API: QR CODE DETAILS & COUNTERS ROUTER
 * ───────────────────────────────────────────────────────────────────────────────
 * Provides read-only details and atomic counter mutations for QR records.
 * Queries the public.qr_codes table in Supabase.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getAdminClient } from "../lib/supabase-admin";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { standardLimit } from "../middleware/rate-limit-presets";

export const qrRouter = Router();

/**
 * GET /api/v1/qr/:qrId
 * Returns canonical QR code metadata, decoded content, and aggregate scan counts.
 */
qrRouter.get("/:qrId", standardLimit, async (req: Request, res: Response) => {
  const { qrId } = req.params;
  const client = getAdminClient();
  if (!client) {
    return res.status(503).json({
      error: "Database unavailable",
      code: "SERVICE_UNAVAILABLE",
      status: 503,
    });
  }

  try {
    const { data: qr, error } = await client
      .from("qr_codes")
      .select("id,content,content_type,qr_type,display_destination,scan_count,comment_count,created_at,updated_at")
      .eq("id", qrId)
      .maybeSingle();

    if (error) throw error;
    if (!qr) {
      return res.status(404).json({
        error: "QR code not found",
        code: "QR_NOT_FOUND",
        status: 404,
      });
    }

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
  } catch (error: any) {
    console.error("[qr/:qrId] Fetch error:", error.message);
    return res.status(500).json({
      error: "Failed to fetch QR details",
      code: "INTERNAL_ERROR",
      status: 500,
    });
  }
});

const commentCountSchema = z.object({
  delta: z.number().int().min(-1).max(1),
});

/**
 * POST /api/v1/qr/:qrId/comment-count
 * Mutates the aggregate comment counter atomically when comments are added or removed.
 */
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
      return res.status(503).json({
        error: "Database unavailable",
        code: "SERVICE_UNAVAILABLE",
        status: 503,
      });
    }

    try {
      const { data: current, error: fetchErr } = await client
        .from("qr_codes")
        .select("comment_count")
        .eq("id", qrId)
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      if (!current) {
        return res.status(404).json({
          error: "QR code not found",
          code: "QR_NOT_FOUND",
          status: 404,
        });
      }

      const updatedCount = Math.max(0, (current.comment_count ?? 0) + delta);
      const { error: updateErr } = await client
        .from("qr_codes")
        .update({
          comment_count: updatedCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", qrId);

      if (updateErr) throw updateErr;

      return res.json({
        data: {
          id: qrId,
          commentCount: updatedCount,
        },
      });
    } catch (error: any) {
      console.error("[qr/:qrId/comment-count] Mutation error:", error.message);
      return res.status(500).json({
        error: "Failed to update comment count",
        code: "INTERNAL_ERROR",
        status: 500,
      });
    }
  },
);
