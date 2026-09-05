'use client';
import React, { useState, useEffect, useRef } from 'react';
import { getWalletBalance, updateWalletBalance } from '@/lib/wallet';

interface CarRacingGameProps {
  onBackToLobby?: () => void;
}

export default function CarRacingGame({ onBackToLobby }: CarRacingGameProps) {
  const [gameState, setGameState] = useState<'BETTING' | 'RACING' | 'FINISHED'>('BETTING');
  const [waitTime, setWaitTime] = useState<number>(10);
  const [redDiamonds, setRedDiamonds] = useState<number>(1000);
  
  const [selectedStake, setSelectedStake] = useState<number>(100);
  const [selectedCar, setSelectedCar] = useState<'RED' | 'BLUE' | 'YELLOW' | null>(null);
  const [betPlacedPopup, setBetPlacedPopup] = useState<string | null>(null);
  
  // Car progress positions (0% to 85%) - Made track longer & smooth slow speed
  const [carPositions, setCarPositions] = useState<{ RED: number; BLUE: number; YELLOW: number }>({ RED: 0, BLUE: 0, YELLOW: 0 });
  const [winningCar, setWinningCar] = useState<'RED' | 'BLUE' | 'YELLOW' | null>(null);
  const [payoutWon, setPayoutWon] = useState<number>(0);

  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Load from central wallet utility
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
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  };

  // Handle Car Selection with Popup confirmation
  const handleSelectCar = (car: 'RED' | 'BLUE' | 'YELLOW') => {
    if (gameState !== 'BETTING') return;
    setSelectedCar(car);
    playSound(500, 'sine');
    setBetPlacedPopup(`Bet Locked: ${selectedStake} 🔴 on ${car} Car!`);
    setTimeout(() => {
      setBetPlacedPopup(null);
    }, 2500);
  };

  // 10 Seconds Betting Timer & Auto Race Trigger
  useEffect(() => {
    if (gameState !== 'BETTING') return;

    if (waitTime > 0) {
      const timer = setTimeout(() => {
        setWaitTime(prev => prev - 1);
        playSound(450, 'triangle');
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Time's up! Deduct stake if selected using central updateWalletBalance
      if (selectedCar) {
        const currentBalance = getWalletBalance();
        if (currentBalance < selectedStake) {
          alert('Not enough Red Diamonds! Bet cancelled.');
          setSelectedCar(null);
        } else {
          const newBal = updateWalletBalance(-selectedStake);
          setRedDiamonds(newBal);
        }
      }

      setGameState('RACING');
      setCarPositions({ RED: 0, BLUE: 0, YELLOW: 0 });
      setWinningCar(null);
      setPayoutWon(0);
    }
  }, [waitTime, gameState]);

  // Slow & Thrilling Race Engine Simulation
  useEffect(() => {
    if (gameState !== 'RACING') return;

    // Decide winner beforehand based on odds (Red: 1.8x, Blue: 2.2x, Yellow: 3.5x)
    const rand = Math.random();
    let winner: 'RED' | 'BLUE' | 'YELLOW' = 'RED';
    if (rand < 0.45) winner = 'RED';
    else if (rand < 0.80) winner = 'BLUE';
    else winner = 'YELLOW';

    const interval = setInterval(() => {
      setCarPositions(prev => {
        const redBoost = winner === 'RED' ? 0.6 : 0.4;
        const blueBoost = winner === 'BLUE' ? 0.6 : 0.4;
        const yellowBoost = winner === 'YELLOW' ? 0.6 : 0.4;

        const newRed = Math.min(84, prev.RED + (Math.random() * 0.8 + redBoost));
        const newBlue = Math.min(84, prev.BLUE + (Math.random() * 0.8 + blueBoost));
        const newYellow = Math.min(84, prev.YELLOW + (Math.random() * 0.8 + yellowBoost));

        if (newRed >= 84 || newBlue >= 84 || newYellow >= 84) {
          clearInterval(interval);
          
          let actualWinner: 'RED' | 'BLUE' | 'YELLOW' = winner;
          if (newRed >= 84) actualWinner = 'RED';
          else if (newBlue >= 84) actualWinner = 'BLUE';
          else actualWinner = 'YELLOW';

          setWinningCar(actualWinner);
          setGameState('FINISHED');
          playSound(800, 'square');

          // Calculate payout if player selected winning car using central updateWalletBalance
          if (selectedCar === actualWinner) {
            const multiplier = actualWinner === 'RED' ? 1.8 : actualWinner === 'BLUE' ? 2.2 : 3.5;
            const won = Math.floor(selectedStake * multiplier);
            setPayoutWon(won);
            const newBal = updateWalletBalance(won);
            setRedDiamonds(newBal);
          }

          // Restart cycle after 5 seconds view
          setTimeout(() => {
            setWaitTime(10);
            setSelectedCar(null);
            setBetPlacedPopup(null);
            setGameState('BETTING');
          }, 5000);
        }

        return { RED: newRed, BLUE: newBlue, YELLOW: newYellow };
      });
    }, 120);

    return () => clearInterval(interval);
  }, [gameState, selectedCar, selectedStake]);

  return (
    <div className="w-full max-w-md bg-gray-950 border border-amber-500/40 rounded-3xl p-4 flex flex-col items-center shadow-2xl relative overflow-hidden select-none mx-auto text-white">
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
        <h2 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-500 uppercase tracking-wider">
          🏎️ Neon Turbo Car Racing
        </h2>
        <p className="text-[10px] text-gray-400">Slow & Thrilling Derby! Pick your car & watch closely.</p>
      </div>

      {/* Bet Placed Success Popup Banner */}
      {betPlacedPopup && (
        <div className="absolute top-14 left-4 right-4 bg-amber-500 text-black font-black text-xs py-2 px-3 rounded-xl shadow-xl z-40 text-center animate-bounce border-2 border-white">
          🎉 {betPlacedPopup}
        </div>
      )}

      {/* Larger Race Track Arena */}
      <div className="w-full h-64 bg-gradient-to-b from-gray-900 via-gray-950 to-black rounded-2xl border border-amber-500/30 flex flex-col justify-around p-3 relative overflow-hidden mb-3 shadow-inner">
        <div className="absolute right-6 top-0 bottom-0 w-2 border-r-2 border-dashed border-white/40 flex flex-col items-center justify-center z-10">
          <span className="text-xs">🏁</span>
        </div>

        {gameState === 'BETTING' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">BETTING OPEN • RACE STARTS IN</span>
            <span className="text-4xl font-black text-white font-mono my-1">{waitTime}s</span>
            <span className="text-[10px] text-cyan-300 font-medium">
              {selectedCar ? `Your Choice: ${selectedCar} Car (${selectedStake} 🔴)` : 'Tap a car below to place your bet!'}
            </span>
          </div>
        )}

        {/* Track 1: Red Car */}
        <div className="w-full bg-gray-900/90 h-14 rounded-xl border border-red-500/30 relative flex items-center px-3 overflow-hidden shadow-sm">
          <div className="absolute left-2 text-[10px] font-bold text-red-400 z-0 tracking-wider">RED (1.8x)</div>
          <div 
            className="absolute transition-all duration-150 z-10 flex items-center"
            style={{ left: `${carPositions.RED}%` }}
          >
            <div className="bg-gradient-to-r from-red-700 to-red-500 px-2.5 py-1.5 rounded-xl border border-red-300 shadow-[0_0_12px_rgba(239,68,68,0.9)] flex items-center gap-1.5">
              <span className="text-lg">🏎️</span>
              <span className="text-[10px] font-black text-white tracking-wide">RED</span>
            </div>
          </div>
        </div>

        {/* Track 2: Blue Car */}
        <div className="w-full bg-gray-900/90 h-14 rounded-xl border border-blue-500/30 relative flex items-center px-3 overflow-hidden shadow-sm">
          <div className="absolute left-2 text-[10px] font-bold text-blue-400 z-0 tracking-wider">BLUE (2.2x)</div>
          <div 
            className="absolute transition-all duration-150 z-10 flex items-center"
            style={{ left: `${carPositions.BLUE}%` }}
          >
            <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-2.5 py-1.5 rounded-xl border border-blue-300 shadow-[0_0_12px_rgba(37,99,235,0.9)] flex items-center gap-1.5">
              <span className="text-lg">🏎️</span>
              <span className="text-[10px] font-black text-white tracking-wide">BLUE</span>
            </div>
          </div>
        </div>

        {/* Track 3: Yellow Car */}
        <div className="w-full bg-gray-900/90 h-14 rounded-xl border border-yellow-500/30 relative flex items-center px-3 overflow-hidden shadow-sm">
          <div className="absolute left-2 text-[10px] font-bold text-yellow-400 z-0 tracking-wider">YELLOW (3.5x)</div>
          <div 
            className="absolute transition-all duration-150 z-10 flex items-center"
            style={{ left: `${carPositions.YELLOW}%` }}
          >
            <div className="bg-gradient-to-r from-yellow-600 to-amber-500 px-2.5 py-1.5 rounded-xl border border-yellow-200 shadow-[0_0_12px_rgba(234,179,8,0.9)] flex items-center gap-1.5">
              <span className="text-lg">🏎️</span>
              <span className="text-[10px] font-black text-black tracking-wide">YEL</span>
            </div>
          </div>
        </div>

        {gameState === 'FINISHED' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-3 text-center">
            <span className="text-xs font-black text-amber-400 uppercase tracking-widest">🏆 WINNER: {winningCar} CAR!</span>
            {selectedCar === winningCar ? (
              <div className="mt-1.5 flex flex-col items-center">
                <span className="text-xl font-black text-emerald-400">YOU WON +{payoutWon} 🔴!</span>
                <span className="text-[10px] text-gray-300">Amazing race! Next round starting soon...</span>
              </div>
            ) : (
              <span className="text-[10px] text-red-400 mt-1">Car {selectedCar || 'None'} lost. Next race starting...</span>
            )}
          </div>
        )}
      </div>

      {/* Car Selection Buttons */}
      <div className="w-full grid grid-cols-3 gap-2 mb-3">
        <button
          disabled={gameState !== 'BETTING'}
          onClick={() => handleSelectCar('RED')}
          className={`py-2 px-1 rounded-xl font-black text-xs border transition-all cursor-pointer flex flex-col items-center ${
            selectedCar === 'RED' ? 'bg-red-600 text-white border-white shadow-lg shadow-red-600/50 scale-105' : 'bg-gray-900 text-red-400 border-red-500/40 hover:bg-gray-800'
          }`}
        >
          <span>🏎️ RED CAR</span>
          <span className="text-[9px] text-gray-300 font-normal">Odds: 1.8x</span>
        </button>

        <button
          disabled={gameState !== 'BETTING'}
          onClick={() => handleSelectCar('BLUE')}
          className={`py-2 px-1 rounded-xl font-black text-xs border transition-all cursor-pointer flex flex-col items-center ${
            selectedCar === 'BLUE' ? 'bg-blue-600 text-white border-white shadow-lg shadow-blue-600/50 scale-105' : 'bg-gray-900 text-blue-400 border-blue-500/40 hover:bg-gray-800'
          }`}
        >
          <span>🏎️ BLUE CAR</span>
          <span className="text-[9px] text-gray-300 font-normal">Odds: 2.2x</span>
        </button>

        <button
          disabled={gameState !== 'BETTING'}
          onClick={() => handleSelectCar('YELLOW')}
          className={`py-2 px-1 rounded-xl font-black text-xs border transition-all cursor-pointer flex flex-col items-center ${
            selectedCar === 'YELLOW' ? 'bg-yellow-600 text-black border-white shadow-lg shadow-yellow-600/50 scale-105' : 'bg-gray-900 text-yellow-400 border-yellow-500/40 hover:bg-gray-800'
          }`}
        >
          <span>🏎️ YELLOW CAR</span>
          <span className="text-[9px] text-gray-900 font-bold">Odds: 3.5x</span>
        </button>
      </div>

      {/* Stake Amount Selector Grid */}
      <div className="w-full bg-gray-900/90 border border-gray-800 p-2.5 rounded-2xl flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Select Stake Amount</span>
          <span className="text-[10px] text-amber-400 font-mono font-bold">Selected: {selectedStake} 🔴</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {[50, 100, 150, 200, 300, 400, 500, 700, 800, 1000].map((amt) => (
            <button
              key={amt}
              disabled={gameState !== 'BETTING'}
              onClick={() => setSelectedStake(amt)}
              className={`py-1.5 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                selectedStake === amt 
                  ? 'bg-amber-400 text-black border-amber-200 shadow-md shadow-amber-500/30 scale-105' 
                  : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
              } ${gameState !== 'BETTING' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {amt} 🔴
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}