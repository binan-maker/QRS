-- ============================================================================
-- BinRo Clean Universal Schema for Supabase
-- Single universal QR table: qr_codes
-- No custom enums (standard text)
-- No friends or follow relationships
-- No owner_id, owner_name, is_active, deactivation_message, expiry_date
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email text UNIQUE NOT NULL,
  email_verified boolean DEFAULT false,
  display_name text NOT NULL,
  photo_url text,
  username text UNIQUE,
  username_last_changed_at timestamptz,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  scan_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  total_likes_received integer NOT NULL DEFAULT 0,
  consent jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Usernames (Unique handles)
CREATE TABLE IF NOT EXISTS public.usernames (
  username text PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  is_verified boolean DEFAULT false
);

-- 3. QR Codes (Universal QR table without owner, active flag, deactivation message, or expiry)
CREATE TABLE IF NOT EXISTS public.qr_codes (
  id text PRIMARY KEY,
  content text NOT NULL,
  content_type text NOT NULL DEFAULT 'text',
  qr_type text NOT NULL DEFAULT 'qr',
  display_destination text,
  scan_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  scan_limit integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. QR Scans (Scan History)
CREATE TABLE IF NOT EXISTS public.qr_scans (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  qr_code_id text REFERENCES public.qr_codes(id) ON DELETE SET NULL,
  user_id text REFERENCES public.users(id) ON DELETE SET NULL,
  is_anonymous boolean NOT NULL DEFAULT false,
  scan_source text NOT NULL DEFAULT 'camera',
  platform text NOT NULL DEFAULT 'unknown',
  verdict text NOT NULL DEFAULT 'unknown',
  content text,
  content_type text,
  scanned_at timestamptz NOT NULL DEFAULT now()
);

-- 5. QR Comments & Community Notes
CREATE TABLE IF NOT EXISTS public.qr_comments (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  qr_code_id text NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  parent_id text REFERENCES public.qr_comments(id) ON DELETE CASCADE,
  text text NOT NULL,
  likes integer NOT NULL DEFAULT 0,
  report_count integer NOT NULL DEFAULT 0,
  is_deleted boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  is_edited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Comment Likes
CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id text NOT NULL REFERENCES public.qr_comments(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

-- 7. Comment Reports
CREATE TABLE IF NOT EXISTS public.comment_reports (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  comment_id text NOT NULL REFERENCES public.qr_comments(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comment_reports_comment_user_uniq UNIQUE (comment_id, user_id)
);

-- 8. QR Trust Reports
CREATE TABLE IF NOT EXISTS public.qr_reports (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  qr_code_id text NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  weight real NOT NULL DEFAULT 0.1,
  account_age_days integer NOT NULL DEFAULT 0,
  email_verified boolean NOT NULL DEFAULT false,
  user_removed boolean NOT NULL DEFAULT false,
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qr_reports_qr_code_user_uniq UNIQUE (qr_code_id, user_id)
);

-- 9. User Favorites
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  qr_id text NOT NULL,
  qr_code_id text REFERENCES public.qr_codes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_favorites_user_qr_uniq UNIQUE (user_id, qr_id)
);

-- 10. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  message text NOT NULL,
  qr_code_id text REFERENCES public.qr_codes(id) ON DELETE CASCADE,
  from_user_id text REFERENCES public.users(id) ON DELETE SET NULL,
  from_username text,
  is_read boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 11. Feedback
CREATE TABLE IF NOT EXISTS public.feedback (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text REFERENCES public.users(id) ON DELETE SET NULL,
  email text,
  message text,
  error_message text,
  error_stack text,
  user_message text,
  device_info text,
  app_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 12. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  qr_id text,
  user_id text REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  vote_weight real,
  account_tier integer,
  account_age_days integer,
  email_verified boolean,
  collusion_flags jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
CREATE INDEX IF NOT EXISTS qr_scans_user_id_idx ON public.qr_scans(user_id);
CREATE INDEX IF NOT EXISTS qr_scans_qr_code_id_idx ON public.qr_scans(qr_code_id);
CREATE INDEX IF NOT EXISTS qr_comments_qr_code_id_idx ON public.qr_comments(qr_code_id);
CREATE INDEX IF NOT EXISTS qr_reports_qr_code_id_idx ON public.qr_reports(qr_code_id);
