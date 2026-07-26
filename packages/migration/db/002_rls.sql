-- ═══════════════════════════════════════════════════════════════════════════════
-- BinRo — 002_rls.sql
-- Row Level Security policies for every table.
-- IDEMPOTENT: policies are dropped and recreated, so re-running is safe.
--
-- Run AFTER 001_schema.sql.
--
-- Design principles:
--   • auth.uid()::text == users.id  (Supabase Auth UUID == PK)
--   • Sensitive personal data (email, push_token, consent) only readable by the
--     owner. All community reads go through the public_profiles VIEW.
--   • QR codes, comments, and scan history are readable by any authenticated
--     user (public social platform) but only writable by the owner.
--   • Scan records are private: only the scanner can read their own history.
--   • Moderation queue is insert-only for authenticated users; reads/updates
--     are service-role-only (never exposed via the JS client directly).
--   • Audit logs are insert-only via service role; users can read their own.
--   • anon role can read public QR codes and categories (for scan landing pages).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Enable RLS on every table ───────────────────────────────────────────────

ALTER TABLE public.users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usernames             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_qrs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guard_links           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guard_link_changes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standard_links        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_scans              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_comments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_reports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_followers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_generated_qrs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_friends          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_follows       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_votes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_queue      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs            ENABLE ROW LEVEL SECURITY;

-- ─── Helper: drop-if-exists wrappers ─────────────────────────────────────────
-- Policies must be dropped before being recreated (no CREATE OR REPLACE).

DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- users
-- ─────────────────────────────────────────────────────────────────────────────
-- Only the owner can read their own full row (which contains email, push_token,
-- consent). Community profiles are served via the public_profiles VIEW.

CREATE POLICY "users: owner can select"
  ON public.users FOR SELECT TO authenticated
  USING (auth.uid()::text = id);

CREATE POLICY "users: owner can insert"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = id);

