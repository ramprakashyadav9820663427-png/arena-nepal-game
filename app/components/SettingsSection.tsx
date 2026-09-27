'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import InstallAppButton from '@/components/InstallAppButton';

type SettingsSectionProps = {
  onClose: () => void;
};

const TIKTOK_URL = 'https://www.tiktok.com/@arenanepal05';
const INSTAGRAM_URL = 'https://www.instagram.com/arenanepal143';
const FACEBOOK_URL = 'https://www.facebook.com/share/1HohZyjT5B/';
const WHATSAPP_NUMBER = '9779716782200';
const OFFLINE_NUMBER = '9779717487851';

export default function SettingsSection({ onClose }: SettingsSectionProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openWhatsApp = () => {
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      onClose();
    } catch (err) {
      console.error('Logout failed:', err);
      alert('Logout failed. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-gray-900 via-black to-gray-950 p-5 shadow-[0_0_50px_rgba(34,211,238,0.15)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wide text-cyan-300">
            ⚙️ Settings
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white transition hover:bg-white/20"
          >
            ✕
          </button>
        </div>

        {/* Install App */}
        <div className="mb-3 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-3">
          <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-cyan-300">
            App
          </p>
          <InstallAppButton />
        </div>

        <div className="mb-3 rounded-2xl border border-green-500/30 bg-green-950/30 p-3">
          <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-green-400">
            Support
          </p>
          <button
            onClick={openWhatsApp}
            className="mb-2 flex w-full items-center justify-between rounded-xl bg-green-600 px-3 py-2.5 text-[11px] font-bold text-white transition hover:bg-green-500"
          >
            <span>💬 WhatsApp Support</span>
            <span className="text-[10px] opacity-90">+977 9716782200</span>
          </button>
          <a
            href={`tel:+${OFFLINE_NUMBER}`}
            className="flex w-full items-center justify-between rounded-xl border border-gray-700 bg-black/40 px-3 py-2.5 text-[11px] font-bold text-gray-200 transition hover:border-gray-500"
          >
            <span>📞 Offline Call</span>
            <span className="text-[10px] text-gray-400">+977 9717487851</span>
          </a>
        </div>

        <div className="mb-3 rounded-2xl border border-purple-500/30 bg-purple-950/20 p-3">
          <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-purple-300">
            Follow Arena Nepal
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => openLink(TIKTOK_URL)}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-800 bg-black/50 px-3 py-2.5 text-left text-[11px] font-bold text-white transition hover:border-pink-500/50 hover:bg-pink-950/30"
            >
              <span className="text-base">🎵</span>
              <span className="flex-1">TikTok</span>
              <span className="text-[9px] text-gray-500">@arenanepal05</span>
            </button>

            <button
              onClick={() => openLink(INSTAGRAM_URL)}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-800 bg-black/50 px-3 py-2.5 text-left text-[11px] font-bold text-white transition hover:border-pink-500/50 hover:bg-pink-950/30"
            >
              <span className="text-base">📸</span>
              <span className="flex-1">Instagram</span>
              <span className="text-[9px] text-gray-500">@arenanepal143</span>
            </button>

            <button
              onClick={() => openLink(FACEBOOK_URL)}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-800 bg-black/50 px-3 py-2.5 text-left text-[11px] font-bold text-white transition hover:border-blue-500/50 hover:bg-blue-950/30"
            >
              <span className="text-base">👍</span>
              <span className="flex-1">Facebook</span>
              <span className="text-[9px] text-gray-500">Arena Nepal</span>
            </button>
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-2 w-full rounded-2xl border border-red-500/50 bg-red-950/40 py-3 text-xs font-black text-red-400 transition hover:bg-red-900/50 disabled:opacity-50"
        >
          {loggingOut ? 'Logging out...' : '🚪 Logout'}
        </button>

        <p className="mt-3 text-center text-[9px] text-gray-600">
          Arena Nepal · Settings
        </p>
      </div>
    </div>
  );
}