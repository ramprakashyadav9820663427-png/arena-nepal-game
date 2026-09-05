'use client';
import React, { useState, useEffect, useRef } from 'react';
import { getWalletBalance, updateWalletBalance } from '@/lib/wallet';

interface TeenPattiBattleProps {
  onBackToLobby?: () => void;
}

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

interface Card {
  suit: string;
  value: string;
  numericVal: number;
}

export default function TeenPattiBattle({ onBackToLobby }: TeenPattiBattleProps) {
  const [gameState, setGameState] = useState<'BETTING' | 'REVEALING' | 'RESULT'>('BETTING');
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [redDiamonds, setRedDiamonds] = useState<number>(1000);
  
  // Separate bets for Left and Right
  const [leftBet, setLeftBet] = useState<number>(0);
  const [rightBet, setRightBet] = useState<number>(0);
  const [selectedChip, setSelectedChip] = useState<number>(50);

  const [leftCards, setLeftCards] = useState<Card[]>([]);
  const [rightCards, setRightCards] = useState<Card[]>([]);
  
  const [winnerSide, setWinnerSide] = useState<'LEFT' | 'RIGHT' | 'TIE' | null>(null);
  const [totalWon, setTotalWon] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Audio refs for tick sounds and win/loss
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Централизоваड वॉलेट बैलेंस सिंक करें
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

    // Initialize Web Audio API context safely on client
    if (typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }

    return () => {
      window.removeEventListener('walletUpdated', handleWalletSync);
      window.removeEventListener('storage', handleWalletSync);
    };
  }, []);

  const playTickSound = (highPitch = false) => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(highPitch ? 880 : 440, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  };

  // 15 seconds countdown timer with tick sounds in last 3 seconds
  useEffect(() => {
    if (gameState !== 'BETTING') return;

    if (timeLeft > 0) {
      if (timeLeft <= 3) {
        setIsLocked(false);
        playTickSound(true); // High pitch tick for last 3 seconds
      } else {
        playTickSound(false);
      }

      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setIsLocked(true);
      evaluateBattle();
    }
  }, [timeLeft, gameState]);

  const generateRandomCard = (): Card => {
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const valIndex = Math.floor(Math.random() * VALUES.length);
    return {
      suit,
      value: VALUES[valIndex],
      numericVal: valIndex + 2
    };
  };

  const getHandScore = (cards: Card[]): number => {
    const vals = cards.map(c => c.numericVal).sort((a, b) => b - a);
    const isTrail = vals[0] === vals[1] && vals[1] === vals[2];
    const isSeq = (vals[0] === vals[1] + 1 && vals[1] === vals[2] + 1) || (vals[0] === 14 && vals[1] === 3 && vals[2] === 2);
    const isPair = vals[0] === vals[1] || vals[1] === vals[2] || vals[0] === vals[2];

    if (isTrail) return 5000 + vals[0];
    if (isSeq) return 4000 + vals[0];
    if (isPair) return 2000 + vals[0];
    return vals[0] * 100 + vals[1] * 10 + vals[2];
  };

  const evaluateBattle = () => {
    let finalLeft = leftBet;
    let finalRight = rightBet;
    if (finalLeft === 0 && finalRight === 0) {
      const currentBal = getWalletBalance();
      if (currentBal >= 50) {
        // सेंट्रल वॉलेट से डिडक्ट करें
        const updated = updateWalletBalance(-50);
        setRedDiamonds(updated);
        finalLeft = 50;
        setLeftBet(50);
      }
    }

    const lCards = [generateRandomCard(), generateRandomCard(), generateRandomCard()];
    const rCards = [generateRandomCard(), generateRandomCard(), generateRandomCard()];
    
    setLeftCards(lCards);
    setRightCards(rCards);
    setGameState('REVEALING');

    setTimeout(() => {
      const lScore = getHandScore(lCards);
      const rScore = getHandScore(rCards);

      let win: 'LEFT' | 'RIGHT' | 'TIE' = 'LEFT';
      if (lScore > rScore) win = 'LEFT';
      else if (rScore > lScore) win = 'RIGHT';
      else win = 'TIE';

      setWinnerSide(win);
      setGameState('RESULT');

      let payout = 0;
      if (win === 'LEFT' && finalLeft > 0) {
        payout += finalLeft * 2;
      }
      if (win === 'RIGHT' && finalRight > 0) {
        payout += finalRight * 2;
      }
      if (win === 'TIE') {
        payout += finalLeft + finalRight; // Return original stakes on tie
      }

      setTotalWon(payout);
      if (payout > 0) {
        // सेंट्रल वॉलेट में प्राइज जोड़ें
        const updated = updateWalletBalance(payout);
        setRedDiamonds(updated);
      }
    }, 2000);
  };

  const handlePlaceBet = (side: 'LEFT' | 'RIGHT') => {
    if (gameState !== 'BETTING' || timeLeft <= 1) return;
    const currentBal = getWalletBalance();
    if (currentBal < selectedChip) {
      alert('Not enough Red Diamonds in your wallet!');
      return;
    }

    // सेंट्रल वॉलेट से बैट अमाउंट काटें
    const updated = updateWalletBalance(-selectedChip);
    setRedDiamonds(updated);
    playTickSound(false);

    if (side === 'LEFT') {
      setLeftBet(prev => prev + selectedChip);
    } else {
      setRightBet(prev => prev + selectedChip);
    }
  };

  const resetRound = () => {
    setGameState('BETTING');
    setTimeLeft(15);
    setLeftBet(0);
    setRightBet(0);
    setLeftCards([]);
    setRightCards([]);
    setWinnerSide(null);
    setTotalWon(0);
    setIsLocked(false);
  };

  return (
    <div className="w-full max-w-md bg-gray-950 border border-amber-500/45 rounded-3xl p-4 flex flex-col items-center shadow-2xl relative overflow-hidden select-none mx-auto text-white">
      {/* Top Bar */}
      <div className="w-full flex justify-between items-center mb-3">
        {onBackToLobby ? (
          <button
            onClick={onBackToLobby}
            className="px-3 py-1 bg-gray-900 hover:bg-gray-800 text-gray-300 font-bold text-[11px] rounded-xl border border-gray-800 cursor-pointer"
          >
            ← Back
          </button>
        ) : <div />}
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-red-950 to-gray-900 px-3 py-1 rounded-xl border border-red-500/30">
          <span className="text-sm">🪙</span>
          <span className="text-xs font-black text-red-400">{redDiamonds} Red Dias</span>
        </div>
      </div>

      <div className="w-full text-center mb-2">
        <h2 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 uppercase tracking-wider">
          🃏 Teen Patti Grand Battle
        </h2>
        <p className="text-[10px] text-gray-400">Place bets on Left or Right. Highest 3-Patti hand wins!</p>
      </div>

      {/* Center Timer & Status Banner between Cards */}
      <div className="w-full bg-gray-900/90 border border-gray-800 rounded-2xl py-2 px-3 mb-3 flex items-center justify-between shadow-inner">
        <span className="text-[11px] font-bold text-gray-300 uppercase flex items-center gap-1.5">
          {gameState === 'BETTING' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
              <span>{timeLeft <= 3 ? '🔒 BETS LOCKED SOON' : `⏳ TIME: ${timeLeft}s`}</span>
            </>
          ) : gameState === 'REVEALING' ? (
            <span className="text-yellow-400 animate-pulse">🎴 DEALING CARDS...</span>
          ) : (
            <span className="text-green-400">🏁 ROUND FINISHED</span>
          )}
        </span>
        <span className="text-xs font-black text-amber-400">
          {timeLeft}s
        </span>
      </div>

      {/* Grand Arena: Left vs Right Side with Big Cards */}
      <div className="grid grid-cols-2 gap-3 w-full mb-3">
        
        {/* Left Side */}
        <div 
          onClick={() => gameState === 'BETTING' && timeLeft > 1 && handlePlaceBet('LEFT')}
          className={`p-3 rounded-2xl border flex flex-col items-center justify-between transition-all cursor-pointer relative overflow-hidden min-h-[160px] ${
            winnerSide === 'LEFT' ? 'bg-green-950/40 border-green-400 shadow-lg shadow-green-500/20' : 
            leftBet > 0 ? 'bg-amber-950/40 border-amber-400 shadow-md shadow-amber-500/20' : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
          }`}
        >
          {winnerSide === 'LEFT' && (
            <span className="absolute top-2 left-2 text-[9px] bg-green-500 text-black font-black px-1.5 py-0.5 rounded animate-bounce">WINNER</span>
          )}
          
          <div className="text-center">
            <span className="text-xs font-black text-amber-400 block mb-1">LEFT PATTIS</span>
            {/* Big Cards */}
            <div className="flex gap-1.5 my-2 justify-center">
              {leftCards.length > 0 ? (
                leftCards.map((c, i) => (
                  <div key={i} className="w-9 h-14 bg-white text-black font-black rounded-lg flex flex-col items-center justify-center text-sm shadow-xl border border-gray-300 animate-fade-in">
                    <span className="leading-none">{c.value}</span>
                    <span className={c.suit === '♥' || c.suit === '♦' ? 'text-red-600 text-xs' : 'text-black text-xs'}>{c.suit}</span>
                  </div>
                ))
              ) : (
                <div className="flex gap-1.5">
                  <div className="w-9 h-14 bg-gray-800/80 rounded-lg border border-dashed border-gray-700 flex items-center justify-center text-xs text-gray-500 shadow-inner">🎴</div>
                  <div className="w-9 h-14 bg-gray-800/80 rounded-lg border border-dashed border-gray-700 flex items-center justify-center text-xs text-gray-500 shadow-inner">🎴</div>
                  <div className="w-9 h-14 bg-gray-800/80 rounded-lg border border-dashed border-gray-700 flex items-center justify-center text-xs text-gray-500 shadow-inner">🎴</div>
                </div>
              )}
            </div>
          </div>

          {/* Dedicated Bet Box */}
          <div className="w-full bg-black/60 border border-gray-800 rounded-xl p-1.5 text-center mt-1">
            <span className="text-[9px] text-gray-400 block">Your Bet</span>
            <span className="text-xs font-black text-amber-400">{leftBet > 0 ? `${leftBet} 🔴` : 'Tap to Bet'}</span>
          </div>
        </div>

        {/* Right Side */}
        <div 
          onClick={() => gameState === 'BETTING' && timeLeft > 1 && handlePlaceBet('RIGHT')}
          className={`p-3 rounded-2xl border flex flex-col items-center justify-between transition-all cursor-pointer relative overflow-hidden min-h-[160px] ${
            winnerSide === 'RIGHT' ? 'bg-green-950/40 border-green-400 shadow-lg shadow-green-500/20' : 
            rightBet > 0 ? 'bg-orange-950/40 border-orange-400 shadow-md shadow-orange-500/20' : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
          }`}
        >
          {winnerSide === 'RIGHT' && (
            <span className="absolute top-2 right-2 text-[9px] bg-green-500 text-black font-black px-1.5 py-0.5 rounded animate-bounce">WINNER</span>
          )}

          <div className="text-center">
            <span className="text-xs font-black text-orange-400 block mb-1">RIGHT PATTIS</span>
            {/* Big Cards */}
            <div className="flex gap-1.5 my-2 justify-center">
              {rightCards.length > 0 ? (
                rightCards.map((c, i) => (
                  <div key={i} className="w-9 h-14 bg-white text-black font-black rounded-lg flex flex-col items-center justify-center text-sm shadow-xl border border-gray-300 animate-fade-in">
                    <span className="leading-none">{c.value}</span>
                    <span className={c.suit === '♥' || c.suit === '♦' ? 'text-red-600 text-xs' : 'text-black text-xs'}>{c.suit}</span>
                  </div>
                ))
              ) : (
                <div className="flex gap-1.5">
                  <div className="w-9 h-14 bg-gray-800/80 rounded-lg border border-dashed border-gray-700 flex items-center justify-center text-xs text-gray-500 shadow-inner">🎴</div>
                  <div className="w-9 h-14 bg-gray-800/80 rounded-lg border border-dashed border-gray-700 flex items-center justify-center text-xs text-gray-500 shadow-inner">🎴</div>
                  <div className="w-9 h-14 bg-gray-800/80 rounded-lg border border-dashed border-gray-700 flex items-center justify-center text-xs text-gray-500 shadow-inner">🎴</div>
                </div>
              )}
            </div>
          </div>

          {/* Dedicated Bet Box */}
          <div className="w-full bg-black/60 border border-gray-800 rounded-xl p-1.5 text-center mt-1">
            <span className="text-[9px] text-gray-400 block">Your Bet</span>
            <span className="text-xs font-black text-orange-400">{rightBet > 0 ? `${rightBet} 🔴` : 'Tap to Bet'}</span>
          </div>
        </div>

      </div>

      {/* Result Banner */}
      {gameState === 'RESULT' && (
        <div className={`w-full p-2.5 rounded-2xl mb-3 text-center border ${totalWon > 0 ? 'bg-green-950/60 border-green-500/50' : 'bg-red-950/60 border-red-500/50'}`}>
          <h3 className={`text-xs font-black uppercase ${totalWon > 0 ? 'text-green-400 animate-bounce' : 'text-red-400'}`}>
            {totalWon > 0 ? `🎉 Victory! Won +${totalWon} Red Diamonds!` : `💀 Defeated! Side ${winnerSide} Won.`}
          </h3>
          <button 
            onClick={resetRound}
            className="mt-2 px-5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs rounded-xl cursor-pointer shadow-lg active:scale-95 uppercase"
          >
            Play Next Round 🚀
          </button>
        </div>
      )}

      {/* Expanded Betting Chips Selector (50 to 500) */}
      {gameState === 'BETTING' && (
        <div className="w-full bg-gray-900/80 border border-gray-800 p-2.5 rounded-2xl flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Select Chip Stake</span>
            <span className="text-[10px] text-amber-400 font-mono font-bold">Active: {selectedChip} 🔴</span>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {[50, 100, 150, 200, 300, 400, 500].map((amt) => (
              <button
                key={amt}
                onClick={() => setSelectedChip(amt)}
                className={`py-1.5 rounded-xl text-[10px] font-black border transition-all cursor-pointer ${
                  selectedChip === amt 
                    ? 'bg-amber-500 text-black border-amber-300 shadow-md shadow-amber-500/30 scale-105' 
                    : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                }`}
              >
                {amt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}