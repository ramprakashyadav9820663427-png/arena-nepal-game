'use client';
import React, { useState, useEffect } from 'react';

import RockPaperScissors from '@/components/game/RockPaperScissors';
import GameSection from '@/components/game/GameSection';
import TeenPattiBattle from '@/components/game/TeenPattiBattle';
import OneCardBattle from '@/components/game/OneCardBattle';
import RocketCrashGame from '@/components/game/RocketCrashGame';
import CarRacingGame from '@/components/game/CarRacingGame';
import LudoGotiSprint from '@/components/game/LudoGotiSprint';
import ArenaSpinnerWinner from '@/components/game/ArenaSpinnerWinner';
import TournamentSection from '@/components/TournamentSection';
import WalletSection from '@/components/WalletSection';
import RankSection from '@/components/RankSection';
import DailyMissions from '@/components/DailyMissions';
import AuthModal from '@/components/AuthModal';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useLanguage } from './context/LanguageContext';
import { supabase } from '@/lib/supabase';

// Dummy list of recent winners for the Live Ticker
const DUMMY_WINNERS = [
  "🔥 User 'Sam***' won 500 🔴 on Arena Spinner Winner!",
  "🚀 User 'Deepak99' cashed out at 4.2x on Rocket Crash!",
  "🏆 User 'Pooja_X' won 1v1 Teen Patti Battle!",
  "🃏 User 'Rahul_K' won 1,900 Red Diamonds on One Card!",
  "🎲 User 'LudoKing_99' collected 3,500 Red Diamonds on Ludo Sprint!",
  "🏎️ User 'Bikash_NP' won 3.5x on Car Racing!"
];

