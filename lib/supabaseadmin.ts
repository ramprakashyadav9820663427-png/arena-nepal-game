import { createClient } from '@supabase/supabase-js';

// ⚠️ SERVER-ONLY FILE ⚠️
// This client uses the Supabase service role key, which can bypass every
// RLS policy in the database. It must NEVER be imported from a file that
// has 'use client' at the top, and SUPABASE_SERVICE_ROLE_KEY must only
// ever live in your hosting platform's server-side environment variables
// (e.g. Vercel → Project Settings → Environment Variables), never in code,
// never in a NEXT_PUBLIC_ variable, never committed to git.

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ixaugtdwfxhmqypglder.supabase.co';

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  // This only warns at build/runtime on the server — it never reaches the
  // browser. Routes that need this client will fail clearly until the env
  // var is set.
  console.warn(
    '[supabaseAdmin] SUPABASE_SERVICE_ROLE_KEY is not set. Admin routes that need it (password reset, worker creation) will fail until it is configured.'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});