-- ============================================================
-- 20260513060000: Explicit public read access for core content
--
-- Public pages call editions/categories/pricing_tiers/pages without a logged-in
-- session. RLS policies alone are not enough if the anon role has no table
-- SELECT privilege.
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.editions') IS NOT NULL THEN
    GRANT SELECT ON public.editions TO anon, authenticated;

    DROP POLICY IF EXISTS "Public can view published editions" ON public.editions;
    CREATE POLICY "Editions: public read published"
      ON public.editions FOR SELECT
      TO anon, authenticated
      USING (published = true);

    DROP POLICY IF EXISTS "Admins can manage editions" ON public.editions;
    CREATE POLICY "Editions: admins manage"
      ON public.editions FOR ALL
      TO authenticated
      USING (public.current_user_has_role(ARRAY['admin']))
      WITH CHECK (public.current_user_has_role(ARRAY['admin']));
  END IF;

  IF to_regclass('public.categories') IS NOT NULL THEN
    GRANT SELECT ON public.categories TO anon, authenticated;

    DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
    CREATE POLICY "Categories: public read"
      ON public.categories FOR SELECT
      TO anon, authenticated
      USING (true);

    DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
    CREATE POLICY "Categories: admins manage"
      ON public.categories FOR ALL
      TO authenticated
      USING (public.current_user_has_role(ARRAY['admin']))
      WITH CHECK (public.current_user_has_role(ARRAY['admin']));
  END IF;

  IF to_regclass('public.pricing_tiers') IS NOT NULL THEN
    GRANT SELECT ON public.pricing_tiers TO anon, authenticated;

    DROP POLICY IF EXISTS "Anyone can view pricing tiers" ON public.pricing_tiers;
    CREATE POLICY "Pricing tiers: public read"
      ON public.pricing_tiers FOR SELECT
      TO anon, authenticated
      USING (true);

    DROP POLICY IF EXISTS "Admins can insert pricing tiers" ON public.pricing_tiers;
    DROP POLICY IF EXISTS "Admins can update pricing tiers" ON public.pricing_tiers;
    DROP POLICY IF EXISTS "Admins can delete pricing tiers" ON public.pricing_tiers;
    CREATE POLICY "Pricing tiers: admins manage"
      ON public.pricing_tiers FOR ALL
      TO authenticated
      USING (public.current_user_has_role(ARRAY['admin']))
      WITH CHECK (public.current_user_has_role(ARRAY['admin']));
  END IF;

  IF to_regclass('public.pages') IS NOT NULL THEN
    GRANT SELECT ON public.pages TO anon, authenticated;

    DROP POLICY IF EXISTS "Public can read pages" ON public.pages;
    CREATE POLICY "Pages: public read"
      ON public.pages FOR SELECT
      TO anon, authenticated
      USING (true);

    DROP POLICY IF EXISTS "Admins can manage pages" ON public.pages;
    CREATE POLICY "Pages: admins manage"
      ON public.pages FOR ALL
      TO authenticated
      USING (public.current_user_has_role(ARRAY['admin']))
      WITH CHECK (public.current_user_has_role(ARRAY['admin']));
  END IF;
END $$;
