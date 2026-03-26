-- ================================================
-- Pricing Tiers & User Credits System
-- ================================================

-- 1. Create pricing_tiers table (admin-configurable)
CREATE TABLE pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_credits INT NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_bundle BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pricing_tiers_edition ON pricing_tiers(edition_id);

-- 2. Create user_credits table
CREATE TABLE user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  edition_id UUID NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES pricing_tiers(id),
  photo_credits INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, edition_id)
);

CREATE INDEX idx_user_credits_user ON user_credits(user_id);
CREATE INDEX idx_user_credits_edition ON user_credits(edition_id);

-- 3. Alter payments table: make submission_id nullable, add tier_id
ALTER TABLE payments ALTER COLUMN submission_id DROP NOT NULL;
ALTER TABLE payments ADD COLUMN tier_id UUID REFERENCES pricing_tiers(id) ON DELETE SET NULL;

-- 4. RLS policies for pricing_tiers
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pricing tiers"
  ON pricing_tiers FOR SELECT USING (true);

CREATE POLICY "Admins can insert pricing tiers"
  ON pricing_tiers FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update pricing tiers"
  ON pricing_tiers FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete pricing tiers"
  ON pricing_tiers FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. RLS policies for user_credits
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
  ON user_credits FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Credits are inserted by the capture edge function (service role bypasses RLS)
-- This policy allows the client as a fallback
CREATE POLICY "Users can insert own credits"
  ON user_credits FOR INSERT WITH CHECK (user_id = auth.uid());
