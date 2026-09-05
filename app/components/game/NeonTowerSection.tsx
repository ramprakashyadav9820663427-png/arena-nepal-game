'use client';
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getWalletBalance, updateWalletBalance } from '@/lib/wallet';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface NeonTowerProps {
  onBackToLobby?: () => void;
}

export default function NeonTowerSection({ onBackToLobby }: NeonTowerProps) {
  const [gameState, setGameState] = useState<'LOBBY' | 'MATCHMAKING' | 'PLAYING' | 'GAMEOVER'>('LOBBY');
  const [stake, setStake] = useState<number>(150); // Default high stake
  const [redDiamonds, setRedDiamonds] = useState<number>(1000);
  
  const [opponentName, setOpponentName] = useState<string>('CyberBot_X');
  const [playerDist, setPlayerDist] = useState<number>(0);
  const [botDist, setBotDist] = useState<number>(0);
  const [matchResult, setMatchResult] = useState<'WIN' | 'LOSS' | null>(null);
  const [prizeWon, setPrizeWon] = useState<number>(0);
  const [obstacleType, setObstacleType] = useState<'JUMP' | 'SLIDE'>('JUMP');
  const [actionMessage, setActionMessage] = useState<string>('GET READY!');

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

  const startMatchmaking = async () => {
    const currentBalance = getWalletBalance();
    if (currentBalance < stake) {
      alert('Not enough Red Diamonds! Top up from wallet.');
      return;
    }

    const newBal = updateWalletBalance(-stake);
    setRedDiamonds(newBal);

    setGameState('MATCHMAKING');
    setPlayerDist(0);
    setBotDist(0);

    const proBots = ['CyberNinja_99', 'NeonViper', 'GlitchMaster', 'ShadowRunner', 'ZeroCool_NP'];
    const selectedBot = proBots[Math.floor(Math.random() * proBots.length)];
    setOpponentName(selectedBot);

    setTimeout(() => {
      setGameState('PLAYING');
      setPlayerDist(0);
      setBotDist(0);
      spawnNewObstacle();
    }, 2000);
  };

  const spawnNewObstacle = () => {
    const types: ('JUMP' | 'SLIDE')[] = ['JUMP', 'SLIDE'];
    const chosen = types[Math.floor(Math.random() * types.length)];
    setObstacleType(chosen);
    setActionMessage(chosen === 'JUMP' ? '⚠️ HIGH LASER! JUMP!' : '⚠️ LOW BARRIER! SLIDE!');
  };

  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const botInterval = setInterval(() => {
      setBotDist((prev) => {
        const next = prev + (Math.random() * 3.5 + 2);
        if (next >= 100) {
          endGame('LOSS');
        }
        return next;
      });
    }, 400);

    return () => clearInterval(botInterval);
  }, [gameState]);

  const handlePlayerAction = (action: 'JUMP' | 'SLIDE') => {
    if (gameState !== 'PLAYING') return;

    if (action === obstacleType) {
      setActionMessage('✨ PERFECT! BOOST!');
      setPlayerDist((prev) => {
        const next = prev + 12;
        if (next >= 100) {
          endGame('WIN');
        } else {
          setTimeout(spawnNewObstacle, 500);
        }
        return next;
      });
    } else {
      setActionMessage('💥 CRASHED! SLOWED DOWN!');
      setPlayerDist((prev) => Math.max(0, prev - 8));
      setTimeout(spawnNewObstacle, 700);
    }
  };

  const endGame = (result: 'WIN' | 'LOSS') => {
    setGameState('GAMEOVER');
    setMatchResult(result);

    if (result === 'WIN') {
      const totalPool = stake * 2;
      const commission = Math.floor(totalPool * 0.15);
      const winnings = totalPool - commission;
      setPrizeWon(winnings);
      const newBal = updateWalletBalance(winnings);
      setRedDiamonds(newBal);
    } else {
      setPrizeWon(0);
    }
  };

  return (
    <div className="w-full max-w-md bg-gray-950 border border-cyan-500/40 rounded-3xl p-4 flex flex-col items-center shadow-2xl relative overflow-hidden select-none mx-auto text-white">
      <div className="w-full flex justify-between items-center mb-3">
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

      {gameState === 'LOBBY' && (
        <div className="w-full flex flex-col items-center py-2 text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-cyan-600 to-blue-800 rounded-2xl flex items-center justify-center text-2xl shadow-lg mb-2 border border-cyan-400/30 animate-pulse">
            ⚡
          </div>
          <h2 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 mb-1 uppercase tracking-wider">
            Neon Cyber Sprint 1v1
          </h2>
          <p className="text-[10px] text-gray-400 mb-3 px-2">
            High-stakes reflex sprint battle! Outrun your opponent to win mega pools.
          </p>

          <div className="w-full bg-gray-900/80 border border-gray-800 rounded-2xl p-2.5 mb-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Select Entry Stake (High Stacks)</span>
            <div className="grid grid-cols-5 gap-1.5">
              {[150, 200, 300, 400, 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setStake(amt)}
                  className={`py-2 px-1 rounded-xl text-[11px] font-black border transition-all cursor-pointer ${
                    stake === amt 
                      ? 'bg-cyan-400 text-black border-cyan-300 shadow-md shadow-cyan-400/20' 
                      : 'bg-gray-800 text-gray-300 border-gray-700'
                  }`}
                >
                  🔴 {amt}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startMatchmaking}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-500 text-black font-black text-xs rounded-2xl shadow-xl shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
          >
            🚀 START SPRINT BATTLE ({stake} 🔴)
          </button>
        </div>
      )}

      {gameState === 'MATCHMAKING' && (
        <div className="w-full h-[340px] flex flex-col items-center justify-center text-center p-4">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4" />
          <h3 className="text-sm font-black text-cyan-400 mb-1">Finding Pro Opponent...</h3>
          <p className="text-[11px] text-gray-400">Locking high-stake lobby & syncing track...</p>
        </div>
      )}

      {gameState === 'PLAYING' && (
        <div className="w-full flex flex-col items-center">
          <div className="w-full bg-black/60 border border-gray-800 p-2.5 rounded-2xl mb-3 flex flex-col gap-2">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-cyan-400">👤 You ({Math.floor(playerDist)}m)</span>
              <span className="text-gray-500 uppercase">Goal: 100m</span>
              <span className="text-pink-400">🤖 {opponentName} ({Math.floor(botDist)}m)</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-cyan-400 w-12">You</span>
              <div className="w-full bg-gray-900 h-2.5 rounded-full overflow-hidden relative flex flex-1">
                <div className="bg-cyan-400 h-full transition-all duration-300 shadow-sm shadow-cyan-400" style={{ width: `${Math.min(100, playerDist)}%` }} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-pink-400 w-12">Opponent</span>
              <div className="w-full bg-gray-900 h-2.5 rounded-full overflow-hidden relative flex flex-1">
                <div className="bg-pink-500 h-full transition-all duration-300 shadow-sm shadow-pink-500" style={{ width: `${Math.min(100, botDist)}%` }} />
              </div>
            </div>
          </div>

          <div className="w-full h-[200px] bg-gradient-to-b from-gray-900 to-black rounded-2xl border border-cyan-500/30 flex flex-col items-center justify-center p-4 text-center relative mb-4">
            <div className="absolute top-3 bg-black/50 px-3 py-1 rounded-full border border-gray-800 text-[10px] font-mono text-yellow-400">
              {actionMessage}
            </div>

            <div className="text-4xl mb-2 animate-bounce">
              {obstacleType === 'JUMP' ? '🚀' : '⚡'}
            </div>
            <p className="text-xs text-gray-300 font-bold">
              {obstacleType === 'JUMP' ? 'Laser Beam Incoming! Tap JUMP!' : 'Low Electric Floor! Tap SLIDE!'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              onClick={() => handlePlayerAction('JUMP')}
              className="py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black text-xs rounded-2xl shadow-lg active:scale-95 cursor-pointer uppercase tracking-wider border border-cyan-300"
            >
              🚀 JUMP
            </button>
            <button
              onClick={() => handlePlayerAction('SLIDE')}
              className="py-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black text-xs rounded-2xl shadow-lg active:scale-95 cursor-pointer uppercase tracking-wider border border-pink-300"
            >
              ⚡ SLIDE
            </button>
          </div>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="w-full h-[340px] flex flex-col items-center justify-center text-center p-4 gap-3">
          <h2 className={`text-lg font-black uppercase tracking-wider ${matchResult === 'WIN' ? 'text-green-400 animate-bounce' : 'text-red-500'}`}>
            {matchResult === 'WIN' ? '🏆 Victory! High Stake Won!' : '💀 Defeated by Opponent!'}
          </h2>
          
          <div className="bg-black/60 border border-gray-800 rounded-2xl p-3 w-full">
            <p className="text-xs text-gray-300 mb-1">Your Distance: <span className="text-cyan-400 font-bold">{Math.floor(playerDist)}m</span></p>
            <p className="text-xs text-gray-300 mb-1">Opponent Distance: <span className="text-pink-400 font-bold">{Math.floor(botDist)}m</span></p>
            {matchResult === 'WIN' && (
              <p className="text-xs text-green-400 font-bold mt-2">Mega Prize Won: +{prizeWon} 🔴 Red Diamonds</p>
            )}
          </div>

          <button 
            onClick={() => setGameState('LOBBY')} 
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black text-xs rounded-xl cursor-pointer uppercase tracking-wider shadow-lg"
          >
            🔄 Play High Stake Again
          </button>
        </div>
      )}
    </div>
  );
}