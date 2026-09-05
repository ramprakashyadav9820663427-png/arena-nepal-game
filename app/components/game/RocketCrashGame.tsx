'use client';
import React, { useState, useEffect, useRef } from 'react';
import { getWalletBalance, updateWalletBalance } from '@/lib/wallet';

interface RocketCrashGameProps {
  onBackToLobby?: () => void;
}

export default function RocketCrashGame({ onBackToLobby }: RocketCrashGameProps) {
  const [gameState, setGameState] = useState<'WAITING' | 'FLYING' | 'CASHED_OUT' | 'CRASHED'>('WAITING');
  const [waitTime, setWaitTime] = useState<number>(10); // Changed to 10 seconds auto-timer
  const [redDiamonds, setRedDiamonds] = useState<number>(1000);
  
  const [selectedStake, setSelectedStake] = useState<number>(100);
  const [isBetPlaced, setIsBetPlaced] = useState<boolean>(false);
  const [multiplier, setMultiplier] = useState<number>(1.00);
  const [crashPoint, setCrashPoint] = useState<number>(2.00);
  const [profitWon, setProfitWon] = useState<number>(0);

  const animRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    setRedDiamonds(getWalletBalance());

    const handleWalletSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail !== undefined) {
        setRedDiamonds(customEvent.detail);
      } else {
        setRedDiamonds(getWalletBalance());
      }
    };

    window.addEventListener('walletUpdated', handleWalletSync);
    window.addEventListener('storage', handleWalletSync);

    if (typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }

    return () => {
      window.removeEventListener('walletUpdated', handleWalletSync);
      window.removeEventListener('storage', handleWalletSync);
    };
  }, []);

  const playSound = (freq = 440, type: OscillatorType = 'sine') => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
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
    } catch (e) {}
  };

  // 10s Auto Countdown loop before launch & auto-restart after crash
  useEffect(() => {
    if (gameState !== 'WAITING' && gameState !== 'CRASHED') return;

    // If coming from crash, reset state to WAITING and start 10s timer
    if (gameState === 'CRASHED') {
      const resetTimer = setTimeout(() => {
        setWaitTime(10);
        setIsBetPlaced(false);
        setMultiplier(1.00);
        setGameState('WAITING');
      }, 3000); // Show crash screen for 3 seconds before starting 10s countdown
      return () => clearTimeout(resetTimer);
    }

    if (waitTime > 0) {
      const timer = setTimeout(() => {
        setWaitTime(prev => prev - 1);
        playSound(500, 'triangle');
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Time's up! Launch time
      if (isBetPlaced) {
        const currentBalance = getWalletBalance();
        if (currentBalance < selectedStake) {
          alert('Not enough Red Diamonds! Bet cancelled.');
          setIsBetPlaced(false);
        } else {
          const newBal = updateWalletBalance(-selectedStake);
          setRedDiamonds(newBal);
        }
      }
      
      // Balanced house edge crash point calculation (1.05x to 15.00x)
      const rand = Math.random();
      let randomCrash = 1.05;
      if (rand < 0.4) {
        randomCrash = parseFloat((1.05 + Math.random() * 0.5).toFixed(2));
      } else if (rand < 0.75) {
        randomCrash = parseFloat((1.60 + Math.random() * 2.5).toFixed(2));
      } else {
        randomCrash = parseFloat((4.20 + Math.random() * 10.0).toFixed(2));
      }

      setCrashPoint(randomCrash);
      setMultiplier(1.00);
      setGameState('FLYING');
      setProfitWon(0);
    }
  }, [waitTime, gameState]);

  // Multiplier flight loop - Rocket keeps flying independently until it hits crashPoint
  useEffect(() => {
    if (gameState !== 'FLYING' && gameState !== 'CASHED_OUT') return;

    const startTime = Date.now();

    const runFlight = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const currentMult = parseFloat((1.00 + elapsed * 0.15 + Math.pow(elapsed, 1.4) * 0.05).toFixed(2));

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
    if (gameState !== 'WAITING') return;
    const currentBalance = getWalletBalance();
    if (currentBalance < selectedStake) {
      alert('Not enough Red Diamonds!');
      return;
    }
    setIsBetPlaced(true);
    playSound(600, 'sine');
  };

  const handleCancelBet = () => {
    if (gameState !== 'WAITING') return;
    setIsBetPlaced(false);
    playSound(300, 'sine');
  };

  const handleCashOut = () => {
    if (gameState !== 'FLYING' || !isBetPlaced) return;

    const wonAmt = Math.floor(selectedStake * multiplier);
    setProfitWon(wonAmt);
    const newBal = updateWalletBalance(wonAmt);
    setRedDiamonds(newBal);
    setGameState('CASHED_OUT');
    playSound(880, 'square');
  };

  // Calculate SVG curve coordinates based on multiplier
  const progressX = Math.min(280, 40 + (multiplier - 1) * 60);
  const progressY = Math.max(20, 160 - (multiplier - 1) * 35);

  return (
    <div className="w-full max-w-md bg-gray-950 border border-cyan-500/40 rounded-3xl p-4 flex flex-col items-center shadow-2xl relative overflow-hidden select-none mx-auto text-white">
      {/* Top Bar */}
      <div className="w-full flex justify-between items-center mb-2">
        {onBackToLobby ? (
          <button
            onClick={onBackToLobby}
            className="px-3 py-1 bg-gray-900 hover:bg-gray-800 text-gray-300 font-bold text-[11px] rounded-xl border border-gray-800 cursor-pointer"
          >
            ← Back
          </button>
        ) : <div />}
        <div className="flex items-center gap-1.5 bg-red-950/60 px-3 py-1 rounded-xl border border-red-500/30">
          <span className="text-sm">🔴</span>
          <span className="text-xs font-black text-red-400">{redDiamonds}</span>
        </div>
      </div>

      <div className="w-full text-center mb-2">
        <h2 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase tracking-wider">
          🚀 Neon Rocket Sky Flight
        </h2>
        <p className="text-[10px] text-gray-400">Live multiplier action. Place bet & cash out before crash!</p>
      </div>

      {/* Cloud Background Flight Arena */}
      <div className="w-full h-52 bg-gradient-to-b from-sky-950 via-gray-900 to-black rounded-2xl border border-cyan-500/30 flex flex-col items-center justify-center relative overflow-hidden mb-3 shadow-inner">
        {/* Animated Clouds */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-4 left-6 text-xl animate-pulse">☁️</div>
          <div className="absolute top-16 right-8 text-2xl animate-pulse delay-75">☁️</div>
          <div className="absolute bottom-6 left-1/3 text-lg animate-pulse delay-150">☁️</div>
        </div>

        {/* SVG Graph Line & Flying Rocket */}
        {(gameState === 'FLYING' || gameState === 'CASHED_OUT') && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <path
              d={`M 20 180 Q ${progressX / 2} 180, ${progressX} ${progressY}`}
              fill="none"
              stroke="#ef4444"
              strokeWidth="4"
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"
            />
          </svg>
        )}

        {/* Center Screen States */}
        {gameState === 'WAITING' && (
          <div className="flex flex-col items-center z-10 animate-pulse">
            <span className="text-xs font-bold text-cyan-400 mb-1">NEXT FLIGHT IN</span>
            <span className="text-4xl font-black text-white font-mono">{waitTime}s</span>
            <span className="text-[9px] text-gray-300 mt-1">
              {isBetPlaced ? `Bet Locked: ${selectedStake} 🔴` : 'Place your bet below!'}
            </span>
          </div>
        )}

        {(gameState === 'FLYING' || gameState === 'CASHED_OUT') && (
          <div 
            className="absolute z-20 flex items-center gap-1 transition-all duration-75"
            style={{ left: `${progressX}px`, top: `${progressY}px` }}
          >
            <span className="text-2xl animate-bounce">🚀</span>
          </div>
        )}

        {(gameState === 'FLYING' || gameState === 'CASHED_OUT') && (
          <div className="absolute top-4 z-10 flex flex-col items-center">
            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-400 font-mono tracking-wider">
              {multiplier.toFixed(2)}x
            </span>
          </div>
        )}

        {gameState === 'CRASHED' && (
          <div className="flex flex-col items-center z-10">
            <span className="text-xs font-bold text-red-500 uppercase tracking-widest">💥 ROCKET CRASHED</span>
            <span className="text-4xl font-black text-red-500 font-mono">{multiplier.toFixed(2)}x</span>
            <span className="text-[10px] text-gray-400 mt-1">Next round starting soon...</span>
          </div>
        )}
      </div>

      {/* Dynamic Action Button (No manual next flight button, fully automated 10s cycle) */}
      <div className="w-full mb-3">
        {gameState === 'WAITING' ? (
          isBetPlaced ? (
            <button
              onClick={handleCancelBet}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
            >
              ❌ CANCEL BET ({selectedStake} 🔴)
            </button>
          ) : (
            <button
              onClick={handlePlaceBet}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 text-black font-black text-xs rounded-2xl shadow-lg shadow-green-500/30 active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
            >
              ✅ PLACE BET ({selectedStake} 🔴)
            </button>
          )
        ) : gameState === 'FLYING' ? (
          isBetPlaced ? (
            <button
              onClick={handleCashOut}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 text-black font-black text-sm rounded-2xl shadow-lg shadow-green-500/30 active:scale-95 transition-all cursor-pointer uppercase tracking-wider animate-pulse"
            >
              💰 CASH OUT ({Math.floor(selectedStake * multiplier)} 🔴)
            </button>
          ) : (
            <div className="w-full py-3 bg-gray-900 border border-gray-800 text-gray-400 font-bold text-xs rounded-2xl text-center uppercase tracking-wider">
              👀 Spectating Flight (No Bet)
            </div>
          )
        ) : gameState === 'CASHED_OUT' ? (
          <div className="w-full py-3 bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-black text-xs rounded-2xl text-center uppercase tracking-wider flex flex-col items-center">
            <span>🎉 SUCCESSFUL CASHOUT: +{profitWon} 🔴</span>
            <span className="text-[9px] text-gray-300 font-normal">Rocket still flying...</span>
          </div>
        ) : (
          <div className="w-full py-3 bg-red-950/80 border border-red-500/40 text-red-400 font-black text-xs rounded-2xl text-center uppercase tracking-wider animate-pulse">
            ⏳ Next round starting in 10s...
          </div>
        )}
      </div>

      {/* Stake Amount Selector Grid */}
      <div className="w-full bg-gray-900/90 border border-gray-800 p-2.5 rounded-2xl flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Choose Stake Amount</span>
          <span className="text-[10px] text-cyan-400 font-mono font-bold">Selected: {selectedStake} 🔴</span>
        </div>
        <div className="grid grid-cols-6 gap-1">
          {[50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map((amt) => (
            <button
              key={amt}
              disabled={gameState === 'FLYING' || gameState === 'CASHED_OUT' || (gameState === 'WAITING' && isBetPlaced)}
              onClick={() => setSelectedStake(amt)}
              className={`py-1 rounded-lg text-[9px] font-black border transition-all cursor-pointer ${
                selectedStake === amt 
                  ? 'bg-cyan-400 text-black border-cyan-200 shadow-md shadow-cyan-500/30 scale-105' 
                  : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
              } ${(gameState === 'FLYING' || gameState === 'CASHED_OUT' || (gameState === 'WAITING' && isBetPlaced)) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {amt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}