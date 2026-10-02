import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// यह कोड 100% सर्वर-साइड पर ही रन होगा
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// रैंडम पासवर्ड जनरेटर
function generateRandomPassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  let pass = '';
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

// मास्टर कोड जनरेटर (उदा. MASTER-582)
function generateMasterCode(): string {
  const num = Math.floor(100 + Math.random() * 900);
  return `MASTER-${num}`;
}

export async function POST(req: Request) {
  try {
    // 1. सर्वर-साइड केवल सुरक्षित Environment Variables पढ़ेगा
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ixaugtdwfxhmqypglder.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing on server!');
      return NextResponse.json(
        { error: 'Server configuration error: Service role key missing.' },
        { status: 500 }
      );
    }

    // 2. कॉलर (Admin) का Authorization टोकन निकालना
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Session token missing.' },
        { status: 401 }
      );
    }

    // 3. सर्वर-साइड Supabase Admin Client (Service Role के साथ)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 4. टोकन वेरिफाई करना कि लॉगिन सेशन सही है या नहीं
    const {
      data: { user: callerUser },
      error: tokenError,
    } = await supabaseAdmin.auth.getUser(token);

    if (tokenError || !callerUser) {
      return NextResponse.json(
        { error: 'Invalid or expired session. Please log in again.' },
        { status: 401 }
      );
    }

    // 5. फॉर्म डेटा प्राप्त करना
    const body = await req.json().catch(() => ({}));
    const full_name = (body.full_name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const phone = (body.phone || '').trim();
    const customPassword = (body.password || '').trim();

    if (!email || !full_name) {
      return NextResponse.json(
        { error: 'Full name and email are required.' },
        { status: 400 }
      );
    }

    const temp_password = customPassword || generateRandomPassword();
    const master_code = generateMasterCode();

    // 6. Supabase Auth में नया मास्टर यूज़र बनाना
    const { data: authResult, error: createAuthError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: temp_password,
        email_confirm: true, // ईमेल कन्फर्मेशन को बाईपास करेगा
        user_metadata: {
          role: 'master',
          master_code,
          full_name,
          phone: phone || null,
        },
      });

    if (createAuthError || !authResult?.user) {
      return NextResponse.json(
        {
          error:
            createAuthError?.message || 'Could not create master account in Auth.',
        },
        { status: 400 }
      );
    }

    const createdUserId = authResult.user.id;

    // 7. masters टेबल में मास्टर का डेटा दर्ज करना
    const { error: insertError } = await supabaseAdmin.from('masters').insert({
      user_id: createdUserId,
      master_code,
      email,
      full_name,
      phone: phone || null,
      red_diamonds: 0,
      player_count: 0,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      // अगर masters टेबल में कॉलम का नाम अलग हो तो सर्वर लॉग में दिखेगा
      console.warn('Notice: insert into masters table:', insertError.message);
    }

    // 8. AdminPage.tsx के अनुसार रिटर्न करना
    return NextResponse.json({
      success: true,
      email,
      master_code,
      temp_password,
    });
  } catch (err: any) {
    console.error('Server error in create-master:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}