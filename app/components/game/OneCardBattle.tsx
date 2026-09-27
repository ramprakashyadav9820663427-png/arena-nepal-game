'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getGlobalBalance, updateGlobalBalance } from '@/lib/wallet';
import { supabase } from '@/lib/supabase';

interface OneCardBattleProps {
  onBackToLobby: () => void;
}

const GAME_KEY = 'onecard';

const BET_AMOUNTS = [
  50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
];

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
  const [userChoice, setUserChoice] = useState<'left' | 'right' | 'pair' | null>(
    null
  );
  const [gameState, setGameState] = useState<'betting' | 'dealing' | 'result'>(
    'betting'
  );
  const [timeLeft, setTimeLeft] = useState<number>(10);

  const [leftCard, setLeftCard] = useState<Card | null>(null);
  const [rightCard, setRightCard] = useState<Card | null>(null);
  const [roundWinner, setRoundWinner] = useState<'left' | 'right' | 'pair' | null>(
    null
  );
  const [message, setMessage] = useState<string>(
    'Place your bet on Left, Right or Pair (2.5x)!'
  );
  const [busy, setBusy] = useState(false);

  const balanceRef = useRef(0);
  const userChoiceRef = useRef<'left' | 'right' | 'pair' | null>(null);
  const selectedBetRef = useRef(50);
  const deductDoneRef = useRef(false);
  const battleStartedRef = useRef(false);

  const applyBalance = useCallback((next: number) => {
    const n = Math.max(0, Math.floor(Number(next) || 0));
    balanceRef.current = n;
    setBalance(n);
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
        setBalance(local);
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
        setBalance(local);
        return;
      }
      applyBalance(data.red_diamonds ?? 0);
    } catch {
      const local = getGlobalBalance();
      balanceRef.current = local;
      setBalance(local);
    }
  }, [applyBalance]);

  useEffect(() => {
    userChoiceRef.current = userChoice;
  }, [userChoice]);

  useEffect(() => {
    selectedBetRef.current = selectedBet;
  }, [selectedBet]);

  useEffect(() => {
    void loadBalanceFromServer();
    const handleWalletSync = (e: Event) => {
      const custom = e as CustomEvent;
      let next = getGlobalBalance();
      if (custom?.detail !== undefined) {
        if (typeof custom.detail === 'number') next = custom.detail;
        else if (typeof custom.detail?.balance === 'number')
          next = custom.detail.balance;
        else if (typeof custom.detail?.redDiamonds === 'number')
          next = custom.detail.redDiamonds;
      }
      balanceRef.current = next;
      setBalance(next);
    };
    window.addEventListener('walletUpdated', handleWalletSync);
    window.addEventListener('storage', handleWalletSync);
    return () => {
      window.removeEventListener('walletUpdated', handleWalletSync);
      window.removeEventListener('storage', handleWalletSync);
    };
  }, [loadBalanceFromServer]);

  const playTickSound = (isLoud: boolean) => {
    try {
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isLoud ? 1200 : 800, ctx.currentTime);
      gain.gain.setValueAtTime(isLoud ? 0.35 : 0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // optional
    }
  };

  const getRandomCard = (): Card => {
    const vIndex = Math.floor(Math.random() * VALUES.length);
    const sIndex = Math.floor(Math.random() * SUITS.length);
    return {
      value: VALUES[vIndex],
      suit: SUITS[sIndex],
      numericVal: vIndex + 2,
    };
  };

  const startBattle = useCallback(async () => {
    if (battleStartedRef.current) return;
    battleStartedRef.current = true;

    setGameState('dealing');

    const cardL = getRandomCard();
    const cardR = getRandomCard();
    setLeftCard(cardL);
    setRightCard(cardR);

    let winner: 'left' | 'right' | 'pair' = 'pair';
    if (cardL.numericVal > cardR.numericVal) winner = 'left';
    else if (cardR.numericVal > cardL.numericVal) winner = 'right';
    else winner = 'pair';
    setRoundWinner(winner);

    const choice = userChoiceRef.current;
    const stake = selectedBetRef.current;

    if (choice && deductDoneRef.current) {
      if (choice === winner) {
        const mult = winner === 'pair' ? 2.5 : 1.9;
        const winnings = Math.floor(stake * mult);
        try {
          const { data, error } = await supabase.rpc('game_credit_red', {
            p_amount: winnings,
            p_game_key: GAME_KEY,
          });
          if (error) throw error;
          applyBalance(
            typeof data === 'number' ? data : balanceRef.current + winnings
          );
          setMessage(
            winner === 'pair'
              ? `🎉 Pair Hit! You Won +${winnings} Red Diamonds (2.5x)!`
              : `🎉 You Won! +${winnings} Red Diamonds!`
          );
        } catch (err) {
          console.error('onecard credit failed', err);
          setMessage(`🎉 You won +${winnings} — refreshing wallet...`);
          void loadBalanceFromServer();
        }
      } else {
        setMessage(`❌ You Lost this round! Winner was ${winner.toUpperCase()}`);
      }
    } else {
      setMessage(`Round ended! Winner: ${winner.toUpperCase()}`);
    }

    setGameState('result');
    setTimeout(() => resetRound(), 4000);
  }, [applyBalance, loadBalanceFromServer]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (gameState === 'betting') {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            void startBattle();
            return 0;
          }
          playTickSound(prev <= 4);
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, startBattle]);

  const handlePlaceBet = async (choice: 'left' | 'right' | 'pair') => {
    if (gameState !== 'betting' || busy || userChoice !== null) return;
    if (timeLeft <= 3) {
      alert('⚠️ Betting is locked for this round!');
      return;
    }
    if (balanceRef.current < selectedBet) {
      alert('⚠️ Not enough Red Diamonds in your wallet!');
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('game_deduct_red', {
        p_amount: selectedBet,
        p_game_key: GAME_KEY,
      });
      if (error) throw error;
      applyBalance(
        typeof data === 'number' ? data : balanceRef.current - selectedBet
      );
      deductDoneRef.current = true;
      setUserChoice(choice);
      userChoiceRef.current = choice;
      setMessage(`Bet placed on ${choice.toUpperCase()}! Waiting for result...`);
    } catch (err) {
      console.error('onecard deduct failed', err);
      alert('Bet failed. Check balance or try again.');
      void loadBalanceFromServer();
    } finally {
      setBusy(false);
    }
  };

  const resetRound = () => {
    setLeftCard(null);
    setRightCard(null);
    setUserChoice(null);
    userChoiceRef.current = null;
    setRoundWinner(null);
    setTimeLeft(10);
    deductDoneRef.current = false;
    battleStartedRef.current = false;
    setGameState('betting');
    setMessage('Place your bet on Left, Right or Pair (2.5x)!');
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center min-h-[85vh] p-4 text-white select-none">
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
        <div className="flex items-center gap-1.5 bg-red-950/60 border border-red-500/40 px-3 py-1 rounded-xl">
          <span className="text-xs">🔴</span>
          <span className="text-xs font-black text-red-400">
            {balance.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="w-full bg-gradient-to-r from-gray-900 via-red-950/40 to-gray-900 border border-red-500/30 py-2.5 px-4 rounded-2xl flex items-center justify-between mb-4 shadow-md">
        <p className="text-xs font-bold text-gray-300 truncate">{message}</p>
        {gameState === 'betting' && (
          <div className="flex items-center gap-1 bg-red-600/20 border border-red-500/50 px-2.5 py-1 rounded-xl">
            <span className="text-[10px] text-red-400 font-bold">
              {timeLeft <= 3 ? '🔒 LOCKED:' : 'Time:'}
            </span>
            <span
              className={`text-xs font-black ${
                timeLeft <= 3 ? 'text-red-500 animate-ping' : 'text-yellow-400'
              }`}
            >
              {timeLeft}s
            </span>
          </div>
        )}
      </div>

      <div className="w-full grid grid-cols-2 gap-4 mb-4">
        <div
          className={`relative h-44 rounded-3xl border-2 flex flex-col items-center justify-center transition-all shadow-xl overflow-hidden ${
            userChoice === 'left'
              ? 'border-yellow-400 bg-yellow-500/10 shadow-yellow-500/20'
              : 'border-red-500/40 bg-gray-900/80'
          }`}
        >
          <div className="absolute top-2 left-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Left Side {userChoice === 'left' && '👉 (You)'}
          </div>
          {leftCard ? (
            <div
              className={`w-20 h-28 bg-white rounded-2xl shadow-2xl flex flex-col justify-between p-3 text-black font-black transform transition-all ${
                ['♥', '♦'].includes(leftCard.suit) ? 'text-red-600' : 'text-black'
              }`}
            >
              <div className="text-sm leading-none">{leftCard.value}</div>
              <div className="text-3xl text-center self-center">{leftCard.suit}</div>
              <div className="text-sm leading-none self-end rotate-180">
                {leftCard.value}
              </div>
            </div>
          ) : (
            <div className="text-3xl opacity-30 animate-pulse">🎴</div>
          )}
          {roundWinner === 'left' && (
            <div className="absolute inset-0 bg-green-500/20 border-2 border-green-500 rounded-3xl flex items-center justify-center">
              <span className="text-xs font-black bg-green-500 text-black px-3 py-1 rounded-full shadow-lg">
                WINNER 🏆
              </span>
            </div>
          )}
        </div>

        <div
          className={`relative h-44 rounded-3xl border-2 flex flex-col items-center justify-center transition-all shadow-xl overflow-hidden ${
            userChoice === 'right'
              ? 'border-yellow-400 bg-yellow-500/10 shadow-yellow-500/20'
              : 'border-red-500/40 bg-gray-900/80'
          }`}
        >
          <div className="absolute top-2 right-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {userChoice === 'right' && '(You) 👈'} Right Side
          </div>
          {rightCard ? (
            <div
              className={`w-20 h-28 bg-white rounded-2xl shadow-2xl flex flex-col justify-between p-3 text-black font-black transform transition-all ${
                ['♥', '♦'].includes(rightCard.suit)
                  ? 'text-red-600'
                  : 'text-black'
              }`}
            >
              <div className="text-sm leading-none">{rightCard.value}</div>
              <div className="text-3xl text-center self-center">{rightCard.suit}</div>
              <div className="text-sm leading-none self-end rotate-180">
                {rightCard.value}
              </div>
            </div>
          ) : (
            <div className="text-3xl opacity-30 animate-pulse">🎴</div>
          )}
          {roundWinner === 'right' && (
            <div className="absolute inset-0 bg-green-500/20 border-2 border-green-500 rounded-3xl flex items-center justify-center">
              <span className="text-xs font-black bg-green-500 text-black px-3 py-1 rounded-full shadow-lg">
                WINNER 🏆
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="w-full bg-gray-900/90 border border-gray-800 p-3 rounded-2xl mb-4 shadow-lg">
        <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider text-center">
          Select Bet Amount (Red Diamonds)
        </p>
        <div className="grid grid-cols-6 gap-1.5">
          {BET_AMOUNTS.map((amt) => (
            <button
              key={amt}
              disabled={gameState !== 'betting' || userChoice !== null}
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

      <div className="w-full grid grid-cols-3 gap-2">
        <button
          disabled={
            gameState !== 'betting' ||
            userChoice !== null ||
            timeLeft <= 3 ||
            busy
          }
          onClick={() => void handlePlaceBet('left')}
          className={`py-3 px-1 rounded-2xl font-black text-[11px] uppercase tracking-wider shadow-xl transition-all flex flex-col items-center justify-center ${
            userChoice === 'left'
              ? 'bg-yellow-400 text-black ring-4 ring-yellow-400/50'
              : gameState === 'betting' && timeLeft > 3
                ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white hover:scale-102 cursor-pointer'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span>{userChoice === 'left' ? 'Locked' : 'Left'}</span>
          <span className="text-[9px] text-red-200 mt-0.5">
            ({selectedBet} 🔴)
          </span>
        </button>

        <button
          disabled={
            gameState !== 'betting' ||
            userChoice !== null ||
            timeLeft <= 3 ||
            busy
          }
          onClick={() => void handlePlaceBet('pair')}
          className={`py-3 px-1 rounded-2xl font-black text-[11px] uppercase tracking-wider shadow-xl transition-all flex flex-col items-center justify-center border ${
            userChoice === 'pair'
              ? 'bg-yellow-400 text-black border-white ring-4 ring-yellow-400/50'
              : gameState === 'betting' && timeLeft > 3
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black border-yellow-300 hover:scale-102 cursor-pointer'
                : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
          }`}
        >
          <span className="font-extrabold">
            {userChoice === 'pair' ? 'Locked' : 'Pair (2.5x)'}
          </span>
          <span className="text-[9px] opacity-80 font-bold mt-0.5">
            ({selectedBet} 🔴)
          </span>
        </button>

        <button
          disabled={
            gameState !== 'betting' ||
            userChoice !== null ||
            timeLeft <= 3 ||
            busy
          }
          onClick={() => void handlePlaceBet('right')}
          className={`py-3 px-1 rounded-2xl font-black text-[11px] uppercase tracking-wider shadow-xl transition-all flex flex-col items-center justify-center ${
            userChoice === 'right'
              ? 'bg-yellow-400 text-black ring-4 ring-yellow-400/50'
              : gameState === 'betting' && timeLeft > 3
                ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:scale-102 cursor-pointer'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span>{userChoice === 'right' ? 'Locked' : 'Right'}</span>
          <span className="text-[9px] text-blue-200 mt-0.5">
            ({selectedBet} 🔴)
          </span>
        </button>
      </div>
    </div>
  );
}