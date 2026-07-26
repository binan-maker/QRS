-- ═══════════════════════════════════════════════════════════════════════════════
-- BinRo — 003_triggers.sql
-- Database triggers and maintenance functions.
-- IDEMPOTENT: functions use CREATE OR REPLACE; triggers use DROP IF EXISTS first.
--
-- Run AFTER 001_schema.sql and 002_rls.sql.
--
-- Contents:
--   1. set_updated_at()   — auto-update updated_at on every UPDATE
--   2. sync_username()    — keep users.username in sync with usernames table
--   3. cleanup_expired_notifications()  — purge expired + old notifications
--   4. increment_scan_count()           — increment counters on new qr_scans
--   5. decrement_scan_count_on_delete() — correct counters on scan delete
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. updated_at auto-stamp ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply to every table that has an updated_at column.

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trg_users_updated_at               ON public.users;
  DROP TRIGGER IF EXISTS trg_qr_codes_updated_at            ON public.qr_codes;
  DROP TRIGGER IF EXISTS trg_unified_qrs_updated_at         ON public.unified_qrs;
  DROP TRIGGER IF EXISTS trg_qr_comments_updated_at         ON public.qr_comments;
  DROP TRIGGER IF EXISTS trg_qr_reports_updated_at          ON public.qr_reports;
  DROP TRIGGER IF EXISTS trg_business_accounts_updated_at   ON public.business_accounts;
  DROP TRIGGER IF EXISTS trg_categories_updated_at          ON public.categories;
END $$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_qr_codes_updated_at
  BEFORE UPDATE ON public.qr_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_unified_qrs_updated_at
  BEFORE UPDATE ON public.unified_qrs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_qr_comments_updated_at
  BEFORE UPDATE ON public.qr_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_qr_reports_updated_at
  BEFORE UPDATE ON public.qr_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_business_accounts_updated_at
  BEFORE UPDATE ON public.business_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 2. sync username between users and usernames tables ──────────────────────
-- When a row is inserted into usernames, set users.username to match.
-- When a usernames row is deleted, clear users.username.

CREATE OR REPLACE FUNCTION public.sync_username_on_claim()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.users
  SET username = NEW.username, updated_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_username_on_release()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.users
  SET username = NULL, updated_at = NOW()
  WHERE id = OLD.user_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_claim_username  ON public.usernames;
DROP TRIGGER IF EXISTS trg_release_username ON public.usernames;

CREATE TRIGGER trg_claim_username
  AFTER INSERT ON public.usernames
  FOR EACH ROW EXECUTE FUNCTION public.sync_username_on_claim();

CREATE TRIGGER trg_release_username
  AFTER DELETE ON public.usernames
  FOR EACH ROW EXECUTE FUNCTION public.sync_username_on_release();

-- ─── 3. notification TTL cleanup ──────────────────────────────────────────────
-- Mirrors Firebase RTDB: notifications older than 30 days are auto-purged.
-- Call from a Supabase pg_cron job (or manually) at a convenient cadence.
--
--   SELECT cron.schedule('cleanup-notifications', '0 3 * * *',
--     'SELECT public.cleanup_expired_notifications()');
--
-- Note: pg_cron must be enabled in the Supabase dashboard first.

CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete explicitly expired notifications
  DELETE FROM public.notifications
  WHERE expires_at IS NOT NULL AND expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Also delete any notification older than 30 days (TTL fallback)
  DELETE FROM public.notifications
  WHERE expires_at IS NULL AND created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;

  RETURN deleted_count;
END;
$$;

-- ─── 4. scan counter increment ────────────────────────────────────────────────
-- Keeps the denormalized scan_count columns on qr_codes / unified_qrs in sync
-- with actual rows in qr_scans. Runs in SECURITY DEFINER so it can bypass RLS.

CREATE OR REPLACE FUNCTION public.increment_scan_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.qr_code_id IS NOT NULL THEN
    UPDATE public.qr_codes
    SET scan_count = scan_count + 1, updated_at = NOW()
    WHERE id = NEW.qr_code_id AND scan_count_frozen = FALSE;
  END IF;

  IF NEW.unified_qr_id IS NOT NULL THEN
    UPDATE public.unified_qrs
    SET scan_count = scan_count + 1, updated_at = NOW()
    WHERE id = NEW.unified_qr_id;
  END IF;

  IF NEW.guard_link_id IS NOT NULL THEN
    UPDATE public.guard_links
    SET scan_count = scan_count + 1
    WHERE id = NEW.guard_link_id;
  END IF;

  IF NEW.standard_link_id IS NOT NULL THEN
    UPDATE public.standard_links
    SET scan_count = scan_count + 1
    WHERE id = NEW.standard_link_id;
  END IF;

  -- Track per-user scan count
  IF NEW.user_id IS NOT NULL THEN
    UPDATE public.users
    SET scan_count = scan_count + 1, updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_qr_scans_increment_count ON public.qr_scans;

