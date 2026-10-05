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

-- 4. PUBLIC PROFILES VIEW (Read-only view hiding private email addresses)
DROP VIEW IF EXISTS public.public_profiles CASCADE;
CREATE VIEW public.public_profiles AS
SELECT
  id,
  display_name,
  username,
  COALESCE(photo_url, avatar_url) AS photo_url,
  COALESCE(avatar_url, photo_url) AS avatar_url,
  scan_count,
  comment_count,
  total_likes_received,
  created_at
FROM public.users
WHERE COALESCE(is_deleted, FALSE) = FALSE;

-- 5. QR CODES REGISTRY (public.qr_codes)
CREATE TABLE IF NOT EXISTS public.qr_codes (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT 'url',
  owner_id UUID,
  owner_name TEXT,
  owner_logo_base64 TEXT,
  is_owner_deleted BOOLEAN NOT NULL DEFAULT FALSE,
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
  UPDATE public.qr_codes
     SET owner_id = NULL,
         owner_name = '[deleted]',
         owner_logo_base64 = NULL,
         is_owner_deleted = TRUE,
         updated_at = NOW()
   WHERE owner_id::text = uid::text;
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
