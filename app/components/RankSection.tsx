'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ixaugtdwfxhmqypglder.supabase.co';
const supabaseAnonKey = 'sb_publishable_XRLDHfS-bDHlJJBzlGEmqQ_WetQ24cZ';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function RankPage() {
  const [currentUserName, setCurrentUserName] = useState('Player');
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  
  const [userRankData, setUserRankData] = useState({
    rank: '--',
    name: 'Player (YOU)',
    prize: 'NPR 0',
    points: '0',
  });

  // Supabase से Top 10 Scores लाने का और वॉलेट में प्राइज भेजने का फंक्शन
  const fetchLeaderboardFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching leaderboard:', error.message);
        return;
      }

      if (data) {
        const formattedData = data.map((item: any, index: number) => ({
          rank: index + 1,
          name: item.username || 'Player',
          points: item.score?.toString() || '0',
          prize: index < 10 ? 'NPR 1,000' : 'NPR 0',
        }));

        setLeaderboardData(formattedData);

        const myIndex = formattedData.findIndex((item: any) => item.name === currentUserName);
        if (myIndex !== -1) {
          const calculatedPrize = myIndex < 10 ? 1000 : 0;

          setUserRankData({
            rank: `#${myIndex + 1}`,
            name: `${currentUserName} (YOU)`,
            prize: `NPR ${calculatedPrize}`,
            points: formattedData[myIndex].points,
          });

          // अगर यूजर टॉप 10 में है, तो उसका 1000 रुपया वॉलेट में ऑटोमैटिक जोड़ दें
          if (calculatedPrize > 0) {
            try {
              const existingCash = parseInt(localStorage.getItem('arena_winning_cash') || '0', 10);
              // हम यह सुनिश्चित करते हैं कि प्राइज सिर्फ एक बार ही जुड़े (फ्लैग के जरिए)
              const claimedKey = `prize_claimed_${new Date().toDateString()}`;
              const alreadyClaimed = localStorage.getItem(claimedKey);

              if (!alreadyClaimed) {
                const newTotalCash = existingCash + calculatedPrize;
                localStorage.setItem('arena_winning_cash', newTotalCash.toString());
                localStorage.setItem('arena_cash', newTotalCash.toString()); // वॉलेट के दूसरे फॉर्मेट के लिए
                localStorage.setItem(claimedKey, 'true');
                console.log('🏆 Congratulations! NPR 1000 added to your wallet balance.');
              }
            } catch (err) {
              console.error('Wallet update error:', err);
            }
          }
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  };

  useEffect(() => {
    fetchLeaderboardFromSupabase();

    // ⏰ शाम के 7:00 बजे (7:00 PM) ऑटोमैटिक अपडेट चेक करने वाला लॉजिक
    const checkSevenPMUpdate = setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      if (hours === 19 && minutes === 0) {
        fetchLeaderboardFromSupabase();
      }
    }, 60000);

    return () => clearInterval(checkSevenPMUpdate);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center pb-32 px-4 pt-6 select-none relative">
      <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
        LEADERBOARD
      </h1>
      <p className="text-xs text-gray-400 mb-1">Check out top rankings 🏆</p>
      
      <p className="text-[11px] text-yellow-400 font-bold mb-4 bg-yellow-950/40 border border-yellow-500/30 px-3 py-1.5 rounded-xl text-center">
        🇳🇵 दैनिक प्रतियोगिताको नतिजा हरेक दिन साँझ ७:०० बजे प्रकाशित गरिनेछ।
      </p>

      {/* DAILY टैब */}
      <div className="flex bg-gray-900 p-1 rounded-xl mb-6 border border-gray-800">
        <button
          className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow"
        >
          DAILY
        </button>
      </div>

      {/* List */}
      <div className="w-full max-w-md flex flex-col gap-2 mb-4">
        {leaderboardData.length === 0 ? (
          <div className="w-full bg-gray-900/40 border border-gray-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-2">
            <span className="text-2xl">📊</span>
            <p className="text-xs text-gray-300 font-bold">
              No rankings yet for this tournament cycle!
            </p>
            <p className="text-[10px] text-gray-500">
              Play games & score points to get on the leaderboard. Updates daily at 7:00 PM.
            </p>
          </div>
        ) : (
          leaderboardData.map((item: any) => {
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
                YOUR RANK
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