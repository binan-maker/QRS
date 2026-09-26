-- ============================================================================
-- BinRo — PostgreSQL Schema Migration
-- 0001_firebase_mirror.sql
--
-- Mirrors every Firestore collection used by BinRo.
-- Run this once against a fresh database before any data migration.
--
-- Firestore collection → PostgreSQL table map:
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
--   notifications (RTDB)               → notifications
--   auditLogs/{month}/{id}             → audit_logs
--   moderationQueue/{id}               → moderation_queue
--   verificationRequests/{id}          → verification_requests
--   featureVotes/{key}                 → feature_votes
--   businessAccounts/{uid}             → business_accounts
--   users/{uid}/generatedQrs/{id}      → user_generated_qrs
--   users/{uid}/friends/{friendId}     → user_friends
--   users/{uid}/creatorFollowing/{id}  → creator_follows
--   users/{uid}/favorites/{qrId}       → user_favorites
-- ============================================================================

-- Enable pgcrypto for gen_random_uuid() (idempotent)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE qr_type AS ENUM (
  'individual',
  'business',
  'government'
);

CREATE TYPE unified_qr_status AS ENUM (
  'active',
  'inactive',
  'expired',
  'limit_reached'
);

CREATE TYPE friend_status AS ENUM (
  'pending',
  'friends',
  'declined',
  'blocked'
);

CREATE TYPE verification_status AS ENUM (
  'none',
  'pending',
  'approved',
  'rejected'
);

CREATE TYPE verification_method AS ENUM (
  'email',
  'phone',
  'document',
  'manual',
  'none'
);

CREATE TYPE donation_status AS ENUM (
  'pending',
  'success',
  'failed',
  'refunded'
);

CREATE TYPE scan_source AS ENUM (
  'camera',
  'gallery',
  'viewed'
);

CREATE TYPE platform AS ENUM (
  'android',
  'ios',
  'web',
  'unknown'
);

CREATE TYPE scan_verdict AS ENUM (
  'safe',
  'flagged',
  'unknown'
);

CREATE TYPE moderation_status AS ENUM (
  'pending',
  'reviewed',
  'dismissed',
  'actioned'
);

CREATE TYPE moderation_content_type AS ENUM (
  'qr',
  'comment',
  'user'
);

-- ─── Users ───────────────────────────────────────────────────────────────────
-- Source: users/{userId}

