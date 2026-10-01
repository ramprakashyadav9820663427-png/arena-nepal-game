import { NextResponse } from 'next/server';
import { generateTempPassword } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseadmin';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ixaugtdwfxhmqypglder.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_XRLDHfS-bDHlJJBzlGEmqQ_WetQ24cZ';

function computePlayerUid(id: string) {
  return 'AN-' + id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

async function verifyMaster(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return { ok: false as const, error: 'Unauthorized', status: 401 };

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return { ok: false as const, error: 'Invalid session', status: 401 };
  }

  const { data: master, error: masterError } = await supabaseAdmin
    .from('masters')
    .select('id, is_active')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (masterError || !master || !master.is_active) {
    return { ok: false as const, error: 'Not a master account', status: 403 };
  }

  return { ok: true as const, userId: userData.user.id };
}

export async function POST(request: Request) {
  const auth = await verifyMaster(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const fullName: string = (body?.full_name || '').trim();
  const nickname: string = (body?.nickname || '').trim();
  const email: string = (body?.email || '').trim().toLowerCase();
  const phone: string = (body?.phone || '').trim();
  const givenPassword: string = (body?.password || '').trim();

  if (!fullName || !nickname) {
    return NextResponse.json({ error: 'Name and nickname required.' }, { status: 400 });
  }
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400 });
  }
  if (givenPassword && givenPassword.length < 6) {
    return NextResponse.json({ error: 'Password min 6 characters.' }, { status: 400 });
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
      { error: createError?.message || 'Could not create player.' },
      { status: 400 }
    );
  }

  const userId = created.user.id;
  const playerUid = computePlayerUid(userId);

  const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      nickname,
      phone: phone || null,
      user_uid: playerUid,
      uid: playerUid,
      red_diamonds: 0,
      white_diamonds: 0,
      winning_cash: 0,
      welcome_bonus_claimed: false,
      created_by_master_id: auth.userId,
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: `Profile error: ${profileError.message}` }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    email,
    player_uid: playerUid,
    temp_password: password,
  });
}