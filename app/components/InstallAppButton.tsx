'use client';

import React, { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isIos(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true
  );
}

export default function InstallAppButton({
  className = '',
}: {
  className?: string;
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <div
        className={`rounded-xl border border-green-500/40 bg-green-950/40 px-3 py-2.5 text-center text-[11px] font-bold text-green-300 ${className}`}
      >
        ✓ App already installed
      </div>
    );
  }

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalled(true);
      }
      setDeferred(null);
      return;
    }

    if (isIos()) {
      setShowIosHelp(true);
      return;
    }

    alert(
      'To install:\n\nChrome menu (⋮) → "Install app" or "Add to Home screen".\n\nOpen the site on Chrome Android for best result.'
    );
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void handleClick()}
        className="w-full rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 py-3 text-xs font-black text-white shadow-[0_0_20px_rgba(34,211,238,0.35)] active:scale-[0.99] transition-all"
      >
        📥 Install Arena Nepal App
      </button>

      {showIosHelp && (
        <div className="mt-2 rounded-xl border border-cyan-500/30 bg-black/50 p-3 text-[10px] text-gray-300 leading-relaxed">
          <p className="font-bold text-cyan-300 mb-1">iPhone / iPad:</p>
          <p>
            Safari → Share button → <b>Add to Home Screen</b> → Add
          </p>
          <button
            type="button"
            onClick={() => setShowIosHelp(false)}
            className="mt-2 text-gray-500 underline"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
