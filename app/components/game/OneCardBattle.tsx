'use client';
import React, { useState, useEffect } from 'react';

interface OneCardBattleProps {
  onBackToLobby: () => void;
}

const BET_AMOUNTS = [50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

interface Card {
  value: string;
  suit: string;
  numericVal: number;
}

export default function OneCardBattle({ onBackToLobby }: OneCardBattleProps) {
  const [balance, setBalance] = useState<number>(0);
  const [selectedBet, setSelectedBet] = useState<number>(50);
  const [userChoice, setUserChoice] = useState<'left' | 'right' | 'pair' | null>(null);
  const [gameState, setGameState] = useState<'betting' | 'dealing' | 'result'>('betting');
  const [timeLeft, setTimeLeft] = useState<number>(10);

  const [leftCard, setLeftCard] = useState<Card | null>(null);
  const [rightCard, setRightCard] = useState<Card | null>(null);
  const [roundWinner, setRoundWinner] = useState<'left' | 'right' | 'pair' | null>(null);
  const [message, setMessage] = useState<string>('Place your bet on Left, Right or Pair (2.5x)!');

  // Audio helper function for tick-tick sound with variable volume
  const playTickSound = (isLoud: boolean) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isLoud ? 1200 : 800, ctx.currentTime);

      gain.gain.setValueAtTime(isLoud ? 0.35 : 0.1, ctx.currentTime); // Loud vs Normal Volume
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      // Audio context error fallback
    }
  };

  // Red Diamond Balance Load karne ke liye
  const fetchBalance = () => {
    try {
      const val = localStorage.getItem('arena_red_diamonds') || 
                  localStorage.getItem('arena_red_dias') || 
                  localStorage.getItem('arena_diamond') || 
                  localStorage.getItem('arena_cash');
      setBalance(val ? parseInt(val, 10) : 0);
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

  // 10 Seconds Betting & Auto Round Timer with Tick Sound
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'betting') {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            startBattle();
            return 0;
          }
          // Play tick sound (loud if <= 3 seconds remaining)
          playTickSound(prev <= 4);
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, userChoice, selectedBet]);

  // Random Card Generator helper
  const getRandomCard = (): Card => {
    const vIndex = Math.floor(Math.random() * VALUES.length);
    const sIndex = Math.floor(Math.random() * SUITS.length);
    return {
      value: VALUES[vIndex],
      suit: SUITS[sIndex],
      numericVal: vIndex + 2, // 2 = 2, ..., Ace = 14
    };
  };

  const handlePlaceBet = (choice: 'left' | 'right' | 'pair') => {
    if (gameState !== 'betting') return;
    // Lock bets in last 3 seconds (timeLeft <= 3)
    if (timeLeft <= 3) {
      alert('⚠️ Betting is locked for this round!');
      return;
    }
    if (balance < selectedBet) {
      alert('⚠️ Not enough Red Diamonds in your wallet!');
      return;
    }

    // Deduct bet amount immediately
    const newBal = balance - selectedBet;
    updateBalance(newBal);
    setUserChoice(choice);
    setMessage(`Bet placed on ${choice.toUpperCase()}! Waiting for result...`);
  };

  const updateBalance = (newAmount: number) => {
    setBalance(newAmount);
    localStorage.setItem('arena_red_diamonds', newAmount.toString());
    window.dispatchEvent(new Event('storage'));
  };

  const startBattle = () => {
    setGameState('dealing');

    // Generate Cards
    const cardL = getRandomCard();
    const cardR = getRandomCard();

    setLeftCard(cardL);
    setRightCard(cardR);

    // Determine Winner ('left', 'right', or 'pair')
    let winner: 'left' | 'right' | 'pair' = 'pair';
    if (cardL.numericVal > cardR.numericVal) {
      winner = 'left';
    } else if (cardR.numericVal > cardL.numericVal) {
      winner = 'right';
    } else {
      winner = 'pair';
    }
    setRoundWinner(winner);

    // Calculate Payout if user placed a bet
    if (userChoice) {
      if (userChoice === winner) {
        if (winner === 'pair') {
          // Pair wins 2.5x payout
          const winnings = Math.floor(selectedBet * 2.5);
          const updatedBal = balance + winnings;
          updateBalance(updatedBal);
          setMessage(`🎉 Pair Hit! You Won +${winnings} Red Diamonds (2.5x)!`);
        } else {
          // Left or Right wins 1.9x payout
          const winnings = Math.floor(selectedBet * 1.9);
          const updatedBal = balance + winnings;
          updateBalance(updatedBal);
          setMessage(`🎉 You Won! +${winnings} Red Diamonds!`);
        }
      } else {
        setMessage(`❌ You Lost this round! Winner was ${winner.toUpperCase()}`);
      }
    } else {
      setMessage(`Round ended! Winner: ${winner.toUpperCase()}`);
    }

    setGameState('result');

    // Reset for next round after 4 seconds
    setTimeout(() => {
      resetRound();
    }, 4000);
  };

  const resetRound = () => {
    setLeftCard(null);
    setRightCard(null);
    setUserChoice(null);
    setRoundWinner(null);
    setTimeLeft(10);
    setGameState('betting');
    setMessage('Place your bet on Left, Right or Pair (2.5x)!');
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center min-h-[85vh] p-4 text-white select-none">
      
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between bg-gray-900/90 border border-red-500/30 px-4 py-3 rounded-2xl shadow-lg mb-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={onBackToLobby}
            className="text-xs bg-red-500/20 text-red-400 border border-red-500/40 px-3 py-1 rounded-xl font-bold cursor-pointer hover:bg-red-500/30"
          >
            ← Lobby
          </button>
          <h2 className="text-xs font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-yellow-400">
            ONE CARD BATTLE 🃏
          </h2>
        </div>

        {/* Live Balance */}
        <div className="flex items-center gap-1.5 bg-red-950/60 border border-red-500/40 px-3 py-1 rounded-xl">
          <span className="text-xs">🔴</span>
          <span className="text-xs font-black text-red-400">{balance}</span>
        </div>
      </div>

      {/* Timer & Status Banner */}
      <div className="w-full bg-gradient-to-r from-gray-900 via-red-950/40 to-gray-900 border border-red-500/30 py-2.5 px-4 rounded-2xl flex items-center justify-between mb-4 shadow-md">
        <p className="text-xs font-bold text-gray-300 truncate">{message}</p>
        {gameState === 'betting' && (
          <div className="flex items-center gap-1 bg-red-600/20 border border-red-500/50 px-2.5 py-1 rounded-xl">
            <span className="text-[10px] text-red-400 font-bold">{timeLeft <= 3 ? '🔒 LOCKED:' : 'Time:'}</span>
            <span className={`text-xs font-black ${timeLeft <= 3 ? 'text-red-500 animate-ping' : 'text-yellow-400'}`}>
              {timeLeft}s
            </span>
          </div>
        )}
      </div>

      {/* Two Big Boxes for Cards (Left & Right Arena) */}
      <div className="w-full grid grid-cols-2 gap-4 mb-4">
        
        {/* Left Box */}
        <div className={`relative h-44 rounded-3xl border-2 flex flex-col items-center justify-center transition-all shadow-xl overflow-hidden ${
          userChoice === 'left' ? 'border-yellow-400 bg-yellow-500/10 shadow-yellow-500/20' : 'border-red-500/40 bg-gray-900/80'
        }`}>
          <div className="absolute top-2 left-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Left Side {userChoice === 'left' && '👉 (You)'}
          </div>

          {leftCard ? (
            <div className={`w-20 h-28 bg-white rounded-2xl shadow-2xl flex flex-col justify-between p-3 text-black font-black transform transition-all animate-in zoom-in duration-300 ${
              ['♥', '♦'].includes(leftCard.suit) ? 'text-red-600' : 'text-black'
            }`}>
              <div className="text-sm leading-none">{leftCard.value}</div>
              <div className="text-3xl text-center self-center">{leftCard.suit}</div>
              <div className="text-sm leading-none self-end rotate-180">{leftCard.value}</div>
            </div>
          ) : (
            <div className="text-3xl opacity-30 animate-pulse">🎴</div>
          )}

          {roundWinner === 'left' && (
            <div className="absolute inset-0 bg-green-500/20 border-2 border-green-500 rounded-3xl flex items-center justify-center">
              <span className="text-xs font-black bg-green-500 text-black px-3 py-1 rounded-full shadow-lg">WINNER 🏆</span>
            </div>
          )}
        </div>

        {/* Right Box */}
        <div className={`relative h-44 rounded-3xl border-2 flex flex-col items-center justify-center transition-all shadow-xl overflow-hidden ${
          userChoice === 'right' ? 'border-yellow-400 bg-yellow-500/10 shadow-yellow-500/20' : 'border-red-500/40 bg-gray-900/80'
        }`}>
          <div className="absolute top-2 right-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {userChoice === 'right' && '(You) 👈'} Right Side
          </div>

          {rightCard ? (
            <div className={`w-20 h-28 bg-white rounded-2xl shadow-2xl flex flex-col justify-between p-3 text-black font-black transform transition-all animate-in zoom-in duration-300 ${
              ['♥', '♦'].includes(rightCard.suit) ? 'text-red-600' : 'text-black'
            }`}>
              <div className="text-sm leading-none">{rightCard.value}</div>
              <div className="text-3xl text-center self-center">{rightCard.suit}</div>
              <div className="text-sm leading-none self-end rotate-180">{rightCard.value}</div>
            </div>
          ) : (
            <div className="text-3xl opacity-30 animate-pulse">🎴</div>
          )}

          {roundWinner === 'right' && (
            <div className="absolute inset-0 bg-green-500/20 border-2 border-green-500 rounded-3xl flex items-center justify-center">
              <span className="text-xs font-black bg-green-500 text-black px-3 py-1 rounded-full shadow-lg">WINNER 🏆</span>
            </div>
          )}
        </div>

      </div>

      {/* Bet Amount Selector Grid (50 to 1000 Red Diamonds) */}
      <div className="w-full bg-gray-900/90 border border-gray-800 p-3 rounded-2xl mb-4 shadow-lg">
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
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-md scale-105'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {amt}
            </button>
          ))}
        </div>
      </div>

      {/* Tap To Bet Action Buttons (Left, Pair (2.5x), Right in 3-columns layout) */}
      <div className="w-full grid grid-cols-3 gap-2">
        
        {/* Left Button */}
        <button
          disabled={gameState !== 'betting' || userChoice !== null || timeLeft <= 3}
          onClick={() => handlePlaceBet('left')}
          className={`py-3 px-1 rounded-2xl font-black text-[11px] uppercase tracking-wider shadow-xl transition-all flex flex-col items-center justify-center ${
            userChoice === 'left'
              ? 'bg-yellow-400 text-black ring-4 ring-yellow-400/50'
              : gameState === 'betting' && timeLeft > 3
              ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white hover:scale-102 cursor-pointer'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span>{userChoice === 'left' ? 'Locked' : 'Left'}</span>
          <span className="text-[9px] text-red-200 mt-0.5">({selectedBet} 🔴)</span>
        </button>

        {/* Pair Button (Middle - 2.5x) */}
        <button
          disabled={gameState !== 'betting' || userChoice !== null || timeLeft <= 3}
          onClick={() => handlePlaceBet('pair')}
          className={`py-3 px-1 rounded-2xl font-black text-[11px] uppercase tracking-wider shadow-xl transition-all flex flex-col items-center justify-center border ${
            userChoice === 'pair'
              ? 'bg-yellow-400 text-black border-white ring-4 ring-yellow-400/50'
              : gameState === 'betting' && timeLeft > 3
              ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black border-yellow-300 hover:scale-102 cursor-pointer'
              : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
          }`}
        >
          <span className="text-black font-extrabold">{userChoice === 'pair' ? 'Locked' : 'Pair (2.5x)'}</span>
          <span className="text-[9px] text-black/80 font-bold mt-0.5">({selectedBet} 🔴)</span>
        </button>

        {/* Right Button */}
        <button
          disabled={gameState !== 'betting' || userChoice !== null || timeLeft <= 3}
          onClick={() => handlePlaceBet('right')}
          className={`py-3 px-1 rounded-2xl font-black text-[11px] uppercase tracking-wider shadow-xl transition-all flex flex-col items-center justify-center ${
            userChoice === 'right'
              ? 'bg-yellow-400 text-black ring-4 ring-yellow-400/50'
              : gameState === 'betting' && timeLeft > 3
              ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:scale-102 cursor-pointer'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span>{userChoice === 'right' ? 'Locked' : 'Right'}</span>
          <span className="text-[9px] text-blue-200 mt-0.5">({selectedBet} 🔴)</span>
        </button>

      </div>

    </div>
  );
}