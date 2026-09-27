import { NextResponse } from 'next/server';
import { verifyAdminRequest, generateTempPassword } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function buildPlayerUid(userId: string): string {
  return 'AN-' + userId.replace(/-/g, '').slice(0, 8).toUpperCase();
}

export async function POST(request: Request) {
  // Only owner can create player accounts
  const auth = await verifyAdminRequest(request, 'owner');

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);

  const email = String(body?.email || '')
    .trim()
    .toLowerCase();
  const fullName = String(body?.full_name || '').trim();
  const phone = String(body?.phone || '').trim();

  if (!email || !email.includes('@')) {
    return NextResponse.json(
      { error: 'Valid email is required.' },
      { status: 400 }
    );
  }

  if (!fullName || fullName.length < 2) {
    return NextResponse.json(
      { error: 'Full name is required.' },
      { status: 400 }
    );
  }

  const tempPassword = generateTempPassword();

  // 1) Create auth user (can login immediately)
  const { data: created, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone || null,
        created_by_admin: true,
      },
    });

  if (createError || !created?.user) {
    return NextResponse.json(
      { error: createError?.message || 'Could not create auth user.' },
      { status: 500 }
    );
  }

  const userId = created.user.id;
  const playerUid = buildPlayerUid(userId);

  // 2) Profile row (same fields app expects)
  const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      nickname: fullName,
      phone: phone || null,
      mobile_number: phone || null,
      user_uid: playerUid,
      red_diamonds: 0,
      white_diamonds: 0,
      winning_cash: 0,
      welcome_bonus_claimed: false,
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    // Auth user already created — report clearly
    return NextResponse.json(
      {
        error: `Auth user created but profile failed: ${profileError.message}`,
        user_id: userId,
        player_uid: playerUid,
        temp_password: tempPassword,
      },
      { status: 500 }
    );
  }

  await supabaseAdmin.from('admin_audit_log').insert({
    admin_id: auth.userId,
    action: 'create_player_account',
    target_type: 'profiles',
    target_id: userId,
    target_player_uid: playerUid,
    detail: { email, full_name: fullName, phone: phone || null },
  });

  return NextResponse.json({
    success: true,
    email,
    player_uid: playerUid,
    temp_password: tempPassword,
  });
}