CREATE TABLE users (
  id                       TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Original Firestore / Firebase Auth UID. NULL for native-PG registrations.
  firebase_uid             TEXT        UNIQUE,
  email                    TEXT        NOT NULL UNIQUE,
  email_verified           BOOLEAN     NOT NULL DEFAULT FALSE,
  display_name             TEXT        NOT NULL,
  photo_url                TEXT,
  username                 TEXT        UNIQUE,
  username_last_changed_at TIMESTAMPTZ,
  is_deleted               BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at               TIMESTAMPTZ,
  -- Denormalized counters (kept in sync by app logic)
  scan_count               INTEGER     NOT NULL DEFAULT 0,
  comment_count            INTEGER     NOT NULL DEFAULT 0,
  following_count          INTEGER     NOT NULL DEFAULT 0,
  total_likes_received     INTEGER     NOT NULL DEFAULT 0,
  friends_count            INTEGER     NOT NULL DEFAULT 0,
  -- Presence
  is_online                BOOLEAN     NOT NULL DEFAULT FALSE,
  last_seen                TIMESTAMPTZ,
  -- Push notifications
  push_token               TEXT,
  -- GDPR / privacy consent blob
  consent                  JSONB,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX users_email_idx       ON users (email);
CREATE INDEX users_username_idx    ON users (username);
CREATE INDEX users_firebase_uid_idx ON users (firebase_uid);

-- ─── Username Registry ────────────────────────────────────────────────────────
-- Source: usernames/{username}

CREATE TABLE usernames (
  username   TEXT        PRIMARY KEY,
  user_id    TEXT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_verified BOOLEAN    NOT NULL DEFAULT FALSE
);

CREATE INDEX usernames_user_id_idx ON usernames (user_id);

-- ─── Legacy QR Codes ─────────────────────────────────────────────────────────
-- Source: qrCodes/{qrId}

CREATE TABLE qr_codes (
  id                       TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Original Firestore document ID
  firebase_id              TEXT        UNIQUE,
  content                  TEXT        NOT NULL,
  content_type             TEXT        NOT NULL DEFAULT 'text',
  owner_id                 TEXT        REFERENCES users (id) ON DELETE SET NULL,
  owner_name               TEXT        NOT NULL DEFAULT '',
  qr_type                  qr_type     NOT NULL DEFAULT 'individual',
  -- Branded/linked UUIDs
  uuid                     TEXT        UNIQUE,
  branded_uuid             TEXT,
  is_branded               BOOLEAN     NOT NULL DEFAULT FALSE,
  business_name            TEXT,
  template_key             TEXT,
  -- ECDSA P-256 signature of (content + ownerName)
  signature                TEXT,
  -- Status
  is_active                BOOLEAN     NOT NULL DEFAULT TRUE,
  deactivation_message     TEXT,
  private_mode             BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Design / display
  custom_logo_uri          TEXT,
  logo_position            TEXT        DEFAULT 'center',
  display_destination      TEXT,
  form_values              JSONB,
  -- Counters
  scan_count               INTEGER     NOT NULL DEFAULT 0,
  comment_count            INTEGER     NOT NULL DEFAULT 0,
  owner_scan_count         INTEGER     NOT NULL DEFAULT 0,
  -- Fraud guard
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

CREATE INDEX qr_codes_owner_id_idx    ON qr_codes (owner_id);
CREATE INDEX qr_codes_content_type_idx ON qr_codes (content_type);
CREATE INDEX qr_codes_uuid_idx        ON qr_codes (uuid);
CREATE INDEX qr_codes_firebase_id_idx ON qr_codes (firebase_id);
CREATE INDEX qr_codes_is_active_idx   ON qr_codes (is_active);

-- ─── Unified QRs (new model) ──────────────────────────────────────────────────
-- Source: qrs/{uuid}

CREATE TABLE unified_qrs (
  id               TEXT               PRIMARY KEY,
  owner_id         TEXT               NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  owner_name       TEXT               NOT NULL,
  qr_type          qr_type            NOT NULL DEFAULT 'individual',
  template         TEXT,
  title            TEXT,
  is_dynamic       BOOLEAN            NOT NULL DEFAULT FALSE,
  destination      TEXT               NOT NULL,
  raw_destination  TEXT               NOT NULL,
  content_type     TEXT               NOT NULL DEFAULT 'text',
  business_name    TEXT,
  status           unified_qr_status  NOT NULL DEFAULT 'active',
  -- Counters
  scan_count       INTEGER            NOT NULL DEFAULT 0,
  downloads        INTEGER            NOT NULL DEFAULT 0,
  shares           INTEGER            NOT NULL DEFAULT 0,
  -- Limits
  scan_limit       INTEGER,
  expiry_date      TEXT,
  expiry_preset    TEXT,
  -- Design: { fgColor, bgColor, logoPosition, logoUri, label }
  design           JSONB              NOT NULL DEFAULT '{"fgColor":"#0A0E17","bgColor":"#F8FAFC","logoPosition":"center","logoUri":null,"label":null}'::jsonb,
  -- Form values: { value: string, extra: Record<string,string> }
  form_values      JSONB,
  created_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX unified_qrs_owner_id_idx    ON unified_qrs (owner_id);
CREATE INDEX unified_qrs_status_idx      ON unified_qrs (status);
CREATE INDEX unified_qrs_content_type_idx ON unified_qrs (content_type);
CREATE INDEX unified_qrs_created_at_idx  ON unified_qrs (created_at DESC);

-- ─── Guard Links (legacy dynamic QRs) ────────────────────────────────────────
-- Source: guardLinks/{uuid}

CREATE TABLE guard_links (
  id                     TEXT        PRIMARY KEY,
  current_destination    TEXT        NOT NULL,
  previous_destination   TEXT,
  business_name          TEXT,
  owner_name             TEXT        NOT NULL,
  owner_id               TEXT        REFERENCES users (id) ON DELETE SET NULL,
  is_active              BOOLEAN     NOT NULL DEFAULT TRUE,
  destination_changed_at TIMESTAMPTZ,
  scan_count             INTEGER     NOT NULL DEFAULT 0,
  scan_limit             INTEGER,
  expiry_date            TEXT,
  content_type           TEXT,
  template_key           TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX guard_links_owner_id_idx ON guard_links (owner_id);
CREATE INDEX guard_links_is_active_idx ON guard_links (is_active);

-- ─── Guard Link Change Log ────────────────────────────────────────────────────
-- Firestore array: guardLinks/{uuid}.changeLog → relational rows

CREATE TABLE guard_link_changes (
  id               SERIAL      PRIMARY KEY,
  guard_link_id    TEXT        NOT NULL REFERENCES guard_links (id) ON DELETE CASCADE,
  changed_at       TIMESTAMPTZ NOT NULL,
  from_destination TEXT        NOT NULL,
  to_destination   TEXT        NOT NULL,
  changed_by       TEXT        REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX guard_link_changes_guard_link_id_idx ON guard_link_changes (guard_link_id);

-- ─── Standard Links (legacy static QRs) ──────────────────────────────────────
-- Source: standardLinks/{uuid}

CREATE TABLE standard_links (
  id           TEXT        PRIMARY KEY,
  raw_content  TEXT        NOT NULL,
  content_type TEXT        NOT NULL DEFAULT 'text',
  owner_name   TEXT        NOT NULL DEFAULT '',
  owner_id     TEXT        REFERENCES users (id) ON DELETE SET NULL,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  scan_limit   INTEGER,
  scan_count   INTEGER     NOT NULL DEFAULT 0,
  expiry_date  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX standard_links_owner_id_idx ON standard_links (owner_id);

-- ─── QR Scans ─────────────────────────────────────────────────────────────────
-- Source: qrCodes/{id}/events + users/{uid}/scans
-- Exactly one of qr_code_id / unified_qr_id / guard_link_id / standard_link_id should be set.

CREATE TABLE qr_scans (
  id               TEXT         PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id       TEXT         REFERENCES qr_codes (id) ON DELETE SET NULL,
  unified_qr_id    TEXT         REFERENCES unified_qrs (id) ON DELETE SET NULL,
  guard_link_id    TEXT         REFERENCES guard_links (id) ON DELETE SET NULL,
  standard_link_id TEXT         REFERENCES standard_links (id) ON DELETE SET NULL,
  user_id          TEXT         REFERENCES users (id) ON DELETE SET NULL,
  is_anonymous     BOOLEAN      NOT NULL DEFAULT FALSE,
  scan_source      scan_source,
  platform         platform     NOT NULL DEFAULT 'unknown',
  verdict          scan_verdict NOT NULL DEFAULT 'unknown',
  -- Content snapshot at scan time (destination can change for dynamic QRs)
  content          TEXT,
  content_type     TEXT,
  scanned_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX qr_scans_qr_code_id_idx   ON qr_scans (qr_code_id);
CREATE INDEX qr_scans_unified_qr_id_idx ON qr_scans (unified_qr_id);
CREATE INDEX qr_scans_user_id_idx      ON qr_scans (user_id);
CREATE INDEX qr_scans_scanned_at_idx   ON qr_scans (scanned_at DESC);

-- ─── QR Comments ─────────────────────────────────────────────────────────────
-- Source: qrCodes/{id}/comments/{id}

CREATE TABLE qr_comments (
  id                TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Original Firestore document ID
  firebase_id       TEXT        UNIQUE,
  qr_code_id        TEXT        REFERENCES qr_codes (id) ON DELETE CASCADE,
  unified_qr_id     TEXT        REFERENCES unified_qrs (id) ON DELETE CASCADE,
  user_id           TEXT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  user_name         TEXT        NOT NULL,
  -- Self-referential for replies (added below as ALTER TABLE to avoid circular dep)
  parent_id         TEXT,
  text              TEXT        NOT NULL,
  -- Denormalized counters
  likes             INTEGER     NOT NULL DEFAULT 0,
  report_count      INTEGER     NOT NULL DEFAULT 0,
  -- Flags
  is_hidden         BOOLEAN     NOT NULL DEFAULT FALSE,
  is_deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  is_pinned         BOOLEAN     NOT NULL DEFAULT FALSE,
  is_verified_owner BOOLEAN     NOT NULL DEFAULT FALSE,
  is_edited         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Self-referential FK added after table creation
ALTER TABLE qr_comments
  ADD CONSTRAINT qr_comments_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES qr_comments (id) ON DELETE SET NULL;

CREATE INDEX qr_comments_qr_code_id_idx   ON qr_comments (qr_code_id);
CREATE INDEX qr_comments_unified_qr_id_idx ON qr_comments (unified_qr_id);
CREATE INDEX qr_comments_user_id_idx      ON qr_comments (user_id);
CREATE INDEX qr_comments_parent_id_idx    ON qr_comments (parent_id);
CREATE INDEX qr_comments_created_at_idx   ON qr_comments (created_at DESC);

-- ─── Comment Likes ────────────────────────────────────────────────────────────
-- Source: qrCodes/{id}/comments/{id}/likes/{userId}

CREATE TABLE comment_likes (
  comment_id TEXT        NOT NULL REFERENCES qr_comments (id) ON DELETE CASCADE,
  user_id    TEXT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX comment_likes_user_id_idx ON comment_likes (user_id);

-- ─── Comment Reports ──────────────────────────────────────────────────────────
-- Source: qrCodes/{id}/comments/{id}/reports/{userId}

CREATE TABLE comment_reports (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id TEXT        NOT NULL REFERENCES qr_comments (id) ON DELETE CASCADE,
  user_id    TEXT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  reason     TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (comment_id, user_id)
);

CREATE INDEX comment_reports_comment_id_idx ON comment_reports (comment_id);

-- ─── QR Trust Reports ─────────────────────────────────────────────────────────
-- Source: qrCodes/{id}/reports/{userId}
-- One active row per (qr, user). user_removed=true is a soft-delete (Firestore rule constraint).

CREATE TABLE qr_reports (
  id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id      TEXT        REFERENCES qr_codes (id) ON DELETE CASCADE,
  unified_qr_id   TEXT        REFERENCES unified_qrs (id) ON DELETE CASCADE,
  user_id         TEXT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  report_type     TEXT        NOT NULL,
  -- Server-authoritative vote weight (0.01–2.0)
  weight          REAL        NOT NULL DEFAULT 0.1,
  account_age_days INTEGER    NOT NULL DEFAULT 0,
  email_verified  BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Soft-delete: user toggled report off
  user_removed    BOOLEAN     NOT NULL DEFAULT FALSE,
  removed_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Only one active (non-removed) report per user per legacy QR
  CONSTRAINT qr_reports_qr_code_user_key UNIQUE (qr_code_id, user_id),
  -- Only one active report per user per unified QR
  CONSTRAINT qr_reports_unified_qr_user_key UNIQUE (unified_qr_id, user_id)
);

CREATE INDEX qr_reports_qr_code_id_idx   ON qr_reports (qr_code_id);
CREATE INDEX qr_reports_unified_qr_id_idx ON qr_reports (unified_qr_id);
CREATE INDEX qr_reports_user_id_idx      ON qr_reports (user_id);

-- ─── QR Followers ─────────────────────────────────────────────────────────────
-- Source: qrCodes/{id}/followers + users/{uid}/following

CREATE TABLE qr_followers (
  qr_code_id    TEXT        REFERENCES qr_codes (id) ON DELETE CASCADE,
  unified_qr_id TEXT        REFERENCES unified_qrs (id) ON DELETE CASCADE,
  user_id       TEXT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  followed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT qr_followers_legacy_uniq  UNIQUE (qr_code_id, user_id),
  CONSTRAINT qr_followers_unified_uniq UNIQUE (unified_qr_id, user_id)
);

CREATE INDEX qr_followers_user_id_idx ON qr_followers (user_id);

-- ─── User Favorites ───────────────────────────────────────────────────────────
-- Source: users/{uid}/favorites/{qrId}

CREATE TABLE user_favorites (
  user_id       TEXT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  qr_code_id    TEXT        REFERENCES qr_codes (id) ON DELETE CASCADE,
  unified_qr_id TEXT        REFERENCES unified_qrs (id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_favorites_legacy_uniq  UNIQUE (user_id, qr_code_id),
  CONSTRAINT user_favorites_unified_uniq UNIQUE (user_id, unified_qr_id)
);

CREATE INDEX user_favorites_user_id_idx ON user_favorites (user_id);

-- ─── User Generated QRs ───────────────────────────────────────────────────────
-- Source: users/{uid}/generatedQrs/{id}

CREATE TABLE user_generated_qrs (
  -- Firestore sub-collection document ID
  id            TEXT        PRIMARY KEY,
  user_id       TEXT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  qr_code_id    TEXT        REFERENCES qr_codes (id) ON DELETE SET NULL,
  unified_qr_id TEXT        REFERENCES unified_qrs (id) ON DELETE SET NULL,
  name          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX user_generated_qrs_user_id_idx ON user_generated_qrs (user_id);

-- ─── User Friends ─────────────────────────────────────────────────────────────
-- Source: users/{uid}/friends/{friendId}
-- Stored directionally; app writes the inverse row too.

CREATE TABLE user_friends (
  user_id   TEXT          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  friend_id TEXT          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status    friend_status NOT NULL DEFAULT 'pending',
  added_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id)
);

CREATE INDEX user_friends_friend_id_idx ON user_friends (friend_id);
CREATE INDEX user_friends_status_idx    ON user_friends (status);

-- ─── Creator Follows ──────────────────────────────────────────────────────────
-- Source: users/{uid}/creatorFollowing/{creatorId}

CREATE TABLE creator_follows (
  user_id    TEXT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  creator_id TEXT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  followed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, creator_id)
);

CREATE INDEX creator_follows_creator_id_idx ON creator_follows (creator_id);

-- ─── Notifications ────────────────────────────────────────────────────────────
-- Source: Firebase Realtime Database per-user notification list
-- TTL enforced at app level (30 days).

CREATE TABLE notifications (
  id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type         TEXT        NOT NULL,
  message      TEXT        NOT NULL,
  -- Flexible QR reference (legacy or unified)
  qr_code_id   TEXT,
  from_user_id TEXT        REFERENCES users (id) ON DELETE SET NULL,
  from_username TEXT,
  is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_id_idx   ON notifications (user_id);
CREATE INDEX notifications_user_read_idx ON notifications (user_id, is_read);
CREATE INDEX notifications_created_at_idx ON notifications (created_at DESC);
CREATE INDEX notifications_expires_at_idx ON notifications (expires_at)
  WHERE expires_at IS NOT NULL;

-- ─── Donations ────────────────────────────────────────────────────────────────
-- Source: donations/{id}

CREATE TABLE donations (
  id            TEXT             PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Razorpay identifiers
  order_id      TEXT             NOT NULL UNIQUE,
  payment_id    TEXT             UNIQUE,
  user_id       TEXT             REFERENCES users (id) ON DELETE SET NULL,
  -- Amount in smallest currency unit (paise for INR)
  amount_paise  INTEGER          NOT NULL,
  currency      TEXT             NOT NULL DEFAULT 'INR',
  donor_name    TEXT,
  donor_email   TEXT,
  status        donation_status  NOT NULL DEFAULT 'pending',
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX donations_user_id_idx ON donations (user_id);
CREATE INDEX donations_status_idx  ON donations (status);

-- ─── Categories ───────────────────────────────────────────────────────────────
-- Source: categories/{id}

CREATE TABLE categories (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  slug       TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Audit Logs ───────────────────────────────────────────────────────────────
-- Source: auditLogs/{monthPrefix}/{id}

CREATE TABLE audit_logs (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Flexible QR reference (legacy or unified)
  qr_id            TEXT,
  user_id          TEXT        REFERENCES users (id) ON DELETE SET NULL,
  action           TEXT        NOT NULL,
  vote_weight      REAL,
  account_tier     INTEGER,
  account_age_days INTEGER,
  email_verified   BOOLEAN,
  -- ServerCollusionAnalysis: { suspicious, reason, safeWeightMultiplier, ... }
  collusion_flags  JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_logs_user_id_idx   ON audit_logs (user_id);
CREATE INDEX audit_logs_qr_id_idx     ON audit_logs (qr_id);
CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at DESC);
-- Monthly partitioning hint — partition by year-month if volume grows
CREATE INDEX audit_logs_month_idx ON audit_logs (DATE_TRUNC('month', created_at));

-- ─── Moderation Queue ─────────────────────────────────────────────────────────
-- Source: moderationQueue/{id}

CREATE TABLE moderation_queue (
  id                    TEXT                     PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type          moderation_content_type  NOT NULL,
  -- ID of the QR / comment / user under review
  content_id            TEXT                     NOT NULL,
  reason                TEXT                     NOT NULL,
  reporter_id           TEXT                     REFERENCES users (id) ON DELETE SET NULL,
  status                moderation_status        NOT NULL DEFAULT 'pending',
  reviewed_by           TEXT                     REFERENCES users (id) ON DELETE SET NULL,
  reviewed_at           TIMESTAMPTZ,
  reviewer_notes        TEXT,
  created_at            TIMESTAMPTZ              NOT NULL DEFAULT NOW()
);

CREATE INDEX moderation_queue_status_idx     ON moderation_queue (status);
CREATE INDEX moderation_queue_content_id_idx ON moderation_queue (content_id);
CREATE INDEX moderation_queue_created_at_idx ON moderation_queue (created_at DESC);

-- ─── Verification Requests ────────────────────────────────────────────────────
-- Source: verificationRequests/{id}

CREATE TABLE verification_requests (
  id             TEXT                  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT                  NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status         verification_status   NOT NULL DEFAULT 'none',
  method         verification_method   NOT NULL DEFAULT 'none',
  business_name  TEXT,
  -- Array of uploaded document URLs / storage paths
  documents      JSONB,
  pending_review BOOLEAN               NOT NULL DEFAULT FALSE,
  reviewer_notes TEXT,
  submitted_at   TIMESTAMPTZ,
  reviewed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

CREATE INDEX verification_requests_user_id_idx ON verification_requests (user_id);
CREATE INDEX verification_requests_status_idx  ON verification_requests (status);

-- ─── Feature Votes ────────────────────────────────────────────────────────────
-- Source: featureVotes/{key}

CREATE TABLE feature_votes (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT        NOT NULL,
  user_id     TEXT        REFERENCES users (id) ON DELETE SET NULL,
  -- Vote value or free-form feedback payload
  value       JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (feature_key, user_id)
);

CREATE INDEX feature_votes_feature_key_idx ON feature_votes (feature_key);
CREATE INDEX feature_votes_user_id_idx     ON feature_votes (user_id);

-- ─── Business Accounts ────────────────────────────────────────────────────────
-- Source: businessAccounts/{uid}

CREATE TABLE business_accounts (
  id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT        NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  display_name TEXT        NOT NULL,
  plan         TEXT        NOT NULL DEFAULT 'free',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX business_accounts_user_id_idx ON business_accounts (user_id);

-- ─── Seed: default categories ─────────────────────────────────────────────────

INSERT INTO categories (name, slug) VALUES
  ('Payment',      'payment'),
  ('Business',     'business'),
  ('Social',       'social'),
  ('Website',      'website'),
  ('Contact',      'contact'),
  ('WiFi',         'wifi'),
  ('Location',     'location'),
  ('Event',        'event'),
  ('Government',   'government'),
  ('Other',        'other')
ON CONFLICT (slug) DO NOTHING;

-- ─── Schema version marker ────────────────────────────────────────────────────
-- Drizzle tracks migrations in its own _drizzle_migrations table.
-- This comment marks the schema version for manual audits.
-- Schema version: 1.0.0 — Firebase mirror baseline
-- Generated: 2026-07-17
