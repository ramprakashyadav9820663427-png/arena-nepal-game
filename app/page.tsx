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
import NeonSkyRunner from '@/components/game/NeonSkyRunner';
import BlockStackMaster from '@/components/game/BlockStackMaster';
import TournamentSection from '@/components/TournamentSection';
import WalletSection from '@/components/WalletSection';
import RankSection from '@/components/RankSection';
import DailyMissions from '@/components/DailyMissions';
import AuthModal from '@/components/AuthModal';
import LandingPage from '@/components/LandingPage';
import SettingsSection from '@/components/SettingsSection';
import { supabase } from '@/lib/supabase';

const DUMMY_WINNERS = [
  "🔥 User 'Sam***' won 500 🔴 on Arena Spinner Winner!",
  "🚀 User 'Deepak99' cashed out at 4.2x on Rocket Crash!",
  "🏆 User 'Pooja_X' won 1v1 Teen Patti Battle!",
  "🃏 User 'Rahul_K' won 1,900 Red Diamonds on One Card!",
  "🎲 User 'LudoKing_99' collected 3,500 Red Diamonds on Ludo Sprint!",
  "🏎️ User 'Bikash_NP' won 3.5x on Car Racing!"
];

const GAMES_LIST = [
  {
    id: 'jhandimunda',
    name: 'Jhandi Munda',
    tag: 'CHHAKKA 🎲',
    thumbnail: '/thumbnails/jhandi-munda.jpg',
    category: 'popular',
    accent: 'yellow'
  },
  {
    id: 'spin',
    name: 'Arena Spinner Winner',
    tag: 'SPIN 🎡',
    thumbnail: '/thumbnails/spin-winner.jpg',
    category: 'popular',
    accent: 'yellow'
  },
  {
    id: 'teenpatti',
    name: 'Teen Patti Battle',
    tag: '3 ACES',
    thumbnail: '/thumbnails/teenpatti.jpg',
    category: 'popular',
    accent: 'yellow'
  },
  {
    id: 'rocket',
    name: 'Rocket Crash',
    tag: '10X RUSH',
    thumbnail: '/thumbnails/rocket.jpg',
    category: 'popular',
    accent: 'cyan'
  },
  {
    id: 'rps',
    name: 'Rock Paper Scissors',
    tag: '1V1 ARENA',
    thumbnail: '/thumbnails/rps.jpg',
    category: 'all',
    accent: 'amber'
  },
  {
    id: 'neon',
    name: 'Diamond Collector',
    tag: 'FREE PLAY',
    thumbnail: '/thumbnails/neon.jpg',
    category: 'free',
    accent: 'cyan'
  },
  {
    id: 'skyrunner',
    name: 'Neon Sky Runner',
    tag: 'FREE PLAY',
    thumbnail: '/thumbnails/neon-sky-runner.jpg',
    category: 'free',
    accent: 'cyan'
  },
  {
    id: 'stackmaster',
    name: 'Block Stack Master',
    tag: 'FREE PLAY',
    thumbnail: '/thumbnails/block-stack-master.jpg',
    category: 'free',
    accent: 'cyan'
  },
  {
    id: 'onecard',
    name: 'One Card Battle',
    tag: 'ACE HIGH',
    thumbnail: '/thumbnails/onecard.jpg',
    category: 'all',
    accent: 'red'
  },
  {
    id: 'carracing',
    name: 'Neon Car Racing',
    tag: '3.5X SPEED',
    thumbnail: '/thumbnails/carracing.jpg',
    category: 'all',
    accent: 'amber'
  },
  {
    id: 'ludogoti',
    name: 'Ludo Goti Sprint',
    tag: 'SPRINT',
    thumbnail: '/thumbnails/ludo.jpg',
    category: 'all',
    accent: 'amber'
  }
];

type GameCategory = 'popular' | 'all' | 'free';

