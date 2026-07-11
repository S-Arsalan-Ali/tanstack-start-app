import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use import.meta.env for client-side (Vite build-time replacement)
// Fall back to process.env for SSR (server-side rendering)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  const missing = [
    ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
    ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
  ];
  const message = `Missing Supabase environment variable(s): ${missing.join(', ')}. Connect Supabase in Lovable Cloud.`;
  console.error(`[Supabase] ${message}`);
  // In development, we might not want to throw immediately to allow other things to render
  if (typeof window !== "undefined") {
    console.warn("Supabase client failed to initialize because env vars are missing.");
  }
}

// Eager initialization (no Proxy) prevents deadlocks and 'this' binding issues
export const supabase = createClient<Database>(
  SUPABASE_URL || 'https://placeholder.supabase.co', 
  SUPABASE_PUBLISHABLE_KEY || 'placeholder', 
  {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

