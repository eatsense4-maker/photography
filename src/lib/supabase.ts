import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Bypass navigator.locks (Web Locks API) — it causes getSession() and
    // INITIAL_SESSION to hang/deadlock under React StrictMode double-mount.
    // This no-op lock just executes the callback immediately.
    lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>) => await fn(),
  },
});

export default supabase;