// 🎮 GAMES CONFIGURATION (Reference Style: Clean Image Box + Name Below)
const GAMES_LIST = [
  {
    id: 'spin',
    name: 'Arena Spinner Winner',
    tag: 'SPIN 🎡',
    thumbnail: '/thumbnails/spin-winner.jpg',
    border: 'border-yellow-500/30 hover:border-yellow-400',
    badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
  },
  {
    id: 'teenpatti',
    name: 'Teen Patti Battle',
    tag: '3 ACES',
    thumbnail: '/thumbnails/teenpatti.jpg',
    border: 'border-yellow-500/30 hover:border-yellow-400',
    badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
  },
  {
    id: 'rocket',
    name: 'Rocket Crash',
    tag: '10x RUSH',
    thumbnail: '/thumbnails/rocket.jpg',
    border: 'border-cyan-500/30 hover:border-cyan-400',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
  },
  {
    id: 'rps',
    name: 'Rock Paper Scissors',
    tag: '1v1 ARENA',
    thumbnail: '/thumbnails/rps.jpg',
    border: 'border-amber-500/30 hover:border-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  },
  {
    id: 'neon',
    name: 'Diamond Collector',
    tag: 'FREE PLAY',
    thumbnail: '/thumbnails/neon.jpg',
    border: 'border-cyan-500/30 hover:border-cyan-400',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
  },
  {
    id: 'onecard',
    name: 'One Card Battle',
    tag: 'ACE HIGH',
    thumbnail: '/thumbnails/onecard.jpg',
    border: 'border-red-500/30 hover:border-red-400',
    badgeBg: 'bg-red-500/20 text-red-300 border-red-500/30'
  },
  {
    id: 'carracing',
    name: 'Neon Car Racing',
    tag: '3.5x SPEED',
    thumbnail: '/thumbnails/carracing.jpg',
    border: 'border-amber-500/30 hover:border-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  },
  {
    id: 'ludogoti',
    name: 'Ludo Goti Sprint',
    tag: 'SPRINT',
    thumbnail: '/thumbnails/ludo.jpg',
    border: 'border-amber-500/30 hover:border-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<'home' | 'tournament' | 'rank' | 'wallet'>('home');
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [lobbyBalance, setLobbyBalance] = useState<number>(0);
  const [dailyClaimed, setDailyClaimed] = useState<boolean>(false);
  
  const { currentLang, t } = useLanguage();
  
  const [showSpinPopup, setShowSpinPopup] = useState<boolean>(false);
  const [showDailyMissions, setShowDailyMissions] = useState<boolean>(false);
  const [onlinePlayers, setOnlinePlayers] = useState<number>(1428);
  const [currentWinnerIndex, setCurrentWinnerIndex] = useState<number>(0);
  const [session, setSession] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  useEffect(() => {
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

    alert(currentLang === 'ne' ? '🎁 दैनिक बोनस प्राप्त भयो! +1000 सेतो हिरा थपियो!' : '🎁 Daily Bonus Claimed! +1000 White Diamonds added to your wallet!');
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center pb-24 select-none relative">
      {/* Top Header / Lobby Bar */}
      <header className="w-full max-w-md p-3 flex items-center justify-between border-b border-gray-800 bg-gray-900/80 backdrop-blur-md sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-2">
          <LanguageSelector />
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-sm animate-pulse">⚡</span>
              <h1 className="text-[10px] font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 tracking-wider uppercase">
                {t.appTitle || "ARENA NEPAL LOBBY"}
              </h1>
            </div>
            <div className="flex items-center gap-1 mt-0.5 ml-4">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
              <span className="text-[8px] text-green-400 font-bold tracking-tight">
                {onlinePlayers.toLocaleString()} {t.playersOnline || "Players Online"}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {session ? (
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-red-950/80 to-purple-950/80 px-2.5 py-1 rounded-xl border border-red-500/40 shadow-inner">
              <span className="text-xs">🔴</span>
              <span className="text-xs font-black text-red-400">{lobbyBalance}</span>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-[10px] font-black bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-black px-2.5 py-1.5 rounded-xl shadow-lg hover:scale-105 transition-all cursor-pointer"
            >
              {t.loginRegister || "Login / Register"}
            </button>
          )}

          {selectedGame && (
            <button 
              onClick={() => setSelectedGame(null)}
              className="text-[10px] font-extrabold bg-red-500/20 text-red-400 border border-red-500/40 px-2.5 py-1.5 rounded-xl cursor-pointer hover:bg-red-500/30 transition-all"
            >
              ← {t.back || "Back"}
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="w-full max-w-md flex flex-col items-center flex-1 p-4 gap-4">
        {activeTab === 'home' && (
          <>
            {selectedGame === 'spin' ? (
              <ArenaSpinnerWinner />
            ) : selectedGame === 'rps' ? (
              <RockPaperScissors />
            ) : selectedGame === 'neon' ? (
              <GameSection />
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
                
                {/* 🎯 DAILY MISSION BANNER */}
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
                        {t.dailyMissionTitle || "Your Daily Mission"} <span className="text-[9px] bg-yellow-400 text-black px-1.5 py-0.2 rounded-full font-extrabold">NEW</span>
                      </h3>
                      <p className="text-[10px] text-gray-300 mt-0.5">{t.dailyMissionDesc || "Complete tasks & refer friends for rewards!"}</p>
                    </div>
                  </div>
                  <span className="text-xs font-black bg-gradient-to-r from-yellow-400 to-pink-500 text-black px-3 py-1.5 rounded-xl shadow">
                    {t.viewButton || "View"} →
                  </span>
                </div>

                {/* 🔴 LIVE WINNER TICKER */}
                <div className="w-full bg-gradient-to-r from-yellow-500/10 via-pink-500/10 to-purple-500/10 border border-yellow-500/30 px-3 py-2 rounded-2xl flex items-center gap-2.5 shadow-md overflow-hidden">
                  <span className="text-sm animate-bounce">📢</span>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] font-bold text-yellow-300 truncate transition-all duration-500 animate-in fade-in slide-in-from-bottom-1">
                      {DUMMY_WINNERS[currentWinnerIndex]}
                    </p>
                  </div>
                  <span className="text-[9px] font-black bg-yellow-400/20 text-yellow-400 border border-yellow-400/40 px-2 py-0.5 rounded-full uppercase">
                    LIVE
                  </span>
                </div>

                {/* Hero Banner */}
                <div className="w-full bg-gradient-to-r from-indigo-950 via-purple-950 to-gray-900 border border-purple-500/40 p-4 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-pink-500/20 rounded-full blur-2xl pointer-events-none"></div>
                  <div className="absolute right-12 top-2 text-3xl opacity-20">🏆</div>
                  
                  <div>
                    <span className="text-[10px] font-black bg-pink-500/20 text-pink-400 border border-pink-500/30 px-2.5 py-1 rounded-full uppercase tracking-widest">
                      🔥 SEASON 1 LIVE
                    </span>
                    <h2 className="text-base font-black text-white mt-2 leading-tight">
                      {t.playMegaTitle || "Play & Win Mega Tournaments!"}
                    </h2>
                    <p className="text-[11px] text-gray-300 mt-1">
                      {t.playMegaDesc || "Compete in 1v1 arenas, climb leaderboards & cash out instantly."}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-purple-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎁</span>
                      <div>
                        <p className="text-[11px] font-bold text-white">{t.dailyLoginBonus || "Daily Login Bonus"}</p>
                        <p className="text-[9px] text-cyan-400 font-semibold">{t.freeDiamonds || "+1000 White Diamonds Free"}</p>
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
                      {dailyClaimed ? (t.claimed || 'Claimed ✓') : (t.claim || 'Claim Now')}
                    </button>
                  </div>
                </div>

                {/* Section Title */}
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-black text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚡</span> {t.specialArcade || "Featured Arcade Games"}
                  </h3>
                  <span className="text-[10px] text-cyan-400 font-bold">8 {t.availableGames || "Games Available"}</span>
                </div>

                {/* 🎮 REFERENCE STYLE GAMES GRID: CLEAN THUMBNAIL + NAME BELOW */}
                <div className="grid grid-cols-2 gap-3.5 w-full">
                  {GAMES_LIST.map((game) => (
                    <div 
                      key={game.id}
                      onClick={() => setSelectedGame(game.id)}
                      className="flex flex-col cursor-pointer group"
                    >
                      {/* Thumbnail Container */}
                      <div className={`relative w-full h-28 rounded-2xl overflow-hidden border ${game.border} shadow-xl bg-gray-900 group-hover:scale-[1.03] transition-all`}>
                        <img 
                          src={game.thumbnail} 
                          alt={game.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        {/* Top Badge Tag */}
                        <div className={`absolute top-2 right-2 text-[8px] font-black px-2 py-0.5 rounded-full border shadow-md backdrop-blur-md ${game.badgeBg}`}>
                          {game.tag}
                        </div>
                      </div>

                      {/* Game Name Clearly Below Thumbnail */}
                      <div className="mt-1.5 px-1 flex items-center justify-between">
                        <h3 className="text-[11px] font-bold text-gray-200 tracking-wide group-hover:text-yellow-400 transition-colors truncate">
                          {game.name}
                        </h3>
                        <span className="text-[10px] text-yellow-400 font-black group-hover:translate-x-1 transition-transform">
                          ▶
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </>
        )}

        {activeTab === 'tournament' && <TournamentSection />}
        {activeTab === 'rank' && <RankSection />}
        {activeTab === 'wallet' && <WalletSection />}
      </div>

      {/* 🎯 DAILY MISSIONS MODAL */}
      {showDailyMissions && (
        <DailyMissions onClose={() => setShowDailyMissions(false)} />
      )}

      {/* 🔒 AUTH MODAL OVERLAY */}
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

      {/* 🎡 FLOATING LUCKY SPIN WIDGET */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end">
        {!showSpinPopup && (
          <button
            onClick={() => setShowSpinPopup(true)}
            className="relative bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 p-3.5 rounded-full shadow-2xl border-2 border-yellow-300 animate-bounce hover:scale-110 transition-all cursor-pointer flex items-center justify-center"
            title="Lucky Spin Wheel"
          >
            <span className="text-2xl">🎡</span>
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border border-white uppercase">
              SPIN
            </span>
          </button>
        )}

        {showSpinPopup && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-sm bg-gray-900 border border-yellow-500/50 rounded-2xl p-4 shadow-2xl animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => setShowSpinPopup(false)}
                className="absolute top-3 right-3 bg-red-600/80 hover:bg-red-600 text-white w-7 h-7 rounded-full font-bold flex items-center justify-center text-xs shadow transition-all cursor-pointer z-10"
              >
                ✕
              </button>
              <ArenaSpinnerWinner />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="w-full max-w-md fixed bottom-0 bg-gray-950/90 backdrop-blur-md border-t border-gray-805 flex items-center justify-around py-2.5 z-40 shadow-2xl">
        <button 
          onClick={() => { setActiveTab('home'); setSelectedGame(null); }} 
          className={`flex flex-col items-center py-1 px-4 rounded-xl transition-all cursor-pointer ${activeTab === 'home' ? 'text-yellow-400 scale-105 font-bold' : 'text-gray-400 hover:text-white'}`}
        >
          <span className="text-lg">🏠</span>
          <span className="text-[10px] mt-0.5">{t.navHome || "Home"}</span>
        </button>

        <button 
          onClick={() => setActiveTab('tournament')} 
          className={`flex flex-col items-center py-1 px-4 rounded-xl transition-all cursor-pointer ${activeTab === 'tournament' ? 'text-yellow-400 scale-105 font-bold' : 'text-gray-400 hover:text-white'}`}
        >
          <span className="text-lg">🏆</span>
          <span className="text-[10px] mt-0.5">{t.navTournaments || "Tournaments"}</span>
        </button>

        <button 
          onClick={() => setActiveTab('rank')} 
          className={`flex flex-col items-center py-1 px-4 rounded-xl transition-all cursor-pointer ${activeTab === 'rank' ? 'text-yellow-400 scale-105 font-bold' : 'text-gray-400 hover:text-white'}`}
        >
          <span className="text-lg">👑</span>
          <span className="text-[10px] mt-0.5">{t.navRanks || "Ranks"}</span>
        </button>

        <button 
          onClick={() => setActiveTab('wallet')} 
          className={`flex flex-col items-center py-1 px-4 rounded-xl transition-all cursor-pointer ${activeTab === 'wallet' ? 'text-yellow-400 scale-105 font-bold' : 'text-gray-400 hover:text-white'}`}
        >
          <span className="text-lg">💰</span>
          <span className="text-[10px] mt-0.5">{t.navWallet || "Wallet"}</span>
        </button>
      </nav>
    </main>
  );
}