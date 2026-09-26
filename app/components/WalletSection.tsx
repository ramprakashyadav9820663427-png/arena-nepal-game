'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getGlobalBalance } from '@/lib/wallet';
import SettingsSection from '@/components/SettingsSection';

type WalletSectionProps = {
  wallet?: {
    redDiamonds?: number;
    whiteDiamonds?: number;
    winningCash?: number;
    [key: string]: any;
  };
  setWallet?: React.Dispatch<React.SetStateAction<any>> | any;
  redDiamonds?: number;
  whiteDiamonds?: number;
  winningCash?: number;
  onBalanceUpdate?: (red: number, white: number, cash: number) => void;
};

type Tab = 'deposit' | 'cash' | 'white' | 'red' | 'history' | 'refer';
type PaymentMethod = 'eSewa' | 'Khalti' | 'CallPay' | 'ConnectIPS' | 'Bank';

type HistoryItem = {
  id: string;
  type: string;
  details: string;
  date: string;
  status: string;
};

const SUPPORT_NUMBER = '9779716782200';

const MIN_RED_TO_CASH = 500;
const MIN_CASH_TO_RED = 500;

const RED_PACKAGES = [
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

const PAYMENT_METHODS: PaymentMethod[] = [
  'eSewa',
  'Khalti',
  'CallPay',
  'ConnectIPS',
  'Bank',
];

const formatNumber = (value: number) =>
  Math.max(0, Number(value) || 0).toLocaleString('en-IN');

export default function WalletSection({
  wallet,
  setWallet,
  redDiamonds: propRed,
  whiteDiamonds: propWhite,
  winningCash: propCash,
  onBalanceUpdate,
}: WalletSectionProps) {
  const [activeTab, setActiveTab] = useState<Tab>('deposit');

  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('New Player');
  const [gameUid, setGameUid] = useState('#AN-000000');
  const [userEmail, setUserEmail] = useState('No Email Added');
  const [userMobile, setUserMobile] = useState('No Mobile Added');

  const [redDiamonds, setRedDiamonds] = useState(0);
  const [whiteDiamonds, setWhiteDiamonds] = useState(0);
  const [winningCash, setWinningCash] = useState(0);

  const [bonusTaken, setBonusTaken] = useState(false);
  const [turnoverRequired, setTurnoverRequired] = useState(0);
  const [turnoverCompleted, setTurnoverCompleted] = useState(0);

  const [depositMethod, setDepositMethod] =
    useState<PaymentMethod>('eSewa');
  const [enableBonus, setEnableBonus] = useState(true);
  const [isFirstDeposit, setIsFirstDeposit] = useState(true);

  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);

  const [initialLoading, setInitialLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [showCashToRedModal, setShowCashToRedModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [inputName, setInputName] = useState('');
  const [inputMobile, setInputMobile] = useState('');

  const [withdrawMethod, setWithdrawMethod] =
    useState<PaymentMethod>('eSewa');
  const [withdrawAccountNo, setWithdrawAccountNo] = useState('');
  const [withdrawAccountName, setWithdrawAccountName] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('500');
  const [withdrawQrImage, setWithdrawQrImage] = useState<File | null>(null);

  const [exchangeAmount, setExchangeAmount] = useState(String(MIN_RED_TO_CASH));
  const [cashToRedAmount, setCashToRedAmount] = useState(String(MIN_CASH_TO_RED));

  const redToCashInFlightRef = useRef(false);
  const cashToRedInFlightRef = useRef(false);

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const applyBalances = useCallback(
    (red: number, white: number, cash: number) => {
      setRedDiamonds(red);
      setWhiteDiamonds(white);
      setWinningCash(cash);

      if (setWallet) {
        setWallet((previous: any) => ({
          ...(previous || {}),
          redDiamonds: red,
          whiteDiamonds: white,
          winningCash: cash,
        }));
      }

      if (onBalanceUpdate) {
        onBalanceUpdate(red, white, cash);
      }

      try {
        localStorage.setItem('arena_red_diamonds', red.toString());
        localStorage.setItem('arena_red_dias', red.toString());
        localStorage.setItem('arena_diamond', red.toString());
        localStorage.setItem('arena_cash', red.toString());
        localStorage.setItem('arena_white_diamonds', white.toString());
        localStorage.setItem('arena_winning_cash', cash.toString());
      } catch {
        // ignore
      }

      window.dispatchEvent(
        new CustomEvent('walletUpdated', {
          detail: {
            redDiamonds: red,
            whiteDiamonds: white,
            winningCash: cash,
            balance: red,
          },
        })
      );
    },
    [setWallet, onBalanceUpdate]
  );

  const fetchUserData = useCallback(async () => {
    if (!hasLoadedOnceRef.current) {
      setInitialLoading(true);
    }

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session?.user) {
        setUserId('');
        setUserName('New Player');
        setGameUid('#AN-000000');
        setUserEmail('No Email Added');
        setUserMobile('No Mobile Added');
        applyBalances(0, 0, 0);
        setHistoryList([]);
        return;
      }

      const authUser = session.user;
      const uid = `AN-${authUser.id.slice(0, 8).toUpperCase()}`;

      setUserId(authUser.id);
      setUserEmail(authUser.email || 'No Email Added');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select(
          'id,email,full_name,nickname,phone,mobile_number,winning_cash,red_diamonds,white_diamonds,bonus_taken,turnover_required,turnover_completed'
        )
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) throw error;

      if (profile) {
        setUserName(
          profile.nickname || profile.full_name || 'New Player'
        );

        setUserMobile(
          profile.mobile_number || profile.phone || 'No Mobile Added'
        );

        const red = Number(profile.red_diamonds) || 0;
        const white = Number(profile.white_diamonds) || 0;
        const cash = Number(profile.winning_cash) || 0;

        applyBalances(red, white, cash);

        setBonusTaken(Boolean(profile.bonus_taken));
        setTurnoverRequired(Number(profile.turnover_required) || 0);
        setTurnoverCompleted(Number(profile.turnover_completed) || 0);

        setGameUid(uid);
      } else {
        setUserName(
          authUser.user_metadata?.full_name ||
            authUser.user_metadata?.name ||
            'New Player'
        );
        setGameUid(uid);
        applyBalances(getGlobalBalance(), 0, 0);
      }

      const { count, error: depositError } = await supabase
        .from('deposit_requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_uid', uid);

      if (!depositError && count !== null) {
        setIsFirstDeposit(count === 0);
      }

      const { data: history, error: historyError } = await supabase
        .from('withdraw_requests')
        .select('*')
        .eq('user_uid', uid)
        .order('created_at', { ascending: false });

      if (!historyError && history) {
        setHistoryList(
          history.map((item: any, index: number) => ({
            id: String(item.id || index),
            type: 'Withdrawal Request',
            details: `NPR ${item.amount ?? 0} via ${
              item.method || 'Payment method'
            }`,
            date: item.created_at
              ? new Date(item.created_at).toLocaleString()
              : 'Date unavailable',
            status: item.status || 'Pending',
          }))
        );
      }
    } catch (error) {
      console.error('Wallet fetch failed:', error);
      notify('Wallet information could not be loaded. Please refresh.');
    } finally {
      setInitialLoading(false);
      hasLoadedOnceRef.current = true;
    }
  }, [applyBalances]);

  useEffect(() => {
    if (typeof propRed === 'number') setRedDiamonds(propRed);
    if (typeof propWhite === 'number') setWhiteDiamonds(propWhite);
    if (typeof propCash === 'number') setWinningCash(propCash);
  }, [propRed, propWhite, propCash]);

  useEffect(() => {
    if (wallet) {
      if (typeof wallet.redDiamonds === 'number') setRedDiamonds(wallet.redDiamonds);
      if (typeof wallet.whiteDiamonds === 'number') setWhiteDiamonds(wallet.whiteDiamonds);
      if (typeof wallet.winningCash === 'number') setWinningCash(wallet.winningCash);
    }
  }, [wallet]);

  useEffect(() => {
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
    let isMounted = true;

    const setupRealtime = (userId: string) => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }

      realtimeChannel = supabase
        .channel(`wallet-profile:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`,
          },
          (payload) => {
            if (!isMounted) return;

            const row = payload.new as {
              red_diamonds?: number;
              white_diamonds?: number;
              winning_cash?: number;
              bonus_taken?: boolean;
              turnover_required?: number;
              turnover_completed?: number;
            };

            const red = Number(row.red_diamonds) || 0;
            const white = Number(row.white_diamonds) || 0;
            const cash = Number(row.winning_cash) || 0;

            applyBalances(red, white, cash);

            if (typeof row.bonus_taken === 'boolean') setBonusTaken(row.bonus_taken);
            if (typeof row.turnover_required === 'number') setTurnoverRequired(row.turnover_required);
            if (typeof row.turnover_completed === 'number') setTurnoverCompleted(row.turnover_completed);
          }
        )
        .subscribe();
    };

    const init = async () => {
      await fetchUserData();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.id && isMounted) {
        setupRealtime(session.user.id);
      }
    };

    init();

    const onWalletUpdate = (e: Event) => {
      const custom = e as CustomEvent;

      if (custom.detail && typeof custom.detail === 'object') {
        const { redDiamonds: r, whiteDiamonds: w, winningCash: c, balance } = custom.detail;

        if (typeof r === 'number') setRedDiamonds(r);
        if (typeof w === 'number') setWhiteDiamonds(w);
        if (typeof c === 'number') setWinningCash(c);

        if (typeof balance === 'number' && typeof r !== 'number') {
          setRedDiamonds(balance);
        }
      } else {
        void fetchUserData();
      }
    };

    window.addEventListener('walletUpdated', onWalletUpdate);
    window.addEventListener('storage', onWalletUpdate);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;

      if (newSession?.user?.id) {
        await fetchUserData();
        setupRealtime(newSession.user.id);
      } else {
        if (realtimeChannel) {
          supabase.removeChannel(realtimeChannel);
          realtimeChannel = null;
        }
        applyBalances(0, 0, 0);
      }
    });

    return () => {
      isMounted = false;
      window.removeEventListener('walletUpdated', onWalletUpdate);
      window.removeEventListener('storage', onWalletUpdate);
      subscription.unsubscribe();
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [fetchUserData, applyBalances]);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify('Copied to clipboard.');
    } catch {
      notify('Could not copy. Please copy it manually.');
    }
  };

  const openProfileModal = () => {
    setInputName(userName === 'New Player' ? '' : userName);
    setInputMobile(
      userMobile === 'No Mobile Added' ? '' : userMobile
    );
    setShowProfileModal(true);
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!userId) {
      notify('Please log in first.');
      return;
    }

    if (!inputName.trim()) {
      notify('Please enter your name.');
      return;
    }

    setBusy(true);

    try {
      const updates: Record<string, string> = {
        full_name: inputName.trim(),
      };

      if (inputMobile.trim()) {
        updates.phone = inputMobile.trim();
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      setUserName(inputName.trim());
      if (inputMobile.trim()) setUserMobile(inputMobile.trim());

      setShowProfileModal(false);
      notify('Profile updated.');
      await fetchUserData();
    } catch (error) {
      console.error(error);
      notify('Profile update failed. Please check your database policies.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeposit = async (diamonds: number, price: number) => {
    if (!userId) {
      notify('Please log in before requesting a deposit.');
      return;
    }

    try {
      const { error } = await supabase
        .from('deposit_requests')
        .insert({
          user_uid: gameUid,
          user_name: userName,
          package_diamonds: diamonds,
          amount: price,
          payment_method: depositMethod,
          status: 'Pending',
        });

      if (error) throw error;

      const messageText = `ARENA NEPAL — DEPOSIT REQUEST
User UID: ${gameUid}
Package: ${diamonds} Red Diamonds
Amount: NPR ${price}
Payment Method: ${depositMethod}

Hello Team, I have created a deposit request in the app. Please share payment details / QR code so I can send the payment screenshot.`;

      window.open(
        'https://wa.me/' + SUPPORT_NUMBER + '?text=' +
          encodeURIComponent(messageText),
        '_blank'
      );

      notify(
        'Deposit request created! Opening WhatsApp for payment...'
      );
    } catch (error: any) {
      console.error('Deposit request submission failed:', error);
      notify(
        error?.message ||
          'Deposit request failed. Please try again.'
      );
    }
  };

  const exchangeWhiteToRed = async () => {
    if (busy) return;

    if (!userId) {
      notify('Please log in first.');
      return;
    }

    const whiteCost = 200000;
    const redReward = 100;

    if (whiteDiamonds < whiteCost) {
      notify(
        'You need at least 200,000 White Diamonds to exchange for 100 Red Diamonds.'
      );
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.rpc('exchange_white_to_red', {
        p_user_uid: gameUid,
        p_white_cost: whiteCost,
        p_red_reward: redReward,
      });

      if (error) throw error;

      notify(
        'Successfully exchanged 200,000 White Diamonds for 100 Red Diamonds!'
      );

      await fetchUserData();
    } catch (error: any) {
      console.error('White-to-red exchange failed:', error);
      notify(error.message);
    } finally {
      setBusy(false);
    }
  };

  const submitWithdrawalRequest = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (busy) return;

    if (!userId) {
      notify('Please log in first.');
      return;
    }

    const amount = Number(withdrawAmount);

    if (
      !Number.isInteger(amount) ||
      amount < 500 ||
      amount > 10000
    ) {
      notify('Withdrawal amount must be NPR 500–10,000.');
      return;
    }

    if (amount > winningCash) {
      notify('Insufficient winning cash balance.');
      return;
    }

    if (
      !withdrawAccountNo.trim() ||
      !withdrawAccountName.trim()
    ) {
      notify('Please enter account details.');
      return;
    }

    if (!withdrawQrImage) {
      notify('Please select your payment QR image.');
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(withdrawQrImage.type)) {
      notify('Please upload a JPG, PNG, or WebP image.');
      return;
    }

    if (withdrawQrImage.size > 2 * 1024 * 1024) {
      notify('QR image must be 2 MB or smaller.');
      return;
    }

    setBusy(true);

    try {
      const extension =
        withdrawQrImage.type === 'image/png'
          ? 'png'
          : withdrawQrImage.type === 'image/webp'
          ? 'webp'
          : 'jpg';

      const filePath =
        `${userId}/${crypto.randomUUID()}.${extension}`;

      const { data: uploadData, error: uploadError } =
        await supabase.storage
          .from('withdraw-qr')
          .upload(filePath, withdrawQrImage, {
            contentType: withdrawQrImage.type,
            cacheControl: '3600',
            upsert: false,
          });

      if (uploadError) throw uploadError;

      const { data, error: rpcError } = await supabase.rpc(
        'submit_withdraw_request',
        {
          p_method: withdrawMethod,
          p_account_no: withdrawAccountNo.trim(),
          p_account_name: withdrawAccountName.trim(),
          p_amount: amount,
          p_qr_path: uploadData.path,
        }
      );

      if (rpcError) throw rpcError;

      notify(
        `Withdrawal request submitted successfully. Request ID: ${data}`
      );

      setShowWithdrawModal(false);
      setWithdrawAccountNo('');
      setWithdrawAccountName('');
      setWithdrawAmount('500');
      setWithdrawQrImage(null);

      await fetchUserData();
    } catch (error: any) {
      console.error('Withdrawal submission failed:', error);

      notify(
        error?.message ||
          'Withdrawal request failed. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  const exchangeRedToCash = async () => {
    if (redToCashInFlightRef.current || busy) return;

    if (!userId) {
      notify('Please log in first.');
      return;
    }

    const amount = Number(exchangeAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      notify('Enter a valid Red Diamond amount.');
      return;
    }

    if (amount < MIN_RED_TO_CASH) {
      notify(
        `Minimum ${formatNumber(MIN_RED_TO_CASH)} Red Diamonds required to exchange for cash.`
      );
      return;
    }

    if (amount > redDiamonds) {
      notify('Insufficient Red Diamonds.');
      return;
    }

    if (bonusTaken && turnoverCompleted < turnoverRequired) {
      notify(
        `Bonus turnover incomplete: ${formatNumber(
          turnoverCompleted
        )} / ${formatNumber(turnoverRequired)}. Complete the required turnover before exchanging.`
      );
      return;
    }

    redToCashInFlightRef.current = true;
    setBusy(true);

    try {
      const { error } = await supabase.rpc('exchange_red_to_cash', {
        p_amount: amount,
      });

      if (error) throw error;

      const netCash = amount * 0.95;
      notify(
        `Exchange successful! ${formatNumber(amount)} Red Diamonds exchanged for NPR ${formatNumber(netCash)} after the 5% company fee.`
      );
      setShowExchangeModal(false);
      setExchangeAmount(String(MIN_RED_TO_CASH));
      await fetchUserData();
    } catch (error: any) {
      console.error('Red-to-cash exchange failed:', error);
      notify(error?.message || 'Red-to-cash exchange failed. Please try again.');
    } finally {
      redToCashInFlightRef.current = false;
      setBusy(false);
    }
  };

  const exchangeCashToRed = async () => {
    if (cashToRedInFlightRef.current || busy) return;

    if (!userId) {
      notify('Please log in first.');
      return;
    }

    const amount = Number(cashToRedAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      notify('Enter a valid amount.');
      return;
    }

    if (amount < MIN_CASH_TO_RED) {
      notify(
        `Minimum NPR ${formatNumber(MIN_CASH_TO_RED)} required to exchange for Red Diamonds.`
      );
      return;
    }

    if (amount > winningCash) {
      notify('Insufficient winning cash.');
      return;
    }

    cashToRedInFlightRef.current = true;
    setBusy(true);

    try {
      const { error } = await supabase.rpc('exchange_cash_to_red', {
        p_amount: amount,
      });

      if (error) throw error;

      notify(
        `Successfully exchanged NPR ${formatNumber(amount)} into Red Diamonds.`
      );
      setShowCashToRedModal(false);
      setCashToRedAmount(String(MIN_CASH_TO_RED));
      await fetchUserData();
    } catch (error: any) {
      console.error('Cash-to-red exchange failed:', error);
      notify(error?.message || 'Cash-to-red exchange failed. Please try again.');
    } finally {
      cashToRedInFlightRef.current = false;
      setBusy(false);
    }
  };

  const referralLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?ref=${gameUid}`
      : `https://arenanepal.com/?ref=${gameUid}`;

  const turnoverPercent =
    turnoverRequired > 0
      ? Math.min(100, Math.floor((turnoverCompleted / turnoverRequired) * 100))
      : 0;

  if (initialLoading) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-3 py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
        <p className="text-xs text-gray-400">Loading wallet...</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 pb-6">
      {/* Profile Header + Settings */}
      <section className="rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-gray-900 via-gray-950 to-black p-4 shadow-xl">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-sm font-black text-white">{userName}</h2>
            <p className="mt-0.5 text-[10px] text-gray-400">
              UID: <span className="font-bold text-yellow-400">{gameUid}</span>
              <button
                onClick={() => copyText(gameUid)}
                className="ml-2 rounded bg-yellow-500/20 px-1.5 py-0.5 text-[9px] font-bold text-yellow-300"
              >
                Copy
              </button>
            </p>
            <p className="mt-1 text-[10px] text-gray-500">{userEmail}</p>
            <p className="text-[10px] text-gray-500">{userMobile}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={openProfileModal}
              className="rounded-lg bg-pink-600 px-2.5 py-1 text-[10px] font-bold text-white"
            >
              Edit Profile
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-2.5 py-1 text-[10px] font-bold text-gray-300"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-green-500/30 bg-green-950/40 p-2 text-center">
            <p className="text-[9px] font-bold text-green-400">NPR CASH</p>
            <p className="text-sm font-black text-green-300">
              {formatNumber(winningCash)}
            </p>
          </div>
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-2 text-center">
            <p className="text-[9px] font-bold text-cyan-400">WHITE DIAMOND</p>
            <p className="text-sm font-black text-cyan-300">
              {formatNumber(whiteDiamonds)}
            </p>
          </div>
          <div className="rounded-xl border border-red-500/40 bg-red-950/50 p-2 text-center">
            <p className="text-[9px] font-bold text-red-400">RED DIAMOND</p>
            <p className="text-sm font-black text-red-300">
              {formatNumber(redDiamonds)}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="rounded-xl bg-green-700 py-2 text-[10px] font-black text-white"
          >
            WITHDRAW
          </button>
          <button
            onClick={() => setShowCashToRedModal(true)}
            className="rounded-xl bg-cyan-700 py-2 text-[10px] font-black text-white"
          >
            CASH → RED
          </button>
          <button
            onClick={() => setShowExchangeModal(true)}
            className="rounded-xl bg-red-700 py-2 text-[10px] font-black text-white"
          >
            RED → CASH
          </button>
        </div>
      </section>

      {bonusTaken && turnoverRequired > 0 && (
        <section className="rounded-xl border border-yellow-500/30 bg-yellow-950/20 p-3">
          <div className="mb-1 flex items-center justify-between text-[10px]">
            <span className="font-bold text-yellow-300">Turnover Progress</span>
            <span className="text-yellow-200">
              {formatNumber(turnoverCompleted)} / {formatNumber(turnoverRequired)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all"
              style={{ width: `${turnoverPercent}%` }}
            />
          </div>
        </section>
      )}

      {message && (
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-950/30 px-3 py-2 text-center text-[11px] font-bold text-yellow-200">
          {message}
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-black/60 p-1">
        {(
          [
            ['deposit', 'DEPOSIT'],
            ['cash', 'CASH'],
            ['white', 'WHITE'],
            ['red', 'RED'],
            ['history', 'HISTORY'],
            ['refer', 'REFER'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-black transition ${
              activeTab === key
                ? 'bg-yellow-500 text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <>
        {activeTab === 'deposit' && (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-3">
              <p className="mb-2 text-[10px] font-bold text-gray-400">
                1. Select Payment Method
              </p>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method}
                    onClick={() => setDepositMethod(method)}
                    className={`rounded-lg px-3 py-1.5 text-[10px] font-bold ${
                      depositMethod === method
                        ? 'bg-yellow-500 text-black'
                        : 'border border-gray-700 bg-black/40 text-gray-300'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-[11px] text-gray-300">
              <input
                type="checkbox"
                checked={enableBonus}
                onChange={(e) => setEnableBonus(e.target.checked)}
                className="rounded"
              />
              Request deposit bonus
            </label>

            <p className="text-[10px] font-bold text-gray-400">
              2. Select Red Diamond Package
            </p>

            {RED_PACKAGES.map((pkg) => {
              const percent = isFirstDeposit ? 50 : 25;
              const bonus = enableBonus
                ? Math.floor((pkg.diamonds * percent) / 100)
                : 0;

              return (
                <div
                  key={pkg.diamonds}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-800 bg-gray-900 p-3 shadow"
                >
                  <div>
                    <p className="text-xs font-bold text-white">
                      🔴 {formatNumber(pkg.diamonds)} Red Diamonds
                    </p>
                    {enableBonus && (
                      <p className="text-[10px] text-pink-400">
                        Bonus request: +{formatNumber(bonus)}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-yellow-400">
                      NPR {formatNumber(pkg.price)}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleDeposit(pkg.diamonds, pkg.price)
                    }
                    className="shrink-0 rounded-lg bg-green-600 px-3 py-2 text-[10px] font-bold text-white transition hover:bg-green-500"
                  >
                    Request
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'cash' && (
          <section className="w-full rounded-2xl border border-gray-800 bg-gray-900/80 p-4 text-center shadow-lg">
            <h3 className="text-xs font-bold text-gray-400">
              WINNING CASH BALANCE
            </h3>
            <p className="my-2 text-3xl font-black text-green-400">
              NPR {formatNumber(winningCash)}
            </p>
            <p className="mb-4 text-[11px] text-gray-400">
              Withdrawal requests require verification and backend approval.
            </p>
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="w-full rounded-xl bg-green-600 py-3 text-xs font-black text-white transition hover:bg-green-500"
            >
              💸 OPEN WITHDRAWAL PANEL
            </button>
          </section>
        )}

        {activeTab === 'white' && (
          <section className="w-full rounded-2xl border border-gray-800 bg-gray-900/80 p-4 text-center shadow-lg">
            <h3 className="text-xs font-bold text-gray-400">
              WHITE DIAMOND BALANCE
            </h3>
            <p className="mb-4 mt-2 text-2xl font-black text-cyan-400">
              {formatNumber(whiteDiamonds)} 💎
            </p>
            <div className="mb-4 rounded-xl border border-cyan-500/30 bg-black/40 p-3">
              <p className="text-[10px] text-gray-300">
                Exchange rate: 200,000 White Diamonds = 100 Red Diamonds.
              </p>
            </div>
            <button
              onClick={exchangeWhiteToRed}
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 py-2.5 text-xs font-black text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'EXCHANGING...' : 'EXCHANGE WHITE DIAMONDS'}
            </button>
          </section>
        )}

        {activeTab === 'red' && (
          <section className="flex w-full items-center justify-between gap-3 rounded-xl border border-red-500/50 bg-gray-900 p-3 shadow-lg">
            <div>
              <p className="text-xs font-bold text-red-400">
                CENTRAL RED DIAMOND BALANCE
              </p>
              <p className="text-lg font-black text-red-400">
                {formatNumber(redDiamonds)} 🔴
              </p>
            </div>
            <button
              onClick={() => setShowExchangeModal(true)}
              className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white"
            >
              Exchange
            </button>
          </section>
        )}

        {activeTab === 'history' && (
          <section className="w-full rounded-2xl border border-gray-800 bg-gray-900/80 p-4 shadow-lg">
            <h3 className="mb-3 text-xs font-bold text-gray-400">
              TRANSACTION HISTORY
            </h3>
            {historyList.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400">
                No transaction history found.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {historyList.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-gray-800 bg-black/40 p-3 text-[10px]"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2 font-bold">
                      <span className="text-cyan-400">{item.type}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 ${
                          item.status?.toLowerCase() === 'approved'
                            ? 'bg-green-500/20 text-green-400'
                            : item.status?.toLowerCase() === 'rejected'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="text-gray-200">{item.details}</p>
                    <p className="mt-1 text-[9px] text-gray-500">
                      {item.date}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'refer' && (
          <section className="flex w-full flex-col gap-4 rounded-2xl border-2 border-pink-500/60 bg-gradient-to-br from-purple-950 via-gray-900 to-indigo-950 p-4 shadow-2xl">
            <div className="text-center">
              <span className="text-3xl">🤝</span>
              <h3 className="mt-1 text-xs font-black uppercase">
                Refer Friends
              </h3>
              <p className="mt-1 text-[10px] text-gray-300">
                Share your referral link. Any reward or commission is subject
                to the referral system being configured and approved.
              </p>
            </div>

            <div className="rounded-xl border border-pink-500/30 bg-black/50 p-3">
              <label className="mb-2 block text-[10px] font-bold text-gray-300">
                Your Referral Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={referralLink}
                  className="min-w-0 flex-1 rounded-lg bg-black/60 px-2 py-2 text-[10px] text-yellow-300 outline-none"
                />
                <button
                  onClick={() => copyText(referralLink)}
                  className="rounded-lg bg-yellow-500 px-3 py-2 text-[10px] font-black text-black"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-yellow-500/20 bg-black/40 p-3 text-[10px] text-gray-300">
              <p className="mb-1 font-bold text-yellow-400">
                How it works
              </p>
              <p>1. Copy and share your referral link.</p>
              <p>2. Your friend registers using the link.</p>
              <p>
                3. Referral tracking and any reward must be confirmed by the
                backend.
              </p>
            </div>
          </section>
        )}
      </>

      {/* WITHDRAW MODAL */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-sm rounded-2xl border border-green-500/50 bg-gray-900 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-green-400">
                💸 Withdrawal Request
              </h3>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="font-bold text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={submitWithdrawalRequest}
              className="flex flex-col gap-3 text-xs"
            >
              <label className="text-[10px] font-bold text-gray-400">
                Payment Method
                <select
                  value={withdrawMethod}
                  onChange={(e) =>
                    setWithdrawMethod(e.target.value as PaymentMethod)
                  }
                  className="mt-1 w-full rounded-xl border border-gray-800 bg-black/60 p-2 text-xs text-white outline-none"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method === 'Bank' ? 'Bank Account' : method}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-[10px] font-bold text-gray-400">
                Account Number / Mobile
                <input
                  required
                  value={withdrawAccountNo}
                  onChange={(e) => setWithdrawAccountNo(e.target.value)}
                  placeholder="Payment account number"
                  className="mt-1 w-full rounded-xl border border-gray-800 bg-black/60 p-2 text-xs text-white outline-none"
                />
              </label>

              <label className="text-[10px] font-bold text-gray-400">
                Account Holder Name
                <input
                  required
                  value={withdrawAccountName}
                  onChange={(e) => setWithdrawAccountName(e.target.value)}
                  placeholder="Full name"
                  className="mt-1 w-full rounded-xl border border-gray-800 bg-black/60 p-2 text-xs text-white outline-none"
                />
              </label>

              <label className="text-[10px] font-bold text-gray-400">
                Amount (NPR 500–10,000)
                <input
                  required
                  type="number"
                  min="500"
                  max="10000"
                  step="1"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-800 bg-black/60 p-2 text-xs text-white outline-none"
                />
              </label>

              <label className="text-[10px] font-bold text-yellow-400">
                Payment QR Image
                <input
                  required
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) =>
                    setWithdrawQrImage(e.target.files?.[0] || null)
                  }
                  className="mt-1 w-full text-[10px] text-gray-400 file:mr-2 file:rounded-lg file:border-0 file:bg-green-600 file:px-3 file:py-1 file:text-[10px] file:font-bold file:text-white"
                />
                <span className="mt-1 block text-[9px] text-gray-500">
                  JPG, PNG or WebP · Maximum 2 MB
                </span>
              </label>

              <div className="rounded-xl border border-yellow-500/30 bg-yellow-950/20 p-2 text-[10px] text-yellow-200">
                Your request will be verified by the platform. The server
                checks your available winning cash and creates the request.
                A rejected request requires a secure admin refund.
              </div>

              <button
                type="submit"
                disabled={busy}
                className="mt-1 w-full rounded-xl bg-green-600 py-2.5 text-xs font-black text-white hover:bg-green-500 disabled:opacity-50"
              >
                {busy ? 'Uploading & Submitting...' : 'Submit Withdrawal Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RED TO CASH MODAL */}
      {showExchangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-red-500/50 bg-gray-900 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-red-400">
                🔄 Red Diamonds ➜ Cash
              </h3>
              <button
                onClick={() => setShowExchangeModal(false)}
                className="font-bold text-gray-400"
              >
                ✕
              </button>
            </div>

            <p className="mb-3 text-[11px] text-gray-300">
              Red Diamond balance: {formatNumber(redDiamonds)} 🔴
            </p>

            <label className="block text-[10px] font-bold text-gray-400">
              Red Diamonds to exchange (minimum {formatNumber(MIN_RED_TO_CASH)})
              <input
                type="number"
                min={MIN_RED_TO_CASH}
                value={exchangeAmount}
                onChange={(e) => setExchangeAmount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-800 bg-black/60 p-2 text-xs text-white outline-none"
              />
            </label>

            <button
              onClick={exchangeRedToCash}
              disabled={busy}
              className="mt-3 w-full rounded-xl bg-red-600 py-2.5 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Processing...' : 'Check Exchange'}
            </button>
          </div>
        </div>
      )}

      {/* CASH TO RED MODAL */}
      {showCashToRedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-cyan-500/50 bg-gray-900 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-cyan-400">
                💎 Cash ➜ Red Diamonds
              </h3>
              <button
                onClick={() => setShowCashToRedModal(false)}
                className="font-bold text-gray-400"
              >
                ✕
              </button>
            </div>

            <p className="mb-3 text-[11px] text-gray-300">
              Winning cash: NPR {formatNumber(winningCash)}
            </p>

            <label className="block text-[10px] font-bold text-gray-400">
              Amount (NPR) — minimum {formatNumber(MIN_CASH_TO_RED)}
              <input
                type="number"
                min={MIN_CASH_TO_RED}
                value={cashToRedAmount}
                onChange={(e) => setCashToRedAmount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-800 bg-black/60 p-2 text-xs text-white outline-none"
              />
            </label>

            <button
              onClick={exchangeCashToRed}
              disabled={busy}
              className="mt-3 w-full rounded-xl bg-cyan-600 py-2.5 text-xs font-black text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Processing...' : 'Check Exchange'}
            </button>
          </div>
        </div>
      )}

      {/* PROFILE MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-purple-500/50 bg-gray-900 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-pink-400">
                ✏️ Edit Player Profile
              </h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="font-bold text-gray-400"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={saveProfile}
              className="flex flex-col gap-3 text-xs"
            >
              <label className="text-[10px] font-bold text-gray-400">
                Full Name
                <input
                  required
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-800 bg-black/60 p-2 text-xs text-white outline-none"
                />
              </label>

              <label className="text-[10px] font-bold text-gray-400">
                Email
                <input
                  readOnly
                  value={userEmail}
                  className="mt-1 w-full rounded-xl border border-gray-800 bg-black/40 p-2 text-xs text-gray-400 outline-none"
                />
              </label>

              <label className="text-[10px] font-bold text-gray-400">
                Mobile Number
                <input
                  value={inputMobile}
                  onChange={(e) => setInputMobile(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-800 bg-black/60 p-2 text-xs text-white outline-none"
                />
              </label>

              <button
                type="submit"
                disabled={busy}
                className="mt-1 w-full rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 py-2.5 text-xs font-black disabled:opacity-50"
              >
                {busy ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SETTINGS (separate component) */}
      {showSettings && (
        <SettingsSection onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}