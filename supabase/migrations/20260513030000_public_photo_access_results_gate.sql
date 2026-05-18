-- ============================================================
-- 20260513030000: Public photo access follows results publishing
--
-- Public visitors should see submitted/accepted photos only after an edition's
-- results are published from Admin Results. Unpublished judging/results remain
-- hidden from unauthenticated users.
-- ============================================================

DROP POLICY IF EXISTS "Submissions: public read published gallery rows" ON submissions;
CREATE POLICY "Submissions: public read results-published gallery rows"
  ON submissions FOR SELECT
  TO anon, authenticated
  USING (
    status IN ('submitted', 'under_review', 'accepted')
    AND EXISTS (
      SELECT 1
      FROM editions e
      WHERE e.id = submissions.edition_id
        AND e.published = true
        AND e.results_published = true
    )
  );

DROP POLICY IF EXISTS "Submission photos: public read approved gallery rows" ON submission_photos;
CREATE POLICY "Submission photos: public read results-published gallery rows"
  ON submission_photos FOR SELECT
  TO anon, authenticated
  USING (
    status = 'approved'
    AND EXISTS (
      SELECT 1
      FROM submissions s
      JOIN editions e ON e.id = s.edition_id
      WHERE s.id = submission_photos.submission_id
        AND s.status IN ('submitted', 'under_review', 'accepted')
        AND e.published = true
        AND e.results_published = true
    )
  );
