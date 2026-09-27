'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ixaugtdwfxhmqypglder.supabase.co';
const supabaseAnonKey = 'sb_publishable_XRLDHfS-bDHlJJBzlGEmqQ_WetQ24cZ';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Tab =
  | 'deposits'
  | 'withdraws'
  | 'players'
  | 'password'
  | 'workers'
  | 'create_player'
  | 'tournaments';

type DepositRequest = {
  id: number | string;
  user_uid?: string;
  user_name?: string;
  package_diamonds?: number;
  amount?: number;
  payment_method?: string;
  proof_url?: string;
  created_at?: string;
  status?: string;
};

type WithdrawRequest = {
  id: number | string;
  user_uid?: string;
  username?: string;
  account_name?: string;
  account_no?: string;
  method?: string;
  amount?: number;
  qr_path?: string;
  created_at?: string;
  status?: string;
};

type Worker = {
  id: string;
  email: string;
  roles: string[];
  created_at: string;
};

type TournamentAdminRow = {
  id: string;
  title: string;
  type: string;
  type_label: string;
  status: string;
  start_time: string;
  end_time: string;
  entry_fee: number;
  prize_pool: number;
  joined_count: number;
  played_count: number;
  top_ranks: {
    rank: number;
    user_id: string;
    score: number;
    name: string;
    uid: string;
  }[];
};

const ROLE_LABELS: Record<string, string> = {
  deposit: 'Deposit',
  withdraw: 'Withdraw',
  password_reset: 'Password Reset',
  owner: 'Owner (Full Access)',
};

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

