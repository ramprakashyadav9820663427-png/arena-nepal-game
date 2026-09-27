'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  getGlobalBalance,
  updateGlobalBalance,
} from '@/lib/wallet';
import { supabase } from '@/lib/supabase';

type SymbolId =
  | 'club'
  | 'crown'
  | 'spade'
  | 'diamond'
  | 'flag'
  | 'heart';

type GamePhase = 'betting' | 'shaking' | 'result';

type SymbolInfo = {
  id: SymbolId;
  name: string;
  short: string;
  color: string;
  svgIcon: React.ReactNode;
};

const GAME_KEY = 'jhandimunda';

const SYMBOLS: SymbolInfo[] = [
  {
    id: 'club',
    name: 'चिड़ी',
    short: 'CHID',
    color: '#171717',
    svgIcon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
        <path d="M12 2c-2.2 0-4 1.8-4 4 0 1.5.8 2.8 2 3.5-1.7.9-3 2.7-3 4.8 0 2.8 2.2 5 5 5s5-2.2 5-5c0-2.1-1.3-3.9-3-4.8 1.2-.7 2-2 2-3.5 0-2.2-1.8-4-4-4zm0 15c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3zm-2 2h4v3h-4v-3z" />
      </svg>
    ),
  },
  {
    id: 'crown',
    name: 'ताज',
    short: 'TAJ',
    color: '#d97706',
    svgIcon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5m14 3a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-1h14v1Z" />
      </svg>
    ),
  },
  {
    id: 'spade',
    name: 'हुकुम',
    short: 'HUKUM',
    color: '#171717',
    svgIcon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
        <path d="M12 2c-3.5 3.5-8 7.5-8 11.5 0 2.5 2 4.5 4.5 4.5 1.5 0 2.9-.8 3.5-2 .6 1.2 2 2 3.5 2 2.5 0 4.5-2 4.5-4.5C20 9.5 15.5 5.5 12 2zm0 16c-1.1 0-2-.9-2-2 0-.8.5-1.5 1.2-1.8l.8-1.7.8 1.7c.7.3 1.2 1 1.2 1.8 0 1.1-.9 2-2 2zm-1 3h2v2h-2v-2z" />
      </svg>
    ),
  },
  {
    id: 'diamond',
    name: 'ईंट',
    short: 'EENT',
    color: '#dc2626',
    svgIcon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
        <path d="M12 2L2 12l10 10 10-10L12 2z" />
      </svg>
    ),
  },
  {
    id: 'flag',
    name: 'झंडी',
    short: 'JHANDI',
    color: '#2563eb',
    svgIcon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
        <path d="M6 2h2v20H6V2m3 2l11 6-11 6V4z" />
      </svg>
    ),
  },
  {
    id: 'heart',
    name: 'पान',
    short: 'PAAN',
    color: '#dc2626',
    svgIcon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    ),
  },
];

const DENOMINATIONS = [20, 50, 100, 200, 500, 1000, 5000];

const ROUND_SECONDS = 15;
const LOCK_AT_SECONDS = 3;
const SHAKE_SECONDS = 3;
const RESULT_SECONDS = 5;

const EMPTY_BETS: Record<SymbolId, number> = {
  club: 0,
  crown: 0,
  spade: 0,
  diamond: 0,
  flag: 0,
  heart: 0,
};

const formatNumber = (value: number) =>
  Math.max(0, Math.floor(value)).toLocaleString('en-IN');

const randomSymbol = (): SymbolId =>
  SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].id;

function countSymbols(dice: SymbolId[]) {
  const counts = { ...EMPTY_BETS };
  for (const die of dice) {
    counts[die] += 1;
  }
  return counts;
}

function DiamondAmount({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-black">
      <span className="text-red-400">♦</span>
      {formatNumber(value)}
    </span>
  );
}

