import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://ifzxaaptgozudsdvjbbo.supabase.co';
const FALLBACK_SUPABASE_PUBLIC_KEY = 'sb_publishable_6ZlS8oVwSo8cypBu9O0KpA_i6OQveZd';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabasePublicKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_PUBLIC_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublicKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublicKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente do build.');
  }
  return supabase;
}
