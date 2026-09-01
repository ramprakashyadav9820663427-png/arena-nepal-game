'use client';

import React, { useState } from 'react';
import { UserWallet, TabType } from './types/game';
import GameSection from './components/game/GameSection';
import TournamentSection from './components/TournamentSection';
import RankSection from './components/RankSection';
import WalletSection from './components/WalletSection';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('game');

  // शुरुआती वॉलेट डेटा (रेड और व्हाइट डायमंड्स)
  const [wallet, setWallet] = useState<UserWallet>({
    redDiamonds: 10,
    whiteDiamonds: 500,
  });

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-20">
      {/* बीच का मुख्य कंटेंट एरिया */}
      <div className="p-4 max-w-md mx-auto">
        {activeTab === 'game' && (
          <GameSection wallet={wallet} setWallet={setWallet} />
        )}

        {activeTab === 'tournament' && <TournamentSection />}

        {activeTab === 'rank' && <RankSection />}

        {activeTab === 'wallet' && <WalletSection wallet={wallet} />}
      </div>

      {/* नीचे का मोबाइल-नेटिव बॉटम नेविगेशन बार (TikTok/Instagram स्टाइल) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-4 py-2 flex justify-around items-center z-50 shadow-lg">
        <button
          onClick={() => setActiveTab('game')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'game' ? 'text-yellow-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className="text-xl">🎮</span>
          <span className="text-xs mt-1 font-medium">Game</span>
        </button>

        <button
          onClick={() => setActiveTab('tournament')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'tournament' ? 'text-yellow-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className="text-xl">🏆</span>
          <span className="text-xs mt-1 font-medium">Tournament</span>
        </button>

        <button
          onClick={() => setActiveTab('rank')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'rank' ? 'text-yellow-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className="text-xl">⭐</span>
          <span className="text-xs mt-1 font-medium">Rank</span>
        </button>

        <button
          onClick={() => setActiveTab('wallet')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'wallet' ? 'text-yellow-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className="text-xl">💎</span>
          <span className="text-xs mt-1 font-medium">Wallet</span>
        </button>
      </nav>
    </main>
  );
}