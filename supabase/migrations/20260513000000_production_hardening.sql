-- ============================================================
-- 20260513000000: Production hardening
--   1. Lock down profiles SELECT (GDPR) + add public_profiles view
--   2. Public SELECT on scores for results-published editions
--   3. Persist `country` from sign-up metadata in handle_new_user
--   4. payments: CHECK amount > 0, UNIQUE paypal_capture_id
--   5. posts: updated_at trigger
--   6. email_queue + email_log tables (driven by DB triggers)
--   7. Notification + email triggers for major events
-- ============================================================

-- ---------------------------------------------------------------
-- 1. Profiles: restrict full-row read, expose a non-PII public view
-- ---------------------------------------------------------------

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Authenticated users see their own row; admins and jury see all.
CREATE POLICY "Profiles: self, admin, jury read"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'jury'))
  );

-- Anon can SELECT rows but only the non-PII columns (enforced by column GRANT below).
CREATE POLICY "Profiles: anon public columns"
  ON profiles FOR SELECT
  TO anon
  USING (true);

-- Strip default column access from anon, then grant only non-PII columns.
-- Any attempt to SELECT email / role as anon returns a permission error.
REVOKE SELECT ON profiles FROM anon;
GRANT SELECT (id, full_name, avatar_url, country, bio, website, instagram)
  ON profiles TO anon;

-- Convenience view for cases where the caller doesn't need to join via FK.
CREATE OR REPLACE VIEW public_profiles
WITH (security_invoker = false)
AS
SELECT
  id,
  full_name,
  avatar_url,
  country,
  bio,
  website,
  instagram
FROM profiles;

GRANT SELECT ON public_profiles TO anon, authenticated;

-- ---------------------------------------------------------------
-- 2. Scores: public read for results-published editions
-- ---------------------------------------------------------------

-- Existing policy "Jury can view and manage own scores" stays.
-- Add a separate SELECT-only policy for the public.
CREATE POLICY "Scores: public read for published results"
  ON scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM submissions s
      JOIN editions e ON e.id = s.edition_id
      WHERE s.id = scores.submission_id
        AND e.results_published = true
    )
  );

-- Public gallery/winners pages also need to read published submissions and
-- their approved photo rows. Keep the public surface narrow: no draft rows and
-- no unreviewed/rejected photo rows.
DROP POLICY IF EXISTS "Submissions: public read published gallery rows" ON submissions;
CREATE POLICY "Submissions: public read published gallery rows"
  ON submissions FOR SELECT
  TO anon, authenticated
  USING (
    status IN ('submitted', 'under_review', 'accepted')
    AND EXISTS (
      SELECT 1
      FROM editions e
      WHERE e.id = submissions.edition_id
        AND e.published = true
    )
  );

DROP POLICY IF EXISTS "Submission photos: public read approved gallery rows" ON submission_photos;
CREATE POLICY "Submission photos: public read approved gallery rows"
  ON submission_photos FOR SELECT
  TO anon, authenticated
  USING (
    status = 'approved'
    AND EXISTS (
      SELECT 1
      FROM submissions s
      JOIN editions e ON e.id = s.edition_id
      WHERE s.id = submission_photos.submission_id
        AND e.published = true
    )
  );

-- ---------------------------------------------------------------
-- 3. handle_new_user: persist `country` from auth metadata
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, country)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'country', '')
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
        country = COALESCE(EXCLUDED.country, profiles.country);

  -- Enqueue welcome email
  INSERT INTO email_queue (recipient_user_id, recipient_email, template, payload)
  VALUES (
    NEW.id,
    NEW.email,
    'welcome',
    jsonb_build_object('full_name', COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''))
  );

  RETURN NEW;
EXCEPTION
  -- Don't block sign-up if the queue table is unavailable mid-migration.
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------
-- 4. Payments: data integrity
-- ---------------------------------------------------------------

