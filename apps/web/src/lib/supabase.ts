// ──────────────────────────────────────────────
// Supabase Client Setup & Connection State
// ──────────────────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.length > 20
);

let supabaseInstance: SupabaseClient | null = null;

if (isConfigured) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = supabaseInstance;

export function isSupabaseConfigured(): boolean {
  return isConfigured && supabaseInstance !== null;
}

export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      ok: false,
      message: 'Supabase URL and Anon Key are not configured in environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Running in Offline / Local Demo mode.',
    };
  }

  try {
    const { error } = await supabase.from('collections').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "public.collections" does not exist')) {
        return {
          ok: false,
          message: 'Connected to Supabase project, but tables are missing. Please run the SQL schema in supabase/migrations/001_initial_schema.sql.',
        };
      }
      return { ok: false, message: `Supabase query error: ${error.message}` };
    }
    return { ok: true, message: 'Successfully connected to Supabase PostgreSQL backend!' };
  } catch (err: any) {
    return { ok: false, message: `Connection failed: ${err?.message || 'Network error'}` };
  }
}
