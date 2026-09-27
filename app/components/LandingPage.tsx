'use client';

import React, { useEffect, useRef, useState } from 'react';

type LandingPageProps = {
  onOpenAuth: () => void;
};

const WHATSAPP_NUMBER = '9779716782200';
const TIKTOK_URL = 'https://tiktok.com/@arenanepal05';
const FACEBOOK_URL = 'https://www.facebook.com/share/1HohZyjT5B/';
const INSTAGRAM_URL = 'https://www.instagram.com/arenanepal143?stkn=MW5jNW02em03ZjM0';
const CONTACT_EMAIL = 'arenanepal960@gmail.com';

export default function LandingPage({ onOpenAuth }: LandingPageProps) {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallHint, setShowInstallHint] = useState(false);
  const aboutRef = useRef<HTMLDivElement | null>(null);
  const helpRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDownloadClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice.catch(() => null);
      if (choice?.outcome) setInstallPrompt(null);
    } else {
      setShowInstallHint(true);
      window.setTimeout(() => setShowInstallHint(false), 6000);
    }
  };

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const openWhatsApp = () => {
    const text = 'Hello Arena Nepal Team, I want help regarding the app.';
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <main className="min-h-screen w-full bg-[#050508] text-white overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[420px] h-[280px] bg-yellow-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-0 w-[220px] h-[220px] bg-purple-600/10 rounded-full blur-[90px]" />
      </div>

      {/* HERO */}
      <section className="relative z-10 flex flex-col items-center px-4 pt-10 pb-8 text-center">
        <img
          src="/arena-nepal-logo.jpg"
          alt="Arena Nepal Logo"
          className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl shadow-[0_0_50px_rgba(234,179,8,0.35)] border border-yellow-500/40 object-cover"
        />

        <h1 className="mt-5 text-2xl sm:text-3xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400">
          ARENA NEPAL
        </h1>
        <p className="mt-2 text-sm text-gray-300 max-w-xs">
          Nepal's Premier Gaming &amp; Skill-Based Rewards Platform 🏆
        </p>

        <div className="mt-7 w-full max-w-xs flex flex-col gap-3">
          <button
            onClick={onOpenAuth}
            className="w-full py-3.5 rounded-2xl font-black text-sm bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-black shadow-[0_8px_30px_rgba(234,179,8,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            ▶ PLAY GAME
          </button>

          <button
            onClick={handleDownloadClick}
            className="w-full py-3.5 rounded-2xl font-black text-sm border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            ⬇ DOWNLOAD APP
          </button>

          <button
            onClick={onOpenAuth}
            className="w-full py-3.5 rounded-2xl font-black text-sm border border-white/20 bg-white/5 text-white hover:bg-white/10 active:scale-[0.98] transition-all cursor-pointer"
          >
            REGISTER / SIGN IN
          </button>

          {showInstallHint && (
            <p className="text-[11px] text-gray-400 mt-1">
              अपने browser के menu (⋮) से "Add to Home Screen" चुनें।
            </p>
          )}
        </div>
      </section>

      {/* ABOUT US */}
      <section
        ref={aboutRef}
        className="relative z-10 max-w-md mx-auto px-5 py-8 border-t border-white/10"
      >
        <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400 mb-3">
          About Arena Nepal
        </h2>
        <p className="text-sm text-gray-300 leading-relaxed mb-3">
          Welcome to Arena Nepal – Nepal's Premier Gaming &amp; Skill-Based Rewards Platform!
        </p>
        <p className="text-sm text-gray-400 leading-relaxed mb-4">
          Arena Nepal is designed for gamers who want to experience non-stop entertainment
          while earning real rewards. Whether you are a casual player looking to pass the
          time or a competitive gamer aiming for the top rank, Arena Nepal offers an
          exciting, secure, and rewarding environment for everyone.
        </p>

        <h3 className="text-sm font-black text-yellow-300 mb-2">Why Choose Arena Nepal?</h3>
        <ul className="space-y-2.5 text-[13px] text-gray-300">
          <li className="flex gap-2">
            <span className="text-yellow-400">•</span>
            <span>
              <b className="text-white">Play for Free &amp; Earn Real Cash:</b> Enjoy our
              free-to-play games and daily missions to earn White Diamonds.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-yellow-400">•</span>
            <span>
              <b className="text-white">Seamless Diamond Conversion:</b> Convert White
              Diamonds into Red Diamonds to enter premium matches, then cash out seamlessly.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-yellow-400">•</span>
            <span>
              <b className="text-white">Super-Fast 5-Minute Deposits &amp; Withdrawals:</b>{' '}
              Ultra-fast payment processing through trusted Nepali payment gateways.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-yellow-400">•</span>
            <span>
              <b className="text-white">Wide Variety of Games:</b> Card, board, and
              skill-based casual tournaments with fair play algorithms.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-yellow-400">•</span>
            <span>
              <b className="text-white">24/7 Dedicated Customer Support:</b> Active every day
              to help with wallet queries or account updates.
            </span>
          </li>
        </ul>

        <p className="text-sm text-gray-400 leading-relaxed mt-4">
          Join thousands of players across Nepal today! Play your favorite games, showcase
          your skills, and turn your winning moments into real rewards with Arena Nepal.
        </p>
      </section>

      {/* HELP CENTER */}
      <section
        ref={helpRef}
        className="relative z-10 max-w-md mx-auto px-5 py-8 border-t border-white/10"
      >
        <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400 mb-4">
          Help Center
        </h2>

        <button
          onClick={openWhatsApp}
          className="w-full py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer mb-4"
        >
          💬 WhatsApp Support — +977 9716782200
        </button>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <a
            href={TIKTOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 transition-all"
          >
            <span className="text-xl">🎵</span>
            <span className="text-[10px] font-bold text-gray-300">TikTok</span>
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 transition-all"
          >
            <span className="text-xl">📸</span>
            <span className="text-[10px] font-bold text-gray-300">Instagram</span>
          </a>
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 transition-all"
          >
            <span className="text-xl">👍</span>
            <span className="text-[10px] font-bold text-gray-300">Facebook</span>
          </a>
        </div>

        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="block text-center text-[12px] text-gray-400 hover:text-gray-200"
        >
          ✉️ {CONTACT_EMAIL}
        </a>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/10 bg-black/60 px-5 py-6">
        <div className="max-w-md mx-auto flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] font-bold text-gray-400">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white">
            Home
          </button>
          <button onClick={onOpenAuth} className="hover:text-white">
            Play Game
          </button>
          <button onClick={handleDownloadClick} className="hover:text-white">
            Download App
          </button>
          <button onClick={onOpenAuth} className="hover:text-white">
            Register / Sign In
          </button>
          <button onClick={() => scrollTo(aboutRef)} className="hover:text-white">
            About Us
          </button>
          <button onClick={() => scrollTo(helpRef)} className="hover:text-white">
            Help Center
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-600 mt-4">
          © {new Date().getFullYear()} Arena Nepal · Play responsibly · 18+
        </p>
      </footer>
    </main>
  );
}

