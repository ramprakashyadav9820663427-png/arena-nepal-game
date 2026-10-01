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

export async function POST(request: Request) {
  // Only owner can create Master IDs
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

  // 1) Create auth user
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

  if (createError || !created?.user) {
    return NextResponse.json(
      { error: createError?.message || 'Could not create master account.' },
      { status: 400 }
    );
  }

  const userId = created.user.id;

  // 2) Unique MASTER-XXXXXXXX code
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

  // 3) Insert into masters table
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
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: `Master profile error: ${masterError.message}` },
      { status: 500 }
    );
  }

  // Optional audit (ignore if table/columns differ)
  try {
    await supabaseAdmin.from('admin_audit_log').insert({
      admin_id: auth.userId,
      action: 'create_master',
      target_type: 'masters',
      target_id: userId,
      detail: { email, master_code: masterCode },
    });
  } catch {
    // ignore audit failures
  }

  return NextResponse.json({
    success: true,
    email,
    master_code: masterCode,
    temp_password: password,
  });
}