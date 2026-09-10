'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Arena Spinner Winner
 * --------------------
 * Mobile-first automatic round engine.
 *
 * IMPORTANT:
 * This component is intentionally written as a virtual-credit/demo game.
 * For any real-money / cash-convertible economy, result generation, balance
 * mutation, bet acceptance and payout must be performed and verified server-side.
 *
 * Round:
 *   15s betting -> 3s lock -> automatic 10s spin -> result -> next round
 *
 * There is NO Start Spin button and NO Auto Spin button.
 * The wheel itself never changes layout position while spinning.
 */

type WheelSlot = {
  label: string;
  multiplier: number;
  color: string;
  chance: number;
};

type Bets = Record<number, number>;

const WHEEL_SLOTS: WheelSlot[] = [
  { label: '1.5x', multiplier: 1.5, chance: 28.0, color: '#17164b' },
  { label: '2x', multiplier: 2, chance: 20.0, color: '#22238b' },
  { label: '3x', multiplier: 3, chance: 15.0, color: '#4d1592' },
  { label: '5x', multiplier: 5, chance: 12.0, color: '#7b0d73' },
  { label: '10x', multiplier: 10, chance: 8.0, color: '#99113e' },
  { label: '15x', multiplier: 15, chance: 5.0, color: '#b3142b' },
  { label: '20x', multiplier: 20, chance: 4.0, color: '#d51b24' },
  { label: '30x', multiplier: 30, chance: 3.0, color: '#d95b08' },
  { label: '40x', multiplier: 40, chance: 2.0, color: '#b66a09' },
  { label: '50x', multiplier: 50, chance: 1.5, color: '#17622f' },
  { label: '100x', multiplier: 100, chance: 1.0, color: '#087d73' },
  { label: '300x', multiplier: 300, chance: 0.5, color: '#183f9c' },
];

const CHIP_AMOUNTS = [
  50, 100, 150, 200, 300, 400, 500, 600,
  700, 800, 900, 1000, 1500, 2000, 3000, 5000,
];

const BETTING_SECONDS = 15;
const LOCK_SECONDS = 3;
const SPIN_MS = 10_000;
const RESULT_HOLD_MS = 1_400;
const SLICE_DEG = 360 / WHEEL_SLOTS.length;
const WHEEL_START_ANGLE = 0; // first slice center is at 12 o'clock

const WALLET_KEY = 'arena_red_diamonds';
const LEGACY_WALLET_KEY = 'arena_wallet_balance';
const WALLET_EVENT = 'walletUpdated';

function readWalletBalance(): number {
  if (typeof window === 'undefined') return 0;

  try {
    const raw =
      window.localStorage.getItem(WALLET_KEY) ??
      window.localStorage.getItem(LEGACY_WALLET_KEY);

    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
  } catch {
    return 0;
  }
}

function writeWalletBalance(next: number) {
  if (typeof window === 'undefined') return;

  const safe = Math.max(0, Math.floor(next));

  try {
    window.localStorage.setItem(WALLET_KEY, String(safe));
    window.dispatchEvent(
      new CustomEvent(WALLET_EVENT, { detail: safe }),
    );
  } catch {
    // The UI can continue even if storage is unavailable.
  }
}

function totalBets(bets: Bets): number {
  return Object.values(bets).reduce((sum, value) => sum + value, 0);
}

/**
 * Weighted result selection.
 * This is suitable only for a virtual-credit/demo implementation.
 */
function pickWinningIndex(): number {
  const random = Math.random() * 100;
  let cumulative = 0;

  for (let i = 0; i < WHEEL_SLOTS.length; i += 1) {
    cumulative += WHEEL_SLOTS[i].chance;
    if (random <= cumulative) return i;
  }

  return WHEEL_SLOTS.length - 1;
}

