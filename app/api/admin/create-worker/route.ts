import { NextResponse } from 'next/server';
import { verifyAdminRequest, generateTempPassword } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseadmin';

const VALID_ROLES = ['deposit', 'withdraw', 'password_reset', 'owner'];

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request, 'owner');

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const email: string | undefined = body?.email?.trim().toLowerCase();
  const roles: string[] = Array.isArray(body?.roles) ? body.roles : [];

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  const cleanRoles = roles.filter((r) => VALID_ROLES.includes(r));

  if (cleanRoles.length === 0) {
    return NextResponse.json({ error: 'Select at least one category.' }, { status: 400 });
  }

  const tempPassword = generateTempPassword();

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (createError || !created?.user) {
    return NextResponse.json(
      { error: createError?.message || 'Could not create worker account.' },
      { status: 500 }
    );
  }

  const { error: insertError } = await supabaseAdmin.from('admin_users').insert({
    id: created.user.id,
    email,
    roles: cleanRoles,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await supabaseAdmin.from('admin_audit_log').insert({
    admin_id: auth.userId,
    action: 'create_worker',
    target_type: 'admin_users',
    target_id: created.user.id,
    detail: { email, roles: cleanRoles },
  });

  return NextResponse.json({ success: true, email, temp_password: tempPassword });
}