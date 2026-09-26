import { createClient } from '@supabase/supabase-js';

// ⚠️ SERVER-ONLY FILE ⚠️
// Uses SUPABASE_SERVICE_ROLE_KEY at runtime, but falls back to a safe placeholder during build.

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ixaugtdwfxhmqypglder.supabase.co';

// Build-time crash se bachne ke liye safe fallback value
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_key_for_vercel_build';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '[supabaseAdmin] SUPABASE_SERVICE_ROLE_KEY is not set. Falling back to anon/dummy key for build pass.'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});