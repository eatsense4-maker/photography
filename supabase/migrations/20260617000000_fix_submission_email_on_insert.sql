-- ============================================================
-- Fix: submission "received" notification + email never fired for
-- submissions that are created already in the `submitted` state.
--
-- The original trigger (20260513000000_production_hardening.sql) was
-- `AFTER UPDATE OF status ON submissions`, so it only ran when an existing
-- row's status changed to 'submitted'. But the app inserts free / credit-
-- covered submissions directly with status='submitted' (a single INSERT,
-- see src/pages/user/NewSubmission.tsx), which never fires an UPDATE trigger.
-- Result: those users got neither the in-app notification nor the email.
--
-- Fix: fire the trigger on INSERT as well. The function body already guards
-- on `OLD.status IS DISTINCT FROM NEW.status`; on INSERT, OLD.status is NULL,
-- so the guard passes for a row inserted as 'submitted' and is a no-op for a
-- draft. The paid-without-credits flow (insert draft -> later UPDATE to
-- submitted) still enqueues exactly once, so there are no duplicate emails.
-- ============================================================

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
  AFTER INSERT OR UPDATE OF status ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION on_submission_submitted();
