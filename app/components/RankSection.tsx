'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { updateGlobalBalance } from '@/lib/wallet';

const supabaseUrl = 'https://ixaugtdwfxhmqypglder.supabase.co';
const supabaseAnonKey = 'sb_publishable_XRLDHfS-bDHlJJBzlGEmqQ_WetQ24cZ';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type DbTournamentType = 'day' | 'week' | 'mega';
type Tab = DbTournamentType;

type TournamentRow = {
  id: string;
  title: string;
  type: DbTournamentType;
  start_time: string;
  end_time: string;
  status: string;
  prize_pool: number;
  reward_distribution: number[] | null;
};

type LeaderboardRow = {
  rank: number;
  user_id: string;
  name: string;
  score: number;
  prize: number;
};

type MyEntry = {
  rank: number | null;
  score: number;
  prize: number;
};

const TAB_LABELS: Record<Tab, string> = {
  day: '☀️ Daily',
  week: '📅 Weekly',
  mega: '👑 Monthly',
};

const TAB_FULL: Record<Tab, string> = {
  day: 'DAILY',
  week: 'WEEKLY',
  mega: 'MONTHLY',
};

const RESULT_TEXT: Record<Tab, string> = {
  day: 'Daily: 6:00 AM – 6:00 PM NPT · Results published at 7:00 PM every day.',
  week: 'Weekly: Friday 6:00 AM – 6:00 PM NPT · Results published Friday 7:00 PM.',
  mega: 'Monthly: 1st of every month, 6:00 AM – 6:00 PM NPT · Results published same day 7:00 PM.',
};

function formatMoney(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString('en-IN');
}

function pickCurrentRecord(
  records: TournamentRow[],
  type: DbTournamentType
): TournamentRow | undefined {
  const matches = records
    .filter((r) => r.type === type)
    .slice()
    .sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

  if (matches.length === 0) return undefined;

  const now = Date.now();
  const started = matches.filter(
    (r) => new Date(r.start_time).getTime() <= now
  );

  if (started.length > 0) return started[started.length - 1];
  return matches[0];
}

function rankMedal(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '';
}

