'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getWalletBalance, updateWalletBalance } from '@/lib/wallet';

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
  // 👇 Added 'refer' to activeTab type
  const [activeTab, setActiveTab] = useState<'deposit' | 'cash' | 'white' | 'red' | 'history' | 'refer'>('deposit');

  const [userName, setUserName] = useState<string>('New Player');
  const [gameUid, setGameUid] = useState<string>('#AN-000000');
  const [userEmail, setUserEmail] = useState<string>('No Email Added');
  const [userMobile, setUserMobile] = useState<string>('No Mobile Added');
  const [userCity, setUserCity] = useState<string>('Not Specified');
  const [userDistrict, setUserDistrict] = useState<string>('Not Specified');
  const [userZip, setUserZip] = useState<string>('00000');

  const [redDiamonds, setRedDiamonds] = useState<number>(1000);
  const [whiteDiamonds, setWhiteDiamonds] = useState<number>(5000);
  const [winningCash, setWinningCash] = useState<number>(0);

  // Turnover & Bonus States
  const [bonusTaken, setBonusTaken] = useState<boolean>(false);
  const [turnoverRequired, setTurnoverRequired] = useState<number>(0);
  const [turnoverCompleted, setTurnoverCompleted] = useState<number>(0);

  // Refer & Earn States
  const [referralCount, setReferralCount] = useState<number>(0);
  const [referralEarnings, setReferralEarnings] = useState<number>(0);

  // Deposit States
  const [depositMethod, setDepositMethod] = useState<'eSewa' | 'Khalti' | 'CallPay' | 'ConnectIPS' | 'Bank'>('eSewa');
  const [isFirstDeposit, setIsFirstDeposit] = useState<boolean>(true);
  const [enableBonus, setEnableBonus] = useState<boolean>(true);

  // Withdraw Modal States (0% Fee) with QR Upload Option Added
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [withdrawMethod, setWithdrawMethod] = useState<'eSewa' | 'Khalti' | 'CallPay' | 'ConnectIPS' | 'Bank'>('eSewa');
  const [withdrawAccountNo, setWithdrawAccountNo] = useState<string>('');
  const [withdrawAccountName, setWithdrawAccountName] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('500');
  const [withdrawQrImage, setWithdrawQrImage] = useState<string | null>(null);

  // Exchange & Profile Modals
  const [showExchangeModal, setShowExchangeModal] = useState<boolean>(false);
  const [showCashToRedModal, setShowCashToRedModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [inputName, setInputName] = useState<string>('');
  const [inputEmail, setInputEmail] = useState<string>('');
  const [inputMobile, setInputMobile] = useState<string>('');
  const [inputCity, setInputCity] = useState<string>('');
  const [inputDistrict, setInputDistrict] = useState<string>('');
  const [inputZip, setInputZip] = useState<string>('');

  const [showSettingModal, setShowSettingModal] = useState<boolean>(false);
  const [settingTab, setSettingTab] = useState<'support' | 'terms' | 'about'>('support');
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);

  const fetchUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        const authUser = session.user;
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileData) {
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

          if (profileData.bonus_taken !== undefined) setBonusTaken(profileData.bonus_taken);
          if (profileData.turnover_required !== undefined) setTurnoverRequired(profileData.turnover_required);
          if (profileData.turnover_completed !== undefined) setTurnoverCompleted(profileData.turnover_completed);

          // Fetch Referrals if columns exist in profiles or separate table
          if (profileData.referral_count !== undefined) setReferralCount(profileData.referral_count);
          if (profileData.referral_earnings !== undefined) setReferralEarnings(profileData.referral_earnings);

          const { count } = await supabase
            .from('deposit_requests')
            .select('*', { count: 'exact', head: true })
            .eq('user_uid', profileData.uid);

          if (count && count > 0) {
            setIsFirstDeposit(false);
          } else {
            setIsFirstDeposit(true);
          }

          const { data: historyData } = await supabase
            .from('withdraw_requests')
            .select('*')
            .eq('user_uid', profileData.uid)
            .order('created_at', { ascending: false });

          if (historyData) {
            const formattedHistory: HistoryItem[] = historyData.map((item: any) => ({
              type: 'Withdraw Request',
              details: `NPR ${item.amount} via ${item.method || 'eSewa'} (${item.account_no}) [0% Fee]`,
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

  const handleWithdrawQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setWithdrawQrImage(reader.result as string);
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

    if (!withdrawQrImage) {
      alert('⚠️ सुरक्षाको लागि कृपया आफ्नो eSewa/Khalti QR Code अपलोड गर्नुहोस् ताकि gल्ती nहोस्। (Please upload your QR code to avoid errors)');
      return;
    }

    const feeAmount = 0; 
    const finalPayout = amountNum;

    await supabase.from('withdraw_requests').insert([
      {
        user_uid: gameUid,
        username: userName,
        method: withdrawMethod,
        account_no: withdrawAccountNo,
        account_name: withdrawAccountName,
        amount: amountNum,
        fee: feeAmount,
        payout: finalPayout,
        status: 'Processing',
      },
    ]);

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

    setHistoryList((prev: HistoryItem[]) => [
      {
        type: 'Withdraw Request',
        details: `Requested: NPR ${amountNum} (0% Fee | Payout: NPR ${finalPayout}) via ${withdrawMethod} + QR attached`,
        date: new Date().toLocaleDateString(),
        status: 'Processing',
      },
      ...prev,
    ]);

    setShowWithdrawModal(false);
    alert(`Withdrawal request submitted successfully! (0% Platform Fee). Redirecting to WhatsApp with QR details...`);

    const whatsappNumber = '9779716782200';
    const message = `🚀 *NEW WITHDRAWAL REQUEST*%0A-----------------------------------%0A👤 *Name:* ${userName}%0A🆔 *UID:* ${gameUid}%0A💳 *Method:* ${withdrawMethod}%0A🔢 *Account No:* ${withdrawAccountNo}%0A👤 *Account Name:* ${withdrawAccountName}%0A💰 *Amount:* NPR ${amountNum}%0A📸 *(User attached QR code for scanning)*%0A-----------------------------------%0Aकृपया मेरो भुक्तानी छिटो पठाइदिनुहोला!`;
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  const handleRedDiamondExchange = async (count: number) => {
    const currentRed = getWalletBalance();
    if (currentRed < count) {
      alert(`Insufficient Red Diamonds! You need at least ${count} Red Diamonds.`);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      const { data: freshProfile } = await supabase
        .from('profiles')
        .select('bonus_taken, turnover_required, turnover_completed')
        .eq('id', session.user.id)
        .single();

      if (freshProfile && freshProfile.bonus_taken) {
        if (freshProfile.turnover_completed < freshProfile.turnover_required) {
          alert(`❌ Turnover Incomplete!\nAapne bonus liya hai. Exchange karne ke liye aapko pehle ${freshProfile.turnover_required} diamonds ka game khelna hoga.\n(Abhi tak aapne khele hain: ${freshProfile.turnover_completed} diamonds)`);
          return;
        }
      }
    }

    const feeAmount = count * 0.05;
    const netCashToAdd = count - feeAmount;

    const newRed = updateWalletBalance(-count);
    setRedDiamonds(newRed);

    const newCash = winningCash + netCashToAdd;
    setWinningCash(newCash);
    localStorage.setItem('arena_winning_cash', newCash.toString());

    if (session && session.user) {
      await supabase
        .from('profiles')
        .update({ red_diamonds: newRed, winning_cash: newCash })
        .eq('id', session.user.id);
    }

    alert(`Successfully exchanged ${count} Red Diamonds!\n5% Platform Fee: NPR ${feeAmount}\nAdded to Cash Balance: NPR ${netCashToAdd}`);
    setShowExchangeModal(false);
  };

  const handleCashToRedExchange = async (amount: number) => {
    if (winningCash < amount) {
      alert(`Insufficient Cash Balance! You need at least NPR ${amount}.`);
      return;
    }

    const newCash = winningCash - amount;
    setWinningCash(newCash);
    localStorage.setItem('arena_winning_cash', newCash.toString());

    const newRed = updateWalletBalance(amount);
    setRedDiamonds(newRed);

    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      await supabase
        .from('profiles')
        .update({ winning_cash: newCash, red_diamonds: newRed })
        .eq('id', session.user.id);
    }

    alert(`Successfully exchanged NPR ${amount} Cash for ${amount} Red Diamonds! 🔴`);
    setShowCashToRedModal(false);
  };

  const handleDepositTopUp = (diamonds: number, price: number) => {
    const bonusPercentage = isFirstDeposit ? 100 : 50;
    const bonusDiamonds = enableBonus ? Math.floor((diamonds * bonusPercentage) / 100) : 0;
    const totalDiamondsToCredit = diamonds + bonusDiamonds;

    const bonusStatusText = enableBonus 
      ? `YES (${bonusPercentage}% Bonus Applied - Turnover Required)` 
      : `NO (Clean Funds / No Bonus)`;

    alert(`🎉 Deposit order ready via ${depositMethod}!\nTotal Diamonds: ${totalDiamondsToCredit}\nRedirecting to WhatsApp...`);

    const whatsappNumber = '9779716782200';
    const message = `🚀 *DEPOSIT REQUEST*%0A-----------------------------------%0A👤 *Name:* ${userName}%0A🆔 *UID:* ${gameUid}%0A💳 *Payment Method:* ${depositMethod}%0A💎 *Package:* ${diamonds} Red Diamonds%0A💰 *Price:* NPR ${price}%0A🎁 *Bonus Wanted:* ${bonusStatusText}%0A🎁 *Bonus Diamonds:* ${bonusDiamonds} Red Diamonds%0A💎 *Total Expected Diamonds:* ${totalDiamondsToCredit} Red Diamonds%0A-----------------------------------%0APlease send your payment QR scanner!`;

    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
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
      <div className="w-full flex items-center justify-between mb-3">
        <h1 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400">
          WALLET & PROFILE
        </h1>
        <button
          onClick={() => setShowSettingModal(true)}
          className="p-2 rounded-xl border bg-gray-900 border-gray-800 text-cyan-400 shadow-md hover:scale-105 transition-all font-bold text-xs flex items-center gap-1 cursor-pointer"
        >
          ⚙️ Settings
        </button>
      </div>

      {/* COMPACT PROFILE BOX */}
      <div className="w-full bg-gray-900 border border-purple-500/30 rounded-2xl p-3 mb-3 flex flex-col gap-2 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold">{userName}</h2>
            <div className="flex items-center gap-2 mt-0.5">
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
            className="px-2.5 py-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px] rounded-lg font-bold shadow hover:opacity-95 transition-all cursor-pointer"
          >
            ✏️ Edit Profile
          </button>
        </div>

        {bonusTaken && turnoverRequired > 0 && (
          <div className="bg-red-950/40 border border-red-500/40 p-2 rounded-xl text-[10px]">
            <p className="text-red-300 font-bold mb-1">⚠️ Active Turnover Target:</p>
            <p className="text-gray-300">
              Completed: <span className="text-green-400 font-bold">{turnoverCompleted}</span> / {turnoverRequired} Diamonds
            </p>
            <div className="w-full bg-black/60 h-2 rounded-full mt-1 overflow-hidden border border-gray-800">
              <div 
                className="bg-gradient-to-r from-red-500 to-green-500 h-full transition-all duration-300" 
                style={{ width: `${Math.min(100, (turnoverCompleted / turnoverRequired) * 100)}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="bg-black/40 border border-gray-800 p-2 rounded-xl grid grid-cols-2 gap-1 text-[9px]">
          <div>
            <span className="text-gray-500">Email:</span> <span className="text-gray-200">{userEmail}</span>
          </div>
          <div>
            <span className="text-gray-500">Mobile:</span> <span className="text-green-400">{userMobile}</span>
          </div>
        </div>
      </div>

      {/* GLOWING FIRST DEPOSIT BANNER WITH CLAIM BUTTON REDIRECTING TO DEPOSIT */}
      <div className="w-full mb-3 p-[2px] rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 animate-pulse shadow-lg">
        <div className="bg-gray-950 rounded-[14px] p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎁</span>
            <div>
              <h3 className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-yellow-300">
                FIRST DEPOSIT OFFER!
              </h3>
              <p className="text-[10px] text-gray-300 font-medium">
                Deposit now & get <span className="text-green-400 font-bold">100% Bonus Pack</span> instantly!
              </p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('deposit')}
            className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black text-[10px] rounded-xl shadow cursor-pointer hover:scale-105 transition-all"
          >
            Claim Now
          </button>
        </div>
      </div>

      <div className="w-full grid grid-cols-3 gap-2 mb-3">
        <div className="bg-gray-900 border border-gray-800 p-2.5 rounded-xl text-center shadow">
          <p className="text-[9px] text-gray-400 font-bold">CASH</p>
          <p className="text-xs font-black text-green-400 mt-1">NPR {winningCash}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-2.5 rounded-xl text-center shadow">
          <p className="text-[9px] text-gray-400 font-bold">WHITE DIAMOND</p>
          <p className="text-xs font-black text-cyan-400 mt-1">{whiteDiamonds} 💎</p>
        </div>
        <div className="bg-gray-900 border border-red-500/60 bg-red-950/30 p-2.5 rounded-xl text-center shadow">
          <p className="text-[9px] text-red-300 font-bold">RED DIAMOND</p>
          <p className="text-xs font-black text-red-400 mt-1">{redDiamonds} 🔴</p>
        </div>
      </div>

      <div className="w-full grid grid-cols-3 gap-2 mb-4">
        <div 
          onClick={() => setShowWithdrawModal(true)}
          className="bg-gradient-to-br from-green-950/80 to-gray-900 border border-green-500/40 p-3 rounded-2xl flex flex-col justify-between cursor-pointer hover:border-green-400 transition-all shadow-lg"
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-lg">💸</span>
            <span className="text-[8px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-bold">0% Fee</span>
          </div>
          <div>
            <h3 className="text-[11px] font-black text-green-300 uppercase">Withdraw</h3>
            <p className="text-[9px] text-gray-400">Instant payout</p>
          </div>
        </div>

        <div 
          onClick={() => setShowCashToRedModal(true)}
          className="bg-gradient-to-br from-cyan-950/80 to-gray-900 border border-cyan-500/40 p-3 rounded-2xl flex flex-col justify-between cursor-pointer hover:border-cyan-400 transition-all shadow-lg"
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-lg">💎</span>
            <span className="text-[8px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full font-bold">1:1 Pack</span>
          </div>
          <div>
            <h3 className="text-[11px] font-black text-cyan-300 uppercase">Cash ➔ Red</h3>
            <p className="text-[9px] text-gray-400">Buy Red Dias</p>
          </div>
        </div>

        <div 
          onClick={() => setShowExchangeModal(true)}
          className="bg-gradient-to-br from-red-950/80 to-gray-900 border border-red-500/40 p-3 rounded-2xl flex flex-col justify-between cursor-pointer hover:border-red-400 transition-all shadow-lg"
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-lg">🔄</span>
            <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold">5% Comm.</span>
          </div>
          <div>
            <h3 className="text-[11px] font-black text-red-300 uppercase">Red ➔ Cash</h3>
            <p className="text-[9px] text-gray-400">Convert to Cash</p>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION (Expanded to 6 columns for clean layout) */}
      <div className="w-full grid grid-cols-6 gap-1 bg-gray-900 p-1 rounded-xl mb-4">
        {(['deposit', 'cash', 'white', 'red', 'history', 'refer'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 text-[8px] sm:text-[9px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-red-500 text-black shadow font-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'refer' ? '🤝 Refer' : tab}
          </button>
        ))}
      </div>

      {activeTab === 'deposit' && (
        <div className="w-full flex flex-col gap-3">
          <div className="bg-gray-900 border border-purple-500/40 p-4 rounded-2xl shadow-lg">
            <h3 className="text-xs font-black text-pink-400 mb-2 uppercase">1. Choose Payment Method</h3>
            <div className="grid grid-cols-5 gap-1 mb-3">
              {(['eSewa', 'Khalti', 'CallPay', 'ConnectIPS', 'Bank'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setDepositMethod(method)}
                  className={`py-2 text-[9px] font-bold rounded-xl border transition-all cursor-pointer ${
                    depositMethod === method
                      ? 'bg-cyan-500 text-black border-cyan-400 shadow font-black'
                      : 'bg-black/50 text-gray-300 border-gray-800'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>

            <div className="bg-black/60 border border-yellow-500/40 p-3 rounded-xl flex items-start gap-2 cursor-pointer" onClick={() => setEnableBonus(!enableBonus)}>
              <input
                type="checkbox"
                checked={enableBonus}
                onChange={(e) => setEnableBonus(e.target.checked)}
                className="mt-0.5 accent-pink-500 cursor-pointer"
              />
              <div className="text-[10px]">
                <p className="font-bold text-yellow-300">
                  {isFirstDeposit ? 'Get 100% First Deposit Bonus (Requires Turnover)' : 'Get 50% Deposit Bonus (Requires Turnover)'}
                </p>
                <p className="text-gray-400 text-[9px]">Uncheck if you want clean funds without turnover restrictions.</p>
              </div>
            </div>
          </div>

          <h3 className="text-xs font-bold text-pink-400 mt-1">
            2. Select Red Diamond Package (Via {depositMethod})
          </h3>
          {redPackages.map((pkg, idx) => {
            const bonusPercent = isFirstDeposit ? 100 : 50;
            const extraBonus = Math.floor((pkg.diamonds * bonusPercent) / 100);
            return (
              <div
                key={idx}
                className="flex items-center justify-between bg-gray-900 border border-gray-800 p-3 rounded-xl shadow"
              >
                <div>
                  <p className="text-xs font-bold text-white">
                    🔴 {pkg.diamonds} Red Diamonds {enableBonus && <span className="text-pink-400 text-[10px]">(+ {extraBonus} Bonus)</span>}
                  </p>
                  <p className="text-[10px] text-yellow-400">NPR {pkg.price} <span className="text-gray-500 text-[9px] ml-1">(Spin token added on approval)</span></p>
                </div>
                <button
                  onClick={() => handleDepositTopUp(pkg.diamonds, pkg.price)}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white font-bold text-[10px] rounded-lg shadow cursor-pointer"
                >
                  Deposit via WhatsApp
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'cash' && (
        <div className="w-full flex flex-col gap-4">
          <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-2xl text-center shadow-lg">
            <h3 className="text-xs font-bold text-gray-400">WINNING CASH BALANCE</h3>
            <p className="text-3xl font-black text-green-400 my-2">NPR {winningCash}</p>
            <p className="text-[11px] text-gray-400 mb-4">
              Withdrawals range from **NPR 500 up to NPR 10,000** via eSewa, Khalti, CallPay, ConnectIPS, or Bank Account. <span className="text-green-400 font-bold">0% fee (Free withdrawal!).</span>
            </p>
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="w-full py-3 bg-green-600 hover:bg-green-500 font-black text-xs rounded-xl text-white shadow-lg transition-all cursor-pointer"
            >
              💸 OPEN FREE WITHDRAWAL PANEL (0% FEE)
            </button>
          </div>
        </div>
      )}

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
            className="w-full py-2.5 bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-black text-xs rounded-xl shadow transition-all cursor-pointer"
          >
            EXCHANGE 2L WHITE ➔ 100 RED DIAS
          </button>
        </div>
      )}

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
              Exchange to Cash (5% Fee)
            </button>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="w-full bg-gray-900/80 border border-gray-800 p-4 rounded-2xl shadow-lg">
          <h3 className="text-xs font-bold text-gray-400 mb-3">TRANSACTION HISTORY</h3>
          {historyList.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No transaction history found yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {historyList.map((item, index) => (
                <div key={index} className="bg-black/40 border border-gray-800 p-3 rounded-xl text-[10px]">
                  <div className="flex justify-between font-bold mb-1">
                    <span className="text-cyan-400">{item.type}</span>
                    <span className={`px-1.5 py-0.5 rounded ${
                      item.status === 'Approved' ? 'bg-green-500/20 text-green-400' : 
                      item.status === 'Rejected' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-gray-200">{item.details}</p>
                  <p className="text-[9px] text-gray-500 mt-1">{item.date}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 👇 PERFECT REFER & EARN 10% COMMISSION TAB */}
      {activeTab === 'refer' && (
        <div className="w-full bg-gradient-to-br from-purple-950 via-gray-900 to-indigo-950 border-2 border-pink-500/60 p-4 rounded-2xl shadow-2xl flex flex-col gap-4 animate-fadeIn">
          
          <div className="text-center">
            <span className="text-3xl">🤝</span>
            <h3 className="text-xs font-black text-white mt-1 uppercase tracking-wider">Refer Friends & Earn 10% Commission</h3>
            <p className="text-[10px] text-gray-300 mt-0.5">
              Share your invite link. When your friends make a deposit, <span className="text-yellow-400 font-bold">10% commission</span> is automatically added to your cash balance!
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-black/50 border border-pink-500/30 p-2.5 rounded-xl text-center">
              <p className="text-[9px] text-gray-400 uppercase font-bold">Total Referred</p>
              <p className="text-sm font-black text-cyan-400 mt-0.5">{referralCount} Players</p>
            </div>
            <div className="bg-black/50 border border-pink-500/30 p-2.5 rounded-xl text-center">
              <p className="text-[9px] text-gray-400 uppercase font-bold">Commission Earned</p>
              <p className="text-sm font-black text-yellow-400 mt-0.5">NPR {referralEarnings}</p>
            </div>
          </div>

          {/* Referral Link Box */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-300">Your Unique Referral Link:</label>
            <div className="flex items-center gap-2 bg-black/70 p-2 rounded-xl border border-gray-700">
              <input
                type="text"
                readOnly
                value={`https://arenanepal.com/signup?ref=${gameUid}`}
                className="bg-transparent text-[10px] text-yellow-300 flex-1 outline-none px-1 truncate font-mono"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://arenanepal.com/signup?ref=${gameUid}`);
                  alert('Referral link copied to clipboard!');
                }}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-black text-[10px] px-3 py-1.5 rounded-lg transition cursor-pointer shadow"
              >
                Copy Link
              </button>
            </div>
          </div>

          <div className="bg-black/40 border border-yellow-500/20 p-2.5 rounded-xl text-[9px] text-gray-300 space-y-1">
            <p className="font-bold text-yellow-400">💡 How it works:</p>
            <p>1. Copy your unique link and share with your friends on WhatsApp or Messenger.</p>
            <p>2. When they join using your UID link and complete a deposit.</p>
            <p>3. You instantly get a 10% commission credited directly to your winning cash balance!</p>
          </div>

        </div>
      )}

      {/* WITHDRAW MODAL */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-green-500/50 w-full max-w-sm rounded-2xl p-4 shadow-2xl relative">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-black text-green-400 uppercase">💸 Free Withdrawal (0% Fee)</h3>
              <button onClick={() => setShowWithdrawModal(false)} className="text-gray-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleWithdrawSubmit} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-[10px] text-gray-400 font-bold">Method</label>
                <select 
                  value={withdrawMethod} 
                  onChange={(e) => setWithdrawMethod(e.target.value as any)}
                  className="w-full bg-black/60 border border-gray-800 p-2 rounded-xl text-white mt-1 text-xs outline-none"
                >
                  <option value="eSewa">eSewa</option>
                  <option value="Khalti">Khalti</option>
                  <option value="CallPay">CallPay</option>
                  <option value="ConnectIPS">ConnectIPS</option>
                  <option value="Bank">Bank Account</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-bold">Account Number / Mobile</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 98XXXXXXXX" 
                  value={withdrawAccountNo}
                  onChange={(e) => setWithdrawAccountNo(e.target.value)}
                  className="w-full bg-black/60 border border-gray-800 p-2 rounded-xl text-white mt-1 text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-bold">Account Holder Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="Full Name" 
                  value={withdrawAccountName}
                  onChange={(e) => setWithdrawAccountName(e.target.value)}
                  className="w-full bg-black/60 border border-gray-800 p-2 rounded-xl text-white mt-1 text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-bold">Amount (NPR 500 - 10,000)</label>
                <input 
                  type="number" 
                  required
                  min="500"
                  max="10000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full bg-black/60 border border-gray-800 p-2 rounded-xl text-white mt-1 text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-yellow-400 font-bold">📸 Upload Your QR Code (Required for Verification)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleWithdrawQrUpload}
                  className="w-full text-[10px] text-gray-400 mt-1 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-green-600 file:text-white hover:file:bg-green-500 cursor-pointer"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white font-black text-xs rounded-xl shadow transition mt-2 cursor-pointer"
              >
                Submit Withdrawal Request
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RED TO CASH EXCHANGE MODAL */}
      {showExchangeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-red-500/50 w-full max-w-sm rounded-2xl p-4 shadow-2xl relative">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-black text-red-400 uppercase">🔄 Red Diamonds ➔ Cash</h3>
              <button onClick={() => setShowExchangeModal(false)} className="text-gray-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>
            <p className="text-[11px] text-gray-300 mb-4">
              Convert Red Diamonds into Winning Cash. Platform fee is <span className="text-red-400 font-bold">5%</span>.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[100, 500, 1000, 5000].map((cnt) => (
                <button
                  key={cnt}
                  onClick={() => handleRedDiamondExchange(cnt)}
                  className="py-3 bg-black/60 hover:bg-red-950/50 border border-red-500/30 rounded-xl text-xs font-bold text-red-300 transition cursor-pointer shadow"
                >
                  Exchange {cnt} 🔴
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CASH TO RED EXCHANGE MODAL */}
      {showCashToRedModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-cyan-500/50 w-full max-w-sm rounded-2xl p-4 shadow-2xl relative">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-black text-cyan-400 uppercase">💎 Cash ➔ Red Diamonds (1:1)</h3>
              <button onClick={() => setShowCashToRedModal(false)} className="text-gray-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>
            <p className="text-[11px] text-gray-300 mb-4">
              Use your winning cash balance to instantly buy Red Diamonds without any fees!
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[100, 500, 1000, 5000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleCashToRedExchange(amt)}
                  className="py-3 bg-black/60 hover:bg-cyan-950/50 border border-cyan-500/30 rounded-xl text-xs font-bold text-cyan-300 transition cursor-pointer shadow"
                >
                  NPR {amt} Cash ➔ Red
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PROFILE EDIT MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-purple-500/50 w-full max-w-sm rounded-2xl p-4 shadow-2xl relative">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-black text-pink-400 uppercase">✏️ Edit Player Profile</h3>
              <button onClick={() => setShowProfileModal(false)} className="text-gray-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-2.5 text-xs">
              <div>
                <label className="text-[10px] text-gray-400 font-bold">Username</label>
                <input 
                  type="text" 
                  required
                  value={inputName} 
                  onChange={(e) => setInputName(e.target.value)} 
                  className="w-full bg-black/60 border border-gray-800 p-2 rounded-xl text-white mt-0.5 text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-bold">Email</label>
                <input 
                  type="email" 
                  value={inputEmail} 
                  onChange={(e) => setInputEmail(e.target.value)} 
                  className="w-full bg-black/60 border border-gray-800 p-2 rounded-xl text-white mt-0.5 text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 font-bold">Mobile Number</label>
                <input 
                  type="text" 
                  value={inputMobile} 
                  onChange={(e) => setInputMobile(e.target.value)} 
                  className="w-full bg-black/60 border border-gray-800 p-2 rounded-xl text-white mt-0.5 text-xs outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="text-[9px] text-gray-400 font-bold">City</label>
                  <input type="text" value={inputCity} onChange={(e) => setInputCity(e.target.value)} className="w-full bg-black/60 border border-gray-800 p-1.5 rounded-xl text-white mt-0.5 text-[10px] outline-none" />
                </div>
                <div>
                  <label className="text-[9px] text-gray-400 font-bold">District</label>
                  <input type="text" value={inputDistrict} onChange={(e) => setInputDistrict(e.target.value)} className="w-full bg-black/60 border border-gray-800 p-1.5 rounded-xl text-white mt-0.5 text-[10px] outline-none" />
                </div>
                <div>
                  <label className="text-[9px] text-gray-400 font-bold">Zip Code</label>
                  <input type="text" value={inputZip} onChange={(e) => setInputZip(e.target.value)} className="w-full bg-black/60 border border-gray-800 p-1.5 rounded-xl text-white mt-0.5 text-[10px] outline-none" />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black text-xs rounded-xl shadow transition mt-2 cursor-pointer"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-cyan-500/50 w-full max-w-sm rounded-2xl p-4 shadow-2xl relative">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-black text-cyan-400 uppercase">⚙️ Settings & Support</h3>
              <button onClick={() => setShowSettingModal(false)} className="text-gray-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-1 mb-3 bg-black/50 p-1 rounded-xl">
              {(['support', 'terms', 'about'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSettingTab(t)}
                  className={`py-1.5 text-[9px] font-bold uppercase rounded-lg transition ${
                    settingTab === t ? 'bg-cyan-500 text-black font-black' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="bg-black/40 border border-gray-800 p-3 rounded-xl text-[11px] text-gray-300 min-h-[120px]">
              {settingTab === 'support' && (
                <div className="space-y-2">
                  <p className="font-bold text-cyan-300">Need Help? Contact Admin:</p>
                  <p>💬 WhatsApp Support: <span className="text-green-400 font-bold">+977 9716782200</span></p>
                  <p className="text-[10px] text-gray-400">Available 24/7 for deposit & withdrawal approvals.</p>
                </div>
              )}
              {settingTab === 'terms' && (
                <div className="space-y-1 text-[10px]">
                  <p className="font-bold text-yellow-300">Terms & Conditions:</p>
                  <p>• Minimum withdrawal is NPR 500.</p>
                  <p>• Deposit bonuses require completing turnover requirements.</p>
                  <p>• 10% referral commission applies when your invited friend completes a deposit.</p>
                </div>
              )}
              {settingTab === 'about' && (
                <div className="space-y-1 text-[10px]">
                  <p className="font-bold text-pink-300">About Arena Nepal:</p>
                  <p>The ultimate gaming & tournament platform in Nepal with secure transactions and instant rewards.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}