/**
 * /api/v1/feedback — user-submitted feedback and bug reports.
 *
 * All endpoints are intentionally unauthenticated: crash reporters fire when
 * the auth state may be unknown.  Rate-limited per IP via publicLimit.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getAdminClient } from "../lib/supabase-admin";
import { publicLimit } from "../middleware/rate-limit-presets";
import { validateBody } from "../middleware/validate";

export const feedbackRouter = Router();

const bugReportSchema = z.object({
  errorMessage: z.string().max(1000).default("Unknown error"),
  errorStack:   z.string().max(2000).default(""),
  userMessage:  z.string().max(2000).default(""),
  deviceInfo:   z.string().max(200).default(""),
  appVersion:   z.string().max(50).default("unknown"),
});

// POST /api/v1/feedback/bug-report
feedbackRouter.post(
  "/bug-report",
  publicLimit,
  validateBody(bugReportSchema),
  async (req: Request, res: Response) => {
    const client = getAdminClient();
    if (!client) {
      return res.status(503).json({ error: "Service unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });
    }

    try {
      const { errorMessage, errorStack, userMessage, deviceInfo, appVersion } = req.body;
      const { error } = await client.from("feedback").insert({
        error_message: errorMessage,
        error_stack: errorStack,
        user_message: userMessage,
        device_info: deviceInfo,
        app_version: appVersion,
      });
      if (error) throw error;
      return res.status(201).json({ ok: true });
    } catch (e: any) {
      console.error("[feedback/bug-report]", e.message);
      return res.status(500).json({ error: "Failed to submit report", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);
