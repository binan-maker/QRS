/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BINRO API: USER PROFILE & SCAN HISTORY ROUTER
 * ───────────────────────────────────────────────────────────────────────────────
 * Manages user accounts, profile modifications, notifications, and scan history.
 * Backed by public.users, public.qr_scans, and public.notifications in Supabase.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getAdminClient } from "../lib/supabase-admin";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { relaxedLimit, standardLimit } from "../middleware/rate-limit-presets";

export const usersRouter = Router();

// ─── Input Validation Schemas ──────────────────────────────────────────────────

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

// ─── GET /api/v1/users/me — Own Profile ───────────────────────────────────────

usersRouter.get(
  "/me",
  authenticate,
  relaxedLimit,
  async (req: Request, res: Response) => {
    const client = getAdminClient();
    if (!client) {
      return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });
    }

    try {
      const { data: user, error } = await client
        .from("users")
        .select("*")
        .eq("id", req.user!.uid)
        .maybeSingle();

      if (error) throw error;
      if (!user) {
        return res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND", status: 404 });
      }

      return res.json({
        data: {
          id: user.id,
          displayName: user.display_name ?? null,
          email: user.email ?? null,
          photoUrl: user.photo_url ?? null,
          username: user.username ?? null,
          scanCount: user.scan_count ?? 0,
          commentCount: user.comment_count ?? 0,
          totalLikesReceived: user.total_likes_received ?? 0,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
      });
    } catch (error: any) {
      console.error("[users/me] Fetch error:", error.message);
      return res.status(500).json({ error: "Failed to fetch profile", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── PATCH /api/v1/users/me — Update Profile ──────────────────────────────────

usersRouter.patch(
  "/me",
  authenticate,
  standardLimit,
  validateBody(updateProfileSchema),
  async (req: Request, res: Response) => {
    const client = getAdminClient();
    if (!client) {
      return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });
    }

    const { displayName, photoUrl, pushToken, username } = req.body;
    const uid = req.user!.uid;

    try {
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (displayName !== undefined) updates.display_name = displayName.trim();
      if (photoUrl !== undefined) updates.photo_url = photoUrl;
      if (pushToken !== undefined) updates.push_token = pushToken;

      // Handle username reservation if requested
      if (username !== undefined) {
        const cleanUsername = username.toLowerCase().trim();

        // Check if username is already taken by someone else
        const { data: existingUser } = await client
          .from("users")
          .select("id")
          .eq("username", cleanUsername)
          .neq("id", uid)
          .maybeSingle();

        if (existingUser) {
          return res.status(409).json({ error: "Username is already taken", code: "USERNAME_TAKEN", status: 409 });
        }

        updates.username = cleanUsername;
        updates.username_last_changed_at = new Date().toISOString();

        // Upsert into unique usernames table
        await client.from("usernames").upsert({
          username: cleanUsername,
          user_id: uid,
          claimed_at: new Date().toISOString(),
        });
      }

      const { data: updated, error } = await client
        .from("users")
        .update(updates)
        .eq("id", uid)
        .select()
        .single();

      if (error) throw error;

      return res.json({
        data: {
          id: updated.id,
          displayName: updated.display_name,
          email: updated.email,
          photoUrl: updated.photo_url,
          username: updated.username,
          updatedAt: updated.updated_at,
        },
      });
    } catch (error: any) {
      console.error("[users/patch-me] Update error:", error.message);
      return res.status(500).json({ error: "Failed to update profile", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── GET /api/v1/users/me/scans — User Scan History ───────────────────────────

usersRouter.get(
  "/me/scans",
  authenticate,
  relaxedLimit,
  async (req: Request, res: Response) => {
    const client = getAdminClient();
    if (!client) {
      return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });
    }

    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid pagination params", code: "VALIDATION_ERROR", status: 400 });
    }
    const { limit, cursor } = parsed.data;

    try {
      let query = client
        .from("qr_scans")
        .select("*")
        .eq("user_id", req.user!.uid)
        .order("scanned_at", { ascending: false })
        .limit(limit + 1);

      if (cursor) {
        query = query.lt("scanned_at", cursor);
      }

      const { data: rows, error } = await query;
      if (error) throw error;

      const hasMore = (rows?.length ?? 0) > limit;
      const items = (hasMore ? rows!.slice(0, limit) : (rows ?? [])).map((row) => ({
        id: row.id,
        qrCodeId: row.qr_code_id,
        content: row.content,
        contentType: row.content_type,
        platform: row.platform,
        verdict: row.verdict,
        scannedAt: row.scanned_at,
      }));

      const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].scannedAt : null;

      return res.json({
        data: items,
        pagination: {
          limit,
          nextCursor,
          hasMore,
        },
      });
    } catch (error: any) {
      console.error("[users/me/scans] History error:", error.message);
      return res.status(500).json({ error: "Failed to fetch scans", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);

// ─── GET /api/v1/users/:userId — Public Profile ───────────────────────────────

usersRouter.get(
  "/:userId",
  relaxedLimit,
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const client = getAdminClient();
    if (!client) {
      return res.status(503).json({ error: "Database unavailable", code: "SERVICE_UNAVAILABLE", status: 503 });
    }

    try {
      const { data: user, error } = await client
        .from("users")
        .select("id, display_name, photo_url, username, scan_count, comment_count, total_likes_received, created_at")
        .eq("id", userId)
        .eq("is_deleted", false)
        .maybeSingle();

      if (error) throw error;
      if (!user) {
        return res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND", status: 404 });
      }

      return res.json({
        data: {
          id: user.id,
          displayName: user.display_name ?? null,
          photoUrl: user.photo_url ?? null,
          username: user.username ?? null,
          scanCount: user.scan_count ?? 0,
          commentCount: user.comment_count ?? 0,
          totalLikesReceived: user.total_likes_received ?? 0,
          createdAt: user.created_at,
        },
      });
    } catch (error: any) {
      console.error("[users/:userId] Public profile error:", error.message);
      return res.status(500).json({ error: "Failed to fetch user", code: "INTERNAL_ERROR", status: 500 });
    }
  },
);
