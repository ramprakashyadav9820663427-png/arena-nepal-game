'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type AuthMode = 'login' | 'signup';

const SUPPORT_WHATSAPP = '9779716782200';

const generateArenaUid = (): string => {
  const randomPart = Math.floor(10000000 + Math.random() * 90000000);
  return `AN${randomPart}`;
};

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [is18Plus, setIs18Plus] = useState(false);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [isNotRobot, setIsNotRobot] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  if (!isOpen) return null;

  const resetMessages = () => setMessage(null);

  const createUniqueUid = async (): Promise<string> => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const uid = generateArenaUid();
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('uid', uid)
        .maybeSingle();

      if (error) {
        throw new Error(`UID check failed: ${error.message}`);
      }
      if (!data) return uid;
    }
    throw new Error('Could not generate unique Game ID. Please try again.');
  };

  const createProfileForUser = async (
    userId: string,
    userEmail: string,
    meta?: {
      fullName?: string;
      nickname?: string;
      phone?: string;
      referralCode?: string;
    }
  ) => {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (existing) return;

    const uid = await createUniqueUid();

    const { error } = await supabase.from('profiles').insert({
      id: userId,
      email: userEmail,
      full_name: meta?.fullName || meta?.nickname || userEmail.split('@')[0],
      nickname: meta?.nickname || meta?.fullName || userEmail.split('@')[0],
      phone: meta?.phone || null,
      uid,
      red_diamonds: 0,
      white_diamonds: 0,
      winning_cash: 0,
      welcome_bonus_claimed: false,
      referral_code: meta?.referralCode || null,
    });

    if (error) {
      console.error('Profile create error:', error);
      if (!error.message?.toLowerCase().includes('duplicate')) {
        throw new Error(error.message);
      }
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!email.trim() || !password.trim()) {
      setMessage({ type: 'err', text: 'Email and password are required.' });
      return;
    }
    if (password.length < 6) {
      setMessage({ type: 'err', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (!is18Plus || !isTermsAccepted || !isNotRobot) {
      setMessage({ type: 'err', text: 'Please accept all checkboxes to continue.' });
      return;
    }

    if (authMode === 'signup') {
      if (!fullName.trim() || !nickname.trim()) {
        setMessage({ type: 'err', text: 'Full name and nickname are required.' });
        return;
      }
    }

    setLoading(true);
    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        if (data.user) {
          await createProfileForUser(data.user.id, data.user.email || email.trim());
        }
        setMessage({ type: 'ok', text: 'Login successful!' });
        setTimeout(() => onClose(), 400);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              nickname: nickname.trim(),
              phone: phone.trim() || null,
            },
          },
        });
        if (error) throw error;

        if (data.user) {
          await createProfileForUser(data.user.id, data.user.email || email.trim(), {
            fullName: fullName.trim(),
            nickname: nickname.trim(),
            phone: phone.trim(),
            referralCode: referralCode.trim() || undefined,
          });
        }

        setMessage({
          type: 'ok',
          text: data.session
            ? 'Account created! Welcome to Arena Nepal.'
            : 'Account created! You can log in now.',
        });

        if (data.session) {
          setTimeout(() => onClose(), 500);
        } else {
          setAuthMode('login');
        }
      }
    } catch (err: any) {
      console.error(err);
      setMessage({
        type: 'err',
        text: err?.message || 'Authentication failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    resetMessages();
    if (!is18Plus || !isTermsAccepted || !isNotRobot) {
      setMessage({ type: 'err', text: 'Please accept all checkboxes to continue.' });
      return;
    }

    setLoading(true);
    try {
      const redirectTo =
        typeof window !== 'undefined' ? window.location.origin : 'https://arenanepal.xyz';

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      setMessage({
        type: 'err',
        text: err?.message || 'Google sign-in failed. Please try again.',
      });
      setLoading(false);
    }
  };

  const openSupportWhatsApp = () => {
    const text = [
      'Arena Nepal - Customer Support',
      'Problem: Login / Register / Password',
      'Email: (write your email)',
      'Game ID: (if you have one)',
      'Please help me.',
    ].join('\n');

    const url = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    resetMessages();
    setPassword('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="relative w-full max-w-[400px] max-h-[92vh] overflow-y-auto rounded-3xl border border-yellow-500/35 bg-gradient-to-b from-gray-950 via-black to-gray-950 shadow-[0_0_60px_rgba(234,179,8,0.2)]">
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-40 bg-yellow-500/15 rounded-full blur-3xl" />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-bold flex items-center justify-center cursor-pointer"
        >
          ✕
        </button>

        <div className="relative p-5 pt-6">
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center text-2xl shadow-[0_0_24px_rgba(234,179,8,0.45)] mb-3">
              👑
            </div>
            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 tracking-wide">
              ARENA NEPAL
            </h2>
            <p className="text-[11px] text-gray-400 mt-1">
              {authMode === 'login' ? 'Sign in to play & win' : 'Create your arena account'}
            </p>
          </div>

          <div className="flex rounded-xl bg-white/5 border border-white/10 p-1 mb-4">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                authMode === 'login'
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                authMode === 'signup'
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          {message && (
            <div
              className={`mb-3 rounded-xl px-3 py-2 text-[11px] font-bold ${
                message.type === 'ok'
                  ? 'bg-green-500/15 border border-green-500/40 text-green-300'
                  : 'bg-red-500/15 border border-red-500/40 text-red-300'
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/15 bg-white text-black text-sm font-black hover:bg-gray-100 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {loading ? 'Please wait...' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] text-gray-500 font-bold uppercase">or email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-2.5">
            {authMode === 'signup' && (
              <>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-500/50"
                />
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Nickname (in-game)"
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-500/50"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Mobile (optional)"
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-500/50"
                />
              </>
            )}

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email / Gmail"
              autoComplete="email"
              className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-500/50"
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 pr-10 text-sm text-white outline-none focus:border-yellow-500/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>

            {authMode === 'signup' && (
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="Referral code (optional)"
                className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-500/50"
              />
            )}

            <div className="space-y-2 pt-1 text-[10px]">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={is18Plus}
                  onChange={(e) => setIs18Plus(e.target.checked)}
                  className="mt-0.5 accent-yellow-500 rounded cursor-pointer"
                />
                <span className="text-gray-300 leading-tight">
                  I confirm that I am 18 years of age or older.
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTermsAccepted}
                  onChange={(e) => setIsTermsAccepted(e.target.checked)}
                  className="mt-0.5 accent-yellow-500 rounded cursor-pointer"
                />
                <span className="text-gray-300 leading-tight">
                  I agree to the Terms & Conditions and Privacy Policy.
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-gray-800">
                <input
                  type="checkbox"
                  checked={isNotRobot}
                  onChange={(e) => setIsNotRobot(e.target.checked)}
                  className="accent-yellow-500 rounded cursor-pointer w-3.5 h-3.5"
                />
                <span className="text-white font-bold">I am not a robot 🤖</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 py-3 rounded-xl font-black text-sm bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-black shadow-[0_8px_28px_rgba(234,179,8,0.35)] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
            >
              {loading
                ? 'Please wait...'
                : authMode === 'login'
                  ? 'Sign In'
                  : 'Create Account'}
            </button>
          </form>

          {/* Support box — no forgot password */}
          <div className="mt-4 rounded-2xl border border-green-500/30 bg-green-500/5 p-3.5">
            <p className="text-[11px] text-gray-300 leading-relaxed text-center">
              Login problem? Forgot password? Register issue?
              <br />
              <span className="text-white font-bold">Contact Customer Support</span>
            </p>
            <button
              type="button"
              onClick={openSupportWhatsApp}
              className="mt-2.5 w-full py-2.5 rounded-xl font-black text-xs bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
            >
              💬 WhatsApp Support
            </button>
          </div>

          <p className="text-center text-[9px] text-gray-600 mt-3">
            Arena Nepal · Play responsibly · 18+
          </p>
        </div>
      </div>
    </div>
  );
}