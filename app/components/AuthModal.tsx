'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const generateArenaUid = (): string => {
  const randomPart = Math.floor(10000000 + Math.random() * 90000000);
  return `AN${randomPart}`;
};

export default function AuthModal({
  isOpen,
  onClose,
}: AuthModalProps) {
  const [lang, setLang] = useState<'NE' | 'EN'>('NE');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');

  const [is18Plus, setIs18Plus] = useState(false);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [isNotRobot, setIsNotRobot] = useState(false);

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const showError = (message: string) => {
    alert(message);
  };

  const createUniqueUid = async (): Promise<string> => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const uid = generateArenaUid();

      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('uid', uid)
        .maybeSingle();

      if (error) {
        throw new Error(
          `UID verification failed: ${error.message}`
        );
      }

      if (!data) {
        return uid;
      }
    }

    throw new Error(
      'Unable to generate a unique Arena UID. Please try again.'
    );
  };

  const createProfileForUser = async (
    userId: string,
    userEmail: string,
    googleName?: string | null
  ) => {
    const { data: existingProfile, error: existingError } =
      await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    if (existingError) {
      throw new Error(
        `Unable to check player profile: ${existingError.message}`
      );
    }

    if (existingProfile) {
      return existingProfile;
    }

    const uid = await createUniqueUid();

    const finalName =
      fullName.trim() ||
      googleName?.trim() ||
      userEmail.split('@')[0];

    const finalNickname =
      nickname.trim() ||
      finalName ||
      `Player${uid.slice(-6)}`;

    const profilePayload = {
      id: userId,
      uid,
      email: userEmail,
      full_name: finalName,
      nickname: finalNickname,
      phone: phone.trim() || null,
      red_diamonds: 0,
      white_diamonds: 0,
    };

    const { data: createdProfile, error: createError } =
      await supabase
        .from('profiles')
        .insert(profilePayload)
        .select()
        .single();

    if (createError) {
      throw new Error(
        `Profile creation failed: ${createError.message}`
      );
    }

    return createdProfile;
  };

  const handleEmailAuth = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (loading) return;

    if (!is18Plus || !isTermsAccepted || !isNotRobot) {
      showError(
        lang === 'NE'
          ? '⚠️ कृपया सबै अनिवार्य बक्समा टिक लगाउनुहोस्।'
          : '⚠️ Please complete all required confirmations.'
      );
      return;
    }

    if (!email.trim() || !password) {
      showError(
        lang === 'NE'
          ? '⚠️ इमेल र पासवर्ड भर्नुहोस्।'
          : '⚠️ Please enter your email and password.'
      );
      return;
    }

    if (authMode === 'signup') {
      if (!fullName.trim()) {
        showError(
          lang === 'NE'
            ? '⚠️ आफ्नो पूरा नाम भर्नुहोस्।'
            : '⚠️ Please enter your full name.'
        );
        return;
      }

      if (!nickname.trim()) {
        showError(
          lang === 'NE'
            ? '⚠️ Nickname भर्नुहोस्।'
            : '⚠️ Please enter your nickname.'
        );
        return;
      }

      if (!phone.trim()) {
        showError(
          lang === 'NE'
            ? '⚠️ मोबाइल नम्बर भर्नुहोस्।'
            : '⚠️ Please enter your mobile number.'
        );
        return;
      }

      if (password.length < 8) {
        showError(
          lang === 'NE'
            ? '⚠️ पासवर्ड कम्तीमा ८ अक्षरको हुनुपर्छ।'
            : '⚠️ Password must be at least 8 characters.'
        );
        return;
      }
    }

    setLoading(true);

    try {
      if (authMode === 'login') {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (error) {
          throw new Error(error.message);
        }

        if (!data.user) {
          throw new Error('Login completed but no user was returned.');
        }

        /*
         * Make sure the authenticated user has a profile.
         * If an old account has no profile, create one.
         */
        await createProfileForUser(
          data.user.id,
          data.user.email || email.trim(),
          data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            null
        );

        localStorage.removeItem('arena_user_token');

        alert(
          lang === 'NE'
            ? '🎉 लगइन सफल भयो!'
            : '🎉 Login successful!'
        );

        onClose();

        window.location.reload();
        return;
      }

      /*
       * SIGN UP
       */
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            nickname: nickname.trim(),
            phone: phone.trim(),
            referred_by: referralCode.trim() || null,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error(
          'Account was not created because Supabase did not return a user.'
        );
      }

      /*
       * When email confirmation is disabled, session normally exists
       * immediately. When confirmation is enabled, session may be null.
       */
      if (data.session) {
        await createProfileForUser(
          data.user.id,
          data.user.email || email.trim(),
          fullName.trim()
        );
      }

      if (referralCode.trim()) {
        localStorage.setItem(
          'arena_referred_by',
          referralCode.trim()
        );
      }

      localStorage.removeItem('arena_user_token');

      if (data.session) {
        alert(
          lang === 'NE'
            ? '🎉 खाता सफलतापूर्वक बन्यो!'
            : '🎉 Account created successfully!'
        );

        onClose();
        window.location.reload();
      } else {
        alert(
          lang === 'NE'
            ? '✅ खाता बन्यो। कृपया आफ्नो इमेल जाँच गर्नुहोस्।'
            : '✅ Account created. Please check your email to continue.'
        );
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something went wrong.';

      console.error('Arena Nepal authentication error:', error);

      showError(`Authentication Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (loading) return;

    if (!is18Plus || !isTermsAccepted || !isNotRobot) {
      showError(
        lang === 'NE'
          ? '⚠️ कृपया सबै अनिवार्य बक्समा टिक लगाउनुहोस्।'
          : '⚠️ Please complete all required confirmations.'
      );
      return;
    }

    if (referralCode.trim()) {
      localStorage.setItem(
        'arena_referred_by',
        referralCode.trim()
      );
    }

    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;

      const { error } =
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            queryParams: {
              access_type: 'offline',
              prompt: 'select_account',
            },
          },
        });

      if (error) {
        throw new Error(error.message);
      }

      /*
       * Browser will redirect to Google.
       *
       * IMPORTANT:
       * After Google returns to Arena Nepal, the Navbar/auth
       * session listener must load/create the user's profile.
       */
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Google authentication failed.';

      console.error('Arena Nepal Google authentication error:', error);

      showError(`Google Login Error: ${message}`);
      setLoading(false);
    }
  };

  const switchMode = (mode: 'login' | 'signup') => {
    setAuthMode(mode);

    if (mode === 'login') {
      setFullName('');
      setNickname('');
      setPhone('');
      setReferralCode('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-gray-950 via-gray-900 to-black border-2 border-yellow-500/50 rounded-3xl p-5 shadow-2xl text-white my-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-800">
          <div className="flex items-center gap-1.5 bg-gray-900 border border-yellow-500/30 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setLang('NE')}
              className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black transition ${
                lang === 'NE'
                  ? 'bg-yellow-500 text-black shadow'
                  : 'text-gray-400'
              }`}
            >
              🇳🇵 Nepali
            </button>

            <button
              type="button"
              onClick={() => setLang('EN')}
              className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black transition ${
                lang === 'EN'
                  ? 'bg-yellow-500 text-black shadow'
                  : 'text-gray-400'
              }`}
            >
              🇬🇧 English
            </button>
          </div>

          <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">
            Arena Nepal
          </span>
        </div>

        {/* Login / Register Tabs */}
        <div className="flex bg-gray-900 p-1 rounded-2xl border border-yellow-500/30 mb-3">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition ${
              authMode === 'login'
                ? 'bg-yellow-500 text-black shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🔐 {lang === 'NE' ? 'लगइन' : 'Login'}
          </button>

          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition ${
              authMode === 'signup'
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📝 {lang === 'NE' ? 'नयाँ खाता' : 'Register'}
          </button>
        </div>

        {/* Banner */}
        <div className="relative w-full h-14 mb-3 rounded-2xl overflow-hidden border border-yellow-500/40 bg-gradient-to-r from-amber-950 via-purple-950 to-indigo-950 flex flex-col items-center justify-center p-2 text-center shadow-inner">
          <h2 className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-white uppercase tracking-wider">
            {authMode === 'login'
              ? lang === 'NE'
                ? 'आफ्नो खातामा लगइन गर्नुहोस्'
                : 'Sign in to your account'
              : lang === 'NE'
                ? 'नयाँ खाता सिर्जना गर्नुहोस्'
                : 'Create your Arena Nepal account'}
          </h2>
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full mb-3 flex items-center justify-center gap-2 py-2.5 bg-white text-gray-900 font-bold text-xs rounded-xl hover:bg-gray-100 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.19v3.15C3.17 21.32 7.22 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.19C.43 8.13 0 9.86 0 12s.43 3.87 1.19 5.39l4.08-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.22 0 3.17 2.68 1.19 6.61l4.08 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
            />
          </svg>

          {loading
            ? 'Please wait...'
            : authMode === 'login'
              ? 'Continue with Google'
              : 'Sign up with Google'}
        </button>

        {/* Divider */}
        <div className="relative flex py-1 items-center mb-3">
          <div className="flex-grow border-t border-gray-800" />

          <span className="flex-shrink mx-3 text-[9px] text-gray-500 uppercase tracking-widest font-bold">
            {lang === 'NE'
              ? 'वा इमेल प्रयोग गर्नुहोस्'
              : 'Or use email'}
          </span>

          <div className="flex-grow border-t border-gray-800" />
        </div>

        {/* Form */}
        <div className="bg-gray-900/80 border border-yellow-500/30 rounded-2xl p-3 mb-3">
          <form
            onSubmit={handleEmailAuth}
            className="space-y-2"
          >
            {authMode === 'signup' && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-gray-300 mb-0.5">
                    {lang === 'NE'
                      ? 'पूरा नाम'
                      : 'Full Name'}
                  </label>

                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) =>
                      setFullName(e.target.value)
                    }
                    placeholder="Your full name"
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-300 mb-0.5">
                    {lang === 'NE'
                      ? 'Nickname'
                      : 'Nickname / Username'}
                  </label>

                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) =>
                      setNickname(e.target.value)
                    }
                    placeholder="Choose your player name"
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-300 mb-0.5">
                    {lang === 'NE'
                      ? 'मोबाइल नम्बर'
                      : 'Mobile Number'}
                  </label>

                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value)
                    }
                    placeholder="98XXXXXXXX"
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] font-bold text-gray-300 mb-0.5">
                {lang === 'NE'
                  ? 'इमेल ठेगाना'
                  : 'Email Address'}
              </label>

              <input
                type="email"
                required
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="name@example.com"
                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-300 mb-0.5">
                {lang === 'NE'
                  ? 'पासवर्ड'
                  : 'Password'}
              </label>

              <input
                type="password"
                required
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Minimum 8 characters"
                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-500"
              />
            </div>

            {authMode === 'signup' && (
              <div>
                <label className="block text-[10px] font-bold text-yellow-400 mb-0.5">
                  {lang === 'NE'
                    ? 'रेफरल कोड (वैकल्पिक)'
                    : 'Referral Code (Optional)'}
                </label>

                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) =>
                    setReferralCode(
                      e.target.value.toUpperCase()
                    )
                  }
                  placeholder="e.g. ARENA99X"
                  className="w-full bg-gray-950 border border-yellow-500/40 rounded-xl px-3 py-1.5 text-xs text-yellow-300 placeholder-gray-600 focus:outline-none focus:border-yellow-400 uppercase tracking-widest font-bold"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-black text-xs rounded-xl hover:scale-[1.01] transition shadow-md mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Please wait...'
                : authMode === 'login'
                  ? lang === 'NE'
                    ? 'लगइन गर्नुहोस्'
                    : 'Sign In'
                  : lang === 'NE'
                    ? 'खाता बनाउनुहोस्'
                    : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Legal */}
        <div className="space-y-1.5 bg-gray-950 p-2.5 rounded-2xl border border-yellow-500/20 text-[10px]">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={is18Plus}
              onChange={(e) =>
                setIs18Plus(e.target.checked)
              }
              className="mt-0.5 accent-yellow-500 rounded cursor-pointer"
            />

            <span className="text-gray-300 leading-tight">
              {lang === 'NE'
                ? 'म पुष्टि गर्छु कि म १८ वर्ष वा सोभन्दा बढी उमेरको छु।'
                : 'I confirm that I am 18 years of age or older.'}
            </span>
          </label>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isTermsAccepted}
              onChange={(e) =>
                setIsTermsAccepted(e.target.checked)
              }
              className="mt-0.5 accent-yellow-500 rounded cursor-pointer"
            />

            <span className="text-gray-300 leading-tight">
              {lang === 'NE'
                ? 'म एपको सर्तहरू र गोपनीयता नीति स्वीकार गर्छु।'
                : 'I agree to the Terms & Conditions and Privacy Policy.'}
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-gray-800">
            <input
              type="checkbox"
              checked={isNotRobot}
              onChange={(e) =>
                setIsNotRobot(e.target.checked)
              }
              className="accent-yellow-500 rounded cursor-pointer w-3.5 h-3.5"
            />

            <span className="text-white font-bold">
              I am not a robot 🤖
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}