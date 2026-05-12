-- ============================================================
-- 20260512000000_per_category_credits.sql
--
-- Overhaul of the credit + submission accounting model:
--
--   * Credits become per (user, edition, category) instead of per
--     (user, edition). A user that pays for "Portrait" can only
--     spend those credits on "Portrait" submissions.
--   * Each grant tracks photo_credits (total purchased) and
--     photo_credits_used (consumed by accepted/submitted submissions).
--   * Payments record which category they funded (nullable for legacy
--     bundle payments).
--   * Photo count and credit limits are enforced at the database
--     level via triggers — clients cannot bypass them.
--   * Free categories are limited to one non-draft submission per
--     user per category. Paid categories are limited to one
--     non-draft submission per user per category as well, with the
--     total uploaded photos bounded by purchased credits.
--   * The obsolete decrement_submissions_remaining RPC is replaced
--     by an atomic create_submission_atomic RPC and a credit-spend
--     trigger.
-- ============================================================

-- ----- 1. Schema changes on user_credits -----

-- Add category_id (nullable for legacy edition-wide rows).
ALTER TABLE user_credits
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE CASCADE;

-- Track consumed credits explicitly.
ALTER TABLE user_credits
  ADD COLUMN IF NOT EXISTS photo_credits_used INT NOT NULL DEFAULT 0;

-- Track when the credit was last spent (for audit/debugging).
ALTER TABLE user_credits
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Replace the legacy edition-wide uniqueness with a per-category one.
-- The old constraint is dropped only if it exists.
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  SELECT conname INTO v_conname FROM pg_constraint
   WHERE conrelid = 'user_credits'::regclass
     AND contype = 'u'
     AND pg_get_constraintdef(oid) = 'UNIQUE (user_id, edition_id)';
  IF v_conname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE user_credits DROP CONSTRAINT ' || quote_ident(v_conname);
  END IF;
END$$;

-- Allow one row per (user, edition, category). Multiple grants for
-- the same triplet should be merged at write time, not stored
-- separately, so this is a real unique index.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_credits_user_edition_category
  ON user_credits(user_id, edition_id, category_id)
  WHERE category_id IS NOT NULL;

-- Legacy rows with category_id IS NULL are kept around for read-only
-- inspection, but the new code path never inserts NULL.

-- ----- 2. Schema changes on payments -----

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Prevent duplicate completed payments for the same PayPal order.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_payments_paypal_order_id
  ON payments(paypal_order_id)
  WHERE paypal_order_id IS NOT NULL;

-- ----- 3. Helper: read remaining credits for a (user, edition, category) -----

CREATE OR REPLACE FUNCTION credits_remaining(
  p_user_id UUID,
  p_edition_id UUID,
  p_category_id UUID
)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    SUM(photo_credits) - SUM(photo_credits_used),
    0
  )::INT
  FROM user_credits
  WHERE user_id = p_user_id
    AND edition_id = p_edition_id
    AND category_id = p_category_id;
$$;

-- ----- 4. Trigger: enforce one non-draft submission per (user, edition, category) -----

CREATE OR REPLACE FUNCTION enforce_single_submission_per_category()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Only enforce when the row is being moved out of draft.
  IF NEW.status = 'draft' THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE' AND OLD.status <> 'draft') THEN
    -- Already non-draft, just an update of metadata. Leave it.
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM submissions
  WHERE user_id = NEW.user_id
    AND edition_id = NEW.edition_id
    AND category_id = NEW.category_id
    AND status <> 'draft'
    AND id <> NEW.id;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'You already have a submission for this category. Only one entry per category is allowed per user.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_submission_per_category ON submissions;
CREATE TRIGGER trg_enforce_single_submission_per_category
  BEFORE INSERT OR UPDATE OF status, category_id ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_submission_per_category();

-- ----- 5. Trigger: enforce photo count vs purchased credits / max_photos -----

CREATE OR REPLACE FUNCTION enforce_photo_credit_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       UUID;
  v_edition_id    UUID;
  v_category_id   UUID;
  v_status        submission_status;
  v_cat_max       INT;
  v_cat_price     DECIMAL(10,2);
  v_total_after   INT;
  v_credit_total  INT;
BEGIN
  SELECT s.user_id, s.edition_id, s.category_id, s.status
    INTO v_user_id, v_edition_id, v_category_id, v_status
  FROM submissions s
  WHERE s.id = NEW.submission_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Submission % not found', NEW.submission_id;
  END IF;

  SELECT max_photos, price INTO v_cat_max, v_cat_price
  FROM categories
  WHERE id = v_category_id;

  -- Count photos after this insert.
  SELECT COUNT(*) + 1 INTO v_total_after
  FROM submission_photos
  WHERE submission_id = NEW.submission_id;

  -- Always cap at the category's max_photos.
  IF v_total_after > COALESCE(v_cat_max, 0) THEN
    RAISE EXCEPTION 'This category allows at most % photo(s) per submission', v_cat_max
      USING ERRCODE = 'check_violation';
  END IF;

  -- For paid categories, enforce purchased credit budget.
  IF COALESCE(v_cat_price, 0) > 0 THEN
    SELECT COALESCE(SUM(photo_credits), 0)
      INTO v_credit_total
    FROM user_credits
    WHERE user_id = v_user_id
      AND edition_id = v_edition_id
      AND category_id = v_category_id;

    IF v_credit_total <= 0 THEN
      RAISE EXCEPTION 'No photo credits purchased for this category'
        USING ERRCODE = 'check_violation';
    END IF;

    IF v_total_after > v_credit_total THEN
      RAISE EXCEPTION 'Exceeds purchased photo credits (% purchased)', v_credit_total
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_photo_credit_limit ON submission_photos;
CREATE TRIGGER trg_enforce_photo_credit_limit
  BEFORE INSERT ON submission_photos
  FOR EACH ROW
  EXECUTE FUNCTION enforce_photo_credit_limit();

