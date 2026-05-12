import type { Profile, UserRole } from '@/types';

/**
 * Returns the dashboard path for a given role.
 * Used by Navbar, AuthCallback, LoginPage etc. so we don't drift.
 */
export function getDashboardPath(role: UserRole | undefined | null): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'jury':
      return '/jury';
    case 'user':
      return '/dashboard';
    default:
      return '/login';
  }
}

export function getDashboardPathForProfile(profile: Profile | null): string {
  return getDashboardPath(profile?.role);
}
