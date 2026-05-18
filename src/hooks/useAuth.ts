import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { loadOrCreateProfile } from '@/lib/auth-profile';
import { useAuthStore } from '@/stores';
import type { Profile, UserRole } from '@/types';

export function useAuth() {
  const { user, isLoading, isAuthenticated, setUser, setLoading, logout } =
    useAuthStore();

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setLoading(true);

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        if (data.user) {
          const profile = await loadOrCreateProfile(data.user);
          setUser(profile as Profile);
        } else {
          throw new Error('Authentication failed — no user returned.');
        }

        return data;
      } catch (err) {
        setLoading(false);
        throw err;
      }
    },
    [setLoading, setUser]
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName: string, country?: string) => {
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              country: country || null,
            },
          },
        });
        if (error) throw error;

        const session = data.session;
        const newUser = data.user;

        if (session && newUser) {
          const profile = await loadOrCreateProfile(newUser);
          setUser(profile as Profile);
        }

        setLoading(false);
        return data;
      } catch (err) {
        setLoading(false);
        throw err;
      }
    },
    [setLoading, setUser]
  );

  const signInWithGoogle = useCallback(async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    logout();
  }, [logout]);

  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      setUser(data as Profile);
      return data;
    },
    [user, setUser]
  );

  const hasRole = useCallback(
    (role: UserRole | UserRole[]) => {
      if (!user) return false;
      if (Array.isArray(role)) return role.includes(user.role);
      return user.role === role;
    },
    [user]
  );

  return {
    user,
    isLoading,
    isAuthenticated,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    updateProfile,
    hasRole,
  };
}
