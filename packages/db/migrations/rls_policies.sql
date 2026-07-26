-- ═══════════════════════════════════════════════════════════════════════════
-- RLS POLICIES — run once in the Supabase SQL Editor after the schema
--               migration (0000_graceful_cobalt_man.sql) has been applied.
--
-- Design:
--   • `users` table: authenticated users can SELECT their own row only.
--     Community profile reads (comments, follower lists, etc.) go through
--     the `public_profiles` view which exposes only non-sensitive columns.
--   • All other tables follow least-privilege: own-row or authenticated-read
--     depending on whether the data is inherently social.
--
-- NOTE: `auth.uid()` returns the Supabase Auth UUID; `users.id` stores the
--        same value (set at sign-up time).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Enable RLS on every table ───────────────────────────────────────────────

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

-- ─── public_profiles view ────────────────────────────────────────────────────
-- Safe subset of `users` for community-facing reads (comment authors,
-- follower lists, creator profiles). Excludes: email, email_verified,
-- firebase_uid, push_token, consent, and internal timestamps.

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
  friends_count,
  is_online,
  last_seen,
  is_deleted,
  created_at
FROM public.users;

-- Grant authenticated users SELECT on the view (views bypass RLS of the
-- underlying table; the view itself is the access-control boundary here).
GRANT SELECT ON public.public_profiles TO authenticated;

-- ─── users ───────────────────────────────────────────────────────────────────
-- Sensitive columns (email, push_token, consent) must not be readable by
-- other authenticated users. All community lookups use public_profiles instead.

CREATE POLICY "users: read own row"
  ON public.users FOR SELECT TO authenticated
  USING (auth.uid()::text = id);

CREATE POLICY "users: insert own row"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = id);

CREATE POLICY "users: update own row"
  ON public.users FOR UPDATE TO authenticated
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

CREATE POLICY "users: delete own row"
  ON public.users FOR DELETE TO authenticated
  USING (auth.uid()::text = id);

-- ─── usernames ────────────────────────────────────────────────────────────────

CREATE POLICY "usernames: authenticated can read all"
  ON public.usernames FOR SELECT TO authenticated USING (true);

CREATE POLICY "usernames: insert own"
  ON public.usernames FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "usernames: update own"
  ON public.usernames FOR UPDATE TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "usernames: delete own"
  ON public.usernames FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ─── qr_codes ────────────────────────────────────────────────────────────────

CREATE POLICY "qr_codes: authenticated can read all"
  ON public.qr_codes FOR SELECT TO authenticated USING (true);

CREATE POLICY "qr_codes: insert own"
  ON public.qr_codes FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "qr_codes: update own"
  ON public.qr_codes FOR UPDATE TO authenticated
  USING (auth.uid()::text = owner_id)
  WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "qr_codes: delete own"
  ON public.qr_codes FOR DELETE TO authenticated
  USING (auth.uid()::text = owner_id);

-- ─── unified_qrs ─────────────────────────────────────────────────────────────

CREATE POLICY "unified_qrs: authenticated can read all"
  ON public.unified_qrs FOR SELECT TO authenticated USING (true);

CREATE POLICY "unified_qrs: insert own"
  ON public.unified_qrs FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "unified_qrs: update own"
  ON public.unified_qrs FOR UPDATE TO authenticated
  USING (auth.uid()::text = owner_id)
  WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "unified_qrs: delete own"
  ON public.unified_qrs FOR DELETE TO authenticated
  USING (auth.uid()::text = owner_id);

-- ─── standard_links ──────────────────────────────────────────────────────────

CREATE POLICY "standard_links: authenticated can read all"
  ON public.standard_links FOR SELECT TO authenticated USING (true);

CREATE POLICY "standard_links: insert own"
  ON public.standard_links FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "standard_links: update own"
  ON public.standard_links FOR UPDATE TO authenticated
  USING (auth.uid()::text = owner_id)
  WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "standard_links: delete own"
  ON public.standard_links FOR DELETE TO authenticated
  USING (auth.uid()::text = owner_id);

-- ─── guard_links / guard_link_changes ────────────────────────────────────────

CREATE POLICY "guard_links: authenticated can read all"
  ON public.guard_links FOR SELECT TO authenticated USING (true);

CREATE POLICY "guard_links: insert own"
  ON public.guard_links FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "guard_links: update own"
  ON public.guard_links FOR UPDATE TO authenticated
  USING (auth.uid()::text = owner_id)
  WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "guard_links: delete own"
  ON public.guard_links FOR DELETE TO authenticated
  USING (auth.uid()::text = owner_id);

CREATE POLICY "guard_link_changes: authenticated can read all"
  ON public.guard_link_changes FOR SELECT TO authenticated USING (true);

