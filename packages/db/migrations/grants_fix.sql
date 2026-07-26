-- ═══════════════════════════════════════════════════════════════════════════
-- GRANTS FIX — run this once in the Supabase SQL Editor.
--
-- Why this is needed:
--   PostgreSQL requires TWO things for RLS to work:
--     1. GRANT  — allows the role to access the table at all
--     2. Policy — filters which rows they can see
--   The original rls_policies.sql had all the policies but no GRANTs,
--   so Postgres returned "permission denied" before even checking the policy.
--
-- Safe to re-run — GRANT is idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── users ───────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;

-- ─── usernames ───────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usernames TO authenticated;

-- ─── qr_codes ────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_codes TO authenticated;

-- ─── unified_qrs ─────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unified_qrs TO authenticated;

-- ─── standard_links ──────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.standard_links TO authenticated;

-- ─── guard_links / guard_link_changes ────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guard_links TO authenticated;
GRANT SELECT, INSERT             ON public.guard_link_changes TO authenticated;

-- ─── qr_scans ────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_scans TO authenticated;

-- ─── qr_comments ─────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_comments TO authenticated;

-- ─── comment_likes ────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, DELETE ON public.comment_likes TO authenticated;

-- ─── comment_reports ─────────────────────────────────────────────────────────
GRANT SELECT, INSERT ON public.comment_reports TO authenticated;

-- ─── qr_reports ──────────────────────────────────────────────────────────────
GRANT SELECT, INSERT ON public.qr_reports TO authenticated;

-- ─── qr_followers ────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, DELETE ON public.qr_followers TO authenticated;

-- ─── creator_follows ─────────────────────────────────────────────────────────
GRANT SELECT, INSERT, DELETE ON public.creator_follows TO authenticated;

-- ─── user_favorites ──────────────────────────────────────────────────────────
GRANT SELECT, INSERT, DELETE ON public.user_favorites TO authenticated;

-- ─── user_generated_qrs ──────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_generated_qrs TO authenticated;

-- ─── notifications ────────────────────────────────────────────────────────────
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;

-- ─── business_accounts ───────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_accounts TO authenticated;

-- ─── categories ──────────────────────────────────────────────────────────────
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.categories TO authenticated;

-- ─── donations ───────────────────────────────────────────────────────────────
GRANT SELECT, INSERT ON public.donations TO authenticated;

-- ─── feature_votes ───────────────────────────────────────────────────────────
GRANT SELECT, INSERT, DELETE ON public.feature_votes TO authenticated;

-- ─── moderation_queue ────────────────────────────────────────────────────────
GRANT INSERT ON public.moderation_queue TO authenticated;

-- ─── verification_requests ───────────────────────────────────────────────────
GRANT SELECT, INSERT ON public.verification_requests TO authenticated;

-- ─── audit_logs ──────────────────────────────────────────────────────────────
GRANT SELECT ON public.audit_logs TO authenticated;
