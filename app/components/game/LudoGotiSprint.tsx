'use client';
import React, { useState, useEffect } from 'react';

interface LudoGotiSprintProps {
  onBackToLobby: () => void;
}

const BET_AMOUNTS = [50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

const GOTI_OPTIONS = [
  { id: 'red', name: 'Red Goti', color: 'from-red-600 to-rose-700', border: 'border-red-500', text: 'text-red-400', multiplier: 3.5, icon: '🔴' },
  { id: 'blue', name: 'Blue Goti', color: 'from-blue-600 to-indigo-700', border: 'border-blue-500', text: 'text-blue-400', multiplier: 3.5, icon: '🔵' },
  { id: 'green', name: 'Green Goti', color: 'from-emerald-600 to-green-700', border: 'border-emerald-500', text: 'text-emerald-400', multiplier: 3.8, icon: '🟢' },
  { id: 'yellow', name: 'Yellow Goti', color: 'from-amber-500 to-yellow-600', border: 'border-yellow-500', text: 'text-yellow-400', multiplier: 3.8, icon: '🟡' },
];

export default function LudoGotiSprint({ onBackToLobby }: LudoGotiSprintProps) {
  const [balance, setBalance] = useState<number>(0);
  const [selectedBet, setSelectedBet] = useState<number>(50);
  const [selectedGoti, setSelectedGoti] = useState<string | null>(null);
  const [gameState, setGameState] = useState<'betting' | 'racing' | 'result'>('betting');
  const [timeLeft, setTimeLeft] = useState<number>(10);
  
  // Vertical positions percentage from top (0% = start, 100% = finish line)
  const [positions, setPositions] = useState<{ [key: string]: number }>({ red: 0, blue: 0, green: 0, yellow: 0 });
  const [winnerGoti, setWinnerGoti] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('Place your bet before timer ends!');

  const playSound = (isLoud: boolean) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isLoud ? 1200 : 800, ctx.currentTime);
      gain.gain.setValueAtTime(isLoud ? 0.3 : 0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  };

  const fetchBalance = () => {
    try {
      const val = localStorage.getItem('arena_red_diamonds') || 
                  localStorage.getItem('arena_red_dias') || 
                  localStorage.getItem('arena_diamond') || '0';
      setBalance(parseInt(val, 10));
    } catch (e) {
      setBalance(0);
    }
  };

  useEffect(() => {
    fetchBalance();
    const handleStorage = () => fetchBalance();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Timer loop (Direct drop when timer ends, no locks)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'betting') {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            startMarbleDropRace();
            return 0;
          }
          playSound(prev <= 3);
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState]);

  const updateBalance = (newAmount: number) => {
    setBalance(newAmount);
    localStorage.setItem('arena_red_diamonds', newAmount.toString());
    window.dispatchEvent(new Event('storage'));
  };

  const handlePlaceBet = (gotiId: string) => {
    if (gameState !== 'betting') return;
    if (balance < selectedBet) {
      alert('⚠️ Not enough Red Diamonds!');
      return;
    }

    const newBal = balance - selectedBet;
    updateBalance(newBal);
    setSelectedGoti(gotiId);
    setMessage(`Bet locked on ${gotiId.toUpperCase()}! Race starting soon...`);
  };

  const startMarbleDropRace = () => {
    setGameState('racing');
    setMessage('⚡ Race started! Marbles falling down...');

    // Fully random winner determination
    const gotiKeys = ['red', 'blue', 'green', 'yellow'];
    const winningId = gotiKeys[Math.floor(Math.random() * gotiKeys.length)];
    setWinnerGoti(winningId);

    // Random speeds so any goti can randomly win first
    const speeds: { [key: string]: number } = {
      red: winningId === 'red' ? 1.0 : 0.7 + Math.random() * 0.25,
      blue: winningId === 'blue' ? 1.0 : 0.7 + Math.random() * 0.25,
      green: winningId === 'green' ? 1.0 : 0.7 + Math.random() * 0.25,
      yellow: winningId === 'yellow' ? 1.0 : 0.7 + Math.random() * 0.25,
    };

    let progress = 0;
    const dropInterval = setInterval(() => {
      progress += 6;
      setPositions({
        red: Math.min(progress * speeds.red, 100),
        blue: Math.min(progress * speeds.blue, 100),
        green: Math.min(progress * speeds.green, 100),
        yellow: Math.min(progress * speeds.yellow, 100),
      });

      if (progress >= 100) {
        clearInterval(dropInterval);
        processResult(winningId);
      }
    }, 120);
  };

  const processResult = (winner: string) => {
    setGameState('result');
    const winnerNameUpper = `${winner.toUpperCase()} WINNER`;
    setMessage(`🏆 ${winnerNameUpper}!`);

    if (selectedGoti) {
      if (selectedGoti === winner) {
        const selectedObj = GOTI_OPTIONS.find(g => g.id === winner);
        const mult = selectedObj ? selectedObj.multiplier : 3.5;
        const rawWinnings = Math.floor(selectedBet * mult);
        const netWinnings = Math.floor(rawWinnings * 0.90);
        
        const updatedBal = balance + netWinnings;
        updateBalance(updatedBal);
      }
    }

    setTimeout(() => {
      resetRound();
    }, 4500);
  };

  const resetRound = () => {
    setSelectedGoti(null);
    setWinnerGoti(null);
    setPositions({ red: 0, blue: 0, green: 0, yellow: 0 });
    setTimeLeft(10);
    setGameState('betting');
    setMessage('Place your bet before timer ends!');
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center min-h-[85vh] p-4 text-white select-none">
      
      {/* Top Header */}
      <div className="w-full flex items-center justify-between bg-gray-900/90 border border-amber-500/30 px-4 py-3 rounded-2xl shadow-lg mb-3">
        <div className="flex items-center gap-2">
          <button 
            onClick={onBackToLobby}
            className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/40 px-3 py-1 rounded-xl font-bold cursor-pointer hover:bg-amber-500/30"
          >
            ← Lobby
          </button>
          <h2 className="text-xs font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
            🎲 LUDO VERTICAL DROP ⚡
          </h2>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-950/60 border border-amber-500/40 px-3 py-1 rounded-xl">
          <span className="text-xs">🔴</span>
          <span className="text-xs font-black text-amber-400">{balance}</span>
        </div>
      </div>

      {/* Timer & Status Banner / Direct Winner Display */}
      <div className="w-full bg-gradient-to-r from-gray-900 via-amber-950/40 to-gray-900 border border-amber-500/30 py-2.5 px-4 rounded-2xl flex items-center justify-between mb-3 shadow-md">
        <p className={`text-xs font-black truncate ${gameState === 'result' ? 'text-yellow-400 text-sm tracking-wider animate-pulse' : 'text-gray-300'}`}>
          {gameState === 'result' && winnerGoti ? `${winnerGoti.toUpperCase()} WINNER` : message}
        </p>
        {gameState === 'betting' && (
          <div className="flex items-center gap-1 bg-amber-600/20 border border-amber-500/50 px-2.5 py-1 rounded-xl shrink-0">
            <span className="text-[10px] text-amber-400 font-bold">Time:</span>
            <span className={`text-xs font-black ${timeLeft <= 3 ? 'text-red-500 animate-ping' : 'text-yellow-400'}`}>
              {timeLeft}s
            </span>
          </div>
        )}
      </div>

      {/* Vertical Marble Racing Arena with Straight Dividers */}
      <div className="w-full h-72 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 border border-amber-500/40 rounded-3xl p-3 mb-3 shadow-2xl relative overflow-hidden flex justify-between">
        
        {/* 4 Vertical Lanes with Solid Divider Lines */}
        {GOTI_OPTIONS.map((goti, idx) => {
          const isWinner = winnerGoti === goti.id && gameState === 'result';

          return (
            <div 
              key={goti.id} 
              className={`flex-1 relative flex flex-col items-center justify-between py-6 ${
                idx < GOTI_OPTIONS.length - 1 ? 'border-r-2 border-amber-500/30' : ''
              }`}
            >
              
              {/* Marble Token */}
              <div 
                className={`absolute w-8 h-8 rounded-full bg-gradient-to-br ${goti.color} border-2 border-white shadow-xl flex items-center justify-center text-xs font-black transition-all duration-100 z-20 ${
                  selectedGoti === goti.id ? 'ring-4 ring-yellow-400' : ''
                } ${isWinner ? 'animate-bounce ring-4 ring-green-400 scale-125' : ''}`}
                style={{ top: `${Math.max(8, positions[goti.id])}%` }}
              >
                {goti.icon}
              </div>

              {/* Winner Tag on Screen */}
              {isWinner && (
                <div className="absolute top-1/2 -translate-y-1/2 bg-yellow-400 text-black text-[10px] font-black px-2 py-1 rounded-md shadow-2xl z-30 animate-pulse text-center">
                  {goti.id.toUpperCase()} WINNER!
                </div>
              )}
            </div>
          );
        })}

        {/* Bottom Finish Line */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-r from-red-600 via-yellow-500 to-green-600 flex items-center justify-center z-30 shadow-inner">
          <span className="text-[10px] font-black text-black uppercase tracking-widest">🏁 FINISH LINE 🏁</span>
        </div>
      </div>

      {/* Bet Amount Selector Grid */}
      <div className="w-full bg-gray-900/90 border border-gray-800 p-3 rounded-2xl mb-3 shadow-lg">
        <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider text-center">
          Select Bet Amount (Red Diamonds)
        </p>
        <div className="grid grid-cols-6 gap-1.5">
          {BET_AMOUNTS.map((amt) => (
            <button
              key={amt}
              disabled={gameState !== 'betting'}
              onClick={() => setSelectedBet(amt)}
              className={`py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                selectedBet === amt
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-md scale-105'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {amt}
            </button>
          ))}
        </div>
      </div>

      {/* Goti Betting Buttons Grid */}
      <div className="w-full grid grid-cols-2 gap-2.5">
        {GOTI_OPTIONS.map((goti) => {
          const isSelected = selectedGoti === goti.id;
          return (
            <button
              key={goti.id}
              disabled={gameState !== 'betting' || selectedGoti !== null}
              onClick={() => handlePlaceBet(goti.id)}
              className={`py-3 px-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl transition-all flex items-center justify-between border ${
                isSelected
                  ? 'bg-yellow-400 text-black border-white ring-4 ring-yellow-400/50 scale-102'
                  : gameState === 'betting'
                  ? `bg-gradient-to-r ${goti.color} text-white ${goti.border} hover:scale-102 cursor-pointer`
                  : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{goti.icon}</span>
                <span className={isSelected ? 'text-black font-extrabold' : 'text-white'}>
                  {isSelected ? 'Locked' : goti.name}
                </span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-black text-yellow-300' : 'bg-black/40 text-gray-300'}`}>
                {selectedBet} 🔴
              </span>
            </button>
          );
        })}
      </div>

    </div>
  );
}