export default function JhandiMundaGame() {
  const [balance, setBalance] = useState(0);
  const [round, setRound] = useState(243);
  const [phase, setPhase] = useState<GamePhase>('betting');
  const [timer, setTimer] = useState(ROUND_SECONDS);
  const [shakeTimer, setShakeTimer] = useState(SHAKE_SECONDS);

  const [selectedAmount, setSelectedAmount] = useState(100);
  const [bets, setBets] =
    useState<Record<SymbolId, number>>({ ...EMPTY_BETS });

  const [dice, setDice] = useState<SymbolId[]>([]);
  const [rollingDice, setRollingDice] = useState<SymbolId[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [winPopupData, setWinPopupData] = useState<{
    totalWon: number;
    breakdown: { name: string; count: number; color: string }[];
  } | null>(null);

  const audioRef = useRef<AudioContext | null>(null);
  const betsRef = useRef(bets);
  const soundRef = useRef(true);
  const balanceRef = useRef(0);
  const roundStartedRef = useRef(false);
  const resultProcessedRef = useRef(false);
  const historyRef = useRef<{ symbol: SymbolId; amount: number }[]>([]);

  const totalBet = Object.values(bets).reduce((sum, value) => sum + value, 0);

  const counts = countSymbols(dice);
  const isChhakka =
    dice.length === 6 &&
    SYMBOLS.every((symbol) => counts[symbol.id] === 1);

  useEffect(() => {
    betsRef.current = bets;
  }, [bets]);

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

  const deductRed = async (amount: number): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('game_deduct_red', {
        p_amount: amount,
        p_game_key: GAME_KEY,
      });
      if (error) throw error;
      applyBalance(typeof data === 'number' ? data : balanceRef.current - amount);
      return true;
    } catch (err) {
      console.error('jhandi deduct failed', err);
      void loadBalanceFromServer();
      return false;
    }
  };

  const creditRed = async (amount: number): Promise<boolean> => {
    if (amount <= 0) return true;
    try {
      const { data, error } = await supabase.rpc('game_credit_red', {
        p_amount: amount,
        p_game_key: GAME_KEY,
      });
      if (error) throw error;
      applyBalance(typeof data === 'number' ? data : balanceRef.current + amount);
      return true;
    } catch (err) {
      console.error('jhandi credit failed', err);
      void loadBalanceFromServer();
      return false;
    }
  };

  const getAudioContext = () => {
    if (typeof window === 'undefined') return null;
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

    if (!AudioContextClass) return null;
    if (!audioRef.current) {
      audioRef.current = new AudioContextClass();
    }
    if (audioRef.current.state === 'suspended') {
      void audioRef.current.resume();
    }
    return audioRef.current;
  };

  const playTone = (
    frequency: number,
    duration = 0.1,
    type: OscillatorType = 'sine',
    volume = 0.04,
    delay = 0
  ) => {
    if (!soundRef.current) return;
    try {
      const context = getAudioContext();
      if (!context) return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + delay;

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.0002, volume),
        start + 0.01
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    } catch (error) {
      console.warn('Sound playback unavailable:', error);
    }
  };

  const playTick = (urgent = false) => {
    playTone(
      urgent ? 1150 : 780,
      urgent ? 0.15 : 0.08,
      urgent ? 'square' : 'sine',
      urgent ? 0.075 : 0.035
    );
  };

  const playBetSound = () => {
    playTone(620, 0.07, 'triangle', 0.045);
    playTone(920, 0.1, 'sine', 0.04, 0.06);
  };

  const playDiceSound = () => {
    playTone(180, 0.18, 'triangle', 0.06);
    playTone(260, 0.15, 'square', 0.035, 0.12);
    playTone(140, 0.2, 'triangle', 0.055, 0.25);
    playTone(320, 0.12, 'triangle', 0.035, 0.4);
  };

  const playResultSound = (won: boolean) => {
    if (won) {
      playTone(523, 0.18, 'sine', 0.05);
      playTone(659, 0.18, 'sine', 0.05, 0.15);
      playTone(784, 0.25, 'sine', 0.05, 0.3);
    } else {
      playTone(330, 0.18, 'triangle', 0.035);
      playTone(240, 0.25, 'triangle', 0.035, 0.18);
    }
  };

  useEffect(() => {
    void loadBalanceFromServer();

    const syncBalance = (event: Event) => {
      const custom = event as CustomEvent;
      let next = getGlobalBalance();

      if (custom?.detail) {
        if (typeof custom.detail === 'number') {
          next = custom.detail;
        } else if (typeof custom.detail?.balance === 'number') {
          next = custom.detail.balance;
        } else if (typeof custom.detail?.redDiamonds === 'number') {
          next = custom.detail.redDiamonds;
        }
      }

      balanceRef.current = next;
      setBalance(next);
    };

    window.addEventListener('walletUpdated', syncBalance);
    window.addEventListener('storage', syncBalance);

    return () => {
      window.removeEventListener('walletUpdated', syncBalance);
      window.removeEventListener('storage', syncBalance);

      if (audioRef.current) {
        void audioRef.current.close();
      }
    };
  }, [loadBalanceFromServer]);

  useEffect(() => {
    if (phase !== 'betting') return;
    const interval = window.setInterval(() => {
      setTimer((current) => {
        if (current <= 0) return 0;
        const next = current - 1;
        playTick(next <= LOCK_AT_SECONDS);
        return next;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'betting' || timer > LOCK_AT_SECONDS) return;
    if (roundStartedRef.current) return;

    roundStartedRef.current = true;
    setPhase('shaking');
    setShakeTimer(SHAKE_SECONDS);
    setMessage('बेटिंग बंद · डोल हिल रहा है');

    playDiceSound();
  }, [phase, timer]);

  useEffect(() => {
    if (phase !== 'shaking') return;
    const interval = window.setInterval(() => {
      setShakeTimer((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'shaking') return;

    let animationInterval: number | undefined;

    const startAnimation = window.setTimeout(() => {
      animationInterval = window.setInterval(() => {
        setRollingDice(Array.from({ length: 6 }, () => randomSymbol()));
        playTone(160 + Math.random() * 180, 0.07, 'triangle', 0.025);
      }, 200);
    }, 0);

    const stopAnimation = window.setTimeout(() => {
      if (animationInterval !== undefined) {
        window.clearInterval(animationInterval);
      }

      const finalDice = Array.from({ length: 6 }, () => randomSymbol());

      setDice(finalDice);
      setRollingDice(finalDice);

      const resultCounts = countSymbols(finalDice);
      const chhakka = SYMBOLS.every(
        (symbol) => resultCounts[symbol.id] === 1
      );

      const currentBets = betsRef.current;
      const currentTotal = Object.values(currentBets).reduce(
        (sum, amount) => sum + amount,
        0
      );

      let payout = 0;
      const winBreakdown: { name: string; count: number; color: string }[] = [];

      if (!chhakka) {
        SYMBOLS.forEach((symbol) => {
          const matchedCount = resultCounts[symbol.id];
          if (matchedCount >= 2 && currentBets[symbol.id] > 0) {
            payout +=
              currentBets[symbol.id] * matchedCount + currentBets[symbol.id];
            winBreakdown.push({
              name: symbol.name,
              count: matchedCount,
              color: symbol.color,
            });
          }
        });
      }

      const resultMessage = SYMBOLS.filter(
        (symbol) => resultCounts[symbol.id] > 0
      )
        .map((symbol) => `${resultCounts[symbol.id]} ${symbol.name}`)
        .join(' · ');

      if (currentTotal === 0) {
        setMessage(`नतीजा: ${resultMessage} · कोई बेट नहीं लगी थी`);
      } else if (chhakka) {
        setMessage(`छक्का! सभी सिंबल अलग हैं · सभी बेट हार गए`);
      } else if (payout > 0) {
        setMessage(`जीत: ${resultMessage} · +♦ ${formatNumber(payout)}`);
        setWinPopupData({
          totalWon: payout,
          breakdown: winBreakdown,
        });
      } else {
        setMessage(
          `नतीजा: ${resultMessage} · 1 या कम मैच होने पर बेट हार गए`
        );
      }

      if (!resultProcessedRef.current && payout > 0) {
        resultProcessedRef.current = true;
        void creditRed(Math.floor(payout));
      }

      playResultSound(payout > 0);
      setPhase('result');
    }, SHAKE_SECONDS * 1000);

    return () => {
      window.clearTimeout(startAnimation);
      window.clearTimeout(stopAnimation);
      if (animationInterval !== undefined) {
        window.clearInterval(animationInterval);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== 'result') return;
    const timeout = window.setTimeout(() => {
      nextRound();
    }, RESULT_SECONDS * 1000);
    return () => window.clearTimeout(timeout);
  }, [phase]);

  const bettingLocked =
    phase !== 'betting' || timer <= LOCK_AT_SECONDS || busy;

  const placeBet = async (symbol: SymbolId) => {
    try {
      getAudioContext();
    } catch {
      // ignore
    }

    if (bettingLocked) return;

    if (selectedAmount > balanceRef.current) {
      setMessage('पर्याप्त Red Diamonds नहीं हैं');
      playTone(180, 0.2, 'square', 0.05);
      return;
    }

    setBusy(true);
    const ok = await deductRed(selectedAmount);
    setBusy(false);

    if (!ok) {
      setMessage('बेट फेल · Red Diamonds चेक करें');
      playTone(180, 0.2, 'square', 0.05);
      return;
    }

    const nextBets = {
      ...betsRef.current,
      [symbol]: betsRef.current[symbol] + selectedAmount,
    };

    betsRef.current = nextBets;
    setBets(nextBets);

    historyRef.current.push({
      symbol,
      amount: selectedAmount,
    });

    setMessage(
      `${formatNumber(selectedAmount)} ♦ · ${symbol.toUpperCase()} पर लगाया गया`
    );
    playBetSound();
  };

  const undoBet = async () => {
    if (bettingLocked) return;
    const last = historyRef.current.pop();
    if (!last) return;

    setBusy(true);
    const ok = await creditRed(last.amount);
    setBusy(false);

    if (!ok) {
      historyRef.current.push(last);
      setMessage('Undo फेल · फिर कोशिश करें');
      return;
    }

    const nextBets = {
      ...betsRef.current,
      [last.symbol]: Math.max(0, betsRef.current[last.symbol] - last.amount),
    };

    betsRef.current = nextBets;
    setBets(nextBets);

    setMessage('आखिरी बेट हटाई गई और पैसे वापस किए गए');
    playTone(400, 0.08, 'triangle');
  };

  const clearBets = async () => {
    if (bettingLocked) return;

    const totalCurrentBets = Object.values(betsRef.current).reduce(
      (a, b) => a + b,
      0
    );
    if (totalCurrentBets > 0) {
      setBusy(true);
      const ok = await creditRed(totalCurrentBets);
      setBusy(false);
      if (!ok) {
        setMessage('Clear फेल · फिर कोशिश करें');
        return;
      }
    }

    const empty = { ...EMPTY_BETS };
    betsRef.current = empty;
    setBets(empty);
    historyRef.current = [];

    setMessage('सभी बेट हटाई गईं');
    playTone(350, 0.1, 'triangle');
  };

  function nextRound() {
    setRound((current) => current + 1);
    const empty = { ...EMPTY_BETS };
    betsRef.current = empty;
    setBets(empty);
    historyRef.current = [];

    roundStartedRef.current = false;
    resultProcessedRef.current = false;

    setDice([]);
    setRollingDice([]);
    setMessage('');
    setWinPopupData(null);

    setTimer(ROUND_SECONDS);
    setShakeTimer(SHAKE_SECONDS);
    setPhase('betting');
  }

  const currentDice = phase === 'shaking' ? rollingDice : dice;

  return (
    <main className="jm-game">
      <style jsx>{`
        .jm-game {
          --gold: #facc15;
          min-height: 100vh;
          width: 100%;
          max-width: 520px;
          margin: 0 auto;
          padding: 10px;
          color: #fff;
          overflow: hidden;
          border-radius: 20px;
          font-family: Arial, sans-serif;
          background:
            radial-gradient(ellipse at 50% 0%, #791c29 0%, transparent 45%),
            linear-gradient(160deg, #21090e 0%, #09070a 72%);
        }

        .jm-panel {
          background: linear-gradient(145deg, #271c20, #100d11);
          border: 1px solid #8d642b;
          border-radius: 15px;
          box-shadow: 0 6px 18px #0008, inset 0 1px #ffffff0d;
        }

        .jm-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px;
        }

        .jm-title {
          font-size: 14px;
          color: #ffe17b;
          font-weight: 1000;
          letter-spacing: 1px;
        }

        .jm-muted {
          font-size: 10px;
          color: #b7a9ac;
        }

        .jm-timer {
          margin-top: 10px;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .jm-timer-number {
          font-size: 28px;
          line-height: 1;
          font-weight: 1000;
          color: #ffe16c;
          font-variant-numeric: tabular-nums;
        }

        .jm-warning {
          color: #ff5353;
          text-shadow: 0 0 14px #ff3030aa;
          animation: jm-alert .35s ease-in-out infinite alternate;
        }

        .jm-symbol-strip {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 5px;
          margin: 10px 0;
        }

        .jm-symbol-count {
          text-align: center;
          padding: 7px 2px;
          border-radius: 10px;
          background: linear-gradient(145deg, #302329, #100c10);
          border: 1px solid #6b4b2b;
        }

        .jm-symbol-count-icon {
          width: 20px;
          height: 20px;
          margin: 0 auto;
        }

        .jm-symbol-count-number {
          margin-top: 4px;
          color: #ffdc68;
          font-weight: 900;
          font-size: 12px;
        }

        .jm-table {
          position: relative;
          min-height: 350px;
          padding: 16px 10px 20px;
          overflow: hidden;
          background:
            radial-gradient(
              ellipse at center,
              #28553b 0%,
              #123624 60%,
              #071d14 100%
            );
          border: 5px solid #58331d;
          border-radius: 22px;
          box-shadow:
            inset 0 0 0 2px #b17b3c,
            inset 0 0 30px #0009,
            0 9px 22px #0009;
        }

        .jm-table::before {
          content: '';
          position: absolute;
          inset: 8px;
          border: 1px solid #d4a45b88;
          border-radius: 14px;
          pointer-events: none;
        }

        .jm-table-label {
          position: relative;
          z-index: 5;
          text-align: center;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 2px;
          color: #ffe08a;
          text-shadow: 0 2px 5px #000;
          margin-bottom: 20px;
        }

        .jm-dice-grid {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px 12px;
          justify-items: center;
          align-items: center;
          padding: 10px 4px 20px;
        }

        .jm-card-item {
          width: 75px;
          height: 90px;
          background: linear-gradient(145deg, #ffffff, #e2e8f0);
          border: 2px solid #b17b3c;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 15px rgba(0,0,0,0.5);
          transition: transform 0.2s ease;
        }

        .jm-card-svg {
          width: 38px;
          height: 38px;
        }

        .jm-card-name {
          font-size: 10px;
          font-weight: bold;
          color: #1e293b;
          margin-top: 6px;
        }

        .jm-cup-stage {
          position: absolute;
          z-index: 8;
          inset: 48px 0 0;
          display: flex;
          justify-content: center;
          align-items: center;
          pointer-events: none;
        }

        .jm-cup {
          position: relative;
          width: 230px;
          height: 185px;
          filter: drop-shadow(0 17px 13px #0009);
        }

        .jm-cup-body {
          position: absolute;
          left: 16px;
          right: 16px;
          top: 20px;
          bottom: 0;
          border-radius: 24px 24px 48px 48px;
          background: linear-gradient(90deg, #63330e 0%, #e6a33c 14%, #ffd77c 30%, #a95c17 54%, #f5c15a 78%, #63300e 100%);
          border: 3px solid #6c3b12;
        }

        .jm-cup-rim {
          position: absolute;
          z-index: 2;
          left: 3px;
          right: 3px;
          top: 9px;
          height: 32px;
          border-radius: 50%;
          border: 5px solid #7b4617;
          background: linear-gradient(180deg, #ffe39b, #b66b1c);
        }

        .jm-cup-top {
          position: absolute;
          z-index: 3;
          left: 17px;
          right: 17px;
          top: -2px;
          height: 31px;
          border-radius: 50%;
          border: 3px solid #6c3b12;
          background: radial-gradient(ellipse at 35% 25%, #fff0b4, #d99531 50%, #78400f 100%);
        }

        .jm-cup-emblem {
          position: absolute;
          z-index: 4;
          top: 68px;
          left: 0;
          right: 0;
          text-align: center;
          color: #fff0b2;
          font-weight: 1000;
          font-size: 23px;
          letter-spacing: 3px;
          text-shadow: 0 3px 3px #542808;
        }

        .jm-cup-shaking {
          animation: jm-cup-shake .25s linear infinite;
        }

        @keyframes jm-cup-shake {
          0% { transform: translate(0, 0) rotate(-2deg); }
          25% { transform: translate(-9px, 2px) rotate(3deg); }
          50% { transform: translate(8px, -3px) rotate(-3deg); }
          75% { transform: translate(-5px, 3px) rotate(2deg); }
          100% { transform: translate(0, 0) rotate(-2deg); }
        }

        .jm-win-popup {
          position: absolute;
          z-index: 20;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.78);
          animation: jm-fade-in 0.3s ease-out;
        }

        .jm-win-box {
          background: linear-gradient(145deg, #422006, #1c0d02);
          border: 3px solid #ffd700;
          border-radius: 20px;
          padding: 16px 24px;
          text-align: center;
          width: 85%;
          max-width: 320px;
          box-shadow: 0 0 30px #ffcc0088;
          animation: jm-pop-scale 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .jm-win-title {
          font-size: 22px;
          font-weight: 1000;
          color: #facc15;
          text-shadow: 0 2px 4px #000;
          letter-spacing: 1px;
        }

        .jm-win-breakdown {
          margin: 10px 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
          background: rgba(0, 0, 0, 0.4);
          padding: 8px;
          border-radius: 10px;
          border: 1px solid #8d642b;
        }

        .jm-breakdown-row {
          font-size: 12px;
          font-weight: bold;
          color: #fff;
          display: flex;
          justify-content: space-between;
          padding: 2px 6px;
        }

        .jm-win-amount {
          font-size: 18px;
          font-weight: 900;
          color: #4ade80;
          margin-top: 6px;
          text-shadow: 0 2px 4px #000;
        }

        @keyframes jm-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes jm-pop-scale {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        .jm-bet-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-top: 12px;
        }

        .jm-bet-card {
          position: relative;
          min-height: 105px;
          padding: 9px 4px;
          color: white;
          border: 1px solid #987038;
          border-radius: 13px;
          background: linear-gradient(145deg, #34282d, #141116);
          cursor: pointer;
        }

        .jm-bet-card.selected {
          border: 2px solid #ffdb61;
          box-shadow: 0 0 17px #ffcf4555;
        }

        .jm-bet-symbol {
          display: grid;
          place-items: center;
          min-height: 39px;
          width: 36px;
          margin: 0 auto;
        }

        .jm-bet-name {
          font-size: 10px;
          font-weight: 1000;
          margin-top: 5px;
          text-align: center;
        }

        .jm-bet-amount {
          color: #ffe16c;
          font-size: 10px;
          margin-top: 5px;
          font-weight: 900;
          text-align: center;
        }

        .jm-badge-win {
          position: absolute;
          top: 5px;
          right: 5px;
          background: #16a34a;
          color: #fff;
          font-size: 10px;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .jm-badge-loss {
          position: absolute;
          top: 5px;
          right: 5px;
          background: #dc2626;
          color: #fff;
          font-size: 10px;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .jm-denominations {
          padding: 12px;
          margin-top: 10px;
        }

        .jm-denom-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 7px;
          margin-top: 9px;
        }

        .jm-denom {
          padding: 10px 2px;
          border-radius: 9px;
          border: 1px solid #66505a;
          background: linear-gradient(145deg, #30272d, #141116);
          color: #fff;
          font-size: 11px;
          font-weight: 1000;
          cursor: pointer;
        }

        .jm-denom.active {
          background: linear-gradient(180deg, #ffe88d, #d28b1c);
          border-color: #fff0a5;
          color: #2a1506;
        }

        .jm-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 10px;
        }

        .jm-control {
          padding: 12px 4px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 1000;
          color: #fff;
          border: 1px solid #785c3b;
          background: linear-gradient(145deg, #30242a, #120e12);
          cursor: pointer;
        }

        .jm-message {
          padding: 12px;
          margin-top: 10px;
          text-align: center;
          font-size: 12px;
          font-weight: 900;
          color: #ffe28b;
          border: 1px solid #987038;
          border-radius: 12px;
          background: #170f13;
        }
      `}</style>

      <header className="jm-panel jm-header">
        <div>
          <div className="jm-title">JHANDI MUNDA</div>
          <div className="jm-muted">ROUND #{round}</div>
        </div>

        <div className="text-right">
          <div className="jm-muted">WALLET</div>
          <div className="text-sm font-black text-amber-300">
            <DiamondAmount value={balance} />
          </div>
        </div>
      </header>

      <div className="jm-panel jm-timer">
        <div>
          <div className="jm-muted">
            {phase === 'betting' &&
              (timer <= LOCK_AT_SECONDS
                ? 'बेटिंग लॉक हो रही है'
                : 'बेटिंग चालू है')}
            {phase === 'shaking' && 'डोल हिल रहा है'}
            {phase === 'result' &&
              (isChhakka ? 'छक्का! (All Unique)' : 'नतीजा घोषित (5s)')}
          </div>
          <div
            className={`jm-timer-number ${
              timer <= LOCK_AT_SECONDS && phase === 'betting'
                ? 'jm-warning'
                : ''
            }`}
          >
            {phase === 'betting'
              ? `${timer}s`
              : phase === 'shaking'
                ? `${shakeTimer}s`
                : 'OK'}
          </div>
        </div>

        <div className="text-right">
          <div className="jm-muted">कुल बेट</div>
          <div className="text-sm font-black text-amber-300">
            <DiamondAmount value={totalBet} />
          </div>
        </div>
      </div>

      <div className="jm-symbol-strip">
        {SYMBOLS.map((sym) => (
          <div key={sym.id} className="jm-symbol-count">
            <div className="jm-symbol-count-icon" style={{ color: sym.color }}>
              {sym.svgIcon}
            </div>
            <div className="jm-symbol-count-number">
              {dice.length === 6 ? counts[sym.id] : '-'}
            </div>
          </div>
        ))}
      </div>

      <div className="jm-table">
        <div className="jm-table-label">ARENA NEPAL · JHANDI MUNDA TABLE</div>

        <div className="jm-dice-grid">
          {currentDice.slice(0, 6).map((symbolId, index) => {
            const sym = SYMBOLS.find((s) => s.id === symbolId) || SYMBOLS[0];
            return (
              <div key={index} className="jm-card-item">
                <div className="jm-card-svg" style={{ color: sym.color }}>
                  {sym.svgIcon}
                </div>
                <span className="jm-card-name">{sym.name}</span>
              </div>
            );
          })}
          {currentDice.length === 0 &&
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="jm-card-item opacity-25" />
            ))}
        </div>

        {phase !== 'result' && (
          <div className="jm-cup-stage">
            <div
              className={`jm-cup ${
                phase === 'shaking' ? 'jm-cup-shaking' : ''
              }`}
            >
              <div className="jm-cup-rim" />
              <div className="jm-cup-top" />
              <div className="jm-cup-body">
                <div className="jm-cup-emblem">JM</div>
              </div>
            </div>
          </div>
        )}

        {phase === 'result' && winPopupData && (
          <div className="jm-win-popup">
            <div className="jm-win-box">
              <div className="jm-win-title">🎉 शानदार जीत! 🎉</div>

              <div className="jm-win-breakdown">
                {winPopupData.breakdown.map((item, idx) => (
                  <div key={idx} className="jm-breakdown-row">
                    <span>{item.name}:</span>
                    <span style={{ color: '#facc15' }}>
                      {item.count} बार आया ({item.count}x)
                    </span>
                  </div>
                ))}
              </div>

              <div className="jm-win-amount">
                कुल जीत: <DiamondAmount value={winPopupData.totalWon} />
              </div>
            </div>
          </div>
        )}
      </div>

      {message && <div className="jm-message">{message}</div>}

      <div className="jm-panel p-3 mt-2">
        <div className="text-xs font-bold text-amber-300">
          निशान पर क्लिक करके तुरंत दांव लगाएं
        </div>
        <div className="jm-bet-grid">
          {SYMBOLS.map((sym) => {
            const hasBet = bets[sym.id] > 0;
            const isWon =
              phase === 'result' && !isChhakka && counts[sym.id] >= 2;
            const isLost =
              phase === 'result' &&
              (isChhakka || counts[sym.id] < 2) &&
              hasBet;

            return (
              <button
                key={sym.id}
                onClick={() => void placeBet(sym.id)}
                disabled={bettingLocked}
                className={`jm-bet-card ${hasBet ? 'selected' : ''}`}
              >
                {isWon && (
                  <span className="jm-badge-win">✓ {counts[sym.id]}x</span>
                )}
                {isLost && <span className="jm-badge-loss">✕</span>}

                <div className="jm-bet-symbol" style={{ color: sym.color }}>
                  {sym.svgIcon}
                </div>
                <div className="jm-bet-name">{sym.name}</div>
                <div className="jm-bet-amount">
                  {hasBet ? `♦ ${formatNumber(bets[sym.id])}` : 'ベット'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="jm-panel jm-denominations">
        <div className="text-xs font-bold text-amber-300">चिप की रकम चुनें</div>
        <div className="jm-denom-grid">
          {DENOMINATIONS.map((amount) => (
            <button
              key={amount}
              onClick={() => setSelectedAmount(amount)}
              disabled={bettingLocked}
              className={`jm-denom ${
                selectedAmount === amount ? 'active' : ''
              }`}
            >
              ♦ {formatNumber(amount)}
            </button>
          ))}
        </div>
      </div>

      <div className="jm-panel p-3 mt-2">
        <div className="jm-controls">
          <button
            onClick={() => void undoBet()}
            disabled={bettingLocked || historyRef.current.length === 0}
            className="jm-control"
          >
            अंडू (Undo)
          </button>
          <button
            onClick={() => void clearBets()}
            disabled={bettingLocked || totalBet === 0}
            className="jm-control"
          >
            साफ करें (Clear)
          </button>
        </div>
      </div>

      <div className="jm-footnote text-center text-xs mt-3 text-gray-400">
        Arena Nepal · Server wallet synced
      </div>
    </main>
  );
}