export default function ArenaSpinnerWinner() {
  const [redBalance, setRedBalance] = useState(0);
  const [selectedChip, setSelectedChip] = useState(100);
  const [bets, setBets] = useState<Bets>({});
  const [rotation, setRotation] = useState(0);
  const [timeLeft, setTimeLeft] = useState(BETTING_SECONDS);
  const [betLocked, setBetLocked] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [resultIndex, setResultIndex] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('PLACE YOUR BETS NOW');
  const [roundNumber, setRoundNumber] = useState(1);
  const [showStartBetPopup, setShowStartBetPopup] = useState(true);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const rotationRef = useRef(0);
  const betsRef = useRef<Bets>({});
  const balanceRef = useRef(0);
  const phaseRef = useRef<'betting' | 'spinning'>('betting');
  const roundDeadlineRef = useRef<number | null>(null);
  const roundTimeoutRef = useRef<number | null>(null);
  const spinTimeoutRef = useRef<number | null>(null);
  const popupTimeoutRef = useRef<number | null>(null);
  const spinSoundTimeoutsRef = useRef<number[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const activeBetTotal = useMemo(() => totalBets(bets), [bets]);

  const clearTimer = useCallback((ref: React.MutableRefObject<number | null>) => {
    if (ref.current !== null) {
      window.clearTimeout(ref.current);
      ref.current = null;
    }
  }, []);

  const initAudio = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      if (!audioCtxRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }).webkitAudioContext;

        if (!AudioContextClass) return;
        audioCtxRef.current = new AudioContextClass();
      }

      if (audioCtxRef.current.state === 'suspended') {
        void audioCtxRef.current.resume();
      }
    } catch {
      // Audio is optional.
    }
  }, []);

  const playTick = useCallback(
    (loud = false) => {
      try {
        initAudio();
        const ctx = audioCtxRef.current;
        if (!ctx) return;

        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = loud ? 'square' : 'sine';
        oscillator.frequency.setValueAtTime(loud ? 880 : 520, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(
          loud ? 170 : 180,
          ctx.currentTime + 0.07,
        );

        gain.gain.setValueAtTime(loud ? 0.18 : 0.07, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + 0.07,
        );

        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.08);
      } catch {
        // Audio is optional.
      }
    },
    [initAudio],
  );

  const playPegClick = useCallback(() => {
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(
        700 + Math.random() * 180,
        ctx.currentTime,
      );
      oscillator.frequency.exponentialRampToValueAtTime(
        110,
        ctx.currentTime + 0.045,
      );

      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + 0.045,
      );

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.05);
    } catch {
      // Audio is optional.
    }
  }, [initAudio]);

  const stopSpinSound = useCallback(() => {
    spinSoundTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    spinSoundTimeoutsRef.current = [];
  }, []);

  const startSpinSound = useCallback(() => {
    stopSpinSound();
    initAudio();

    // Decelerating click schedule across the full 10-second spin.
    // The visual wheel and click cadence both slow toward the end.
    const schedule = (elapsed: number, delay: number) => {
      if (elapsed >= SPIN_MS - 150) return;

      const id = window.setTimeout(() => {
        playPegClick();

        const progress = Math.min(1, elapsed / SPIN_MS);
        const nextDelay = 55 + Math.pow(progress, 2.1) * 620;

        schedule(elapsed + nextDelay, nextDelay);
      }, delay);

      spinSoundTimeoutsRef.current.push(id);
    };

    schedule(0, 0);
  }, [initAudio, playPegClick, stopSpinSound]);

  const playResultSound = useCallback(
    (winner: boolean) => {
      try {
        initAudio();
        const ctx = audioCtxRef.current;
        if (!ctx) return;

        const notes = winner
          ? [523.25, 659.25, 783.99, 1046.5]
          : [392, 330];

        notes.forEach((frequency, index) => {
          const oscillator = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = ctx.currentTime + index * 0.09;

          oscillator.type = 'sine';
          oscillator.frequency.value = frequency;
          gain.gain.setValueAtTime(0.11, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

          oscillator.connect(gain);
          gain.connect(ctx.destination);

          oscillator.start(start);
          oscillator.stop(start + 0.3);
        });
      } catch {
        // Audio is optional.
      }
    },
    [initAudio],
  );

  const syncBalance = useCallback(() => {
    const next = readWalletBalance();
    balanceRef.current = next;
    setRedBalance(next);
  }, []);

  const beginBettingRound = useCallback(() => {
    phaseRef.current = 'betting';
    setSpinning(false);
    setBetLocked(false);
    setTimeLeft(BETTING_SECONDS);
    setStatusMessage('PLACE YOUR BETS NOW');
    setResultIndex(null);
    setLastResult(null);
    betsRef.current = {};
    setBets({});
    roundDeadlineRef.current = Date.now() + BETTING_SECONDS * 1000;

    setShowStartBetPopup(true);

    if (popupTimeoutRef.current !== null) {
      window.clearTimeout(popupTimeoutRef.current);
    }

    popupTimeoutRef.current = window.setTimeout(() => {
      setShowStartBetPopup(false);
      popupTimeoutRef.current = null;
    }, 1100);
  }, []);

  const finishRoundAndRestart = useCallback(
    (winningIndex: number, roundBets: Bets, balanceAfterBet: number) => {
      const winner = WHEEL_SLOTS[winningIndex];
      const winningBet = roundBets[winningIndex] ?? 0;

      // Virtual-credit/demo return:
      // stake + multiplier profit. Example: 150 on 1x -> 300 total.
      const profit = winningBet * winner.multiplier;
      const totalReturn = winningBet + profit;
      const nextBalance = balanceAfterBet + totalReturn;

      if (winningBet > 0) {
        writeWalletBalance(nextBalance);
        balanceRef.current = nextBalance;
        setRedBalance(nextBalance);
        setLastResult(
          `RESULT: ${winner.label} • +${profit.toLocaleString()} virtual profit`,
        );
        playResultSound(true);
      } else {
        setLastResult(`RESULT: ${winner.label}`);
        playResultSound(false);
      }

      setStatusMessage(`RESULT: ${winner.label}`);
      setBets({});
      betsRef.current = {};

      roundTimeoutRef.current = window.setTimeout(() => {
        setRoundNumber((value) => value + 1);
        beginBettingRound();
      }, RESULT_HOLD_MS);
    },
    [beginBettingRound, playResultSound],
  );

  const startSpin = useCallback(() => {
    if (phaseRef.current === 'spinning') return;

    phaseRef.current = 'spinning';
    setSpinning(true);
    setBetLocked(true);
    setTimeLeft(0);
    setStatusMessage('WHEEL SPINNING • 10 SECONDS');
    setShowStartBetPopup(false);

    const roundBets = { ...betsRef.current };
    const stake = totalBets(roundBets);
    const startingBalance = balanceRef.current;

    // Reserve the virtual stake once, at lock -> spin transition.
    const balanceAfterBet = Math.max(0, startingBalance - stake);

    if (stake > startingBalance) {
      betsRef.current = {};
      setBets({});
      writeWalletBalance(startingBalance);
    } else if (stake > 0) {
      writeWalletBalance(balanceAfterBet);
      balanceRef.current = balanceAfterBet;
      setRedBalance(balanceAfterBet);
    }

    const winningIndex = pickWinningIndex();
    setResultIndex(winningIndex);

    // Keep the arrow fixed at 12 o'clock and rotate the wheel so the
    // winning slice CENTER lands exactly under the arrow.
    const current = rotationRef.current;
    const normalized = ((current % 360) + 360) % 360;

    // With the wheel drawn as a true 12-slice circle, slice 0 is centered
    // at 12 o'clock and every next slice is +30 degrees clockwise.
    // Therefore the winning slice center must end at 0 degrees under the
    // fixed pointer. This is the important part that prevents stopping on
    // a boundary/line.
    const targetCenterAngle =
      WHEEL_START_ANGLE + winningIndex * SLICE_DEG;

    const deltaToCenter =
      ((-targetCenterAngle - normalized) % 360 + 360) % 360;

    const targetRotation = 360 * 12 + deltaToCenter;

    const nextRotation = current + targetRotation;

    rotationRef.current = nextRotation;
    setRotation(nextRotation);

    startSpinSound();

    clearTimer(spinTimeoutRef);
    spinTimeoutRef.current = window.setTimeout(() => {
      stopSpinSound();
      setSpinning(false);
      phaseRef.current = 'betting';

      finishRoundAndRestart(
        winningIndex,
        roundBets,
        balanceAfterBet,
      );
    }, SPIN_MS);
  }, [
    clearTimer,
    finishRoundAndRestart,
    startSpinSound,
    stopSpinSound,
  ]);

  // Initial wallet sync + cross-component wallet updates.
  useEffect(() => {
    syncBalance();

    const onWalletUpdate = () => syncBalance();
    const onStorage = () => syncBalance();

    window.addEventListener(WALLET_EVENT, onWalletUpdate);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(WALLET_EVENT, onWalletUpdate);
      window.removeEventListener('storage', onStorage);
    };
  }, [syncBalance]);

  // Start the first 15-second betting round once.
  useEffect(() => {
    beginBettingRound();

    return () => {
      clearTimer(roundTimeoutRef);
      clearTimer(spinTimeoutRef);
      clearTimer(popupTimeoutRef);
      stopSpinSound();

      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => undefined);
      }
    };
  }, [beginBettingRound, clearTimer, stopSpinSound]);

  // Drift-resistant 15-second countdown.
  useEffect(() => {
    if (phaseRef.current !== 'betting') return;

    const interval = window.setInterval(() => {
      const deadline = roundDeadlineRef.current;
      if (!deadline) return;

      const remainingMs = Math.max(0, deadline - Date.now());
      const seconds = Math.ceil(remainingMs / 1000);
      const next = Math.min(BETTING_SECONDS, seconds);

      setTimeLeft(next);

      if (next <= LOCK_SECONDS) {
        setBetLocked(true);
        setStatusMessage(
          next > 0 ? `BETS LOCKED • ${next}s LEFT` : 'BETS LOCKED',
        );
      } else {
        setBetLocked(false);
        setStatusMessage('PLACE YOUR BETS NOW');
      }

      if (remainingMs <= 0) {
        window.clearInterval(interval);
        startSpin();
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [roundNumber, startSpin]);

  const handlePlaceBet = useCallback(
    (index: number) => {
      if (spinning || betLocked) return;

      initAudio();

      const currentTotal = totalBets(betsRef.current);
      const currentBalance = balanceRef.current;

      if (currentTotal + selectedChip > currentBalance) {
        setStatusMessage('NOT ENOUGH RED DIAMONDS');
        playTick(true);
        return;
      }

      const next = {
        ...betsRef.current,
        [index]: (betsRef.current[index] ?? 0) + selectedChip,
      };

      betsRef.current = next;
      setBets(next);
      setStatusMessage('BET ACCEPTED');
    },
    [betLocked, initAudio, playTick, selectedChip, spinning],
  );

  const handleClearBets = useCallback(() => {
    if (spinning || betLocked) return;

    betsRef.current = {};
    setBets({});
    setStatusMessage('BETS CLEARED');
  }, [betLocked, spinning]);

  // 1-second audible countdown ticks.
  useEffect(() => {
    if (phaseRef.current !== 'betting') return;
    if (timeLeft <= 0 || timeLeft > BETTING_SECONDS) return;

    // This effect is intentionally driven by the displayed second.
    // Last 3 seconds are louder.
    playTick(timeLeft <= LOCK_SECONDS);
  }, [timeLeft, playTick]);

  const progressPercent =
    spinning
      ? 0
      : Math.max(0, Math.min(100, (timeLeft / BETTING_SECONDS) * 100));

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col overflow-x-hidden bg-[#02040a] text-white select-none">
      {/* Compact Arena header */}
      <header className="sticky top-0 z-50 flex h-[58px] items-center justify-between border-b border-yellow-500/30 bg-[#05070e]/95 px-3 shadow-[0_5px_24px_rgba(0,0,0,.55)] backdrop-blur">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xl">👑</span>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-black leading-none tracking-tight text-yellow-300">
                ARENA NEPAL
              </div>
              <div className="mt-0.5 text-[7px] font-bold tracking-[0.22em] text-white/55">
                PLAY • WIN • BE LEGEND
              </div>
            </div>
          </div>
        </div>

        <div className="ml-2 flex shrink-0 items-center gap-1.5 rounded-xl border border-red-500/50 bg-red-950/50 px-2.5 py-1.5">
          <span className="text-sm">💎</span>
          <div className="leading-none">
            <div className="text-[11px] font-black text-red-300">
              {redBalance.toLocaleString()}
            </div>
            <div className="text-[6px] font-bold uppercase tracking-wider text-white/50">
              Red Diamonds
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-2 pb-3 pt-2">
        {/* Round status */}
        <section className="mb-2 rounded-2xl border border-yellow-500/35 bg-gradient-to-b from-[#11131d] to-[#070912] p-2 shadow-[0_10px_30px_rgba(0,0,0,.45)]">
          <div className="mb-1.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-yellow-300">
                🎰 Mega Spin Wheel
              </div>
              <div className="mt-0.5 text-[7px] font-bold text-white/40">
                ROUND #{roundNumber} • 15s BET • 3s LOCK • 10s SPIN
              </div>
            </div>

            <div
              className={`flex h-9 min-w-11 items-center justify-center rounded-xl border px-2 text-lg font-black ${
                spinning
                  ? 'border-yellow-400/60 bg-yellow-500/15 text-yellow-300'
                  : betLocked
                    ? 'border-red-500 bg-red-600/20 text-red-300'
                    : 'border-green-500/60 bg-green-500/10 text-green-300'
              }`}
            >
              {spinning ? '🎡' : `${timeLeft}s`}
            </div>
          </div>

          <div
            className={`rounded-xl border px-2.5 py-2 text-center text-[10px] font-black uppercase tracking-wide ${
              spinning
                ? 'border-yellow-400/50 bg-yellow-500/10 text-yellow-300'
                : betLocked
                  ? 'border-red-500/70 bg-red-600/15 text-red-300'
                  : 'border-green-500/50 bg-green-500/10 text-green-300'
            }`}
          >
            {spinning ? '🌀 WHEEL SPINNING NOW — GOOD LUCK!' : statusMessage}
          </div>

          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-[width] duration-200 ${
                betLocked ? 'bg-red-500' : 'bg-green-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </section>

        {/* Stable wheel stage */}
        <section className="relative mx-auto flex w-full justify-center py-1">
          <div className="relative aspect-square w-[min(86vw,350px)] max-w-[350px]">
            {/* Fixed pointer */}
            <div className="absolute left-1/2 top-[-3px] z-50 -translate-x-1/2">
              <div className="relative h-10 w-9">
                <div className="absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-l-[17px] border-r-[17px] border-t-[34px] border-l-transparent border-r-transparent border-t-yellow-300 drop-shadow-[0_3px_5px_rgba(0,0,0,.9)]" />
                <div className="absolute left-1/2 top-[2px] h-0 w-0 -translate-x-1/2 border-l-[12px] border-r-[12px] border-t-[24px] border-l-transparent border-r-transparent border-t-yellow-500" />
              </div>
            </div>

            {/* Outer glow */}
            <div className="absolute inset-0 rounded-full border-[3px] border-yellow-400/30 shadow-[0_0_28px_rgba(250,204,21,.32)]" />

            {/* Wheel: one real 12-slice disc.  Keeping the slices in a single
                conic-gradient prevents the old full-circle overlay bug that
                made the entire wheel turn yellow. */}
            <div
              className="absolute inset-[5px] overflow-hidden rounded-full border-[4px] border-yellow-300 bg-black shadow-[inset_0_0_25px_rgba(0,0,0,.9),0_0_22px_rgba(250,204,21,.28)]"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning
                  ? `transform ${SPIN_MS}ms cubic-bezier(0.08, 0.86, 0.12, 1)`
                  : 'none',
                willChange: spinning ? 'transform' : undefined,
                background: `conic-gradient(
                  from -15deg,
                  ${WHEEL_SLOTS.map((slot, index) => {
                    const start = index * SLICE_DEG;
                    const end = start + SLICE_DEG - 1.15;
                    return `${slot.color} ${start}deg, ${slot.color} ${end}deg, rgba(255,214,40,.96) ${end}deg, rgba(255,214,40,.96) ${start + SLICE_DEG}deg`;
                  }).join(', ')}
                )`,
              }}
            >
              {/* Fine radial divider lines + physical knots at EVERY boundary.
                  The knot sits exactly between two multiplier centers. */}
              {WHEEL_SLOTS.map((slot, index) => {
                const boundaryAngle = index * SLICE_DEG - SLICE_DEG / 2;
                const centerAngle = index * SLICE_DEG;

                return (
                  <React.Fragment key={slot.label}>
                    {/* Boundary line */}
                    <div
                      className="absolute left-1/2 top-0 z-10 h-1/2 w-px origin-bottom bg-yellow-200/55 shadow-[0_0_3px_rgba(255,215,0,.65)]"
                      style={{ transform: `rotate(${boundaryAngle}deg)` }}
                    />

                    {/* 3D knot / stopper */}
                    <div
                      className="absolute inset-0 z-20"
                      style={{ transform: `rotate(${boundaryAngle}deg)` }}
                    >
                      <div className="absolute left-1/2 top-[1.2%] h-[clamp(9px,2.6vw,14px)] w-[clamp(9px,2.6vw,14px)] -translate-x-1/2 rounded-full border border-black/90 bg-gradient-to-br from-white via-yellow-200 to-yellow-600 shadow-[0_2px_5px_rgba(0,0,0,.95),inset_0_1px_1px_rgba(255,255,255,.9)]" />
                    </div>

                    {/* Multiplier text: centered inside its own 30° sector and
                        counter-rotated so the text stays readable. */}
                    <div
                      className="absolute inset-0 z-15"
                      style={{ transform: `rotate(${centerAngle}deg)` }}
                    >
                      <div className="absolute left-1/2 top-[10%] -translate-x-1/2">
                        <span
                          className="block whitespace-nowrap text-[clamp(11px,3.2vw,17px)] font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,.95)]"
                          style={{ transform: `rotate(${-centerAngle}deg)` }}
                        >
                          {slot.label}
                        </span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

              {/* Center hub */}
              <div className="absolute left-1/2 top-1/2 z-30 flex h-[22%] w-[22%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-yellow-200 bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-700 shadow-[0_0_22px_rgba(250,204,21,.55)]">
                <div className="flex h-[82%] w-[82%] items-center justify-center rounded-full border border-white/50 bg-black/85">
                  <span className="text-[clamp(10px,3.2vw,16px)] font-black tracking-wide text-yellow-200">
                    SPIN
                  </span>
                </div>
              </div>
            </div>

            {/* Static base / shadow */}
            <div className="absolute -bottom-1 left-1/2 h-3 w-[65%] -translate-x-1/2 rounded-[50%] bg-red-600/20 blur-md" />
          </div>
        </section>

        {/* Result */}
        {lastResult && (
          <section className="mb-2 rounded-xl border border-yellow-500/50 bg-gradient-to-r from-red-950/80 via-black/80 to-red-950/80 px-3 py-2 text-center shadow-lg">
            <div className="text-[12px] font-black text-yellow-200">
              {lastResult}
            </div>
            <div className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.18em] text-white/40">
              Next betting round starts automatically
            </div>
          </section>
        )}

        {/* Chip selector */}
        <section className="mb-2 rounded-2xl border border-yellow-500/30 bg-[#080b13] p-2">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="text-[9px] font-black uppercase tracking-wider text-yellow-300">
              Select Chip
            </div>
            <div className="text-[8px] font-bold text-red-300">
              💎 Red Diamonds
            </div>
          </div>

          <div className="grid grid-cols-8 gap-1">
            {CHIP_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => {
                  if (!spinning && !betLocked) {
                    initAudio();
                    setSelectedChip(amount);
                  }
                }}
                disabled={spinning || betLocked}
                className={`min-h-7 rounded-lg border px-0.5 text-[8px] font-black transition-transform active:scale-95 ${
                  selectedChip === amount
                    ? 'border-yellow-200 bg-gradient-to-b from-yellow-300 to-orange-500 text-black shadow-[0_0_10px_rgba(250,204,21,.35)]'
                    : 'border-white/10 bg-[#111827] text-white/75'
                } disabled:cursor-not-allowed disabled:opacity-45`}
              >
                {amount}
              </button>
            ))}
          </div>
        </section>

        {/* Multiplier bets */}
        <section className="rounded-2xl border border-yellow-500/30 bg-[#080b13] p-2">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="text-[9px] font-black uppercase tracking-wider text-yellow-300">
              Bet On Multiplier
            </div>

            <button
              type="button"
              onClick={handleClearBets}
              disabled={spinning || betLocked || activeBetTotal === 0}
              className="rounded-lg border border-red-500/35 bg-red-950/40 px-2 py-1 text-[7px] font-black uppercase text-red-300 disabled:opacity-35"
            >
              Clear Bets
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {WHEEL_SLOTS.map((slot, index) => {
              const current = bets[index] ?? 0;

              return (
                <button
                  key={slot.label}
                  type="button"
                  onClick={() => handlePlaceBet(index)}
                  disabled={spinning || betLocked}
                  className={`relative min-h-[52px] overflow-hidden rounded-xl border p-1.5 transition-transform active:scale-95 ${
                    current > 0
                      ? 'border-yellow-300 bg-gradient-to-br from-red-600 via-red-700 to-orange-700 shadow-[0_0_13px_rgba(239,68,68,.32)]'
                      : 'border-white/10 bg-gradient-to-b from-[#111a39] to-[#090d1c]'
                  } disabled:cursor-not-allowed disabled:opacity-55`}
                >
                  <div className="text-[12px] font-black leading-none text-white">
                    {slot.label}
                  </div>

                  {current > 0 ? (
                    <div className="mt-1 text-[8px] font-black text-yellow-200">
                      💎 {current.toLocaleString()}
                    </div>
                  ) : (
                    <div className="mt-1 text-[7px] font-bold text-white/35">
                      {betLocked ? 'LOCKED' : 'TAP TO BET'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bet summary */}
          <div className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2">
            <span className="text-[8px] font-black uppercase tracking-wider text-white/45">
              Total Bet
            </span>
            <span className="text-[11px] font-black text-yellow-300">
              💎 {activeBetTotal.toLocaleString()}
            </span>
          </div>
        </section>

        <div className="mt-2 text-center text-[7px] font-bold uppercase tracking-[0.15em] text-white/25">
          Wallet synced • 15s betting • 3s lock • 10s spin • mobile optimized
        </div>
      </main>

      {/* Start-bet popup */}
      {showStartBetPopup && !spinning && (
        <div className="pointer-events-none fixed inset-x-0 top-[74px] z-[100] mx-auto w-[min(92vw,390px)]">
          <div className="rounded-2xl border border-yellow-300/70 bg-gradient-to-r from-red-900/95 via-black/95 to-red-900/95 px-4 py-3 text-center shadow-[0_10px_35px_rgba(0,0,0,.65)]">
            <div className="text-[15px] font-black text-yellow-200">
              🎯 START BET
            </div>
            <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-white/65">
              Betting is open • {BETTING_SECONDS} seconds
            </div>
          </div>
        </div>
      )}

      {/* Lock overlay */}
      {betLocked && !spinning && (
        <div className="pointer-events-none fixed inset-x-0 top-[74px] z-[90] mx-auto w-[min(92vw,390px)]">
          <div className="rounded-2xl border border-red-500/70 bg-red-950/95 px-4 py-2 text-center shadow-[0_10px_30px_rgba(0,0,0,.65)]">
            <div className="text-[12px] font-black text-red-300">
              🔒 BETS LOCKED
            </div>
            <div className="text-[8px] font-bold text-white/60">
              Wheel starts automatically
            </div>
          </div>
        </div>
      )}

      {/* Spin overlay */}
      {spinning && (
        <div className="pointer-events-none fixed inset-x-0 bottom-16 z-[90] mx-auto w-[min(92vw,390px)]">
          <div className="rounded-2xl border border-yellow-400/60 bg-black/90 px-4 py-2 text-center shadow-[0_10px_30px_rgba(0,0,0,.7)]">
            <div className="text-[11px] font-black text-yellow-200">
              🎡 SPINNING • 10s
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
