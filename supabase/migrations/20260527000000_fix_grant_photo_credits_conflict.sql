-- ============================================================
-- 20260527000000_fix_grant_photo_credits_conflict.sql
--
-- BUGFIX: paid users were charged but received no photo credits.
--
-- 20260512000000_per_category_credits.sql replaced the old full
-- UNIQUE(user_id, edition_id) constraint with a PARTIAL unique index:
--
--   CREATE UNIQUE INDEX uniq_user_credits_user_edition_category
--     ON user_credits(user_id, edition_id, category_id)
--     WHERE category_id IS NOT NULL;
--
-- The grant_photo_credits RPC, however, used bare conflict inference:
--
--   ON CONFLICT (user_id, edition_id, category_id) DO UPDATE ...
--
-- PostgreSQL cannot infer a PARTIAL unique index for ON CONFLICT unless
-- the statement repeats the index predicate. So the RPC raised
-- "there is no unique or exclusion constraint matching the ON CONFLICT
-- specification" on every call. The capture-paypal-order edge function
-- caught and logged that error but still returned success — so payment
-- was captured and recorded, yet no user_credits row was ever written,
-- leaving the buyer unable to submit.
--
-- This migration:
--   1. Rewrites grant_photo_credits to include the index predicate.
--   2. Backfills credits for already-affected completed payments that
--      have no matching user_credits row (single-category tiers only;
--      bundles are flagged for manual reconciliation).
-- ============================================================

-- ----- 1. Fix the RPC: match the partial unique index predicate -----

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
  -- The WHERE predicate is required so PostgreSQL can infer the
  -- partial unique index uniq_user_credits_user_edition_category.
  ON CONFLICT (user_id, edition_id, category_id) WHERE category_id IS NOT NULL
  DO UPDATE SET
    photo_credits = user_credits.photo_credits + EXCLUDED.photo_credits,
    tier_id = EXCLUDED.tier_id
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ----- 2. Backfill credits for already-affected payments -----
-- Reconstruct missing user_credits rows from completed, non-bundle
-- payments. edition_id and photo_credits come from the linked pricing
-- tier. Bundles store only the first granted category on the payment
-- row, so they cannot be safely reconstructed here and are left for
-- manual admin reconciliation.

INSERT INTO user_credits (user_id, edition_id, category_id, tier_id, photo_credits)
SELECT
  p.user_id,
  pt.edition_id,
  p.category_id,
  p.tier_id,
  pt.photo_credits
FROM payments p
JOIN pricing_tiers pt ON pt.id = p.tier_id
WHERE p.status = 'completed'
  AND p.tier_id IS NOT NULL
  AND p.category_id IS NOT NULL
  AND COALESCE(pt.is_bundle, false) = false
  AND pt.photo_credits > 0
  AND NOT EXISTS (
    SELECT 1 FROM user_credits uc
    WHERE uc.user_id = p.user_id
      AND uc.edition_id = pt.edition_id
      AND uc.category_id = p.category_id
  )
ON CONFLICT (user_id, edition_id, category_id) WHERE category_id IS NOT NULL
DO NOTHING;
