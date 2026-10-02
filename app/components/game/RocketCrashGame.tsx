'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getGlobalBalance, updateGlobalBalance } from '@/lib/wallet';
import { supabase } from '@/lib/supabase';

interface RocketCrashGameProps {
  onBackToLobby?: () => void;
}

type Phase = 'loading' | 'betting' | 'flying' | 'crashed';
type BetStatus = 'active' | 'won' | 'lost';

interface Bet {
  slot: number;
  amount: number;
  auto: number;
  status: BetStatus;
  mult: number | null;
  payout: number;
}

interface FeedItem {
  name: string;
  amount: number;
  status: BetStatus;
  mult: number | null;
  payout: number;
}

interface CrashState {
  server_now: number;
  round_id: number;
  status: 'betting' | 'flying' | 'crashed';
  betting_ends_at: number;
  started_at: number;
  multiplier: number;
  crash_point: number | null;
  my_bets: Bet[];
  feed: FeedItem[];
  players: number;
  history: number[];
  balance: number | null;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
}

// must match the SQL: multiplier = floor(e^(0.12 * seconds) * 100) / 100
const GROWTH = 0.12;
const MIN_BET = 50;
const MAX_BET = 1000;
const CHIPS = [50, 100, 200, 500, 1000];

const calcMult = (secs: number) => {
  const v = Math.floor(Math.exp(GROWTH * Math.max(0, secs)) * 100) / 100;
  return Number.isFinite(v) ? Math.min(v, 1000) : 1;
};

const multColor = (m: number) =>
  m < 2 ? '#67e8f9' : m < 5 ? '#6ee7b7' : m < 10 ? '#fde047' : '#fb7185';

const pillClass = (m: number) =>
  m < 2
    ? 'text-sky-300 bg-sky-500/10 border-sky-400/30'
    : m < 10
    ? 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30'
    : 'text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-400/30';

const errText = (e: unknown) => {
  const m = (e as { message?: string } | null)?.message || 'Something went wrong';
  return m.charAt(0).toUpperCase() + m.slice(1);
};

/* ------------------------------------------------------------------ */
/* Bet panel                                                           */
/* ------------------------------------------------------------------ */

interface BetPanelProps {
  slot: number;
  bet?: Bet;
  phase: Phase;
  mult: number;
  busy: boolean;
  balance: number;
  onPlace: (slot: number, amount: number, auto: number | null) => void;
  onCancel: (slot: number) => void;
  onCash: (slot: number) => void;
}

