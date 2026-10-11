-- ═══════════════════════════════════════════════════════════════════════════════
-- BINRO SUPABASE SCHEMA: REWARDS_DEALS & VCOMMISSION COUPONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
-- File: /supabase/20261010_rewards_deals.sql
-- Run this in your Supabase SQL Editor (supabase.com -> SQL Editor -> New Query)
--
-- NOTE: Hardcoded coupon codes have been removed.
-- This migration strictly sets up the table schema, indexes, view aliases, and
-- Row-Level Security (RLS) policies.
--
-- All active deals and coupons are dynamically fetched, updated, and populated
-- via the BinRo automated sync engine:
--   POST /api/rewards/vcommission-sync
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Create table public.rewards_deals
CREATE TABLE IF NOT EXISTS public.rewards_deals (
  id TEXT PRIMARY KEY,
  network_provider TEXT NOT NULL DEFAULT 'vcommission',
  campaign_id TEXT,
  merchant_name TEXT NOT NULL,
  merchant_logo_url TEXT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  coupon_code TEXT,
  destination_url TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold')),
  category TEXT NOT NULL DEFAULT 'Shopping',
  terms_text TEXT DEFAULT 'Valid on qualifying orders. Standard merchant terms apply.',
  is_approved BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  daily_allocation_limit INTEGER NOT NULL DEFAULT 500,
  total_allocated INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist in case table was created with partial schema
ALTER TABLE public.rewards_deals ADD COLUMN IF NOT EXISTS network_provider TEXT DEFAULT 'vcommission';
ALTER TABLE public.rewards_deals ADD COLUMN IF NOT EXISTS campaign_id TEXT;
ALTER TABLE public.rewards_deals ADD COLUMN IF NOT EXISTS merchant_name TEXT NOT NULL DEFAULT 'Merchant';
ALTER TABLE public.rewards_deals ADD COLUMN IF NOT EXISTS merchant_logo_url TEXT;
ALTER TABLE public.rewards_deals ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
ALTER TABLE public.rewards_deals ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.rewards_deals ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE public.rewards_deals ADD COLUMN IF NOT EXISTS destination_url TEXT NOT NULL DEFAULT '';
ALTER TABLE public.rewards_deals ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'bronze';
ALTER TABLE public.rewards_deals ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Shopping';
ALTER TABLE public.rewards_deals ADD COLUMN IF NOT EXISTS terms_text TEXT;
ALTER TABLE public.rewards_deals ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;
ALTER TABLE public.rewards_deals ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.rewards_deals ADD COLUMN IF NOT EXISTS daily_allocation_limit INTEGER DEFAULT 500;
ALTER TABLE public.rewards_deals ADD COLUMN IF NOT EXISTS total_allocated INTEGER DEFAULT 0;
ALTER TABLE public.rewards_deals ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
ALTER TABLE public.rewards_deals ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.rewards_deals ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.rewards_deals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Also create reward_offers view/table alias for backward compatibility
CREATE OR REPLACE VIEW public.reward_offers AS
SELECT * FROM public.rewards_deals;

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_rewards_deals_active_tier 
  ON public.rewards_deals (is_active, tier);
CREATE INDEX IF NOT EXISTS idx_rewards_deals_merchant 
  ON public.rewards_deals (merchant_name);
CREATE INDEX IF NOT EXISTS idx_rewards_deals_coupon 
  ON public.rewards_deals (coupon_code);

-- 3. Row Level Security (RLS)
ALTER TABLE public.rewards_deals ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anonymous or authenticated) to read active deals
DROP POLICY IF EXISTS "Allow public read access to active deals" ON public.rewards_deals;
CREATE POLICY "Allow public read access to active deals"
  ON public.rewards_deals
  FOR SELECT
  USING (
    is_active = TRUE 
    AND is_approved = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- Only service role / admin can insert, update, or delete
DROP POLICY IF EXISTS "Service role full access on rewards_deals" ON public.rewards_deals;
CREATE POLICY "Service role full access on rewards_deals"
  ON public.rewards_deals
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
