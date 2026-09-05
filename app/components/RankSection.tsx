'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ixaugtdwfxhmqypglder.supabase.co';
const supabaseAnonKey = 'sb_publishable_XRLDHfS-bDHlJJBzlGEmqQ_WetQ24cZ';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function RankPage() {
  const [currentUserName, setCurrentUserName] = useState('Player');
  const [activeTab, setActiveTab] = useState<'daily' | 'night'>('daily');
  
  const [dailyLeaderboard, setDailyLeaderboard] = useState<any[]>([]);
  const [nightLeaderboard, setNightLeaderboard] = useState<any[]>([]);
  
  const [userRankData, setUserRankData] = useState({
    rank: '--',
    name: 'Player (YOU)',
    prize: 'NPR 0',
    points: '0',
  });

  // Supabase से Daily (Top 10) और Night (Top 15) का डेटा लाने का फंक्शन
  const fetchRankingsFromSupabase = async () => {
    try {
      // 1. Fetch Daily Tournament Scores (Limit 10, Prize NPR 1,000)
      const { data: dailyData, error: dailyError } = await supabase
        .from('tournament_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(10);

      if (!dailyError && dailyData) {
        const formattedDaily = dailyData.map((item: any, index: number) => ({
          rank: index + 1,
          name: item.username || 'Player',
          points: item.score?.toString() || '0',
          prize: 'NPR 1,000',
        }));
        setDailyLeaderboard(formattedDaily);
      }

      // 2. Fetch Night Tournament Scores (Limit 15, Prize NPR 1,500)
      const { data: nightData, error: nightError } = await supabase
        .from('tournament_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(15);

      if (!nightError && nightData) {
        const formattedNight = nightData.map((item: any, index: number) => ({
          rank: index + 1,
          name: item.username || 'Player',
          points: item.score?.toString() || '0',
          prize: 'NPR 1,500',
        }));
        setNightLeaderboard(formattedNight);
      }

      // Set Active View User Rank based on selected tab
      const currentList = activeTab === 'daily' ? dailyLeaderboard : nightLeaderboard;
      const myIndex = currentList.findIndex((item: any) => item.name === currentUserName);
      
      if (myIndex !== -1) {
        const prizeAmount = activeTab === 'daily' ? 'NPR 1,000' : 'NPR 1,500';
        setUserRankData({
          rank: `#${myIndex + 1}`,
          name: `${currentUserName} (YOU)`,
          prize: prizeAmount,
          points: currentList[myIndex].points,
        });
      }

    } catch (err) {
      console.error('Unexpected error fetching rankings:', err);
    }
  };

  useEffect(() => {
    fetchRankingsFromSupabase();

    // ⏰ ऑटोमैटिक टाइम चेक (शाम 7:00 बजे और सुबह 7:00 बजे रिफ्रेश करने के लिए)
    const checkTimeInterval = setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Evening 7:00 PM or Morning 7:00 AM
      if ((hours === 19 || hours === 7) && minutes === 0) {
        fetchRankingsFromSupabase();
      }
    }, 60000);

    return () => clearInterval(checkTimeInterval);
  }, [activeTab]);

  const displayedList = activeTab === 'daily' ? dailyLeaderboard : nightLeaderboard;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center pb-32 px-4 pt-6 select-none relative">
      <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
        LEADERBOARD
      </h1>
      <p className="text-xs text-gray-400 mb-1">Check out top rankings 🏆</p>
      
      <p className="text-[11px] text-yellow-400 font-bold mb-4 bg-yellow-950/40 border border-yellow-500/30 px-3 py-1.5 rounded-xl text-center">
        {activeTab === 'daily' 
          ? '🇳🇵 दैनिक प्रतियोगिताको नतिजा हरेक दिन साँझ ७:०० बजे प्रकाशित गरिनेछ।' 
          : '🇳🇵 रात्रीकालीन प्रतियोगिताको नतिजा हरेक दिन बिहान ७:०० बजे प्रकाशित गरिनेछ।'}
      </p>

      {/* DAILY & NIGHT SWITCH TABS */}
      <div className="flex bg-gray-900 p-1 rounded-xl mb-6 border border-gray-800 gap-2">
        <button
          onClick={() => setActiveTab('daily')}
          className={`px-5 py-2 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
            activeTab === 'daily'
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          ☀️ Daily (Top 10)
        </button>
        <button
          onClick={() => setActiveTab('night')}
          className={`px-5 py-2 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
            activeTab === 'night'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🌙 Night (Top 15)
        </button>
      </div>

      {/* List */}
      <div className="w-full max-w-md flex flex-col gap-2 mb-4">
        {displayedList.length === 0 ? (
          <div className="w-full bg-gray-900/40 border border-gray-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-2">
            <span className="text-2xl">📊</span>
            <p className="text-xs text-gray-300 font-bold">
              No rankings yet for this {activeTab} tournament cycle!
            </p>
            <p className="text-[10px] text-gray-500">
              {activeTab === 'daily' 
                ? 'Play games to get on Top 10. Updates daily at 7:00 PM.' 
                : 'Play cyber tower games to get on Top 15. Updates daily at 7:00 AM.'}
            </p>
          </div>
        ) : (
          displayedList.map((item: any) => {
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
                  <p className="text-[9px] text-gray-500">SCORE</p>
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
              {userRankData.rank}
            </span>
            <div>
              <p className="text-xs font-black text-yellow-400 flex items-center gap-1.5">
                YOUR RANK ({activeTab.toUpperCase()})
                <span className="bg-yellow-400/20 text-yellow-300 text-[9px] px-1.5 py-0.5 rounded font-bold">
                  YOU
                </span>
              </p>
              <p className="text-[10px] text-gray-300">
                Prize:{' '}
                <span className="text-yellow-300 font-bold">
                  {userRankData.prize}
                </span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-cyan-400">
              {userRankData.points}
            </p>
            <p className="text-[9px] text-gray-400">SCORE</p>
          </div>
        </div>
      </div>
    </div>
  );
}