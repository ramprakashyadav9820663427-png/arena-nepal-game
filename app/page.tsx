'use client';

import React, { useState, useEffect, useCallback } from 'react';

import RockPaperScissors from '@/components/game/RockPaperScissors';
import GameSection from '@/components/game/GameSection';
import TeenPattiBattle from '@/components/game/TeenPattiBattle';
import OneCardBattle from '@/components/game/OneCardBattle';
import RocketCrashGame from '@/components/game/RocketCrashGame';
import CarRacingGame from '@/components/game/CarRacingGame';
import LudoGotiSprint from '@/components/game/LudoGotiSprint';
import ArenaSpinnerWinner from '@/components/game/ArenaSpinnerWinner';
import JhandiMundaGame from '@/components/game/JhandiMundaGame';
import TournamentSection from '@/components/TournamentSection';
import WalletSection from '@/components/WalletSection';
import RankSection from '@/components/RankSection';
import DailyMissions from '@/components/DailyMissions';
import AuthModal from '@/components/AuthModal';
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

// 🎮 GAMES CONFIGURATION
const GAMES_LIST = [
  {
    id: 'jhandimunda',
    name: 'Jhandi Munda',
    tag: 'CHHAKKA 🎲',
    thumbnail: '/thumbnails/jhandi-munda.jpg',
    border: 'border-yellow-500/50 hover:border-yellow-400',
    badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    glow: 'group-hover:shadow-[0_0_20px_rgba(234,179,8,0.35)]'
  },
  {
    id: 'spin',
    name: 'Arena Spinner Winner',
    tag: 'SPIN 🎡',
    thumbnail: '/thumbnails/spin-winner.jpg',
    border: 'border-yellow-500/30 hover:border-yellow-400',
    badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    glow: 'group-hover:shadow-[0_0_20px_rgba(234,179,8,0.35)]'
  },
  {
    id: 'teenpatti',
    name: 'Teen Patti Battle',
    tag: '3 ACES',
    thumbnail: '/thumbnails/teenpatti.jpg',
    border: 'border-yellow-500/30 hover:border-yellow-400',
    badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    glow: 'group-hover:shadow-[0_0_20px_rgba(234,179,8,0.35)]'
  },
  {
    id: 'rocket',
    name: 'Rocket Crash',
    tag: '10x RUSH',
    thumbnail: '/thumbnails/rocket.jpg',
    border: 'border-cyan-500/30 hover:border-cyan-400',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    glow: 'group-hover:shadow-[0_0_20px_rgba(34,211,238,0.35)]'
  },
  {
    id: 'rps',
    name: 'Rock Paper Scissors',
    tag: '1v1 ARENA',
    thumbnail: '/thumbnails/rps.jpg',
    border: 'border-amber-500/30 hover:border-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    glow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.35)]'
  },
  {
    id: 'neon',
    name: 'Diamond Collector',
    tag: 'FREE PLAY',
    thumbnail: '/thumbnails/neon.jpg',
    border: 'border-cyan-500/30 hover:border-cyan-400',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    glow: 'group-hover:shadow-[0_0_20px_rgba(34,211,238,0.35)]'
  },
  {
    id: 'onecard',
    name: 'One Card Battle',
    tag: 'ACE HIGH',
    thumbnail: '/thumbnails/onecard.jpg',
    border: 'border-red-500/30 hover:border-red-400',
    badgeBg: 'bg-red-500/20 text-red-300 border-red-500/30',
    glow: 'group-hover:shadow-[0_0_20px_rgba(239,68,68,0.35)]'
  },
  {
    id: 'carracing',
    name: 'Neon Car Racing',
    tag: '3.5x SPEED',
    thumbnail: '/thumbnails/carracing.jpg',
    border: 'border-amber-500/30 hover:border-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    glow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.35)]'
  },
  {
    id: 'ludogoti',
    name: 'Ludo Goti Sprint',
    tag: 'SPRINT',
    thumbnail: '/thumbnails/ludo.jpg',
    border: 'border-amber-500/30 hover:border-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    glow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.35)]'
  }
];