ALTER TABLE payments
  ADD CONSTRAINT payments_amount_positive CHECK (amount > 0);

ALTER TABLE payments
  ADD CONSTRAINT payments_paypal_capture_id_unique UNIQUE (paypal_capture_id);

-- Currency column on pricing_tiers so create-paypal-order never trusts the
-- client. Defaults to EUR for back-compat.
ALTER TABLE pricing_tiers
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'EUR'
    CHECK (currency IN ('EUR', 'USD', 'GBP', 'ALL'));

-- ---------------------------------------------------------------
-- 5. Posts: updated_at trigger (created via scripts/create-posts-table.sql,
--    may not exist if posts table is unmanaged; wrap in DO block).
-- ---------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'posts'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_posts_updated_at'
  ) THEN
    EXECUTE 'CREATE TRIGGER set_posts_updated_at
             BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at()';
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 6. Email queue + log
-- ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  template TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | sending | sent | failed
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_pending
  ON email_queue (scheduled_for)
  WHERE status = 'pending';

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Only admins can read the queue; service role bypasses RLS.
CREATE POLICY "email_queue admin read"
  ON email_queue FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  template TEXT NOT NULL,
  status TEXT NOT NULL, -- sent | failed | skipped
  provider_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_log admin read"
  ON email_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Helper: enqueue email (SECURITY DEFINER so triggers can use it)