CREATE TRIGGER trg_qr_scans_increment_count
  AFTER INSERT ON public.qr_scans
  FOR EACH ROW EXECUTE FUNCTION public.increment_scan_count();

-- ─── 5. scan counter decrement on delete ─────────────────────────────────────
-- Correct counters if a scan row is deleted (e.g. GDPR erasure).

CREATE OR REPLACE FUNCTION public.decrement_scan_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.qr_code_id IS NOT NULL THEN
    UPDATE public.qr_codes
    SET scan_count = GREATEST(0, scan_count - 1), updated_at = NOW()
    WHERE id = OLD.qr_code_id;
  END IF;

  IF OLD.unified_qr_id IS NOT NULL THEN
    UPDATE public.unified_qrs
    SET scan_count = GREATEST(0, scan_count - 1), updated_at = NOW()
    WHERE id = OLD.unified_qr_id;
  END IF;

  IF OLD.guard_link_id IS NOT NULL THEN
    UPDATE public.guard_links
    SET scan_count = GREATEST(0, scan_count - 1)
    WHERE id = OLD.guard_link_id;
  END IF;

  IF OLD.standard_link_id IS NOT NULL THEN
    UPDATE public.standard_links
    SET scan_count = GREATEST(0, scan_count - 1)
    WHERE id = OLD.standard_link_id;
  END IF;

  IF OLD.user_id IS NOT NULL THEN
    UPDATE public.users
    SET scan_count = GREATEST(0, scan_count - 1), updated_at = NOW()
    WHERE id = OLD.user_id;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_qr_scans_decrement_count ON public.qr_scans;

CREATE TRIGGER trg_qr_scans_decrement_count
  AFTER DELETE ON public.qr_scans
  FOR EACH ROW EXECUTE FUNCTION public.decrement_scan_count();

-- ─── 6. comment count on qr_codes / unified_qrs ───────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.qr_code_id IS NOT NULL THEN
    UPDATE public.qr_codes
    SET comment_count = comment_count + 1, updated_at = NOW()
    WHERE id = NEW.qr_code_id;
  END IF;

  IF NEW.unified_qr_id IS NOT NULL THEN
    -- unified_qrs doesn't have a comment_count column currently;
    -- add one if you need it:
    -- UPDATE public.unified_qrs SET comment_count = comment_count + 1 WHERE id = NEW.unified_qr_id;
    NULL;
  END IF;

  UPDATE public.users
  SET comment_count = comment_count + 1, updated_at = NOW()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.qr_code_id IS NOT NULL THEN
    UPDATE public.qr_codes
    SET comment_count = GREATEST(0, comment_count - 1), updated_at = NOW()
    WHERE id = OLD.qr_code_id;
  END IF;

  UPDATE public.users
  SET comment_count = GREATEST(0, comment_count - 1), updated_at = NOW()
  WHERE id = OLD.user_id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_qr_comments_increment_count ON public.qr_comments;
DROP TRIGGER IF EXISTS trg_qr_comments_decrement_count ON public.qr_comments;

CREATE TRIGGER trg_qr_comments_increment_count
  AFTER INSERT ON public.qr_comments
  FOR EACH ROW EXECUTE FUNCTION public.increment_comment_count();

CREATE TRIGGER trg_qr_comments_decrement_count
  AFTER DELETE ON public.qr_comments
  FOR EACH ROW EXECUTE FUNCTION public.decrement_comment_count();

-- ─── 7. comment_likes counter on qr_comments ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.qr_comments
  SET likes = likes + 1
  WHERE id = NEW.comment_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.qr_comments
  SET likes = GREATEST(0, likes - 1)
  WHERE id = OLD.comment_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_comment_likes_increment ON public.comment_likes;
DROP TRIGGER IF EXISTS trg_comment_likes_decrement ON public.comment_likes;

CREATE TRIGGER trg_comment_likes_increment
  AFTER INSERT ON public.comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.increment_like_count();

CREATE TRIGGER trg_comment_likes_decrement
  AFTER DELETE ON public.comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.decrement_like_count();

