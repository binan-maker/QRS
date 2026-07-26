-- ═══════════════════════════════════════════════════════════════════════════════
-- BinRo — 004_storage.sql
-- Supabase Storage buckets and their RLS policies.
-- IDEMPOTENT: bucket inserts use ON CONFLICT DO NOTHING.
--
-- Run AFTER 001_schema.sql and 002_rls.sql.
--
-- Buckets created:
--   avatars          — user profile photos (public read, owner write)
--   qr-logos         — custom QR logo images (public read, owner write)
--   verification-docs — KYC/business verification documents (private)
--
-- Firebase Storage migration:
--   gs://<bucket>/users/{uid}/avatar.*  →  avatars/{uid}/avatar.<ext>
--   gs://<bucket>/qrCodes/{id}/logo.*   →  qr-logos/{qrId}/logo.<ext>
--   gs://<bucket>/verification/{uid}/*  →  verification-docs/{uid}/*
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Buckets ─────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'avatars',
    'avatars',
    true,          -- publicly accessible (profile photos)
    5242880,       -- 5 MB limit
    ARRAY['image/jpeg','image/png','image/webp','image/gif']
  )
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'qr-logos',
    'qr-logos',
    true,          -- public (shown on QR scan pages)
    2097152,       -- 2 MB limit
    ARRAY['image/jpeg','image/png','image/webp','image/svg+xml']
  )
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'verification-docs',
    'verification-docs',
    false,         -- private (KYC documents — only admin can read)
    10485760,      -- 10 MB limit per file
    ARRAY['image/jpeg','image/png','image/webp','application/pdf']
  )
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── Storage RLS policies ─────────────────────────────────────────────────────

-- Drop existing policies before recreating (idempotent)
DROP POLICY IF EXISTS "avatars: public read"          ON storage.objects;
DROP POLICY IF EXISTS "avatars: owner upload"         ON storage.objects;
DROP POLICY IF EXISTS "avatars: owner update"         ON storage.objects;
DROP POLICY IF EXISTS "avatars: owner delete"         ON storage.objects;
DROP POLICY IF EXISTS "qr-logos: public read"         ON storage.objects;
DROP POLICY IF EXISTS "qr-logos: owner upload"        ON storage.objects;
DROP POLICY IF EXISTS "qr-logos: owner update"        ON storage.objects;
DROP POLICY IF EXISTS "qr-logos: owner delete"        ON storage.objects;
DROP POLICY IF EXISTS "verification-docs: owner upload" ON storage.objects;
DROP POLICY IF EXISTS "verification-docs: owner read"   ON storage.objects;
DROP POLICY IF EXISTS "verification-docs: owner delete" ON storage.objects;

-- ── avatars bucket ────────────────────────────────────────────────────────────
-- Path convention: avatars/{user_id}/avatar.<ext>
-- The first path segment must equal the authenticated user's ID.

CREATE POLICY "avatars: public read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars: owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── qr-logos bucket ───────────────────────────────────────────────────────────
-- Path convention: qr-logos/{owner_user_id}/{qr_id}/logo.<ext>
-- First segment must equal the owner's user ID.

CREATE POLICY "qr-logos: public read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'qr-logos');

CREATE POLICY "qr-logos: owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'qr-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "qr-logos: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'qr-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "qr-logos: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'qr-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── verification-docs bucket ──────────────────────────────────────────────────
-- Path convention: verification-docs/{user_id}/{filename}
-- Only the submitting user can upload and read their own docs.
-- Admin reads are done via service role (bypasses RLS).

CREATE POLICY "verification-docs: owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "verification-docs: owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "verification-docs: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
