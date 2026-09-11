'use client';

import React, { useState, useEffect } from 'react';
import { UserWallet, TabType } from '../../types/game';
import AuthModal from '../AuthModal'; 
import { translations } from '../../lib/translations';
import { supabase } from '@/lib/supabase';

interface NavbarProps {
  wallet: UserWallet;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export default function Navbar({
  wallet,
  activeTab,
  setActiveTab,
}: NavbarProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<'en' | 'ne'>('en');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const t = translations[currentLang];

  // चेक करो कि यूजर सच में Supabase में लॉग इन है या नहीं
  useEffect(() => {
    const checkUserSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const localToken = localStorage.getItem('arena_user_token');
      
      if (session || localToken) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    };

    checkUserSession();

    // सेशन बदलाव को ट्रैक करने के लिए
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsLoggedIn(true);
        localStorage.setItem('arena_user_token', 'email_logged_in');
      } else {
        setIsLoggedIn(false);
        localStorage.removeItem('arena_user_token');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 🚪 Logout Function
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('arena_user_token');
      localStorage.removeItem('arena_referred_by');
      setIsLoggedIn(false);
      window.location.reload();
    } catch (error: any) {
      alert('Error logging out: ' + error.message);
    }
  };

  return (
    <>
      <header className="w-full bg-gray-900 border-b border-gray-800 text-white p-3 md:p-4 flex flex-col md:flex-row justify-between items-center gap-3 shadow-md">
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.jpg" 
              alt="Arena Nepal Logo" 
              className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.5)]" 
            />
            <span className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-purple-500">
              ARENA NEPAL
            </span>
          </div>

          <div className="ml-2">
          </div>
        </div>

        <nav className="flex gap-2 bg-gray-800 p-1 rounded-xl overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('game')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'game'
                ? 'bg-yellow-500 text-gray-950'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            {t.sports}
          </button>
          <button
            onClick={() => setActiveTab('tournament')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'tournament'
                ? 'bg-yellow-500 text-gray-950'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            {t.casino}
          </button>
          <button
            onClick={() => setActiveTab('rank')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'rank'
                ? 'bg-yellow-500 text-gray-950'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            {t.esports}
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'wallet'
                ? 'bg-yellow-500 text-gray-950'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            {t.live}
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-700 text-sm font-bold">
            <span className="text-red-400">🔴 {wallet.redDiamonds}</span>
            <span className="text-gray-600">|</span>
            <span className="text-cyan-300">💎 {wallet.whiteDiamonds}</span>
          </div>

          {/* यहीं पर Login/Register की जगह अब Logout बटन दिखेगा अगर यूजर लॉग इन है */}
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl text-sm hover:bg-red-500 transition whitespace-nowrap flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <span>🚪</span> {currentLang === 'ne' ? 'लगआउट' : 'Logout'}
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-4 py-2 bg-yellow-500 text-gray-950 font-bold rounded-xl text-sm hover:bg-yellow-400 transition whitespace-nowrap cursor-pointer"
            >
              {t.login} / {t.register}
            </button>
          )}
        </div>
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
}