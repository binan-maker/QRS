import { Router, type Request, type Response } from "express";
import { getSupabaseAdmin } from "@/lib/core/supabase";
import { requireAuth } from "../middleware/auth";

export const rewardsRouter = Router();

// GET /api/v1/rewards/offers — public active verified offers
rewardsRouter.get("/offers", async (_req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data, error } = await supabase
        .from("reward_offers")
        .select("id, title, merchant_name, description, image_url, terms, expires_at, source_network")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!error && data) {
        return res.json({ success: true, offers: data });
      }
    }
    return res.json({ success: true, offers: [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Failed to fetch offers" });
  }
});

// POST /api/v1/rewards/issue — issue scratch card after eligible scan
rewardsRouter.post("/issue", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.uid || (req as any).user?.id;
    const { qrCodeId, scanId, idempotencyKey } = req.body;

    if (!userId || !qrCodeId) {
      return res.status(400).json({ success: false, error: "Missing required parameters" });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({ success: false, error: "Database unavailable" });
    }

    const { data, error } = await supabase.rpc("issue_scratch_card", {
      p_user_id: userId,
      p_qr_code_id: qrCodeId,
      p_scan_id: scanId || null,
      p_idempotency_key: idempotencyKey || null,
    });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json({ success: true, ...data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Internal server error" });
  }
});

// GET /api/v1/rewards/my-cards — list cards for authenticated user
rewardsRouter.get("/my-cards", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.uid || (req as any).user?.id;
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({ success: false, error: "Database unavailable" });
    }

    const { data, error } = await supabase
      .from("user_scratch_cards")
      .select(`
        id,
        user_id,
        reward_offer_id,
        source_scan_id,
        qr_code_id,
        status,
        assigned_at,
        revealed_at,
        expires_at,
        reward_offers (
          id,
          title,
          merchant_name,
          description,
          coupon_code,
          tracked_url,
          image_url,
          terms,
          expires_at,
          source_network
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json({ success: true, cards: data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Internal server error" });
  }
});

// POST /api/v1/rewards/reveal — reveal assigned scratch card
rewardsRouter.post("/reveal", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.uid || (req as any).user?.id;
    const { cardId } = req.body;

    if (!cardId) {
      return res.status(400).json({ success: false, error: "Missing cardId" });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({ success: false, error: "Database unavailable" });
    }

    const { data, error } = await supabase.rpc("reveal_scratch_card", {
      p_card_id: cardId,
    });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json({ success: true, ...data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Internal server error" });
  }
});

// POST /api/v1/rewards/event — log reward event
rewardsRouter.post("/event", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.uid || (req as any).user?.id;
    const { cardId, eventType, metadata } = req.body;

    if (!eventType) {
      return res.status(400).json({ success: false, error: "Missing eventType" });
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      await supabase.from("reward_events").insert({
        user_id: userId,
        scratch_card_id: cardId || null,
        event_type: eventType,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      });
    }

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Internal server error" });
  }
});

// GET /api/v1/rewards/sync/status — check Cuelinks sync status
rewardsRouter.get("/sync/status", async (_req: Request, res: Response) => {
  try {
    const { getCuelinksSyncStatus } = await import("../services/cuelinks-service");
    const status = await getCuelinksSyncStatus();
    return res.json({ success: true, ...status });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Failed to check status" });
  }
});

// POST /api/v1/rewards/sync/cuelinks — trigger manual or webhook Cuelinks sync
rewardsRouter.post("/sync/cuelinks", async (req: Request, res: Response) => {
  try {
    const adminKey = req.headers["x-admin-key"] || req.headers["x-api-key"] || req.query.adminKey;
    const expectedKey = process.env.ADMIN_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SESSION_SECRET;

    if (expectedKey && adminKey !== expectedKey) {
      return res.status(401).json({ success: false, error: "Unauthorized sync request" });
    }

    const { syncCuelinksOffers } = await import("../services/cuelinks-service");
    const result = await syncCuelinksOffers();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Sync failed" });
  }
});

