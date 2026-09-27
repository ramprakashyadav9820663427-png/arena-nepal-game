'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getGlobalBalance, updateGlobalBalance } from '@/lib/wallet';
import { supabase } from '@/lib/supabase';

interface RocketCrashGameProps {
  onBackToLobby?: () => void;
}

const GAME_KEY = 'rocketcrash';

export default function RocketCrashGame({ onBackToLobby }: RocketCrashGameProps) {
  const [gameState, setGameState] = useState<
    'WAITING' | 'FLYING' | 'CASHED_OUT' | 'CRASHED'
  >('WAITING');
  const [waitTime, setWaitTime] = useState<number>(10);
  const [redDiamonds, setRedDiamonds] = useState<number>(0);

  const [selectedStake, setSelectedStake] = useState<number>(100);
  const [isBetPlaced, setIsBetPlaced] = useState<boolean>(false);
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [crashPoint, setCrashPoint] = useState<number>(2.0);
  const [profitWon, setProfitWon] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  const animRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const balanceRef = useRef(0);
  const isBetPlacedRef = useRef(false);
  const selectedStakeRef = useRef(100);
  const deductDoneRef = useRef(false);
  const launchStartedRef = useRef(false);

  const applyBalance = useCallback((next: number) => {
    const n = Math.max(0, Math.floor(Number(next) || 0));
    balanceRef.current = n;
    setRedDiamonds(n);
    updateGlobalBalance(n);
  }, []);

  const loadBalanceFromServer = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        const local = getGlobalBalance();
        balanceRef.current = local;
        setRedDiamonds(local);
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('red_diamonds')
        .eq('id', session.user.id)
        .single();
      if (error || data == null) {
        const local = getGlobalBalance();
        balanceRef.current = local;
        setRedDiamonds(local);
        return;
      }
      applyBalance(data.red_diamonds ?? 0);
    } catch {
      const local = getGlobalBalance();
      balanceRef.current = local;
      setRedDiamonds(local);
    }
  }, [applyBalance]);

  useEffect(() => {
    isBetPlacedRef.current = isBetPlaced;
  }, [isBetPlaced]);

  useEffect(() => {
    selectedStakeRef.current = selectedStake;
  }, [selectedStake]);

  useEffect(() => {
    void loadBalanceFromServer();

    const handleWalletSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      let next = getGlobalBalance();
      if (customEvent.detail !== undefined) {
        if (typeof customEvent.detail === 'number') next = customEvent.detail;
        else if (typeof customEvent.detail?.balance === 'number')
          next = customEvent.detail.balance;
        else if (typeof customEvent.detail?.redDiamonds === 'number')
          next = customEvent.detail.redDiamonds;
      }
      balanceRef.current = next;
      setRedDiamonds(next);
    };

    window.addEventListener('walletUpdated', handleWalletSync);
    window.addEventListener('storage', handleWalletSync);

    if (typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }

    return () => {
      window.removeEventListener('walletUpdated', handleWalletSync);
      window.removeEventListener('storage', handleWalletSync);
    };
  }, [loadBalanceFromServer]);

  const playSound = (freq = 440, type: OscillatorType = 'sine') => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      // optional
    }
  };

  // 10s wait → deduct if bet → launch (same rules)
  useEffect(() => {
    if (gameState !== 'WAITING' && gameState !== 'CRASHED') return;

    if (gameState === 'CRASHED') {
      const resetTimer = setTimeout(() => {
        setWaitTime(10);
        setIsBetPlaced(false);
        isBetPlacedRef.current = false;
        setMultiplier(1.0);
        deductDoneRef.current = false;
        launchStartedRef.current = false;
        setGameState('WAITING');
      }, 3000);
      return () => clearTimeout(resetTimer);
    }

    if (waitTime > 0) {
      const timer = setTimeout(() => {
        setWaitTime((prev) => prev - 1);
        playSound(500, 'triangle');
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (launchStartedRef.current) return;
    launchStartedRef.current = true;

    const launch = async () => {
      if (isBetPlacedRef.current) {
        const stake = selectedStakeRef.current;
        if (balanceRef.current < stake) {
          alert('Not enough Red Diamonds! Bet cancelled.');
          setIsBetPlaced(false);
          isBetPlacedRef.current = false;
        } else {
          try {
            const { data, error } = await supabase.rpc('game_deduct_red', {
              p_amount: stake,
              p_game_key: GAME_KEY,
            });
            if (error) throw error;
            applyBalance(
              typeof data === 'number' ? data : balanceRef.current - stake
            );
            deductDoneRef.current = true;
          } catch (err) {
            console.error('rocket deduct failed', err);
            alert('Bet failed. Check balance.');
            setIsBetPlaced(false);
            isBetPlacedRef.current = false;
            void loadBalanceFromServer();
          }
        }
      }

      const rand = Math.random();
      let randomCrash = 1.05;
      if (rand < 0.4) {
        randomCrash = parseFloat((1.05 + Math.random() * 0.5).toFixed(2));
      } else if (rand < 0.75) {
        randomCrash = parseFloat((1.6 + Math.random() * 2.5).toFixed(2));
      } else {
        randomCrash = parseFloat((4.2 + Math.random() * 10.0).toFixed(2));
      }

      setCrashPoint(randomCrash);
      setMultiplier(1.0);
      setGameState('FLYING');
      setProfitWon(0);
    };

    void launch();
  }, [waitTime, gameState, applyBalance, loadBalanceFromServer]);

  // Flight loop — same formula
  useEffect(() => {
    if (gameState !== 'FLYING' && gameState !== 'CASHED_OUT') return;

    const startTime = Date.now();

    const runFlight = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const currentMult = parseFloat(
        (1.0 + elapsed * 0.15 + Math.pow(elapsed, 1.4) * 0.05).toFixed(2)
      );

      if (currentMult >= crashPoint) {
        setMultiplier(crashPoint);
        setGameState('CRASHED');
        playSound(120, 'sawtooth');
      } else {
        setMultiplier(currentMult);
        if (Math.random() > 0.7) playSound(350 + currentMult * 20, 'sine');
        animRef.current = requestAnimationFrame(runFlight);
      }
    };

    animRef.current = requestAnimationFrame(runFlight);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [gameState === 'FLYING' || gameState === 'CASHED_OUT', crashPoint]);

  const handlePlaceBet = () => {
    if (gameState !== 'WAITING' || busy) return;
    if (balanceRef.current < selectedStake) {
      alert('Not enough Red Diamonds!');
      return;
    }
    setIsBetPlaced(true);
    isBetPlacedRef.current = true;
    playSound(600, 'sine');
  };

  const handleCancelBet = () => {
    if (gameState !== 'WAITING') return;
    setIsBetPlaced(false);
    isBetPlacedRef.current = false;
    playSound(300, 'sine');
  };

  const handleCashOut = async () => {
    if (gameState !== 'FLYING' || !isBetPlacedRef.current || !deductDoneRef.current)
      return;
    if (busy) return;

    const stake = selectedStakeRef.current;
    const wonAmt = Math.floor(stake * multiplier);
    setBusy(true);

    try {
      const { data, error } = await supabase.rpc('game_credit_red', {
        p_amount: wonAmt,
        p_game_key: GAME_KEY,
      });
      if (error) throw error;
      applyBalance(
        typeof data === 'number' ? data : balanceRef.current + wonAmt
      );
      setProfitWon(wonAmt);
      setGameState('CASHED_OUT');
      playSound(880, 'square');
    } catch (err) {
      console.error('rocket cashout failed', err);
      alert('Cash out failed. Try again or refresh wallet.');
      void loadBalanceFromServer();
    } finally {
      setBusy(false);
    }
  };

  // Graph progress (same math, richer path)
  const t = Math.min(1, (multiplier - 1) / 8);
  const progressX = 24 + t * 260;
  const progressY = 168 - t * t * 130;
  const rocketRotate = -25 - t * 35;

  return (
    <div className="w-full max-w-md bg-[#05060c] border border-cyan-500/35 rounded-3xl p-4 flex flex-col items-center shadow-[0_20px_60px_rgba(0,0,0,.65)] relative overflow-hidden select-none mx-auto text-white">
      {/* subtle scan / vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,211,238,.12),transparent_55%)]" />

      <div className="w-full flex justify-between items-center mb-2 relative z-10">
        {onBackToLobby ? (
          <button
            onClick={onBackToLobby}
            className="px-3 py-1 bg-gray-900/90 hover:bg-gray-800 text-gray-300 font-bold text-[11px] rounded-xl border border-gray-700/80 cursor-pointer"
          >
            ← Back
          </button>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-1.5 bg-red-950/70 px-3 py-1.5 rounded-xl border border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,.15)]">
          <span className="text-sm">🔴</span>
          <span className="text-xs font-black text-red-300 tabular-nums">
            {redDiamonds.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="w-full text-center mb-2 relative z-10">
        <h2 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 uppercase tracking-[0.15em]">
          🚀 Neon Rocket Crash
        </h2>
        <p className="text-[10px] text-gray-400 mt-0.5">
          Cash out before the rocket explodes
        </p>
      </div>

      {/* 2.5D flight arena */}
      <div className="w-full h-56 rounded-2xl border border-cyan-500/25 relative overflow-hidden mb-3 shadow-[inset_0_0_40px_rgba(0,0,0,.8)]">
        {/* layered sky */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628] via-[#0c1220] to-[#050508]" />
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,.25),transparent_40%),radial-gradient(circle_at_80%_60%,rgba(239,68,68,.12),transparent_35%)]" />

        {/* parallax stars */}
        <div className="absolute inset-0 opacity-50 pointer-events-none">
          {[12, 40, 70, 110, 150, 200, 240, 280].map((x, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-0.5 rounded-full bg-white"
              style={{
                left: `${(x % 100) * 0.9}%`,
                top: `${10 + (i * 11) % 70}%`,
                opacity: 0.4 + (i % 3) * 0.2,
              }}
            />
          ))}
        </div>

        {/* ground perspective strip */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black via-cyan-950/40 to-transparent border-t border-cyan-500/20" />
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[85%] h-1 rounded-full bg-cyan-500/20 blur-[1px]"
          style={{ transform: 'translateX(-50%) perspective(200px) rotateX(60deg)' }}
        />

        {/* flight curve + glow */}
        {(gameState === 'FLYING' || gameState === 'CASHED_OUT') && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 320 200"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="trailGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.95" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              d={`M 18 175 Q ${progressX * 0.45} 175, ${progressX} ${progressY}`}
              fill="none"
              stroke="url(#trailGrad)"
              strokeWidth="5"
              strokeLinecap="round"
              filter="url(#glow)"
            />
            <path
              d={`M 18 175 Q ${progressX * 0.45} 175, ${progressX} ${progressY}`}
              fill="none"
              stroke="#fff"
              strokeWidth="1.2"
              strokeOpacity="0.35"
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* rocket with depth shadow */}
        {(gameState === 'FLYING' || gameState === 'CASHED_OUT') && (
          <>
            <div
              className="absolute z-20 pointer-events-none"
              style={{
                left: `${(progressX / 320) * 100}%`,
                top: `${(progressY / 200) * 100}%`,
                transform: `translate(-50%, -50%) rotate(${rocketRotate}deg)`,
              }}
            >
              <div className="relative">
                <div className="absolute inset-0 blur-md bg-orange-500/50 scale-150" />
                <span className="relative text-3xl drop-shadow-[0_8px_12px_rgba(0,0,0,.9)]">
                  🚀
                </span>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-6 bg-gradient-to-t from-transparent via-orange-400 to-yellow-200 opacity-80 blur-[2px] animate-pulse" />
              </div>
            </div>
          </>
        )}

        {/* center states */}
        {gameState === 'WAITING' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
            <div className="rounded-2xl border border-cyan-400/30 bg-black/50 px-6 py-4 backdrop-blur-md shadow-[0_0_40px_rgba(34,211,238,.2)]">
              <span className="block text-[10px] font-bold text-cyan-300/90 mb-1 tracking-[0.2em] uppercase text-center">
                Next flight in
              </span>
              <span className="block text-5xl font-black text-white font-mono text-center tabular-nums drop-shadow-[0_0_20px_rgba(34,211,238,.5)]">
                {waitTime}
                <span className="text-lg text-cyan-300">s</span>
              </span>
              <span className="block text-[10px] text-gray-300 mt-2 text-center">
                {isBetPlaced
                  ? `Bet locked · ${selectedStake} 🔴`
                  : 'Place your bet below'}
              </span>
            </div>
          </div>
        )}

        {(gameState === 'FLYING' || gameState === 'CASHED_OUT') && (
          <div className="absolute top-3 left-0 right-0 z-10 flex flex-col items-center">
            <span className="text-4xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-emerald-300 to-yellow-300 drop-shadow-[0_0_24px_rgba(52,211,153,.45)]">
              {multiplier.toFixed(2)}x
            </span>
          </div>
        )}

        {gameState === 'CRASHED' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-950/40 backdrop-blur-[2px]">
            <div className="text-4xl mb-1 animate-pulse">💥</div>
            <span className="text-[10px] font-bold text-red-300 uppercase tracking-[0.25em]">
              Crashed
            </span>
            <span className="text-4xl font-black text-red-400 font-mono">
              {multiplier.toFixed(2)}x
            </span>
            <span className="text-[10px] text-gray-400 mt-1">
              Next round soon...
            </span>
          </div>
        )}
      </div>

      {/* actions — same flow */}
      <div className="w-full mb-3 relative z-10">
        {gameState === 'WAITING' ? (
          isBetPlaced ? (
            <button
              onClick={handleCancelBet}
              className="w-full py-3.5 bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 text-white font-black text-xs rounded-2xl border border-red-400/30 shadow-[0_8px_24px_rgba(220,38,38,.35)] active:scale-[0.98] transition-all cursor-pointer uppercase tracking-wider"
            >
              ❌ Cancel bet ({selectedStake} 🔴)
            </button>
          ) : (
            <button
              onClick={handlePlaceBet}
              disabled={busy}
              className="w-full py-3.5 bg-gradient-to-b from-emerald-400 to-green-700 hover:from-emerald-300 text-black font-black text-xs rounded-2xl border border-emerald-200/40 shadow-[0_8px_28px_rgba(16,185,129,.35)] active:scale-[0.98] transition-all cursor-pointer uppercase tracking-wider disabled:opacity-60"
            >
              ✅ Place bet ({selectedStake} 🔴)
            </button>
          )
        ) : gameState === 'FLYING' ? (
          isBetPlaced && deductDoneRef.current ? (
            <button
              onClick={() => void handleCashOut()}
              disabled={busy}
              className="w-full py-3.5 bg-gradient-to-b from-emerald-400 to-green-600 text-black font-black text-sm rounded-2xl border border-white/20 shadow-[0_0_30px_rgba(16,185,129,.45)] active:scale-[0.98] transition-all cursor-pointer uppercase tracking-wider animate-pulse disabled:opacity-70"
            >
              💰 Cash out ({Math.floor(selectedStake * multiplier)} 🔴)
            </button>
          ) : (
            <div className="w-full py-3 bg-gray-900/80 border border-gray-700 text-gray-400 font-bold text-xs rounded-2xl text-center uppercase tracking-wider">
              👀 Spectating (no bet)
            </div>
          )
        ) : gameState === 'CASHED_OUT' ? (
          <div className="w-full py-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-black text-xs rounded-2xl text-center uppercase tracking-wider flex flex-col items-center shadow-[0_0_20px_rgba(16,185,129,.2)]">
            <span>🎉 Cashed out +{profitWon} 🔴</span>
            <span className="text-[9px] text-gray-400 font-normal normal-case">
              Rocket still flying...
            </span>
          </div>
        ) : (
          <div className="w-full py-3 bg-red-950/80 border border-red-500/40 text-red-300 font-black text-xs rounded-2xl text-center uppercase tracking-wider animate-pulse">
            ⏳ Next round in 10s...
          </div>
        )}
      </div>

      <div className="w-full bg-gray-900/80 border border-gray-800/90 p-2.5 rounded-2xl flex flex-col gap-2 relative z-10">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            Stake
          </span>
          <span className="text-[10px] text-cyan-300 font-mono font-bold">
            {selectedStake} 🔴
          </span>
        </div>
        <div className="grid grid-cols-6 gap-1">
          {[50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map(
            (amt) => (
              <button
                key={amt}
                disabled={
                  gameState === 'FLYING' ||
                  gameState === 'CASHED_OUT' ||
                  (gameState === 'WAITING' && isBetPlaced)
                }
                onClick={() => setSelectedStake(amt)}
                className={`py-1.5 rounded-lg text-[9px] font-black border transition-all cursor-pointer ${
                  selectedStake === amt
                    ? 'bg-gradient-to-b from-cyan-300 to-cyan-500 text-black border-cyan-100 shadow-[0_0_12px_rgba(34,211,238,.4)] scale-105'
                    : 'bg-gray-800/90 text-gray-300 border-gray-700 hover:bg-gray-700'
                } ${
                  gameState === 'FLYING' ||
                  gameState === 'CASHED_OUT' ||
                  (gameState === 'WAITING' && isBetPlaced)
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                {amt}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}