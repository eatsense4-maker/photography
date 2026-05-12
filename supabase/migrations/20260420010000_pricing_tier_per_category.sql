-- Per-category pricing tier scoping
-- pricing_tiers.category_id NULL = applies to every paid category in the edition (legacy behaviour).
-- pricing_tiers.category_id NOT NULL = tier is offered ONLY for that category.

ALTER TABLE pricing_tiers
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_pricing_tiers_category
  ON pricing_tiers (category_id);

CREATE INDEX IF NOT EXISTS idx_pricing_tiers_edition_category
  ON pricing_tiers (edition_id, category_id, sort_order);

COMMENT ON COLUMN pricing_tiers.category_id IS
  'When set, the tier is only valid for that category. NULL means available for all paid categories in the edition.';
