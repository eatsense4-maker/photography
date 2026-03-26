-- ============================================================
-- Migration 010: Photo-level jury scoring system
-- Jury scores individual approved photos, not whole submissions.
-- ============================================================

-- Add photo_id column to scores table (nullable initially for migration)
ALTER TABLE scores ADD COLUMN photo_id UUID REFERENCES submission_photos(id) ON DELETE CASCADE;

-- Create index for photo-level queries
CREATE INDEX idx_scores_photo ON scores(photo_id);

-- Add a unique constraint for one score per jury per photo per phase
-- (We keep the old submission-level unique constraint for backward compat)
ALTER TABLE scores ADD CONSTRAINT scores_photo_jury_phase_unique 
  UNIQUE (photo_id, jury_id, phase);

-- Enable realtime on scores table for live admin monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE scores;
