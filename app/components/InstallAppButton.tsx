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

function isInStandalone(): boolean {
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
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isInStandalone()) {
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
        className={`rounded-xl border border-green-500/30 bg-green-950/40 px-3 py-2 text-center text-[11px] font-bold text-green-300 ${className}`}
      >
        ✅ Arena Nepal is installed on this device
      </div>
    );
  }

  const handleClick = async () => {
    if (isIos()) {
      setShowIosHelp(true);
      return;
    }

    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalled(true);
      }
      setDeferred(null);
      return;
    }

    // Chrome sometimes shows install only after engagement / on real domain
    alert(
      'Install option is not ready yet.\n\n' +
        '1) Open https://arenanepal.xyz in Chrome (not StackBlitz preview)\n' +
        '2) Use menu ⋮ → Install app / Add to Home screen'
    );
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void handleClick()}
        className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-xs font-black text-white shadow-lg active:scale-[0.98]"
      >
        📱 Install Arena Nepal App
      </button>

      {showIosHelp && (
        <div className="mt-2 rounded-xl border border-cyan-500/40 bg-black/60 p-3 text-[10px] leading-relaxed text-gray-200">
          <p className="mb-1 font-black text-cyan-300">iPhone / iPad:</p>
          <p>1. Safari में site खोलो</p>
          <p>2. नीचे <strong>Share</strong> (□↑) दबाओ</p>
          <p>3. <strong>Add to Home Screen</strong> चुनो</p>
          <button
            type="button"
            onClick={() => setShowIosHelp(false)}
            className="mt-2 text-[10px] font-bold text-gray-400 underline"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}