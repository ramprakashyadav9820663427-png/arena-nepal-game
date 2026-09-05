'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AuthModal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Email/Password Sign Up
  const handleSignUp = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Signup successful! You can now sign in.');
    }
    setLoading(false);
  };

  // Email/Password Sign In
  const handleSignIn = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Login successful!');
      window.location.reload(); // पेज रीलोड होकर सीधे गेम खोल देगा
    }
    setLoading(false);
  };

  // Google Sign In (Dynamic using window.location.origin)
  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
        {message && (
          <div className="mb-4 p-3 bg-gray-800 border border-yellow-500/50 rounded text-sm text-center text-yellow-200">
            {message}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full mb-4 py-3 px-4 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
        >
          <span>🌐 Continue with Google</span>
        </button>

        <div className="flex items-center my-4">
          <div className="flex-grow border-t border-gray-700"></div>
          <span className="px-3 text-gray-400 text-sm">OR</span>
          <div className="flex-grow border-t border-gray-700"></div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1 text-left">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-400"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1 text-left">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-400"
              placeholder="••••••••"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleSignIn}
              disabled={loading}
              className="flex-1 py-2.5 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="flex-1 py-2.5 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition cursor-pointer"
            >
              Sign Up
            </button>
          </div>
        </div>
    </div>
  );
}