// Read red diamonds preferring localStorage (game updates live here)
function readLocalRed(): number | null {
  try {
    const keys = ['arena_red_diamonds', 'arena_red_dias', 'arena_diamond'];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (raw !== null && raw !== '') {
        const n = parseInt(raw, 10);
        if (!isNaN(n)) return n;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'home' | 'tournament' | 'rank' | 'wallet'>('home');
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [dailyClaimed, setDailyClaimed] = useState<boolean>(false);

  const [showDailyMissions, setShowDailyMissions] = useState<boolean>(false);
  const [onlinePlayers, setOnlinePlayers] = useState<number>(1428);
  const [currentWinnerIndex, setCurrentWinnerIndex] = useState<number>(0);
  const [session, setSession] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // 🔴 GLOBAL WALLET BALANCE STATE
  const [redDiamonds, setRedDiamonds] = useState<number>(0);
  const [whiteDiamonds, setWhiteDiamonds] = useState<number>(0);
  const [winningCash, setWinningCash] = useState<number>(0);

  // Write balances to localStorage (games + WalletSection sync)
  const syncLocalStorage = useCallback((red: number, white: number, cash: number) => {
    try {
      localStorage.setItem('arena_red_diamonds', String(red));
      localStorage.setItem('arena_red_dias', String(red));
      localStorage.setItem('arena_diamond', String(red));
      localStorage.setItem('arena_white_diamonds', String(white));
      localStorage.setItem('arena_winning_cash', String(cash));
    } catch {
      // ignore
    }
  }, []);

  // Update all balance states + localStorage + broadcast
  const updateBalances = useCallback(
    (red: number, white: number, cash: number) => {
      setRedDiamonds(red);
      setWhiteDiamonds(white);
      setWinningCash(cash);
      syncLocalStorage(red, white, cash);

      window.dispatchEvent(
        new CustomEvent('walletUpdated', {
          detail: {
            redDiamonds: red,
            whiteDiamonds: white,
            winningCash: cash,
            balance: red
          }
        })
      );
    },
    [syncLocalStorage]
  );

  // Fetch from Supabase — but RED prefers localStorage so game wins/losses survive refresh
  const fetchProfileBalances = useCallback(
    async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('red_diamonds, white_diamonds, winning_cash')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching profile balances:', error);
          // Still try local red
          const localRed = readLocalRed();
          if (localRed !== null) {
            setRedDiamonds(localRed);
          }
          return;
        }

        if (data) {
          const localRed = readLocalRed();
          // Prefer localStorage for red (games updates live there)
          const red = localRed !== null ? localRed : (data.red_diamonds ?? 0);
          const white = data.white_diamonds ?? 0;
          const cash = data.winning_cash ?? 0;
          updateBalances(red, white, cash);
        }
      } catch (err) {
        console.error('Unexpected error fetching balances:', err);
        const localRed = readLocalRed();
        if (localRed !== null) setRedDiamonds(localRed);
      }
    },
    [updateBalances]
  );

  useEffect(() => {
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
    let isMounted = true;

    const setupRealtime = (userId: string) => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }

      realtimeChannel = supabase
        .channel(`profile-balance:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`
          },
          (payload) => {
            if (!isMounted) return;

            const newRow = payload.new as {
              red_diamonds?: number;
              white_diamonds?: number;
              winning_cash?: number;
            };

            // Prefer localStorage for red so in-game changes are not overwritten
            const localRed = readLocalRed();
            const red = localRed !== null ? localRed : (newRow.red_diamonds ?? 0);
            const white = newRow.white_diamonds ?? 0;
            const cash = newRow.winning_cash ?? 0;

            updateBalances(red, white, cash);
          }
        )
        .subscribe();
    };

    const checkUserSession = async () => {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      setSession(currentSession);

      if (!currentSession) {
        setShowAuthModal(true);
        updateBalances(0, 0, 0);
        return;
      }

      // Instant local red so header is correct before network returns
      const localRed = readLocalRed();
      if (localRed !== null) {
        setRedDiamonds(localRed);
      }

      await fetchProfileBalances(currentSession.user.id);
      setupRealtime(currentSession.user.id);
    };

    checkUserSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;

      setSession(newSession);

      if (newSession) {
        setShowAuthModal(false);
        const localRed = readLocalRed();
        if (localRed !== null) setRedDiamonds(localRed);
        await fetchProfileBalances(newSession.user.id);
        setupRealtime(newSession.user.id);
      } else {
        setShowAuthModal(true);
        updateBalances(0, 0, 0);
        if (realtimeChannel) {
          supabase.removeChannel(realtimeChannel);
          realtimeChannel = null;
        }
      }
    });

    // Daily claim status
    const lastClaim = localStorage.getItem('arena_daily_claim_date');
    const today = new Date().toDateString();
    if (lastClaim === today) {
      setDailyClaimed(true);
    }

    // Listen for walletUpdated / storage (from games + WalletSection)
    const handleWalletUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;

      // Legacy: updateGlobalBalance dispatches a plain number
      if (typeof detail === 'number') {
        setRedDiamonds(detail);
        try {
          localStorage.setItem('arena_red_diamonds', String(detail));
          localStorage.setItem('arena_red_dias', String(detail));
          localStorage.setItem('arena_diamond', String(detail));
        } catch {
          // ignore
        }
        return;
      }

      if (detail && typeof detail === 'object') {
        if (typeof detail.redDiamonds === 'number') {
          setRedDiamonds(detail.redDiamonds);
        } else if (typeof detail.balance === 'number') {
          setRedDiamonds(detail.balance);
        }
        if (typeof detail.whiteDiamonds === 'number') {
          setWhiteDiamonds(detail.whiteDiamonds);
        }
        if (typeof detail.winningCash === 'number') {
          setWinningCash(detail.winningCash);
        }
      } else {
        // storage event or empty detail → re-read local red
        const localRed = readLocalRed();
        if (localRed !== null) setRedDiamonds(localRed);
      }
    };

    window.addEventListener('walletUpdated', handleWalletUpdate);
    window.addEventListener('storage', handleWalletUpdate);

    // Online players ticker
    const playerInterval = setInterval(() => {
      setOnlinePlayers((prev) => {
        const randomChange = Math.floor(Math.random() * 15) - 7;
        const updated = prev + randomChange;
        return updated > 1200 ? updated : 1350;
      });
    }, 4000);

    // Live winners ticker
    const winnerInterval = setInterval(() => {
      setCurrentWinnerIndex((prev) => (prev + 1) % DUMMY_WINNERS.length);
    }, 3500);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
      window.removeEventListener('walletUpdated', handleWalletUpdate);
      window.removeEventListener('storage', handleWalletUpdate);
      clearInterval(playerInterval);
      clearInterval(winnerInterval);
    };
  }, [fetchProfileBalances, updateBalances]);

  // Daily Login Bonus → updates Supabase profiles.white_diamonds
  const handleClaimDaily = async () => {
    if (dailyClaimed || !session?.user?.id) return;

    const today = new Date().toDateString();
    localStorage.setItem('arena_daily_claim_date', today);
    setDailyClaimed(true);

    try {
      const newWhite = whiteDiamonds + 1000;
      updateBalances(redDiamonds, newWhite, winningCash);

      const { error } = await supabase
        .from('profiles')
        .update({ white_diamonds: newWhite })
        .eq('id', session.user.id);

      if (error) {
        console.error('Failed to update daily bonus in Supabase:', error);
        updateBalances(redDiamonds, whiteDiamonds, winningCash);
        setDailyClaimed(false);
        localStorage.removeItem('arena_daily_claim_date');
        alert('Failed to claim daily bonus. Please try again.');
        return;
      }

      alert('🎁 Daily Bonus Claimed! +1000 White Diamonds added to your wallet!');
    } catch (err) {
      console.error('Unexpected error claiming daily bonus:', err);
      updateBalances(redDiamonds, whiteDiamonds, winningCash);
      setDailyClaimed(false);
      localStorage.removeItem('arena_daily_claim_date');
      alert('Something went wrong. Please try again.');
    }
  };

  return (
    <main className="min-h-screen bg-[#050508] text-white flex flex-col items-center pb-24 select-none relative overflow-x-hidden">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[420px] h-[280px] bg-yellow-500/8 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-0 w-[200px] h-[200px] bg-purple-600/10 rounded-full blur-[80px]" />
      </div>

      {/* ═══════ PREMIUM TOP HEADER ═══════ */}
      <header className="w-full max-w-md relative z-40 sticky top-0">
        <div className="mx-2 mt-2 rounded-2xl border border-yellow-500/25 bg-gradient-to-r from-black/90 via-gray-950/95 to-black/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] px-3.5 py-3 flex items-center justify-between">
          {/* Left: Logo + Online */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center shadow-[0_0_16px_rgba(234,179,8,0.45)] text-black font-black text-base shrink-0">
              👑
            </div>

            <div className="flex flex-col min-w-0">
              <h1 className="text-[11px] font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 tracking-wider uppercase leading-tight">
                ARENA NEPAL
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-[9px] text-green-400/90 font-bold tracking-tight truncate">
                  {onlinePlayers.toLocaleString()} Online
                </span>
              </div>
            </div>
          </div>

          {/* Right: Balances + Back */}
          <div className="flex items-center gap-1.5 shrink-0">
            {session ? (
              <>
                {/* White Diamonds */}
                <div className="flex items-center gap-1 bg-white/5 border border-white/15 px-2 py-1 rounded-xl shadow-inner">
                  <span className="text-[11px]">⚪</span>
                  <span className="text-[11px] font-black text-gray-100 tabular-nums">
                    {whiteDiamonds.toLocaleString()}
                  </span>
                </div>

                {/* Red Diamonds */}
                <div className="flex items-center gap-1 bg-gradient-to-r from-red-950/80 to-purple-950/80 border border-red-500/45 px-2 py-1 rounded-xl shadow-[0_0_12px_rgba(239,68,68,0.2)]">
                  <span className="text-[11px]">🔴</span>
                  <span className="text-[11px] font-black text-red-400 tabular-nums">
                    {redDiamonds.toLocaleString()}
                  </span>
                </div>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-[10px] font-black bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-black px-3 py-1.5 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                Login
              </button>
            )}

            {selectedGame && (
              <button
                onClick={() => setSelectedGame(null)}
                className="text-[10px] font-extrabold bg-red-500/15 text-red-400 border border-red-500/40 px-2.5 py-1.5 rounded-xl cursor-pointer hover:bg-red-500/25 active:scale-95 transition-all"
              >
                ← Back
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="w-full max-w-md flex flex-col items-center flex-1 p-4 gap-4 relative z-10">
        {activeTab === 'home' && (
          <>
            {selectedGame === 'jhandimunda' ? (
              <JhandiMundaGame />
            ) : selectedGame === 'spin' ? (
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
                {/* DAILY MISSION BANNER */}
                <div
                  onClick={() => setShowDailyMissions(true)}
                  className="w-full bg-gradient-to-r from-yellow-500/15 via-purple-600/15 to-pink-500/15 border border-yellow-500/40 p-3.5 rounded-2xl flex items-center justify-between shadow-lg cursor-pointer hover:scale-[1.02] hover:border-yellow-400/70 transition-all group backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-pink-500 rounded-xl flex items-center justify-center text-xl shadow-[0_0_14px_rgba(234,179,8,0.4)] group-hover:rotate-12 transition-transform">
                      🎯
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                        Your Daily Mission
                        <span className="text-[8px] bg-yellow-400 text-black px-1.5 py-0.5 rounded-full font-extrabold">
                          NEW
                        </span>
                      </h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Complete tasks & refer friends for rewards!
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black bg-gradient-to-r from-yellow-400 to-pink-500 text-black px-3 py-1.5 rounded-xl shadow shrink-0">
                    View →
                  </span>
                </div>

                {/* LIVE WINNER TICKER */}
                <div className="w-full bg-black/40 border border-yellow-500/25 px-3 py-2.5 rounded-2xl flex items-center gap-2.5 shadow-md overflow-hidden backdrop-blur-sm">
                  <span className="text-sm animate-bounce shrink-0">📢</span>
                  <div className="flex-1 overflow-hidden min-w-0">
                    <p className="text-[10px] font-bold text-yellow-300/95 truncate">
                      {DUMMY_WINNERS[currentWinnerIndex]}
                    </p>
                  </div>
                  <span className="text-[8px] font-black bg-red-500/20 text-red-400 border border-red-500/40 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 animate-pulse">
                    LIVE
                  </span>
                </div>

                {/* Hero Banner */}
                <div className="w-full bg-gradient-to-br from-indigo-950/90 via-purple-950/80 to-gray-950 border border-purple-500/35 p-4 rounded-3xl shadow-2xl relative overflow-hidden">
                  <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute right-10 top-3 text-4xl opacity-15 pointer-events-none">🏆</div>

                  <div className="relative">
                    <span className="text-[9px] font-black bg-pink-500/20 text-pink-400 border border-pink-500/30 px-2.5 py-1 rounded-full uppercase tracking-widest">
                      🔥 SEASON 1 LIVE
                    </span>

                    <h2 className="text-base font-black text-white mt-2.5 leading-tight">
                      Play & Win Mega Tournaments!
                    </h2>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Compete in 1v1 arenas, climb leaderboards & cash out instantly.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-purple-500/20 flex items-center justify-between relative">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎁</span>
                      <div>
                        <p className="text-[11px] font-bold text-white">Daily Login Bonus</p>
                        <p className="text-[9px] text-cyan-400 font-semibold">
                          +1000 White Diamonds Free
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleClaimDaily}
                      disabled={dailyClaimed || !session}
                      className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer shadow-lg ${
                        dailyClaimed || !session
                          ? 'bg-gray-800/80 text-gray-500 border border-gray-700 cursor-not-allowed'
                          : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black hover:scale-105 active:scale-95'
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
                  <span className="text-[10px] text-cyan-400/90 font-bold">
                    {GAMES_LIST.length} Games
                  </span>
                </div>

                {/* GAMES GRID */}
                <div className="grid grid-cols-2 gap-3.5 w-full">
                  {GAMES_LIST.map((game) => (
                    <div
                      key={game.id}
                      onClick={() => setSelectedGame(game.id)}
                      className="flex flex-col cursor-pointer group"
                    >
                      <div
                        className={`relative w-full h-28 rounded-2xl overflow-hidden border ${game.border} shadow-xl bg-gray-900/80 group-hover:scale-[1.03] transition-all duration-300 ${game.glow}`}
                      >
                        <img
                          src={game.thumbnail}
                          alt={game.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                        <div
                          className={`absolute top-2 right-2 text-[8px] font-black px-2 py-0.5 rounded-full border shadow-md backdrop-blur-md ${game.badgeBg}`}
                        >
                          {game.tag}
                        </div>
                      </div>

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
        {activeTab === 'wallet' && (
          <WalletSection
            redDiamonds={redDiamonds}
            whiteDiamonds={whiteDiamonds}
            winningCash={winningCash}
            onBalanceUpdate={updateBalances}
          />
        )}
      </div>

      {/* DAILY MISSIONS MODAL */}
      {showDailyMissions && (
        <DailyMissions onClose={() => setShowDailyMissions(false)} />
      )}

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-gray-900/95 border border-yellow-500/40 rounded-3xl p-5 shadow-2xl animate-in fade-in zoom-in duration-200">
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

      {/* ═══════ PREMIUM BOTTOM NAV ═══════ */}
      <nav className="w-full max-w-md fixed bottom-0 z-40 px-2 pb-2">
        <div className="rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl shadow-[0_-8px_32px_rgba(0,0,0,0.5)] flex items-center justify-around py-2.5 px-1">
          <button
            onClick={() => {
              setActiveTab('home');
              setSelectedGame(null);
            }}
            className={`flex flex-col items-center py-1.5 px-4 rounded-xl transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'text-yellow-400 scale-105 font-bold bg-yellow-500/10'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            <span className="text-lg">🏠</span>
            <span className="text-[9px] mt-0.5 font-semibold">Home</span>
          </button>

          <button
            onClick={() => setActiveTab('tournament')}
            className={`flex flex-col items-center py-1.5 px-4 rounded-xl transition-all cursor-pointer ${
              activeTab === 'tournament'
                ? 'text-yellow-400 scale-105 font-bold bg-yellow-500/10'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            <span className="text-lg">🏆</span>
            <span className="text-[9px] mt-0.5 font-semibold">Tournaments</span>
          </button>

          <button
            onClick={() => setActiveTab('rank')}
            className={`flex flex-col items-center py-1.5 px-4 rounded-xl transition-all cursor-pointer ${
              activeTab === 'rank'
                ? 'text-yellow-400 scale-105 font-bold bg-yellow-500/10'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            <span className="text-lg">👑</span>
            <span className="text-[9px] mt-0.5 font-semibold">Ranks</span>
          </button>

          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex flex-col items-center py-1.5 px-4 rounded-xl transition-all cursor-pointer ${
              activeTab === 'wallet'
                ? 'text-yellow-400 scale-105 font-bold bg-yellow-500/10'
                : 'text-gray-500 hover:text-white'
            }`}
          >
            <span className="text-lg">💰</span>
            <span className="text-[9px] mt-0.5 font-semibold">Wallet</span>
          </button>
        </div>
      </nav>
    </main>
  );
}