CREATE POLICY "guard_link_changes: insert"
  ON public.guard_link_changes FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = changed_by);

-- ─── qr_scans ────────────────────────────────────────────────────────────────

CREATE POLICY "qr_scans: users can read own scans"
  ON public.qr_scans FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "qr_scans: insert own"
  ON public.qr_scans FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "qr_scans: update own"
  ON public.qr_scans FOR UPDATE TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "qr_scans: delete own"
  ON public.qr_scans FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ─── qr_comments ─────────────────────────────────────────────────────────────

CREATE POLICY "qr_comments: authenticated can read all"
  ON public.qr_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "qr_comments: insert own"
  ON public.qr_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "qr_comments: update own"
  ON public.qr_comments FOR UPDATE TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "qr_comments: delete own"
  ON public.qr_comments FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ─── comment_likes ────────────────────────────────────────────────────────────

CREATE POLICY "comment_likes: authenticated can read all"
  ON public.comment_likes FOR SELECT TO authenticated USING (true);

CREATE POLICY "comment_likes: insert own"
  ON public.comment_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "comment_likes: delete own"
  ON public.comment_likes FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ─── comment_reports ─────────────────────────────────────────────────────────

CREATE POLICY "comment_reports: read own"
  ON public.comment_reports FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "comment_reports: insert own"
  ON public.comment_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

-- ─── qr_reports ──────────────────────────────────────────────────────────────

CREATE POLICY "qr_reports: read own"
  ON public.qr_reports FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "qr_reports: insert own"
  ON public.qr_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

-- ─── qr_followers ─────────────────────────────────────────────────────────────

CREATE POLICY "qr_followers: authenticated can read all"
  ON public.qr_followers FOR SELECT TO authenticated USING (true);

CREATE POLICY "qr_followers: insert own"
  ON public.qr_followers FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "qr_followers: delete own"
  ON public.qr_followers FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ─── creator_follows ─────────────────────────────────────────────────────────

CREATE POLICY "creator_follows: authenticated can read all"
  ON public.creator_follows FOR SELECT TO authenticated USING (true);

CREATE POLICY "creator_follows: insert own"
  ON public.creator_follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "creator_follows: delete own"
  ON public.creator_follows FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ─── user_favorites ───────────────────────────────────────────────────────────

CREATE POLICY "user_favorites: read own"
  ON public.user_favorites FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "user_favorites: insert own"
  ON public.user_favorites FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "user_favorites: delete own"
  ON public.user_favorites FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ─── user_generated_qrs ──────────────────────────────────────────────────────

CREATE POLICY "user_generated_qrs: read own"
  ON public.user_generated_qrs FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "user_generated_qrs: insert own"
  ON public.user_generated_qrs FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "user_generated_qrs: update own"
  ON public.user_generated_qrs FOR UPDATE TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "user_generated_qrs: delete own"
  ON public.user_generated_qrs FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ─── notifications ────────────────────────────────────────────────────────────

CREATE POLICY "notifications: read own"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "notifications: update own"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "notifications: delete own"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ─── business_accounts ───────────────────────────────────────────────────────

CREATE POLICY "business_accounts: read own"
  ON public.business_accounts FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "business_accounts: insert own"
  ON public.business_accounts FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "business_accounts: update own"
  ON public.business_accounts FOR UPDATE TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "business_accounts: delete own"
  ON public.business_accounts FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ─── categories ──────────────────────────────────────────────────────────────
-- Public read-only lookup table — allow both anon and authenticated.

CREATE POLICY "categories: anon can read all"
  ON public.categories FOR SELECT TO anon USING (true);

CREATE POLICY "categories: authenticated can read all"
  ON public.categories FOR SELECT TO authenticated USING (true);

-- ─── donations ───────────────────────────────────────────────────────────────

CREATE POLICY "donations: read own"
  ON public.donations FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "donations: insert own"
  ON public.donations FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

-- ─── feature_votes ───────────────────────────────────────────────────────────

CREATE POLICY "feature_votes: authenticated can read all"
  ON public.feature_votes FOR SELECT TO authenticated USING (true);

CREATE POLICY "feature_votes: insert own"
  ON public.feature_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "feature_votes: delete own"
  ON public.feature_votes FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ─── moderation_queue ────────────────────────────────────────────────────────
-- Reporters can submit; reads/updates are service-role-only (admin/backend).

CREATE POLICY "moderation_queue: insert as reporter"
  ON public.moderation_queue FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = reporter_id);

-- ─── verification_requests ───────────────────────────────────────────────────

CREATE POLICY "verification_requests: read own"
  ON public.verification_requests FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "verification_requests: insert own"
  ON public.verification_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

-- ─── audit_logs ──────────────────────────────────────────────────────────────
-- Written by the server (service role); users can read their own entries.

CREATE POLICY "audit_logs: read own"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);
