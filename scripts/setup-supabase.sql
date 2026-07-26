-- ═══════════════════════════════════════════════════════════════════════════
-- BinRo — Supabase Setup SQL
-- Paste this entire file into the Supabase SQL Editor and click Run.
--
-- Safe to re-run: every statement uses IF NOT EXISTS / OR REPLACE / DO blocks
-- so running it twice won't break anything.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 0. Schema migration (skipped if tables already exist) ───────────────────
-- If your tables are already created, this section is a no-op.
-- If starting fresh, uncomment and run packages/db/migrations/0000_graceful_cobalt_man.sql first.


-- ─── 1. rtdb_store helper table ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rtdb_store (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. increment_field helper function ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_field(
  table_name text,
  row_id     text,
  field_name text,
  amount     integer DEFAULT 1
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  EXECUTE format(
    'UPDATE public.%I SET %I = COALESCE(%I, 0) + $1 WHERE id = $2',
    table_name, field_name, field_name
  ) USING amount, row_id;
END;
$$;

-- ─── 3. public_profiles view ─────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  display_name,
  username,
  photo_url,
  scan_count,
  comment_count,
  following_count,
  total_likes_received,
  is_online,
  last_seen,
  is_deleted,
  created_at
FROM public.users;

GRANT SELECT ON public.public_profiles TO authenticated;

-- ─── 4. Enable RLS on all tables ─────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.usernames            ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.qr_codes             ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.unified_qrs          ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.standard_links       ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.guard_links          ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.guard_link_changes   ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.qr_scans             ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.qr_comments          ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.comment_likes        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.comment_reports      ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.qr_reports           ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.qr_followers         ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.creator_follows      ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.user_favorites       ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.user_generated_qrs   ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.business_accounts    ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.categories           ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.donations            ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.feature_votes        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.moderation_queue     ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.audit_logs           ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ─── 5. RLS Policies (each wrapped to skip if already exists) ─────────────────

-- users
DO $$ BEGIN CREATE POLICY "users: read own row" ON public.users FOR SELECT TO authenticated USING (auth.uid()::text = id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "users: insert own row" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "users: update own row" ON public.users FOR UPDATE TO authenticated USING (auth.uid()::text = id) WITH CHECK (auth.uid()::text = id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "users: delete own row" ON public.users FOR DELETE TO authenticated USING (auth.uid()::text = id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- usernames
DO $$ BEGIN CREATE POLICY "usernames: authenticated can read all" ON public.usernames FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "usernames: insert own" ON public.usernames FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "usernames: update own" ON public.usernames FOR UPDATE TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "usernames: delete own" ON public.usernames FOR DELETE TO authenticated USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- qr_codes
DO $$ BEGIN CREATE POLICY "qr_codes: authenticated can read all" ON public.qr_codes FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "qr_codes: insert own" ON public.qr_codes FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = owner_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "qr_codes: update own" ON public.qr_codes FOR UPDATE TO authenticated USING (auth.uid()::text = owner_id) WITH CHECK (auth.uid()::text = owner_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "qr_codes: delete own" ON public.qr_codes FOR DELETE TO authenticated USING (auth.uid()::text = owner_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- unified_qrs
DO $$ BEGIN CREATE POLICY "unified_qrs: authenticated can read all" ON public.unified_qrs FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "unified_qrs: insert own" ON public.unified_qrs FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = owner_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "unified_qrs: update own" ON public.unified_qrs FOR UPDATE TO authenticated USING (auth.uid()::text = owner_id) WITH CHECK (auth.uid()::text = owner_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "unified_qrs: delete own" ON public.unified_qrs FOR DELETE TO authenticated USING (auth.uid()::text = owner_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- standard_links
DO $$ BEGIN CREATE POLICY "standard_links: authenticated can read all" ON public.standard_links FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "standard_links: insert own" ON public.standard_links FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = owner_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "standard_links: update own" ON public.standard_links FOR UPDATE TO authenticated USING (auth.uid()::text = owner_id) WITH CHECK (auth.uid()::text = owner_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "standard_links: delete own" ON public.standard_links FOR DELETE TO authenticated USING (auth.uid()::text = owner_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- guard_links
DO $$ BEGIN CREATE POLICY "guard_links: authenticated can read all" ON public.guard_links FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "guard_links: insert own" ON public.guard_links FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = owner_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "guard_links: update own" ON public.guard_links FOR UPDATE TO authenticated USING (auth.uid()::text = owner_id) WITH CHECK (auth.uid()::text = owner_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "guard_links: delete own" ON public.guard_links FOR DELETE TO authenticated USING (auth.uid()::text = owner_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "guard_link_changes: authenticated can read all" ON public.guard_link_changes FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "guard_link_changes: insert" ON public.guard_link_changes FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = changed_by); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- qr_scans
DO $$ BEGIN CREATE POLICY "qr_scans: users can read own scans" ON public.qr_scans FOR SELECT TO authenticated USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "qr_scans: insert own" ON public.qr_scans FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "qr_scans: update own" ON public.qr_scans FOR UPDATE TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "qr_scans: delete own" ON public.qr_scans FOR DELETE TO authenticated USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- qr_comments
DO $$ BEGIN CREATE POLICY "qr_comments: authenticated can read all" ON public.qr_comments FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "qr_comments: insert own" ON public.qr_comments FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "qr_comments: update own" ON public.qr_comments FOR UPDATE TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "qr_comments: delete own" ON public.qr_comments FOR DELETE TO authenticated USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- comment_likes
DO $$ BEGIN CREATE POLICY "comment_likes: authenticated can read all" ON public.comment_likes FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "comment_likes: insert own" ON public.comment_likes FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "comment_likes: delete own" ON public.comment_likes FOR DELETE TO authenticated USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- comment_reports
DO $$ BEGIN CREATE POLICY "comment_reports: read own" ON public.comment_reports FOR SELECT TO authenticated USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "comment_reports: insert own" ON public.comment_reports FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- qr_reports
DO $$ BEGIN CREATE POLICY "qr_reports: read own" ON public.qr_reports FOR SELECT TO authenticated USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "qr_reports: insert own" ON public.qr_reports FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- qr_followers
DO $$ BEGIN CREATE POLICY "qr_followers: authenticated can read all" ON public.qr_followers FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "qr_followers: insert own" ON public.qr_followers FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "qr_followers: delete own" ON public.qr_followers FOR DELETE TO authenticated USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- creator_follows
DO $$ BEGIN CREATE POLICY "creator_follows: authenticated can read all" ON public.creator_follows FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "creator_follows: insert own" ON public.creator_follows FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "creator_follows: delete own" ON public.creator_follows FOR DELETE TO authenticated USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_favorites
DO $$ BEGIN CREATE POLICY "user_favorites: read own" ON public.user_favorites FOR SELECT TO authenticated USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "user_favorites: insert own" ON public.user_favorites FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "user_favorites: delete own" ON public.user_favorites FOR DELETE TO authenticated USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_generated_qrs
DO $$ BEGIN CREATE POLICY "user_generated_qrs: read own" ON public.user_generated_qrs FOR SELECT TO authenticated USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "user_generated_qrs: insert own" ON public.user_generated_qrs FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "user_generated_qrs: update own" ON public.user_generated_qrs FOR UPDATE TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "user_generated_qrs: delete own" ON public.user_generated_qrs FOR DELETE TO authenticated USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- notifications
DO $$ BEGIN CREATE POLICY "notifications: read own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "notifications: update own" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "notifications: delete own" ON public.notifications FOR DELETE TO authenticated USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- business_accounts
DO $$ BEGIN CREATE POLICY "business_accounts: read own" ON public.business_accounts FOR SELECT TO authenticated USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "business_accounts: insert own" ON public.business_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "business_accounts: update own" ON public.business_accounts FOR UPDATE TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "business_accounts: delete own" ON public.business_accounts FOR DELETE TO authenticated USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- categories (public read)
DO $$ BEGIN CREATE POLICY "categories: anon can read all" ON public.categories FOR SELECT TO anon USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "categories: authenticated can read all" ON public.categories FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- donations
DO $$ BEGIN CREATE POLICY "donations: read own" ON public.donations FOR SELECT TO authenticated USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "donations: insert own" ON public.donations FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- feature_votes
DO $$ BEGIN CREATE POLICY "feature_votes: authenticated can read all" ON public.feature_votes FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "feature_votes: insert own" ON public.feature_votes FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "feature_votes: delete own" ON public.feature_votes FOR DELETE TO authenticated USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- moderation_queue (submit only; reads are service-role via backend)
DO $$ BEGIN CREATE POLICY "moderation_queue: insert as reporter" ON public.moderation_queue FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = reporter_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- verification_requests
DO $$ BEGIN CREATE POLICY "verification_requests: read own" ON public.verification_requests FOR SELECT TO authenticated USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "verification_requests: insert own" ON public.verification_requests FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- audit_logs
DO $$ BEGIN CREATE POLICY "audit_logs: read own" ON public.audit_logs FOR SELECT TO authenticated USING (auth.uid()::text = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
