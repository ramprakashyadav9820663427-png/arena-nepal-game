'use client';
import React, { useState, useEffect } from 'react';

export default function DailyMissions({ onClose }: { onClose: () => void }) {
  const [missions, setMissions] = useState([
    { id: 1, title: 'Daily Login Bonus', reward: '+5000 White 💎', completed: true, claimed: true },
    { id: 2, title: 'Spin the Lucky Wheel', reward: '+1 Spin Token', completed: false, claimed: false },
    { id: 3, title: 'Play 3 Arcade Games', reward: '+200 White 💎', completed: false, claimed: false },
    { id: 4, title: 'Refer a Friend on WhatsApp', reward: '+10 Red 💎', completed: false, claimed: false },
  ]);

  useEffect(() => {
    // Load missions progress from localStorage if available
    const savedMissions = localStorage.getItem('arena_daily_missions');
    if (savedMissions) {
      try {
        setMissions(JSON.parse(savedMissions));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveAndSetMissions = (updated: typeof missions) => {
    setMissions(updated);
    localStorage.setItem('arena_daily_missions', JSON.stringify(updated));
  };

  const handleClaim = (id: number) => {
    const updated = missions.map((m) => {
      if (m.id === id) {
        if (!m.completed) {
          if (id === 4) {
            // WhatsApp Refer trigger
            const text = encodeURIComponent("🔥 आ जा भाई Arena Nepal पर! साथ मिलकर 1v1 गेम खेलते हैं और फ्री डायमंड्स जीतते हैं। ज्वाइन कर: https://arena-nepal.com");
            window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
            
            // Mark completed and reward Red Diamonds
            const currentRed = localStorage.getItem('arena_red_diamonds');
            const newRed = (currentRed ? parseInt(currentRed, 10) : 1000) + 10;
            localStorage.setItem('arena_red_diamonds', newRed.toString());
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new CustomEvent('walletUpdated', { detail: newRed }));
            
            alert('🎉 Friend referred successfully! +10 Red Diamonds added to your account!');
            return { ...m, completed: true, claimed: true };
          } else {
            alert('Complete this task first to claim reward!');
            return m;
          }
        }
        return { ...m, claimed: true };
      }
      return m;
    });
    saveAndSetMissions(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-gray-950 border border-purple-500/50 rounded-3xl p-5 shadow-2xl flex flex-col relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-gray-800 hover:bg-gray-700 text-white w-7 h-7 rounded-full font-bold flex items-center justify-center text-xs transition-all cursor-pointer"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🎯</span>
          <div>
            <h2 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 uppercase tracking-wider">
              Daily Missions & Tasks
            </h2>
            <p className="text-[10px] text-gray-400">Complete tasks daily to earn free diamonds & tokens!</p>
          </div>
        </div>

        {/* Mission List */}
        <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
          {missions.map((mission) => (
            <div
              key={mission.id}
              className="bg-gray-900/90 border border-purple-500/20 p-3 rounded-2xl flex items-center justify-between shadow"
            >
              <div className="flex flex-col pr-2">
                <span className="text-xs font-bold text-white">{mission.title}</span>
                <span className="text-[10px] font-extrabold text-cyan-400 mt-0.5">{mission.reward}</span>
              </div>

              <button
                onClick={() => handleClaim(mission.id)}
                disabled={mission.claimed}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow ${
                  mission.claimed
                    ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                    : mission.id === 4
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:scale-105'
                    : 'bg-gradient-to-r from-yellow-400 to-pink-500 text-black hover:scale-105'
                }`}
              >
                {mission.claimed ? 'Claimed ✓' : mission.id === 4 ? 'Share WA' : 'Claim'}
              </button>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-gray-800 text-center">
          <p className="text-[9px] text-gray-400">
            Tasks reset every 24 hours at midnight. Keep playing! 🚀
          </p>
        </div>

      </div>
    </div>
  );
}