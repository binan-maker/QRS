-- ═══════════════════════════════════════════════════════════════════════════════
-- BINRO SUPABASE SCHEMA: REWARDS_DEALS & VCOMMISSION COUPONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
-- File: /supabase/migrations/20261010_rewards_deals.sql
-- Run this in your Supabase SQL Editor (supabase.com -> SQL Editor -> New Query)
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

-- 4. Seed the 11 Live vCommission Coupons directly into Supabase
INSERT INTO public.rewards_deals (
  id, network_provider, campaign_id, merchant_name, title, description,
  coupon_code, destination_url, tier, category, terms_text, starts_at, expires_at, is_active, is_approved
) VALUES
(
  'vc_tatacliq_amex_1010',
  'vcommission',
  '10240',
  'Tata CLiQ',
  'Get 12.5% Instant Discount on American Express Cards',
  'Instant cardholder savings on luxury fashion, footwear, electronics, and lifestyle items at Tata CLiQ.',
  'AMEXTCF1010',
  'https://tracking.vcommission.com/aff_c?offer_id=10240&aff_id=132680',
  'gold',
  'Fashion & Electronics',
  'Valid on American Express Credit Cards. Minimum transaction values and standard Tata CLiQ terms apply.',
  '2026-10-08T00:00:00Z',
  '2026-11-30T23:59:59Z',
  TRUE,
  TRUE
),
(
  'vc_tatacliq_stepup12',
  'vcommission',
  '10240',
  'Tata CLiQ',
  'Extra 12% OFF on Orders Above ₹1,699',
  'Site-wide step-up shopping discount on fashion, footwear, and beauty essentials.',
  'STEPUP12',
  'https://tracking.vcommission.com/aff_c?offer_id=10240&aff_id=132680',
  'bronze',
  'Fashion',
  'Minimum purchase of ₹1,699 required. Valid across qualifying categories.',
  '2026-10-08T00:00:00Z',
  '2026-11-30T23:59:59Z',
  TRUE,
  TRUE
),
(
  'vc_blabliblu_15',
  'vcommission',
  '13738',
  'Blabliblulife',
  '15% OFF Wellness & Lifestyle Products',
  'Exclusive verified voucher on modern lifestyle and health essentials.',
  'VC15',
  'https://tracking.vcommission.com/aff_c?offer_id=13738&aff_id=132680',
  'silver',
  'Lifestyle & Health',
  'Not applicable on trial packs and discounted bundles. Standard store conditions apply.',
  '2026-09-29T00:00:00Z',
  '2027-04-01T23:59:59Z',
  TRUE,
  TRUE
),
(
  'vc_blabliblu_10',
  'vcommission',
  '13738',
  'Blabliblulife',
  '10% OFF Sitewide Voucher',
  'Save on premium daily care, nutrition, and wellness packs.',
  'VC10',
  'https://tracking.vcommission.com/aff_c?offer_id=13738&aff_id=132680',
  'bronze',
  'Lifestyle & Health',
  'Not applicable on trial packs and discounted bundles.',
  '2026-09-29T00:00:00Z',
  '2027-04-01T23:59:59Z',
  TRUE,
  TRUE
),
(
  'vc_blabliblu_5',
  'vcommission',
  '13738',
  'Blabliblulife',
  '5% OFF Instant Starter Discount',
  'Bonus introductory discount code for community members.',
  'VC5',
  'https://tracking.vcommission.com/aff_c?offer_id=13738&aff_id=132680',
  'bronze',
  'Lifestyle & Health',
  'Not applicable on trial packs and discounted bundles.',
  '2026-09-29T00:00:00Z',
  '2027-04-01T23:59:59Z',
  TRUE,
  TRUE
),
(
  'vc_tatacliq_kotak',
  'vcommission',
  '10240',
  'Tata CLiQ',
  '12.5% Discount on Kotak Bank Credit Cards',
  'Exclusive bank partner cashback and instant discount across curated brands on Tata CLiQ.',
  'TCFKOTAK',
  'https://tracking.vcommission.com/aff_c?offer_id=10240&aff_id=132680',
  'gold',
  'Fashion & Electronics',
  'Valid on Kotak Bank Credit Card checkouts. Terms and conditions apply.',
  '2026-10-08T00:00:00Z',
  '2026-11-30T23:59:59Z',
  TRUE,
  TRUE
),
(
  'vc_tatacliq_cliqdeal',
  'vcommission',
  '10240',
  'Tata CLiQ',
  'Festive Deal: 50% - 85% OFF + Extra 11% OFF',
  'High-value festive sale callout with extra savings when combined with festive pass.',
  'CLIQDEAL',
  'https://tracking.vcommission.com/aff_c?offer_id=10240&aff_id=132680',
  'silver',
  'Fashion',
  'Applicable on festive catalog collections. Subject to Tata CLiQ festive pass terms.',
  '2026-10-08T00:00:00Z',
  '2026-11-30T23:59:59Z',
  TRUE,
  TRUE
),
(
  'vc_tatacliq_new400',
  'vcommission',
  '10240',
  'Tata CLiQ',
  'Flat ₹400 OFF on Fashion & Lifestyle',
  'Direct instant cart discount on top clothing, shoes, and luxury accessories.',
  'NEW400',
  'https://tracking.vcommission.com/aff_c?offer_id=10240&aff_id=132680',
  'silver',
  'Fashion',
  'Valid on eligible cart sizes as per campaign conditions.',
  '2026-09-24T00:00:00Z',
  '2027-06-01T23:59:59Z',
  TRUE,
  TRUE
),
(
  'vc_tatacliq_noreturn',
  'vcommission',
  '10240',
  'Tata CLiQ',
  'Flat 12% OFF Clearance Voucher',
  'Deep discount on verified designer collections and clearance lines.',
  'NORETURN',
  'https://tracking.vcommission.com/aff_c?offer_id=10240&aff_id=132680',
  'bronze',
  'Fashion',
  'Flat 12% OFF. Applying this coupon makes eligible products non-returnable; size exchange allowed.',
  '2026-09-24T00:00:00Z',
  '2027-07-31T23:59:59Z',
  TRUE,
  TRUE
),
(
  'vc_tenxyou_18',
  'vcommission',
  '13667',
  'Tenxyou',
  'Flat 18% OFF (Up to ₹600)',
  'Exclusive youth fashion, streetwear, and trendy apparel deal.',
  'VC18',
  'https://tracking.vcommission.com/aff_c?offer_id=13667&aff_id=132680',
  'gold',
  'Fashion & Apparel',
  'Maximum discount ₹600. Valid on qualifying Tenxyou merchandise.',
  '2026-09-16T00:00:00Z',
  '2027-01-01T23:59:59Z',
  TRUE,
  TRUE
),
(
  'vc_tenxyou_15',
  'vcommission',
  '13667',
  'Tenxyou',
  'Flat 15% OFF (Up to ₹500)',
  'High-conversion discount code for sneakers, accessories, and new arrivals.',
  'VC15',
  'https://tracking.vcommission.com/aff_c?offer_id=13667&aff_id=132680',
  'silver',
  'Fashion & Apparel',
  'Maximum discount ₹500. Valid on qualifying Tenxyou orders.',
  '2026-09-16T00:00:00Z',
  '2027-01-01T23:59:59Z',
  TRUE,
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  coupon_code = EXCLUDED.coupon_code,
  destination_url = EXCLUDED.destination_url,
  tier = EXCLUDED.tier,
  category = EXCLUDED.category,
  terms_text = EXCLUDED.terms_text,
  expires_at = EXCLUDED.expires_at,
  is_active = EXCLUDED.is_active,
  is_approved = EXCLUDED.is_approved,
  updated_at = NOW();
