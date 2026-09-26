-- ═══════════════════════════════════════════════════════════════════════════
-- SUPABASE MIGRATION: REMOVE DEPRECATED TABLES AND COLUMNS
-- ───────────────────────────────────────────────────────────────────────────
-- Tables removed:
--   - guard_link_changes
--   - qr_followers
--   - guard_links
--   - creator_follows
--   - business_accounts
--   - donations
--   - moderation_queue
--   - verification_requests
--
-- Columns removed:
--   - users.friends_count
--   - users.push_token
--   - users.firebase_uid
--   - users.following_count
--   - users.is_online
--   - users.last_seen
--   - qr_codes.firebase_id
--   - qr_comments.firebase_id
--   - qr_comments.is_verified_owner
--   - qr_comments.is_hidden
--   - qr_scans.guard_link_id (foreign key referencing guard_links)
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on

-- 1. Remove references to guard_links from qr_scans
ALTER TABLE IF EXISTS public.qr_scans DROP CONSTRAINT IF EXISTS qr_scans_guard_link_id_guard_links_id_fk;
ALTER TABLE IF EXISTS public.qr_scans DROP COLUMN IF EXISTS guard_link_id;

-- 2. Drop dependent view before modifying users columns
DROP VIEW IF EXISTS public.public_profiles;

-- 3. Drop all specified tables with CASCADE
DROP TABLE IF EXISTS public.guard_link_changes CASCADE;
DROP TABLE IF EXISTS public.qr_followers CASCADE;
DROP TABLE IF EXISTS public.guard_links CASCADE;
DROP TABLE IF EXISTS public.creator_follows CASCADE;
DROP TABLE IF EXISTS public.business_accounts CASCADE;
DROP TABLE IF EXISTS public.donations CASCADE;
DROP TABLE IF EXISTS public.moderation_queue CASCADE;
DROP TABLE IF EXISTS public.verification_requests CASCADE;

-- 4. Drop enums associated only with removed tables
DROP TYPE IF EXISTS public.donation_status CASCADE;
DROP TYPE IF EXISTS public.moderation_content_type CASCADE;
DROP TYPE IF EXISTS public.moderation_status CASCADE;
DROP TYPE IF EXISTS public.verification_method CASCADE;
DROP TYPE IF EXISTS public.verification_status CASCADE;

-- 5. Drop columns and constraints from public.users
ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_firebase_uid_unique;
DROP INDEX IF EXISTS public.users_firebase_uid_idx;
ALTER TABLE IF EXISTS public.users DROP COLUMN IF EXISTS friends_count;
ALTER TABLE IF EXISTS public.users DROP COLUMN IF EXISTS push_token;
ALTER TABLE IF EXISTS public.users DROP COLUMN IF EXISTS firebase_uid;
ALTER TABLE IF EXISTS public.users DROP COLUMN IF EXISTS following_count;
ALTER TABLE IF EXISTS public.users DROP COLUMN IF EXISTS is_online;
ALTER TABLE IF EXISTS public.users DROP COLUMN IF EXISTS last_seen;

-- 6. Drop columns and constraints from public.qr_codes
ALTER TABLE IF EXISTS public.qr_codes DROP CONSTRAINT IF EXISTS qr_codes_firebase_id_unique;
DROP INDEX IF EXISTS public.qr_codes_firebase_id_idx;
ALTER TABLE IF EXISTS public.qr_codes DROP COLUMN IF EXISTS firebase_id;
ALTER TABLE IF EXISTS public.qr_codes DROP COLUMN IF EXISTS is_verified_owner;
ALTER TABLE IF EXISTS public.qr_codes DROP COLUMN IF EXISTS owner_verified;
ALTER TABLE IF EXISTS public.qr_codes DROP COLUMN IF EXISTS is_hidden;

-- 7. Drop columns and constraints from public.qr_comments
ALTER TABLE IF EXISTS public.qr_comments DROP CONSTRAINT IF EXISTS qr_comments_firebase_id_unique;
ALTER TABLE IF EXISTS public.qr_comments DROP COLUMN IF EXISTS firebase_id;
ALTER TABLE IF EXISTS public.qr_comments DROP COLUMN IF EXISTS is_verified_owner;
ALTER TABLE IF EXISTS public.qr_comments DROP COLUMN IF EXISTS is_hidden;

-- 8. Recreate public_profiles view without removed columns
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  display_name,
  username,
  photo_url,
  scan_count,
  comment_count,
  total_likes_received,
  is_deleted,
  created_at
FROM public.users;

GRANT SELECT ON public.public_profiles TO authenticated;

-- 9. Update increment_field function to restrict to retained tables and fields
CREATE OR REPLACE FUNCTION public.increment_field(
  p_table text,
  p_id text,
  p_field text,
  p_delta numeric DEFAULT 1
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_table NOT IN (
    'users', 'qr_codes', 'unified_qrs', 'standard_links',
    'qr_comments', 'qr_reports'
  ) THEN
    RAISE EXCEPTION 'Unsupported counter table';
  END IF;
  IF p_field NOT IN (
    'scan_count', 'comment_count', 'owner_scan_count', 'total_likes_received',
    'downloads', 'shares', 'likes', 'report_count'
  ) THEN
    RAISE EXCEPTION 'Unsupported counter field';
  END IF;

  EXECUTE format(
    'UPDATE public.%I SET %I = COALESCE(%I, 0) + $1 WHERE id = $2',
    p_table, p_field, p_field
  ) USING p_delta, p_id;
END;
$$;
REVOKE ALL ON FUNCTION public.increment_field(text, text, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_field(text, text, text, numeric) TO authenticated;