export default function RankSection() {
  const [activeTab, setActiveTab] = useState<Tab>('day');
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [myEntry, setMyEntry] = useState<MyEntry>({
    rank: null,
    score: 0,
    prize: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');

  const loadTournaments = useCallback(async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select(
        'id, title, type, start_time, end_time, status, prize_pool, reward_distribution'
      )
      .in('type', ['day', 'week', 'mega'])
      .order('start_time', { ascending: false })
      .limit(30);

    if (!error && data) {
      setTournaments(data as TournamentRow[]);
    }
  }, []);

  const record = useMemo(
    () => pickCurrentRecord(tournaments, activeTab),
    [tournaments, activeTab]
  );

  const resultsReady = useMemo(() => {
    if (!record) return false;
    return new Date(record.end_time).getTime() + 60 * 60 * 1000 <= Date.now();
  }, [record]);

  const loadLeaderboard = useCallback(async () => {
    if (!record) {
      setLeaderboard([]);
      setMyEntry({ rank: null, score: 0, prize: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) setCurrentUserId(user.id);

      if (resultsReady) {
        const { data: rewards, error } = await supabase
          .from('tournament_rewards')
          .select(
            'rank, reward_amount, user_id, profiles(nickname, gaming_nickname, full_name)'
          )
          .eq('tournament_id', record.id)
          .order('rank', { ascending: true });

        if (error) throw error;

        const rows: LeaderboardRow[] = (rewards || []).map((r: any) => ({
          rank: r.rank,
          user_id: r.user_id,
          name:
            r.profiles?.nickname ||
            r.profiles?.gaming_nickname ||
            r.profiles?.full_name ||
            'Player',
          score: 0,
          prize: Number(r.reward_amount) || 0,
        }));

        setLeaderboard(rows);

        const mine = user ? rows.find((r) => r.user_id === user.id) : undefined;

        if (mine) {
          setMyEntry({ rank: mine.rank, score: mine.score, prize: mine.prize });

          const syncKey = `synced_reward_${record.id}_${user!.id}`;

          if (typeof window !== 'undefined' && !localStorage.getItem(syncKey)) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('red_diamonds')
              .eq('id', user!.id)
              .maybeSingle();

            if (profile) {
              updateGlobalBalance(Number(profile.red_diamonds) || 0);
            }

            localStorage.setItem(syncKey, 'true');
          }
        } else if (user) {
          const { data: attempt } = await supabase
            .from('tournament_attempts')
            .select('score')
            .eq('tournament_id', record.id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (attempt) {
            const myScore = Number(attempt.score) || 0;
            const { count: higherCount } = await supabase
              .from('tournament_attempts')
              .select('id', { count: 'exact', head: true })
              .eq('tournament_id', record.id)
              .gt('score', myScore);

            setMyEntry({
              rank: (higherCount ?? 0) + 1,
              score: myScore,
              prize: 0,
            });
          } else {
            setMyEntry({ rank: null, score: 0, prize: 0 });
          }
        } else {
          setMyEntry({ rank: null, score: 0, prize: 0 });
        }
      } else {
        const { data: attempts, error } = await supabase
          .from('tournament_attempts')
          .select(
            'user_id, score, profiles(nickname, gaming_nickname, full_name)'
          )
          .eq('tournament_id', record.id)
          .in('status', ['submitted', 'validated'])
          .order('score', { ascending: false })
          .limit(10);

        if (error) throw error;

        const rows: LeaderboardRow[] = (attempts || []).map(
          (a: any, idx: number) => ({
            rank: idx + 1,
            user_id: a.user_id,
            name:
              a.profiles?.nickname ||
              a.profiles?.gaming_nickname ||
              a.profiles?.full_name ||
              'Player',
            score: Number(a.score) || 0,
            prize: 0,
          })
        );

        setLeaderboard(rows);

        const mine = user ? rows.find((r) => r.user_id === user.id) : undefined;

        setMyEntry(
          mine
            ? { rank: mine.rank, score: mine.score, prize: 0 }
            : { rank: null, score: 0, prize: 0 }
        );
      }
    } catch (err) {
      console.error('Leaderboard load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [record, resultsReady]);

  useEffect(() => {
    void loadTournaments();
    const interval = window.setInterval(() => void loadTournaments(), 60000);
    return () => window.clearInterval(interval);
  }, [loadTournaments]);

  useEffect(() => {
    void loadLeaderboard();
    const interval = window.setInterval(() => void loadLeaderboard(), 30000);
    return () => window.clearInterval(interval);
  }, [loadLeaderboard]);

  const prizeTiersText = record?.reward_distribution?.length
    ? `Top 10 prizes · 1st: ${formatMoney(
        record.reward_distribution[0]
      )} 🔴`
    : '';

  return (
    <div className="min-h-screen bg-[#05060c] text-white flex flex-col items-center pb-36 px-4 pt-5 select-none relative overflow-hidden">
      {/* Premium background glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-40 bg-pink-500/20 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-40 -left-20 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-60 -right-16 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl" />

      {/* Header */}
      <div className="relative z-10 text-center mb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-yellow-500/40 bg-yellow-500/10 mb-2">
          <span className="text-[10px] font-black tracking-[0.2em] text-yellow-300 uppercase">
            Arena Nepal
          </span>
        </div>
        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-pink-400 to-yellow-300 drop-shadow-[0_0_20px_rgba(236,72,153,0.45)]">
          🏆 HALL OF FAME
        </h1>
        <p className="text-[11px] text-gray-400 mt-1 font-medium">
          Live ranks · Official results at 7:00 PM
        </p>
      </div>

      {/* Schedule card */}
      <div className="relative z-10 w-full max-w-md mb-4 rounded-2xl border border-cyan-400/40 bg-gradient-to-br from-cyan-950/80 via-gray-950 to-purple-950/80 p-3.5 shadow-[0_0_30px_rgba(6,182,212,0.2)] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.12),transparent_60%)] pointer-events-none" />
        <p className="relative text-[10px] text-cyan-300 font-black uppercase tracking-[0.15em] mb-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Result schedule
        </p>
        <p className="relative text-[11px] text-yellow-200/95 font-bold leading-relaxed">
          {RESULT_TEXT[activeTab]}
        </p>
        {record && (
          <p className="relative mt-2 text-[10px] text-gray-400">
            {record.title} · Pool{' '}
            <span className="text-amber-300 font-black">
              {formatMoney(record.prize_pool)} 🔴
            </span>
            {' · '}
            <span
              className={
                resultsReady ? 'text-green-400 font-bold' : 'text-pink-300 font-bold'
              }
            >
              {resultsReady ? 'Results locked' : 'Live / waiting'}
            </span>
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="relative z-10 flex w-full max-w-md p-1.5 mb-5 rounded-2xl border border-white/10 bg-black/60 shadow-[0_8px_32px_rgba(0,0,0,0.5)] gap-1">
        {(['day', 'week', 'mega'] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 text-black shadow-[0_0_20px_rgba(236,72,153,0.45)] scale-[1.02]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Board */}
      <div className="relative z-10 w-full max-w-md flex flex-col gap-2.5 mb-4">
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-gray-900/50 py-12 text-center text-xs text-gray-400 font-bold">
            Loading arena ranks...
          </div>
        ) : !record ? (
          <div className="w-full rounded-2xl border border-purple-500/30 bg-gradient-to-b from-gray-900 to-black p-10 text-center shadow-xl">
            <span className="text-4xl">🏆</span>
            <p className="mt-3 text-sm font-black text-yellow-300">
              No tournament scheduled
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              Check back when the next event opens.
            </p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="w-full rounded-2xl border border-purple-500/30 bg-gradient-to-b from-gray-900 via-[#0c0a14] to-black p-10 text-center shadow-[0_0_40px_rgba(168,85,247,0.15)]">
            <span className="text-4xl animate-bounce">🏆</span>
            <p className="mt-3 text-sm font-black text-yellow-300">
              {resultsReady
                ? 'No entries for this tournament.'
                : `${TAB_FULL[activeTab]} — waiting for results`}
            </p>
            <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
              {resultsReady
                ? 'Nobody submitted a score for this event.'
                : 'Play in the tournament window. Official board locks at 7:00 PM.'}
            </p>
          </div>
        ) : (
          leaderboard.map((item) => {
            const isMe = item.user_id === currentUserId;
            const medal = rankMedal(item.rank);

            return (
              <div
                key={`${item.rank}-${item.user_id}`}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                  isMe
                    ? 'bg-gradient-to-r from-yellow-500/20 via-amber-950/40 to-yellow-500/10 border-yellow-400/80 shadow-[0_0_24px_rgba(234,179,8,0.35)] scale-[1.02]'
                    : item.rank <= 3
                      ? 'bg-gradient-to-r from-gray-900 via-purple-950/30 to-gray-900 border-purple-400/30 shadow-lg'
                      : 'bg-gray-900/80 border-gray-800/90 hover:border-purple-500/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 flex flex-col items-center justify-center rounded-xl text-xs font-black shadow-md shrink-0 ${
                      item.rank === 1
                        ? 'bg-gradient-to-b from-yellow-300 to-amber-500 text-black shadow-[0_0_16px_rgba(234,179,8,0.7)]'
                        : item.rank === 2
                          ? 'bg-gradient-to-b from-gray-100 to-gray-400 text-black'
                          : item.rank === 3
                            ? 'bg-gradient-to-b from-amber-500 to-amber-800 text-white'
                            : isMe
                              ? 'bg-yellow-400 text-black'
                              : 'bg-purple-950 text-cyan-300 border border-purple-500/40'
                    }`}
                  >
                    {medal ? (
                      <span className="text-base leading-none">{medal}</span>
                    ) : (
                      <span>#{item.rank}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold flex items-center gap-1.5 truncate">
                      <span
                        className={
                          isMe
                            ? 'text-yellow-200 font-black text-sm'
                            : 'text-white'
                        }
                      >
                        {item.name}
                      </span>
                      {isMe && (
                        <span className="shrink-0 bg-yellow-400 text-black text-[9px] px-1.5 py-0.5 rounded-md font-black">
                          YOU
                        </span>
                      )}
                    </p>
                    {resultsReady ? (
                      <p className="text-[10px] text-yellow-400 font-bold mt-0.5">
                        Prize · {formatMoney(item.prize)} 🔴
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                        Live standing
                      </p>
                    )}
                  </div>
                </div>

                {!resultsReady && (
                  <div className="text-right shrink-0 pl-2">
                    <p className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-300">
                      {item.score}
                    </p>
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider">
                      PTS
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Sticky your rank */}
      <div className="fixed bottom-16 left-0 right-0 px-4 flex justify-center z-30 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md rounded-2xl border-2 border-yellow-400/90 bg-gradient-to-r from-black via-gray-950 to-purple-950 p-3.5 shadow-[0_0_40px_rgba(234,179,8,0.35)] flex items-center justify-between backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 flex items-center justify-center bg-gradient-to-b from-yellow-300 to-amber-500 text-black rounded-xl text-xs font-black shadow-[0_0_16px_rgba(234,179,8,0.5)] shrink-0">
              {myEntry.rank ? `#${myEntry.rank}` : '—'}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black text-yellow-300 flex items-center gap-1.5 truncate">
                YOUR RANK · {TAB_FULL[activeTab]}
                <span className="bg-yellow-400 text-black text-[8px] px-1.5 py-0.5 rounded font-black">
                  YOU
                </span>
              </p>
              <p className="text-[10px] text-gray-300 font-semibold truncate">
                {resultsReady ? (
                  <>
                    Prize{' '}
                    <span className="text-yellow-300 font-black">
                      {formatMoney(myEntry.prize)} 🔴
                    </span>
                  </>
                ) : (
                  prizeTiersText || 'Play to climb the board'
                )}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-black text-cyan-300">{myEntry.score}</p>
            <p className="text-[9px] text-gray-500 tracking-wider">SCORE</p>
          </div>
        </div>
      </div>
    </div>
  );
}