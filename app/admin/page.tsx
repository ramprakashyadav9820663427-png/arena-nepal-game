'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

type AdminTab = 'deposits' | 'withdraws' | 'players';
type AdjustmentField = 'red_diamonds' | 'winning_cash';
type AdjustmentMode = 'add' | 'deduct';

type PlayerProfile = {
  id?: string;
  user_uid?: string;
  uid?: string;
  username?: string;
  nickname?: string;
  full_name?: string;
  phone?: string;
  email?: string;
  red_diamonds?: number | null;
  winning_cash?: number | null;
  white_diamonds?: number | null;
  turnover_required?: number | null;
  turnover_completed?: number | null;
  [key: string]: any;
};

type DepositRequest = {
  id: number | string;
  user_uid?: string;
  username?: string;
  user_name?: string;
  package_diamonds?: number;
  diamonds?: number;
  amount?: number;
  price_amount?: number;
  payment_method?: string;
  created_at?: string;
  status?: string;
  [key: string]: any;
};

type WithdrawRequest = {
  id: number | string;
  user_uid?: string;
  username?: string;
  account_name?: string;
  esewa_name?: string;
  account_number?: string;
  esewa_id?: string;
  payment_method?: string;
  amount?: number;
  qr_image?: string;
  qr_image_url?: string;
  created_at?: string;
  status?: string;
  [key: string]: any;
};

