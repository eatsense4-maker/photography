import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { loadOrCreateProfile } from '@/lib/auth-profile';
import { useAuthStore } from '@/stores';

/**
 * AuthProvider — resolves session on mount via getSession() (lock-free thanks
 * to the no-op lock in supabase.ts) and listens for subsequent auth events.
 *
 * StrictMode safe: both mounts' getSession() calls write to the same Zustand
 * store with the same value — the second write is an idempotent no-op.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const { setUser } = useAuthStore.getState();

    // --- 1. Resolve initial session (instant with no-op lock) ---
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await loadOrCreateProfile(session.user);
        setUser(profile ?? null);
      } else {
        setUser(null);
      }
    }).catch(() => {
      setUser(null);
    });

    // --- 2. Listen for ongoing auth changes ---
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip INITIAL_SESSION — handled by getSession() above
        if (event === 'INITIAL_SESSION') return;

        if (event === 'SIGNED_IN' && session?.user) {
          // Skip if signIn() in useAuth already set the user
          if (useAuthStore.getState().isAuthenticated) return;
          const profile = await loadOrCreateProfile(session.user);
          setUser(profile ?? null);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
        // TOKEN_REFRESHED — Supabase client handles internally, no action needed
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
