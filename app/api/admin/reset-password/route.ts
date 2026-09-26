import { NextResponse } from 'next/server';
import { verifyAdminRequest, generateTempPassword } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request, 'password_reset');

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const targetUid: string | undefined = body?.user_uid?.trim();

  if (!targetUid) {
    return NextResponse.json({ error: 'user_uid is required.' }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, user_uid')
    .eq('user_uid', targetUid)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Player not found for that UID.' }, { status: 404 });
  }

  const newPassword = generateTempPassword();

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
    password: newPassword,
  });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Audit trail — the action is logged, the actual password never is.
  await supabaseAdmin.from('admin_audit_log').insert({
    admin_id: auth.userId,
    action: 'reset_player_password',
    target_type: 'profiles',
    target_id: profile.id,
    target_player_uid: targetUid,
    detail: {},
  });

  return NextResponse.json({ success: true, temp_password: newPassword });
}