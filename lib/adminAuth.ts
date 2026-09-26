import { createClient } from '@supabase/supabase-js';

// Server-side helper used by every /api/admin/* route. It never trusts
// anything the client claims about its own role — it re-checks against
// the database on every single call, using the caller's own session
// token (not the service role key) so the check runs under that admin's
// real identity.

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ixaugtdwfxhmqypglder.supabase.co';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_XRLDHfS-bDHlJJBzlGEmqQ_WetQ24cZ';

export type AdminAuthResult =
  | { ok: true; userId: string; roles: string[] }
  | { ok: false; status: number; error: string };

export async function verifyAdminRequest(
  request: Request,
  requiredRole: string
): Promise<AdminAuthResult> {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { ok: false, status: 401, error: 'Missing admin session token.' };
  }

  // A client scoped to THIS request's token only — never the service role.
  const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await callerClient.auth.getUser(token);

  if (userError || !userData?.user) {
    return { ok: false, status: 401, error: 'Invalid or expired admin session.' };
  }

  const { data: roles, error: rolesError } = await callerClient.rpc('get_my_admin_roles');

  if (rolesError) {
    return { ok: false, status: 500, error: rolesError.message };
  }

  const roleList: string[] = Array.isArray(roles) ? roles : [];

  if (!roleList.includes('owner') && !roleList.includes(requiredRole)) {
    return { ok: false, status: 403, error: 'Not authorized for this action.' };
  }

  return { ok: true, userId: userData.user.id, roles: roleList };
}

export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}