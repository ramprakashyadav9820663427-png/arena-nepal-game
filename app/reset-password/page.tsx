'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ixaugtdwfxhmqypglder.supabase.co';
const supabaseAnonKey = 'sb_publishable_XRLDHfS-bDHlJJBzlGEmqQ_WetQ24cZ';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // supabase-js automatically reads the #access_token from the
    // recovery email link and creates a temporary session from it.
    // We just need to wait a moment for that to happen, then check.
    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setHasSession(Boolean(session));
      setReady(true);
    };

    void check();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasSession(Boolean(session));
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setMessage(error.message);
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      setMessage(err?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0F19]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0F19] p-4 text-white">
        <div className="w-full max-w-sm rounded-2xl border border-green-500/40 bg-gray-900 p-6 text-center shadow-2xl">
          <h1 className="mb-2 text-lg font-black text-green-400">✅ Password Set</h1>
          <p className="mb-4 text-xs text-gray-300">
            Your password has been updated. You can now log in with it.
          </p>
          <a
            href="/admin"
            className="inline-block rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-5 py-2.5 text-xs font-bold text-white"
          >
            Go to Admin Login
          </a>
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0F19] p-4 text-white">
        <div className="w-full max-w-sm rounded-2xl border border-red-500/40 bg-gray-900 p-6 text-center shadow-2xl">
          <h1 className="mb-2 text-lg font-black text-red-400">Link Expired or Invalid</h1>
          <p className="text-xs text-gray-300">
            This password reset link is no longer valid. Please request a new one and open the
            email link again within a few minutes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0F19] p-4 text-white">
      <div className="w-full max-w-sm rounded-2xl border border-purple-500/30 bg-gray-900 p-6 shadow-2xl">
        <h1 className="mb-1 bg-gradient-to-r from-pink-400 to-cyan-400 bg-clip-text text-center text-lg font-black text-transparent">
          🔑 SET NEW PASSWORD
        </h1>
        <p className="mb-6 text-center text-[11px] text-gray-400">
          Choose a new password for your account.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-xl border border-gray-800 bg-black p-3 text-xs text-white outline-none focus:border-purple-500"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-xl border border-gray-800 bg-black p-3 text-xs text-white outline-none focus:border-purple-500"
          />

          {message && (
            <p className="rounded-lg border border-red-500/40 bg-red-950/60 p-2 text-[11px] text-red-300">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 py-3 text-xs font-bold text-white shadow-lg disabled:opacity-50"
          >
            {busy ? 'Saving...' : 'Set Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

