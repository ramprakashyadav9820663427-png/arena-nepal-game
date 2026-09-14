'use client';

import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

export default function InstallAppButton() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();

      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt
    );

    const checkInstalled = () => {
      const standalone = window.matchMedia(
        '(display-mode: standalone)'
      ).matches;

      const iosStandalone =
        (window.navigator as Navigator & {
          standalone?: boolean;
        }).standalone === true;

      setIsInstalled(standalone || iosStandalone);
    };

    checkInstalled();

    window.addEventListener('appinstalled', checkInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );

      window.removeEventListener(
        'appinstalled',
        checkInstalled
      );
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();

    const { outcome } = await installPrompt.userChoice;

    console.log(
      `Arena Nepal install prompt result: ${outcome}`
    );

    setInstallPrompt(null);
  };

  if (isInstalled || !installPrompt) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-300 shadow-lg transition-all hover:scale-105 hover:bg-cyan-500/20 active:scale-95"
      title="Install Arena Nepal"
    >
      📲 Install App
    </button>
  );
}