CREATE OR REPLACE FUNCTION enqueue_email(
  p_user_id UUID,
  p_template TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
  v_id UUID;
BEGIN
  SELECT email INTO v_email FROM profiles WHERE id = p_user_id;
  IF v_email IS NULL THEN
    RETURN NULL;
  END IF;
  INSERT INTO email_queue (recipient_user_id, recipient_email, template, payload)
  VALUES (p_user_id, v_email, p_template, COALESCE(p_payload, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------
-- 7. Triggers for major events
-- ---------------------------------------------------------------

-- 7a. Submission status -> submitted: notify + email
CREATE OR REPLACE FUNCTION on_submission_submitted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'submitted'
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN

    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      NEW.user_id,
      'success',
      'Submission received',
      'Your submission has been received and is now awaiting review.',
      '/dashboard/submissions/' || NEW.id::text
    );

    PERFORM enqueue_email(
      NEW.user_id,
      'submission_received',
      jsonb_build_object(
        'submission_id', NEW.id,
        'submission_title', COALESCE(NEW.title, 'Your submission')
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_submission_submitted ON submissions;
CREATE TRIGGER trg_submission_submitted
  AFTER UPDATE OF status ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION on_submission_submitted();

-- 7b. Photo review status -> approved/rejected: notify owner + email
CREATE OR REPLACE FUNCTION on_photo_reviewed()
RETURNS TRIGGER AS $$
DECLARE
  v_owner UUID;
  v_sub_title TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('approved', 'rejected') THEN
    SELECT s.user_id, COALESCE(s.title, 'your submission')
      INTO v_owner, v_sub_title
      FROM submissions s
      WHERE s.id = NEW.submission_id;

    IF v_owner IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        v_owner,
        CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'warning' END,
        CASE WHEN NEW.status = 'approved' THEN 'Photo approved' ELSE 'Photo needs attention' END,
        CASE WHEN NEW.status = 'approved'
             THEN 'A photo in ' || v_sub_title || ' was approved.'
             ELSE 'A photo in ' || v_sub_title || ' was rejected: ' || COALESCE(NEW.review_note, 'no reason provided') END,
        '/dashboard/submissions/' || NEW.submission_id::text
      );

      PERFORM enqueue_email(
        v_owner,
        CASE WHEN NEW.status = 'approved' THEN 'photo_approved' ELSE 'photo_rejected' END,
        jsonb_build_object(
          'submission_id', NEW.submission_id,
          'submission_title', v_sub_title,
          'review_note', NEW.review_note
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_photo_reviewed ON submission_photos;
CREATE TRIGGER trg_photo_reviewed
  AFTER UPDATE OF status ON submission_photos
  FOR EACH ROW
  EXECUTE FUNCTION on_photo_reviewed();

-- 7c. Jury assignment: notify the jury member + email
CREATE OR REPLACE FUNCTION on_jury_assigned()
RETURNS TRIGGER AS $$
DECLARE
  v_cat_name TEXT;
  v_ed_title TEXT;
BEGIN
  SELECT name INTO v_cat_name FROM categories WHERE id = NEW.category_id;
  SELECT title INTO v_ed_title FROM editions WHERE id = NEW.edition_id;

  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (
    NEW.jury_id,
    'info',
    'New jury assignment',
    'You have been assigned to review "' || COALESCE(v_cat_name, 'a category') || '" in ' || COALESCE(v_ed_title, 'an edition') || '.',
    '/jury'
  );

  PERFORM enqueue_email(
    NEW.jury_id,
    'jury_assigned',
    jsonb_build_object(
      'edition_title', v_ed_title,
      'category_name', v_cat_name
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_jury_assigned ON jury_assignments;
CREATE TRIGGER trg_jury_assigned
  AFTER INSERT ON jury_assignments
  FOR EACH ROW
  EXECUTE FUNCTION on_jury_assigned();

-- 7d. Role change: notify affected user
CREATE OR REPLACE FUNCTION on_profile_role_changed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      NEW.id,
      'info',
      'Account role updated',
      'Your account role has been changed to ' || NEW.role::text || '.',
      '/dashboard/profile'
    );

    PERFORM enqueue_email(
      NEW.id,
      'role_changed',
      jsonb_build_object('new_role', NEW.role::text)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_profile_role_changed ON profiles;
CREATE TRIGGER trg_profile_role_changed
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION on_profile_role_changed();

-- 7e. Edition results published: notify all participants + email
CREATE OR REPLACE FUNCTION on_results_published()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.results_published = true AND OLD.results_published IS DISTINCT FROM NEW.results_published THEN
    -- Notify every user with a submitted submission in this edition.
    INSERT INTO notifications (user_id, type, title, message, link)
    SELECT DISTINCT s.user_id,
           'success',
           'Results published',
           'The results for "' || NEW.title || '" have been published. See where you placed!',
           '/winners'
    FROM submissions s
    WHERE s.edition_id = NEW.id
      AND s.status IN ('submitted', 'under_review', 'accepted');

    INSERT INTO email_queue (recipient_user_id, recipient_email, template, payload)
    SELECT DISTINCT s.user_id,
           p.email,
           'results_published',
           jsonb_build_object(
             'edition_title', NEW.title,
             'edition_slug', NEW.slug
           )
    FROM submissions s
    JOIN profiles p ON p.id = s.user_id
    WHERE s.edition_id = NEW.id
      AND s.status IN ('submitted', 'under_review', 'accepted');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_results_published ON editions;
CREATE TRIGGER trg_results_published
  AFTER UPDATE OF results_published ON editions
  FOR EACH ROW
  EXECUTE FUNCTION on_results_published();

-- 7f. Payment completed: in-app notification is already inserted by capture-paypal-order;
--     this trigger adds an email fallback if a payment row gets inserted directly
--     (e.g. manual admin grant).
CREATE OR REPLACE FUNCTION on_payment_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM enqueue_email(
      NEW.user_id,
      'payment_confirmed',
      jsonb_build_object(
        'amount', NEW.amount,
        'currency', NEW.currency,
        'paypal_order_id', NEW.paypal_order_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_payment_completed_ins ON payments;
CREATE TRIGGER trg_payment_completed_ins
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION on_payment_completed();

DROP TRIGGER IF EXISTS trg_payment_completed_upd ON payments;
CREATE TRIGGER trg_payment_completed_upd
  AFTER UPDATE OF status ON payments
  FOR EACH ROW
  EXECUTE FUNCTION on_payment_completed();
