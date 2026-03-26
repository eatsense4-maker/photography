-- ============================================================
-- 007: Per-photo review status + submission limits
-- ============================================================

-- 1) Add review status to individual photos
CREATE TYPE photo_review_status AS ENUM ('pending', 'approved', 'rejected');

ALTER TABLE submission_photos
  ADD COLUMN status photo_review_status NOT NULL DEFAULT 'pending',
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN review_note TEXT;

-- 2) Add submissions_remaining to user_credits so we can track spam
--    This tracks how many *more* submissions the user can create for this edition.
--    It starts at the number of paid categories × 1 by default, or can be set by admin.
ALTER TABLE user_credits
  ADD COLUMN submissions_remaining INT NOT NULL DEFAULT 0;

-- 3) Allow admins to update submission_photos (for review status)
CREATE POLICY "Admins can update submission photos"
  ON submission_photos FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4) Allow admins to update user_credits (for manual adjustments)
CREATE POLICY "Admins can update user credits"
  ON user_credits FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5) Index for quick lookups
CREATE INDEX idx_submission_photos_status ON submission_photos(status);
