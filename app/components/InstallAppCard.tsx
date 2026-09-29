'use client';

import React, { useEffect, useState } from 'react';
import {
  initPWA,
  installHint,
  isStandalone,
  promptInstall,
  subscribeInstall,
} from '@/lib/pwa';

type Props = {
  variant?: 'card' | 'button';
};

export default function InstallAppCard({ variant = 'card' }: Props) {
  const [standalone, setStandalone] = useState(false);
  const [hint, setHint] = useState('');
  const [, force] = useState(0);

  useEffect(() => {
    initPWA();
    setStandalone(isStandalone());
    return subscribeInstall(() => force((n) => n + 1));
  }, []);

  if (standalone) return null;

  const handleInstall = async () => {
    const result = await promptInstall();
    if (result === 'unavailable') {
      setHint(installHint());
      window.setTimeout(() => setHint(''), 8000);
    }
  };

  if (variant === 'button') {
    return (
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={handleInstall}
          className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/20"
        >
          📲 Install App
        </button>
        {hint && <p className="mt-1 max-w-[220px] text-center text-[10px] text-gray-400">{hint}</p>}
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-between gap-3 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 p-3.5">
      <div className="min-w-0">
        <h3 className="text-xs font-black text-white">📲 Install Arena Nepal App</h3>
        <p className="mt-0.5 text-[10px] text-gray-400">
          Home screen se seedha kholo — fast aur full screen.
        </p>
        {hint && <p className="mt-1 text-[10px] text-cyan-300">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={handleInstall}
        className="shrink-0 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-3.5 py-2 text-[11px] font-black text-black active:scale-95"
      >
        Install
      </button>
    </div>
  );
}

