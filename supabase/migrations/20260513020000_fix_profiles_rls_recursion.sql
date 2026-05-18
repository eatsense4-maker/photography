-- ============================================================
-- 20260513020000: Fix recursive profiles RLS checks
--
-- Policies on `profiles` must not query `profiles` directly. Postgres can
-- evaluate all branches of an OR expression, which causes infinite recursion
-- and surfaces through PostgREST as HTTP 500.
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_role(p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_profile_role() = ANY(p_roles), false);
$$;

REVOKE ALL ON FUNCTION public.current_profile_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_has_role(TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_profile_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_role(TEXT[]) TO authenticated;

DROP POLICY IF EXISTS "Profiles: self, admin, jury read" ON profiles;
CREATE POLICY "Profiles: self, admin, jury read"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.current_user_has_role(ARRAY['admin', 'jury'])
  );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role::text = public.current_profile_role()
  );

DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (public.current_user_has_role(ARRAY['admin']))
  WITH CHECK (public.current_user_has_role(ARRAY['admin']));
