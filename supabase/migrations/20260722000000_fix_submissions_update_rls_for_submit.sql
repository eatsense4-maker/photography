-- Allow authenticated users to move their own draft submissions to submitted.
-- Keep stricter controls for other statuses (under_review/accepted/rejected).
DROP POLICY IF EXISTS "Users can update own draft submissions" ON public.submissions;

CREATE POLICY "Users can update own draft submissions"
ON public.submissions
FOR UPDATE
TO public
USING (
  (
    user_id = auth.uid()
    AND status = 'draft'::submission_status
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'::user_role
  )
)
WITH CHECK (
  (
    user_id = auth.uid()
    AND status = ANY (ARRAY['draft'::submission_status, 'submitted'::submission_status])
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'::user_role
  )
);