CREATE POLICY "users: owner can update"
  ON public.users FOR UPDATE TO authenticated
  USING  (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

CREATE POLICY "users: owner can delete"
  ON public.users FOR DELETE TO authenticated
  USING (auth.uid()::text = id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- usernames
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "usernames: authenticated can read all"
  ON public.usernames FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "usernames: anon can read all"
  ON public.usernames FOR SELECT TO anon
  USING (true);

CREATE POLICY "usernames: owner can insert"
  ON public.usernames FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "usernames: owner can update"
  ON public.usernames FOR UPDATE TO authenticated
  USING  (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "usernames: owner can delete"
  ON public.usernames FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- qr_codes (legacy)
-- ─────────────────────────────────────────────────────────────────────────────
-- Public QRs are readable by anon (scan landing pages don't require login).
-- Private-mode QRs are readable only by their owner.

CREATE POLICY "qr_codes: anon can read public"
  ON public.qr_codes FOR SELECT TO anon
  USING (private_mode = false AND is_active = true);

CREATE POLICY "qr_codes: authenticated can read public"
  ON public.qr_codes FOR SELECT TO authenticated
  USING (private_mode = false OR auth.uid()::text = owner_id);

CREATE POLICY "qr_codes: owner can insert"
  ON public.qr_codes FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "qr_codes: owner can update"
  ON public.qr_codes FOR UPDATE TO authenticated
  USING  (auth.uid()::text = owner_id)
  WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "qr_codes: owner can delete"
  ON public.qr_codes FOR DELETE TO authenticated
  USING (auth.uid()::text = owner_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- unified_qrs
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "unified_qrs: anon can read active"
  ON public.unified_qrs FOR SELECT TO anon
  USING (status = 'active');

CREATE POLICY "unified_qrs: authenticated can read all"
  ON public.unified_qrs FOR SELECT TO authenticated
  USING (status = 'active' OR auth.uid()::text = owner_id);

CREATE POLICY "unified_qrs: owner can insert"
  ON public.unified_qrs FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "unified_qrs: owner can update"
  ON public.unified_qrs FOR UPDATE TO authenticated
  USING  (auth.uid()::text = owner_id)
  WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "unified_qrs: owner can delete"
  ON public.unified_qrs FOR DELETE TO authenticated
  USING (auth.uid()::text = owner_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- guard_links
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "guard_links: anon can read active"
  ON public.guard_links FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "guard_links: authenticated can read all"
  ON public.guard_links FOR SELECT TO authenticated
  USING (is_active = true OR auth.uid()::text = owner_id);

CREATE POLICY "guard_links: owner can insert"
  ON public.guard_links FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "guard_links: owner can update"
  ON public.guard_links FOR UPDATE TO authenticated
  USING  (auth.uid()::text = owner_id)
  WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "guard_links: owner can delete"
  ON public.guard_links FOR DELETE TO authenticated
  USING (auth.uid()::text = owner_id);

-- ─── guard_link_changes ───────────────────────────────────────────────────────

CREATE POLICY "guard_link_changes: authenticated can read all"
  ON public.guard_link_changes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "guard_link_changes: owner can insert"
  ON public.guard_link_changes FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = changed_by);

-- ═══════════════════════════════════════════════════════════════════════════════
-- standard_links
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "standard_links: anon can read active"
  ON public.standard_links FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "standard_links: authenticated can read all"
  ON public.standard_links FOR SELECT TO authenticated
  USING (is_active = true OR auth.uid()::text = owner_id);

CREATE POLICY "standard_links: owner can insert"
  ON public.standard_links FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "standard_links: owner can update"
  ON public.standard_links FOR UPDATE TO authenticated
  USING  (auth.uid()::text = owner_id)
  WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "standard_links: owner can delete"
  ON public.standard_links FOR DELETE TO authenticated
  USING (auth.uid()::text = owner_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- qr_scans
-- ─────────────────────────────────────────────────────────────────────────────
-- Scan history is private. Owners of QR codes see aggregate counts (from the
-- scan_count counter on qr_codes / unified_qrs), not individual scan rows.
-- The API server reads all scans via service role for analytics.

CREATE POLICY "qr_scans: owner can read own scans"
  ON public.qr_scans FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "qr_scans: authenticated can insert"
  ON public.qr_scans FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id OR is_anonymous = true);

CREATE POLICY "qr_scans: anon can insert anonymous scans"
  ON public.qr_scans FOR INSERT TO anon
  WITH CHECK (is_anonymous = true AND user_id IS NULL);

CREATE POLICY "qr_scans: owner can delete own scans"
  ON public.qr_scans FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- qr_comments
-- ─────────────────────────────────────────────────────────────────────────────
-- Visible comments (not hidden/deleted) are public — anyone can read them.
-- Hidden/deleted comments are only readable by moderators (service role).

CREATE POLICY "qr_comments: anon can read visible"
  ON public.qr_comments FOR SELECT TO anon
  USING (is_hidden = false AND is_deleted = false);

CREATE POLICY "qr_comments: authenticated can read visible or own"
  ON public.qr_comments FOR SELECT TO authenticated
  USING (
    (is_hidden = false AND is_deleted = false)
    OR auth.uid()::text = user_id
  );

CREATE POLICY "qr_comments: authenticated can insert"
  ON public.qr_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "qr_comments: owner can update"
  ON public.qr_comments FOR UPDATE TO authenticated
  USING  (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "qr_comments: owner can delete"
  ON public.qr_comments FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- comment_likes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "comment_likes: authenticated can read all"
  ON public.comment_likes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "comment_likes: owner can insert"
  ON public.comment_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "comment_likes: owner can delete"
  ON public.comment_likes FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- comment_reports
-- ─────────────────────────────────────────────────────────────────────────────
-- Reporters can only see their own reports. Moderation reads are service-role.

CREATE POLICY "comment_reports: owner can read own"
  ON public.comment_reports FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "comment_reports: owner can insert"
  ON public.comment_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- qr_reports
-- ─────────────────────────────────────────────────────────────────────────────
-- Users see their own reports. QR owners see reports on their QRs (via service
-- role for aggregate trust score — not individual reporter IDs).

CREATE POLICY "qr_reports: owner can read own"
  ON public.qr_reports FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "qr_reports: authenticated can insert"
  ON public.qr_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "qr_reports: owner can update own (withdraw report)"
  ON public.qr_reports FOR UPDATE TO authenticated
  USING  (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- qr_followers
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "qr_followers: authenticated can read all"
  ON public.qr_followers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "qr_followers: owner can insert"
  ON public.qr_followers FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "qr_followers: owner can delete"
  ON public.qr_followers FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- user_favorites
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "user_favorites: owner can read own"
  ON public.user_favorites FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "user_favorites: owner can insert"
  ON public.user_favorites FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "user_favorites: owner can delete"
  ON public.user_favorites FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- user_generated_qrs
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "user_generated_qrs: owner can read own"
  ON public.user_generated_qrs FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "user_generated_qrs: owner can insert"
  ON public.user_generated_qrs FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "user_generated_qrs: owner can update"
  ON public.user_generated_qrs FOR UPDATE TO authenticated
  USING  (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "user_generated_qrs: owner can delete"
  ON public.user_generated_qrs FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- user_friends
-- ─────────────────────────────────────────────────────────────────────────────
-- Users can see their own friend rows (both directions).
-- friend_id = auth.uid() lets a user see pending requests sent TO them.

CREATE POLICY "user_friends: owner can read own rows"
  ON public.user_friends FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id OR auth.uid()::text = friend_id);

CREATE POLICY "user_friends: owner can insert"
  ON public.user_friends FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "user_friends: parties can update status"
  ON public.user_friends FOR UPDATE TO authenticated
  USING (auth.uid()::text = user_id OR auth.uid()::text = friend_id)
  WITH CHECK (auth.uid()::text = user_id OR auth.uid()::text = friend_id);

CREATE POLICY "user_friends: owner can delete"
  ON public.user_friends FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- creator_follows
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "creator_follows: authenticated can read all"
  ON public.creator_follows FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "creator_follows: owner can insert"
  ON public.creator_follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "creator_follows: owner can delete"
  ON public.creator_follows FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- notifications
-- ─────────────────────────────────────────────────────────────────────────────
-- Mirrors Firebase RTDB rule: only the recipient can read/write their notifications.
-- The server (service role) creates notifications on behalf of users.

CREATE POLICY "notifications: owner can read own"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "notifications: owner can update own (mark read)"
  ON public.notifications FOR UPDATE TO authenticated
  USING  (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "notifications: owner can delete own"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- business_accounts
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "business_accounts: owner can read own"
  ON public.business_accounts FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "business_accounts: owner can insert"
  ON public.business_accounts FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "business_accounts: owner can update"
  ON public.business_accounts FOR UPDATE TO authenticated
  USING  (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "business_accounts: owner can delete"
  ON public.business_accounts FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- categories
-- ─────────────────────────────────────────────────────────────────────────────
-- Read-only lookup table. Writes are admin/service-role only.

CREATE POLICY "categories: anon can read all"
  ON public.categories FOR SELECT TO anon
  USING (true);

CREATE POLICY "categories: authenticated can read all"
  ON public.categories FOR SELECT TO authenticated
  USING (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- donations
-- ─────────────────────────────────────────────────────────────────────────────
-- Users see their own donations. Inserts are service-role (Razorpay webhook).

CREATE POLICY "donations: owner can read own"
  ON public.donations FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- feature_votes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "feature_votes: authenticated can read all"
  ON public.feature_votes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "feature_votes: owner can insert"
  ON public.feature_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "feature_votes: owner can update"
  ON public.feature_votes FOR UPDATE TO authenticated
  USING  (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "feature_votes: owner can delete"
  ON public.feature_votes FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- moderation_queue
-- ─────────────────────────────────────────────────────────────────────────────
-- Any authenticated user can file a report (insert). Reading and updating is
-- restricted to service role — never exposed via the public JS client.

CREATE POLICY "moderation_queue: authenticated can report (insert)"
  ON public.moderation_queue FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = reporter_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- verification_requests
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "verification_requests: owner can read own"
  ON public.verification_requests FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "verification_requests: owner can insert"
  ON public.verification_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- audit_logs
-- ─────────────────────────────────────────────────────────────────────────────
-- Written exclusively by the API server via service role.
-- Users can read their own entries (e.g. "you reported this QR on …").

CREATE POLICY "audit_logs: owner can read own"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);
