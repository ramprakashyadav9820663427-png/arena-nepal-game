'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  getWalletBalance,
  updateGlobalBalance,
} from '@/lib/wallet';

const supabaseUrl = 'https://ixaugtdwfxhmqypglder.supabase.co';
const supabaseAnonKey = 'sb_publishable_XRLDHfS-bDHlJJBzlGEmqQ_WetQ24cZ';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 🔒 Tournaments lock switch.
// true  = every tournament shows "Tournament Closed" and nobody can join.
// false = tournaments work normally again.
const TOURNAMENTS_LOCKED = true;

type TournamentType = 'NONE' | 'DAY' | 'WEEK' | 'MEGA';
type DbTournamentType = 'day' | 'week' | 'mega';

type TournamentRecord = {
  id: string;
  title: string;
  type: DbTournamentType;
  start_time: string | null;
  end_time: string | null;
  status: string;
  entry_fee: number | null;
  prize_pool: number | null;
  reward_distribution: unknown;
  game_key: string | null;
};

type GameObstacle = {
  x: number;
  y: number;
  size: number;
  speed: number;
};

const TYPE_MAP: Record<TournamentType, DbTournamentType | null> = {
  NONE: null,
  DAY: 'day',
  WEEK: 'week',
  MEGA: 'mega',
};

const FALLBACK_FEES: Record<DbTournamentType, number> = {
  day: 200,
  week: 300,
  mega: 500,
};

const FALLBACK_TIERS: Record<DbTournamentType, number[]> = {
  day: [1500, 1400, 1300, 1200, 1000, 900, 800, 700, 650, 550],
  week: [7000, 5000, 3500, 2500, 2000, 1500, 1200, 1000, 800, 500],
  mega: [15000, 7000, 6000, 5000, 4000, 3200, 2800, 2500, 2300, 2200],
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Something went wrong. Please try again.';
}

function formatMoney(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString('en-IN');
}

function formatSurviveTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function getTournamentLabel(type: TournamentType): string {
  if (type === 'DAY') return 'DAILY TOURNAMENT';
  if (type === 'WEEK') return 'WEEKLY TOURNAMENT';
  if (type === 'MEGA') return 'MONTHLY TOURNAMENT';
  return 'TOURNAMENT';
}

function getTournamentWindow(type: TournamentType): string {
  if (type === 'DAY') return 'Daily: 6:00 AM – 6:00 PM NPT · Result 7:00 PM';
  if (type === 'WEEK')
    return 'Every Friday: 6:00 AM – 6:00 PM NPT · Result 7:00 PM';
  if (type === 'MEGA')
    return '1st of every month: 6:00 AM – 6:00 PM NPT · Result 7:00 PM';
  return '';
}

function getFirstPrize(
  record: TournamentRecord | undefined,
  dbType: DbTournamentType
): number {
  const dist = record?.reward_distribution;
  if (Array.isArray(dist) && dist.length > 0 && typeof dist[0] === 'number') {
    return dist[0];
  }
  return FALLBACK_TIERS[dbType][0];
}

function isRecordOpen(tournament: TournamentRecord): boolean {
  const now = Date.now();
  if (tournament.status !== 'active') return false;
  if (
    tournament.start_time &&
    new Date(tournament.start_time).getTime() > now
  ) {
    return false;
  }
  if (
    tournament.end_time &&
    new Date(tournament.end_time).getTime() <= now
  ) {
    return false;
  }
  return true;
}

function pickTournamentRecord(
  records: TournamentRecord[],
  dbType: DbTournamentType
): TournamentRecord | undefined {
  const matches = records.filter((item) => item.type === dbType);
  if (matches.length === 0) return undefined;

  const now = Date.now();
  const open = matches.find((item) => isRecordOpen(item));
  if (open) return open;

  const upcoming = matches
    .filter(
      (item) =>
        item.start_time && new Date(item.start_time).getTime() > now
    )
    .sort(
      (a, b) =>
        new Date(a.start_time as string).getTime() -
        new Date(b.start_time as string).getTime()
    )[0];

  if (upcoming) return upcoming;

  return matches
    .slice()
    .sort(
      (a, b) =>
        new Date(b.start_time ?? 0).getTime() -
        new Date(a.start_time ?? 0).getTime()
    )[0];
}

