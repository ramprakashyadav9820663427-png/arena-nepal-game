'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  
  const [isNewUserSetup, setIsNewUserSetup] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Generate or get unique device ID for single device restriction
  const getDeviceId = () => {
    let devId = localStorage.getItem('arena_device_id');
    if (!devId) {
      devId = 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('arena_device_id', devId);
    }
    return devId;
  };

  if (!isOpen) return null;

  // Check profile details and device security
  const checkProfileDetails = async (userId: string, userEmail: string) => {
    const deviceId = getDeviceId();

    const { data: existingDeviceUsers } = await supabase
      .from('profiles')
      .select('id')
      .eq('device_id', deviceId);

    if (existingDeviceUsers && existingDeviceUsers.length > 0) {
      const match = existingDeviceUsers.find((u: any) => u.id === userId);
      if (!match) {
        setMessage('⚠️ Security Alert: Multiple accounts from the same device are not allowed!');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile || !profile.nickname || !profile.phone) {
      setCurrentUser({ id: userId, email: userEmail });
      setIsNewUserSetup(true);
      setLoading(false);
    } else {
      setMessage('Login successful!');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  // Complete Profile Setup
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname || !phone) {
      setMessage('Please enter both Nickname and Mobile Number.');
      return;
    }
    setLoading(true);
    setMessage('');

    const deviceId = getDeviceId();
    const uniqueUid = 'AN-' + Math.floor(10000 + Math.random() * 90000);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        nickname: nickname,
        phone: phone,
        uid: uniqueUid,
        device_id: deviceId
      })
      .eq('id', currentUser.id);

    if (error) {
      setMessage('Error saving profile: ' + error.message);
      setLoading(false);
    } else {
      setMessage('Profile setup complete! Welcome to Arena Nepal.');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  // Email/Password Sign Up
  const handleSignUp = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage('Please enter email and password.');
      return;
    }
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      if (data.user) {
        await checkProfileDetails(data.user.id, email);
      }
    } catch (err: any) {
      setMessage(err.message || 'Signup failed.');
      setLoading(false);
    }
  };

  // Email/Password Sign In
  const handleSignIn = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage('Please enter email and password.');
      return;
    }
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        await checkProfileDetails(data.user.id, data.user.email!);
      }
    } catch (err: any) {
      setMessage(err.message || 'Login failed.');
      setLoading(false);
    }
  };

  // Google Sign In using Popup Mode (Prevents Preview/StackBlitz Crash)
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setMessage('');
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          skipBrowserRedirect: true, // Yeh preview crash hone se bachayega
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Open Google OAuth in a popup window
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
          data.url,
          'Google Sign In',
          `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=no, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
        );

        // Listen for successful login from popup
        const checkPopup = setInterval(async () => {
          if (!popup || popup.closed) {
            clearInterval(checkPopup);
            setLoading(false);
            // Check session after popup closes
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.user) {
              await checkProfileDetails(sessionData.session.user.id, sessionData.session.user.email!);
            }
          }
        }, 1000);
      }
    } catch (err: any) {
      setMessage(err.message || 'Google sign-in failed.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full relative">
      <button 
        onClick={onClose}
        className="absolute top-0 right-0 text-gray-400 hover:text-white text-sm font-bold px-2 py-1 cursor-pointer"
      >
        ✕
      </button>

      <div className="mb-4">
        <h3 className="text-sm font-black text-yellow-400 uppercase tracking-wider mb-1">
          {isNewUserSetup ? 'Complete Your Profile' : 'Account Access'}
        </h3>
        <p className="text-[11px] text-gray-400">
          {isNewUserSetup ? 'Provide your gaming details to proceed.' : 'Login or register securely.'}
        </p>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-gray-800/90 border border-yellow-500/50 rounded-xl text-xs text-center text-yellow-200">
          {message}
        </div>
      )}

      {isNewUserSetup ? (
        <form onSubmit={handleSaveProfile} className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-300 mb-1 text-left">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-400"
              placeholder="Your Real Name"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-300 mb-1 text-left">Gaming Nickname *</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-400"
              placeholder="e.g. NeonKing99"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-300 mb-1 text-left">Mobile Number *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-400"
              placeholder="+977 98XXXXXXXX"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-xs rounded-xl hover:scale-[1.02] transition cursor-pointer shadow-lg"
          >
            {loading ? 'Saving...' : 'Confirm & Enter Game 🚀'}
          </button>
        </form>
      ) : (
        <>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full mb-4 py-3 px-4 bg-white text-black font-extrabold text-xs rounded-xl hover:bg-gray-100 transition flex items-center justify-center gap-2.5 shadow-lg cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
          </button>

          <div className="flex items-center my-3">
            <div className="flex-grow border-t border-gray-700"></div>
            <span className="px-3 text-gray-500 text-[10px] font-bold uppercase tracking-wider">OR EMAIL</span>
            <div className="flex-grow border-t border-gray-700"></div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-300 mb-1 text-left">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-400"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-300 mb-1 text-left">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-yellow-400"
                placeholder="••••••••"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleSignIn}
                disabled={loading}
                className="flex-1 py-2.5 bg-yellow-500 text-black font-black text-xs rounded-xl hover:bg-yellow-400 transition cursor-pointer disabled:opacity-50 shadow"
              >
                {loading ? 'Processing...' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={handleSignUp}
                disabled={loading}
                className="flex-1 py-2.5 bg-gray-700 text-white font-black text-xs rounded-xl hover:bg-gray-600 transition cursor-pointer disabled:opacity-50 shadow"
              >
                {loading ? 'Processing...' : 'Sign Up'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
