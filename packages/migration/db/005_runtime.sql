-- BinRo — 005_runtime.sql
-- Runtime objects used by the Supabase adapters.
-- Run after 001_schema.sql, 002_rls.sql, 003_triggers.sql, and 004_storage.sql.
-- IDEMPOTENT: safe to run more than once.

CREATE TABLE IF NOT EXISTS public.rtdb_store (
  path       TEXT PRIMARY KEY,
  value      JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rtdb_store ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rtdb_store: authenticated read" ON public.rtdb_store;
DROP POLICY IF EXISTS "rtdb_store: authenticated write" ON public.rtdb_store;
DROP POLICY IF EXISTS "rtdb_store: authenticated update" ON public.rtdb_store;
DROP POLICY IF EXISTS "rtdb_store: authenticated delete" ON public.rtdb_store;

CREATE POLICY "rtdb_store: authenticated read"
  ON public.rtdb_store FOR SELECT TO authenticated
  USING (path LIKE 'notifications/' || auth.uid()::text || '/%');

CREATE POLICY "rtdb_store: authenticated write"
  ON public.rtdb_store FOR INSERT TO authenticated
  WITH CHECK (path LIKE 'notifications/' || auth.uid()::text || '/%');

CREATE POLICY "rtdb_store: authenticated update"
  ON public.rtdb_store FOR UPDATE TO authenticated
  USING (path LIKE 'notifications/' || auth.uid()::text || '/%')
  WITH CHECK (path LIKE 'notifications/' || auth.uid()::text || '/%');

CREATE POLICY "rtdb_store: authenticated delete"
  ON public.rtdb_store FOR DELETE TO authenticated
  USING (path LIKE 'notifications/' || auth.uid()::text || '/%');

-- Service-role-only atomic counter helper. Client adapters fall back to
-- owner-scoped RLS updates when this function is unavailable to the client.
CREATE OR REPLACE FUNCTION public.increment_field(
  p_table TEXT,
  p_id TEXT,
  p_field TEXT,
  p_delta NUMERIC DEFAULT 1
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_table NOT IN ('qr_codes', 'unified_qrs', 'guard_links', 'standard_links', 'users', 'qr_comments')
     OR p_field NOT IN (
       'scan_count', 'comment_count', 'owner_scan_count', 'likes',
       'total_likes_received', 'friends_count', 'following_count',
       'follower_count', 'personal_scan_count', 'safe_reports_given'
     ) THEN
    RAISE EXCEPTION 'increment_field target is not allowed';
  END IF;

  EXECUTE format(
    'UPDATE %I SET %I = COALESCE(%I, 0) + $1 WHERE id = $2',
    p_table, p_field, p_field
  ) USING p_delta, p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_field(TEXT, TEXT, TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_field(TEXT, TEXT, TEXT, NUMERIC) TO service_role;