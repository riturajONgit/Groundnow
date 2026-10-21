import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve credentials from environment or localStorage override
const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const localUrl = typeof window !== 'undefined' ? localStorage.getItem('turf_supabase_url') || '' : '';
const localKey = typeof window !== 'undefined' ? localStorage.getItem('turf_supabase_anon_key') || '' : '';

export const supabaseUrl = (envUrl || localUrl).trim();
export const supabaseAnonKey = (envKey || localKey).trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-anon-key')
);

// Fallback dummy URL to prevent createClient throwing on initial load if not set
const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackKey = 'placeholder-key';

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : fallbackUrl,
  isSupabaseConfigured ? supabaseAnonKey : fallbackKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export function saveSupabaseConfig(url: string, key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('turf_supabase_url', url.trim());
    localStorage.setItem('turf_supabase_anon_key', key.trim());
    window.location.reload();
  }
}

export function clearSupabaseConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('turf_supabase_url');
    localStorage.removeItem('turf_supabase_anon_key');
    window.location.reload();
  }
}
