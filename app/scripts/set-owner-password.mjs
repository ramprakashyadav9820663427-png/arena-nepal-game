import { createClient } from '@supabase/supabase-js';

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error(
    'Usage: SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/set-owner-password.mjs <email> <new_password>'
  );
  process.exit(1);
}

const SUPABASE_URL = 'https://ixaugtdwfxhmqypglder.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error(
    'Set SUPABASE_SERVICE_ROLE_KEY as an environment variable before running this — never hardcode it in this file.'
  );
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: usersPage, error: listError } = await supabaseAdmin.auth.admin.listUsers();

if (listError) {
  console.error('Could not list users:', listError.message);
  process.exit(1);
}

const user = usersPage.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

if (!user) {
  console.error(`No user found with email ${email}`);
  process.exit(1);
}

const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password });

if (updateError) {
  console.error('Failed to set password:', updateError.message);
  process.exit(1);
}

console.log(`✅ Password set for ${email}. You can now log in at /admin with this email + password.`);