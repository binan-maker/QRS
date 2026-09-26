-- BinRo fresh Supabase project setup
--
-- This file is for a brand-new BinRo Supabase project. It does not import
-- Firebase data and it does not contain seed users or sample QR records.
--
-- Run from the repository root after the schema has been created:
--   psql "$SUPABASE_DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -f packages/db/migrations/0000_graceful_cobalt_man.sql
--   psql "$SUPABASE_DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -f supabase/new-project.sql
--
-- The first command creates the application tables from the current schema.
-- The statements below add Supabase-specific security, auth synchronization,
-- realtime compatibility, and the atomic counter helper.

\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- The public profile view exposes only fields intended for community reads.
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

CREATE TABLE IF NOT EXISTS public.rtdb_store (
  path text PRIMARY KEY,
  value jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rtdb_store ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rtdb_store TO authenticated;
DROP POLICY IF EXISTS "rtdb_store: authenticated access" ON public.rtdb_store;
CREATE POLICY "rtdb_store: authenticated access"
  ON public.rtdb_store FOR ALL TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Keep this function restricted to known application counters. The allowlists
-- prevent an authenticated client from turning SECURITY DEFINER into SQL
-- execution against arbitrary tables or columns.
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

-- Create the application profile as part of Supabase Auth signup. This runs
-- before email confirmation, so a signup with email verification enabled still
-- gets a public.users row without needing an authenticated client session.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display_name_value text;
  username_base text;
  username_candidate text;
  suffix text;
  attempt integer := 0;
  existing_username text;
BEGIN
  display_name_value := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data ->> 'display_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data ->> 'name'), ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'User'
  );

  INSERT INTO public.users (
    id,
    email,
    email_verified,
    display_name,
    photo_url,
    is_deleted
  )
  VALUES (
    NEW.id::text,
    COALESCE(NEW.email, ''),
    NEW.email_confirmed_at IS NOT NULL,
    display_name_value,
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture'),
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    email_verified = EXCLUDED.email_verified,
    updated_at = now();

  SELECT username
    INTO existing_username
    FROM public.users
   WHERE id = NEW.id::text;
  IF existing_username IS NOT NULL THEN
    RETURN NEW;
  END IF;

  username_base := regexp_replace(lower(display_name_value), '[^a-z0-9]+', '', 'g');
  username_base := left(NULLIF(username_base, ''), 24);
  IF username_base IS NULL THEN
    username_base := 'user';
  END IF;

  LOOP
    IF attempt = 0 THEN
      username_candidate := username_base;
    ELSE
      suffix := substr(replace(NEW.id::text, '-', ''), 1, 8 + attempt);
      username_candidate :=
        left(username_base, greatest(1, 30 - length(suffix) - 1))
        || '_' || suffix;
    END IF;

    BEGIN
      INSERT INTO public.usernames (username, user_id, is_verified)
      VALUES (username_candidate, NEW.id::text, NEW.email_confirmed_at IS NOT NULL);

      UPDATE public.users
         SET username = username_candidate,
             updated_at = now()
       WHERE id = NEW.id::text;
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        attempt := attempt + 1;
        IF attempt > 10 THEN
          RAISE EXCEPTION 'Could not reserve a username for new user %', NEW.id;
        END IF;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- Enable RLS and apply the repository's least-privilege policies/grants.
\ir ../packages/db/migrations/rls_policies.sql
\ir ../packages/db/migrations/grants_fix.sql