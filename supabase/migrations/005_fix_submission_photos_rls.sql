-- Fix: allow inserting photos into both 'draft' and 'submitted' submissions.
-- The original policy only allowed INSERT when status = 'draft', but
-- NewSubmission creates the submission with status = 'submitted' in
-- the same transaction before uploading photos.

DROP POLICY IF EXISTS "Users can add photos to own submissions" ON submission_photos;

CREATE POLICY "Users can add photos to own submissions"
  ON submission_photos FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM submissions s
      WHERE s.id = submission_id
        AND s.user_id = auth.uid()
        AND s.status IN ('draft', 'submitted')
    )
  );

-- Also allow admins to insert photos (e.g. re-uploads, adjustments)
CREATE POLICY "Admins can add submission photos"
  ON submission_photos FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
