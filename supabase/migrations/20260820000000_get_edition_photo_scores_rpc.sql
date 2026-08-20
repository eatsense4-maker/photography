CREATE OR REPLACE FUNCTION get_edition_photo_scores(p_edition_id uuid)
RETURNS TABLE (
  photo_id       uuid,
  storage_key    text,
  category_id    uuid,
  category_name  text,
  photographer   text,
  country        text,
  avg_score      numeric,
  jury_count     bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    sp.id              AS photo_id,
    sp.storage_key,
    c.id               AS category_id,
    c.name             AS category_name,
    pr.full_name       AS photographer,
    pr.country,
    ROUND(AVG(sc.score)::numeric, 4) AS avg_score,
    COUNT(sc.id)       AS jury_count
  FROM submission_photos sp
  JOIN submissions s   ON s.id  = sp.submission_id
  JOIN categories  c   ON c.id  = s.category_id
  JOIN profiles    pr  ON pr.id = s.user_id
  JOIN scores      sc  ON sc.photo_id = sp.id
                       AND sc.score IS NOT NULL
  WHERE s.edition_id = p_edition_id
    AND s.status IN ('submitted', 'under_review', 'accepted')
    AND sp.status != 'rejected'
  GROUP BY sp.id, sp.storage_key, c.id, c.name, pr.full_name, pr.country
  HAVING COUNT(sc.id) > 0;
$$;

GRANT EXECUTE ON FUNCTION get_edition_photo_scores(uuid) TO authenticated;
