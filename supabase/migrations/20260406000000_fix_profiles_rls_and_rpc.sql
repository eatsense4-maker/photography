-- ============================================================
-- Fix CRITICAL security issues:
-- 1. Profiles RLS: Users could change their own role (privilege escalation)
-- 2. decrement_submissions_remaining: No auth check (any user could decrement others' credits)
-- ============================================================

-- 1. Fix profiles UPDATE policy: prevent users from changing their own role
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Users can update their own profile, but the role must stay the same
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid()));

-- Admins can update any profile (including role changes)
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. Fix decrement_submissions_remaining: add auth check
CREATE OR REPLACE FUNCTION decrement_submissions_remaining(
  p_user_id UUID,
  p_edition_id UUID,
  p_count INT DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow users to decrement their own credits, or admins
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() != p_user_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Forbidden: cannot modify another user''s credits';
  END IF;

  UPDATE user_credits
  SET submissions_remaining = GREATEST(submissions_remaining - p_count, 0)
  WHERE user_id = p_user_id
    AND edition_id = p_edition_id;
END;
$$;
