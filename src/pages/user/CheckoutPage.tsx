import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';

/**
 * CheckoutPage is no longer the primary payment flow.
 * Payment is now handled inline in NewSubmission (Step 2).
 * This page redirects users to the submission flow.
 */
export default function CheckoutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect after a brief delay
    const timer = setTimeout(() => navigate('/dashboard/submissions/new'), 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="max-w-xl mx-auto py-20">
      <Card className="p-8 text-center space-y-4">
        <h2 className="text-xl font-display font-bold text-white">
          Payment is now part of the submission flow
        </h2>
        <p className="text-sm text-surface-400">
          Select your categories, choose a plan, and pay — all in one step.
          Redirecting you to the new submission page...
        </p>
        <Button
          variant="primary"
          icon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigate('/dashboard/submissions/new')}
        >
          Go to New Submission
        </Button>
      </Card>
    </div>
  );
}