export default function TournamentSection() {
  const [redDiamonds, setRedDiamonds] = useState(0);
  const [activeTournament, setActiveTournament] =
    useState<TournamentType>('NONE');

  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);

  const [inLobby, setInLobby] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Survive time (counts UP) — no 5-minute limit
  const [surviveSeconds, setSurviveSeconds] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success' | ''>(
    ''
  );

  const [playerName, setPlayerName] = useState('Player');
  const [playerUid, setPlayerUid] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playerRef = useRef({ x: 150, y: 350, size: 20 });
  const obstaclesRef = useRef<GameObstacle[]>([]);

  const scoreRef = useRef(0);
  const surviveSecondsRef = useRef(0);
  const activeTournamentRef = useRef<TournamentType>('NONE');
  const gameStartedRef = useRef(false);
  const gameOverRef = useRef(false);
  const submittingRef = useRef(false);

  const activeRecord = pickTournamentRecord(
    tournaments,
    TYPE_MAP[activeTournament] as DbTournamentType
  );

  const showMessage = useCallback(
    (text: string, type: 'error' | 'success' = 'error') => {
      setMessage(text);
      setMessageType(type);
    },
    []
  );

  const clearMessage = useCallback(() => {
    setMessage('');
    setMessageType('');
  }, []);

  const loadProfile = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;

    if (!user) {
      setRedDiamonds(0);
      setPlayerName('Player');
      setPlayerUid('');
      return null;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('nickname, gaming_nickname, full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;

    const globalBalance = await getWalletBalance();
    const red = Number(globalBalance ?? 0);
    setRedDiamonds(red);

    if (profile) {
      const name =
        profile.nickname ||
        profile.gaming_nickname ||
        profile.full_name ||
        user.email ||
        'Player';
      setPlayerName(name);
    } else {
      setPlayerName(user.email || 'Player');
    }

    setPlayerUid(user.id);
    return red;
  }, []);

  const loadTournaments = useCallback(async () => {
    setLoadingTournaments(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select(
          'id, title, type, start_time, end_time, status, entry_fee, prize_pool, reward_distribution, game_key'
        )
        .in('type', ['day', 'week', 'mega'])
        .order('start_time', { ascending: false })
        .limit(30);

      if (error) throw error;
      setTournaments((data || []) as TournamentRecord[]);
    } catch (error) {
      showMessage(`Could not load tournaments: ${getErrorMessage(error)}`);
    } finally {
      setLoadingTournaments(false);
    }
  }, [showMessage]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        await Promise.all([loadProfile(), loadTournaments()]);
      } catch (error) {
        if (mounted) showMessage(getErrorMessage(error));
      }
    };

    void initialize();

    const handleStorage = () => {
      void loadProfile().catch((error) => {
        showMessage(getErrorMessage(error));
      });
    };

    const handleWalletUpdated = () => {
      void loadProfile().catch((error) => {
        showMessage(getErrorMessage(error));
      });
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('walletUpdated', handleWalletUpdated);

    return () => {
      mounted = false;
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('walletUpdated', handleWalletUpdated);
    };
  }, [loadProfile, loadTournaments, showMessage]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadTournaments();
    }, 60000);
    return () => window.clearInterval(interval);
  }, [loadTournaments]);

  const playSound = useCallback((type: 'score' | 'gameover') => {
    try {
      if (typeof window === 'undefined') return;

      if (!audioCtxRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (
            window as typeof window & {
              webkitAudioContext?: typeof AudioContext;
            }
          ).webkitAudioContext;
        if (!AudioContextClass) return;
        audioCtxRef.current = new AudioContextClass();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') void ctx.resume();

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;

      if (type === 'score') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(587.33, now);
        oscillator.frequency.setValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        oscillator.start(now);
        oscillator.stop(now + 0.2);
      } else {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.frequency.linearRampToValueAtTime(60, now + 0.4);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
        oscillator.start(now);
        oscillator.stop(now + 0.4);
      }
    } catch (error) {
      console.error('Audio error:', error);
    }
  }, []);

  const submitScore = useCallback(
    async (finalScore: number, finalDistance: number) => {
      if (submittingRef.current) return;

      submittingRef.current = true;
      setLoadingAction(true);
      clearMessage();

      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!sessionData.session?.user) {
          throw new Error('Please login again to submit your score.');
        }

        const tournamentId = activeRecord?.id;
        if (!tournamentId) {
          throw new Error('Tournament record not found.');
        }

        const { data, error } = await supabase.rpc(
          'submit_tournament_attempt',
          {
            p_tournament_id: tournamentId,
            p_score: Math.max(0, Math.floor(finalScore)),
            p_distance: Math.max(0, finalDistance),
            p_remaining_lives: 0,
          }
        );

        if (error) throw error;

        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          (data as { success?: boolean }).success === false
        ) {
          throw new Error('Score submission was not accepted.');
        }

        setGameStarted(false);
        gameStartedRef.current = false;
        setGameOver(true);
        gameOverRef.current = true;
        setInLobby(false);

        showMessage('Your score was submitted successfully.', 'success');

        const freshBalance = await loadProfile();
        if (freshBalance !== null) {
          updateGlobalBalance(freshBalance);
        }

        await loadTournaments();
      } catch (error) {
        showMessage(`Score submission failed: ${getErrorMessage(error)}`);
      } finally {
        setLoadingAction(false);
      }
    },
    [activeRecord, clearMessage, loadProfile, loadTournaments, showMessage]
  );

  const finishGame = useCallback(
    async (finalScore: number) => {
      if (gameOverRef.current || submittingRef.current) return;

      gameOverRef.current = true;
      gameStartedRef.current = false;
      setGameStarted(false);
      setGameOver(true);
      playSound('gameover');

      await submitScore(finalScore, Math.max(0, finalScore));
    },
    [playSound, submitScore]
  );

  const handleJoinClick = useCallback(
    async (type: TournamentType) => {
      clearMessage();
      if (type === 'NONE') return;

      if (TOURNAMENTS_LOCKED) {
        showMessage('Tournament Closed');
        return;
      }

      const dbType = TYPE_MAP[type] as DbTournamentType;
      const record = pickTournamentRecord(tournaments, dbType);

      if (!record) {
        showMessage(`${getTournamentLabel(type)} is not configured yet.`);
        return;
      }

      if (!isRecordOpen(record)) {
        showMessage(
          `${getTournamentLabel(type)} is currently closed. Check its schedule.`
        );
        return;
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        showMessage('Please login before joining a tournament.');
        return;
      }

      setLoadingAction(true);

      try {
        const { data: existing, error: existingError } = await supabase
          .from('tournament_participants')
          .select('id, status')
          .eq('tournament_id', record.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingError) throw existingError;

        if (existing) {
          showMessage(
            existing.status === 'completed' || existing.status === 'started'
              ? 'You have already used your attempt for this tournament.'
              : 'You have already joined this tournament. Contact support if you cannot continue.'
          );
          return;
        }

        const fee = Number(record.entry_fee ?? FALLBACK_FEES[record.type]);
        const latestGlobalBalance = Number((await getWalletBalance()) ?? 0);
        setRedDiamonds(latestGlobalBalance);

        if (latestGlobalBalance < fee) {
          showMessage(
            `Not enough Red Diamonds. You need ${fee} Red Diamonds.`
          );
          return;
        }

        const { data, error } = await supabase.rpc('join_tournament', {
          p_tournament_id: record.id,
        });

        if (error) throw error;

        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          (data as { success?: boolean }).success === false
        ) {
          throw new Error('Tournament join was not accepted.');
        }

        setActiveTournament(type);
        activeTournamentRef.current = type;
        setInLobby(true);
        setGameStarted(false);
        gameStartedRef.current = false;
        setGameOver(false);
        gameOverRef.current = false;
        setScore(0);
        scoreRef.current = 0;
        setSurviveSeconds(0);
        surviveSecondsRef.current = 0;
        submittingRef.current = false;

        const freshBalance = await loadProfile();
        if (freshBalance !== null) {
          updateGlobalBalance(freshBalance);
        }
      } catch (error) {
        showMessage(getErrorMessage(error));
        await loadProfile().catch(() => undefined);
      } finally {
        setLoadingAction(false);
      }
    },
    [clearMessage, loadProfile, showMessage, tournaments]
  );

  const startTourneyGamePlay = useCallback(async () => {
    clearMessage();

    const dbType = TYPE_MAP[activeTournament] as DbTournamentType;
    const record = pickTournamentRecord(tournaments, dbType);

    if (!record) {
      showMessage('Tournament record not found.');
      return;
    }

    if (!isRecordOpen(record)) {
      showMessage('This tournament has ended or is not open yet.');
      return;
    }

    setLoadingAction(true);

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session?.user) {
        throw new Error('Please login before starting.');
      }

      const { data, error } = await supabase.rpc('start_tournament_attempt', {
        p_tournament_id: record.id,
      });

      if (error) throw error;

      if (
        !data ||
        typeof data !== 'object' ||
        !('success' in data) ||
        !(data as { success?: boolean }).success
      ) {
        throw new Error('Could not start tournament attempt.');
      }

      setInLobby(false);
      setGameStarted(true);
      gameStartedRef.current = true;
      setGameOver(false);
      gameOverRef.current = false;
      setScore(0);
      scoreRef.current = 0;
      setSurviveSeconds(0);
      surviveSecondsRef.current = 0;
      playerRef.current = { x: 150, y: 350, size: 20 };
      obstaclesRef.current = [];
      submittingRef.current = false;
    } catch (error) {
      showMessage(getErrorMessage(error));
    } finally {
      setLoadingAction(false);
    }
  }, [activeTournament, clearMessage, showMessage, tournaments]);

  const exitToTournaments = useCallback(() => {
    setGameStarted(false);
    gameStartedRef.current = false;
    setInLobby(false);
    setGameOver(false);
    gameOverRef.current = false;
    setActiveTournament('NONE');
    activeTournamentRef.current = 'NONE';
    setScore(0);
    scoreRef.current = 0;
    setSurviveSeconds(0);
    surviveSecondsRef.current = 0;
    clearMessage();

    void loadProfile().catch((error) => {
      showMessage(getErrorMessage(error));
    });
  }, [clearMessage, loadProfile, showMessage]);

  // Survive timer counts UP — does NOT end the game
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const timer = window.setInterval(() => {
      setSurviveSeconds((previous) => {
        const next = previous + 1;
        surviveSecondsRef.current = next;
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [gameStarted, gameOver]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId = 0;
    let lastFrameTime = 0;

    const updateGame = (timestamp: number) => {
      if (!gameStartedRef.current || gameOverRef.current) return;

      if (!lastFrameTime) lastFrameTime = timestamp;
      const delta = Math.min((timestamp - lastFrameTime) / 16.67, 2);
      lastFrameTime = timestamp;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(0, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }

      const currentTournament = activeTournamentRef.current;
      const speedMultiplier =
        currentTournament === 'MEGA'
          ? 1.5
          : currentTournament === 'WEEK'
            ? 1.2
            : 1;
      const spawnChance = currentTournament === 'MEGA' ? 0.04 : 0.03;

      if (Math.random() < spawnChance * delta) {
        obstaclesRef.current.push({
          x: Math.random() * (canvas.width - 24),
          y: -24,
          size: 16 + Math.random() * 8,
          speed: 2.2 * speedMultiplier,
        });
      }

      ctx.fillStyle =
        currentTournament === 'MEGA' ? '#ff3300' : '#ff0055';
      ctx.shadowBlur = 8;
      ctx.shadowColor =
        currentTournament === 'MEGA' ? '#ff3300' : '#ff0055';

      const player = playerRef.current;

      for (let index = obstaclesRef.current.length - 1; index >= 0; index--) {
        const obstacle = obstaclesRef.current[index];
        obstacle.y += obstacle.speed * delta;

        ctx.fillRect(obstacle.x, obstacle.y, obstacle.size, obstacle.size);

        const collision =
          player.x < obstacle.x + obstacle.size &&
          player.x + player.size > obstacle.x &&
          player.y < obstacle.y + obstacle.size &&
          player.y + player.size > obstacle.y;

        if (collision) {
          void finishGame(scoreRef.current);
          return;
        }

        if (obstacle.y > canvas.height) {
          obstaclesRef.current.splice(index, 1);
          const points = currentTournament === 'MEGA' ? 20 : 10;
          scoreRef.current += points;
          setScore(scoreRef.current);
          playSound('score');
        }
      }

      ctx.shadowBlur = 0;
      ctx.fillStyle =
        currentTournament === 'MEGA' ? '#ffcc00' : '#00ffcc';
      ctx.shadowBlur = 12;
      ctx.shadowColor =
        currentTournament === 'MEGA' ? '#ffcc00' : '#00ffcc';
      ctx.fillRect(player.x, player.y, player.size, player.size);
      ctx.shadowBlur = 0;

      animationId = window.requestAnimationFrame(updateGame);
      requestRef.current = animationId;
    };

    animationId = window.requestAnimationFrame(updateGame);
    requestRef.current = animationId;

    return () => {
      window.cancelAnimationFrame(animationId);
    };
  }, [gameStarted, gameOver, playSound, finishGame]);

  useEffect(() => {
    return () => {
      window.cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const handleInteraction = (
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas || !gameStartedRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const clientX =
      'touches' in event ? event.touches[0]?.clientX : event.clientX;
    if (clientX === undefined) return;

    const scaleX = canvas.width / rect.width;
    const x = (clientX - rect.left) * scaleX;

    playerRef.current.x = Math.max(
      0,
      Math.min(canvas.width - playerRef.current.size, x)
    );
  };

  const renderTournamentCard = (
    type: TournamentType,
    icon: string,
    color: string
  ) => {
    const dbType = TYPE_MAP[type] as DbTournamentType;
    const record = pickTournamentRecord(tournaments, dbType);
    const open =
      !TOURNAMENTS_LOCKED && (record ? isRecordOpen(record) : false);
    const fee = record
      ? Number(record.entry_fee ?? FALLBACK_FEES[dbType])
      : FALLBACK_FEES[dbType];
    const firstPrize = getFirstPrize(record, dbType);

    return (
      <div
        key={type}
        className={`bg-gradient-to-br from-gray-900 via-purple-950/40 to-gray-900 border ${color} rounded-3xl p-4 flex flex-col gap-3 shadow-2xl relative overflow-hidden`}
      >
        <div className="absolute -right-8 -top-8 bg-yellow-500/15 w-24 h-24 rounded-full blur-xl pointer-events-none" />

        <div className="flex justify-between items-center gap-2">
          <span className="text-xs font-black text-yellow-400 uppercase tracking-wider">
            {icon} {getTournamentLabel(type)}
          </span>
          <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-2.5 py-1 rounded-xl border border-yellow-500/40 font-black whitespace-nowrap">
            {formatMoney(fee)} Red Dias 🔴
          </span>
        </div>

        <p className="text-xs text-yellow-300 font-bold leading-relaxed">
          {record
            ? `Total Prize Pool: ${formatMoney(record.prize_pool)} Red Diamonds`
            : 'Tournament schedule is not configured.'}
          {' | '}
          <span className="text-white font-black">
            Top 10 win — 1st: {formatMoney(firstPrize)} Red Dias
          </span>
        </p>

        <p className="text-[11px] text-gray-400">
          {getTournamentWindow(type)}
        </p>

        <p className="text-[10px] text-cyan-400/80">
          Survive as long as you can · No time limit
        </p>

        {record && (
          <p className="text-[10px] text-gray-500 break-all">
            {record.title} · {record.status}
          </p>
        )}

        {!record || !open ? (
          <div className="w-full py-2.5 bg-red-950/80 text-red-400 font-bold text-xs rounded-2xl text-center border border-red-500/30">
            🔒{' '}
            {TOURNAMENTS_LOCKED || record
              ? 'Tournament Closed'
              : 'Not Configured'}
          </div>
        ) : (
          <button
            type="button"
            disabled={loadingAction || loadingTournaments}
            onClick={() => void handleJoinClick(type)}
            className="w-full py-3 bg-gradient-to-r from-yellow-400 via-pink-500 to-cyan-400 text-black font-black text-xs rounded-2xl shadow-xl active:scale-95 transition-all cursor-pointer uppercase tracking-wider disabled:opacity-50"
          >
            {loadingAction
              ? 'PLEASE WAIT...'
              : `🚀 JOIN ${getTournamentLabel(type)} (${fee} Dias)`}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center select-none pb-10">
      {message && (
        <div
          role="status"
          className={`w-full max-w-md mb-3 p-3 rounded-xl border text-xs font-bold ${
            messageType === 'success'
              ? 'bg-green-950/60 border-green-500/40 text-green-300'
              : 'bg-red-950/60 border-red-500/40 text-red-300'
          }`}
        >
          {message}
        </div>
      )}

      {inLobby ? (
        <div className="w-full max-w-md bg-gray-900 border border-purple-500/40 rounded-3xl p-5 flex flex-col items-center shadow-2xl relative text-center">
          <h2 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 uppercase mb-3">
            {getTournamentLabel(activeTournament)} LOBBY
          </h2>

          <div className="bg-black/60 p-4 rounded-2xl border border-red-500/40 mb-5 text-left">
            <p className="text-xs text-red-400 font-bold mb-1">
              Important Warning
            </p>
            <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
              Survive as long as you can. There is no 5-minute limit.
              Score increases while you avoid obstacles. One hit = match over.
              One attempt only — no restart.
            </p>
          </div>

          <button
            type="button"
            disabled={loadingAction}
            onClick={() => void startTourneyGamePlay()}
            className="w-full py-3 bg-gradient-to-r from-cyan-400 to-pink-500 text-black font-black text-xs rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {loadingAction
              ? 'STARTING...'
              : '▶️ START MATCH (SURVIVE MODE)'}
          </button>

          <button
            type="button"
            onClick={exitToTournaments}
            className="w-full mt-2 py-2 bg-gray-800 text-gray-300 font-bold text-xs rounded-xl"
          >
            Back to Tournaments
          </button>
        </div>
      ) : gameStarted || gameOver ? (
        <div className="w-full max-w-md bg-gray-900 border border-purple-500/40 rounded-3xl p-4 flex flex-col items-center shadow-2xl relative">
          <div className="w-full flex justify-between items-center mb-3 bg-black/60 px-3 py-2 rounded-2xl border border-gray-800">
            <span className="text-xs font-black text-yellow-400">
              ⏱️ Survive {formatSurviveTime(surviveSeconds)}
            </span>
            <span className="text-xs font-black text-cyan-300">
              Score: {score}
            </span>
          </div>

          <div className="relative w-full max-w-[320px] h-[420px] bg-black rounded-2xl border border-cyan-500/30 overflow-hidden flex flex-col items-center justify-center">
            {gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md z-10 p-4 text-center gap-2">
                <h2 className="text-base font-black text-red-500 uppercase">
                  Match Over
                </h2>
                <p className="text-xs text-gray-300">
                  Survived:{' '}
                  <span className="text-yellow-300 font-bold">
                    {formatSurviveTime(surviveSeconds)}
                  </span>
                </p>
                <p className="text-xs text-gray-300">
                  Player:{' '}
                  <span className="text-white font-bold">{playerName}</span>
                </p>
                <p className="text-xs text-gray-300">
                  UID:{' '}
                  <span className="text-cyan-300 font-bold">
                    {playerUid || '—'}
                  </span>
                </p>
                <p className="text-xs text-gray-300">
                  Score:{' '}
                  <span className="text-cyan-400 font-bold">{score}</span>
                </p>

                {loadingAction && (
                  <p className="text-xs text-yellow-300">
                    Submitting your score...
                  </p>
                )}

                {!loadingAction && messageType === 'error' && (
                  <p className="text-xs text-red-300">
                    Score submission needs attention. Do not start another
                    match.
                  </p>
                )}

                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={exitToTournaments}
                  className="w-full py-2 bg-gray-800 text-gray-300 font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50"
                >
                  Exit to Tournaments
                </button>
              </div>
            )}

            <canvas
              ref={canvasRef}
              width={320}
              height={420}
              onMouseMove={handleInteraction}
              onTouchMove={handleInteraction}
              className="w-full h-full cursor-crosshair touch-none"
            />
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md flex flex-col gap-4">
          <div className="flex justify-between items-center bg-gray-900/90 border border-purple-500/30 px-4 py-2.5 rounded-2xl">
            <span className="text-xs font-bold text-gray-300">
              Your Red Diamonds:
            </span>
            <span className="text-xs font-black text-red-400">
              {formatMoney(redDiamonds)} 🔴
            </span>
          </div>

          <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400">
            ACTIVE TOURNAMENTS
          </h2>

          {loadingTournaments ? (
            <div className="text-center text-sm text-gray-400 py-8">
              Loading tournaments...
            </div>
          ) : (
            <>
              {renderTournamentCard('DAY', '☀️', 'border-yellow-500/50')}
              {renderTournamentCard('WEEK', '📅', 'border-blue-500/50')}
              {renderTournamentCard('MEGA', '📅', 'border-pink-500/50')}
            </>
          )}
        </div>
      )}
    </div>
  );
}