-- ─── 8. creator_follows counter on users ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_following_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.users
  SET following_count = following_count + 1, updated_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_following_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.users
  SET following_count = GREATEST(0, following_count - 1), updated_at = NOW()
  WHERE id = OLD.user_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_creator_follows_increment ON public.creator_follows;
DROP TRIGGER IF EXISTS trg_creator_follows_decrement ON public.creator_follows;

CREATE TRIGGER trg_creator_follows_increment
  AFTER INSERT ON public.creator_follows
  FOR EACH ROW EXECUTE FUNCTION public.increment_following_count();

CREATE TRIGGER trg_creator_follows_decrement
  AFTER DELETE ON public.creator_follows
  FOR EACH ROW EXECUTE FUNCTION public.decrement_following_count();

-- ─── 9. friends_count counter on users ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_friends_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'friends' THEN
    UPDATE public.users SET friends_count = friends_count + 1, updated_at = NOW() WHERE id = NEW.user_id;
    UPDATE public.users SET friends_count = friends_count + 1, updated_at = NOW() WHERE id = NEW.friend_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'friends' AND NEW.status = 'friends' THEN
      UPDATE public.users SET friends_count = friends_count + 1, updated_at = NOW() WHERE id = NEW.user_id;
      UPDATE public.users SET friends_count = friends_count + 1, updated_at = NOW() WHERE id = NEW.friend_id;
    ELSIF OLD.status = 'friends' AND NEW.status != 'friends' THEN
      UPDATE public.users SET friends_count = GREATEST(0, friends_count - 1), updated_at = NOW() WHERE id = NEW.user_id;
      UPDATE public.users SET friends_count = GREATEST(0, friends_count - 1), updated_at = NOW() WHERE id = NEW.friend_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'friends' THEN
    UPDATE public.users SET friends_count = GREATEST(0, friends_count - 1), updated_at = NOW() WHERE id = OLD.user_id;
    UPDATE public.users SET friends_count = GREATEST(0, friends_count - 1), updated_at = NOW() WHERE id = OLD.friend_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_user_friends_count ON public.user_friends;

CREATE TRIGGER trg_user_friends_count
  AFTER INSERT OR UPDATE OR DELETE ON public.user_friends
  FOR EACH ROW EXECUTE FUNCTION public.update_friends_count();

-- ─── 10. Utility: recompute all counters from scratch ─────────────────────────
-- Call after a bulk migration to bring denormalized counters up to date:
--   SELECT public.recompute_all_counters();

CREATE OR REPLACE FUNCTION public.recompute_all_counters()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- scan_count on qr_codes
  UPDATE public.qr_codes qc
  SET scan_count = (
    SELECT COUNT(*) FROM public.qr_scans WHERE qr_code_id = qc.id
  );

  -- scan_count on unified_qrs
  UPDATE public.unified_qrs uq
  SET scan_count = (
    SELECT COUNT(*) FROM public.qr_scans WHERE unified_qr_id = uq.id
  );

  -- scan_count on guard_links
  UPDATE public.guard_links gl
  SET scan_count = (
    SELECT COUNT(*) FROM public.qr_scans WHERE guard_link_id = gl.id
  );

  -- scan_count on standard_links
  UPDATE public.standard_links sl
  SET scan_count = (
    SELECT COUNT(*) FROM public.qr_scans WHERE standard_link_id = sl.id
  );

  -- comment_count on qr_codes
  UPDATE public.qr_codes qc
  SET comment_count = (
    SELECT COUNT(*) FROM public.qr_comments
    WHERE qr_code_id = qc.id AND is_deleted = FALSE
  );

  -- likes on qr_comments
  UPDATE public.qr_comments c
  SET likes = (
    SELECT COUNT(*) FROM public.comment_likes WHERE comment_id = c.id
  );

  -- scan_count, comment_count, following_count, friends_count on users
  UPDATE public.users u
  SET
    scan_count = (
      SELECT COUNT(*) FROM public.qr_scans WHERE user_id = u.id
    ),
    comment_count = (
      SELECT COUNT(*) FROM public.qr_comments WHERE user_id = u.id AND is_deleted = FALSE
    ),
    following_count = (
      SELECT COUNT(*) FROM public.creator_follows WHERE user_id = u.id
    ),
    friends_count = (
      SELECT COUNT(*) FROM public.user_friends WHERE user_id = u.id AND status = 'friends'
    );

  RETURN 'All counters recomputed successfully.';
END;
$$;
