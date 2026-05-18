-- ============================================================
-- 20260513050000: Explicit public read access for CMS tables
--
-- Public homepage/news requests must work without authentication:
--   /rest/v1/partners?active=eq.true
--   /rest/v1/posts?published=eq.true
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.partners') IS NOT NULL THEN
    GRANT SELECT ON public.partners TO anon, authenticated;

    DROP POLICY IF EXISTS "Public can view partners" ON public.partners;
    CREATE POLICY "Partners: public read active"
      ON public.partners FOR SELECT
      TO anon, authenticated
      USING (active = true);

    DROP POLICY IF EXISTS "Admins can manage partners" ON public.partners;
    CREATE POLICY "Partners: admins manage"
      ON public.partners FOR ALL
      TO authenticated
      USING (public.current_user_has_role(ARRAY['admin']))
      WITH CHECK (public.current_user_has_role(ARRAY['admin']));
  END IF;

  IF to_regclass('public.posts') IS NOT NULL THEN
    GRANT SELECT ON public.posts TO anon, authenticated;

    DROP POLICY IF EXISTS "Public can read published posts" ON public.posts;
    CREATE POLICY "Posts: public read published"
      ON public.posts FOR SELECT
      TO anon, authenticated
      USING (published = true);

    DROP POLICY IF EXISTS "Admins can manage posts" ON public.posts;
    CREATE POLICY "Posts: admins manage"
      ON public.posts FOR ALL
      TO authenticated
      USING (public.current_user_has_role(ARRAY['admin']))
      WITH CHECK (public.current_user_has_role(ARRAY['admin']));
  END IF;
END $$;
