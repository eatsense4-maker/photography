import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

function buildFallbackProfile(user: SupabaseUser): Profile {
  return {
    id: user.id,
    email: user.email || '',
    full_name: (user.user_metadata?.full_name as string | undefined) || user.email || 'User',
    role: 'user',
    avatar_url: null,
    country: (user.user_metadata?.country as string | undefined) || null,
    bio: null,
    website: null,
    instagram: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function loadOrCreateProfile(user: SupabaseUser): Promise<Profile> {
  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!selectError && existing) {
    return existing as Profile;
  }

  await supabase.rpc('ensure_own_profile');

  const { data: created, error: retryError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!retryError && created) {
    return created as Profile;
  }

  return buildFallbackProfile(user);
}