export default function AdminPage() {
  // Password Protection
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState('');

  // Admin password
  const ADMIN_PASSWORD = '00000000';

  // Secret URL login: /admin?secret=00000000
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const secret = params.get('secret');

    if (secret === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    }
  }, []);

  // Tabs
  const [activeTab, setActiveTab] = useState<AdminTab>('deposits');

  // Deposit requests
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [loadingDeposits, setLoadingDeposits] = useState(false);
  const [approvingDepositId, setApprovingDepositId] = useState<
    number | string | null
  >(null);

  // Withdraw requests
  const [withdrawRequests, setWithdrawRequests] = useState<WithdrawRequest[]>(
    []
  );
  const [loadingWithdraws, setLoadingWithdraws] = useState(false);
  const [processingWithdrawId, setProcessingWithdrawId] = useState<
    number | string | null
  >(null);

  // Player lookup
  const [searchUid, setSearchUid] = useState('');
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [searchingPlayer, setSearchingPlayer] = useState(false);

  // Player adjustment
  const [adjustmentField, setAdjustmentField] =
    useState<AdjustmentField>('red_diamonds');
  const [adjustmentMode, setAdjustmentMode] =
    useState<AdjustmentMode>('add');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustingPlayer, setAdjustingPlayer] = useState(false);

  // General UI
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Click sound helper
  const playClickSound = () => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as any).webkitAudioContext;

      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        40,
        ctx.currentTime + 0.04
      );

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.01,
        ctx.currentTime + 0.04
      );

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);

      osc.onended = () => {
        void ctx.close().catch(() => {});
      };
    } catch {
      // Ignore browser audio restrictions.
    }
  };

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ) => {
    setToast({ message, type });
  };

  // Fetch deposit requests
  const fetchDepositRequests = useCallback(async () => {
    setLoadingDeposits(true);

    try {
      const { data, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching deposit requests:', error);
        showToast(
          `Failed to load deposit requests: ${error.message}`,
          'error'
        );
        return;
      }

      setDepositRequests((data || []) as DepositRequest[]);
    } catch (error: any) {
      console.error(error);
      showToast(
        error?.message || 'Unexpected error loading deposits.',
        'error'
      );
    } finally {
      setLoadingDeposits(false);
    }
  }, []);

  // Fetch withdrawal requests
  const fetchWithdrawRequests = useCallback(async () => {
    setLoadingWithdraws(true);

    try {
      const { data, error } = await supabase
        .from('withdraw_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching withdraw requests:', error);
        showToast(
          `Failed to load withdrawals: ${error.message}`,
          'error'
        );
        return;
      }

      setWithdrawRequests((data || []) as WithdrawRequest[]);
    } catch (error: any) {
      console.error(error);
      showToast(
        error?.message || 'Unexpected error loading withdrawals.',
        'error'
      );
    } finally {
      setLoadingWithdraws(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    void fetchDepositRequests();
    void fetchWithdrawRequests();
  }, [
    isAuthenticated,
    fetchDepositRequests,
    fetchWithdrawRequests,
  ]);

  // Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();

    if (inputPassword.trim() === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setInputPassword('');
      showToast('Admin login successful.', 'success');
    } else {
      showToast('Invalid admin password.', 'error');
      setInputPassword('');
    }
  };

  // Logout
  const handleLogout = () => {
    playClickSound();
    setIsAuthenticated(false);
    setPlayer(null);
    setSearchUid('');
    setAdjustmentAmount('');
    showToast('You have been logged out.', 'info');
  };

  // Approve deposit using Supabase RPC
  const handleApproveDeposit = async (
    requestId: number | string
  ) => {
    playClickSound();

    const confirmed = window.confirm(
      `Approve deposit request #${requestId}?`
    );

    if (!confirmed) return;

    setApprovingDepositId(requestId);

    try {
      const { error } = await supabase.rpc(
        'approve_deposit_request',
        { p_request_id: requestId }
      );

      if (error) {
        console.error('Deposit approval error:', error);
        showToast(
          `Deposit approval failed: ${error.message}`,
          'error'
        );
        return;
      }

      showToast(
        `Deposit request #${requestId} approved.`,
        'success'
      );

      await fetchDepositRequests();
    } catch (error: any) {
      console.error(error);
      showToast(
        error?.message || 'Unexpected error approving deposit.',
        'error'
      );
    } finally {
      setApprovingDepositId(null);
    }
  };

  // Approve withdrawal
  const handleApproveWithdraw = async (
    requestId: number | string
  ) => {
    playClickSound();

    const confirmed = window.confirm(
      `Mark withdrawal request #${requestId} as Success? Confirm that payment has already been sent.`
    );

    if (!confirmed) return;

    setProcessingWithdrawId(requestId);

    try {
      const { error } = await supabase
        .from('withdraw_requests')
        .update({ status: 'Success' })
        .eq('id', requestId)
        .eq('status', 'Processing');

      if (error) {
        console.error('Withdrawal approval error:', error);
        showToast(
          `Could not approve withdrawal: ${error.message}`,
          'error'
        );
        return;
      }

      showToast(
        `Withdrawal #${requestId} marked as Success.`,
        'success'
      );

      await fetchWithdrawRequests();
    } catch (error: any) {
      console.error(error);
      showToast(
        error?.message || 'Unexpected error approving withdrawal.',
        'error'
      );
    } finally {
      setProcessingWithdrawId(null);
    }
  };

  // Reject withdrawal and refund winning_cash
  const handleRejectWithdraw = async (
    request: WithdrawRequest
  ) => {
    playClickSound();

    const amount = Number(request.amount);
    const userUid = String(request.user_uid || '').trim();

    if (!userUid) {
      showToast(
        'This withdrawal request has no user UID. Cannot refund safely.',
        'error'
      );
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      showToast(
        'Invalid withdrawal amount. Refund cancelled.',
        'error'
      );
      return;
    }

    const confirmed = window.confirm(
      `Reject withdrawal #${request.id} and refund NPR ${amount} to UID ${userUid}?`
    );

    if (!confirmed) return;

    setProcessingWithdrawId(request.id);

    try {
      // Find the existing profile using user_uid.
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_uid, winning_cash')
        .eq('user_uid', userUid)
        .maybeSingle();

      if (profileError) {
        console.error('Profile lookup error:', profileError);
        showToast(
          `Could not find user profile: ${profileError.message}`,
          'error'
        );
        return;
      }

      if (!profile) {
        showToast(
          `No profile found for UID ${userUid}. Refund was not applied.`,
          'error'
        );
        return;
      }

      const currentWinningCash = Number(profile.winning_cash || 0);

      if (!Number.isFinite(currentWinningCash)) {
        showToast(
          'The user winning_cash balance is invalid.',
          'error'
        );
        return;
      }

      const updatedWinningCash = currentWinningCash + amount;

      // Refund balance first.
      const { error: refundError } = await supabase
        .from('profiles')
        .update({ winning_cash: updatedWinningCash })
        .eq('id', profile.id);

      if (refundError) {
        console.error('Refund error:', refundError);
        showToast(
          `Refund failed: ${refundError.message}`,
          'error'
        );
        return;
      }

      // Then mark the withdrawal as rejected.
      const { error: rejectError } = await supabase
        .from('withdraw_requests')
        .update({ status: 'Rejected' })
        .eq('id', request.id)
        .eq('status', 'Processing');

      if (rejectError) {
        console.error('Reject status error:', rejectError);

        showToast(
          'Refund was added, but the request status could not be changed. Check this request before retrying to avoid a duplicate refund.',
          'error'
        );

        return;
      }

      showToast(
        `Withdrawal rejected. NPR ${amount} refunded to ${userUid}.`,
        'success'
      );

      await fetchWithdrawRequests();
    } catch (error: any) {
      console.error(error);
      showToast(
        error?.message || 'Unexpected error rejecting withdrawal.',
        'error'
      );
    } finally {
      setProcessingWithdrawId(null);
    }
  };

  // Search player by UID
  const handleSearchPlayer = async (
    e?: React.FormEvent
  ) => {
    e?.preventDefault();
    playClickSound();

    const uid = searchUid.trim();

    if (!uid) {
      showToast('Please enter a User UID.', 'error');
      return;
    }

    setSearchingPlayer(true);
    setPlayer(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_uid', uid)
        .maybeSingle();

      if (error) {
        console.error('Player lookup error:', error);
        showToast(
          `Player lookup failed: ${error.message}`,
          'error'
        );
        return;
      }

      if (!data) {
        showToast(`No player found for UID ${uid}.`, 'error');
        return;
      }

      setPlayer(data as PlayerProfile);
      showToast('Player profile loaded.', 'success');
    } catch (error: any) {
      console.error(error);
      showToast(
        error?.message || 'Unexpected error searching player.',
        'error'
      );
    } finally {
      setSearchingPlayer(false);
    }
  };

  // Add or deduct Red Diamonds / Winning Cash
  const handleAdjustPlayerBalance = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();
    playClickSound();

    if (!player) {
      showToast('Search and select a player first.', 'error');
      return;
    }

    const amount = Number(adjustmentAmount);

    if (
      !adjustmentAmount.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      showToast(
        'Enter a valid amount greater than zero.',
        'error'
      );
      return;
    }

    const fieldLabel =
      adjustmentField === 'red_diamonds'
        ? 'Red Diamonds'
        : 'Winning Cash';

    const currentBalance = Number(player[adjustmentField] || 0);

    if (!Number.isFinite(currentBalance) || currentBalance < 0) {
      showToast('Current player balance is invalid.', 'error');
      return;
    }

    const updatedBalance =
      adjustmentMode === 'add'
        ? currentBalance + amount
        : currentBalance - amount;

    if (updatedBalance < 0) {
      showToast(
        `Cannot deduct more than the current ${fieldLabel} balance.`,
        'error'
      );
      return;
    }

    const uid = String(
      player.user_uid || player.uid || searchUid
    ).trim();

    if (!uid) {
      showToast('Player UID is missing.', 'error');
      return;
    }

    const confirmed = window.confirm(
      `${adjustmentMode === 'add' ? 'Add' : 'Deduct'} ${amount} ${fieldLabel} for UID ${uid}?`
    );

    if (!confirmed) return;

    setAdjustingPlayer(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [adjustmentField]: updatedBalance })
        .eq('id', player.id);

      if (error) {
        console.error('Balance adjustment error:', error);
        showToast(
          `Balance adjustment failed: ${error.message}`,
          'error'
        );
        return;
      }

      setPlayer((previous) =>
        previous
          ? {
              ...previous,
              [adjustmentField]: updatedBalance,
            }
          : previous
      );

      setAdjustmentAmount('');

      showToast(
        `${fieldLabel} ${adjustmentMode === 'add' ? 'added' : 'deducted'} successfully.`,
        'success'
      );
    } catch (error: any) {
      console.error(error);
      showToast(
        error?.message || 'Unexpected balance adjustment error.',
        'error'
      );
    } finally {
      setAdjustingPlayer(false);
    }
  };

  const formatDate = (dateValue?: string) => {
    if (!dateValue) return '—';

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return dateValue;

    return date.toLocaleString();
  };

  const getStatusClass = (status?: string) => {
    if (status === 'Success') {
      return 'bg-green-500/15 text-green-400 border-green-500/30';
    }

    if (status === 'Rejected') {
      return 'bg-red-500/15 text-red-400 border-red-500/30';
    }

    return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
  };

  const getPlayerName = (profile: PlayerProfile) =>
    profile.full_name ||
    profile.nickname ||
    profile.username ||
    'Player';

  const getTurnoverStatus = (profile: PlayerProfile) => {
    const required = Number(profile.turnover_required || 0);
    const completed = Number(profile.turnover_completed || 0);

    return {
      required,
      completed,
      remaining: Math.max(0, required - completed),
    };
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center p-4">
        {toast && (
          <div
            role="status"
            className={`fixed top-4 left-1/2 z-50 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md rounded-xl border px-4 py-3 text-sm shadow-xl ${
              toast.type === 'success'
                ? 'border-green-500/40 bg-green-950 text-green-300'
                : toast.type === 'error'
                  ? 'border-red-500/40 bg-red-950 text-red-300'
                  : 'border-cyan-500/40 bg-gray-900 text-cyan-200'
            }`}
          >
            {toast.message}
          </div>
        )}

        <div className="w-full max-w-sm rounded-2xl border border-purple-500/30 bg-gray-900 p-6 shadow-2xl">
          <h1 className="mb-2 bg-gradient-to-r from-pink-400 to-cyan-400 bg-clip-text text-center text-lg font-black text-transparent">
            🛡️ ADMIN LOGIN
          </h1>

          <p className="mb-6 text-center text-[11px] text-gray-400">
            Enter admin password to access Arena Nepal dashboard.
          </p>

          <form
            onSubmit={handleLoginSubmit}
            className="flex flex-col gap-3"
          >
            <input
              type="password"
              placeholder="Enter Admin Password"
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-xl border border-gray-800 bg-black p-3 text-xs text-white outline-none focus:border-purple-500"
              required
            />

            <button
              type="submit"
              className="cursor-pointer rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 py-3 text-xs font-bold text-white shadow-lg transition-all hover:opacity-90"
            >
              Login to Admin Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] p-4 text-white">
      {/* Toast notification */}
      {toast && (
        <div
          role="status"
          className={`fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-xl border px-4 py-3 text-sm shadow-2xl ${
            toast.type === 'success'
              ? 'border-green-500/40 bg-green-950 text-green-300'
              : toast.type === 'error'
                ? 'border-red-500/40 bg-red-950 text-red-300'
                : 'border-cyan-500/40 bg-gray-900 text-cyan-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-gray-400 hover:text-white"
              aria-label="Close notification"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-5xl flex-col">
        {/* Header */}
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-purple-500/30 bg-gray-900 p-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="bg-gradient-to-r from-pink-400 to-cyan-400 bg-clip-text text-xl font-black text-transparent">
              🛡️ ARENA NEPAL ADMIN DASHBOARD
            </h1>
            <p className="mt-1 text-xs text-gray-400">
              Manage deposits, withdrawals, player accounts and balances.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="self-start rounded-xl border border-red-500/40 bg-red-600/20 px-4 py-2 text-xs font-bold text-red-300 transition-all hover:bg-red-600 hover:text-white sm:self-auto"
          >
            Logout
          </button>
        </div>

        {/* Dashboard counters */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-cyan-500/20 bg-gray-900 p-4">
            <p className="text-xs text-gray-400">
              Deposit Requests Loaded
            </p>
            <p className="mt-1 text-2xl font-black text-cyan-300">
              {depositRequests.length}
            </p>
          </div>

          <div className="rounded-2xl border border-pink-500/20 bg-gray-900 p-4">
            <p className="text-xs text-gray-400">
              Withdrawal Requests Loaded
            </p>
            <p className="mt-1 text-2xl font-black text-pink-300">
              {withdrawRequests.length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('deposits');
            }}
            className={`rounded-xl py-3 text-xs font-bold transition-all ${
              activeTab === 'deposits'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                : 'border border-gray-800 bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            Deposit Requests ({depositRequests.length})
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('withdraws');
            }}
            className={`rounded-xl py-3 text-xs font-bold transition-all ${
              activeTab === 'withdraws'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                : 'border border-gray-800 bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            Withdraw Requests ({withdrawRequests.length})
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveTab('players');
            }}
            className={`rounded-xl py-3 text-xs font-bold transition-all ${
              activeTab === 'players'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                : 'border border-gray-800 bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            Player Search / Lookup
          </button>
        </div>

        {/* DEPOSIT REQUESTS */}
        {activeTab === 'deposits' && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-black text-cyan-300">
                DEPOSIT REQUESTS
              </h2>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  void fetchDepositRequests();
                }}
                disabled={loadingDeposits}
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs font-bold text-gray-200 hover:border-cyan-500 disabled:opacity-50"
              >
                {loadingDeposits ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            {loadingDeposits && depositRequests.length === 0 ? (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 py-12 text-center text-sm text-gray-400">
                <span className="animate-pulse">
                  Loading deposit requests…
                </span>
              </div>
            ) : depositRequests.length === 0 ? (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 py-12 text-center text-sm text-gray-500">
                No deposit requests found.
              </div>
            ) : (
              depositRequests.map((req) => {
                const userUid = req.user_uid || '—';
                const userName =
                  req.user_name || req.username || 'Player';
                const packageDiamonds =
                  req.package_diamonds ?? req.diamonds ?? '—';
                const priceAmount =
                  req.price_amount ?? req.amount ?? '—';
                const paymentMethod =
                  req.payment_method || '—';

                return (
                  <article
                    key={req.id}
                    className="flex flex-col gap-3 rounded-2xl border border-gray-800 bg-gray-900 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-black text-cyan-300">
                        {userName} · UID: {userUid}
                      </span>

                      <span
                        className={`rounded-md border px-2 py-1 text-[10px] font-bold ${getStatusClass(req.status)}`}
                      >
                        {req.status || 'Pending'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                      <p className="text-gray-400">
                        Package Diamonds:{' '}
                        <b className="text-red-300">
                          {packageDiamonds}
                        </b>
                      </p>

                      <p className="text-gray-400">
                        Price Amount:{' '}
                        <b className="text-green-300">
                          NPR {priceAmount}
                        </b>
                      </p>

                      <p className="text-gray-400">
                        Payment Method:{' '}
                        <b className="text-white">
                          {paymentMethod}
                        </b>
                      </p>

                      <p className="text-gray-400">
                        Date:{' '}
                        <b className="text-gray-200">
                          {formatDate(req.created_at)}
                        </b>
                      </p>
                    </div>

                    {req.status === 'Pending' ||
                    req.status === 'Processing' ||
                    !req.status ? (
                      <button
                        type="button"
                        onClick={() =>
                          void handleApproveDeposit(req.id)
                        }
                        disabled={approvingDepositId === req.id}
                        className="mt-1 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 py-2.5 text-xs font-black text-white shadow-lg transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {approvingDepositId === req.id
                          ? 'Approving…'
                          : 'Approve Deposit'}
                      </button>
                    ) : null}
                  </article>
                );
              })
            )}
          </section>
        )}

        {/* WITHDRAW REQUESTS */}
        {activeTab === 'withdraws' && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-black text-cyan-300">
                WITHDRAW REQUESTS
              </h2>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  void fetchWithdrawRequests();
                }}
                disabled={loadingWithdraws}
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs font-bold text-gray-200 hover:border-cyan-500 disabled:opacity-50"
              >
                {loadingWithdraws ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            {loadingWithdraws && withdrawRequests.length === 0 ? (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 py-12 text-center text-sm text-gray-400">
                <span className="animate-pulse">
                  Loading withdrawal requests…
                </span>
              </div>
            ) : withdrawRequests.length === 0 ? (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 py-12 text-center text-sm text-gray-500">
                No withdrawal requests found.
              </div>
            ) : (
              withdrawRequests.map((req) => {
                const accountName =
                  req.account_name || req.esewa_name || '—';
                const accountNumber =
                  req.account_number || req.esewa_id || '—';
                const paymentMethod =
                  req.payment_method || '—';
                const qrImage =
                  req.qr_image_url || req.qr_image || '';

                return (
                  <article
                    key={req.id}
                    className="flex flex-col gap-3 rounded-2xl border border-gray-800 bg-gray-900 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-black text-cyan-300">
                        UID: {req.user_uid || '—'}
                      </span>

                      <span
                        className={`rounded-md border px-2 py-1 text-[10px] font-bold ${getStatusClass(req.status)}`}
                      >
                        {req.status || 'Processing'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                      <p className="text-gray-400">
                        Account Name:{' '}
                        <b className="text-white">{accountName}</b>
                      </p>

                      <p className="text-gray-400">
                        Account Number:{' '}
                        <b className="text-white">
                          {accountNumber}
                        </b>
                      </p>

                      <p className="text-gray-400">
                        Payment Method:{' '}
                        <b className="text-white">
                          {paymentMethod}
                        </b>
                      </p>

                      <p className="text-gray-400">
                        Amount:{' '}
                        <b className="text-green-300">
                          NPR {req.amount ?? '—'}
                        </b>
                      </p>

                      <p className="text-gray-400 sm:col-span-2">
                        Date:{' '}
                        <b className="text-gray-200">
                          {formatDate(req.created_at)}
                        </b>
                      </p>
                    </div>

                    {qrImage ? (
                      <div className="rounded-xl border border-gray-800 bg-black/30 p-3">
                        <p className="mb-2 text-[10px] font-bold text-gray-400">
                          QR IMAGE
                        </p>

                        <a
                          href={qrImage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-xs text-cyan-300 underline hover:text-cyan-200"
                        >
                          Open QR Image
                        </a>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-500">
                        QR Image: Not provided
                      </p>
                    )}

                    {(req.status === 'Processing' ||
                      req.status === 'Pending' ||
                      !req.status) && (
                      <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() =>
                            void handleApproveWithdraw(req.id)
                          }
                          disabled={
                            processingWithdrawId === req.id
                          }
                          className="rounded-xl bg-green-600 py-2.5 text-xs font-black text-white transition-all hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {processingWithdrawId === req.id
                            ? 'Processing…'
                            : 'Approve (Payment Sent)'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void handleRejectWithdraw(req)
                          }
                          disabled={
                            processingWithdrawId === req.id
                          }
                          className="rounded-xl border border-red-500/40 bg-red-600/15 py-2.5 text-xs font-black text-red-300 transition-all hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {processingWithdrawId === req.id
                            ? 'Processing…'
                            : 'Reject & Refund'}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </section>
        )}

        {/* PLAYER SEARCH / LOOKUP */}
        {activeTab === 'players' && (
          <section className="flex flex-col gap-4">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <h2 className="mb-4 text-sm font-black text-cyan-300">
                PLAYER SEARCH / LOOKUP
              </h2>

              <form
                onSubmit={handleSearchPlayer}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <input
                  type="text"
                  placeholder="Enter User UID (e.g. AN-12345)"
                  value={searchUid}
                  onChange={(e) => setSearchUid(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-gray-800 bg-black p-3 text-xs text-white outline-none focus:border-cyan-500"
                  required
                />

                <button
                  type="submit"
                  disabled={searchingPlayer}
                  className="rounded-xl bg-cyan-500 px-5 py-3 text-xs font-black text-black transition-all hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {searchingPlayer ? 'Searching…' : 'Search Player'}
                </button>
              </form>
            </div>

            {searchingPlayer && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 py-8 text-center text-sm text-gray-400">
                Searching player…
              </div>
            )}

            {player && (
              <>
                <div className="rounded-2xl border border-cyan-500/20 bg-gray-900 p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-black text-cyan-300">
                      PLAYER PROFILE
                    </h3>

                    <span className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300">
                      UID: {player.user_uid || player.uid || searchUid}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-800 bg-black/30 p-3">
                      <p className="text-[10px] text-gray-500">
                        Full Name
                      </p>
                      <p className="mt-1 break-words text-sm font-bold text-white">
                        {player.full_name || '—'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-800 bg-black/30 p-3">
                      <p className="text-[10px] text-gray-500">
                        Phone
                      </p>
                      <p className="mt-1 break-words text-sm font-bold text-white">
                        {player.phone || '—'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-800 bg-black/30 p-3 sm:col-span-2">
                      <p className="text-[10px] text-gray-500">
                        Email
                      </p>
                      <p className="mt-1 break-words text-sm font-bold text-white">
                        {player.email || '—'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                      <p className="text-[10px] text-gray-500">
                        Red Diamonds
                      </p>
                      <p className="mt-1 text-xl font-black text-red-300">
                        {Number(player.red_diamonds || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
                      <p className="text-[10px] text-gray-500">
                        Winning Cash
                      </p>
                      <p className="mt-1 text-xl font-black text-green-300">
                        NPR{' '}
                        {Number(player.winning_cash || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
                      <p className="text-[10px] text-gray-500">
                        White Diamonds
                      </p>
                      <p className="mt-1 text-xl font-black text-cyan-300">
                        {Number(player.white_diamonds || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3">
                      <p className="text-[10px] text-gray-500">
                        Turnover Status
                      </p>

                      <p className="mt-1 text-sm font-bold text-purple-300">
                        {getTurnoverStatus(player).completed.toLocaleString()}
                        {' / '}
                        {getTurnoverStatus(player).required.toLocaleString()}
                      </p>

                      <p className="mt-1 text-[10px] text-gray-400">
                        Remaining:{' '}
                        {getTurnoverStatus(player).remaining.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Manual adjustment */}
                <div className="rounded-2xl border border-pink-500/20 bg-gray-900 p-5">
                  <h3 className="mb-1 text-sm font-black text-pink-300">
                    MANUAL BALANCE ADJUSTMENT
                  </h3>

                  <p className="mb-4 text-[11px] text-gray-500">
                    Use only for verified emergency corrections.
                  </p>

                  <form
                    onSubmit={handleAdjustPlayerBalance}
                    className="flex flex-col gap-4"
                  >
                    <div>
                      <label className="mb-2 block text-[10px] font-bold text-gray-400">
                        Balance Type
                      </label>

                      <select
                        value={adjustmentField}
                        onChange={(e) =>
                          setAdjustmentField(
                            e.target.value as AdjustmentField
                          )
                        }
                        className="w-full rounded-xl border border-gray-800 bg-black p-3 text-xs text-white outline-none focus:border-pink-500"
                      >
                        <option value="red_diamonds">
                          Red Diamonds
                        </option>
                        <option value="winning_cash">
                          Winning Cash
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-bold text-gray-400">
                        Adjustment Action
                      </label>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setAdjustmentMode('add');
                          }}
                          className={`rounded-xl py-3 text-xs font-black transition-all ${
                            adjustmentMode === 'add'
                              ? 'bg-green-600 text-white'
                              : 'border border-gray-800 bg-black text-gray-400'
                          }`}
                        >
                          + Add
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setAdjustmentMode('deduct');
                          }}
                          className={`rounded-xl py-3 text-xs font-black transition-all ${
                            adjustmentMode === 'deduct'
                              ? 'bg-red-600 text-white'
                              : 'border border-gray-800 bg-black text-gray-400'
                          }`}
                        >
                          − Deduct
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-bold text-gray-400">
                        Amount
                      </label>

                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        placeholder="Enter amount"
                        value={adjustmentAmount}
                        onChange={(e) =>
                          setAdjustmentAmount(e.target.value)
                        }
                        className="w-full rounded-xl border border-gray-800 bg-black p-3 text-xs text-white outline-none focus:border-pink-500"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={adjustingPlayer}
                      className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 py-3 text-xs font-black text-white shadow-lg transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {adjustingPlayer
                        ? 'Updating Balance…'
                        : `${adjustmentMode === 'add' ? 'Add' : 'Deduct'} ${
                            adjustmentField === 'red_diamonds'
                              ? 'Red Diamonds'
                              : 'Winning Cash'
                          }`}
                    </button>
                  </form>
                </div>
              </>
            )}
          </section>
        )}

        <p className="mt-8 text-center text-[10px] text-gray-600">
          Arena Nepal Admin Dashboard
        </p>
      </div>
    </div>
  );
}