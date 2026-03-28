ALTER TABLE editions
ADD COLUMN IF NOT EXISTS results_published boolean NOT NULL DEFAULT false;
