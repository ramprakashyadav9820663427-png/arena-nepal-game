'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ixaugtdwfxhmqypglder.supabase.co';
const supabaseAnonKey = 'sb_publishable_XRLDHfS-bDHlJJBzlGEmqQ_WetQ24cZ';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function RankPage() {
  const [currentUserName, setCurrentUserName] = useState('Player');
  const [activeTab, setActiveTab] = useState<'daily' | 'night' | 'mega'>('daily');
  
  const [dailyLeaderboard, setDailyLeaderboard] = useState<any[]>([]);
  const [nightLeaderboard, setNightLeaderboard] = useState<any[]>([]);
  const [megaLeaderboard, setMegaLeaderboard] = useState<any[]>([]);
  
  const [userRankData, setUserRankData] = useState({
    rank: '--',
    name: 'Player (YOU)',
    prize: '0 Red Dias',
    points: '0',
  });

  // Load username & sync red diamonds
  useEffect(() => {
    try {
      const savedName = localStorage.getItem('arena_username');
      if (savedName) setCurrentUserName(savedName);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Automatic Red Diamond Prizing Distribution Simulation
  const distributeAutomaticPrizes = (leaderboardData: any[], prizePerWinner: number) => {
    try {
      const savedName = localStorage.getItem('arena_username');
      const userEntry = leaderboardData.find((item) => item.name === savedName);
      
      // If current user is in the winning slots, automatically add red diamonds if not already claimed for this cycle
      if (userEntry && userEntry.rank <= leaderboardData.length) {
        const claimedKey = `claimed_prize_${activeTab}_${new Date().toDateString()}`;
        const alreadyClaimed = localStorage.getItem(claimedKey);

        if (!alreadyClaimed) {
          const currentDias = parseInt(localStorage.getItem('arena_red_diamonds') || '150', 10);
          const newTotal = currentDias + prizePerWinner;
          
          localStorage.setItem('arena_red_diamonds', newTotal.toString());
          localStorage.setItem('arena_red_dias', newTotal.toString());
          localStorage.setItem('arena_diamond', newTotal.toString());
          localStorage.setItem('arena_cash', newTotal.toString());
          localStorage.setItem(claimedKey, 'true');
          
          window.dispatchEvent(new Event('storage'));
          console.log(`🎉 Automatic Reward Distributed: +${prizePerWinner} Red Diamonds!`);
        }
      }
    } catch (err) {
      console.error('Error distributing prize:', err);
    }
  };

  // Fetch Rankings from Supabase
  const fetchRankingsFromSupabase = async () => {
    try {
      // 1. Daily (Top 10 - 1,000 Red Dias each)
      const { data: dailyData } = await supabase
        .from('tournament_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(10);

      if (dailyData) {
        const formatted = dailyData.map((item: any, idx: number) => ({
          rank: idx + 1,
          name: item.username || 'Player',
          points: item.score?.toString() || '0',
          prize: '1,000 Red Dias 🔴',
        }));
        setDailyLeaderboard(formatted);
        if (activeTab === 'daily') distributeAutomaticPrizes(formatted, 1000);
      }

      // 2. Night (Top 15 - 1,500 Red Dias each)
      const { data: nightData } = await supabase
        .from('night_tournament_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(15);

      if (nightData) {
        const formatted = nightData.map((item: any, idx: number) => ({
          rank: idx + 1,
          name: item.username || 'Player',
          points: item.score?.toString() || '0',
          prize: '1,500 Red Dias 🔴',
        }));
        setNightLeaderboard(formatted);
        if (activeTab === 'night') distributeAutomaticPrizes(formatted, 1500);
      }

      // 3. Mega Showdown (Top 20 - 2,500 Red Dias each)
      const { data: megaData } = await supabase
        .from('mega_tournament_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(20);

      if (megaData) {
        const formatted = megaData.map((item: any, idx: number) => ({
          rank: idx + 1,
          name: item.username || 'Player',
          points: item.score?.toString() || '0',
          prize: '2,500 Red Dias 🔴',
        }));
        setMegaLeaderboard(formatted);
        if (activeTab === 'mega') distributeAutomaticPrizes(formatted, 2500);
      }

    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  };

  useEffect(() => {
    fetchRankingsFromSupabase();
    const interval = setInterval(fetchRankingsFromSupabase, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Update User Rank View
  useEffect(() => {
    const list = 
      activeTab === 'daily' ? dailyLeaderboard : 
      activeTab === 'night' ? nightLeaderboard : megaLeaderboard;

    const myIndex = list.findIndex((item: any) => item.name === currentUserName);
    const prizeText = 
      activeTab === 'daily' ? '1,000 Red Dias' : 
      activeTab === 'night' ? '1,500 Red Dias' : '2,500 Red Dias';

    if (myIndex !== -1) {
      setUserRankData({
        rank: `#${myIndex + 1}`,
        name: `${currentUserName} (YOU)`,
        prize: prizeText,
        points: list[myIndex].points,
      });
    } else {
      setUserRankData({
        rank: '--',
        name: `${currentUserName} (YOU)`,
        prize: prizeText,
        points: '0',
      });
    }
  }, [activeTab, dailyLeaderboard, nightLeaderboard, megaLeaderboard, currentUserName]);

  const displayedList = 
    activeTab === 'daily' ? dailyLeaderboard : 
    activeTab === 'night' ? nightLeaderboard : megaLeaderboard;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center pb-32 px-4 pt-6 select-none relative">
      <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400 drop-shadow-[0_0_15px_rgba(236,72,153,0.6)]">
        LEADERBOARD & RESULTS
      </h1>
      <p className="text-xs text-gray-400 mb-2">Check out top rankings & tournament results 🏆</p>
      
      {/* GLOWING NEON BANNER FOR RESULT TIMINGS */}
      <div className="w-full max-w-md bg-gradient-to-r from-purple-950/80 via-gray-900 to-cyan-950/80 border-2 border-cyan-400/60 p-3 rounded-2xl mb-4 shadow-[0_0_20px_rgba(6,182,212,0.3)] text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-pink-500/10 animate-pulse pointer-events-none"></div>
        <p className="text-[11px] text-cyan-300 font-black uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
          ⚡ RESULT SCHEDULE (नतिजा प्रकाशन समय) ⚡
        </p>
        <p className="text-[10px] text-yellow-300 font-bold leading-relaxed">
          {activeTab === 'daily' && '☀️ Daily Tournament: खेल बिहान ६:०० देखि साँझ ६:०० सम्म | नतिजा: हरेक दिन बेलुका ७:०० बजे बोर्डमा आउनेछ।'}
          {activeTab === 'night' && '🌙 Night Tournament: राती चल्नेछ | नतिजा: भोलीपल्ट बिहान १०:०० बजे बोर्डमा प्रकाशित हुनेछ।'}
          {activeTab === 'mega' && '⚡ Mega Showdown: बिहान ६:०० देखि साँझ ६:०० सम्म | नतिजा: हरेक दिन बेलुका ७:०० बजे (Top 20) प्रकाशित हुनेछ।'}
        </p>
      </div>

      {/* THREE SWITCH TABS */}
      <div className="flex bg-gray-900 p-1.5 rounded-2xl mb-5 border border-purple-500/40 gap-1 w-full max-w-md justify-center shadow-lg">
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all cursor-pointer ${
            activeTab === 'daily'
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-[0_0_12px_rgba(236,72,153,0.5)]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          ☀️ Daily (Top 10)
        </button>
        <button
          onClick={() => setActiveTab('night')}
          className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all cursor-pointer ${
            activeTab === 'night'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.5)]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🌙 Night (Top 15)
        </button>
        <button
          onClick={() => setActiveTab('mega')}
          className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all cursor-pointer ${
            activeTab === 'mega'
              ? 'bg-gradient-to-r from-yellow-400 to-red-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.6)] font-black'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          ⚡ Mega (Top 20)
        </button>
      </div>

      {/* Leaderboard List / Skeletons */}
      <div className="w-full max-w-md flex flex-col gap-2.5 mb-4">
        {displayedList.length === 0 ? (
          <div className="w-full bg-gray-900/60 border border-purple-500/30 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-2 shadow-xl">
            <span className="text-3xl animate-bounce">🏆</span>
            <p className="text-xs text-yellow-300 font-black">
              Waiting for {activeTab.toUpperCase()} Tournament Results!
            </p>
            <p className="text-[10px] text-gray-400">
              {activeTab === 'night' ? 'Results will appear sharply at 10:00 AM.' : 'Results will appear sharply at 7:00 PM.'} Play now to secure your rank!
            </p>
          </div>
        ) : (
          displayedList.map((item: any) => {
            const isMe = item.name === currentUserName;
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
                      item.rank === 1 ? 'bg-yellow-400 text-black shadow-[0_0_10px_rgba(234,179,8,0.8)]' :
                      item.rank === 2 ? 'bg-gray-300 text-black' :
                      item.rank === 3 ? 'bg-amber-600 text-white' :
                      isMe ? 'bg-yellow-500 text-black' : 'bg-purple-900/80 text-cyan-300 border border-purple-500/40'
                    }`}
                  >
                    #{item.rank}
                  </span>
                  <div>
                    <p className="text-xs font-bold flex items-center gap-1.5">
                      <span className={isMe ? 'text-yellow-300 font-black text-sm' : 'text-white'}>
                        {item.name}
                      </span>
                      {isMe && (
                        <span className="bg-yellow-400 text-black text-[9px] px-1.5 py-0.5 rounded-md font-black shadow">
                          YOU
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-yellow-400 font-bold">
                      Prize: {item.prize}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-cyan-400">
                    {item.points} PTS
                  </p>
                  <p className="text-[9px] text-gray-500 uppercase">Score</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sticky Bottom "Your Rank" Bar */}
      <div className="fixed bottom-16 left-0 right-0 px-4 flex justify-center z-30">
        <div className="w-full max-w-md bg-gradient-to-r from-gray-950 via-gray-900 to-purple-950 border-2 border-yellow-400 p-3.5 rounded-2xl shadow-[0_0_25px_rgba(234,179,8,0.3)] flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 flex items-center justify-center bg-yellow-400 text-black rounded-xl text-xs font-black shadow-lg">
              {userRankData.rank}
            </span>
            <div>
              <p className="text-xs font-black text-yellow-400 flex items-center gap-1.5">
                YOUR RANK ({activeTab.toUpperCase()})
                <span className="bg-yellow-400 text-black text-[9px] px-1.5 py-0.5 rounded font-black">
                  YOU
                </span>
              </p>
              <p className="text-[10px] text-gray-300 font-semibold">
                Prize:{' '}
                <span className="text-yellow-300 font-bold">
                  {userRankData.prize}
                </span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-cyan-400">
              {userRankData.points} PTS
            </p>
            <p className="text-[9px] text-gray-400">SCORE</p>
          </div>
        </div>
      </div>
    </div>
  );
}