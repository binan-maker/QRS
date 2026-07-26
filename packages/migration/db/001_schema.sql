-- ═══════════════════════════════════════════════════════════════════════════════
-- BinRo — 001_schema.sql
-- Full PostgreSQL schema for the Firebase → Supabase migration.
-- IDEMPOTENT: safe to run multiple times against an existing database.
--
-- Run order: 001_schema → 002_rls → 003_triggers → 004_storage
--
-- Firestore collection map at the bottom of this file.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- for username/display_name search later

-- ─── Enums (idempotent) ───────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "public"."qr_type" AS ENUM ('individual', 'business', 'government');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."unified_qr_status" AS ENUM ('active', 'inactive', 'expired', 'limit_reached');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."friend_status" AS ENUM ('pending', 'friends', 'declined', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."verification_status" AS ENUM ('none', 'pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."verification_method" AS ENUM ('email', 'phone', 'document', 'manual', 'none');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."donation_status" AS ENUM ('pending', 'captured', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."scan_source" AS ENUM ('camera', 'gallery', 'viewed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."platform" AS ENUM ('android', 'ios', 'web', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."scan_verdict" AS ENUM ('safe', 'flagged', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."moderation_status" AS ENUM ('pending', 'reviewed', 'dismissed', 'actioned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."moderation_content_type" AS ENUM ('qr', 'comment', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── users ────────────────────────────────────────────────────────────────────
-- Source: users/{uid} (Firestore) + Firebase Auth
-- users.id == auth.uid() — the Supabase Auth UUID is used directly as PK.

CREATE TABLE IF NOT EXISTS public.users (
  id                       TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Original Firebase Auth UID kept for cross-reference during migration.
  -- NULL for accounts created natively in Supabase.
  firebase_uid             TEXT        UNIQUE,
  email                    TEXT        NOT NULL UNIQUE,
  email_verified           BOOLEAN     NOT NULL DEFAULT FALSE,
  display_name             TEXT        NOT NULL,
  photo_url                TEXT,
  username                 TEXT        UNIQUE,
  username_last_changed_at TIMESTAMPTZ,
  is_deleted               BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at               TIMESTAMPTZ,
  -- Denormalized counters (maintained by app logic / triggers)
  scan_count               INTEGER     NOT NULL DEFAULT 0,
  comment_count            INTEGER     NOT NULL DEFAULT 0,
  following_count          INTEGER     NOT NULL DEFAULT 0,
  total_likes_received     INTEGER     NOT NULL DEFAULT 0,
  friends_count            INTEGER     NOT NULL DEFAULT 0,
  -- Presence
  is_online                BOOLEAN     NOT NULL DEFAULT FALSE,
  last_seen                TIMESTAMPTZ,
  -- Push notifications (FCM → Expo push token)
  push_token               TEXT,
  -- GDPR / privacy consent blob
  consent                  JSONB,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_email_idx        ON public.users (email);
CREATE INDEX IF NOT EXISTS users_username_idx     ON public.users (username);
CREATE INDEX IF NOT EXISTS users_firebase_uid_idx ON public.users (firebase_uid);

-- ─── usernames ────────────────────────────────────────────────────────────────
-- Source: usernames/{username}
-- Claim registry — enforces uniqueness even while users.username allows NULL.

CREATE TABLE IF NOT EXISTS public.usernames (
  username    TEXT        PRIMARY KEY,
  user_id     TEXT        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  claimed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_verified BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS usernames_user_id_idx ON public.usernames (user_id);

-- ─── qr_codes (legacy) ────────────────────────────────────────────────────────
-- Source: qrCodes/{qrId}

CREATE TABLE IF NOT EXISTS public.qr_codes (
  id                       TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_id              TEXT        UNIQUE,
  content                  TEXT        NOT NULL,
  content_type             TEXT        NOT NULL DEFAULT 'text',
  owner_id                 TEXT        REFERENCES public.users (id) ON DELETE SET NULL,
  owner_name               TEXT        NOT NULL DEFAULT '',
  qr_type                  qr_type     NOT NULL DEFAULT 'individual',
  uuid                     TEXT        UNIQUE,
  branded_uuid             TEXT,
  is_branded               BOOLEAN     NOT NULL DEFAULT FALSE,
  business_name            TEXT,
  template_key             TEXT,
  -- ECDSA P-256 signature of (content ‖ ownerName)
  signature                TEXT,
  is_active                BOOLEAN     NOT NULL DEFAULT TRUE,
  deactivation_message     TEXT,
  private_mode             BOOLEAN     NOT NULL DEFAULT FALSE,
  custom_logo_uri          TEXT,
  logo_position            TEXT        DEFAULT 'center',
  display_destination      TEXT,
  form_values              JSONB,
  -- Counters
  scan_count               INTEGER     NOT NULL DEFAULT 0,
  comment_count            INTEGER     NOT NULL DEFAULT 0,
  owner_scan_count         INTEGER     NOT NULL DEFAULT 0,
  scan_count_frozen        BOOLEAN     NOT NULL DEFAULT FALSE,
  scan_count_freeze_reason TEXT,
  owner_verified           BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Limits
  scan_limit               INTEGER,
  expiry_date              TEXT,
  expiry_preset            TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS qr_codes_owner_id_idx     ON public.qr_codes (owner_id);
CREATE INDEX IF NOT EXISTS qr_codes_content_type_idx ON public.qr_codes (content_type);
CREATE INDEX IF NOT EXISTS qr_codes_uuid_idx         ON public.qr_codes (uuid);
CREATE INDEX IF NOT EXISTS qr_codes_firebase_id_idx  ON public.qr_codes (firebase_id);
CREATE INDEX IF NOT EXISTS qr_codes_is_active_idx    ON public.qr_codes (is_active);

-- ─── unified_qrs (new model) ──────────────────────────────────────────────────
-- Source: qrs/{uuid}

CREATE TABLE IF NOT EXISTS public.unified_qrs (
  id              TEXT              PRIMARY KEY,
  owner_id        TEXT              NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  owner_name      TEXT              NOT NULL,
  qr_type         qr_type           NOT NULL DEFAULT 'individual',
  template        TEXT,
  title           TEXT,
  is_dynamic      BOOLEAN           NOT NULL DEFAULT FALSE,
  destination     TEXT              NOT NULL,
  raw_destination TEXT              NOT NULL,
  content_type    TEXT              NOT NULL DEFAULT 'text',
  business_name   TEXT,
  status          unified_qr_status NOT NULL DEFAULT 'active',
  scan_count      INTEGER           NOT NULL DEFAULT 0,
  downloads       INTEGER           NOT NULL DEFAULT 0,
  shares          INTEGER           NOT NULL DEFAULT 0,
  scan_limit      INTEGER,
  expiry_date     TEXT,
  expiry_preset   TEXT,
  -- Design: { fgColor, bgColor, logoPosition, logoUri, label }
  design          JSONB             NOT NULL DEFAULT '{"fgColor":"#0A0E17","bgColor":"#F8FAFC","logoPosition":"center","logoUri":null,"label":null}'::jsonb,
  form_values     JSONB,
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS unified_qrs_owner_id_idx     ON public.unified_qrs (owner_id);
CREATE INDEX IF NOT EXISTS unified_qrs_status_idx       ON public.unified_qrs (status);
CREATE INDEX IF NOT EXISTS unified_qrs_content_type_idx ON public.unified_qrs (content_type);
CREATE INDEX IF NOT EXISTS unified_qrs_created_at_idx   ON public.unified_qrs (created_at DESC);

-- ─── guard_links ──────────────────────────────────────────────────────────────
-- Source: guardLinks/{uuid}  (legacy dynamic QRs)

CREATE TABLE IF NOT EXISTS public.guard_links (
  id                     TEXT        PRIMARY KEY,
  current_destination    TEXT        NOT NULL,
  previous_destination   TEXT,
  business_name          TEXT,
  owner_name             TEXT        NOT NULL,
  owner_id               TEXT        REFERENCES public.users (id) ON DELETE SET NULL,
  is_active              BOOLEAN     NOT NULL DEFAULT TRUE,
  destination_changed_at TIMESTAMPTZ,
  scan_count             INTEGER     NOT NULL DEFAULT 0,
  scan_limit             INTEGER,
  expiry_date            TEXT,
  content_type           TEXT,
  template_key           TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS guard_links_owner_id_idx ON public.guard_links (owner_id);
CREATE INDEX IF NOT EXISTS guard_links_is_active_idx ON public.guard_links (is_active);

-- ─── guard_link_changes ───────────────────────────────────────────────────────
-- Source: guardLinks/{uuid}.changeLog[]  (relational expansion of Firestore array)

CREATE TABLE IF NOT EXISTS public.guard_link_changes (
  id               SERIAL      PRIMARY KEY,
  guard_link_id    TEXT        NOT NULL REFERENCES public.guard_links (id) ON DELETE CASCADE,
  changed_at       TIMESTAMPTZ NOT NULL,
  from_destination TEXT        NOT NULL,
  to_destination   TEXT        NOT NULL,
  changed_by       TEXT        REFERENCES public.users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS guard_link_changes_guard_link_id_idx ON public.guard_link_changes (guard_link_id);

-- ─── standard_links ───────────────────────────────────────────────────────────
-- Source: standardLinks/{uuid}

CREATE TABLE IF NOT EXISTS public.standard_links (
  id           TEXT        PRIMARY KEY,
  raw_content  TEXT        NOT NULL,
  content_type TEXT        NOT NULL DEFAULT 'text',
  owner_name   TEXT        NOT NULL DEFAULT '',
  owner_id     TEXT        REFERENCES public.users (id) ON DELETE SET NULL,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  scan_limit   INTEGER,
  scan_count   INTEGER     NOT NULL DEFAULT 0,
  expiry_date  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS standard_links_owner_id_idx ON public.standard_links (owner_id);

-- ─── qr_scans ────────────────────────────────────────────────────────────────
-- Source: qrCodes/{id}/events + users/{uid}/scans
-- Exactly one of qr_code_id / unified_qr_id / guard_link_id / standard_link_id is set.

CREATE TABLE IF NOT EXISTS public.qr_scans (
  id               TEXT         PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id       TEXT         REFERENCES public.qr_codes (id)      ON DELETE SET NULL,
  unified_qr_id    TEXT         REFERENCES public.unified_qrs (id)    ON DELETE SET NULL,
  guard_link_id    TEXT         REFERENCES public.guard_links (id)    ON DELETE SET NULL,
  standard_link_id TEXT         REFERENCES public.standard_links (id) ON DELETE SET NULL,
  user_id          TEXT         REFERENCES public.users (id)          ON DELETE SET NULL,
  is_anonymous     BOOLEAN      NOT NULL DEFAULT FALSE,
  scan_source      scan_source,
  platform         platform     NOT NULL DEFAULT 'unknown',
  verdict          scan_verdict NOT NULL DEFAULT 'unknown',
  -- Snapshot of content at scan time (destination can change for dynamic QRs)
  content          TEXT,
  content_type     TEXT,
  scanned_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS qr_scans_qr_code_id_idx   ON public.qr_scans (qr_code_id);
CREATE INDEX IF NOT EXISTS qr_scans_unified_qr_id_idx ON public.qr_scans (unified_qr_id);
CREATE INDEX IF NOT EXISTS qr_scans_user_id_idx       ON public.qr_scans (user_id);
CREATE INDEX IF NOT EXISTS qr_scans_scanned_at_idx    ON public.qr_scans (scanned_at DESC);

-- ─── qr_comments ─────────────────────────────────────────────────────────────
-- Source: qrCodes/{id}/comments/{id}

CREATE TABLE IF NOT EXISTS public.qr_comments (
  id                TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_id       TEXT        UNIQUE,
  qr_code_id        TEXT        REFERENCES public.qr_codes (id)   ON DELETE CASCADE,
  unified_qr_id     TEXT        REFERENCES public.unified_qrs (id) ON DELETE CASCADE,
  user_id           TEXT        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  user_name         TEXT        NOT NULL,
  -- Self-referential FK for threaded replies (added after table creation to avoid circular dep)
  parent_id         TEXT,
  text              TEXT        NOT NULL,
  likes             INTEGER     NOT NULL DEFAULT 0,
  report_count      INTEGER     NOT NULL DEFAULT 0,
  is_hidden         BOOLEAN     NOT NULL DEFAULT FALSE,
  is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  is_pinned         BOOLEAN     NOT NULL DEFAULT FALSE,
  is_verified_owner BOOLEAN     NOT NULL DEFAULT FALSE,
  is_edited         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Self-referential FK added separately to avoid circular dependency
DO $$ BEGIN
  ALTER TABLE public.qr_comments
    ADD CONSTRAINT qr_comments_parent_id_fkey
    FOREIGN KEY (parent_id) REFERENCES public.qr_comments (id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS qr_comments_qr_code_id_idx    ON public.qr_comments (qr_code_id);
CREATE INDEX IF NOT EXISTS qr_comments_unified_qr_id_idx ON public.qr_comments (unified_qr_id);
CREATE INDEX IF NOT EXISTS qr_comments_user_id_idx       ON public.qr_comments (user_id);
CREATE INDEX IF NOT EXISTS qr_comments_parent_id_idx     ON public.qr_comments (parent_id);
CREATE INDEX IF NOT EXISTS qr_comments_created_at_idx    ON public.qr_comments (created_at DESC);

-- ─── comment_likes ────────────────────────────────────────────────────────────
-- Source: qrCodes/{id}/comments/{id}/likes/{userId}

CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id TEXT        NOT NULL REFERENCES public.qr_comments (id) ON DELETE CASCADE,
  user_id    TEXT        NOT NULL REFERENCES public.users (id)        ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS comment_likes_user_id_idx ON public.comment_likes (user_id);

-- ─── comment_reports ─────────────────────────────────────────────────────────
-- Source: qrCodes/{id}/comments/{id}/reports/{userId}

CREATE TABLE IF NOT EXISTS public.comment_reports (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id TEXT        NOT NULL REFERENCES public.qr_comments (id) ON DELETE CASCADE,
  user_id    TEXT        NOT NULL REFERENCES public.users (id)        ON DELETE CASCADE,
  reason     TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS comment_reports_comment_id_idx ON public.comment_reports (comment_id);

-- ─── qr_reports ──────────────────────────────────────────────────────────────
-- Source: qrCodes/{id}/reports/{userId}
-- One row per (qr, user). user_removed=true is a soft-delete.

CREATE TABLE IF NOT EXISTS public.qr_reports (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id       TEXT        REFERENCES public.qr_codes (id)    ON DELETE CASCADE,
  unified_qr_id    TEXT        REFERENCES public.unified_qrs (id) ON DELETE CASCADE,
  user_id          TEXT        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  report_type      TEXT        NOT NULL,
  -- Server-authoritative vote weight (0.01 – 2.0)
  weight           REAL        NOT NULL DEFAULT 0.1,
  account_age_days INTEGER     NOT NULL DEFAULT 0,
  email_verified   BOOLEAN     NOT NULL DEFAULT FALSE,
  user_removed     BOOLEAN     NOT NULL DEFAULT FALSE,
  removed_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One active report per user per legacy QR
  CONSTRAINT qr_reports_qr_code_user_uniq   UNIQUE (qr_code_id, user_id),
  -- One active report per user per unified QR
  CONSTRAINT qr_reports_unified_qr_user_uniq UNIQUE (unified_qr_id, user_id)
);

CREATE INDEX IF NOT EXISTS qr_reports_qr_code_id_idx    ON public.qr_reports (qr_code_id);
CREATE INDEX IF NOT EXISTS qr_reports_unified_qr_id_idx ON public.qr_reports (unified_qr_id);
CREATE INDEX IF NOT EXISTS qr_reports_user_id_idx       ON public.qr_reports (user_id);

-- ─── qr_followers ────────────────────────────────────────────────────────────
-- Source: qrCodes/{id}/followers/{userId}

CREATE TABLE IF NOT EXISTS public.qr_followers (
  qr_code_id    TEXT        REFERENCES public.qr_codes (id)    ON DELETE CASCADE,
  unified_qr_id TEXT        REFERENCES public.unified_qrs (id) ON DELETE CASCADE,
  user_id       TEXT        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  followed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT qr_followers_legacy_uniq  UNIQUE (qr_code_id, user_id),
  CONSTRAINT qr_followers_unified_uniq UNIQUE (unified_qr_id, user_id)
);

CREATE INDEX IF NOT EXISTS qr_followers_user_id_idx ON public.qr_followers (user_id);

-- ─── user_favorites ───────────────────────────────────────────────────────────
-- Source: users/{uid}/favorites/{qrId}

CREATE TABLE IF NOT EXISTS public.user_favorites (
  user_id       TEXT        NOT NULL REFERENCES public.users (id)    ON DELETE CASCADE,
  qr_code_id    TEXT        REFERENCES public.qr_codes (id)          ON DELETE CASCADE,
  unified_qr_id TEXT        REFERENCES public.unified_qrs (id)       ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_favorites_legacy_uniq  UNIQUE (user_id, qr_code_id),
  CONSTRAINT user_favorites_unified_uniq UNIQUE (user_id, unified_qr_id)
);

CREATE INDEX IF NOT EXISTS user_favorites_user_id_idx ON public.user_favorites (user_id);

-- ─── user_generated_qrs ───────────────────────────────────────────────────────
-- Source: users/{uid}/generatedQrs/{id}

CREATE TABLE IF NOT EXISTS public.user_generated_qrs (
  id            TEXT        PRIMARY KEY,
  user_id       TEXT        NOT NULL REFERENCES public.users (id)    ON DELETE CASCADE,
  qr_code_id    TEXT        REFERENCES public.qr_codes (id)          ON DELETE SET NULL,
  unified_qr_id TEXT        REFERENCES public.unified_qrs (id)       ON DELETE SET NULL,
  name          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_generated_qrs_user_id_idx ON public.user_generated_qrs (user_id);

-- ─── user_friends ─────────────────────────────────────────────────────────────
-- Source: users/{uid}/friends/{friendId}
-- Bidirectional: the app writes both directions (user→friend, friend→user).

CREATE TABLE IF NOT EXISTS public.user_friends (
  user_id   TEXT          NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  friend_id TEXT          NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  status    friend_status NOT NULL DEFAULT 'pending',
  added_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS user_friends_friend_id_idx ON public.user_friends (friend_id);
CREATE INDEX IF NOT EXISTS user_friends_status_idx    ON public.user_friends (status);

-- ─── creator_follows ─────────────────────────────────────────────────────────
-- Source: users/{uid}/creatorFollowing/{creatorId}

CREATE TABLE IF NOT EXISTS public.creator_follows (
  user_id     TEXT        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  creator_id  TEXT        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  followed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, creator_id)
);

CREATE INDEX IF NOT EXISTS creator_follows_creator_id_idx ON public.creator_follows (creator_id);

-- ─── notifications ────────────────────────────────────────────────────────────
-- Source: Firebase Realtime Database per-user notification list
-- App-level TTL: 30 days (enforced by the cleanup function in 003_triggers.sql).

CREATE TABLE IF NOT EXISTS public.notifications (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  type          TEXT        NOT NULL,
  message       TEXT        NOT NULL,
  -- Flexible QR reference (legacy or unified)
  qr_code_id    TEXT,
  from_user_id  TEXT        REFERENCES public.users (id) ON DELETE SET NULL,
  from_username TEXT,
  is_read       BOOLEAN     NOT NULL DEFAULT FALSE,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx    ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_user_read_idx  ON public.notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_expires_at_idx ON public.notifications (expires_at)
  WHERE expires_at IS NOT NULL;

-- ─── donations ────────────────────────────────────────────────────────────────
-- Source: donations/{id}  — Razorpay payment records

CREATE TABLE IF NOT EXISTS public.donations (
  id           TEXT            PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     TEXT            NOT NULL UNIQUE,
  payment_id   TEXT            UNIQUE,
  user_id      TEXT            REFERENCES public.users (id) ON DELETE SET NULL,
  amount_paise INTEGER         NOT NULL,   -- smallest INR unit (1 INR = 100 paise)
  currency     TEXT            NOT NULL DEFAULT 'INR',
  donor_name   TEXT,
  donor_email  TEXT,
  status       donation_status NOT NULL DEFAULT 'pending',
  paid_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS donations_user_id_idx ON public.donations (user_id);
CREATE INDEX IF NOT EXISTS donations_status_idx  ON public.donations (status);

-- ─── categories ───────────────────────────────────────────────────────────────
-- Source: categories/{id}  — QR content categories for discovery

CREATE TABLE IF NOT EXISTS public.categories (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  slug       TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── audit_logs ───────────────────────────────────────────────────────────────
-- Source: auditLogs/{monthPrefix}/{id}
-- Written by the API server (service role). Never written by clients.

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id            TEXT,
  user_id          TEXT        REFERENCES public.users (id) ON DELETE SET NULL,
  action           TEXT        NOT NULL,
  vote_weight      REAL,
  account_tier     INTEGER,
  account_age_days INTEGER,
  email_verified   BOOLEAN,
  -- ServerCollusionAnalysis payload
  collusion_flags  JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx    ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS audit_logs_qr_id_idx      ON public.audit_logs (qr_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
-- Monthly-bucket index — useful if you later partition by month
CREATE INDEX IF NOT EXISTS audit_logs_month_idx
  ON public.audit_logs (DATE_TRUNC('month', created_at));

-- ─── moderation_queue ────────────────────────────────────────────────────────
-- Source: moderationQueue/{id}
-- Reporters submit; reads/updates are service-role-only (admin backend).

CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id             TEXT                    PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type   moderation_content_type NOT NULL,
  content_id     TEXT                    NOT NULL,
  reason         TEXT                    NOT NULL,
  reporter_id    TEXT                    REFERENCES public.users (id) ON DELETE SET NULL,
  status         moderation_status       NOT NULL DEFAULT 'pending',
  reviewed_by    TEXT                    REFERENCES public.users (id) ON DELETE SET NULL,
  reviewed_at    TIMESTAMPTZ,
  reviewer_notes TEXT,
  created_at     TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS moderation_queue_status_idx     ON public.moderation_queue (status);
CREATE INDEX IF NOT EXISTS moderation_queue_content_id_idx ON public.moderation_queue (content_id);
CREATE INDEX IF NOT EXISTS moderation_queue_created_at_idx ON public.moderation_queue (created_at DESC);

-- ─── verification_requests ────────────────────────────────────────────────────
-- Source: verificationRequests/{id}

CREATE TABLE IF NOT EXISTS public.verification_requests (
  id             TEXT                 PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT                 NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  status         verification_status  NOT NULL DEFAULT 'none',
  method         verification_method  NOT NULL DEFAULT 'none',
  business_name  TEXT,
  -- Array of document URLs / storage paths
  documents      JSONB,
  pending_review BOOLEAN              NOT NULL DEFAULT FALSE,
  reviewer_notes TEXT,
  submitted_at   TIMESTAMPTZ,
  reviewed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS verification_requests_user_id_idx ON public.verification_requests (user_id);
CREATE INDEX IF NOT EXISTS verification_requests_status_idx  ON public.verification_requests (status);

-- ─── feature_votes ────────────────────────────────────────────────────────────
-- Source: featureVotes/{key}  — one row per (feature, user)

CREATE TABLE IF NOT EXISTS public.feature_votes (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT        NOT NULL,
  user_id     TEXT        REFERENCES public.users (id) ON DELETE SET NULL,
  value       JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (feature_key, user_id)
);

CREATE INDEX IF NOT EXISTS feature_votes_feature_key_idx ON public.feature_votes (feature_key);
CREATE INDEX IF NOT EXISTS feature_votes_user_id_idx     ON public.feature_votes (user_id);

-- ─── business_accounts ────────────────────────────────────────────────────────
-- Source: businessAccounts/{uid}

CREATE TABLE IF NOT EXISTS public.business_accounts (
  id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT        NOT NULL UNIQUE REFERENCES public.users (id) ON DELETE CASCADE,
  display_name TEXT        NOT NULL,
  plan         TEXT        NOT NULL DEFAULT 'free',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS business_accounts_user_id_idx ON public.business_accounts (user_id);

-- ─── public_profiles view ─────────────────────────────────────────────────────
-- Community-safe subset of `users`. Excludes: email, push_token, consent,
-- firebase_uid, and email_verified. Used by comment threads, follower lists,
-- and creator pages instead of querying users directly.

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
FROM public.users
WHERE is_deleted = FALSE;

GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Firestore collection → PostgreSQL table map (reference)
-- ───────────────────────────────────────────────────────────────────────────────
--   users/{uid}                        → users
--   usernames/{username}               → usernames
--   qrCodes/{id}                       → qr_codes
--   qrCodes/{id}/events + scans        → qr_scans
--   qrCodes/{id}/comments/{id}         → qr_comments
--   qrCodes/{id}/comments/{id}/likes   → comment_likes
--   qrCodes/{id}/comments/{id}/reports → comment_reports
--   qrCodes/{id}/reports/{userId}      → qr_reports
--   qrCodes/{id}/followers/{userId}    → qr_followers
--   qrs/{uuid}                         → unified_qrs
--   guardLinks/{uuid}                  → guard_links
--   guardLinks/{uuid}.changeLog[]      → guard_link_changes
--   standardLinks/{uuid}               → standard_links
--   categories/{id}                    → categories
--   donations/{id}                     → donations
--   auditLogs/{month}/{id}             → audit_logs
--   moderationQueue/{id}               → moderation_queue
--   verificationRequests/{id}          → verification_requests
--   featureVotes/{key}                 → feature_votes
--   businessAccounts/{uid}             → business_accounts
--   users/{uid}/generatedQrs/{id}      → user_generated_qrs
--   users/{uid}/friends/{friendId}     → user_friends
--   users/{uid}/creatorFollowing/{id}  → creator_follows
--   users/{uid}/favorites/{qrId}       → user_favorites
--   RTDB notifications/{uid}           → notifications
--   RTDB qrScanVelocity                → (not migrated — ephemeral rate-limit)
--   RTDB blockedScans                  → (not migrated — ephemeral fraud-guard)
-- ═══════════════════════════════════════════════════════════════════════════════
