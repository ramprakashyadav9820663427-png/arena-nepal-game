import { NextResponse } from 'next/server';
import { verifyAdminRequest, generateTempPassword } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseadmin';

function generateMasterCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let part = '';
  for (let i = 0; i < 8; i++) {
    part += chars[Math.floor(Math.random() * chars.length)];
  }
  return `MASTER-${part}`;
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  // Paginate a bit — enough for most projects
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error || !data?.users?.length) break;
    const found = data.users.find(
      (u) => (u.email || '').toLowerCase() === email.toLowerCase()
    );
    if (found) return found.id;
    if (data.users.length < 200) break;
  }
  return null;
}

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request, 'owner');

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);

  const fullName: string = (body?.full_name || '').trim();
  const email: string = (body?.email || '').trim().toLowerCase();
  const phone: string = (body?.phone || '').trim();
  const givenPassword: string = (body?.password || '').trim();

  if (!fullName) {
    return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
  }
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }
  if (givenPassword && givenPassword.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters.' },
      { status: 400 }
    );
  }

  const password = givenPassword || generateTempPassword();
  let userId: string | null = null;
  let createdNew = false;

  // 1) Try create new auth user
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      phone: phone || null,
      account_type: 'master',
    },
  });

  if (created?.user) {
    userId = created.user.id;
    createdNew = true;
  } else {
    const msg = (createError?.message || '').toLowerCase();
    const already =
      msg.includes('already') ||
      msg.includes('registered') ||
      msg.includes('exists');

    if (!already) {
      return NextResponse.json(
        { error: createError?.message || 'Could not create master account.' },
        { status: 400 }
      );
    }

    // 2) Email already exists (e.g. player) → reuse that user
    userId = await findUserIdByEmail(email);
    if (!userId) {
      return NextResponse.json(
        {
          error:
            'This email is already registered but user could not be found. Try another email.',
        },
        { status: 400 }
      );
    }

    // Set/reset password so Master can login with the password you typed
    const { error: passErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone || null,
        account_type: 'master',
      },
    });
    if (passErr) {
      return NextResponse.json(
        { error: `Could not update password: ${passErr.message}` },
        { status: 400 }
      );
    }
  }

  // 3) Already a master?
  const { data: existingMaster } = await supabaseAdmin
    .from('masters')
    .select('id, master_code, email')
    .eq('id', userId)
    .maybeSingle();

  if (existingMaster) {
    return NextResponse.json(
      {
        error: `This email is already a Master (${existingMaster.master_code}).`,
      },
      { status: 400 }
    );
  }

  // 4) Unique MASTER code
  let masterCode = generateMasterCode();
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await supabaseAdmin
      .from('masters')
      .select('id')
      .eq('master_code', masterCode)
      .maybeSingle();
    if (!existing) break;
    masterCode = generateMasterCode();
  }

  // 5) Insert masters row
  const { error: masterError } = await supabaseAdmin.from('masters').insert({
    id: userId,
    master_code: masterCode,
    email,
    full_name: fullName,
    phone: phone || null,
    red_diamonds: 0,
    is_active: true,
    created_by: auth.userId,
  });

  if (masterError) {
    // Only delete auth user if WE just created it
    if (createdNew) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }
    return NextResponse.json(
      { error: `Master profile error: ${masterError.message}` },
      { status: 500 }
    );
  }

  try {
    await supabaseAdmin.from('admin_audit_log').insert({
      admin_id: auth.userId,
      action: 'create_master',
      target_type: 'masters',
      target_id: userId,
      detail: { email, master_code: masterCode, reused_existing_user: !createdNew },
    });
  } catch {
    // ignore
  }

  return NextResponse.json({
    success: true,
    email,
    master_code: masterCode,
    temp_password: password,
    reused_existing_user: !createdNew,
  });
}