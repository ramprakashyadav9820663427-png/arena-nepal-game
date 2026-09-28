import { NextResponse } from 'next/server';
import { verifyAdminRequest, generateTempPassword } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseadmin';

// Same formula as the SQL function compute_player_uid(id):
// 'AN-' + first 8 hex chars of the user id, upper-case.
function computePlayerUid(id: string) {
  return 'AN-' + id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request, 'create_player');

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);

  const fullName: string = (body?.full_name || '').trim();
  const nickname: string = (body?.nickname || '').trim();
  const email: string = (body?.email || '').trim().toLowerCase();
  const phone: string = (body?.phone || '').trim();
  const givenPassword: string = (body?.password || '').trim();

  if (!fullName) {
    return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
  }
  if (!nickname) {
    return NextResponse.json({ error: 'Nickname is required.' }, { status: 400 });
  }
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }
  if (givenPassword && givenPassword.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  const password = givenPassword || generateTempPassword();

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, nickname, phone: phone || null },
  });

  if (createError || !created?.user) {
    return NextResponse.json(
      { error: createError?.message || 'Could not create player account.' },
      { status: 400 }
    );
  }

  const userId = created.user.id;
  const playerUid = computePlayerUid(userId);

  // upsert: works whether or not a database trigger already made an empty
  // profile row. Balances are forced to 0 (players must buy Red Diamonds).
  const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      nickname,
      phone: phone || null,
      uid: playerUid,
      red_diamonds: 0,
      white_diamonds: 0,
      winning_cash: 0,
      welcome_bonus_claimed: false,
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    // Do not leave a login without a profile behind.
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: `Profile error: ${profileError.message}` }, { status: 500 });
  }

  await supabaseAdmin.from('admin_audit_log').insert({
    admin_id: auth.userId,
    action: 'create_player',
    target_type: 'profiles',
    target_id: userId,
    target_player_uid: playerUid,
    detail: { email },
  });

  return NextResponse.json({
    success: true,
    email,
    player_uid: playerUid,
    temp_password: password,
  });
}