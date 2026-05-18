-- ============================================================
-- 20260513040000: Show all photos after results are published
--
-- Public visibility is controlled by edition publication/results publication,
-- not by per-photo review status. This keeps unpublished Admin Results events
-- private while allowing all photos from published-results events to appear.
-- ============================================================

DROP POLICY IF EXISTS "Submission photos: public read results-published gallery rows" ON submission_photos;
CREATE POLICY "Submission photos: public read results-published gallery rows"
  ON submission_photos FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM submissions s
      JOIN editions e ON e.id = s.edition_id
      WHERE s.id = submission_photos.submission_id
        AND s.status IN ('submitted', 'under_review', 'accepted')
        AND e.published = true
        AND e.results_published = true
    )
  );
