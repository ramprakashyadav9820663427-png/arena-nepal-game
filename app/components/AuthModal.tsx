'use client';
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [lang, setLang] = useState<'NE' | 'EN'>('NE');
  
  // Tab state: 'login' ya 'signup' select karne ke liye
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Inputs for Email Auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState(''); // Optional Referral Code (Sirf Signup ke liye helpful)

  // Mandatory Legal Checkboxes
  const [is18Plus, setIs18Plus] = useState(false);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [isNotRobot, setIsNotRobot] = useState(false);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!is18Plus || !isTermsAccepted || !isNotRobot) {
      alert(lang === 'NE' ? '⚠️ कृपया तलका सबै बक्सहरूमा टिक लगाउनुहोस्।' : '⚠️ Please check all mandatory boxes below.');
      return;
    }
    if (!email || !password) {
      alert(lang === 'NE' ? '⚠️ कृपया इमेल र पासवर्ड भर्नुहोस्।' : '⚠️ Please enter email and password.');
      return;
    }

    try {
      if (authMode === 'login') {
        // Sirf Login (Sign In)
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          alert(lang === 'NE' ? '❌ गलत इमेल वा पासवर्ड!' : '❌ Invalid login credentials or user not found!');
          return;
        }

        alert(lang === 'NE' ? '🎉 लगइन सफल भयो!' : '🎉 Login Successful!');
      } else {
        // Sirf Register (Sign Up)
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              referred_by: referralCode.trim() || null,
            }
          }
        });

        if (error) {
          alert('Sign Up Error: ' + error.message);
          return;
        }

        if (referralCode.trim()) {
          localStorage.setItem('arena_referred_by', referralCode.trim());
        }

        alert(lang === 'NE' ? '🎉 खाता सफलतापूर्वक बन्यो!' : '🎉 Account Created Successfully!');
      }

      localStorage.setItem('arena_user_token', 'email_logged_in');
      onClose();
      window.location.reload();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleGoogleAuth = async () => {
    if (!is18Plus || !isTermsAccepted || !isNotRobot) {
      alert(lang === 'NE' ? '⚠️ कृपया तलका सबै बक्सहरूमा टिक लगाउनुहोस्।' : '⚠️ Please check all mandatory boxes below.');
      return;
    }

    if (referralCode.trim()) {
      localStorage.setItem('arena_referred_by', referralCode.trim());
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      alert('Google Login Error: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-gray-950 via-gray-900 to-black border-2 border-yellow-500/50 rounded-3xl p-5 shadow-2xl text-white my-auto">
        
        {/* Top Header: Language Switcher */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-800">
          <div className="flex items-center gap-1.5 bg-gray-900 border border-yellow-500/30 p-1 rounded-xl">
            <button
              onClick={() => setLang('NE')}
              className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black transition ${lang === 'NE' ? 'bg-yellow-500 text-black shadow' : 'text-gray-400'}`}
            >
              🇳🇵 Nepali
            </button>
            <button
              onClick={() => setLang('EN')}
              className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black transition ${lang === 'EN' ? 'bg-yellow-500 text-black shadow' : 'text-gray-400'}`}
            >
              🇬🇧 English
            </button>
          </div>

          <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">
            {lang === 'NE' ? 'नेपाल गेमिंग पोर्टल' : 'Arena Nepal'}
          </span>
        </div>

        {/* 👇 LOGIN vs SIGN UP SEPARATE BUTTONS (TABS) */}
        <div className="flex bg-gray-900 p-1 rounded-2xl border border-yellow-500/30 mb-3">
          <button
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition cursor-pointer ${
              authMode === 'login' 
                ? 'bg-yellow-500 text-black shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {lang === 'NE' ? '🔐 लगइन (Login)' : '🔐 Login'}
          </button>
          <button
            onClick={() => setAuthMode('signup')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition cursor-pointer ${
              authMode === 'signup' 
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {lang === 'NE' ? '📝 नयाँ खाता (Register)' : '📝 Register'}
          </button>
        </div>

        {/* Attractive App Banner */}
        <div className="relative w-full h-14 mb-3 rounded-2xl overflow-hidden border border-yellow-500/40 bg-gradient-to-r from-amber-950 via-purple-950 to-indigo-950 flex flex-col items-center justify-center p-2 text-center shadow-inner">
          <h2 className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-white uppercase tracking-wider">
            {authMode === 'login' ? (lang === 'NE' ? 'आफ्नो खातामा लगइन गर्नुहोस्' : 'Sign in to your account') : (lang === 'NE' ? 'नयाँ खाता सिर्जना गर्नुहोस्' : 'Create a new account')}
          </h2>
        </div>

        {/* Google One-Click Auth */}
        <button
          onClick={handleGoogleAuth}
          className="w-full mb-3 flex items-center justify-center gap-2 py-2.5 bg-white text-gray-900 font-bold text-xs rounded-xl hover:bg-gray-100 transition shadow-lg cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.19v3.15C3.17 21.32 7.22 24 12 24z"/>
            <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.19C.43 8.13 0 9.86 0 12s.43 3.87 1.19 5.39l4.08-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.22 0 3.17 2.68 1.19 6.61l4.08 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
          </svg>
          {authMode === 'login' ? 'Google Login' : 'Google Sign Up'}
        </button>

        <div className="relative flex py-1 items-center mb-3">
          <div className="flex-grow border-t border-gray-800"></div>
          <span className="flex-shrink mx-3 text-[9px] text-gray-500 uppercase tracking-widest font-bold">
            {lang === 'NE' ? 'अथवा इमेल प्रयोग गर्नुहोस्' : 'Or Use Email'}
          </span>
          <div className="flex-grow border-t border-gray-800"></div>
        </div>

        {/* Email Form */}
        <div className="bg-gray-900/80 border border-yellow-500/30 rounded-2xl p-3 mb-3">
          <form onSubmit={handleEmailAuth} className="space-y-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-300 mb-0.5">
                {lang === 'NE' ? 'इमेल ठेगाना' : 'Email Address'}
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-300 mb-0.5">
                {lang === 'NE' ? 'पासवर्ड' : 'Password'}
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-500"
              />
            </div>

            {/* Referral Code - Sirf tabhi dikhega jab user 'Register' mode me hoga (Optional) */}
            {authMode === 'signup' && (
              <div>
                <label className="block text-[10px] font-bold text-yellow-400 mb-0.5 flex items-center justify-between">
                  <span>{lang === 'NE' ? 'रेफरल कोड (वैकल्पिक)' : 'Referral Code (Optional)'}</span>
                  <span className="text-[8px] text-gray-400">🎁 Bonus</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. ARENA99X"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  className="w-full bg-gray-950 border border-yellow-500/40 rounded-xl px-3 py-1.5 text-xs text-yellow-300 placeholder-gray-600 focus:outline-none focus:border-yellow-400 uppercase tracking-widest font-bold"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-black text-xs rounded-xl hover:scale-[1.01] transition cursor-pointer shadow-md mt-1"
            >
              {authMode === 'login' ? (lang === 'NE' ? 'लगइन गर्नुहोस् (Login)' : 'Sign In') : (lang === 'NE' ? 'खाता बनाउनुहोस् (Register)' : 'Create Account')}
            </button>
          </form>
        </div>

        {/* Mandatory Legal & Security Checkboxes */}
        <div className="space-y-1.5 bg-gray-950 p-2.5 rounded-2xl border border-yellow-500/20 text-[10px]">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={is18Plus}
              onChange={(e) => setIs18Plus(e.target.checked)}
              className="mt-0.5 accent-yellow-500 rounded cursor-pointer"
            />
            <span className="text-gray-300 leading-tight">
              {lang === 'NE' ? 'म पुष्टि गर्छु कि म १८ वर्ष वा सोभन्दा बढी उमेरको छु।' : 'I confirm I am 18 years of age or older.'}
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
              {lang === 'NE' ? 'म एपको सर्तहरू र गोपनीयता नीति स्वीकार गर्छु।' : 'I agree to the Terms & Conditions & Privacy Policy.'}
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

      </div>
    </div>
  );
}