function BetPanel({
  slot,
  bet,
  phase,
  mult,
  busy,
  balance,
  onPlace,
  onCancel,
  onCash,
}: BetPanelProps) {
  const [amountStr, setAmountStr] = useState('100');
  const [autoOn, setAutoOn] = useState(false);
  const [autoStr, setAutoStr] = useState('2.00');

  const parsed = parseInt(amountStr || '0', 10);
  const amount = Math.max(
    MIN_BET,
    Math.min(MAX_BET, Number.isNaN(parsed) ? MIN_BET : parsed)
  );
  const autoNum = parseFloat(autoStr);
  const autoValid = !autoOn || (!Number.isNaN(autoNum) && autoNum >= 1.01);
  const setAmt = (n: number) =>
    setAmountStr(String(Math.max(MIN_BET, Math.min(MAX_BET, Math.floor(n)))));

  const editable = phase === 'betting' && !bet;

  let main: React.ReactNode;
  if (bet) {
    if (bet.status === 'won') {
      main = (
        <div className="flex h-14 flex-col items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/10 text-emerald-300">
          <span className="text-sm font-black">
            WON +{bet.payout.toLocaleString()} 🔴
          </span>
          <span className="text-[10px] text-emerald-200/70">
            cashed out at {(bet.mult ?? 0).toFixed(2)}x
          </span>
        </div>
      );
    } else if (bet.status === 'lost') {
      main = (
        <div className="flex h-14 flex-col items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-300">
          <span className="text-sm font-black">
            LOST −{bet.amount.toLocaleString()} 🔴
          </span>
          <span className="text-[10px] text-red-200/60">better luck next round</span>
        </div>
      );
    } else if (phase === 'betting') {
      main = (
        <button
          onClick={() => onCancel(slot)}
          disabled={busy}
          className="h-14 w-full rounded-xl border border-red-400/40 bg-gradient-to-b from-red-500 to-red-700 text-sm font-black uppercase tracking-wider text-white shadow-[0_8px_24px_rgba(220,38,38,0.35)] transition active:scale-[0.98] disabled:opacity-60"
        >
          Cancel · refund {bet.amount.toLocaleString()} 🔴
        </button>
      );
    } else if (phase === 'flying') {
      const potential = Math.floor(bet.amount * Math.min(mult, bet.auto));
      main = (
        <button
          onClick={() => onCash(slot)}
          disabled={busy}
          className="h-14 w-full animate-pulse rounded-xl border border-white/30 bg-gradient-to-b from-amber-300 to-orange-500 text-black shadow-[0_0_30px_rgba(251,191,36,0.5)] transition active:scale-[0.97] disabled:opacity-70"
        >
          <span className="block text-[10px] font-black uppercase tracking-[0.2em]">
            Cash out
          </span>
          <span className="block text-lg font-black tabular-nums">
            {potential.toLocaleString()} 🔴
          </span>
        </button>
      );
    } else {
      main = (
        <div className="flex h-14 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-gray-400">
          Settling…
        </div>
      );
    }
  } else if (phase === 'betting') {
    const noFunds = amount > balance;
    main = (
      <button
        onClick={() => onPlace(slot, amount, autoOn ? autoNum : null)}
        disabled={busy || noFunds || !autoValid}
        className="h-14 w-full rounded-xl border border-emerald-200/40 bg-gradient-to-b from-emerald-400 to-green-700 text-black shadow-[0_8px_28px_rgba(16,185,129,0.35)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="block text-[10px] font-black uppercase tracking-[0.2em]">
          {noFunds ? 'Not enough 🔴' : !autoValid ? 'Fix auto cash-out' : 'Place bet'}
        </span>
        <span className="block text-lg font-black tabular-nums">
          {amount.toLocaleString()} 🔴
        </span>
      </button>
    );
  } else {
    main = (
      <div className="flex h-14 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-gray-500">
        Bet opens next round
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0e1226] to-[#080a16] p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-black tracking-[0.25em] text-cyan-300/80">
          BET {slot}
        </span>
        {bet && (
          <span className="text-[10px] font-bold text-gray-400">
            {bet.amount.toLocaleString()} 🔴 · auto @ {bet.auto.toFixed(2)}x
          </span>
        )}
      </div>

      {!bet && (
        <>
          <div className="flex items-center gap-1.5">
            <button
              disabled={!editable}
              onClick={() => setAmt(amount / 2)}
              className="h-9 w-9 shrink-0 rounded-lg border border-white/10 bg-white/5 text-xs font-black text-gray-200 transition hover:bg-white/10 disabled:opacity-40"
            >
              ½
            </button>
            <input
              inputMode="numeric"
              disabled={!editable}
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
              onBlur={() => setAmountStr(String(amount))}
              className="h-9 w-full min-w-0 rounded-lg border border-cyan-400/20 bg-black/40 px-2 text-center text-sm font-black tabular-nums text-white outline-none focus:border-cyan-300/60 disabled:opacity-50"
            />
            <button
              disabled={!editable}
              onClick={() => setAmt(amount * 2)}
              className="h-9 w-9 shrink-0 rounded-lg border border-white/10 bg-white/5 text-xs font-black text-gray-200 transition hover:bg-white/10 disabled:opacity-40"
            >
              2×
            </button>
          </div>

          <div className="mt-2 grid grid-cols-5 gap-1">
            {CHIPS.map((c) => (
              <button
                key={c}
                disabled={!editable}
                onClick={() => setAmt(c)}
                className={`rounded-lg border py-1.5 text-[10px] font-black transition disabled:opacity-40 ${
                  amount === c
                    ? 'border-cyan-200/60 bg-gradient-to-b from-cyan-300 to-cyan-500 text-black'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/30 px-2 py-1.5">
            <button
              role="switch"
              aria-checked={autoOn}
              disabled={!editable}
              onClick={() => setAutoOn((v) => !v)}
              className="flex items-center gap-2 disabled:opacity-40"
            >
              <span
                className={`relative h-4 w-7 rounded-full transition ${
                  autoOn ? 'bg-emerald-500' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
                    autoOn ? 'left-3.5' : 'left-0.5'
                  }`}
                />
              </span>
              <span className="text-[10px] font-bold text-gray-300">Auto cash-out</span>
            </button>
            <div className="flex items-center gap-1">
              <input
                inputMode="decimal"
                disabled={!editable || !autoOn}
                value={autoStr}
                onChange={(e) =>
                  setAutoStr(e.target.value.replace(/[^0-9.]/g, '').slice(0, 7))
                }
                className="h-7 w-16 rounded-md border border-white/10 bg-black/40 px-1 text-center text-xs font-black tabular-nums text-white outline-none focus:border-emerald-300/60 disabled:opacity-40"
              />
              <span className="text-[10px] font-bold text-gray-500">x</span>
            </div>
          </div>
        </>
      )}

      <div className="mt-3">{main}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main game                                                           */
/* ------------------------------------------------------------------ */

export default function RocketCrashGame({ onBackToLobby }: RocketCrashGameProps) {
  const [redDiamonds, setRedDiamonds] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [mult, setMult] = useState(1);
  const [countdown, setCountdown] = useState(0);
  const [bets, setBets] = useState<Record<number, Bet | undefined>>({});
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [players, setPlayers] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [roundId, setRoundId] = useState<number | null>(null);
  const [busySlot, setBusySlot] = useState<Record<number, boolean>>({});
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [muted, setMuted] = useState(false);
  const [conn, setConn] = useState<'ok' | 'error'>('ok');
  const [connMsg, setConnMsg] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<CrashState | null>(null);
  const offsetRef = useRef(0);
  const balanceRef = useRef(0);
  const syncNowRef = useRef<(() => void) | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef(false);

  /* ---------- balance (same wallet logic as before) ---------- */

  const applyBalance = useCallback((next: number) => {
    const n = Math.max(0, Math.floor(Number(next) || 0));
    balanceRef.current = n;
    setRedDiamonds(n);
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
        setRedDiamonds(local);
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
        setRedDiamonds(local);
        return;
      }
      applyBalance(data.red_diamonds ?? 0);
    } catch {
      const local = getGlobalBalance();
      balanceRef.current = local;
      setRedDiamonds(local);
    }
  }, [applyBalance]);

  useEffect(() => {
    void loadBalanceFromServer();

    const handleWalletSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      let next = getGlobalBalance();
      if (customEvent.detail !== undefined) {
        if (typeof customEvent.detail === 'number') next = customEvent.detail;
        else if (typeof customEvent.detail?.balance === 'number')
          next = customEvent.detail.balance;
        else if (typeof customEvent.detail?.redDiamonds === 'number')
          next = customEvent.detail.redDiamonds;
      }
      balanceRef.current = next;
      setRedDiamonds(next);
    };

    window.addEventListener('walletUpdated', handleWalletSync);
    window.addEventListener('storage', handleWalletSync);
    return () => {
      window.removeEventListener('walletUpdated', handleWalletSync);
      window.removeEventListener('storage', handleWalletSync);
    };
  }, [loadBalanceFromServer]);

  /* ---------- sound + toast ---------- */

  const beep = useCallback(
    (freq: number, type: OscillatorType = 'sine', dur = 0.12, vol = 0.05) => {
      if (mutedRef.current) return;
      try {
        if (!audioRef.current) {
          const AC =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext;
          if (!AC) return;
          audioRef.current = new AC();
        }
        const ctx = audioRef.current;
        if (ctx.state === 'suspended') void ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + dur);
      } catch {
        // sound is optional
      }
    },
    []
  );

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  /* ---------- server polling (the server is the only source of truth) ---------- */

  useEffect(() => {
    let stopped = false;
    let inflight = false;
    let again = false;
    let first = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = (ms: number) => {
      if (stopped) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void run(), ms);
    };

    const run = async () => {
      if (stopped) return;
      if (inflight) {
        again = true;
        return;
      }
      inflight = true;
      let next = 1000;
      try {
        const t0 = Date.now();
        const { data, error } = await supabase.rpc('crash_get_state');
        if (error) throw error;
        const t1 = Date.now();
        const raw = data as CrashState | null;
        if (
          !raw ||
          typeof raw.status !== 'string' ||
          ![raw.server_now, raw.betting_ends_at, raw.started_at, raw.round_id].every(
            (v) => Number.isFinite(Number(v))
          )
        ) {
          throw new Error(
            'Game database setup is outdated - run rocket_crash_setup.sql again'
          );
        }
        const s: CrashState = {
          ...raw,
          server_now: Number(raw.server_now),
          betting_ends_at: Number(raw.betting_ends_at),
          started_at: Number(raw.started_at),
          round_id: Number(raw.round_id),
          multiplier: Number(raw.multiplier) || 1,
          crash_point: raw.crash_point == null ? null : Number(raw.crash_point),
          my_bets: Array.isArray(raw.my_bets) ? raw.my_bets : [],
          feed: Array.isArray(raw.feed) ? raw.feed : [],
          players: Number(raw.players) || 0,
          history: Array.isArray(raw.history) ? raw.history.map(Number) : [],
        };

        const measured = s.server_now - (t0 + t1) / 2;
        offsetRef.current = first
          ? measured
          : offsetRef.current * 0.7 + measured * 0.3;
        first = false;

        stateRef.current = s;

        const map: Record<number, Bet | undefined> = {};
        for (const b of s.my_bets) map[b.slot] = b;
        setBets(map);
        setFeed(s.feed);
        setPlayers(s.players);
        setHistory(s.history);
        setRoundId(s.round_id);
        if (typeof s.balance === 'number' && s.balance !== balanceRef.current) {
          applyBalance(s.balance);
        }
        setConn('ok');

        const now = Date.now() + offsetRef.current;
        if (s.status === 'betting') {
          next = Math.max(80, Math.min(800, s.betting_ends_at - now + 60));
        } else if (s.status === 'flying') {
          next = 500;
        } else {
          next = 1000;
        }
      } catch (e) {
        setConn('error');
        setConnMsg(errText(e));
        next = 2000;
      } finally {
        inflight = false;
      }
      if (again) {
        again = false;
        next = 0;
      }
      schedule(next);
    };

    syncNowRef.current = () => {
      if (timer) clearTimeout(timer);
      void run();
    };
    void run();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [applyBalance]);

  /* ---------- canvas scene + local clock ---------- */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const stars = Array.from({ length: 70 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.76,
      z: 0.3 + Math.random() * 0.7,
      tw: Math.random() * 6,
    }));

    let trail: { x: number; y: number }[] = [];
    let parts: Particle[] = [];
    let ring = 0;
    let ringOn = false;
    let shake = 0;
    let curRound = -1;
    let exploded = false;
    let angle = 0;
    let gridOff = 0;
    let starOff = 0;
    let lastT = performance.now();
    let lastUi = 0;
    let lastPhase: Phase = 'loading';
    let lastMultUi = 0;
    let lastCount = -1;

    const drawPlane = (x: number, y: number, ang: number, sc: number, flame: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.scale(sc, sc);

      const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 72);
      glow.addColorStop(0, 'rgba(34,211,238,0.28)');
      glow.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 72, 0, Math.PI * 2);
      ctx.fill();

      // exhaust flame
      const flameLen = Number.isFinite(flame) ? flame : 10;
      const fl = ctx.createLinearGradient(-44, 0, -44 - flameLen, 0);
      fl.addColorStop(0, 'rgba(255,255,255,0.95)');
      fl.addColorStop(0.25, 'rgba(253,186,116,0.9)');
      fl.addColorStop(1, 'rgba(239,68,68,0)');
      ctx.fillStyle = fl;
      ctx.beginPath();
      ctx.moveTo(-42, -4.5);
      ctx.lineTo(-44 - flameLen, 0);
      ctx.lineTo(-42, 4.5);
      ctx.closePath();
      ctx.fill();

      // far wing + far stabiliser (darker = further from camera)
      ctx.fillStyle = '#2f3b63';
      ctx.beginPath();
      ctx.moveTo(8, -4);
      ctx.lineTo(-12, -32);
      ctx.lineTo(-24, -30);
      ctx.lineTo(-9, -4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-31, -3);
      ctx.lineTo(-42, -16);
      ctx.lineTo(-47, -15);
      ctx.lineTo(-40, -3);
      ctx.closePath();
      ctx.fill();

      // tail fin
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.moveTo(-28, -7);
      ctx.lineTo(-39, -27);
      ctx.lineTo(-46, -27);
      ctx.lineTo(-41, -6);
      ctx.closePath();
      ctx.fill();

      // fuselage
      const body = ctx.createLinearGradient(0, -10, 0, 9);
      body.addColorStop(0, '#f1f6ff');
      body.addColorStop(0.5, '#aebfe0');
      body.addColorStop(1, '#56699a');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(48, 0);
      ctx.quadraticCurveTo(32, -10, -2, -10);
      ctx.lineTo(-36, -6);
      ctx.quadraticCurveTo(-47, 0, -36, 6);
      ctx.lineTo(-2, 9);
      ctx.quadraticCurveTo(32, 9, 48, 0);
      ctx.closePath();
      ctx.fill();

      // stripe
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.moveTo(34, 1.5);
      ctx.lineTo(-38, 1.2);
      ctx.lineTo(-38, 3.6);
      ctx.lineTo(32, 4.2);
      ctx.closePath();
      ctx.fill();

      // cockpit
      const cp = ctx.createLinearGradient(0, -9, 0, 0);
      cp.addColorStop(0, '#a5f3fc');
      cp.addColorStop(1, '#0e7490');
      ctx.fillStyle = cp;
      ctx.beginPath();
      ctx.ellipse(22, -4.5, 10, 4.2, -0.12, 0, Math.PI * 2);
      ctx.fill();

      // near wing (lighter = closer to camera)
      const wing = ctx.createLinearGradient(0, 4, -20, 34);
      wing.addColorStop(0, '#e6efff');
      wing.addColorStop(1, '#6a82bd');
      ctx.fillStyle = wing;
      ctx.beginPath();
      ctx.moveTo(10, 4);
      ctx.lineTo(-16, 36);
      ctx.lineTo(-30, 34);
      ctx.lineTo(-13, 4);
      ctx.closePath();
      ctx.fill();

      // near stabiliser
      ctx.fillStyle = '#9fb2dc';
      ctx.beginPath();
      ctx.moveTo(-30, 3);
      ctx.lineTo(-42, 15);
      ctx.lineTo(-48, 14);
      ctx.lineTo(-40, 2);
      ctx.closePath();
      ctx.fill();

      // engine nozzle + top highlight
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.ellipse(-42, 0, 3, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(44, -1);
      ctx.quadraticCurveTo(30, -9, -2, -9);
      ctx.stroke();

      ctx.restore();
    };

    const tick = (tnow: number) => {
      const dt = Math.min(0.05, (tnow - lastT) / 1000);
      lastT = tnow;
      const t = tnow / 1000;

      const s = stateRef.current;
      const now = Date.now() + offsetRef.current;
      let ph: Phase = 'loading';
      let m = 1;
      let cd = 0;

      if (s) {
        if (s.round_id !== curRound) {
          curRound = s.round_id;
          trail = [];
          parts = [];
          ringOn = false;
          exploded = false;
          shake = 0;
        }
        if (s.status === 'crashed') {
          ph = 'crashed';
          m = s.crash_point ?? s.multiplier;
        } else if (now < s.betting_ends_at) {
          ph = 'betting';
          cd = (s.betting_ends_at - now) / 1000;
        } else {
          ph = 'flying';
          m = calcMult((now - s.started_at) / 1000);
        }
      }

      if (!Number.isFinite(m)) m = 1;

      const horizon = h * 0.8;
      const speed = ph === 'flying' ? 0.35 + Math.min(m, 12) * 0.12 : ph === 'betting' ? 0.12 : 0;
      gridOff = (gridOff + dt * speed) % 1;
      starOff += dt * speed * 0.03;

      const u = ph === 'flying' || ph === 'crashed' ? Math.min(1, (m - 1) / 5) : 0;
      const e = u * u * (3 - 2 * u);
      const bob =
        ph === 'betting'
          ? Math.sin(t * 2) * h * 0.012
          : ph === 'flying' && u >= 1
          ? Math.sin(t * 1.6) * h * 0.018
          : 0;
      const px = w * (0.14 + 0.6 * e);
      const py = h * (0.7 - 0.44 * e) + bob;

      if (ph === 'flying') {
        const last = trail[trail.length - 1];
        if (!last || Math.hypot(px - last.x, py - last.y) >= 3) {
          trail.push({ x: px, y: py });
          if (trail.length > 600) trail.shift();
        }
      }

      let target = 0;
      if (trail.length > 4) {
        const a = trail[trail.length - 1];
        const b = trail[trail.length - 5];
        target = Math.max(-0.75, Math.min(0.2, Math.atan2(a.y - b.y, a.x - b.x)));
      }
      angle += (target - angle) * Math.min(1, dt * 6);

      if (ph === 'crashed' && !exploded && s) {
        exploded = true;
        ringOn = true;
        ring = 0;
        shake = 0.5;
        const colors = ['#ffffff', '#fde047', '#fb923c', '#ef4444'];
        for (let i = 0; i < 70; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 60 + Math.random() * 280;
          parts.push({
            x: px,
            y: py,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            life: 0.7 + Math.random() * 0.8,
            max: 1.5,
            size: 2 + Math.random() * 4,
            color: colors[Math.floor(Math.random() * colors.length)],
          });
        }
      }

      /* ---- draw ---- */
      ctx.save();
      ctx.clearRect(0, 0, w, h);
      if (shake > 0) {
        shake -= dt;
        ctx.translate((Math.random() - 0.5) * 10 * shake * 2, (Math.random() - 0.5) * 10 * shake * 2);
      }

      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, '#03050f');
      sky.addColorStop(0.55, '#0a1030');
      sky.addColorStop(1, '#241047');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, horizon + 1);

      const sun = ctx.createRadialGradient(w * 0.5, horizon, 0, w * 0.5, horizon, w * 0.6);
      sun.addColorStop(0, 'rgba(236,72,153,0.38)');
      sun.addColorStop(1, 'rgba(236,72,153,0)');
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, w, horizon + 1);

      for (const st of stars) {
        const sx = (((st.x - starOff * st.z) % 1) + 1) % 1;
        ctx.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(t * 1.3 + st.tw));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx * w, st.y * h, st.z * 1.8, st.z * 1.8);
      }
      ctx.globalAlpha = 1;

      // perspective floor
      const floor = ctx.createLinearGradient(0, horizon, 0, h);
      floor.addColorStop(0, '#1a0b33');
      floor.addColorStop(1, '#05030f');
      ctx.fillStyle = floor;
      ctx.fillRect(0, horizon, w, h - horizon);

      ctx.lineWidth = 1;
      for (let i = 0; i <= 14; i++) {
        const fx = (i - 7) / 7;
        ctx.strokeStyle = 'rgba(34,211,238,0.22)';
        ctx.beginPath();
        ctx.moveTo(w / 2 + fx * w * 0.08, horizon);
        ctx.lineTo(w / 2 + fx * w * 1.1, h);
        ctx.stroke();
      }
      for (let i = 0; i < 8; i++) {
        const f = (i + gridOff) / 8;
        const y = horizon + (h - horizon) * f * f;
        ctx.strokeStyle = `rgba(236,72,153,${0.08 + 0.35 * f})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(34,211,238,0.55)';
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      ctx.lineTo(w, horizon);
      ctx.stroke();

      // flight curve + area
      if (trail.length > 1) {
        const first = trail[0];
        const last = trail[trail.length - 1];
        const area = ctx.createLinearGradient(0, last.y, 0, horizon);
        area.addColorStop(0, 'rgba(236,72,153,0.28)');
        area.addColorStop(1, 'rgba(34,211,238,0.02)');
        ctx.fillStyle = area;
        ctx.beginPath();
        ctx.moveTo(first.x, horizon);
        for (const p of trail) ctx.lineTo(p.x, p.y);
        ctx.lineTo(last.x, horizon);
        ctx.closePath();
        ctx.fill();

        const line = ctx.createLinearGradient(first.x, 0, Math.max(last.x, first.x + 1), 0);
        line.addColorStop(0, '#22d3ee');
        line.addColorStop(1, '#f472b6');
        ctx.strokeStyle = line;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#22d3ee';
        ctx.beginPath();
        ctx.moveTo(first.x, first.y);
        for (const p of trail) ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // plane
      if (ph === 'betting' || ph === 'flying') {
        const sc = Math.max(0.65, Math.min(1.15, w / 400));
        const flame =
          ph === 'flying'
            ? 20 + Math.min(m, 10) * 3 + Math.random() * 10
            : 8 + Math.random() * 4;
        drawPlane(px, py, angle, sc, flame);
      }

      // explosion
      if (ph === 'crashed') {
        ctx.globalCompositeOperation = 'lighter';
        if (ringOn) {
          ring += dt * 420;
          const a = Math.max(0, 1 - ring / 170);
          if (a <= 0) ringOn = false;
          ctx.strokeStyle = `rgba(251,146,60,${a})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(px, py, ring, 0, Math.PI * 2);
          ctx.stroke();
        }
        for (const p of parts) {
          p.life -= dt;
          if (p.life <= 0) continue;
          p.vx *= 0.985;
          p.vy = p.vy * 0.985 + 140 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          ctx.globalAlpha = Math.max(0, p.life / p.max);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

      const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.95);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      /* ---- push to React (throttled) ---- */
      if (tnow - lastUi > 33 || ph !== lastPhase) {
        lastUi = tnow;
        if (ph !== lastPhase) {
          lastPhase = ph;
          setPhase(ph);
          if (ph === 'crashed') beep(110, 'sawtooth', 0.45, 0.08);
        }
        const mr = Math.round(m * 100) / 100;
        if (mr !== lastMultUi) {
          lastMultUi = mr;
          setMult(mr);
        }
        const cr = Math.ceil(cd * 10) / 10;
        if (cr !== lastCount) {
          lastCount = cr;
          setCountdown(cr);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [beep]);

  /* ---------- actions (all money logic is on the server) ---------- */

  const setBusy = (slot: number, v: boolean) =>
    setBusySlot((p) => ({ ...p, [slot]: v }));

  const placeBet = async (slot: number, amount: number, auto: number | null) => {
    if (busySlot[slot]) return;
    setBusy(slot, true);
    try {
      const { data, error } = await supabase.rpc('crash_place_bet', {
        p_slot: slot,
        p_amount: amount,
        p_auto: auto,
      });
      if (error) throw error;
      applyBalance((data as { balance: number }).balance);
      beep(600);
    } catch (e) {
      showToast(errText(e), false);
      void loadBalanceFromServer();
    } finally {
      setBusy(slot, false);
      syncNowRef.current?.();
    }
  };

  const cancelBet = async (slot: number) => {
    if (busySlot[slot]) return;
    setBusy(slot, true);
    try {
      const { data, error } = await supabase.rpc('crash_cancel_bet', { p_slot: slot });
      if (error) throw error;
      applyBalance((data as { balance: number }).balance);
      beep(300);
    } catch (e) {
      showToast(errText(e), false);
    } finally {
      setBusy(slot, false);
      syncNowRef.current?.();
    }
  };

  const cashOut = async (slot: number) => {
    if (busySlot[slot]) return;
    setBusy(slot, true);
    try {
      const { data, error } = await supabase.rpc('crash_cash_out', { p_slot: slot });
      if (error) throw error;
      const d = data as { payout: number; multiplier: number; balance: number };
      applyBalance(d.balance);
      beep(880, 'square', 0.15);
      showToast(`Cashed out +${d.payout.toLocaleString()} 🔴 @ ${d.multiplier.toFixed(2)}x`, true);
    } catch (e) {
      showToast(errText(e), false);
      void loadBalanceFromServer();
    } finally {
      setBusy(slot, false);
      syncNowRef.current?.();
    }
  };

  /* ---------- render ---------- */

  const progress = phase === 'betting' ? Math.max(0, Math.min(1, countdown / 8)) : 0;

  return (
    <div className="mx-auto w-full max-w-2xl select-none text-white">
      <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-[#05060d] p-3 shadow-[0_20px_70px_rgba(0,0,0,0.65)] sm:p-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(34,211,238,0.14),transparent_55%)]" />

        {toast && (
          <div
            className={`absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full border px-4 py-2 text-xs font-black shadow-xl backdrop-blur-md ${
              toast.ok
                ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                : 'border-red-400/50 bg-red-500/20 text-red-200'
            }`}
          >
            {toast.msg}
          </div>
        )}

        {/* header */}
        <div className="relative z-10 mb-3 flex items-center justify-between gap-2">
          {onBackToLobby ? (
            <button
              onClick={onBackToLobby}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-gray-300 transition hover:bg-white/10"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          <h2 className="bg-gradient-to-r from-cyan-300 via-sky-400 to-fuchsia-400 bg-clip-text text-sm font-black uppercase tracking-[0.2em] text-transparent">
            Rocket Crash
          </h2>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                mutedRef.current = !mutedRef.current;
                setMuted(mutedRef.current);
              }}
              className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 text-sm transition hover:bg-white/10"
              aria-label="Toggle sound"
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <div className="flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-950/70 px-3 py-1.5 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
              <span className="text-sm">🔴</span>
              <span className="text-xs font-black tabular-nums text-red-300">
                {redDiamonds.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* history */}
        <div className="relative z-10 mb-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {history.length === 0 ? (
            <span className="text-[10px] text-gray-600">No rounds yet</span>
          ) : (
            history.map((hm, i) => (
              <span
                key={i}
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black tabular-nums ${pillClass(hm)}`}
              >
                {hm.toFixed(2)}x
              </span>
            ))
          )}
        </div>

        {/* arena */}
        <div
          className="relative z-10 w-full overflow-hidden rounded-2xl border border-cyan-400/25 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]"
          style={{ aspectRatio: '16 / 11' }}
        >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

          <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[10px] font-bold text-gray-200 backdrop-blur-md">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            LIVE · {players} {players === 1 ? 'player' : 'players'} this round
          </div>
          {roundId !== null && (
            <div className="pointer-events-none absolute right-2 top-2 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[10px] font-bold text-gray-400 backdrop-blur-md">
              #{roundId}
            </div>
          )}

          {conn === 'error' && (
            <div className="absolute inset-x-0 top-10 z-20 mx-auto w-fit rounded-full border border-red-400/40 bg-red-500/20 px-3 py-1 text-[10px] font-bold text-red-200 backdrop-blur-md">
              {connMsg || 'Reconnecting…'}
            </div>
          )}

          {phase === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-cyan-300 border-t-transparent" />
            </div>
          )}

          {phase === 'betting' && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="rounded-2xl border border-cyan-300/30 bg-black/45 px-7 py-4 text-center backdrop-blur-md shadow-[0_0_40px_rgba(34,211,238,0.2)]">
                <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-cyan-200/90">
                  Place your bets
                </span>
                <span className="block font-mono text-5xl font-black tabular-nums text-white drop-shadow-[0_0_20px_rgba(34,211,238,0.6)]">
                  {countdown.toFixed(1)}
                  <span className="text-lg text-cyan-300">s</span>
                </span>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-fuchsia-400"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {phase === 'flying' && (
            <div className="pointer-events-none absolute inset-x-0 top-8 flex justify-center">
              <span
                className="font-mono text-5xl font-black tabular-nums sm:text-6xl"
                style={{
                  color: multColor(mult),
                  textShadow: `0 0 28px ${multColor(mult)}88`,
                }}
              >
                {mult.toFixed(2)}x
              </span>
            </div>
          )}

          {phase === 'crashed' && (
            <div className="pointer-events-none absolute inset-x-0 top-8 flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-[0.35em] text-red-300">
                Flew away
              </span>
              <span className="font-mono text-5xl font-black tabular-nums text-red-400 drop-shadow-[0_0_24px_rgba(248,113,113,0.7)] sm:text-6xl">
                {mult.toFixed(2)}x
              </span>
            </div>
          )}
        </div>

        {/* bet panels */}
        <div className="relative z-10 mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[1, 2].map((slot) => (
            <BetPanel
              key={slot}
              slot={slot}
              bet={bets[slot]}
              phase={phase}
              mult={mult}
              busy={!!busySlot[slot]}
              balance={redDiamonds}
              onPlace={placeBet}
              onCancel={cancelBet}
              onCash={cashOut}
            />
          ))}
        </div>

        {/* live bets */}
        <div className="relative z-10 mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              Live bets
            </span>
            <span className="text-[10px] font-bold text-gray-500">{players} this round</span>
          </div>
          <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
            {feed.length === 0 ? (
              <p className="py-3 text-center text-[11px] text-gray-600">No bets yet this round</p>
            ) : (
              feed.map((f, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-[11px] ${
                    f.status === 'won'
                      ? 'border-emerald-400/25 bg-emerald-500/10'
                      : f.status === 'lost'
                      ? 'border-red-400/20 bg-red-500/5'
                      : 'border-white/5 bg-white/[0.03]'
                  }`}
                >
                  <span className="font-bold text-gray-200">{f.name}</span>
                  <span className="tabular-nums text-gray-400">{f.amount.toLocaleString()} 🔴</span>
                  <span
                    className={`min-w-[90px] text-right font-black tabular-nums ${
                      f.status === 'won'
                        ? 'text-emerald-300'
                        : f.status === 'lost'
                        ? 'text-red-400'
                        : 'text-gray-500'
                    }`}
                  >
                    {f.status === 'won'
                      ? `${(f.mult ?? 0).toFixed(2)}x · +${f.payout.toLocaleString()}`
                      : f.status === 'lost'
                      ? 'lost'
                      : 'in play'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <p className="relative z-10 mt-3 text-center text-[9px] leading-relaxed text-gray-600">
          Bets 50–1,000 🔴 · Max win 50,000 🔴 per bet · Return to player 96% · Results are
          decided on the server
        </p>
      </div>
    </div>
  );
}