function readLocalRed(): number | null {
  try {
    const keys = [
      'arena_red_diamonds',
      'arena_red_dias',
      'arena_diamond'
    ];

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

const formatNumber = (value: number) =>
  Number(value || 0).toLocaleString('en-IN');

export default function Home() {
  const [activeTab, setActiveTab] = useState<
    'home' | 'tournament' | 'rank' | 'wallet'
  >('home');

  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [gameCategory, setGameCategory] =
    useState<GameCategory>('popular');

  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [showDailyMissions, setShowDailyMissions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [onlinePlayers, setOnlinePlayers] = useState(1428);
  const [currentWinnerIndex, setCurrentWinnerIndex] = useState(0);

  const [session, setSession] = useState<any>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [redDiamonds, setRedDiamonds] = useState(0);
  const [whiteDiamonds, setWhiteDiamonds] = useState(0);
  const [winningCash, setWinningCash] = useState(0);

  const [showWelcomeBonus, setShowWelcomeBonus] = useState(false);
  const [welcomeClaiming, setWelcomeClaiming] = useState(false);
  const [welcomeClaimedSuccess, setWelcomeClaimedSuccess] =
    useState(false);
  const [showDepositPromo, setShowDepositPromo] = useState(false);

  const syncLocalStorage = useCallback(
    (red: number, white: number, cash: number) => {
      try {
        localStorage.setItem('arena_red_diamonds', String(red));
        localStorage.setItem('arena_red_dias', String(red));
        localStorage.setItem('arena_diamond', String(red));
        localStorage.setItem('arena_white_diamonds', String(white));
        localStorage.setItem('arena_winning_cash', String(cash));
      } catch {
        // ignore
      }
    },
    []
  );

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

  const fetchProfileBalances = useCallback(
    async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(
            'red_diamonds, white_diamonds, winning_cash, welcome_bonus_claimed'
          )
          .eq('id', userId)
          .single();

        if (error) {
          console.error(
            'Error fetching profile balances:',
            error
          );

          const localRed = readLocalRed();
          if (localRed !== null) setRedDiamonds(localRed);
          return;
        }

        if (data) {
          const localRed = readLocalRed();
          const red =
            localRed !== null
              ? localRed
              : (data.red_diamonds ?? 0);

          const white = data.white_diamonds ?? 0;
          const cash = data.winning_cash ?? 0;

          updateBalances(red, white, cash);

          if (data.welcome_bonus_claimed !== true) {
            setShowWelcomeBonus(true);
            setWelcomeClaimedSuccess(false);
            setShowDepositPromo(false);
          }
        }
      } catch (err) {
        console.error(
          'Unexpected error fetching balances:',
          err
        );

        const localRed = readLocalRed();
        if (localRed !== null) setRedDiamonds(localRed);
      }
    },
    [updateBalances]
  );

  const handleClaimWelcomeBonus = async () => {
    if (!session?.user?.id || welcomeClaiming) return;

    setWelcomeClaiming(true);

    try {
      const newWhite = whiteDiamonds + 5000;

      const { error } = await supabase
        .from('profiles')
        .update({
          white_diamonds: newWhite,
          welcome_bonus_claimed: true
        })
        .eq('id', session.user.id);

      if (error) {
        console.error(
          'Welcome bonus claim failed:',
          error
        );

        alert('Claim failed. Please try again.');
        setWelcomeClaiming(false);
        return;
      }

      updateBalances(redDiamonds, newWhite, winningCash);
      setWelcomeClaimedSuccess(true);

      setTimeout(() => {
        setShowWelcomeBonus(false);
        setShowDepositPromo(true);
      }, 1800);
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    } finally {
      setWelcomeClaiming(false);
    }
  };

  useEffect(() => {
    let realtimeChannel:
      | ReturnType<typeof supabase.channel>
      | null = null;

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

            const localRed = readLocalRed();

            const red =
              localRed !== null
                ? localRed
                : (newRow.red_diamonds ?? 0);

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
      setCheckingSession(false);

      if (!currentSession) {
        updateBalances(0, 0, 0);
        setShowWelcomeBonus(false);
        return;
      }

      const localRed = readLocalRed();
      if (localRed !== null) setRedDiamonds(localRed);

      await fetchProfileBalances(currentSession.user.id);
      setupRealtime(currentSession.user.id);
    };

    checkUserSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!isMounted) return;

        setSession(newSession);

        if (newSession) {
          setShowAuthModal(false);

          const localRed = readLocalRed();
          if (localRed !== null) {
            setRedDiamonds(localRed);
          }

          await fetchProfileBalances(newSession.user.id);
          setupRealtime(newSession.user.id);
        } else {
          updateBalances(0, 0, 0);
          setShowWelcomeBonus(false);
          setShowDepositPromo(false);
          setShowSettings(false);

          if (realtimeChannel) {
            supabase.removeChannel(realtimeChannel);
            realtimeChannel = null;
          }
        }
      }
    );

    const lastClaim = localStorage.getItem(
      'arena_daily_claim_date'
    );

    const today = new Date().toDateString();
    if (lastClaim === today) {
      setDailyClaimed(true);
    }

    const handleWalletUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;

      if (typeof detail === 'number') {
        setRedDiamonds(detail);

        try {
          localStorage.setItem(
            'arena_red_diamonds',
            String(detail)
          );
          localStorage.setItem(
            'arena_red_dias',
            String(detail)
          );
          localStorage.setItem(
            'arena_diamond',
            String(detail)
          );
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
        const localRed = readLocalRed();
        if (localRed !== null) {
          setRedDiamonds(localRed);
        }
      }
    };

    window.addEventListener(
      'walletUpdated',
      handleWalletUpdate
    );

    window.addEventListener(
      'storage',
      handleWalletUpdate
    );

    const playerInterval = setInterval(() => {
      setOnlinePlayers((prev) => {
        const randomChange =
          Math.floor(Math.random() * 15) - 7;

        const updated = prev + randomChange;
        return updated > 1200 ? updated : 1350;
      });
    }, 4000);

    const winnerInterval = setInterval(() => {
      setCurrentWinnerIndex(
        (prev) => (prev + 1) % DUMMY_WINNERS.length
      );
    }, 3500);

    return () => {
      isMounted = false;
      subscription.unsubscribe();

      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }

      window.removeEventListener(
        'walletUpdated',
        handleWalletUpdate
      );

      window.removeEventListener(
        'storage',
        handleWalletUpdate
      );

      clearInterval(playerInterval);
      clearInterval(winnerInterval);
    };
  }, [fetchProfileBalances, updateBalances]);

  const handleClaimDaily = async () => {
    if (dailyClaimed || !session?.user?.id) return;

    const today = new Date().toDateString();

    localStorage.setItem(
      'arena_daily_claim_date',
      today
    );

    setDailyClaimed(true);

    try {
      const newWhite = whiteDiamonds + 1000;

      updateBalances(
        redDiamonds,
        newWhite,
        winningCash
      );

      const { error } = await supabase
        .from('profiles')
        .update({
          white_diamonds: newWhite
        })
        .eq('id', session.user.id);

      if (error) {
        console.error(
          'Failed to update daily bonus in Supabase:',
          error
        );

        updateBalances(
          redDiamonds,
          whiteDiamonds,
          winningCash
        );

        setDailyClaimed(false);

        localStorage.removeItem(
          'arena_daily_claim_date'
        );

        alert(
          'Failed to claim daily bonus. Please try again.'
        );

        return;
      }

      alert(
        '🎁 Daily Bonus Claimed! +1000 White Diamonds added to your wallet!'
      );
    } catch (err) {
      console.error(
        'Unexpected error claiming daily bonus:',
        err
      );

      updateBalances(
        redDiamonds,
        whiteDiamonds,
        winningCash
      );

      setDailyClaimed(false);

      localStorage.removeItem(
        'arena_daily_claim_date'
      );

      alert(
        'Something went wrong. Please try again.'
      );
    }
  };

  const openTab = (
    tab: 'home' | 'tournament' | 'rank' | 'wallet'
  ) => {
    setActiveTab(tab);
    setSelectedGame(null);
  };

  const filteredGames = GAMES_LIST.filter((game) => {
    if (gameCategory === 'all') return true;
    if (gameCategory === 'free') {
      return game.category === 'free';
    }
    return game.category === 'popular';
  });

  if (!checkingSession && !session) {
    return (
      <>
        <LandingPage
          onOpenAuth={() => setShowAuthModal(true)}
        />
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </>
    );
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#050508] pb-28 text-white selection:bg-yellow-400/30">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-36 left-1/2 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-yellow-500/[0.07] blur-[120px]" />
        <div className="absolute right-[-100px] top-[35%] h-[300px] w-[300px] rounded-full bg-purple-600/[0.09] blur-[110px]" />
        <div className="absolute bottom-0 left-[-100px] h-[280px] w-[280px] rounded-full bg-cyan-500/[0.06] blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.025),transparent_55%)]" />
      </div>

      <header className="sticky top-0 z-50 w-full border-b border-yellow-500/15 bg-[#08080d]/95 shadow-[0_8px_35px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-3 py-3 sm:px-5 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-yellow-400/50 bg-black shadow-[0_0_22px_rgba(234,179,8,0.20)] sm:h-14 sm:w-14">
                <img
                  src="/arena-nepal-logo.jpg"
                  alt="Arena Nepal Logo"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 -z-10 flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-600 text-xl">
                  👑
                </div>
              </div>

              <div className="min-w-0">
                <h1 className="bg-gradient-to-r from-yellow-200 via-amber-400 to-orange-500 bg-clip-text text-sm font-black uppercase tracking-[0.12em] text-transparent sm:text-lg">
                  ARENA NEPAL
                </h1>

                <div className="mt-1 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>

                  <span className="truncate text-[10px] font-bold text-green-400 sm:text-xs">
                    {formatNumber(onlinePlayers)} Online
                  </span>
                  <span className="hidden text-[10px] text-gray-600 sm:inline">
                    • Premium Gaming Arena
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => openTab('rank')}
                className="flex h-10 max-w-[115px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 transition hover:border-yellow-400/40 hover:bg-white/[0.07] sm:max-w-none sm:px-3"
                title="Player Profile"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-yellow-400/30 bg-gradient-to-br from-yellow-400/20 to-orange-600/20 text-sm">
                  👤
                </span>
                <span className="min-w-0 text-left">
                  <span className="block truncate text-[10px] font-bold text-white sm:text-xs">
                    {session?.user?.user_metadata?.nickname ||
                      session?.user?.user_metadata?.full_name ||
                      'Player'}
                  </span>
                  <span className="block text-[8px] text-gray-500 sm:text-[9px]">
                    PLAYER
                  </span>
                </span>
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/[0.08] text-lg text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.08)] transition hover:border-cyan-300 hover:bg-cyan-400/15 hover:text-white active:scale-95"
                aria-label="Settings"
                title="Settings"
              >
                ⚙️
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-red-500/30 bg-gradient-to-br from-red-950/60 to-[#10080c] px-2 py-2 shadow-[0_0_18px_rgba(239,68,68,0.07)]">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🔴</span>
                <span className="truncate text-[8px] font-black uppercase tracking-wider text-red-300/80 sm:text-[10px]">
                  Red Diamonds
                </span>
              </div>
              <p className="mt-1 text-sm font-black tabular-nums text-red-300 sm:text-base">
                {formatNumber(redDiamonds)}
              </p>
            </div>

            <div className="rounded-xl border border-cyan-500/25 bg-gradient-to-br from-cyan-950/50 to-[#080e13] px-2 py-2 shadow-[0_0_18px_rgba(34,211,238,0.06)]">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">⚪</span>
                <span className="truncate text-[8px] font-black uppercase tracking-wider text-cyan-200/80 sm:text-[10px]">
                  White Diamonds
                </span>
              </div>
              <p className="mt-1 text-sm font-black tabular-nums text-cyan-200 sm:text-base">
                {formatNumber(whiteDiamonds)}
              </p>
            </div>

            <div className="rounded-xl border border-green-500/25 bg-gradient-to-br from-green-950/50 to-[#08100c] px-2 py-2 shadow-[0_0_18px_rgba(34,197,94,0.06)]">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">💵</span>
                <span className="truncate text-[8px] font-black uppercase tracking-wider text-green-200/80 sm:text-[10px]">
                  Winning Cash
                </span>
              </div>
              <p className="mt-1 text-sm font-black tabular-nums text-green-300 sm:text-base">
                NPR {formatNumber(winningCash)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-5 px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
        {activeTab === 'home' && (
          <>
            {selectedGame ? (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setSelectedGame(null)}
                  className="flex w-fit items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-bold text-white transition hover:border-yellow-400/40 hover:bg-yellow-400/10 hover:text-yellow-300 active:scale-95"
                >
                  ← Back to Lobby
                </button>

                {selectedGame === 'jhandimunda' ? (
                  <JhandiMundaGame />
                ) : selectedGame === 'spin' ? (
                  <ArenaSpinnerWinner />
                ) : selectedGame === 'rps' ? (
                  <RockPaperScissors />
                ) : selectedGame === 'neon' ? (
                  <GameSection />
                ) : selectedGame === 'skyrunner' ? (
                  <NeonSkyRunner
                    onBackToLobby={() => setSelectedGame(null)}
                  />
                ) : selectedGame === 'stackmaster' ? (
                  <BlockStackMaster
                    onBackToLobby={() => setSelectedGame(null)}
                  />
                ) : selectedGame === 'teenpatti' ? (
                  <TeenPattiBattle
                    onBackToLobby={() => setSelectedGame(null)}
                  />
                ) : selectedGame === 'onecard' ? (
                  <OneCardBattle
                    onBackToLobby={() => setSelectedGame(null)}
                  />
                ) : selectedGame === 'rocket' ? (
                  <RocketCrashGame
                    onBackToLobby={() => setSelectedGame(null)}
                  />
                ) : selectedGame === 'carracing' ? (
                  <CarRacingGame
                    onBackToLobby={() => setSelectedGame(null)}
                  />
                ) : selectedGame === 'ludogoti' ? (
                  <LudoGotiSprint
                    onBackToLobby={() => setSelectedGame(null)}
                  />
                ) : null}
              </div>
            ) : (
              <>
                <section className="relative overflow-hidden rounded-3xl border border-yellow-500/25 bg-gradient-to-br from-[#20150a] via-[#100d18] to-[#090a13] p-4 shadow-[0_12px_45px_rgba(0,0,0,0.35)] sm:p-6">
                  <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-yellow-500/[0.10] blur-[65px]" />
                  <div className="pointer-events-none absolute -bottom-20 left-[35%] h-48 w-48 rounded-full bg-purple-500/[0.12] blur-[65px]" />

                  <div className="relative flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400/25 bg-yellow-400/[0.08] px-2.5 py-1 text-[9px] font-black tracking-[0.15em] text-yellow-300 sm:text-[10px]">
                        <span className="animate-pulse">✦</span>
                        WELCOME TO THE ARENA
                      </span>

                      <h2 className="mt-3 text-xl font-black leading-tight text-white sm:text-3xl">
                        Play Your Game.
                        <br />
                        <span className="bg-gradient-to-r from-yellow-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
                          Own Your Moment.
                        </span>
                      </h2>

                      <p className="mt-2 max-w-lg text-[11px] leading-relaxed text-gray-400 sm:text-sm">
                        Explore games, complete missions and
                        compete in the Arena Nepal community.
                      </p>

                      <button
                        onClick={() => openTab('tournament')}
                        className="mt-4 rounded-xl border border-yellow-300/40 bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[0_5px_20px_rgba(234,179,8,0.18)] transition hover:scale-[1.03] active:scale-95 sm:text-xs"
                      >
                        Explore Tournaments →
                      </button>
                    </div>

                    <div className="hidden shrink-0 sm:block">
                      <div className="flex h-32 w-32 items-center justify-center rounded-[2rem] border border-yellow-400/20 bg-gradient-to-br from-yellow-400/10 to-orange-600/5 text-6xl shadow-[0_0_40px_rgba(234,179,8,0.10)]">
                        🏆
                      </div>
                    </div>
                  </div>
                </section>

                <button
                  onClick={() => setShowDailyMissions(true)}
                  className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-purple-400/25 bg-gradient-to-r from-purple-950/50 via-[#171027] to-pink-950/30 p-3.5 text-left shadow-lg transition hover:-translate-y-0.5 hover:border-purple-300/50 hover:shadow-[0_8px_30px_rgba(168,85,247,0.10)] sm:p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-yellow-400/20 bg-gradient-to-br from-yellow-400/20 to-pink-500/20 text-xl shadow-[0_0_18px_rgba(234,179,8,0.10)] transition group-hover:rotate-6">
                      🎯
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-white sm:text-sm">
                          Your Daily Mission
                        </h3>
                        <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-[8px] font-black text-black">
                          NEW
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-gray-400 sm:text-xs">
                        Complete tasks & refer friends for rewards!
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-2 text-[9px] font-black text-black transition group-hover:scale-105 sm:text-[10px]">
                    VIEW →
                  </span>
                </button>

                <div className="flex items-center gap-2.5 overflow-hidden rounded-xl border border-yellow-500/15 bg-white/[0.025] px-3 py-3 shadow-md">
                  <span className="shrink-0 animate-bounce text-base">
                    📢
                  </span>

                  <p className="min-w-0 flex-1 truncate text-[10px] font-bold text-yellow-200/90 sm:text-xs">
                    {DUMMY_WINNERS[currentWinnerIndex]}
                  </p>

                  <span className="shrink-0 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-[8px] font-black tracking-wider text-red-400">
                    LIVE
                  </span>
                </div>

                <section className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-r from-[#0b1b26] via-[#101323] to-[#10102a] p-3.5 shadow-lg sm:p-4">
                  <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-cyan-400/[0.08] blur-[55px]" />

                  <div className="relative flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-xl">
                        🎁
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-xs font-black text-white sm:text-sm">
                          Daily Login Bonus
                        </h3>
                        <p className="mt-1 text-[10px] font-bold text-cyan-300 sm:text-xs">
                          +1,000 White Diamonds Free
                        </p>
                        <p className="mt-0.5 text-[9px] text-gray-500">
                          Daily reward
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleClaimDaily}
                      disabled={dailyClaimed}
                      className={`shrink-0 rounded-xl px-3.5 py-2.5 text-[10px] font-black transition active:scale-95 sm:px-5 sm:text-xs ${
                        dailyClaimed
                          ? 'cursor-not-allowed border border-gray-700 bg-gray-800 text-gray-500'
                          : 'bg-gradient-to-r from-cyan-300 to-blue-500 text-black shadow-[0_5px_18px_rgba(34,211,238,0.18)] hover:scale-105'
                      }`}
                    >
                      {dailyClaimed ? 'CLAIMED ✓' : 'CLAIM NOW'}
                    </button>
                  </div>
                </section>

                <section className="flex flex-col gap-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-400">
                        DISCOVER
                      </p>
                      <h2 className="mt-1 text-lg font-black text-white sm:text-2xl">
                        Game <span className="text-yellow-400">Arena</span>
                      </h2>
                      <p className="mt-1 text-[10px] text-gray-500 sm:text-xs">
                        Choose your next game
                      </p>
                    </div>

                    <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[9px] font-bold text-gray-400">
                      {filteredGames.length} GAMES
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-1.5">
                    {[
                      {
                        id: 'popular' as const,
                        label: '🔥 Popular',
                        count: GAMES_LIST.filter(
                          (g) => g.category === 'popular'
                        ).length
                      },
                      {
                        id: 'all' as const,
                        label: '🎮 All Games',
                        count: GAMES_LIST.length
                      },
                      {
                        id: 'free' as const,
                        label: '💎 Free Games',
                        count: GAMES_LIST.filter(
                          (g) => g.category === 'free'
                        ).length
                      }
                    ].map((category) => (
                      <button
                        key={category.id}
                        onClick={() =>
                          setGameCategory(category.id)
                        }
                        className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2.5 transition-all duration-200 ${
                          gameCategory === category.id
                            ? 'border border-yellow-400/25 bg-gradient-to-b from-yellow-400/15 to-orange-500/[0.06] text-yellow-300 shadow-[0_0_18px_rgba(234,179,8,0.07)]'
                            : 'border border-transparent text-gray-500 hover:bg-white/[0.04] hover:text-gray-200'
                        }`}
                      >
                        <span className="text-[10px] font-black sm:text-xs">
                          {category.label}
                        </span>
                        <span className="text-[8px] opacity-60">
                          {category.count} {category.count === 1 ? 'GAME' : 'GAMES'}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                    {filteredGames.map((game) => {
                      const accent =
                        game.accent === 'yellow'
                          ? 'border-yellow-500/30 hover:border-yellow-300 shadow-yellow-500/10'
                          : game.accent === 'cyan'
                          ? 'border-cyan-500/30 hover:border-cyan-300 shadow-cyan-500/10'
                          : game.accent === 'red'
                          ? 'border-red-500/30 hover:border-red-300 shadow-red-500/10'
                          : 'border-amber-500/30 hover:border-amber-300 shadow-amber-500/10';

                      const badge =
                        game.accent === 'yellow'
                          ? 'border-yellow-400/30 bg-yellow-400/15 text-yellow-200'
                          : game.accent === 'cyan'
                          ? 'border-cyan-400/30 bg-cyan-400/15 text-cyan-200'
                          : game.accent === 'red'
                          ? 'border-red-400/30 bg-red-400/15 text-red-200'
                          : 'border-amber-400/30 bg-amber-400/15 text-amber-200';

                      return (
                        <button
                          key={game.id}
                          onClick={() =>
                            setSelectedGame(game.id)
                          }
                          className="group min-w-0 text-left"
                        >
                          <div
                            className={`relative aspect-[1.42/1] overflow-hidden rounded-2xl border bg-[#101016] shadow-xl transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_12px_35px_rgba(0,0,0,0.45)] ${accent}`}
                          >
                            <img
                              src={game.thumbnail}
                              alt={game.name}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />

                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/10 opacity-90" />
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                            <span
                              className={`absolute right-2 top-2 rounded-full border px-2 py-1 text-[7px] font-black tracking-wider shadow-lg backdrop-blur-md sm:text-[8px] ${badge}`}
                            >
                              {game.tag}
                            </span>

                            <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/55 text-[10px] text-white shadow-lg backdrop-blur-md transition-all group-hover:scale-110 group-hover:border-yellow-300/50 group-hover:bg-yellow-400 group-hover:text-black">
                              ▶
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-1 px-1 pt-2">
                            <h3 className="truncate text-[10px] font-black tracking-wide text-gray-200 transition-colors group-hover:text-yellow-300 sm:text-xs">
                              {game.name}
                            </h3>
                            <span className="shrink-0 text-[8px] font-bold text-gray-600">
                              PLAY
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <button
                  onClick={() => openTab('tournament')}
                  className="group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border border-purple-400/25 bg-gradient-to-r from-[#201034] via-[#171025] to-[#10101a] p-4 text-left transition hover:border-purple-300/50 sm:p-5"
                >
                  <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-purple-500/15 blur-[50px]" />

                  <div className="relative flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-purple-300/20 bg-purple-400/10 text-2xl">
                      🏆
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black tracking-[0.15em] text-purple-300">
                        COMPETE
                      </p>
                      <h3 className="mt-1 text-sm font-black text-white sm:text-base">
                        Tournaments
                      </h3>
                      <p className="mt-1 text-[10px] text-gray-400 sm:text-xs">
                        Daily • Weekly • Monthly
                      </p>
                    </div>
                  </div>

                  <span className="relative shrink-0 rounded-xl border border-purple-300/20 bg-purple-400/10 px-3 py-2 text-[10px] font-black text-purple-200 transition group-hover:bg-purple-400/20">
                    EXPLORE →
                  </span>
                </button>
              </>
            )}
          </>
        )}

        {activeTab === 'tournament' && (
          <TournamentSection />
        )}

        {activeTab === 'rank' && (
          <RankSection />
        )}

        {activeTab === 'wallet' && (
          <WalletSection
            redDiamonds={redDiamonds}
            whiteDiamonds={whiteDiamonds}
            winningCash={winningCash}
            onBalanceUpdate={updateBalances}
          />
        )}
      </div>

      {showDailyMissions && (
        <DailyMissions
          onClose={() => setShowDailyMissions(false)}
        />
      )}

      {showSettings && (
        <SettingsSection
          onClose={() => setShowSettings(false)}
        />
      )}

      {showWelcomeBonus && session && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-sm rounded-3xl border border-yellow-500/40 bg-gradient-to-b from-gray-900 via-black to-gray-950 p-6 shadow-[0_0_60px_rgba(234,179,8,0.25)] animate-in fade-in zoom-in duration-300">
            <button
              onClick={() =>
                setShowWelcomeBonus(false)
              }
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white transition-all hover:bg-white/20"
            >
              ✕
            </button>

            {!welcomeClaimedSuccess ? (
              <>
                <div className="flex flex-col items-center pt-2 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 text-3xl shadow-[0_0_30px_rgba(234,179,8,0.5)]">
                    🎁
                  </div>

                  <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-yellow-400/90">
                    Welcome Gift
                  </p>

                  <h2 className="text-xl font-black leading-tight text-white">
                    Congratulations!
                  </h2>

                  <p className="mt-2 text-sm text-gray-300">
                    You received a special welcome reward
                  </p>

                  <div className="mt-4 rounded-2xl border border-white/15 bg-white/5 px-5 py-3">
                    <p className="bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-3xl font-black text-transparent">
                      5,000
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-cyan-300">
                      ⚪ White Diamonds
                    </p>
                  </div>

                  <p className="mt-3 text-[10px] text-gray-500">
                    Claim now to add them to your wallet
                  </p>
                </div>

                <button
                  onClick={handleClaimWelcomeBonus}
                  disabled={welcomeClaiming}
                  className="mt-5 w-full rounded-2xl bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 py-3.5 text-sm font-black text-black shadow-[0_8px_30px_rgba(234,179,8,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                >
                  {welcomeClaiming
                    ? 'Claiming...'
                    : '✨ Claim 5,000 White Diamonds'}
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="mb-3 animate-bounce text-5xl">
                  🎉
                </div>
                <h2 className="text-xl font-black text-yellow-300">
                  Congratulations!
                </h2>
                <p className="mt-2 text-sm text-gray-300">
                  +5,000 White Diamonds added to your wallet
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {showDepositPromo && session && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-cyan-950/90 via-gray-950 to-black p-6 shadow-[0_0_50px_rgba(34,211,238,0.2)] animate-in fade-in zoom-in duration-300">
            <button
              onClick={() =>
                setShowDepositPromo(false)
              }
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white transition-all hover:bg-white/20"
            >
              ✕
            </button>

            <div className="flex flex-col items-center pt-1 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-2xl shadow-lg">
                💰
              </div>

              <h2 className="text-lg font-black text-white">
                First Deposit Bonus!
              </h2>

              <p className="mt-2 text-sm font-bold text-cyan-200/90">
                100% Extra Bonus
              </p>

              <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
                Deposit Red Diamonds और पाओ{' '}
                <span className="font-bold text-cyan-300">
                  100% bonus
                </span>
                . ज्यादा खेलो, ज्यादा जीतो!
              </p>

              <button
                onClick={() => {
                  setShowDepositPromo(false);
                  setActiveTab('wallet');
                  setSelectedGame(null);
                }}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 py-3 text-sm font-black text-black shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Go to Wallet → Deposit
              </button>

              <button
                onClick={() =>
                  setShowDepositPromo(false)
                }
                className="mt-2 cursor-pointer text-[11px] text-gray-500 hover:text-gray-300"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-[#08080d]/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-xl items-center justify-around gap-1">
          {[
            {
              id: 'home' as const,
              icon: '🏠',
              label: 'Home'
            },
            {
              id: 'tournament' as const,
              icon: '🏆',
              label: 'Tournaments'
            },
            {
              id: 'rank' as const,
              icon: '👑',
              label: 'Ranks'
            },
            {
              id: 'wallet' as const,
              icon: '💰',
              label: 'Wallet'
            }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => openTab(tab.id)}
              className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-yellow-400/[0.09] text-yellow-300'
                  : 'text-gray-500 hover:bg-white/[0.03] hover:text-gray-200'
              }`}
            >
              {activeTab === tab.id && (
                <span className="absolute -top-2 h-0.5 w-8 rounded-full bg-gradient-to-r from-yellow-300 to-orange-500 shadow-[0_0_10px_rgba(234,179,8,0.6)]" />
              )}

              <span
                className={`text-lg transition-transform ${
                  activeTab === tab.id
                    ? 'scale-110'
                    : ''
                }`}
              >
                {tab.icon}
              </span>

              <span className="truncate text-[9px] font-bold sm:text-[10px]">
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}