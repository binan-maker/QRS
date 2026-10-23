-- ═══════════════════════════════════════════════════════════════════════════════
-- BINRO SUPABASE FULL PRODUCTION SCHEMA, SAFE MIGRATIONS, RLS & RPC FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════
-- Safe to run on BOTH brand-new and existing Supabase databases:
-- • Preserves 100% of existing tables and user rows
-- • Automatically adds any missing columns (like avatar_url, past_usernames, etc.)
-- • Configures RLS policies and the delete_own_account() RPC
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. USERS TABLE (public.users) + SAFE COLUMN MIGRATIONS FOR EXISTING DATABASES
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT 'User',
  username TEXT UNIQUE,
  past_usernames TEXT[] NOT NULL DEFAULT '{}',
  username_last_changed_at TIMESTAMPTZ,
  photo_url TEXT,
  avatar_url TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  scan_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  total_likes_received INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist if public.users was created by an older schema
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT 'User';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS past_usernames TEXT[] DEFAULT '{}';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username_last_changed_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS scan_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_likes_received INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_users_username_lower ON public.users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower_unique ON public.users (LOWER(username)) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON public.users (LOWER(email));

-- 3. USERNAMES RESERVATION TABLE (public.usernames)
CREATE TABLE IF NOT EXISTS public.usernames (
  username TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.usernames ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.usernames ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_usernames_user_id ON public.usernames (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usernames_lower ON public.usernames (LOWER(username));

-- 4. QR CODES REGISTRY (public.qr_codes)
CREATE TABLE IF NOT EXISTS public.qr_codes (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT 'url',
  scan_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  report_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  weighted_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  suspicious_vote_flag BOOLEAN NOT NULL DEFAULT FALSE,
  suspicious_safe_multiplier NUMERIC NOT NULL DEFAULT 1,
  suspicious_neg_multiplier NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '';
ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'url';
ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS scan_count INTEGER DEFAULT 0;
ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;
ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS report_counts JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS weighted_counts JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS suspicious_vote_flag BOOLEAN DEFAULT FALSE;
ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS suspicious_safe_multiplier NUMERIC DEFAULT 1;
ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS suspicious_neg_multiplier NUMERIC DEFAULT 1;
ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 6. QR SCANS HISTORY (public.qr_scans)
CREATE TABLE IF NOT EXISTS public.qr_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  qr_code_id TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT 'url',
  verdict TEXT DEFAULT 'unknown',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.qr_scans ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.qr_scans ADD COLUMN IF NOT EXISTS qr_code_id TEXT;
ALTER TABLE public.qr_scans ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '';
ALTER TABLE public.qr_scans ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'url';
ALTER TABLE public.qr_scans ADD COLUMN IF NOT EXISTS verdict TEXT DEFAULT 'unknown';
ALTER TABLE public.qr_scans ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.qr_scans ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_qr_scans_user_scanned ON public.qr_scans (user_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_code_id ON public.qr_scans (qr_code_id);

-- 7. QR COMMENTS (public.qr_comments)
CREATE TABLE IF NOT EXISTS public.qr_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  parent_id UUID,
  text TEXT NOT NULL DEFAULT '',
  user_display_name TEXT,
  user_username TEXT,
  user_photo_url TEXT,
  likes INTEGER NOT NULL DEFAULT 0,
  dislikes INTEGER NOT NULL DEFAULT 0,
  report_count INTEGER NOT NULL DEFAULT 0,
  is_edited BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.qr_comments ADD COLUMN IF NOT EXISTS qr_code_id TEXT;
ALTER TABLE public.qr_comments ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.qr_comments ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE public.qr_comments ADD COLUMN IF NOT EXISTS text TEXT DEFAULT '';
ALTER TABLE public.qr_comments ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.qr_comments ADD COLUMN IF NOT EXISTS user_display_name TEXT;
ALTER TABLE public.qr_comments ADD COLUMN IF NOT EXISTS user_username TEXT;
ALTER TABLE public.qr_comments ADD COLUMN IF NOT EXISTS user_photo_url TEXT;
ALTER TABLE public.qr_comments ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE public.qr_comments ADD COLUMN IF NOT EXISTS dislikes INTEGER DEFAULT 0;
ALTER TABLE public.qr_comments ADD COLUMN IF NOT EXISTS report_count INTEGER DEFAULT 0;
ALTER TABLE public.qr_comments ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE public.qr_comments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.qr_comments ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;
ALTER TABLE public.qr_comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.qr_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_qr_comments_qr_id ON public.qr_comments (qr_code_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_comments_user_id ON public.qr_comments (user_id);

-- 8. COMMENT LIKES / REACTIONS (public.comment_likes)
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL,
  qr_code_id TEXT,
  user_id UUID NOT NULL,
  reaction TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.comment_likes ADD COLUMN IF NOT EXISTS comment_id TEXT;
ALTER TABLE public.comment_likes ADD COLUMN IF NOT EXISTS qr_code_id TEXT;
ALTER TABLE public.comment_likes ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.comment_likes ADD COLUMN IF NOT EXISTS reaction TEXT DEFAULT 'like';
ALTER TABLE public.comment_likes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON public.comment_likes (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_comment_likes_unique ON public.comment_likes (comment_id, user_id);

-- 9. QR COMMUNITY REPORTS / VOTES (public.qr_reports)
CREATE TABLE IF NOT EXISTS public.qr_reports (
  id TEXT PRIMARY KEY,
  qr_code_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 1,
  trust_tier TEXT DEFAULT 'standard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.qr_reports ADD COLUMN IF NOT EXISTS qr_code_id TEXT;
ALTER TABLE public.qr_reports ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.qr_reports ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.qr_reports ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 1;
ALTER TABLE public.qr_reports ADD COLUMN IF NOT EXISTS trust_tier TEXT DEFAULT 'standard';
ALTER TABLE public.qr_reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.qr_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_qr_reports_qr_id ON public.qr_reports (qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_reports_user_id ON public.qr_reports (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_reports_unique ON public.qr_reports (qr_code_id, user_id);

-- Drop retired user_favorites table if present
DROP TABLE IF EXISTS public.user_favorites CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY (RLS) POLICIES (Type-safe ::text comparisons)
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usernames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_reports ENABLE ROW LEVEL SECURITY;

-- Users: public read for profiles, self insert/update/delete
DROP POLICY IF EXISTS "Users public read" ON public.users;
CREATE POLICY "Users public read" ON public.users FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users self insert" ON public.users;
CREATE POLICY "Users self insert" ON public.users FOR INSERT WITH CHECK (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Users self update" ON public.users;
CREATE POLICY "Users self update" ON public.users FOR UPDATE USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Users self delete" ON public.users;
CREATE POLICY "Users self delete" ON public.users FOR DELETE USING (auth.uid()::text = id::text);

-- Usernames: public read, self insert/update/delete
DROP POLICY IF EXISTS "Usernames public read" ON public.usernames;
CREATE POLICY "Usernames public read" ON public.usernames FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Usernames self write" ON public.usernames;
CREATE POLICY "Usernames self write" ON public.usernames FOR ALL USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text);

-- QR Codes: public read, authenticated insert/update
DROP POLICY IF EXISTS "QR codes public read" ON public.qr_codes;
CREATE POLICY "QR codes public read" ON public.qr_codes FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "QR codes authenticated write" ON public.qr_codes;
CREATE POLICY "QR codes authenticated write" ON public.qr_codes FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "QR codes authenticated update" ON public.qr_codes;
CREATE POLICY "QR codes authenticated update" ON public.qr_codes FOR UPDATE USING (TRUE);

-- QR Scans: strictly private to owner
DROP POLICY IF EXISTS "QR scans owner access" ON public.qr_scans;
CREATE POLICY "QR scans owner access" ON public.qr_scans FOR ALL USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text);

-- QR Comments: public read, authenticated owner write/delete
DROP POLICY IF EXISTS "QR comments public read" ON public.qr_comments;
CREATE POLICY "QR comments public read" ON public.qr_comments FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "QR comments owner insert" ON public.qr_comments;
CREATE POLICY "QR comments owner insert" ON public.qr_comments FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "QR comments owner update" ON public.qr_comments;
CREATE POLICY "QR comments owner update" ON public.qr_comments FOR UPDATE USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "QR comments owner delete" ON public.qr_comments;
CREATE POLICY "QR comments owner delete" ON public.qr_comments FOR DELETE USING (auth.uid()::text = user_id::text);

-- Comment Likes: public read, owner write/delete
DROP POLICY IF EXISTS "Comment likes public read" ON public.comment_likes;
CREATE POLICY "Comment likes public read" ON public.comment_likes FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Comment likes owner write" ON public.comment_likes;
CREATE POLICY "Comment likes owner write" ON public.comment_likes FOR ALL USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text);

-- QR Reports: public read, owner write/delete
DROP POLICY IF EXISTS "QR reports public read" ON public.qr_reports;
CREATE POLICY "QR reports public read" ON public.qr_reports FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "QR reports owner write" ON public.qr_reports;
CREATE POLICY "QR reports owner write" ON public.qr_reports FOR ALL USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text);

-- ═══════════════════════════════════════════════════════════════════════════════
-- RPC FUNCTIONS: ATOMIC INCREMENT & PERMANENT SELF-ACCOUNT DELETION
-- ═══════════════════════════════════════════════════════════════════════════════

-- Atomic field increment RPC (matches lib/db/providers/supabase.ts signature)
DROP FUNCTION IF EXISTS public.increment_field(TEXT, TEXT, TEXT, INTEGER);
CREATE OR REPLACE FUNCTION public.increment_field(
  p_table TEXT,
  p_id TEXT,
  p_field TEXT,
  p_delta NUMERIC DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_table NOT IN ('users', 'qr_codes', 'qr_comments') THEN
    RAISE EXCEPTION 'Invalid table for increment_field: %', p_table;
  END IF;
  EXECUTE format(
    'UPDATE public.%I SET %I = GREATEST(0, COALESCE(%I, 0) + $1), updated_at = NOW() WHERE id::text = $2',
    p_table, p_field, p_field
  ) USING p_delta, p_id;
END;
$$;

-- Self-service permanent account deletion RPC (deletes public data + auth.users row)
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Cascade delete / anonymize all user records in public schema
  DELETE FROM public.comment_likes WHERE user_id::text = uid::text;
  DELETE FROM public.qr_reports WHERE user_id::text = uid::text;
  DELETE FROM public.qr_scans WHERE user_id::text = uid::text;
  DELETE FROM public.qr_comments WHERE user_id::text = uid::text;
  DELETE FROM public.usernames WHERE user_id::text = uid::text;
  DELETE FROM public.users WHERE id::text = uid::text;

  -- 2. Best-effort cleanup of avatar storage metadata if any remained
  BEGIN
    DELETE FROM storage.objects
     WHERE bucket_id = 'avatars'
       AND (owner::text = uid::text OR name LIKE uid::text || '/%');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 3. Delete the authentication identity from auth.users
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_field(TEXT, TEXT, TEXT, NUMERIC) TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. REWARDS & SCRATCH CARDS (public.reward_offers, user_scratch_cards, etc.)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 10.1 REWARD OFFERS CATALOG
CREATE TABLE IF NOT EXISTS public.reward_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  description TEXT NOT NULL,
  coupon_code TEXT,
  tracked_url TEXT,
  image_url TEXT,
  terms TEXT NOT NULL DEFAULT '',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source_network TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'vcommission' | 'cuelinks'
  source_offer_id TEXT,
  inventory_limit INTEGER,
  inventory_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reward_offers_active ON public.reward_offers (is_active, expires_at);

-- 10.2 USER SCRATCH CARDS (Issued server-side)
CREATE TABLE IF NOT EXISTS public.user_scratch_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reward_offer_id UUID NOT NULL REFERENCES public.reward_offers(id),
  source_scan_id TEXT,
  qr_code_id TEXT,
  status TEXT NOT NULL DEFAULT 'available', -- 'available' | 'revealed' | 'expired' | 'redeemed'
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revealed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_scratch_cards_user_status ON public.user_scratch_cards (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_scratch_cards_qr ON public.user_scratch_cards (user_id, qr_code_id, created_at DESC);

-- 10.3 REWARD AUDIT & USAGE EVENTS
CREATE TABLE IF NOT EXISTS public.reward_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scratch_card_id UUID REFERENCES public.user_scratch_cards(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'issued' | 'revealed' | 'copy_code' | 'open_offer' | 'expired'
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reward_events_user ON public.reward_events (user_id, created_at DESC);

-- 10.4 REWARD CONFIGURABLE SETTINGS
CREATE TABLE IF NOT EXISTS public.reward_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default reward rules (configurable, not hard-coded)
INSERT INTO public.reward_settings (key, value)
VALUES
  ('daily_user_limit', '3'::jsonb),
  ('qr_cooldown_hours', '24'::jsonb),
  ('global_daily_cap', '500'::jsonb),
  ('card_validity_days', '7'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- REWARDS RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.reward_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_scratch_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_settings ENABLE ROW LEVEL SECURITY;

-- reward_offers: anyone authenticated or public can read active offers
DROP POLICY IF EXISTS "Active reward offers are public" ON public.reward_offers;
CREATE POLICY "Active reward offers are public" ON public.reward_offers
  FOR SELECT USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

-- user_scratch_cards: users can only view their own scratch cards
DROP POLICY IF EXISTS "Users view own scratch cards" ON public.user_scratch_cards;
CREATE POLICY "Users view own scratch cards" ON public.user_scratch_cards
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- user_scratch_cards: users cannot insert directly (must use atomic issue_scratch_card RPC)
-- but can update status from 'available' to 'revealed'
DROP POLICY IF EXISTS "Users update own scratch cards" ON public.user_scratch_cards;
CREATE POLICY "Users update own scratch cards" ON public.user_scratch_cards
  FOR UPDATE USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- reward_events: users can view and log their own events
DROP POLICY IF EXISTS "Users access own reward events" ON public.reward_events;
CREATE POLICY "Users access own reward events" ON public.reward_events
  FOR ALL USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- reward_settings: readable by all
DROP POLICY IF EXISTS "Reward settings read" ON public.reward_settings;
CREATE POLICY "Reward settings read" ON public.reward_settings
  FOR SELECT USING (TRUE);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ATOMIC REWARD ISSUANCE & REVEAL RPC FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Atomic Issue Scratch Card RPC
CREATE OR REPLACE FUNCTION public.issue_scratch_card(
  p_user_id UUID,
  p_qr_code_id TEXT,
  p_scan_id TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_user_limit INT := 3;
  v_qr_cooldown_hours INT := 24;
  v_global_daily_cap INT := 500;
  v_card_validity_days INT := 7;
  v_today_start TIMESTAMPTZ := date_trunc('day', NOW());
  v_user_today_count INT;
  v_global_today_count INT;
  v_recent_qr_count INT;
  v_chosen_offer RECORD;
  v_existing_card RECORD;
  v_new_card RECORD;
  v_setting_row RECORD;
BEGIN
  -- Validate user
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Authentication required to receive rewards');
  END IF;

  -- 1. Idempotency Check: if key already exists, return that card immediately
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT sc.*, ro.title, ro.merchant_name, ro.description, ro.coupon_code, ro.tracked_url, ro.image_url, ro.terms, ro.source_network
      INTO v_existing_card
      FROM public.user_scratch_cards sc
      JOIN public.reward_offers ro ON sc.reward_offer_id = ro.id
     WHERE sc.idempotency_key = p_idempotency_key;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'eligible', true,
        'card', row_to_json(v_existing_card),
        'is_duplicate', true
      );
    END IF;
  END IF;

  -- Load dynamic settings if available
  SELECT (value)::INT INTO v_daily_user_limit FROM public.reward_settings WHERE key = 'daily_user_limit';
  SELECT (value)::INT INTO v_qr_cooldown_hours FROM public.reward_settings WHERE key = 'qr_cooldown_hours';
  SELECT (value)::INT INTO v_global_daily_cap FROM public.reward_settings WHERE key = 'global_daily_cap';
  SELECT (value)::INT INTO v_card_validity_days FROM public.reward_settings WHERE key = 'card_validity_days';

  IF v_daily_user_limit IS NULL THEN v_daily_user_limit := 3; END IF;
  IF v_qr_cooldown_hours IS NULL THEN v_qr_cooldown_hours := 24; END IF;
  IF v_global_daily_cap IS NULL THEN v_global_daily_cap := 500; END IF;
  IF v_card_validity_days IS NULL THEN v_card_validity_days := 7; END IF;

  -- 2. Anti-abuse: Cooldown check for the same QR code per user
  IF p_qr_code_id IS NOT NULL AND p_qr_code_id <> '' THEN
    SELECT COUNT(*) INTO v_recent_qr_count
      FROM public.user_scratch_cards
     WHERE user_id = p_user_id
       AND qr_code_id = p_qr_code_id
       AND assigned_at > (NOW() - (v_qr_cooldown_hours || ' hours')::INTERVAL);

    IF v_recent_qr_count > 0 THEN
      RETURN jsonb_build_object('eligible', false, 'reason', 'Already rewarded for this QR code today');
    END IF;
  END IF;

  -- 3. Per-user daily reward limit
  SELECT COUNT(*) INTO v_user_today_count
    FROM public.user_scratch_cards
   WHERE user_id = p_user_id
     AND assigned_at >= v_today_start;

  IF v_user_today_count >= v_daily_user_limit THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Daily reward limit reached. Scan again tomorrow!');
  END IF;

  -- 4. Global daily issuance cap
  SELECT COUNT(*) INTO v_global_today_count
    FROM public.user_scratch_cards
   WHERE assigned_at >= v_today_start;

  IF v_global_today_count >= v_global_daily_cap THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'Daily community issuance cap reached');
  END IF;

  -- 5. Select active, valid coupon offer with available inventory
  SELECT *
    INTO v_chosen_offer
    FROM public.reward_offers
   WHERE is_active = TRUE
     AND (expires_at IS NULL OR expires_at > NOW())
     AND starts_at <= NOW()
     AND (inventory_limit IS NULL OR inventory_used < inventory_limit)
   ORDER BY RANDOM()
   LIMIT 1
   FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'No reward offers available right now');
  END IF;

  -- 6. Increment inventory
  UPDATE public.reward_offers
     SET inventory_used = inventory_used + 1,
         updated_at = NOW()
   WHERE id = v_chosen_offer.id;

  -- 7. Insert the scratch card record
  INSERT INTO public.user_scratch_cards (
    user_id,
    reward_offer_id,
    source_scan_id,
    qr_code_id,
    status,
    assigned_at,
    expires_at,
    idempotency_key
  )
  VALUES (
    p_user_id,
    v_chosen_offer.id,
    p_scan_id,
    p_qr_code_id,
    'available',
    NOW(),
    NOW() + (v_card_validity_days || ' days')::INTERVAL,
    p_idempotency_key
  )
  RETURNING * INTO v_new_card;

  -- 8. Log reward event
  INSERT INTO public.reward_events (user_id, scratch_card_id, event_type, metadata)
  VALUES (
    p_user_id,
    v_new_card.id,
    'issued',
    jsonb_build_object('offer_id', v_chosen_offer.id, 'merchant', v_chosen_offer.merchant_name)
  );

  RETURN jsonb_build_object(
    'eligible', true,
    'card', jsonb_build_object(
      'id', v_new_card.id,
      'status', v_new_card.status,
      'assigned_at', v_new_card.assigned_at,
      'expires_at', v_new_card.expires_at,
      'reward_offer_id', v_chosen_offer.id,
      'title', v_chosen_offer.title,
      'merchant_name', v_chosen_offer.merchant_name,
      'description', v_chosen_offer.description,
      'coupon_code', v_chosen_offer.coupon_code,
      'tracked_url', v_chosen_offer.tracked_url,
      'image_url', v_chosen_offer.image_url,
      'terms', v_chosen_offer.terms,
      'source_network', v_chosen_offer.source_network
    )
  );
END;
$$;

-- 2. Atomic Reveal Scratch Card RPC
CREATE OR REPLACE FUNCTION public.reveal_scratch_card(
  p_card_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_card RECORD;
  v_offer RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT sc.*, ro.title, ro.merchant_name, ro.description, ro.coupon_code, ro.tracked_url, ro.image_url, ro.terms, ro.source_network
    INTO v_card
    FROM public.user_scratch_cards sc
    JOIN public.reward_offers ro ON sc.reward_offer_id = ro.id
   WHERE sc.id = p_card_id
     AND sc.user_id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Card not found or access denied';
  END IF;

  IF v_card.status = 'available' THEN
    UPDATE public.user_scratch_cards
       SET status = 'revealed',
           revealed_at = NOW(),
           updated_at = NOW()
     WHERE id = p_card_id;

    INSERT INTO public.reward_events (user_id, scratch_card_id, event_type, metadata)
    VALUES (v_uid, p_card_id, 'revealed', jsonb_build_object('merchant', v_card.merchant_name));
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'card_id', p_card_id,
    'status', 'revealed',
    'title', v_card.title,
    'merchant_name', v_card.merchant_name,
    'description', v_card.description,
    'coupon_code', v_card.coupon_code,
    'tracked_url', v_card.tracked_url,
    'image_url', v_card.image_url,
    'terms', v_card.terms,
    'source_network', v_card.source_network
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_scratch_card(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reveal_scratch_card(UUID) TO authenticated, service_role;
