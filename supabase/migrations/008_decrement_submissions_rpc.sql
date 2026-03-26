-- ============================================================
-- 008: RPC for atomic decrement of submissions_remaining
-- ============================================================

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
  UPDATE user_credits
  SET submissions_remaining = GREATEST(submissions_remaining - p_count, 0)
  WHERE user_id = p_user_id
    AND edition_id = p_edition_id;
END;
$$;
