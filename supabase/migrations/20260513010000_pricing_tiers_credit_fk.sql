-- ============================================================
-- 20260513010000: Keep user credits when pricing tiers change
--
-- user_credits are historical entitlements. A pricing tier may be edited
-- or removed from the admin UI after users have purchased credits, but those
-- credits must remain usable and auditable.
-- ============================================================

ALTER TABLE user_credits
  ALTER COLUMN tier_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'user_credits'::regclass
      AND conname = 'user_credits_tier_id_fkey'
  ) THEN
    ALTER TABLE user_credits DROP CONSTRAINT user_credits_tier_id_fkey;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'user_credits'::regclass
      AND conname = 'user_credits_tier_id_fkey'
  ) THEN
    ALTER TABLE user_credits
      ADD CONSTRAINT user_credits_tier_id_fkey
      FOREIGN KEY (tier_id)
      REFERENCES pricing_tiers(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_credits_tier
  ON user_credits(tier_id);
