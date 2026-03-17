-- ================================================
-- Fokus Award — Supabase Database Schema
-- Run this in the Supabase SQL editor
-- ================================================

-- ====================
-- 1. Custom Types
-- ====================
CREATE TYPE user_role AS ENUM ('user', 'jury', 'admin');
CREATE TYPE edition_status AS ENUM ('draft', 'open', 'judging', 'completed');
CREATE TYPE submission_status AS ENUM ('draft', 'submitted', 'under_review', 'accepted', 'rejected', 'disqualified');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'refunded', 'failed');
CREATE TYPE scoring_phase AS ENUM ('phase1', 'phase2');
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error');

-- ====================
-- 2. Profiles
-- ====================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role user_role NOT NULL DEFAULT 'user',
  avatar_url TEXT,
  country TEXT,
  bio TEXT,
  website TEXT,
  instagram TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to auto-create profile on sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ====================
-- 3. Editions
-- ====================
CREATE TABLE editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  year INT NOT NULL,
  description TEXT,
  theme TEXT,
  theme_description TEXT,
  hero_image_url TEXT,
  status edition_status NOT NULL DEFAULT 'draft',
  submission_start TIMESTAMPTZ,
  submission_end TIMESTAMPTZ,
  scoring_phase scoring_phase DEFAULT 'phase1',
  rules TEXT,
  prizes TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ====================
-- 4. Categories
-- ====================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  max_photos INT NOT NULL DEFAULT 10,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ====================
-- 5. Submissions
-- ====================
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  edition_id UUID NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  status submission_status NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for common queries
CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_submissions_edition ON submissions(edition_id);
CREATE INDEX idx_submissions_status ON submissions(status);

-- ====================
-- 6. Submission Photos
-- ====================
CREATE TABLE submission_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  thumbnail_key TEXT,
  original_filename TEXT,
  mime_type TEXT,
  file_size INT,
  width INT,
  height INT,
  exif_data JSONB,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_photos_submission ON submission_photos(submission_id);

-- ====================
-- 7. Payments
-- ====================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status payment_status NOT NULL DEFAULT 'pending',
  paypal_order_id TEXT,
  paypal_capture_id TEXT,
  paypal_payer_email TEXT,
  metadata JSONB,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_submission ON payments(submission_id);

-- ====================
-- 8. Jury Assignments
-- ====================
CREATE TABLE jury_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jury_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  edition_id UUID NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(jury_id, edition_id, category_id)
);

-- ====================
-- 9. Scores
-- ====================
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  jury_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  phase scoring_phase NOT NULL DEFAULT 'phase1',
  score INT CHECK (score >= 1 AND score <= 10),
  rank INT,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(submission_id, jury_id, phase)
);

CREATE INDEX idx_scores_submission ON scores(submission_id);
CREATE INDEX idx_scores_jury ON scores(jury_id);

-- ====================
-- 10. Notifications
-- ====================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);

-- ====================
-- 11. Pages (CMS)
-- ====================
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title_en TEXT,
  title_al TEXT,
  content_en TEXT,
  content_al TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ====================
-- 12. Partners
-- ====================
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ====================
-- 13. Certificates
-- ====================
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  edition_id UUID NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'winner', 'honorable_mention', 'participation'
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ====================
-- 14. Updated_at Trigger
-- ====================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_editions_updated_at
  BEFORE UPDATE ON editions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_submissions_updated_at
  BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_scores_updated_at
  BEFORE UPDATE ON scores FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE jury_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- EDITIONS (public read, admin write)
CREATE POLICY "Public can view published editions"
  ON editions FOR SELECT USING (published = true OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage editions"
  ON editions FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- CATEGORIES (public read, admin write)
CREATE POLICY "Public can view categories"
  ON categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- SUBMISSIONS
CREATE POLICY "Users can view own submissions"
  ON submissions FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'jury'))
  );

CREATE POLICY "Users can create submissions"
  ON submissions FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own draft submissions"
  ON submissions FOR UPDATE USING (
    (user_id = auth.uid() AND status = 'draft') OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- SUBMISSION PHOTOS
CREATE POLICY "Users can view own photos"
  ON submission_photos FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM submissions s
      WHERE s.id = submission_id AND (
        s.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'jury'))
      )
    )
  );

CREATE POLICY "Users can add photos to own submissions"
  ON submission_photos FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM submissions s
      WHERE s.id = submission_id AND s.user_id = auth.uid() AND s.status = 'draft'
    )
  );

CREATE POLICY "Users can delete own photos"
  ON submission_photos FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM submissions s
      WHERE s.id = submission_id AND s.user_id = auth.uid() AND s.status = 'draft'
    )
  );

-- PAYMENTS
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can create payments"
  ON payments FOR INSERT WITH CHECK (user_id = auth.uid());

-- JURY ASSIGNMENTS
CREATE POLICY "Jury can view own assignments"
  ON jury_assignments FOR SELECT USING (
    jury_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage jury assignments"
  ON jury_assignments FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- SCORES
CREATE POLICY "Jury can view and manage own scores"
  ON scores FOR ALL USING (
    jury_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- NOTIFICATIONS
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE USING (user_id = auth.uid());

-- PAGES (public read, admin write)
CREATE POLICY "Public can read pages"
  ON pages FOR SELECT USING (true);

CREATE POLICY "Admins can manage pages"
  ON pages FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- PARTNERS (public read, admin write)
CREATE POLICY "Public can view partners"
  ON partners FOR SELECT USING (active = true);

CREATE POLICY "Admins can manage partners"
  ON partners FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- CERTIFICATES
CREATE POLICY "Users can view own certificates"
  ON certificates FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage certificates"
  ON certificates FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ================================================
-- Seed Data
-- ================================================

-- Default pages
INSERT INTO pages (slug, title_en, title_al) VALUES
  ('about', 'About IFFA', 'Rreth IFFA'),
  ('theme', 'Theme', 'Tema'),
  ('rules', 'Rules', 'Rregullat'),
  ('prizes', 'Prizes', 'Çmimet');

-- Enable Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
