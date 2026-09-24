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
  day: '☀️ Daily (Top 10)',
  week: '📅 Weekly (Top 10)',
  mega: '⚡ Mega (Top 10)',
};

const RESULT_TEXT: Record<Tab, string> = {
  day: '☀️ Daily Tournament: बिहान ६:०० देखि साँझ ६:०० सम्म | नतिजा: हरेक दिन बेलुका ७:०० बजे बोर्डमा आउनेछ।',
  week: '📅 Weekly Tournament: शुक्रबार बिहान ६:०० देखि साँझ ६:०० सम्म | नतिजा: शुक्रबार बेलुका ७:०० बजे बोर्डमा आउनेछ।',
  mega: '⚡ Mega Showdown: हरेक १० दिनमा १ दिन (बिहान ६:०० - साँझ ६:००) खुल्छ | नतिजा: उसै दिन बेलुका ७:०० बजे प्रकाशित हुनेछ।',
};

function formatMoney(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString('en-IN');
}

// The row this tab should show right now:
// the most recent row whose window has already started, else the
// nearest upcoming one (so a "waiting to open" state can be shown).
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

  // Results are locked in ~1 hour after the window closes (7 PM for a
  // 6 PM end time) — matches the distribute_due_tournaments() cron.
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
        // Final, locked results — read straight from tournament_rewards.
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

          // Sync the wallet exactly once per reward, not on every refresh.
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
          // Not in the top 10 — still show their own score/rank if they played.
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
        // Still open or results not published yet — show live standings
        // by score only (no prize shown before 7 PM).
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
    ? `Top 10 win prizes — 1st: ${formatMoney(
        record.reward_distribution[0]
      )} Red Dias`
    : '';

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center pb-32 px-4 pt-6 select-none relative">
      <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400 drop-shadow-[0_0_15px_rgba(236,72,153,0.6)]">
        LEADERBOARD & RESULTS
      </h1>
      <p className="text-xs text-gray-400 mb-2">
        Check out top rankings & tournament results 🏆
      </p>

      <div className="w-full max-w-md bg-gradient-to-r from-purple-950/80 via-gray-900 to-cyan-950/80 border-2 border-cyan-400/60 p-3 rounded-2xl mb-4 shadow-[0_0_20px_rgba(6,182,212,0.3)] text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-pink-500/10 animate-pulse pointer-events-none" />
        <p className="text-[11px] text-cyan-300 font-black uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
          ⚡ RESULT SCHEDULE (नतिजा प्रकाशन समय) ⚡
        </p>
        <p className="text-[10px] text-yellow-300 font-bold leading-relaxed">
          {RESULT_TEXT[activeTab]}
        </p>
      </div>

      <div className="flex bg-gray-900 p-1.5 rounded-2xl mb-5 border border-purple-500/40 gap-1 w-full max-w-md justify-center shadow-lg">
        {(['day', 'week', 'mega'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-[0_0_12px_rgba(236,72,153,0.5)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <div className="w-full max-w-md flex flex-col gap-2.5 mb-4">
        {loading ? (
          <div className="text-center text-xs text-gray-400 py-8">
            Loading...
          </div>
        ) : !record ? (
          <div className="w-full bg-gray-900/60 border border-purple-500/30 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-2 shadow-xl">
            <span className="text-3xl">🏆</span>
            <p className="text-xs text-yellow-300 font-black">
              No tournament scheduled yet.
            </p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="w-full bg-gray-900/60 border border-purple-500/30 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-2 shadow-xl">
            <span className="text-3xl animate-bounce">🏆</span>
            <p className="text-xs text-yellow-300 font-black">
              {resultsReady
                ? 'No entries for this tournament.'
                : `Waiting for ${activeTab.toUpperCase()} Tournament Results!`}
            </p>
            <p className="text-[10px] text-gray-400">
              Results will appear sharply at 7:00 PM. Play now to secure your rank!
            </p>
          </div>
        ) : (
          leaderboard.map((item) => {
            const isMe = item.user_id === currentUserId;
            return (
              <div
                key={item.rank}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                  isMe
                    ? 'bg-yellow-500/15 border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)] scale-[1.02]'
                    : 'bg-gray-900/80 border-gray-800 hover:border-purple-500/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 flex items-center justify-center rounded-xl text-xs font-black shadow-md ${
                      item.rank === 1
                        ? 'bg-yellow-400 text-black shadow-[0_0_10px_rgba(234,179,8,0.8)]'
                        : item.rank === 2
                        ? 'bg-gray-300 text-black'
                        : item.rank === 3
                        ? 'bg-amber-600 text-white'
                        : isMe
                        ? 'bg-yellow-500 text-black'
                        : 'bg-purple-900/80 text-cyan-300 border border-purple-500/40'
                    }`}
                  >
                    #{item.rank}
                  </span>
                  <div>
                    <p className="text-xs font-bold flex items-center gap-1.5">
                      <span
                        className={
                          isMe ? 'text-yellow-300 font-black text-sm' : 'text-white'
                        }
                      >
                        {item.name}
                      </span>
                      {isMe && (
                        <span className="bg-yellow-400 text-black text-[9px] px-1.5 py-0.5 rounded-md font-black shadow">
                          YOU
                        </span>
                      )}
                    </p>
                    {resultsReady && (
                      <p className="text-[10px] text-yellow-400 font-bold">
                        Prize: {formatMoney(item.prize)} Red Dias 🔴
                      </p>
                    )}
                  </div>
                </div>
                {!resultsReady && (
                  <div className="text-right">
                    <p className="text-xs font-black text-cyan-400">
                      {item.score} PTS
                    </p>
                    <p className="text-[9px] text-gray-500 uppercase">Score</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="fixed bottom-16 left-0 right-0 px-4 flex justify-center z-30">
        <div className="w-full max-w-md bg-gradient-to-r from-gray-950 via-gray-900 to-purple-950 border-2 border-yellow-400 p-3.5 rounded-2xl shadow-[0_0_25px_rgba(234,179,8,0.3)] flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 flex items-center justify-center bg-yellow-400 text-black rounded-xl text-xs font-black shadow-lg">
              {myEntry.rank ? `#${myEntry.rank}` : '--'}
            </span>
            <div>
              <p className="text-xs font-black text-yellow-400 flex items-center gap-1.5">
                YOUR RANK ({activeTab.toUpperCase()})
                <span className="bg-yellow-400 text-black text-[9px] px-1.5 py-0.5 rounded font-black">
                  YOU
                </span>
              </p>
              <p className="text-[10px] text-gray-300 font-semibold">
                {resultsReady ? (
                  <>
                    Prize:{' '}
                    <span className="text-yellow-300 font-bold">
                      {formatMoney(myEntry.prize)} Red Dias
                    </span>
                  </>
                ) : (
                  prizeTiersText
                )}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-cyan-400">
              {myEntry.score} PTS
            </p>
            <p className="text-[9px] text-gray-400">SCORE</p>
          </div>
        </div>
      </div>
    </div>
  );
}

