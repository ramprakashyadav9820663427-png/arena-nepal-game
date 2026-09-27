
import { NextResponse } from 'next/server';

import { verifyAdminRequest, generateTempPassword } from '@/lib/adminAuth';

import { supabaseAdmin } from '@/lib/supabaseadmin';

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request, 'password_reset');

  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const body = await request.json().catch(() => null);

  const targetUid: string | undefined = body?.user_uid?.trim();

  if (!targetUid) {
    return NextResponse.json(
      { error: 'user_uid is required.' },
      { status: 400 }
    );
  }

  // Looks the player up by their UID, computed live from their real id —
  // never trusts the (unreliable/empty) profiles.user_uid text column.

  const { data: profileId, error: lookupError } =
    await supabaseAdmin.rpc(
      'admin_find_profile_id_by_uid',
      { p_uid: targetUid }
    );

  if (lookupError) {
    return NextResponse.json(
      { error: lookupError.message },
      { status: 500 }
    );
  }

  if (!profileId) {
    return NextResponse.json(
      { error: 'Player not found for that UID.' },
      { status: 404 }
    );
  }

  const newPassword = generateTempPassword();

  const { error: updateError } =
    await supabaseAdmin.auth.admin.updateUserById(profileId, {
      password: newPassword,
    });

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  await supabaseAdmin.from('admin_audit_log').insert({
    admin_id: auth.userId,
    action: 'reset_player_password',
    target_type: 'profiles',
    target_id: profileId,
    target_player_uid: targetUid,
    detail: {},
  });

  return NextResponse.json({
    success: true,
    temp_password: newPassword,
  });
}