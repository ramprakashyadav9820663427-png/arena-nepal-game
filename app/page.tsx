'use client';
import React, { useState, useEffect } from 'react';

import RockPaperScissors from '@/components/game/RockPaperScissors';
import GameSection from '@/components/game/GameSection';
import NeonTowerSection from '@/components/game/NeonTowerSection';
import TeenPattiBattle from '@/components/game/TeenPattiBattle';
import OneCardBattle from '@/components/game/OneCardBattle';
import RocketCrashGame from '@/components/game/RocketCrashGame';
import CarRacingGame from '@/components/game/CarRacingGame';
import LudoGotiSprint from '@/components/game/LudoGotiSprint';
import TournamentSection from '@/components/TournamentSection';
import WalletSection from '@/components/WalletSection';
import RankSection from '@/components/RankSection';
import LuckySpinWheel from '@/components/LuckySpinWheel';
import DailyMissions from '@/components/DailyMissions';
import AuthModal from '@/components/AuthModal';
import { supabase } from '@/lib/supabase';

// Dummy list of recent winners for the Live Ticker
const DUMMY_WINNERS = [
  "🔥 User 'Sam***' won 500 💎 on Lucky Spin!",
  "🚀 User 'Deepak99' cashed out at 4.2x on Rocket Crash!",
  "🏆 User 'Pooja_X' won 1v1 Teen Patti Battle!",
  "🃏 User 'Rahul_K' won 1,900 Red Diamonds on One Card!",
  "🎲 User 'LudoKing_99' collected 3,500 Red Diamonds on Ludo Sprint!",
  "🏎️ User 'Bikash_NP' won 3.5x on Car Racing!"
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<'home' | 'tournament' | 'rank' | 'wallet'>('home');
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [lobbyBalance, setLobbyBalance] = useState<number>(0);
  const [dailyClaimed, setDailyClaimed] = useState<boolean>(false);
  
  // State for Floating Spin Wheel Popup Widget
  const [showSpinPopup, setShowSpinPopup] = useState<boolean>(false);

  // State for Daily Missions Popup Modal
  const [showDailyMissions, setShowDailyMissions] = useState<boolean>(false);
  
  // 🟢 Live Online Players State
  const [onlinePlayers, setOnlinePlayers] = useState<number>(1428);

  // 🔴 Live Winner Ticker State
  const [currentWinnerIndex, setCurrentWinnerIndex] = useState<number>(0);

  // 🔒 Auth States for Login / Register Popup Overlay
  const [session, setSession] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  useEffect(() => {
    // 🔒 Check Supabase User Session
    const checkUserSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (!session) {
        setShowAuthModal(true);
      }
    };

    checkUserSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setShowAuthModal(false);
      }
    });

    // 🟢 सभी रेड डायमंड्स कीज़ से सही बैलेंस लोड करें (डिफ़ॉल्ट 0)
    const getRedBalance = () => {
      try {
        const val = localStorage.getItem('arena_red_diamonds') || 
                    localStorage.getItem('arena_red_dias') || 
                    localStorage.getItem('arena_diamond') || 
                    localStorage.getItem('arena_cash');
        return val ? parseInt(val, 10) : 0;
      } catch (e) {
        return 0;
      }
    };

    setLobbyBalance(getRedBalance());

    const lastClaim = localStorage.getItem('arena_daily_claim_date');
    const today = new Date().toDateString();
    if (lastClaim === today) {
      setDailyClaimed(true);
    }

    const handleWalletUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail !== undefined) {
        setLobbyBalance(customEvent.detail);
      } else {
        setLobbyBalance(getRedBalance());
      }
    };

    window.addEventListener('walletUpdated', handleWalletUpdate);
    window.addEventListener('storage', handleWalletUpdate);

    const playerInterval = setInterval(() => {
      setOnlinePlayers((prev) => {
        const randomChange = Math.floor(Math.random() * 15) - 7;
        const updated = prev + randomChange;
        return updated > 1200 ? updated : 1350;
      });
    }, 4000);

    // Rotate winner ticker every 3.5 seconds
    const winnerInterval = setInterval(() => {
      setCurrentWinnerIndex((prev) => (prev + 1) % DUMMY_WINNERS.length);
    }, 3500);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('walletUpdated', handleWalletUpdate);
      window.removeEventListener('storage', handleWalletUpdate);
      clearInterval(playerInterval);
      clearInterval(winnerInterval);
    };
  }, []);

  const handleClaimDaily = () => {
    if (dailyClaimed) return;
    const today = new Date().toDateString();
    localStorage.setItem('arena_daily_claim_date', today);
    setDailyClaimed(true);

    const currentWhite = localStorage.getItem('arena_white_diamonds');
    const newWhiteBal = (currentWhite ? parseInt(currentWhite, 10) : 24500) + 1000;
    localStorage.setItem('arena_white_diamonds', newWhiteBal.toString());
    window.dispatchEvent(new Event('storage'));

    alert('🎁 Daily Bonus Claimed! +1000 White Diamonds added to your wallet!');
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center pb-24 select-none relative">
      {/* Top Header / Lobby Bar with Live Balance */}
      <header className="w-full max-w-md p-4 flex items-center justify-between border-b border-gray-800 bg-gray-900/80 backdrop-blur-md sticky top-0 z-40 shadow-lg">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-base animate-pulse">⚡</span>
            <h1 className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 tracking-wider">
              ARENA NEPAL LOBBY
            </h1>
          </div>
          <div className="flex items-center gap-1 mt-0.5 ml-5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
            <span className="text-[9px] text-green-400 font-bold tracking-tight">
              {onlinePlayers.toLocaleString()} Players Online
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5">
          {session ? (
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-red-950/80 to-purple-950/80 px-3 py-1.5 rounded-xl border border-red-500/40 shadow-inner">
              <span className="text-xs">🔴</span>
              <span className="text-xs font-black text-red-400">{lobbyBalance}</span>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-[10px] font-black bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-black px-3 py-1.5 rounded-xl shadow-lg hover:scale-105 transition-all cursor-pointer"
            >
              Login / Register
            </button>
          )}

          {selectedGame && (
            <button 
              onClick={() => setSelectedGame(null)}
              className="text-[10px] font-extrabold bg-red-500/20 text-red-400 border border-red-500/40 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-red-500/30 transition-all"
            >
              ← Back
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="w-full max-w-md flex flex-col items-center flex-1 p-4 gap-4">
        {activeTab === 'home' && (
          <>
            {selectedGame === 'rps' ? (
              <RockPaperScissors />
            ) : selectedGame === 'neon' ? (
              <GameSection />
            ) : selectedGame === 'neontower' ? (
              <NeonTowerSection onBackToLobby={() => setSelectedGame(null)} />
            ) : selectedGame === 'teenpatti' ? (
              <TeenPattiBattle onBackToLobby={() => setSelectedGame(null)} />
            ) : selectedGame === 'onecard' ? (
              <OneCardBattle onBackToLobby={() => setSelectedGame(null)} />
            ) : selectedGame === 'rocket' ? (
              <RocketCrashGame onBackToLobby={() => setSelectedGame(null)} />
            ) : selectedGame === 'carracing' ? (
              <CarRacingGame onBackToLobby={() => setSelectedGame(null)} />
            ) : selectedGame === 'ludogoti' ? (
              <LudoGotiSprint onBackToLobby={() => setSelectedGame(null)} />
            ) : (
              <div className="w-full flex flex-col gap-4">
                
                {/* 🎯 YOUR DAILY MISSION WIDE BANNER (Top of Lobby) */}
                <div 
                  onClick={() => setShowDailyMissions(true)}
                  className="w-full bg-gradient-to-r from-yellow-500/20 via-purple-600/20 to-pink-500/20 border border-yellow-500/50 p-3.5 rounded-2xl flex items-center justify-between shadow-lg cursor-pointer hover:scale-[1.02] hover:border-yellow-400 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-pink-500 rounded-xl flex items-center justify-center text-xl shadow group-hover:rotate-12 transition-transform">
                      🎯
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                        Your Daily Mission <span className="text-[9px] bg-yellow-400 text-black px-1.5 py-0.2 rounded-full font-extrabold">NEW</span>
                      </h3>
                      <p className="text-[10px] text-gray-300 mt-0.5">Complete tasks & refer friends for rewards!</p>
                    </div>
                  </div>
                  <span className="text-xs font-black bg-gradient-to-r from-yellow-400 to-pink-500 text-black px-3 py-1.5 rounded-xl shadow">
                    View →
                  </span>
                </div>

                {/* 🔴 LIVE WINNER TICKER BAR */}
                <div className="w-full bg-gradient-to-r from-yellow-500/10 via-pink-500/10 to-purple-500/10 border border-yellow-500/30 px-3 py-2 rounded-2xl flex items-center gap-2.5 shadow-md overflow-hidden">
                  <span className="text-sm animate-bounce">📢</span>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] font-bold text-yellow-300 truncate transition-all duration-500 animate-in fade-in slide-in-from-bottom-1">
                      {DUMMY_WINNERS[currentWinnerIndex]}
                    </p>
                  </div>
                  <span className="text-[9px] font-black bg-yellow-400/20 text-yellow-400 border border-yellow-400/40 px-2 py-0.5 rounded-full uppercase">
                    Live
                  </span>
                </div>

                {/* Hero Banner */}
                <div className="w-full bg-gradient-to-r from-indigo-950 via-purple-950 to-gray-900 border border-purple-500/40 p-4 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-pink-500/20 rounded-full blur-2xl pointer-events-none"></div>
                  <div className="absolute right-12 top-2 text-3xl opacity-20">🏆</div>
                  
                  <div>
                    <span className="text-[10px] font-black bg-pink-500/20 text-pink-400 border border-pink-500/30 px-2.5 py-1 rounded-full uppercase tracking-widest">
                      🔥 Season 1 Live
                    </span>
                    <h2 className="text-base font-black text-white mt-2 leading-tight">
                      Play & Win Mega Tournaments!
                    </h2>
                    <p className="text-[11px] text-gray-300 mt-1">
                      Compete in 1v1 arenas, climb leaderboards & cash out instantly.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-purple-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎁</span>
                      <div>
                        <p className="text-[11px] font-bold text-white">Daily Login Bonus</p>
                        <p className="text-[9px] text-cyan-400 font-semibold">+1000 White Diamonds Free</p>
                      </div>
                    </div>
                    <button
                      onClick={handleClaimDaily}
                      disabled={dailyClaimed}
                      className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer shadow-lg ${
                        dailyClaimed 
                          ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black hover:scale-105'
                      }`}
                    >
                      {dailyClaimed ? 'Claimed ✓' : 'Claim Now'}
                    </button>
                  </div>
                </div>

                {/* Section Title */}
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-black text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚡</span> Featured Arcade Games
                  </h3>
                  <span className="text-[10px] text-cyan-400 font-bold">8 Games Available</span>
                </div>

                {/* Games Grid (Neon Diamond Collector placed right where you marked in the image grid) */}
                <div className="grid grid-cols-2 gap-3.5 w-full">
                  
                  {/* 1. Teen Patti Left vs Right */}
                  <div 
                    onClick={() => setSelectedGame('teenpatti')}
                    className="bg-gradient-to-b from-gray-900/90 to-gray-950 border border-yellow-500/60 p-4 rounded-3xl flex flex-col justify-between cursor-pointer hover:border-yellow-400 hover:shadow-yellow-500/20 transition-all shadow-xl active:scale-95 group relative overflow-hidden"
                  >
                    <div className="absolute top-2 right-2 text-[9px] font-bold bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/30 flex items-center gap-1">
                      <span>🃏</span> 3 Aces Hot
                    </div>
                    <div>
                      <div className="w-11 h-11 bg-gradient-to-br from-yellow-500 to-amber-700 rounded-2xl flex items-center justify-center text-xl shadow-md mb-3 group-hover:scale-105 transition-transform relative">
                        🎴
                        <span className="absolute -bottom-1 -right-1 bg-red-600 text-[8px] text-white font-black px-1 rounded shadow">A♠</span>
                      </div>
                      <h3 className="text-xs font-black text-white leading-tight mb-1">Teen Patti Left vs Right</h3>
                      <p className="text-[10px] text-gray-400 leading-snug">3 Bada Taash Ekka (Aces) Battle</p>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-[9px] text-yellow-300 font-bold bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">🔥 15s Timer</span>
                      <span className="text-[10px] font-black bg-gradient-to-r from-yellow-400 to-amber-500 text-black px-3 py-1.5 rounded-xl shadow">Play Now</span>
                    </div>
                  </div>

                  {/* 2. Neon Rocket Crash */}
                  <div 
                    onClick={() => setSelectedGame('rocket')}
                    className="bg-gradient-to-b from-gray-900/90 to-gray-950 border border-cyan-500/60 p-4 rounded-3xl flex flex-col justify-between cursor-pointer hover:border-cyan-400 hover:shadow-cyan-500/20 transition-all shadow-xl active:scale-95 group relative overflow-hidden"
                  >
                    <div className="absolute top-2 right-2 text-[9px] font-bold bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/30 flex items-center gap-1">
                      <span>🚀</span> 10x Mega Chip
                    </div>
                    <div>
                      <div className="w-11 h-11 bg-gradient-to-br from-cyan-400 to-indigo-600 rounded-2xl flex items-center justify-center text-xl shadow-md mb-3 group-hover:scale-105 transition-transform relative">
                        🚀
                        <span className="absolute -bottom-1 -right-1 bg-cyan-500 text-[8px] text-black font-black px-1 rounded shadow">10x</span>
                      </div>
                      <h3 className="text-xs font-black text-white leading-tight mb-1">Neon Rocket Crash ⚡</h3>
                      <p className="text-[10px] text-gray-400 leading-snug">Aviator-style high multiplier flight.</p>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-[9px] text-cyan-300 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">⚡ Live Multiplier</span>
                      <span className="text-[10px] font-black bg-gradient-to-r from-cyan-400 to-blue-500 text-black px-3 py-1.5 rounded-xl shadow">Play Now</span>
                    </div>
                  </div>

                  {/* 3. Rock • Paper • Scissors */}
                  <div 
                    onClick={() => setSelectedGame('rps')}
                    className="bg-gradient-to-b from-gray-900/90 to-gray-950 border border-amber-500/50 p-4 rounded-3xl flex flex-col justify-between cursor-pointer hover:border-amber-400 hover:shadow-amber-500/10 transition-all shadow-xl active:scale-95 group relative overflow-hidden"
                  >
                    <div className="absolute top-2 right-2 text-[9px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                      ✊ 1v1 Arena
                    </div>
                    <div>
                      <div className="w-11 h-11 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center text-xl shadow-md mb-3 group-hover:scale-105 transition-transform">
                        ✊
                      </div>
                      <h3 className="text-xs font-black text-white leading-tight mb-1">Rock • Paper • Scissors</h3>
                      <p className="text-[10px] text-gray-400 leading-snug">Fast hand-sign Diamond battle</p>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-[9px] text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">⚡ Instant Win</span>
                      <span className="text-[10px] font-black bg-gradient-to-r from-amber-400 to-orange-500 text-black px-3 py-1.5 rounded-xl shadow">Play Now</span>
                    </div>
                  </div>

                  {/* 4. Neon Diamond Collector (Placed right here in the grid slot as marked in your screenshot!) */}
                  <div 
                    onClick={() => setSelectedGame('neon')}
                    className="bg-gradient-to-b from-gray-900/90 to-gray-950 border border-cyan-500/50 p-4 rounded-3xl flex flex-col justify-between cursor-pointer hover:border-cyan-400 hover:shadow-cyan-500/20 transition-all shadow-xl active:scale-95 group relative overflow-hidden"
                  >
                    <div className="absolute top-2 right-2 text-[9px] font-bold bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/30">
                      💎 Free Arcade
                    </div>
                    <div>
                      <div className="w-11 h-11 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-md mb-3 group-hover:scale-105 transition-transform">
                        💎
                      </div>
                      <h3 className="text-xs font-black text-white leading-tight mb-1">Neon Diamond Collector</h3>
                      <p className="text-[10px] text-gray-400 leading-snug">Collect free diamonds & bonus rewards</p>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-[9px] text-cyan-300 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">✨ Free Play</span>
                      <span className="text-[10px] font-black bg-gradient-to-r from-cyan-400 to-blue-500 text-black px-3 py-1.5 rounded-xl shadow">Play Now</span>
                    </div>
                  </div>

                  {/* 5. One Card High Battle */}
                  <div 
                    onClick={() => setSelectedGame('onecard')}
                    className="bg-gradient-to-b from-gray-900/90 to-gray-950 border border-red-500/50 p-4 rounded-3xl flex flex-col justify-between cursor-pointer hover:border-red-400 hover:shadow-red-500/20 transition-all shadow-xl active:scale-95 group relative overflow-hidden"
                  >
                    <div className="absolute top-2 right-2 text-[9px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
                      🎴 Single Ace
                    </div>
                    <div>
                      <div className="w-11 h-11 bg-gradient-to-br from-red-600 to-rose-800 rounded-2xl flex items-center justify-center text-xl shadow-md mb-3 group-hover:scale-105 transition-transform relative">
                        🎴
                        <span className="absolute -bottom-1 -right-1 bg-yellow-400 text-[8px] text-black font-black px-1 rounded shadow">A♥</span>
                      </div>
                      <h3 className="text-xs font-black text-white leading-tight mb-1">One Card High Battle</h3>
                      <p className="text-[10px] text-gray-400 leading-snug">Seedha ek bada Ekka (Ace) bet</p>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-[9px] text-red-300 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">🔥 High Reward</span>
                      <span className="text-[10px] font-black bg-gradient-to-r from-red-500 to-rose-600 text-white px-3 py-1.5 rounded-xl shadow">Play Now</span>
                    </div>
                  </div>

                  {/* 6. Neon Car Racing */}
                  <div 
                    onClick={() => setSelectedGame('carracing')}
                    className="bg-gradient-to-b from-gray-900/90 to-gray-950 border border-amber-500/50 p-4 rounded-3xl flex flex-col justify-between cursor-pointer hover:border-amber-400 hover:shadow-amber-500/10 transition-all shadow-xl active:scale-95 group relative overflow-hidden"
                  >
                    <div className="absolute top-2 right-2 text-[9px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                      🏎️ 3.5x Mode
                    </div>
                    <div>
                      <div className="w-11 h-11 bg-gradient-to-br from-red-600 to-yellow-500 rounded-2xl flex items-center justify-center text-xl shadow-md mb-3 group-hover:scale-105 transition-transform">
                        🏎️
                      </div>
                      <h3 className="text-xs font-black text-white leading-tight mb-1">Neon Car Racing 🏁</h3>
                      <p className="text-[10px] text-gray-400 leading-snug">Car racing action mode up to 3.5x</p>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-[9px] text-yellow-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">🏁 Speed Rush</span>
                      <span className="text-[10px] font-black bg-gradient-to-r from-amber-400 to-yellow-500 text-black px-3 py-1.5 rounded-xl shadow">Play Now</span>
                    </div>
                  </div>

                  {/* 7. Neon Tower Sprint */}
                  <div 
                    onClick={() => setSelectedGame('neontower')}
                    className="bg-gradient-to-b from-gray-900/90 to-gray-950 border border-red-500/40 p-4 rounded-3xl flex flex-col justify-between cursor-pointer hover:border-red-400 hover:shadow-red-500/10 transition-all shadow-xl active:scale-95 group relative overflow-hidden"
                  >
                    <div className="absolute top-2 right-2 text-[9px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
                      🗼 Tower Sprint
                    </div>
                    <div>
                      <div className="w-11 h-11 bg-gradient-to-br from-red-500 to-rose-700 rounded-2xl flex items-center justify-center text-xl shadow-md mb-3 group-hover:scale-105 transition-transform">
                        🗼
                      </div>
                      <h3 className="text-xs font-black text-white leading-tight mb-1">Neon Tower Sprint</h3>
                      <p className="text-[10px] text-gray-400 leading-snug">Attractive vertical climb arcade</p>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-[9px] text-red-300 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">🚀 Climb High</span>
                      <span className="text-[10px] font-black bg-gradient-to-r from-red-500 to-rose-600 text-black px-3 py-1.5 rounded-xl shadow">Play Now</span>
                    </div>
                  </div>

                  {/* 8. Ludo Goti Sprint */}
                  <div 
                    onClick={() => setSelectedGame('ludogoti')}
                    className="bg-gradient-to-b from-gray-900/90 to-gray-950 border border-amber-500/50 p-4 rounded-3xl flex flex-col justify-between cursor-pointer hover:border-amber-400 hover:shadow-amber-500/20 transition-all shadow-xl active:scale-95 group relative overflow-hidden"
                  >
                    <div className="absolute top-2 right-2 text-[9px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                      🎲 Ludo Goti
                    </div>
                    <div>
                      <div className="w-11 h-11 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl flex items-center justify-center text-xl shadow-md mb-3 group-hover:scale-105 transition-transform">
                        🎲
                      </div>
                      <h3 className="text-xs font-black text-white leading-tight mb-1">Ludo Goti Sprint</h3>
                      <p className="text-[10px] text-gray-400 leading-snug">Ludo board gotiyan & sprint vibe</p>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-[9px] text-yellow-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">🎯 Board Sprint</span>
                      <span className="text-[10px] font-black bg-gradient-to-r from-amber-400 to-yellow-500 text-black px-3 py-1.5 rounded-xl shadow">Play Now</span>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'tournament' && <TournamentSection />}
        {activeTab === 'rank' && <RankSection />}
        {activeTab === 'wallet' && <WalletSection />}
      </div>

      {/* 🎯 DAILY MISSIONS POPUP MODAL */}
      {showDailyMissions && (
        <DailyMissions onClose={() => setShowDailyMissions(false)} />
      )}

      {/* 🔒 LOGIN / REGISTER MODAL POPUP OVERLAY */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-gray-900 border border-yellow-500/50 rounded-3xl p-5 shadow-2xl animate-in fade-in zoom-in duration-200">
            {session && (
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-3 right-3 bg-red-600/80 hover:bg-red-600 text-white w-7 h-7 rounded-full font-bold flex items-center justify-center text-xs shadow transition-all cursor-pointer z-10"
              >
                ✕
              </button>
            )}
            <AuthModal isOpen={true} onClose={() => setShowAuthModal(false)} />
          </div>
        </div>
      )}

      {/* 🎡 FLOATING LUCKY SPIN WIDGET (Corner Popup Style) */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end">
        {!showSpinPopup && (
          <button
            onClick={() => setShowSpinPopup(true)}
            className="relative bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 p-3.5 rounded-full shadow-2xl border-2 border-yellow-300 animate-bounce hover:scale-110 transition-all cursor-pointer flex items-center justify-center"
            title="Lucky Spin Wheel"
          >
            <span className="text-2xl">🎡</span>
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border border-white">
              SPIN
            </span>
          </button>
        )}

        {/* POPUP MODAL CONTAINER */}
        {showSpinPopup && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-sm bg-gray-900 border border-yellow-500/50 rounded-2xl p-4 shadow-2xl animate-in fade-in zoom-in duration-200">
              {/* Close (Cut) Button */}
              <button
                onClick={() => setShowSpinPopup(false)}
                className="absolute top-3 right-3 bg-red-600/80 hover:bg-red-600 text-white w-7 h-7 rounded-full font-bold flex items-center justify-center text-xs shadow transition-all cursor-pointer z-10"
              >
                ✕
              </button>

              {/* Lucky Spin Wheel Component Render */}
              <LuckySpinWheel />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="w-full max-w-md fixed bottom-0 bg-gray-950/90 backdrop-blur-md border-t border-gray-800 flex items-center justify-around py-2.5 z-40 shadow-2xl">
        <button onClick={() => { setActiveTab('home'); setSelectedGame(null); }} className={`flex flex-col items-center py-1 px-4 rounded-2xl transition-all cursor-pointer ${activeTab === 'home' ? 'text-yellow-400 bg-yellow-500/10' : 'text-gray-400 hover:text-white'}`}>
          <span className="text-xl">🏠</span>
          <span className="text-[10px] mt-0.5 font-bold">Home</span>
        </button>
        <button onClick={() => { setActiveTab('tournament'); setSelectedGame(null); }} className={`flex flex-col items-center py-1 px-4 rounded-2xl transition-all cursor-pointer ${activeTab === 'tournament' ? 'text-yellow-400 bg-yellow-500/10' : 'text-gray-400 hover:text-white'}`}>
          <span className="text-xl">🏆</span>
          <span className="text-[10px] mt-0.5 font-bold">Tournament</span>
        </button>
        <button onClick={() => { setActiveTab('rank'); setSelectedGame(null); }} className={`flex quer flex-col items-center py-1 px-4 rounded-2xl transition-all cursor-pointer ${activeTab === 'rank' ? 'text-yellow-400 bg-yellow-500/10' : 'text-gray-400 hover:text-white'}`}>
          <span className="text-xl">⭐</span>
          <span className="text-[10px] mt-0.5 font-bold">Rank</span>
        </button>
        <button onClick={() => { setActiveTab('wallet'); setSelectedGame(null); }} className={`flex flex-col items-center py-1 px-4 rounded-2xl transition-all cursor-pointer ${activeTab === 'wallet' ? 'text-yellow-400 bg-yellow-500/10' : 'text-gray-400 hover:text-white'}`}>
          <span className="text-xl">💰</span>
          <span className="text-[10px] mt-0.5 font-bold">Account</span>
        </button>
      </nav>
    </main>
  );
}