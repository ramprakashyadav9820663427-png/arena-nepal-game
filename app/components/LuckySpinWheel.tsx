'use client';
import React, { useState, useEffect } from 'react';

// Slices / Segments data with 8 distinct diamond prize slots
const WHEEL_SLICES = [
  { label: '25 💎', value: 25, color: '#f59e0b' },   // Amber
  { label: '50 💎', value: 50, color: '#ec4899' },   // Pink
  { label: '100 💎', value: 100, color: '#8b5cf6' }, // Purple
  { label: '200 💎', value: 200, color: '#3b82f6' }, // Blue
  { label: '300 💎', value: 300, color: '#10b981' }, // Emerald
  { label: '400 💎', value: 400, color: '#eab308' }, // Yellow
  { label: '500 💎', value: 500, color: '#f43f5e' }, // Rose
  { label: '1000 💎', value: 1000, color: '#06b6d4' },// Cyan
];

export default function LuckySpinWheel() {
  const [spinTokens, setSpinTokens] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [lastReward, setLastReward] = useState<string>('Click Spin to Play!');
  
  // New state for Celebration Win Modal Popup
  const [showWinModal, setShowWinModal] = useState<boolean>(false);
  const [celebrationPrize, setCelebrationPrize] = useState<string>('');

  // Load tokens from localStorage on mount & listen to updates
  useEffect(() => {
    const updateTokens = () => {
      const tokens = parseInt(localStorage.getItem('arena_spin_tokens') || '0', 10);
      setSpinTokens(tokens);
    };

    updateTokens();
    window.addEventListener('storage', updateTokens);
    
    const interval = setInterval(updateTokens, 1000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', updateTokens);
    };
  }, []);

  const handleSpin = () => {
    if (isSpinning) return;

    // Check if user has tokens
    const currentTokens = parseInt(localStorage.getItem('arena_spin_tokens') || '0', 10);
    if (currentTokens <= 0) {
      alert('❌ You need Spin Tokens! Make a deposit in the wallet to get tokens.');
      return;
    }

    // Deduct 1 Token
    const updatedTokens = currentTokens - 1;
    localStorage.setItem('arena_spin_tokens', updatedTokens.toString());
    setSpinTokens(updatedTokens);
    window.dispatchEvent(new Event('storage'));

    setIsSpinning(true);
    setLastReward('Spinning...');
    setShowWinModal(false);

    // Random slice index selection (0 to 7)
    const prizeIndex = Math.floor(Math.random() * WHEEL_SLICES.length);
    const sliceAngle = 360 / WHEEL_SLICES.length;
    
    // Calculate exact degrees for smooth landing on the chosen slice
    const extraRounds = 360 * 6; // 6 full rotations
    const targetAngle = extraRounds + (360 - (prizeIndex * sliceAngle + sliceAngle / 2));

    setRotation((prev) => prev + targetAngle);

    setTimeout(() => {
      setIsSpinning(false);
      const wonPrize = WHEEL_SLICES[prizeIndex];
      setLastReward(`🎉 You Won: ${wonPrize.label}!`);

      // Add won diamonds to wallet balance
      const currentWhite = localStorage.getItem('arena_white_diamonds');
      const newWhiteBal = (currentWhite ? parseInt(currentWhite, 10) : 24500) + wonPrize.value;
      localStorage.setItem('arena_white_diamonds', newWhiteBal.toString());
      window.dispatchEvent(new Event('storage'));

      // Trigger Celebration Modal Popup
      setCelebrationPrize(wonPrize.label);
      setShowWinModal(true);
    }, 4000);
  };

  return (
    <div className="relative w-full max-w-md mx-auto bg-gray-900 border border-purple-500/40 rounded-2xl p-4 text-white flex flex-col items-center shadow-xl select-none">
      
      {/* 🎉 CELEBRATION WIN POPUP MODAL */}
      {showWinModal && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
          <div className="text-4xl mb-2 animate-bounce">🏆</div>
          <h3 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 uppercase tracking-widest text-center">
            JACKPOT WINNER!
          </h3>
          <div className="my-3 bg-gradient-to-r from-yellow-500/20 via-pink-500/20 to-purple-500/20 border border-yellow-400/50 px-6 py-2.5 rounded-2xl shadow-2xl">
            <p className="text-lg font-black text-yellow-300">{celebrationPrize}</p>
          </div>
          <p className="text-[10px] text-gray-300 text-center mb-4">
            Successfully added to your White Diamonds wallet balance!
          </p>
          <button
            onClick={() => setShowWinModal(false)}
            className="px-6 py-2 bg-gradient-to-r from-yellow-400 to-pink-500 text-black font-black text-xs rounded-xl shadow-lg hover:scale-105 transition-all cursor-pointer uppercase"
          >
            Awesome! Collect
          </button>
        </div>
      )}

      <div className="w-full flex justify-between items-center mb-2">
        <h2 className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500 tracking-wider">
          🎡 LUCKY SPIN WHEEL
        </h2>
        <div className="bg-black/60 border border-yellow-500/40 px-2.5 py-0.5 rounded-xl text-[10px] font-bold text-yellow-400 flex items-center gap-1 shadow">
          🎫 Tokens: <span className="text-white">{spinTokens}</span>
        </div>
      </div>

      {/* Wheel Container with Multi-slice Segments */}
      <div className="relative w-56 h-56 my-3 flex items-center justify-center">
        {/* Top Indicator Pointer */}
        <div className="absolute -top-3 z-30 w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[16px] border-t-yellow-400 drop-shadow-md"></div>

        {/* Outer Glow Ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 p-1 shadow-2xl animate-pulse"></div>

        {/* Spinning Wheel Graphic with Slices */}
        <div
          className="w-full h-full rounded-full relative overflow-hidden border-4 border-yellow-300 shadow-inner bg-gray-950 transition-all ease-out"
          style={{
            transform: `rotate(${rotation}deg)`,
            transitionDuration: isSpinning ? '4s' : '0s',
          }}
        >
          {WHEEL_SLICES.map((slice, index) => {
            const angle = index * (360 / WHEEL_SLICES.length);
            return (
              <div
                key={index}
                className="absolute w-full h-full top-0 left-0 flex items-center justify-center"
                style={{
                  transform: `rotate(${angle}deg)`,
                  clipPath: 'polygon(50% 50%, 35% 0%, 65% 0%)',
                  backgroundColor: slice.color,
                }}
              >
                <span
                  className="absolute text-[10px] font-black text-black tracking-tighter"
                  style={{
                    top: '16%',
                    transform: `rotate(90deg)`,
                  }}
                >
                  {slice.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Center Hub Button */}
        <div className="absolute z-20 w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-500 border-2 border-white shadow-xl flex items-center justify-center">
          <span className="text-[9px] font-black text-black tracking-tighter">SPIN</span>
        </div>
      </div>

      {/* Result Status */}
      <p className="text-xs font-bold text-cyan-300 mb-3 h-5 flex items-center justify-center">
        {lastReward}
      </p>

      {/* Spin Button */}
      <button
        onClick={handleSpin}
        disabled={isSpinning}
        className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg cursor-pointer ${
          isSpinning
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-black hover:opacity-90 active:scale-95'
        }`}
      >
        {isSpinning ? 'Spinning Wheel...' : spinTokens > 0 ? 'SPIN NOW (1 Token)' : 'DEPOSIT TO GET TOKEN'}
      </button>

      <p className="text-[9px] text-gray-400 mt-2 text-center">
        Make a deposit in the Wallet section to earn Spin Tokens!
      </p>
    </div>
  );
}