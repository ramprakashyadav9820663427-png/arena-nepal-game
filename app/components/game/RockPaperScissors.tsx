'use client';
import React, { useState, useEffect } from 'react';
import { getWalletBalance, updateWalletBalance } from '@/lib/wallet';

type Choice = 'rock' | 'paper' | 'scissors' | null;

export default function RockPaperScissors() {
  const [redDiamonds, setRedDiamonds] = useState<number>(4150);
  const [entryFee, setEntryFee] = useState<number>(50);
  const [playerChoice, setPlayerChoice] = useState<Choice>(null);
  const [botChoice, setBotChoice] = useState<Choice>(null);
  const [result, setResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [isFighting, setIsFighting] = useState<boolean>(false);
  const [prizeWon, setPrizeWon] = useState<number>(0);
  const [countdown, setCountdown] = useState<number | null>(null);

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

    return () => {
      window.removeEventListener('walletUpdated', handleWalletSync);
      window.removeEventListener('storage', handleWalletSync);
    };
  }, []);

  const choices: { id: Choice; label: string; emoji: string; bg: string }[] = [
    { id: 'rock', label: 'Rock', emoji: '✊', bg: 'from-amber-600 to-orange-700' },
    { id: 'paper', label: 'Paper', emoji: '✋', bg: 'from-blue-600 to-indigo-700' },
    { id: 'scissors', label: 'Scissors', emoji: '✌️', bg: 'from-purple-600 to-pink-700' },
  ];

  // Web Audio API helper for crisp tick sound during countdown (TypeScript Safe)
  const playTickSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      // Ignore audio block errors
    }
  };

  const playGame = (selection: Choice) => {
    if (isFighting || !selection) return;

    const currentBalance = getWalletBalance();
    if (currentBalance < entryFee) {
      alert(`Insufficient Red Diamonds! You need at least ${entryFee} Red Diamonds.`);
      return;
    }

    // 1. एंट्री फीस डिडक्ट करें using central updateWalletBalance
    const updatedDiamonds = updateWalletBalance(-entryFee);
    setRedDiamonds(updatedDiamonds);

    setPlayerChoice(selection);
    setBotChoice(null);
    setResult(null);
    setIsFighting(true);
    setCountdown(3);

    // 2. 3 Second Tick-Tick Countdown & Sound effect
    let currentCount = 3;
    playTickSound();

    const timerInterval = setInterval(() => {
      currentCount -= 1;
      if (currentCount > 0) {
        setCountdown(currentCount);
        playTickSound();
      } else {
        clearInterval(timerInterval);
        setCountdown(null);

        // 3. बॉट का चुनाव और रिजल्ट लॉजिक
        const choicesArray: Choice[] = ['rock', 'paper', 'scissors'];
        const randomBotChoice = choicesArray[Math.floor(Math.random() * choicesArray.length)];
        setBotChoice(randomBotChoice);

        let gameResult: 'win' | 'lose' | 'draw' = 'draw';
        if (selection === randomBotChoice) {
          gameResult = 'draw';
        } else if (
          (selection === 'rock' && randomBotChoice === 'scissors') ||
          (selection === 'paper' && randomBotChoice === 'rock') ||
          (selection === 'scissors' && randomBotChoice === 'paper')
        ) {
          gameResult = 'win';
        } else {
          gameResult = 'lose';
        }

        setResult(gameResult);
        setIsFighting(false);

        // 4. प्राइज मनी और रिफंड कैलकुलेशन via central updateWalletBalance
        if (gameResult === 'win') {
          const totalPool = entryFee * 2;
          const prize = Math.floor(totalPool * 0.9);
          setPrizeWon(prize);

          const finalDiamonds = updateWalletBalance(prize);
          setRedDiamonds(finalDiamonds);
        } else if (gameResult === 'draw') {
          const refundDiamonds = updateWalletBalance(entryFee);
          setRedDiamonds(refundDiamonds);
          setPrizeWon(0);
        } else {
          setPrizeWon(0);
        }
      }
    }, 1000);
  };

  return (
    <div className="w-full max-w-md mx-auto text-white flex flex-col items-center pb-20 px-4 select-none">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between my-4">
        <h1 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500">
          ✊ ROCK • PAPER • SCISSORS
        </h1>
        <div className="bg-gradient-to-r from-red-950 to-gray-900 border border-red-500/40 px-3 py-1 rounded-xl text-xs font-bold text-red-400 shadow-md">
          🪙 {redDiamonds} Red Dias
        </div>
      </div>

      {/* Entry Fee Selection (Expanded up to 500) */}
      <div className="w-full bg-gradient-to-b from-gray-900 to-black border border-gray-800 p-3.5 rounded-2xl mb-4 shadow-xl">
        <h3 className="text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Select Entry Fee</h3>
        <div className="grid grid-cols-4 gap-2">
          {[20, 50, 100, 200, 300, 400, 500].map((fee) => (
            <button
              key={fee}
              onClick={() => setEntryFee(fee)}
              disabled={isFighting}
              className={`py-2.5 rounded-xl font-black text-xs transition-all border ${
                entryFee === fee
                  ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white border-red-400 shadow-lg scale-105'
                  : 'bg-black/50 text-gray-300 border-gray-800 hover:border-gray-700'
              }`}
            >
              🪙 {fee}
            </button>
          ))}
        </div>
      </div>

      {/* Premium Battle Arena Screen */}
      <div className="w-full bg-gradient-to-br from-gray-900 via-[#121824] to-black border border-amber-500/40 p-5 rounded-3xl shadow-2xl flex flex-col items-center mb-4 relative overflow-hidden">
        
        {/* Background glow effects */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between w-full mb-6 z-10">
          {/* Player Side */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-700 rounded-2xl border-2 border-cyan-300 flex items-center justify-center text-3xl shadow-lg shadow-cyan-900/40">
              {playerChoice ? choices.find((c) => c.id === playerChoice)?.emoji : '🧑'}
            </div>
            <span className="text-xs font-bold text-cyan-300 mt-1">You</span>
          </div>

          {/* Versus / Countdown Indicator */}
          <div className="flex flex-col items-center justify-center">
            {countdown !== null ? (
              <div className="w-10 h-10 bg-yellow-500/20 border border-yellow-400 rounded-full flex items-center justify-center animate-bounce">
                <span className="text-yellow-400 font-black text-base">{countdown}</span>
              </div>
            ) : (
              <span className="text-amber-400 font-black text-base italic tracking-widest animate-pulse">VS</span>
            )}
          </div>

          {/* Opponent Side (Girl Avatar Demo Photo) */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-600 to-purple-700 rounded-2xl border-2 border-pink-300 flex items-center justify-center text-3xl shadow-lg shadow-pink-900/40 overflow-hidden relative">
              {isFighting && countdown !== null ? (
                <span className="animate-spin text-2xl">🌀</span>
              ) : botChoice ? (
                choices.find((c) => c.id === botChoice)?.emoji
              ) : (
                /* Girl Demo Avatar Image */
                <img 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" 
                  alt="Opponent Girl" 
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <span className="text-xs font-bold text-pink-300 mt-1">Opponent</span>
          </div>
        </div>

        {/* Status Message / Result Box */}
        <div className="w-full text-center py-3 bg-black/60 border border-gray-800 rounded-2xl z-10">
          {isFighting ? (
            <p className="text-xs font-bold text-yellow-400 animate-pulse">
              {countdown !== null ? `Battle starting in ${countdown}s...` : 'Battling with opponent...'}
            </p>
          ) : result === 'win' ? (
            <div>
              <p className="text-sm font-black text-green-400">🎉 YOU WON THE BATTLE! 🎉</p>
              <p className="text-xs font-bold text-yellow-400 mt-0.5">+{prizeWon} Red Diamonds added</p>
            </div>
          ) : result === 'lose' ? (
            <p className="text-sm font-black text-red-500">❌ OOPS! OPPONENT WON</p>
          ) : result === 'draw' ? (
            <p className="text-sm font-black text-blue-400">🤝 IT&apos;S A DRAW! Fee Refunded</p>
          ) : (
            <p className="text-xs font-medium text-gray-400">Choose your weapon below to start!</p>
          )}
        </div>
      </div>

      {/* Choice Buttons (User Input) */}
      <div className="w-full bg-gray-900 border border-gray-800 p-4 rounded-2xl shadow-xl text-center">
        <p className="text-[11px] font-bold text-gray-400 mb-3 uppercase tracking-wider">Make Your Move</p>
        <div className="grid grid-cols-3 gap-3">
          {choices.map((item) => (
            <button
              key={item.id}
              onClick={() => playGame(item.id)}
              disabled={isFighting}
              className={`py-4 bg-gradient-to-r ${item.bg} hover:opacity-90 disabled:opacity-50 rounded-2xl flex flex-col items-center justify-center shadow-xl border border-white/20 transition-all active:scale-95 cursor-pointer`}
            >
              <span className="text-3xl mb-1">{item.emoji}</span>
              <span className="text-xs font-black text-white">{item.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-500 mt-3">
          Platform Fee: 10% | Winner takes 90% of the combined pool!
        </p>
      </div>
    </div>
  );
}