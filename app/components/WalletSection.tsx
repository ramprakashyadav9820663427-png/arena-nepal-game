'use client';
import React, { useState, useEffect } from 'react';

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState<
    'cash' | 'white' | 'red' | 'history'
  >('cash');

  // Profile States (Fresh Start / Empty Defaults)
  const [userName, setUserName] = useState('New Player');
  const [gameUid, setGameUid] = useState('#AN-000000');
  const [redDiamonds, setRedDiamonds] = useState(0);
  const [whiteDiamonds, setWhiteDiamonds] = useState(0);
  const [winningCash, setWinningCash] = useState(0);

  // Load actual user stats from localStorage on mount
  useEffect(() => {
    const savedName = localStorage.getItem('arena_user_name');
    const savedUid = localStorage.getItem('arena_user_uid');
    const savedWhite = localStorage.getItem('arena_white_diamonds');
    const savedRed = localStorage.getItem('arena_red_diamonds');
    const savedCash = localStorage.getItem('arena_winning_cash');

    if (savedName) setUserName(savedName);
    if (savedUid) setGameUid(savedUid);
    if (savedWhite) setWhiteDiamonds(Number(savedWhite));
    if (savedRed) setRedDiamonds(Number(savedRed));
    if (savedCash) setWinningCash(Number(savedCash));
  }, []);

  // Withdraw Form States
  const [esewaId, setEsewaId] = useState('');
  const [esewaName, setEsewaName] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('100');

  // Modal States
  const [showSettingModal, setShowSettingModal] = useState(false);
  const [settingTab, setSettingTab] = useState<'support' | 'terms' | 'about'>(
    'support'
  );

  // History State
  const [historyList, setHistoryList] = useState<
    Array<{ type: string; details: string; date: string; status: string }>
  >([]);

  // Edit Profile Handler
  const handleEditProfile = () => {
    const newName = prompt('Enter your new profile name:', userName);
    if (newName && newName.trim() !== '') {
      const updated = newName.trim();
      setUserName(updated);
      localStorage.setItem('arena_user_name', updated);
    }
  };

  // Withdraw Submit Handler
  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(withdrawAmount);

    if (amountNum > winningCash) {
      alert('Insufficient winning cash balance for withdrawal!');
      return;
    }

    const whatsappNumber = '9779820663427';
    const message = `New Withdraw Request!%0AUID: ${gameUid}%0AName: ${userName}%0AeSewa Number: ${esewaId}%0AeSewa Holder: ${esewaName}%0AAmount: NPR ${withdrawAmount}`;

    // Deduct cash after request
    const updatedCash = winningCash - amountNum;
    setWinningCash(updatedCash);
    localStorage.setItem('arena_winning_cash', updatedCash.toString());

    setHistoryList((prev) => [
      {
        type: 'Withdraw Request',
        details: `NPR ${withdrawAmount} via eSewa (${esewaId})`,
        date: new Date().toLocaleDateString(),
        status: 'Processing',
      },
      ...prev,
    ]);

    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  // White Diamond Exchange Handler
  const handleExchange = () => {
    if (whiteDiamonds >= 200000) {
      const newWhite = whiteDiamonds - 200000;
      const newRed = redDiamonds + 100;

      setWhiteDiamonds(newWhite);
      setRedDiamonds(newRed);

      localStorage.setItem('arena_white_diamonds', newWhite.toString());
      localStorage.setItem('arena_red_diamonds', newRed.toString());

      alert(
        'Successfully exchanged 2,00,000 White Diamonds for 100 Red Diamonds!'
      );
    } else {
      alert(
        'Insufficient White Diamonds! You need at least 2,00,000 White Diamonds to exchange.'
      );
    }
  };

  const redPackages = [
    { diamonds: 100, price: 200 },
    { diamonds: 250, price: 400 },
    { diamonds: 500, price: 800 },
    { diamonds: 1000, price: 1500 },
    { diamonds: 1500, price: 2500 },
    { diamonds: 2000, price: 3000 },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center pb-28 px-4 pt-4 select-none relative">
      {/* Top Bar with Title & Setting Icon */}
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400">
          WALLET & PROFILE
        </h1>
        <button
          onClick={() => setShowSettingModal(true)}
          className="p-2.5 rounded-xl border bg-gray-900 border-gray-800 text-cyan-400 shadow-md hover:scale-105 transition-all font-bold text-xs flex items-center gap-1"
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Profile Card */}
      <div className="w-full max-w-md bg-gray-900 border border-purple-500/30 rounded-2xl p-4 mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold">{userName}</h2>
          <p className="text-[10px] text-gray-400">UID: {gameUid}</p>
          <p className="text-[10px] text-red-400 font-semibold mt-1">
            Red Diamonds: {redDiamonds} 🔴
          </p>
        </div>
        <button
          onClick={handleEditProfile}
          className="px-3 py-1 bg-gray-800 border border-gray-700 text-white text-xs rounded-xl font-bold hover:bg-cyan-500 hover:text-black transition-all"
        >
          Edit Profile
        </button>
      </div>

      {/* 3 Balance Boxes Cards (Cash, White, Red) */}
      <div className="w-full max-w-md grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl text-center">
          <p className="text-[9px] text-gray-400 font-bold">CASH</p>
          <p className="text-xs font-black text-green-400 mt-1">
            NPR {winningCash}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl text-center">
          <p className="text-[9px] text-gray-400 font-bold">WHITE DIAMOND</p>
          <p className="text-xs font-black text-cyan-400 mt-1">
            {whiteDiamonds} 💎
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl text-center">
          <p className="text-[9px] text-gray-400 font-bold">RED DIAMOND</p>
          <p className="text-xs font-black text-red-400 mt-1">
            {redDiamonds} 🔴
          </p>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="w-full max-w-md grid grid-cols-4 gap-1 bg-gray-900 p-1 rounded-xl mb-4">
        {(['cash', 'white', 'red', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${
              activeTab === tab
                ? 'bg-cyan-500 text-black shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: CASH & WITHDRAW */}
      {activeTab === 'cash' && (
        <div className="w-full max-w-md flex flex-col gap-4">
          <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-2xl">
            <h3 className="text-xs font-bold text-gray-400">
              WINNING CASH BALANCE
            </h3>
            <p className="text-2xl font-black text-green-400 mb-4">
              NPR {winningCash}
            </p>

            <form
              onSubmit={handleWithdrawSubmit}
              className="flex flex-col gap-3"
            >
              <h4 className="text-xs font-bold text-pink-400">
                eSewa Withdraw Request
              </h4>
              <input
                type="text"
                placeholder="Game UID (#AN-xxxx)"
                value={gameUid}
                onChange={(e) => setGameUid(e.target.value)}
                className="bg-black border border-gray-800 text-white p-2.5 rounded-xl text-xs"
                required
              />
              <input
                type="number"
                placeholder="Withdraw Amount (NPR)"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="bg-black border border-gray-800 text-white p-2.5 rounded-xl text-xs"
                required
              />
              <input
                type="text"
                placeholder="Your eSewa Mobile Number (Must be yours)"
                value={esewaId}
                onChange={(e) => setEsewaId(e.target.value)}
                className="bg-black border border-gray-800 text-white p-2.5 rounded-xl text-xs"
                required
              />
              <input
                type="text"
                placeholder="eSewa Account Holder Name"
                value={esewaName}
                onChange={(e) => setEsewaName(e.target.value)}
                className="bg-black border border-gray-800 text-white p-2.5 rounded-xl text-xs"
                required
              />
              <button
                type="submit"
                className="py-2.5 bg-green-600 hover:bg-green-500 font-bold text-xs rounded-xl text-white shadow-lg transition-all"
              >
                Submit eSewa Withdraw Request via WhatsApp
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB CONTENT: WHITE DIAMONDS & EXCHANGE */}
      {activeTab === 'white' && (
        <div className="w-full max-w-md bg-gray-900/80 border border-gray-800 p-4 rounded-2xl text-center">
          <h3 className="text-xs font-bold text-gray-400">
            WHITE DIAMOND BALANCE
          </h3>
          <p className="text-2xl font-black text-cyan-400 mb-4">
            {whiteDiamonds} 💎
          </p>
          <div className="bg-black/40 border border-cyan-500/30 p-3 rounded-xl mb-4">
            <p className="text-[10px] text-gray-300">
              Convert 2,00,000 White Diamonds into 100 Red Diamonds instantly!
            </p>
          </div>
          <button
            onClick={handleExchange}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-black text-xs rounded-xl shadow hover:opacity-90 transition-all"
          >
            EXCHANGE 2L WHITE ➔ 100 RED DIAS
          </button>
        </div>
      )}

      {/* TAB CONTENT: RED DIAMONDS WHATSAPP TOP-UP */}
      {activeTab === 'red' && (
        <div className="w-full max-w-md flex flex-col gap-3">
          <h3 className="text-xs font-bold text-pink-400">
            BUY RED DIAMONDS VIA WHATSAPP
          </h3>
          {redPackages.map((pkg, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-gray-900 border border-gray-800 p-3 rounded-xl"
            >
              <div>
                <p className="text-xs font-bold text-white">
                  🔴 {pkg.diamonds} Red Diamonds
                </p>
                <p className="text-[10px] text-yellow-400">NPR {pkg.price}</p>
              </div>
              <button
                onClick={() =>
                  window.open(
                    `https://wa.me/9779820663427?text=I want to buy ${pkg.diamonds} Red Diamonds for NPR ${pkg.price} (UID: ${gameUid})`,
                    '_blank'
                  )
                }
                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white font-bold text-[10px] rounded-lg shadow"
              >
                Get WhatsApp
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB CONTENT: HISTORY */}
      {activeTab === 'history' && (
        <div className="w-full max-w-md bg-gray-900/80 border border-gray-800 p-4 rounded-2xl">
          <h3 className="text-xs font-bold text-gray-400 mb-3">
            TRANSACTION HISTORY
          </h3>
          {historyList.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">
              No transaction history found yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {historyList.map((item, index) => (
                <div
                  key={index}
                  className="bg-black/40 border border-gray-800 p-3 rounded-xl text-xs flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold text-cyan-400">{item.type}</p>
                    <p className="text-[10px] text-gray-300">{item.details}</p>
                    <p className="text-[9px] text-gray-500">{item.date}</p>
                  </div>
                  <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded font-bold">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-gray-900 border border-gray-800 text-white rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-4">
              <h3 className="text-sm font-black flex items-center gap-2">
                ⚙️ APP SETTINGS & INFO
              </h3>
              <button
                onClick={() => setShowSettingModal(false)}
                className="text-gray-400 hover:text-white font-bold text-base px-2"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1 bg-black/30 p-1 rounded-xl mb-4 text-xs font-bold text-center border border-gray-800">
              <button
                onClick={() => setSettingTab('support')}
                className={`py-1.5 rounded-lg ${
                  settingTab === 'support'
                    ? 'bg-cyan-500 text-black'
                    : 'text-gray-400'
                }`}
              >
                Support
              </button>
              <button
                onClick={() => setSettingTab('terms')}
                className={`py-1.5 rounded-lg ${
                  settingTab === 'terms'
                    ? 'bg-cyan-500 text-black'
                    : 'text-gray-400'
                }`}
              >
                Terms
              </button>
              <button
                onClick={() => setSettingTab('about')}
                className={`py-1.5 rounded-lg ${
                  settingTab === 'about'
                    ? 'bg-cyan-500 text-black'
                    : 'text-gray-400'
                }`}
              >
                About
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 text-xs space-y-3">
              {settingTab === 'support' && (
                <div className="space-y-3">
                  <div className="bg-black/30 p-3 rounded-xl border border-gray-800">
                    <p className="font-bold text-pink-400 mb-1">
                      💬 Customer Support
                    </p>
                    <p className="text-[11px] text-gray-300 mb-3">
                      Need help with withdrawal, deposits, or game queries?
                      Contact our official support team directly on WhatsApp.
                    </p>
                    <button
                      onClick={() =>
                        window.open(
                          'https://wa.me/9779820663427?text=Hello%20Arena%20Nepal%20Support,%20I%20need%20help!',
                          '_blank'
                        )
                      }
                      className="w-full py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg text-xs"
                    >
                      Chat on WhatsApp (+977 9820663427)
                    </button>
                  </div>
                </div>
              )}

              {settingTab === 'terms' && (
                <div className="space-y-2 text-[11px] text-gray-300 leading-relaxed">
                  <p className="font-bold text-yellow-400">
                    Terms & Conditions
                  </p>
                  <p>
                    1. <b>White Diamonds & Exchange:</b> White Diamonds are
                    earned by playing games. You can exchange 2,00,000 White
                    Diamonds for 100 Red Diamonds.
                  </p>
                  <p>
                    2. <b>Daily Tournaments:</b> Daily tournaments run between
                    6:00 PM and 12:00 Midnight.
                  </p>
                </div>
              )}

              {settingTab === 'about' && (
                <div className="space-y-2 text-[11px] text-gray-300 leading-relaxed">
                  <p className="font-bold text-cyan-400">About Arena Nepal</p>
                  <p>
                    Arena Nepal is the premier competitive mobile gaming and
                    esports tournament platform built specifically for gamers in
                    Nepal.
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSettingModal(false)}
              className="mt-4 w-full py-2.5 bg-gray-800 hover:bg-gray-700 font-bold rounded-xl text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
