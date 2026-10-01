'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const SUPPORT_WHATSAPP = '9779716782200';

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!email.trim() || !password.trim()) {
      setMessage({ type: 'err', text: 'Email and Password are required.' });
      return;
    }

    if (password.length < 6) {
      setMessage({ type: 'err', text: 'Password must be at least 6 characters.' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      setMessage({ type: 'ok', text: 'Login successful! Welcome back.' });
      setTimeout(() => onClose(), 400);
    } catch (err: any) {
      console.error(err);
      setMessage({
        type: 'err',
        text: err?.message || 'Login failed. Please check your details.',
      });
    } finally {
      setLoading(false);
    }
  };

  const openSupportWhatsApp = () => {
    const text = [
      'Arena Nepal - Customer Support',
      'Problem: Login / Password / Game ID',
      'Email: (write your email)',
      'Game ID: (if you have one)',
      'Please help me.',
    ].join('\n');

    const url = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/92 backdrop-blur-xl">
      {/* Background glow orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-yellow-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[280px] h-[280px] bg-orange-600/15 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 left-1/4 w-[200px] h-[200px] bg-red-500/10 rounded-full blur-[90px]" />
      </div>

      <div className="relative w-full max-w-[420px] max-h-[94vh] overflow-y-auto">
        {/* Outer glow ring */}
        <div className="absolute -inset-[1px] rounded-[28px] bg-gradient-to-b from-yellow-400/60 via-orange-500/30 to-red-500/40 blur-[1px]" />

        <div className="relative rounded-[28px] border border-yellow-400/25 bg-gradient-to-b from-[#12121a] via-[#0a0a0f] to-[#08080d] shadow-[0_0_80px_rgba(234,179,8,0.25),0_25px_50px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Top shine */}
          <div className="pointer-events-none absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-yellow-400/[0.08] to-transparent" />
          <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-yellow-400/20 rounded-full blur-3xl" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white text-sm font-bold flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-lg"
          >
            ✕
          </button>

          <div className="relative px-6 pt-8 pb-6">
            {/* Logo */}
            <div className="flex flex-col items-center text-center mb-7">
              <div className="relative mb-4">
                <div className="absolute -inset-3 rounded-[22px] bg-gradient-to-br from-yellow-400/40 via-orange-500/30 to-red-500/40 blur-md" />
                <div className="relative w-[72px] h-[72px] rounded-[20px] border-2 border-yellow-400/50 bg-black shadow-[0_0_40px_rgba(234,179,8,0.45)] overflow-hidden">
                  <img
                    src="/arena-nepal-logo.jpg"
                    alt="Arena Nepal"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <h2 className="text-2xl font-black tracking-[0.12em] text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-400 to-orange-500 drop-shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                ARENA NEPAL
              </h2>
              <p className="mt-2 text-[12px] font-bold text-gray-400 tracking-wide">
                Login with your <span className="text-yellow-400">Game ID</span>
              </p>
            </div>

            {/* Message */}
            {message && (
              <div
                className={`mb-5 rounded-2xl px-4 py-3 text-[12px] font-bold text-center ${
                  message.type === 'ok'
                    ? 'bg-green-500/15 border border-green-400/40 text-green-300 shadow-[0_0_20px_rgba(34,197,94,0.15)]'
                    : 'bg-red-500/15 border border-red-400/40 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-cyan-300/90 mb-2">
                  <span className="text-sm">✉️</span> Email / Gmail
                </label>
                <div className="relative group">
                  <div className="pointer-events-none absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-blue-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity blur-[1px]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@gmail.com"
                    autoComplete="email"
                    className="relative w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3.5 text-[15px] font-bold text-white outline-none placeholder:text-gray-600 placeholder:font-medium focus:border-cyan-400/50 focus:bg-white/[0.06] transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-orange-300/90 mb-2">
                  <span className="text-sm">🔒</span> Password
                </label>
                <div className="relative group">
                  <div className="pointer-events-none absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-orange-500/0 via-orange-500/20 to-red-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity blur-[1px]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="relative w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3.5 pr-16 text-[15px] font-bold text-white outline-none placeholder:text-gray-600 placeholder:font-medium focus:border-orange-400/50 focus:bg-white/[0.06] transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-[10px] font-black tracking-wider text-gray-400 hover:text-yellow-300 hover:bg-white/10 transition-all cursor-pointer"
                  >
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="relative w-full mt-2 py-4 rounded-2xl font-black text-[15px] tracking-wide text-black overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:hover:scale-100 shadow-[0_10px_40px_rgba(234,179,8,0.4)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                      Logging in...
                    </>
                  ) : (
                    <>🔐 LOGIN TO ARENA</>
                  )}
                </span>
              </button>
            </form>

            {/* Get ID hint */}
            <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-gradient-to-r from-yellow-500/[0.08] to-orange-500/[0.05] px-4 py-3 text-center">
              <p className="text-[12px] text-gray-300">
                Don&apos;t have a Game ID?
              </p>
              <p className="mt-0.5 text-[13px] font-black text-yellow-400">
                Contact host to Get ID 🎫
              </p>
            </div>

            {/* Support */}
            <div className="mt-4 rounded-2xl border border-green-500/30 bg-gradient-to-b from-green-500/10 to-emerald-900/10 p-4">
              <p className="text-[12px] text-gray-300 leading-relaxed text-center">
                Login problem? Forgot password?
              </p>
              <p className="text-[12px] font-black text-white text-center mt-0.5">
                We&apos;re here to help
              </p>
              <button
                type="button"
                onClick={openSupportWhatsApp}
                className="mt-3 w-full py-3 rounded-xl font-black text-[13px] bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-[0_6px_24px_rgba(34,197,94,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                💬 WhatsApp Support
              </button>
            </div>

            <p className="text-center text-[10px] font-bold tracking-wider text-gray-600 mt-5">
              ARENA NEPAL · PLAY RESPONSIBLY · 18+
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

