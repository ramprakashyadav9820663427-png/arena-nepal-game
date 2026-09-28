import { NextResponse } from 'next/server';
import { verifyAdminRequest, generateTempPassword } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseadmin';

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request, 'password_reset');

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const identifier: string = (body?.identifier || body?.user_uid || '').trim();
  const givenPassword: string = (body?.new_password || '').trim();

  if (!identifier) {
    return NextResponse.json({ error: 'Enter the player UID or email.' }, { status: 400 });
  }
  if (givenPassword && givenPassword.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  let profileId: string | null = null;
  let playerUid = identifier.toUpperCase();

  if (identifier.includes('@')) {
    // Look up by email
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('email', identifier)
      .maybeSingle();
    profileId = profile?.id ?? null;
    if (profileId) {
      playerUid = 'AN-' + profileId.replace(/-/g, '').slice(0, 8).toUpperCase();
    }
  } else {
    // Look up by UID (computed from the real id, never the stored text column)
    const { data, error } = await supabaseAdmin.rpc('admin_find_profile_id_by_uid', {
      p_uid: identifier,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    profileId = (data as string | null) ?? null;
  }

  if (!profileId) {
    return NextResponse.json({ error: 'Player not found.' }, { status: 404 });
  }

  const newPassword = givenPassword || generateTempPassword();

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profileId, {
    password: newPassword,
  });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabaseAdmin.from('admin_audit_log').insert({
    admin_id: auth.userId,
    action: 'reset_player_password',
    target_type: 'profiles',
    target_id: profileId,
    target_player_uid: playerUid,
    detail: {},
  });

  return NextResponse.json({ success: true, player_uid: playerUid, temp_password: newPassword });
}