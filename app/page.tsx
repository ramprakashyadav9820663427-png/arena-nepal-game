'use client';

import React, { useState } from 'react';
import Navbar from './components/navbar/Navbar';
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
    <main className="min-h-screen bg-gray-950 text-white">
      {/* नेविगेशन बार ऊपर लगा दिया */}
      <Navbar
        wallet={wallet}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* बीच का मुख्य कंटेंट एरिया */}
      <div className="p-6 max-w-6xl mx-auto">
        {activeTab === 'game' && (
          <GameSection wallet={wallet} setWallet={setWallet} />
        )}

        {activeTab === 'tournament' && <TournamentSection />}

        {activeTab === 'rank' && <RankSection />}

        {activeTab === 'wallet' && <WalletSection wallet={wallet} />}
      </div>
    </main>
  );
}
