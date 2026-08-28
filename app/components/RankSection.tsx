'use client';
import React, { useState, useEffect } from 'react';

export default function RankPage() {
  const [tab, setTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Real user state (Fresh start with 0 points)
  const [currentUserName, setCurrentUserName] = useState('Ramprakash');
  const [leaderboardData, setLeaderboardData] = useState({
    daily: [],
    weekly: [],
    monthly: [],
  });

  const [userRankData, setUserRankData] = useState({
    daily: {
      rank: '--',
      name: 'Ramprakash (YOU)',
      prize: 'NPR 0',
      points: '0',
    },
    weekly: {
      rank: '--',
      name: 'Ramprakash (YOU)',
      prize: 'NPR 0',
      points: '0',
    },
    monthly: {
      rank: '--',
      name: 'Ramprakash (YOU)',
      prize: 'NPR 0',
      points: '0',
    },
  });

  // Function to fetch or reset leaderboard data dynamically (Simulating 10:00 AM Daily Refresh)
  useEffect(() => {
    const fetchLeaderboard = () => {
      // Yahan par hum check kar sakte hain ya API/Supabase se data la sakte hain.
      // Filhal fresh/empty state ya local storage se real user data uthayenge.

      const savedPoints = localStorage.getItem('arena_user_points') || '0';

      setUserRankData((prev) => ({
        ...prev,
        daily: { ...prev.daily, points: savedPoints },
      }));
    };

    fetchLeaderboard();

    // 10:00 AM Automatic Update Checker
    const checkTenAMUpdate = setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Jab bhi subah ke 10:00 bajenge (10:00 AM), yeh automatic refresh trigger karega
      if (hours === 10 && minutes === 0) {
        console.log(
          '🕒 10:00 AM reached! Updating Leaderboard automatically...'
        );
        fetchLeaderboard();
      }
    }, 60000); // Har 1 minute mein check karega

    return () => clearInterval(checkTenAMUpdate);
  }, []);

  const currentUserRankInfo = userRankData[tab];
  const currentList = leaderboardData[tab] || [];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center pb-32 px-4 pt-6 select-none relative">
      <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
        LEADERBOARD
      </h1>
      <p className="text-xs text-gray-400 mb-1">Check out top rankings 🏆</p>
      <p className="text-[10px] text-yellow-400/80 mb-4">
        ⏰ Next Auto-Update: Daily at 10:00 AM
      </p>

      {/* Tabs */}
      <div className="flex bg-gray-900 p-1 rounded-xl mb-6 border border-gray-800">
        {(['daily', 'weekly', 'monthly'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
              tab === t
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                : 'text-gray-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="w-full max-w-md flex flex-col gap-2 mb-4">
        {currentList.length === 0 ? (
          <div className="w-full bg-gray-900/40 border border-gray-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-2">
            <span className="text-2xl">📊</span>
            <p className="text-xs text-gray-300 font-bold">
              No rankings yet for this tournament cycle!
            </p>
            <p className="text-[10px] text-gray-500">
              Play games & score points to get on the leaderboard. Updates daily
              at 10:00 AM.
            </p>
          </div>
        ) : (
          currentList.map((item: any) => {
            const isMe = item.name === currentUserName;
            return (
              <div
                key={item.rank}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isMe
                    ? 'bg-yellow-500/10 border-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.3)]'
                    : 'bg-gray-900/60 border-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-black ${
                      isMe
                        ? 'bg-yellow-500 text-black'
                        : 'bg-purple-600 text-white'
                    }`}
                  >
                    {item.rank}
                  </span>
                  <div>
                    <p className="text-xs font-bold flex items-center gap-1.5">
                      <span
                        className={
                          isMe ? 'text-yellow-300 font-extrabold' : 'text-white'
                        }
                      >
                        {item.name}
                      </span>
                      {isMe && (
                        <span className="bg-yellow-500/20 text-yellow-400 text-[9px] px-1.5 py-0.5 rounded font-bold border border-yellow-500/30">
                          YOU
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-yellow-400">
                      Prize: {item.prize}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-cyan-400">
                    {item.points}
                  </p>
                  <p className="text-[9px] text-gray-500">POINTS</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sticky Bottom "Your Rank" Bar */}
      <div className="fixed bottom-16 left-0 right-0 px-4 flex justify-center z-30">
        <div className="w-full max-w-md bg-gradient-to-r from-gray-900 via-gray-900 to-purple-950 border-2 border-yellow-400/80 p-3 rounded-2xl shadow-2xl flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 flex items-center justify-center bg-yellow-400 text-black rounded-full text-xs font-black shadow-md">
              {currentUserRankInfo.rank}
            </span>
            <div>
              <p className="text-xs font-black text-yellow-400 flex items-center gap-1.5">
                YOUR RANK
                <span className="bg-yellow-400/20 text-yellow-300 text-[9px] px-1.5 py-0.5 rounded font-bold">
                  YOU
                </span>
              </p>
              <p className="text-[10px] text-gray-300">
                Prize:{' '}
                <span className="text-yellow-300 font-bold">
                  {currentUserRankInfo.prize}
                </span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-cyan-400">
              {currentUserRankInfo.points}
            </p>
            <p className="text-[9px] text-gray-400">POINTS</p>
          </div>
        </div>
      </div>
    </div>
  );
}