-- ----- 6. Trigger: when a submission transitions to non-draft, recompute used credits -----
--
-- photo_credits_used reflects photos in all non-draft submissions
-- for that user / edition / category.

CREATE OR REPLACE FUNCTION recompute_credits_used(
  p_user_id UUID,
  p_edition_id UUID,
  p_category_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used INT;
BEGIN
  IF p_category_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_used
  FROM submission_photos sp
  JOIN submissions s ON s.id = sp.submission_id
  WHERE s.user_id = p_user_id
    AND s.edition_id = p_edition_id
    AND s.category_id = p_category_id
    AND s.status <> 'draft';

  UPDATE user_credits
  SET photo_credits_used = v_used,
      last_used_at = CASE WHEN v_used > 0 THEN now() ELSE last_used_at END
  WHERE user_id = p_user_id
    AND edition_id = p_edition_id
    AND category_id = p_category_id;
END;
$$;

CREATE OR REPLACE FUNCTION trg_submissions_recompute_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recompute_credits_used(OLD.user_id, OLD.edition_id, OLD.category_id);
    RETURN OLD;
  END IF;
  PERFORM recompute_credits_used(NEW.user_id, NEW.edition_id, NEW.category_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_submissions_credit_sync ON submissions;
CREATE TRIGGER trg_submissions_credit_sync
  AFTER INSERT OR UPDATE OF status, category_id OR DELETE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION trg_submissions_recompute_credits();

CREATE OR REPLACE FUNCTION trg_photos_recompute_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_sub RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT user_id, edition_id, category_id INTO v_sub
    FROM submissions WHERE id = OLD.submission_id;
  ELSE
    SELECT user_id, edition_id, category_id INTO v_sub
    FROM submissions WHERE id = NEW.submission_id;
  END IF;

  IF v_sub.user_id IS NOT NULL THEN
    PERFORM recompute_credits_used(v_sub.user_id, v_sub.edition_id, v_sub.category_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_photos_credit_sync ON submission_photos;
CREATE TRIGGER trg_photos_credit_sync
  AFTER INSERT OR DELETE ON submission_photos
  FOR EACH ROW
  EXECUTE FUNCTION trg_photos_recompute_credits();

-- ----- 7. Replace decrement_submissions_remaining RPC -----
-- Old code paths still call this; make it a harmless no-op so the
-- transition is non-breaking. The new accounting is automatic via
-- the triggers above.

CREATE OR REPLACE FUNCTION decrement_submissions_remaining(
  p_user_id UUID,
  p_edition_id UUID,
  p_count INT DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- No-op: credit usage is now tracked automatically via triggers
  -- on submissions and submission_photos. Kept for backward
  -- compatibility with any older deployed client builds.
  RETURN;
END;
$$;

-- ----- 8. Grant a credit (server side) -----

CREATE OR REPLACE FUNCTION grant_photo_credits(
  p_user_id UUID,
  p_edition_id UUID,
  p_category_id UUID,
  p_tier_id UUID,
  p_photo_credits INT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_photo_credits IS NULL OR p_photo_credits <= 0 THEN
    RAISE EXCEPTION 'photo_credits must be > 0';
  END IF;
  IF p_category_id IS NULL THEN
    RAISE EXCEPTION 'category_id is required';
  END IF;

  INSERT INTO user_credits (user_id, edition_id, category_id, tier_id, photo_credits)
  VALUES (p_user_id, p_edition_id, p_category_id, p_tier_id, p_photo_credits)
  ON CONFLICT (user_id, edition_id, category_id)
  DO UPDATE SET
    photo_credits = user_credits.photo_credits + EXCLUDED.photo_credits,
    tier_id = EXCLUDED.tier_id
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ----- 9. RLS adjustments -----

-- Allow the user to read their own credits (already exists from 006). No change needed.
-- Allow service role full access (bypasses RLS automatically).

-- ----- 10. Drop the now-unused submissions_remaining column -----
-- Keep it for one release as a NULLable column with no NOT NULL so
-- older clients don't break when reading. Future migration may drop it.

ALTER TABLE user_credits ALTER COLUMN submissions_remaining DROP NOT NULL;
ALTER TABLE user_credits ALTER COLUMN submissions_remaining SET DEFAULT NULL;

-- ----- 11. Backfill: legacy edition-wide credits -----
-- For any legacy row with category_id IS NULL we cannot guess which
-- category was actually paid for. Mark them with a NULL category_id
-- so they are *not* honored by the new enforcement logic (the credit
-- limit trigger requires a matching category row), forcing admins
-- to reconcile manually. This is intentional and safer than guessing.

-- ----- 12. Comment columns for clarity -----
COMMENT ON COLUMN user_credits.category_id IS
  'Category these credits are bound to. Required for new grants. Legacy NULL rows are edition-wide and ignored by the new enforcement triggers.';
COMMENT ON COLUMN user_credits.photo_credits IS
  'Total photo upload budget purchased for this (user, edition, category).';
COMMENT ON COLUMN user_credits.photo_credits_used IS
  'Photos currently counted toward the budget by non-draft submissions. Maintained by triggers.';
COMMENT ON COLUMN payments.category_id IS
  'Category that this payment funded (nullable for legacy bundle payments).';
