-- Allow users to delete their own submissions that are in draft or submitted status
-- (not under_review, accepted, rejected, or disqualified)
CREATE POLICY "Users can delete own draft or submitted submissions"
  ON submissions FOR DELETE USING (
    user_id = auth.uid()
    AND status IN ('draft', 'submitted')
  );

-- Allow users to delete their own submission photos (expand from draft-only to also submitted)
DROP POLICY IF EXISTS "Users can delete own photos" ON submission_photos;
CREATE POLICY "Users can delete own photos"
  ON submission_photos FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM submissions s
      WHERE s.id = submission_id
        AND s.user_id = auth.uid()
        AND s.status IN ('draft', 'submitted')
    )
  );