export default function AdminPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [adminEmail, setAdminEmail] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<Tab | null>(null);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 6000);
  };

  // ---- Deposits ----
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loadingDeposits, setLoadingDeposits] = useState(false);
  const [busyDepositId, setBusyDepositId] = useState<string | number | null>(null);

  // ---- Manual diamond credit ----
  const [manualUid, setManualUid] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [creditingManual, setCreditingManual] = useState(false);

  // ---- Withdraws ----
  const [withdraws, setWithdraws] = useState<WithdrawRequest[]>([]);
  const [loadingWithdraws, setLoadingWithdraws] = useState(false);
  const [busyWithdrawId, setBusyWithdrawId] = useState<string | number | null>(null);
  const [rejectReasonDraft, setRejectReasonDraft] = useState<Record<string, string>>({});

  // ---- Player search (owner) ----
  const [playerSearchUid, setPlayerSearchUid] = useState('');
  const [playerResult, setPlayerResult] = useState<any>(null);
  const [searchingPlayer, setSearchingPlayer] = useState(false);

  // ---- Password reset ----
  const [resetUid, setResetUid] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [lastResetResult, setLastResetResult] = useState<{ uid: string; password: string } | null>(null);

  // ---- Manage workers (owner) ----
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [newWorkerEmail, setNewWorkerEmail] = useState('');
  const [newWorkerRoles, setNewWorkerRoles] = useState<string[]>([]);
  const [creatingWorker, setCreatingWorker] = useState(false);
  const [lastCreatedWorker, setLastCreatedWorker] = useState<{ email: string; password: string } | null>(null);

  // ---- Create player (owner) ----
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerEmail, setNewPlayerEmail] = useState('');
  const [newPlayerPhone, setNewPlayerPhone] = useState('');
  const [creatingPlayer, setCreatingPlayer] = useState(false);
  const [lastCreatedPlayer, setLastCreatedPlayer] = useState<{
    email: string;
    player_uid: string;
    password: string;
  } | null>(null);

  // ---- Tournaments monitor (owner) ----
  const [tournamentRows, setTournamentRows] = useState<TournamentAdminRow[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const [expandedTournamentId, setExpandedTournamentId] = useState<string | null>(null);

  const loadRolesForCurrentSession = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_my_admin_roles');

    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      await supabase.auth.signOut();
      setIsLoggedIn(false);
      setRoles([]);
      return;
    }

    const roleList = Array.isArray(data) ? data : [];
    setRoles(roleList);
    setIsLoggedIn(true);

    const first =
      (roleList.includes('deposit') && 'deposits') ||
      (roleList.includes('withdraw') && 'withdraws') ||
      (roleList.includes('password_reset') && 'password') ||
      (roleList.includes('owner') && 'deposits') ||
      null;

    setActiveTab(first as Tab | null);
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user && mounted) {
        setAdminEmail(session.user.email || '');
        await loadRolesForCurrentSession();
      }

      if (mounted) setCheckingSession(false);
    };

    void init();

    return () => {
      mounted = false;
    };
  }, [loadRolesForCurrentSession]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginBusy(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (error || !data.session) {
        setLoginError(error?.message || 'Login failed.');
        return;
      }

      setAdminEmail(data.session.user.email || '');
      await loadRolesForCurrentSession();

      const { data: check } = await supabase.rpc('get_my_admin_roles');
      if (!check || (Array.isArray(check) && check.length === 0)) {
        setLoginError('This account has no admin access.');
      }
    } finally {
      setLoginBusy(false);
      setLoginPassword('');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setRoles([]);
    setActiveTab(null);
  };

  const authedFetch = async (path: string, body?: unknown, method: 'POST' | 'GET' = 'POST') => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;

    if (!token) {
      throw new Error('Session expired. Please log in again.');
    }

    const res = await fetch(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json?.error || `Request failed (${res.status}).`);
    }

    return json;
  };

  // ---------------- Deposits ----------------

  const fetchDeposits = useCallback(async () => {
    setLoadingDeposits(true);
    try {
      const { data, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeposits((data || []) as DepositRequest[]);
    } catch (err: any) {
      notify(err?.message || 'Could not load deposits.', 'error');
    } finally {
      setLoadingDeposits(false);
    }
  }, []);

  const approveDeposit = async (id: string | number) => {
    setBusyDepositId(id);
    try {
      const { error } = await supabase.rpc('admin_approve_deposit', { p_request_id: id });
      if (error) throw error;
      notify('Deposit approved and diamonds credited.');
      await fetchDeposits();
    } catch (err: any) {
      notify(err?.message || 'Approve failed.', 'error');
    } finally {
      setBusyDepositId(null);
    }
  };

  const rejectDeposit = async (id: string | number) => {
    setBusyDepositId(id);
    try {
      const { error } = await supabase.rpc('admin_reject_deposit', {
        p_request_id: id,
        p_reason: null,
      });
      if (error) throw error;
      notify('Deposit rejected.');
      await fetchDeposits();
    } catch (err: any) {
      notify(err?.message || 'Reject failed.', 'error');
    } finally {
      setBusyDepositId(null);
    }
  };

  const creditManualDiamonds = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = Number(manualAmount);

    if (!manualUid.trim()) {
      notify('Enter the player UID.', 'error');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      notify('Enter a valid diamond amount.', 'error');
      return;
    }

    setCreditingManual(true);

    try {
      const { error } = await supabase.rpc('admin_manual_credit_diamonds', {
        p_uid: manualUid.trim(),
        p_amount: amount,
        p_note: manualNote.trim() || null,
      });

      if (error) throw error;

      notify(`${amount} Red Diamonds credited to ${manualUid.trim()}.`);
      setManualUid('');
      setManualAmount('');
      setManualNote('');
    } catch (err: any) {
      notify(err?.message || 'Credit failed.', 'error');
    } finally {
      setCreditingManual(false);
    }
  };

  // ---------------- Withdraws ----------------

  const fetchWithdraws = useCallback(async () => {
    setLoadingWithdraws(true);
    try {
      const { data, error } = await supabase
        .from('withdraw_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdraws((data || []) as WithdrawRequest[]);
    } catch (err: any) {
      notify(err?.message || 'Could not load withdrawals.', 'error');
    } finally {
      setLoadingWithdraws(false);
    }
  }, []);

  const approveWithdraw = async (id: string | number) => {
    setBusyWithdrawId(id);
    try {
      const { error } = await supabase.rpc('admin_approve_withdraw', { p_request_id: id });
      if (error) throw error;
      notify('Withdrawal marked as paid.');
      await fetchWithdraws();
    } catch (err: any) {
      notify(err?.message || 'Approve failed.', 'error');
    } finally {
      setBusyWithdrawId(null);
    }
  };

  const rejectWithdraw = async (id: string | number) => {
    setBusyWithdrawId(id);
    try {
      const reason = rejectReasonDraft[String(id)] || null;
      const { error } = await supabase.rpc('admin_reject_withdraw', {
        p_request_id: id,
        p_reason: reason,
      });
      if (error) throw error;
      notify('Withdrawal rejected and cash refunded to the player.');
      await fetchWithdraws();
    } catch (err: any) {
      notify(err?.message || 'Reject failed.', 'error');
    } finally {
      setBusyWithdrawId(null);
    }
  };

  // ---------------- Player search (owner) ----------------

  const searchPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchingPlayer(true);
    setPlayerResult(null);
    try {
      const { data, error } = await supabase.rpc('admin_search_player', {
        p_uid: playerSearchUid.trim(),
      });
      if (error) throw error;
      setPlayerResult(data);
    } catch (err: any) {
      notify(err?.message || 'Player not found.', 'error');
    } finally {
      setSearchingPlayer(false);
    }
  };

  // ---------------- Password reset ----------------

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResettingPassword(true);
    setLastResetResult(null);
    try {
      const result = await authedFetch('/api/admin/reset-password', {
        user_uid: resetUid.trim(),
      });
      setLastResetResult({ uid: resetUid.trim(), password: result.temp_password });
      notify('Password reset. Share the new password with the player securely.');
    } catch (err: any) {
      notify(err?.message || 'Password reset failed.', 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  // ---------------- Manage workers (owner) ----------------

  const fetchWorkers = useCallback(async () => {
    setLoadingWorkers(true);
    try {
      const { data, error } = await supabase.rpc('admin_list_workers');
      if (error) throw error;
      setWorkers((data || []) as Worker[]);
    } catch (err: any) {
      notify(err?.message || 'Could not load workers.', 'error');
    } finally {
      setLoadingWorkers(false);
    }
  }, []);

  const toggleNewWorkerRole = (role: string) => {
    setNewWorkerRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const createWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingWorker(true);
    setLastCreatedWorker(null);
    try {
      const result = await authedFetch('/api/admin/create-worker', {
        email: newWorkerEmail.trim(),
        roles: newWorkerRoles,
      });
      setLastCreatedWorker({ email: result.email, password: result.temp_password });
      setNewWorkerEmail('');
      setNewWorkerRoles([]);
      notify('Worker account created.');
      await fetchWorkers();
    } catch (err: any) {
      notify(err?.message || 'Could not create worker.', 'error');
    } finally {
      setCreatingWorker(false);
    }
  };

  const removeWorker = async (id: string) => {
    if (!window.confirm("Remove this worker's admin access?")) return;
    try {
      const { error } = await supabase.rpc('admin_remove_worker', { p_admin_id: id });
      if (error) throw error;
      notify('Worker access removed.');
      await fetchWorkers();
    } catch (err: any) {
      notify(err?.message || 'Could not remove worker.', 'error');
    }
  };

  // ---------------- Create player (owner) ----------------

  const createPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingPlayer(true);
    setLastCreatedPlayer(null);
    try {
      const result = await authedFetch('/api/admin/create-player', {
        email: newPlayerEmail.trim(),
        full_name: newPlayerName.trim(),
        phone: newPlayerPhone.trim(),
      });
      setLastCreatedPlayer({
        email: result.email,
        player_uid: result.player_uid,
        password: result.temp_password,
      });
      setNewPlayerName('');
      setNewPlayerEmail('');
      setNewPlayerPhone('');
      notify('Player account created. Share login details securely.');
    } catch (err: any) {
      notify(err?.message || 'Could not create player.', 'error');
    } finally {
      setCreatingPlayer(false);
    }
  };

  // ---------------- Tournaments monitor (owner) ----------------

  const fetchTournamentsAdmin = useCallback(async () => {
    setLoadingTournaments(true);
    try {
      const result = await authedFetch('/api/admin/tournaments', undefined, 'GET');
      setTournamentRows((result.tournaments || []) as TournamentAdminRow[]);
    } catch (err: any) {
      notify(err?.message || 'Could not load tournaments.', 'error');
    } finally {
      setLoadingTournaments(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !activeTab) return;
    if (activeTab === 'deposits') void fetchDeposits();
    if (activeTab === 'withdraws') void fetchWithdraws();
    if (activeTab === 'workers') void fetchWorkers();
    if (activeTab === 'tournaments') void fetchTournamentsAdmin();
  }, [
    isLoggedIn,
    activeTab,
    fetchDeposits,
    fetchWithdraws,
    fetchWorkers,
    fetchTournamentsAdmin,
  ]);

  const canSee = (role: string) => roles.includes(role) || roles.includes('owner');

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0F19]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0F19] p-4 text-white">
        <div className="w-full max-w-sm rounded-2xl border border-purple-500/30 bg-gray-900 p-6 shadow-2xl">
          <h1 className="mb-1 bg-gradient-to-r from-pink-400 to-cyan-400 bg-clip-text text-center text-lg font-black text-transparent">
            🛡️ ARENA NEPAL ADMIN
          </h1>
          <p className="mb-6 text-center text-[11px] text-gray-400">
            Staff login only. Player accounts cannot access this panel.
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Admin email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-800 bg-black p-3 text-xs text-white outline-none focus:border-purple-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-800 bg-black p-3 text-xs text-white outline-none focus:border-purple-500"
            />

            {loginError && (
              <p className="rounded-lg border border-red-500/40 bg-red-950/60 p-2 text-[11px] text-red-300">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loginBusy}
              className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 py-3 text-xs font-bold text-white shadow-lg disabled:opacity-50"
            >
              {loginBusy ? 'Signing in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] p-4 text-white">
      {toast && (
        <div
          className={`fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-xl border px-4 py-3 text-sm shadow-2xl ${
            toast.type === 'success'
              ? 'border-green-500/40 bg-green-950 text-green-300'
              : 'border-red-500/40 bg-red-950 text-red-300'
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="mx-auto flex w-full max-w-5xl flex-col">
        <div className="mb-6 flex flex-col justify-between gap-3 rounded-2xl border border-purple-500/30 bg-gray-900 p-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="bg-gradient-to-r from-pink-400 to-cyan-400 bg-clip-text text-lg font-black text-transparent">
              🛡️ ARENA NEPAL ADMIN
            </h1>
            <p className="mt-1 text-[11px] text-gray-400">
              {adminEmail} · {roles.map((r) => ROLE_LABELS[r] || r).join(', ')}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="self-start rounded-xl border border-red-500/40 bg-red-600/20 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-600 hover:text-white sm:self-auto"
          >
            Logout
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {canSee('deposit') && (
            <TabButton active={activeTab === 'deposits'} onClick={() => setActiveTab('deposits')}>
              Deposit
            </TabButton>
          )}
          {canSee('withdraw') && (
            <TabButton active={activeTab === 'withdraws'} onClick={() => setActiveTab('withdraws')}>
              Withdraw
            </TabButton>
          )}
          {canSee('password_reset') && (
            <TabButton active={activeTab === 'password'} onClick={() => setActiveTab('password')}>
              Password Reset
            </TabButton>
          )}
          {roles.includes('owner') && (
            <TabButton active={activeTab === 'players'} onClick={() => setActiveTab('players')}>
              Player Search
            </TabButton>
          )}
          {roles.includes('owner') && (
            <TabButton
              active={activeTab === 'create_player'}
              onClick={() => setActiveTab('create_player')}
            >
              Create Player
            </TabButton>
          )}
          {roles.includes('owner') && (
            <TabButton
              active={activeTab === 'tournaments'}
              onClick={() => setActiveTab('tournaments')}
            >
              Tournaments
            </TabButton>
          )}
          {roles.includes('owner') && (
            <TabButton active={activeTab === 'workers'} onClick={() => setActiveTab('workers')}>
              Manage Workers
            </TabButton>
          )}
        </div>

        {/* DEPOSITS */}
        {activeTab === 'deposits' && canSee('deposit') && (
          <section className="flex flex-col gap-3">
            <div className="rounded-2xl border border-yellow-500/30 bg-gray-900 p-4">
              <h2 className="mb-1 text-sm font-black text-yellow-300">MANUAL DIAMOND CREDIT</h2>
              <p className="mb-3 text-[11px] text-gray-400">
                Directly add Red Diamonds to a player&apos;s account by UID — no request needed.
              </p>
              <form onSubmit={creditManualDiamonds} className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Player UID (e.g. AN-99B5EA1A)"
                  value={manualUid}
                  onChange={(e) => setManualUid(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-800 bg-black p-3 text-xs text-white outline-none"
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Red Diamonds to add"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-800 bg-black p-3 text-xs text-white outline-none"
                />
                <input
                  type="text"
                  placeholder="Note (optional, e.g. 'cash handed in person')"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  className="w-full rounded-xl border border-gray-800 bg-black p-3 text-xs text-white outline-none"
                />
                <button
                  type="submit"
                  disabled={creditingManual}
                  className="rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 py-3 text-xs font-black text-black disabled:opacity-50"
                >
                  {creditingManual ? 'Crediting…' : 'Done — Credit Diamonds'}
                </button>
              </form>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-cyan-300">DEPOSIT REQUESTS</h2>
              <button
                onClick={() => void fetchDeposits()}
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs font-bold text-gray-200"
              >
                {loadingDeposits ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            {deposits.length === 0 && !loadingDeposits && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 py-10 text-center text-sm text-gray-500">
                No deposit requests.
              </div>
            )}

            {deposits.map((req) => (
              <article key={req.id} className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-black text-cyan-300">
                    {req.user_name || 'Player'} · UID: {req.user_uid}
                  </span>
                  <span className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 text-[10px] font-bold text-yellow-300">
                    {req.status || 'Pending'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                  <p>
                    Diamonds: <b className="text-red-300">{req.package_diamonds}</b>
                  </p>
                  <p>
                    Amount: <b className="text-green-300">NPR {req.amount}</b>
                  </p>
                  <p>
                    Method: <b className="text-white">{req.payment_method || '—'}</b>
                  </p>
                  <p>Date: {formatDate(req.created_at)}</p>
                </div>
                {req.proof_url && (
                  <a
                    href={req.proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-cyan-300 underline"
                  >
                    View payment proof
                  </a>
                )}
                {(!req.status || req.status === 'Pending') && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => void approveDeposit(req.id)}
                      disabled={busyDepositId === req.id}
                      className="rounded-xl bg-green-600 py-2.5 text-xs font-black text-white disabled:opacity-50"
                    >
                      {busyDepositId === req.id ? 'Processing…' : 'Approve'}
                    </button>
                    <button
                      onClick={() => void rejectDeposit(req.id)}
                      disabled={busyDepositId === req.id}
                      className="rounded-xl border border-red-500/40 bg-red-600/15 py-2.5 text-xs font-black text-red-300 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </article>
            ))}
          </section>
        )}

        {/* WITHDRAWS */}
        {activeTab === 'withdraws' && canSee('withdraw') && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-cyan-300">WITHDRAW REQUESTS</h2>
              <button
                onClick={() => void fetchWithdraws()}
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs font-bold text-gray-200"
              >
                {loadingWithdraws ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            {withdraws.length === 0 && !loadingWithdraws && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 py-10 text-center text-sm text-gray-500">
                No withdrawal requests.
              </div>
            )}

            {withdraws.map((req) => (
              <article key={req.id} className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-black text-cyan-300">UID: {req.user_uid}</span>
                  <span className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 text-[10px] font-bold text-yellow-300">
                    {req.status || 'Processing'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                  <p>
                    Account: <b className="text-white">{req.account_name}</b>
                  </p>
                  <p>
                    Number: <b className="text-white">{req.account_no}</b>
                  </p>
                  <p>
                    Method: <b className="text-white">{req.method}</b>
                  </p>
                  <p>
                    Amount: <b className="text-green-300">NPR {req.amount}</b>
                  </p>
                  <p className="col-span-2">Date: {formatDate(req.created_at)}</p>
                </div>
                {req.qr_path && (
                  <p className="mt-2 text-[11px] text-gray-500 break-all">QR path: {req.qr_path}</p>
                )}
                {req.status === 'Processing' && (
                  <div className="mt-3 flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Rejection reason (only needed if rejecting)"
                      value={rejectReasonDraft[String(req.id)] || ''}
                      onChange={(e) =>
                        setRejectReasonDraft((prev) => ({
                          ...prev,
                          [String(req.id)]: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-800 bg-black p-2 text-xs text-white outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => void approveWithdraw(req.id)}
                        disabled={busyWithdrawId === req.id}
                        className="rounded-xl bg-green-600 py-2.5 text-xs font-black text-white disabled:opacity-50"
                      >
                        {busyWithdrawId === req.id ? 'Processing…' : 'Approve (Paid)'}
                      </button>
                      <button
                        onClick={() => void rejectWithdraw(req.id)}
                        disabled={busyWithdrawId === req.id}
                        className="rounded-xl border border-red-500/40 bg-red-600/15 py-2.5 text-xs font-black text-red-300 disabled:opacity-50"
                      >
                        Reject & Refund
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </section>
        )}

        {/* PASSWORD RESET */}
        {activeTab === 'password' && canSee('password_reset') && (
          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="mb-4 text-sm font-black text-cyan-300">RESET PLAYER PASSWORD</h2>
            <form onSubmit={resetPassword} className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Player UID (e.g. AN-99B5EA1A)"
                value={resetUid}
                onChange={(e) => setResetUid(e.target.value)}
                required
                className="min-w-0 flex-1 rounded-xl border border-gray-800 bg-black p-3 text-xs text-white outline-none"
              />
              <button
                type="submit"
                disabled={resettingPassword}
                className="rounded-xl bg-cyan-500 px-5 py-3 text-xs font-black text-black disabled:opacity-50"
              >
                {resettingPassword ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>

            {lastResetResult && (
              <div className="mt-4 rounded-xl border border-green-500/40 bg-green-950/40 p-4">
                <p className="text-xs text-green-300">
                  New password for <b>{lastResetResult.uid}</b>:
                </p>
                <p className="mt-1 select-all break-all text-lg font-black text-white">
                  {lastResetResult.password}
                </p>
                <p className="mt-2 text-[10px] text-gray-400">
                  Send this to the player over WhatsApp now — it will not be shown again.
                </p>
              </div>
            )}
          </section>
        )}

        {/* PLAYER SEARCH (owner) */}
        {activeTab === 'players' && roles.includes('owner') && (
          <section className="flex flex-col gap-4">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <h2 className="mb-4 text-sm font-black text-cyan-300">PLAYER SEARCH</h2>
              <form onSubmit={searchPlayer} className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  placeholder="Player UID"
                  value={playerSearchUid}
                  onChange={(e) => setPlayerSearchUid(e.target.value)}
                  required
                  className="min-w-0 flex-1 rounded-xl border border-gray-800 bg-black p-3 text-xs text-white outline-none"
                />
                <button
                  type="submit"
                  disabled={searchingPlayer}
                  className="rounded-xl bg-cyan-500 px-5 py-3 text-xs font-black text-black disabled:opacity-50"
                >
                  {searchingPlayer ? 'Searching…' : 'Search'}
                </button>
              </form>
            </div>

            {playerResult?.profile && (
              <div className="rounded-2xl border border-cyan-500/20 bg-gray-900 p-5">
                <h3 className="mb-3 text-sm font-black text-cyan-300">
                  {playerResult.profile.nickname ||
                    playerResult.profile.full_name ||
                    'Player'}
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                  <Stat
                    label="Red Diamonds"
                    value={playerResult.profile.red_diamonds}
                    color="text-red-300"
                  />
                  <Stat
                    label="White Diamonds"
                    value={playerResult.profile.white_diamonds}
                    color="text-cyan-300"
                  />
                  <Stat
                    label="Winning Cash"
                    value={`NPR ${playerResult.profile.winning_cash}`}
                    color="text-green-300"
                  />
                  <Stat
                    label="Deposit Requests"
                    value={playerResult.deposit_count}
                    color="text-yellow-300"
                  />
                  <Stat
                    label="Withdraw Requests"
                    value={playerResult.withdraw_count}
                    color="text-pink-300"
                  />
                  <Stat
                    label="Phone"
                    value={
                      playerResult.profile.mobile_number ||
                      playerResult.profile.phone ||
                      '—'
                    }
                    color="text-gray-300"
                  />
                </div>
              </div>
            )}
          </section>
        )}

        {/* CREATE PLAYER (owner) */}
        {activeTab === 'create_player' && roles.includes('owner') && (
          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="mb-1 text-sm font-black text-cyan-300">CREATE PLAYER ACCOUNT</h2>
            <p className="mb-4 text-[11px] text-gray-400">
              Create a new player login (email + temp password + Game UID). Share details on
              WhatsApp only once.
            </p>
            <form onSubmit={createPlayer} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Full name"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-800 bg-black p-3 text-xs text-white outline-none"
              />
              <input
                type="email"
                placeholder="Player email / Gmail"
                value={newPlayerEmail}
                onChange={(e) => setNewPlayerEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-800 bg-black p-3 text-xs text-white outline-none"
              />
              <input
                type="tel"
                placeholder="Phone number"
                value={newPlayerPhone}
                onChange={(e) => setNewPlayerPhone(e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-black p-3 text-xs text-white outline-none"
              />
              <button
                type="submit"
                disabled={creatingPlayer}
                className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 py-3 text-xs font-black text-white disabled:opacity-50"
              >
                {creatingPlayer ? 'Creating…' : 'Create Player Account'}
              </button>
            </form>

            {lastCreatedPlayer && (
              <div className="mt-4 rounded-xl border border-green-500/40 bg-green-950/40 p-4">
                <p className="text-xs text-green-300 font-bold">Account created — send to player:</p>
                <p className="mt-2 text-xs text-gray-300">
                  Email:{' '}
                  <b className="select-all text-white">{lastCreatedPlayer.email}</b>
                </p>
                <p className="mt-1 text-xs text-gray-300">
                  Game UID:{' '}
                  <b className="select-all text-yellow-300">{lastCreatedPlayer.player_uid}</b>
                </p>
                <p className="mt-1 text-xs text-gray-300">Password:</p>
                <p className="mt-0.5 select-all break-all text-lg font-black text-white">
                  {lastCreatedPlayer.password}
                </p>
                <p className="mt-2 text-[10px] text-gray-400">
                  Player logs in with email + password. UID is their Game ID.
                </p>
              </div>
            )}
          </section>
        )}

        {/* TOURNAMENTS MONITOR (owner) */}
        {activeTab === 'tournaments' && roles.includes('owner') && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-cyan-300">TOURNAMENT MONITOR</h2>
              <button
                onClick={() => void fetchTournamentsAdmin()}
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs font-bold text-gray-200"
              >
                {loadingTournaments ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            {tournamentRows.length === 0 && !loadingTournaments && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 py-10 text-center text-sm text-gray-500">
                No tournaments found.
              </div>
            )}

            {tournamentRows.map((t) => (
              <article
                key={t.id}
                className="rounded-2xl border border-gray-800 bg-gray-900 p-4"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-black text-cyan-300">
                    {t.type_label} · {t.title}
                  </span>
                  <span className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 text-[10px] font-bold text-yellow-300">
                    {t.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 sm:grid-cols-4">
                  <p>
                    Joined: <b className="text-white">{t.joined_count}</b>
                  </p>
                  <p>
                    Played: <b className="text-white">{t.played_count}</b>
                  </p>
                  <p>
                    Fee: <b className="text-red-300">{t.entry_fee} 🔴</b>
                  </p>
                  <p>
                    Pool: <b className="text-yellow-300">{t.prize_pool} 🔴</b>
                  </p>
                  <p className="col-span-2">Start: {formatDate(t.start_time)}</p>
                  <p className="col-span-2">End: {formatDate(t.end_time)}</p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setExpandedTournamentId((id) => (id === t.id ? null : t.id))
                  }
                  className="mt-3 rounded-lg border border-gray-700 bg-black/40 px-3 py-2 text-[11px] font-bold text-gray-200"
                >
                  {expandedTournamentId === t.id ? 'Hide Top 10' : 'Show Top 10'}
                </button>

                {expandedTournamentId === t.id && (
                  <div className="mt-3 flex flex-col gap-1.5">
                    {t.top_ranks.length === 0 ? (
                      <p className="text-[11px] text-gray-500">No scores submitted yet.</p>
                    ) : (
                      t.top_ranks.map((r) => (
                        <div
                          key={`${t.id}-${r.rank}-${r.user_id}`}
                          className="flex items-center justify-between rounded-lg border border-gray-800 bg-black/40 px-3 py-2 text-xs"
                        >
                          <span className="font-bold text-yellow-300">#{r.rank}</span>
                          <span className="flex-1 px-2 text-white truncate">
                            {r.name}{' '}
                            <span className="text-gray-500">({r.uid})</span>
                          </span>
                          <span className="font-black text-cyan-300">{r.score} pts</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </article>
            ))}
          </section>
        )}

        {/* MANAGE WORKERS (owner) */}
        {activeTab === 'workers' && roles.includes('owner') && (
          <section className="flex flex-col gap-4">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <h2 className="mb-4 text-sm font-black text-cyan-300">ADD NEW WORKER</h2>
              <form onSubmit={createWorker} className="flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="Worker's email"
                  value={newWorkerEmail}
                  onChange={(e) => setNewWorkerEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-800 bg-black p-3 text-xs text-white outline-none"
                />
                <div className="flex flex-wrap gap-2">
                  {['deposit', 'withdraw', 'password_reset', 'owner'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleNewWorkerRole(role)}
                      className={`rounded-lg px-3 py-2 text-[11px] font-bold ${
                        newWorkerRoles.includes(role)
                          ? 'bg-yellow-500 text-black'
                          : 'border border-gray-700 bg-black text-gray-300'
                      }`}
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={creatingWorker || newWorkerRoles.length === 0}
                  className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 py-3 text-xs font-black text-white disabled:opacity-50"
                >
                  {creatingWorker ? 'Creating…' : 'Create Worker Account'}
                </button>
              </form>

              {lastCreatedWorker && (
                <div className="mt-4 rounded-xl border border-green-500/40 bg-green-950/40 p-4">
                  <p className="text-xs text-green-300">
                    Login for <b>{lastCreatedWorker.email}</b>:
                  </p>
                  <p className="mt-1 select-all break-all text-lg font-black text-white">
                    {lastCreatedWorker.password}
                  </p>
                  <p className="mt-2 text-[10px] text-gray-400">
                    Send this login (email + password) to them over WhatsApp — it will not be
                    shown again.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-black text-cyan-300">CURRENT WORKERS</h2>
                <button
                  onClick={() => void fetchWorkers()}
                  className="rounded-lg border border-gray-700 bg-black px-3 py-2 text-xs font-bold text-gray-200"
                >
                  {loadingWorkers ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>

              {workers.map((w) => (
                <div
                  key={w.id}
                  className="mb-2 flex items-center justify-between rounded-xl border border-gray-800 bg-black/40 p-3"
                >
                  <div>
                    <p className="text-xs font-bold text-white">{w.email}</p>
                    <p className="text-[10px] text-gray-400">
                      {w.roles.map((r) => ROLE_LABELS[r] || r).join(', ')}
                    </p>
                  </div>
                  <button
                    onClick={() => void removeWorker(w.id)}
                    className="rounded-lg border border-red-500/40 bg-red-600/15 px-3 py-1.5 text-[10px] font-bold text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl py-3 text-xs font-bold transition-all ${
        active
          ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
          : 'border border-gray-800 bg-gray-900 text-gray-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-black/30 p-3">
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className={`mt-1 text-sm font-black ${color}`}>{value ?? '—'}</p>
    </div>
  );
}