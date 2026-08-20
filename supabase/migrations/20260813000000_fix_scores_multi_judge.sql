-- Drop the old submission-level unique constraint that blocks multi-judge, multi-photo scoring.
-- Migration 010 already added the correct photo-level constraint (scores_photo_jury_phase_unique).
-- Each jury member can now score every individual photo in their assigned categories.
ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_submission_id_jury_id_phase_key;
