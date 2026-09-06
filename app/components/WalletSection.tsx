'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getWalletBalance, updateWalletBalance } from '@/lib/wallet'; // 👈 Central wallet import

interface UserWallet {
  redDiamonds?: number;
  whiteDiamonds?: number;
  winningCash?: number;
  [key: string]: any;
}

interface WalletSectionProps {
  wallet?: UserWallet;
  setWallet?: React.Dispatch<React.SetStateAction<UserWallet>> | any;
}

interface HistoryItem {
  type: string;
  details: string;
  date: string;
  status: string;
}

export default function WalletSection({ wallet, setWallet }: WalletSectionProps) {
  const [activeTab, setActiveTab] = useState<'cash' | 'white' | 'red' | 'history'>('red');

  // Profile States
  const [userName, setUserName] = useState<string>('New Player');
  const [gameUid, setGameUid] = useState<string>('#AN-000000');
  const [userEmail, setUserEmail] = useState<string>('No Email Added');
  const [userMobile, setUserMobile] = useState<string>('No Mobile Added');
  const [userCity, setUserCity] = useState<string>('Not Specified');
  const [userDistrict, setUserDistrict] = useState<string>('Not Specified');
  const [userZip, setUserZip] = useState<string>('00000');

  // Connected to Central Wallet Utility
  const [redDiamonds, setRedDiamonds] = useState<number>(1000);
  const [whiteDiamonds, setWhiteDiamonds] = useState<number>(5000);
  const [winningCash, setWinningCash] = useState<number>(0);

  // Withdraw Modal & Form States
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [withdrawMethod, setWithdrawMethod] = useState<'eSewa' | 'Khalti' | 'CallPay' | 'ConnectIPS' | 'Bank'>('eSewa');
  const [withdrawAccountNo, setWithdrawAccountNo] = useState<string>('');
  const [withdrawAccountName, setWithdrawAccountName] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('500');
  const [withdrawQrFile, setWithdrawQrFile] = useState<string>(''); // 👈 QR Upload State for all methods

  // Red Diamond Exchange Modal State
  const [showExchangeModal, setShowExchangeModal] = useState<boolean>(false);

  // Complete Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [inputName, setInputName] = useState<string>('');
  const [inputEmail, setInputEmail] = useState<string>('');
  const [inputMobile, setInputMobile] = useState<string>('');
  const [inputCity, setInputCity] = useState<string>('');
  const [inputDistrict, setInputDistrict] = useState<string>('');
  const [inputZip, setInputZip] = useState<string>('');

  // Modal States for Settings
  const [showSettingModal, setShowSettingModal] = useState<boolean>(false);
  const [settingTab, setSettingTab] = useState<'support' | 'terms' | 'about'>('support');

  // History State
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);

  // Fetch real-time data from Supabase profiles & history
  const fetchUserData = async () => {
    try {
      // Get currently authenticated Supabase user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && session.user) {
        const authUser = session.user;

        // Fetch from 'profiles' table using auth user id
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileData) {
          // Automatic Unique UID fetched directly from database profiles table!
          if (profileData.uid) {
            setGameUid(profileData.uid);
            localStorage.setItem('arena_user_uid', profileData.uid);
          }
          if (profileData.winning_cash !== undefined && profileData.winning_cash !== null) {
            setWinningCash(profileData.winning_cash);
          }
          if (profileData.username) setUserName(profileData.username);
          if (profileData.email) setUserEmail(profileData.email);
          if (profileData.mobile_number) setUserMobile(profileData.mobile_number);
          if (profileData.city) setUserCity(profileData.city);
          if (profileData.district) setUserDistrict(profileData.district);
          if (profileData.zip_code) setUserZip(profileData.zip_code);

          // Fetch withdraw history for this specific user UID
          const { data: historyData } = await supabase
            .from('withdraw_requests')
            .select('*')
            .eq('user_uid', profileData.uid)
            .order('created_at', { ascending: false });

          if (historyData) {
            const formattedHistory: HistoryItem[] = historyData.map((item: any) => ({
              type: 'Withdraw Request',
              details: `NPR ${item.amount} via ${item.method || 'eSewa'} (${item.account_no})`,
              date: new Date(item.created_at).toLocaleDateString(),
              status: item.status,
            }));
            setHistoryList(formattedHistory);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    setRedDiamonds(getWalletBalance());

    const handleWalletSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail !== undefined) {
        setRedDiamonds(customEvent.detail);
      } else {
        setRedDiamonds(getWalletBalance());
      }
    };

    window.addEventListener('walletUpdated', handleWalletSync);
    window.addEventListener('storage', handleWalletSync);

    const savedName = localStorage.getItem('arena_user_name');
    const savedUid = localStorage.getItem('arena_user_uid');
    const savedEmail = localStorage.getItem('arena_user_email');
    const savedMobile = localStorage.getItem('arena_user_mobile');
    const savedCity = localStorage.getItem('arena_user_city');
    const savedDistrict = localStorage.getItem('arena_user_district');
    const savedZip = localStorage.getItem('arena_user_zip');
    const savedWhite = localStorage.getItem('arena_white_diamonds');
    const savedCash = localStorage.getItem('arena_winning_cash');

    if (savedName) setUserName(savedName);
    if (savedUid) setGameUid(savedUid);

    // Call Supabase user data sync
    fetchUserData();

    if (savedWhite) setWhiteDiamonds(Number(savedWhite));
    else {
      setWhiteDiamonds(5000);
      localStorage.setItem('arena_white_diamonds', '5000');
    }

    if (savedCash) setWinningCash(Number(savedCash));
    else setWinningCash(0);

    if (savedEmail) setUserEmail(savedEmail);
    if (savedMobile) setUserMobile(savedMobile);
    if (savedCity) setUserCity(savedCity);
    if (savedDistrict) setUserDistrict(savedDistrict);
    if (savedZip) setUserZip(savedZip);

    return () => {
      window.removeEventListener('walletUpdated', handleWalletSync);
      window.removeEventListener('storage', handleWalletSync);
    };
  }, []);

  const handleCopyUid = () => {
    navigator.clipboard.writeText(gameUid);
    alert(`UID Copied: ${gameUid}`);
  };

  const handleOpenProfileModal = () => {
    setInputName(userName === 'New Player' ? '' : userName);
    setInputEmail(userEmail === 'No Email Added' ? '' : userEmail);
    setInputMobile(userMobile === 'No Mobile Added' ? '' : userMobile);
    setInputCity(userCity === 'Not Specified' ? '' : userCity);
    setInputDistrict(userDistrict === 'Not Specified' ? '' : userDistrict);
    setInputZip(userZip === '00000' ? '' : userZip);
    setShowProfileModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim()) {
      alert('Please enter your name.');
      return;
    }

    const updatedName = inputName.trim();
    const updatedEmail = inputEmail.trim() || 'No Email Added';
    const updatedMobile = inputMobile.trim() || 'No Mobile Added';
    const updatedCity = inputCity.trim() || 'Not Specified';
    const updatedDistrict = inputDistrict.trim() || 'Not Specified';
    const updatedZip = inputZip.trim() || '00000';

    setUserName(updatedName);
    setUserEmail(updatedEmail);
    setUserMobile(updatedMobile);
    setUserCity(updatedCity);
    setUserDistrict(updatedDistrict);
    setUserZip(updatedZip);

    localStorage.setItem('arena_user_name', updatedName);
    localStorage.setItem('arena_user_email', updatedEmail);
    localStorage.setItem('arena_user_mobile', updatedMobile);
    localStorage.setItem('arena_user_city', updatedCity);
    localStorage.setItem('arena_user_district', updatedDistrict);
    localStorage.setItem('arena_user_zip', updatedZip);

    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      await supabase
        .from('profiles')
        .update({
          username: updatedName,
          email: updatedEmail,
          mobile_number: updatedMobile,
          city: updatedCity,
          district: updatedDistrict,
          zip_code: updatedZip,
        })
        .eq('id', session.user.id);
    }

    setShowProfileModal(false);
    alert('Profile successfully updated!');
  };

  // QR Image File Upload Handler for all withdrawal methods
  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setWithdrawQrFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(withdrawAmount);

    if (amountNum < 500) {
      alert('Minimum withdrawal amount is NPR 500!');
      return;
    }

    if (amountNum > 10000) {
      alert('Maximum withdrawal limit is NPR 10,000 per transaction!');
      return;
    }

    if (amountNum > winningCash) {
      alert('Insufficient winning cash balance for withdrawal!');
      return;
    }

    // Insert withdraw request into Supabase table
    const { error } = await supabase.from('withdraw_requests').insert([
      {
        user_uid: gameUid,
        username: userName,
        method: withdrawMethod,
        account_no: withdrawAccountNo,
        account_name: withdrawAccountName,
        amount: amountNum,
        status: 'Processing',
      },
    ]);

    if (error) {
      console.error('Supabase error:', error);
    }

    // Automatically deduct cash from state, localStorage, and Supabase database profiles table
    const updatedCash = winningCash - amountNum;
    setWinningCash(updatedCash);
    localStorage.setItem('arena_winning_cash', updatedCash.toString());

    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      await supabase
        .from('profiles')
        .update({ winning_cash: updatedCash })
        .eq('id', session.user.id);
    }

    // Add to local history list
    setHistoryList((prev: HistoryItem[]) => [
      {
        type: 'Withdraw Request',
        details: `NPR ${withdrawAmount} via ${withdrawMethod} (${withdrawAccountNo})`,
        date: new Date().toLocaleDateString(),
        status: 'Processing',
      },
      ...prev,
    ]);

    setShowWithdrawModal(false);
    alert('Withdrawal request submitted successfully! Redirecting to WhatsApp...');

    // Open WhatsApp with complete details including payment method and QR info
    const whatsappNumber = '9779716782200';
    const message = `New Withdraw Request!%0AUID: ${gameUid}%0AName: ${userName}%0AMethod: ${withdrawMethod}%0AAccount/Number: ${withdrawAccountNo}%0AHolder Name: ${withdrawAccountName}%0AAmount: NPR ${withdrawAmount}%0AQR Attached: ${withdrawQrFile ? 'Yes' : 'No'}`;
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  const handleRedDiamondExchange = (count: number) => {
    const currentRed = getWalletBalance();
    if (currentRed < count) {
      alert(`Insufficient Red Diamonds! You need at least ${count} Red Diamonds.`);
      return;
    }

    const newRed = updateWalletBalance(-count);
    setRedDiamonds(newRed);

    const addedCash = count;
    const newCash = winningCash + addedCash;
    setWinningCash(newCash);
    localStorage.setItem('arena_winning_cash', newCash.toString());

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && session.user) {
        supabase
          .from('profiles')
          .update({
            red_diamonds: newRed,
            winning_cash: newCash,
          })
          .eq('id', session.user.id)
          .then();
      }
    });

    alert(`Successfully exchanged ${count} Red Diamonds for NPR ${addedCash} Cash!`);
    setShowExchangeModal(false);
  };

  const handleDepositTopUp = (diamonds: number, price: number) => {
    const currentTokens = parseInt(localStorage.getItem('arena_spin_tokens') || '0', 10);
    const updatedTokens = currentTokens + 1;
    localStorage.setItem('arena_spin_tokens', updatedTokens.toString());

    alert(`🎉 Deposit request placed! You earned +1 Spin Token! Total Tokens: ${updatedTokens}`);

    window.open(
      `https://wa.me/9779716782200?text=I want to buy ${diamonds} Red Diamonds for NPR ${price} (UID: ${gameUid})`,
      '_blank'
    );
  };

  const redPackages = [
    { diamonds: 100, price: 100 },
    { diamonds: 250, price: 250 },
    { diamonds: 500, price: 500 },
    { diamonds: 1000, price: 1000 },
    { diamonds: 1500, price: 1500 },
    { diamonds: 2000, price: 2000 },
    { diamonds: 3000, price: 3000 },
    { diamonds: 4000, price: 4000 },
    { diamonds: 5000, price: 5000 },
    { diamonds: 6000, price: 6000 },
    { diamonds: 7000, price: 7000 },
    { diamonds: 8000, price: 8000 },
    { diamonds: 9000, price: 9000 },
    { diamonds: 10000, price: 10000 },
  ];

  return (
    <div className="w-full max-w-md mx-auto text-white flex flex-col items-center pb-20 px-2 select-none relative">
      {/* Top Bar */}
      <div className="w-full flex items-center justify-between mb-4">
        <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400">
          WALLET & PROFILE
        </h1>
        <button
          onClick={() => setShowSettingModal(true)}
          className="p-2.5 rounded-xl border bg-gray-900 border-gray-800 text-cyan-400 shadow-md hover:scale-105 transition-all font-bold text-xs flex items-center gap-1 cursor-pointer"
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Profile Card with Unique UID Display */}
      <div className="w-full bg-gray-900 border border-purple-500/30 rounded-2xl p-4 mb-4 flex flex-col gap-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold">{userName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] text-cyan-400 font-bold">UID: {gameUid}</p>
              <button
                onClick={handleCopyUid}
                className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-[9px] font-bold rounded hover:bg-cyan-500 hover:text-black transition-all cursor-pointer"
              >
                📋 Copy
              </button>
            </div>
          </div>
          <button
            onClick={handleOpenProfileModal}
            className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs rounded-xl font-bold shadow hover:opacity-90 transition-all active:scale-95 cursor-pointer"
          >
            ✏️ Complete Profile
          </button>
        </div>

        {/* User Info Grid */}
        <div className="bg-black/40 border border-gray-800 p-2.5 rounded-xl grid grid-cols-2 gap-2 text-[10px]">
          <div>
            <span className="text-gray-500 block">Email:</span>
            <span className="text-gray-200 font-semibold truncate block">{userEmail}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Mobile:</span>
            <span className="text-green-400 font-semibold">{userMobile}</span>
          </div>
          <div>
            <span className="text-gray-500 block">City / District:</span>
            <span className="text-cyan-300 font-semibold">{userCity}, {userDistrict}</span>
          </div>
          <div>
            <span className="text-gray-500 block">ZIP Code:</span>
            <span className="text-yellow-400 font-semibold">{userZip}</span>
          </div>
        </div>
      </div>

      {/* 3 Balance Boxes */}
      <div className="w-full grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl text-center shadow">
          <p className="text-[9px] text-gray-400 font-bold">CASH</p>
          <p className="text-xs font-black text-green-400 mt-1">NPR {winningCash}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl text-center shadow">
          <p className="text-[9px] text-gray-400 font-bold">WHITE DIAMOND</p>
          <p className="text-xs font-black text-cyan-400 mt-1">{whiteDiamonds} 💎</p>
        </div>
        <div className="bg-gray-900 border border-red-500/60 bg-red-950/30 p-3 rounded-xl text-center shadow">
          <p className="text-[9px] text-red-300 font-bold">RED DIAMOND</p>
          <p className="text-xs font-black text-red-400 mt-1">{redDiamonds} 🔴</p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="w-full grid grid-cols-2 gap-2 mb-4">
        <div 
          onClick={() => setShowWithdrawModal(true)}
          className="bg-gradient-to-br from-green-950/80 to-gray-900 border border-green-500/40 p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer hover:border-green-400 active:scale-95 transition-all shadow-lg"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xl">💸</span>
            <span className="text-[9px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold">Min 500 NPR</span>
          </div>
          <div>
            <h3 className="text-xs font-black text-green-300 uppercase">Withdraw Cash</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">eSewa, Khalti, Bank & more</p>
          </div>
        </div>

        <div 
          onClick={() => setShowExchangeModal(true)}
          className="bg-gradient-to-br from-red-950/80 to-gray-900 border border-red-500/40 p-3.5 rounded-2xl flex flex-col justify-between cursor-pointer hover:border-red-400 active:scale-95 transition-all shadow-lg"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xl">🔄</span>
            <span className="text-[9px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">1:1 Value</span>
          </div>
          <div>
            <h3 className="text-xs font-black text-red-300 uppercase">Red Diamond Exchange</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Convert to Cash balance</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="w-full grid grid-cols-4 gap-1 bg-gray-900 p-1 rounded-xl mb-4">
        {(['cash', 'white', 'red', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-red-500 text-black shadow font-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* CASH TAB */}
      {activeTab === 'cash' && (
        <div className="w-full flex flex-col gap-4">
          <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-2xl text-center shadow-lg">
            <h3 className="text-xs font-bold text-gray-400">WINNING CASH BALANCE</h3>
            <p className="text-3xl font-black text-green-400 my-2">NPR {winningCash}</p>
            <p className="text-[11px] text-gray-400 mb-4">
              Secure withdrawals range from **NPR 500 up to NPR 10,000** via eSewa, Khalti, CallPay, ConnectIPS, or Bank Account.
            </p>
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="w-full py-3 bg-green-600 hover:bg-green-500 font-black text-xs rounded-xl text-white shadow-lg transition-all cursor-pointer"
            >
              💸 OPEN WITHDRAWAL PANEL
            </button>
          </div>
        </div>
      )}

      {/* WHITE DIAMONDS TAB */}
      {activeTab === 'white' && (
        <div className="w-full bg-gray-900/80 border border-gray-800 p-4 rounded-2xl text-center shadow-lg">
          <h3 className="text-xs font-bold text-gray-400">WHITE DIAMOND BALANCE</h3>
          <p className="text-2xl font-black text-cyan-400 mb-4">{whiteDiamonds} 💎</p>
          <div className="bg-black/40 border border-cyan-500/30 p-3 rounded-xl mb-4">
            <p className="text-[10px] text-gray-300">
              Convert 2,00,000 White Diamonds into 100 Red Diamonds instantly!
            </p>
          </div>
          <button
            onClick={() => {
              if (whiteDiamonds >= 200000) {
                const newWhite = whiteDiamonds - 200000;
                setWhiteDiamonds(newWhite);
                localStorage.setItem('arena_white_diamonds', newWhite.toString());
                updateWalletBalance(100);
                alert('Successfully exchanged 2,00,000 White Diamonds for 100 Red Diamonds!');
              } else {
                alert('Insufficient White Diamonds! You need at least 2,00,000 White Diamonds.');
              }
            }}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-black text-xs rounded-xl shadow hover:opacity-90 transition-all cursor-pointer"
          >
            EXCHANGE 2L WHITE ➔ 100 RED DIAS
          </button>
        </div>
      )}

      {/* RED DIAMONDS TAB */}
      {activeTab === 'red' && (
        <div className="w-full flex flex-col gap-3">
          <div className="flex justify-between items-center bg-gray-900 border border-red-500/50 p-3 rounded-xl shadow-lg">
            <div>
              <p className="text-xs font-bold text-red-400">CENTRAL RED DIAMOND BALANCE</p>
              <p className="text-lg font-black text-red-400">{redDiamonds} 🔴</p>
            </div>
            <button
              onClick={() => setShowExchangeModal(true)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
            >
              Exchange to Cash
            </button>
          </div>

          <h3 className="text-xs font-bold text-pink-400 mt-2">
            BUY RED DIAMONDS (GET +1 SPIN TOKEN PER DEPOSIT)
          </h3>
          {redPackages.map((pkg, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-gray-900 border border-gray-800 p-3 rounded-xl shadow"
            >
              <div>
                <p className="text-xs font-bold text-white">🔴 {pkg.diamonds} Red Diamonds</p>
                <p className="text-[10px] text-yellow-400">NPR {pkg.price} <span className="text-green-400 font-bold ml-1">(+1 Spin Token)</span></p>
              </div>
              <button
                onClick={() => handleDepositTopUp(pkg.diamonds, pkg.price)}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white font-bold text-[10px] rounded-lg shadow cursor-pointer"
              >
                Buy via WhatsApp
              </button>
            </div>
          ))}
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="w-full bg-gray-900/80 border border-gray-800 p-4 rounded-2xl shadow-lg">
          <h3 className="text-xs font-bold text-gray-400 mb-3">TRANSACTION HISTORY</h3>
          {historyList.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No transaction history found yet.</p>
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
                  <span
                    className={`text-[10px] px-2 py-1 rounded font-bold border ${
                      item.status === 'Success'
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COMPLETE PROFILE MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-gray-900 border border-gray-800 text-white rounded-2xl p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-3">
              <h3 className="text-sm font-black text-pink-400">📝 COMPLETE PROFILE</h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-gray-400 hover:text-white font-bold text-base px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-[10px] text-gray-400 font-semibold mb-1 block">Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="w-full bg-black border border-gray-800 text-white p-2.5 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-semibold mb-1 block">Email Address</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  className="w-full bg-black border border-gray-800 text-white p-2.5 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-semibold mb-1 block">Mobile Number</label>
                <input
                  type="text"
                  placeholder="Enter mobile number"
                  value={inputMobile}
                  onChange={(e) => setInputMobile(e.target.value)}
                  className="w-full bg-black border border-gray-800 text-white p-2.5 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold mb-1 block">City (Shahar)</label>
                  <input
                    type="text"
                    placeholder="e.g. Kathmandu"
                    value={inputCity}
                    onChange={(e) => setInputCity(e.target.value)}
                    className="w-full bg-black border border-gray-800 text-white p-2.5 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold mb-1 block">District (Jila)</label>
                  <input
                    type="text"
                    placeholder="e.g. Kathmandu"
                    value={inputDistrict}
                    onChange={(e) => setInputDistrict(e.target.value)}
                    className="w-full bg-black border border-gray-800 text-white p-2.5 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-semibold mb-1 block">ZIP / Postal Code</label>
                <input
                  type="text"
                  placeholder="e.g. 44600"
                  value={inputZip}
                  onChange={(e) => setInputZip(e.target.value)}
                  className="w-full bg-black border border-gray-800 text-white p-2.5 rounded-xl"
                  required
                />
              </div>

              <button
                type="submit"
                className="mt-3 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 font-black text-xs rounded-xl text-black shadow-lg transition-all cursor-pointer"
              >
                Save Profile Details
              </button>
            </form>
          </div>
        </div>
      )}

      {/* WITHDRAW MODAL WITH AUTOMATIC UID, QR UPLOAD FOR ALL METHODS, AND DEDUCTION LOGIC */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-gray-900 border border-gray-800 text-white rounded-2xl p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-3">
              <h3 className="text-sm font-black text-green-400">💸 WITHDRAW WINNING CASH</h3>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-gray-400 hover:text-white font-bold text-base px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Payment Options Selection Bar */}
            <div className="grid grid-cols-5 gap-1 mb-4">
              {(['eSewa', 'Khalti', 'CallPay', 'ConnectIPS', 'Bank'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setWithdrawMethod(method)}
                  className={`py-2 text-[10px] font-bold rounded-xl border transition-all cursor-pointer ${
                    withdrawMethod === method
                      ? 'bg-green-500 text-black border-green-400 shadow'
                      : 'bg-black/50 text-gray-300 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>

            <form onSubmit={handleWithdrawSubmit} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-[10px] text-gray-400 font-semibold mb-1 block">Game UID (Automatic)</label>
                <input
                  type="text"
                  value={gameUid}
                  readOnly
                  className="w-full bg-black/80 border border-gray-800 text-cyan-400 font-bold p-2.5 rounded-xl cursor-not-allowed select-all"
                  title="Your unique UID is automatically fetched from your profile."
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-semibold mb-1 block">Withdraw Amount (NPR 500 - 10,000)</label>
                <input
                  type="number"
                  min="500"
                  max="10000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full bg-black border border-gray-800 text-white p-2.5 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-semibold mb-1 block">
                  {withdrawMethod === 'Bank' ? 'Bank Account Number' : `${withdrawMethod} Mobile Number`}
                </label>
                <input
                  type="text"
                  placeholder="Enter Account/Number"
                  value={withdrawAccountNo}
                  onChange={(e) => setWithdrawAccountNo(e.target.value)}
                  className="w-full bg-black border border-gray-800 text-white p-2.5 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-semibold mb-1 block">
                  {withdrawMethod === 'Bank' ? 'Bank Name & Branch' : 'Account Holder Full Name'}
                </label>
                <input
                  type="text"
                  placeholder="Enter Name"
                  value={withdrawAccountName}
                  onChange={(e) => setWithdrawAccountName(e.target.value)}
                  className="w-full bg-black border border-gray-800 text-white p-2.5 rounded-xl"
                  required
                />
              </div>

              {/* QR Upload Option for ALL payment methods */}
              <div>
                <label className="text-[10px] text-gray-400 font-semibold mb-1 block">
                  Upload {withdrawMethod} QR Code (Optional/Recommended Image)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrUpload}
                  className="w-full bg-black border border-gray-800 text-gray-300 text-[10px] p-2 rounded-xl file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-green-500 file:text-black hover:file:bg-green-400 cursor-pointer"
                />
                {withdrawQrFile && (
                  <p className="text-[9px] text-green-400 mt-1">✓ QR Code attached successfully</p>
                )}
              </div>

              <button
                type="submit"
                className="mt-3 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 font-black text-xs rounded-xl text-black shadow-lg transition-all cursor-pointer"
              >
                Submit Withdraw to WhatsApp
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RED DIAMOND EXCHANGE MODAL */}
      {showExchangeModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-gray-900 border border-red-500/40 text-white rounded-2xl p-5 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-3">
              <h3 className="text-sm font-black text-red-400">🔄 RED DIAMOND EXCHANGE</h3>
              <button
                onClick={() => setShowExchangeModal(false)}
                className="text-gray-400 hover:text-white font-bold text-base px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-300 mb-4">
              Convert your Red Diamonds into instant Winning Cash (1 Red Diamond = 1 NPR Cash).
            </p>
            <div className="flex flex-col gap-2">
              {[100, 500, 1000, 2000, 5000].map((count) => (
                <button
                  key={count}
                  onClick={() => handleRedDiamondExchange(count)}
                  className="py-2.5 px-3 bg-red-950/60 border border-red-500/40 hover:bg-red-600 hover:text-black font-bold text-xs rounded-xl flex justify-between items-center transition-all cursor-pointer"
                >
                  <span>🔴 {count} Red Diamonds</span>
                  <span className="text-green-400 font-black">➔ NPR {count} Cash</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettingModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-gray-900 border border-gray-800 text-white rounded-2xl p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-3">
              <h3 className="text-sm font-black text-cyan-400">⚙️ ARENA NEPAL SETTINGS</h3>
              <button
                onClick={() => setShowSettingModal(false)}
                className="text-gray-400 hover:text-white font-bold text-base px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1 bg-black p-1 rounded-xl mb-4 text-[10px] font-bold">
              {(['support', 'terms', 'about'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSettingTab(tab)}
                  className={`py-2 rounded-lg uppercase transition-all cursor-pointer ${
                    settingTab === tab ? 'bg-cyan-500 text-black shadow' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="text-xs text-gray-300 flex flex-col gap-3">
              {settingTab === 'support' && (
                <div>
                  <h4 className="font-bold text-cyan-400 mb-1">Customer Support</h4>
                  <p className="text-[11px] text-gray-400 mb-3">
                    Need help with tournaments, deposits, or withdrawals? Reach out to our official support team directly via WhatsApp.
                  </p>
                  <a
                    href="https://wa.me/9779716782200?text=Hello%20Arena%20Nepal%20Support"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow"
                  >
                    💬 Chat on WhatsApp
                  </a>
                </div>
              )}

              {settingTab === 'terms' && (
                <div>
                  <h4 className="font-bold text-cyan-400 mb-1">Terms & Conditions</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    1. All players must provide accurate mobile and UID details.<br />
                    2. Minimum withdrawal is NPR 500 and maximum is NPR 10,000 per request.<br />
                    3. Fraudulent activities or fake QR code submissions will result in immediate account termination and forfeiture of wallet balance.
                  </p>
                </div>
              )}

              {settingTab === 'about' && (
                <div>
                  <h4 className="font-bold text-cyan-400 mb-1">About Arena Nepal</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Arena Nepal is the ultimate esports and casual gaming tournament platform in Nepal. Play neon games, compete in tournaments, and win instant cash rewards!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}