import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getDashboardPath } from '@/lib/auth-utils';
import type { UserRole } from '@/types';

/**
 * Handles OAuth callback (Google sign-in) and email-confirmation redirects.
 * Resolves the profile once a session exists, then routes to the role-appropriate
 * dashboard. If the profile can't be read, falls back to /dashboard.
 */
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let done = false;

    const resolveAndRedirect = async (userId: string) => {
      if (done) return;
      done = true;
      let role: UserRole | undefined;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
        role = data?.role as UserRole | undefined;
      } catch {
        role = undefined;
      }
      navigate(getDashboardPath(role ?? 'user'), { replace: true });
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        resolveAndRedirect(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) resolveAndRedirect(session.user.id);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" />
    </div>
  );
}
