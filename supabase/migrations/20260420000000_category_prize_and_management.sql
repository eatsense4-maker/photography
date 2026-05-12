-- Per-category prize management + lifecycle fields
-- Adds prize metadata (cash amount, currency, label, full description) so admin can
-- fully manage what each category awards. Also adds is_active flag and per-category
-- submission_deadline override so categories can be opened/closed independently.

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS prize_amount NUMERIC(12,2) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS prize_currency TEXT DEFAULT 'EUR' NOT NULL,
  ADD COLUMN IF NOT EXISTS prize_label TEXT,
  ADD COLUMN IF NOT EXISTS prize_label_al TEXT,
  ADD COLUMN IF NOT EXISTS prize_description TEXT,
  ADD COLUMN IF NOT EXISTS prize_description_al TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL,
  ADD COLUMN IF NOT EXISTS submission_deadline TIMESTAMPTZ;

-- Backfill prize defaults for existing categories using slug heuristics so that
-- the admin starts from sensible values instead of zeros.
UPDATE categories
SET
  prize_amount = 1000,
  prize_label = COALESCE(prize_label, 'Cash prize + Trophy'),
  prize_label_al = COALESCE(prize_label_al, 'Çmim monetar + Trofe')
WHERE prize_amount = 0
  AND (slug ILIKE '%main-theme%' OR slug ILIKE '%press-news%' OR slug ILIKE '%press%news%');

UPDATE categories
SET
  prize_amount = 500,
  prize_label = COALESCE(prize_label, 'Cash prize'),
  prize_label_al = COALESCE(prize_label_al, 'Çmim monetar')
WHERE prize_amount = 0
  AND (
    slug ILIKE '%street%'
    OR slug ILIKE '%portrait%'
    OR slug ILIKE '%landscape%'
    OR slug ILIKE '%wild%'
  );

CREATE INDEX IF NOT EXISTS idx_categories_edition_active
  ON categories (edition_id, is_active, sort_order);

COMMENT ON COLUMN categories.prize_amount IS 'Headline cash prize amount for the category';
COMMENT ON COLUMN categories.prize_currency IS 'ISO currency code, e.g. EUR';
COMMENT ON COLUMN categories.prize_label IS 'Short prize label (e.g. "Cash prize + Trophy")';
COMMENT ON COLUMN categories.prize_description IS 'Full prize breakdown (1st/2nd/3rd, mentions, etc.) - free-form text';
COMMENT ON COLUMN categories.is_active IS 'When false, category is hidden from public submission flows';
COMMENT ON COLUMN categories.submission_deadline IS 'Optional per-category deadline override; falls back to edition.submission_deadline';
