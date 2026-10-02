'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import InstallAppCard from '@/components/InstallAppCard';
import { initPWA } from '@/lib/pwa';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ixaugtdwfxhmqypglder.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_XRLDHfS-bDHlJJBzlGEmqQ_WetQ24cZ';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Tab =
  | 'game_records'
  | 'deposits'
  | 'withdraws'
  | 'players'
  | 'password'
  | 'create_player'
  | 'tournaments'
  | 'create_master'
  | 'master_deposit'
  | 'master_home'
  | 'master_game_records'
  | 'master_transfer'
  | 'master_players'
  | 'master_deposits'
  | 'master_withdraws'
  | 'master_password'
  | 'master_create_player';

type AccountType = 'admin' | 'master';

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

type GameRecordRow = {
  id: number | string;
  round_id?: string;
  player_uid: string;
  player_name?: string;
  master_code?: string;
  game_id: string;
  game_name: string;
  stake_amount: number;
  payout_amount: number;
  loss_amount: number;
  result: string;
  net_diamonds: number;
  house_profit?: number;
  details?: string;
  created_at: string;
};

const PERMISSIONS: { key: string; label: string }[] = [
  { key: 'game_records', label: 'Game Records' },
  { key: 'deposit', label: 'Deposit' },
  { key: 'withdraw', label: 'Withdraw' },
  { key: 'password_reset', label: 'Password Reset' },
  { key: 'player_search', label: 'Player Search' },
  { key: 'create_player', label: 'Create Player' },
  { key: 'tournaments', label: 'Tournaments' },
  { key: 'owner', label: 'Owner (Full Access)' },
];

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  PERMISSIONS.map((p) => [p.key, p.label])
);

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function randomPassword(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function AdminPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [adminEmail, setAdminEmail] = useState('');

  const [loginMode, setLoginMode] = useState<'admin' | 'master'>('admin');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<Tab | null>(null);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 5000);
  };

  // Deposits
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loadingDeposits, setLoadingDeposits] = useState(false);
  const [busyDepositId, setBusyDepositId] = useState<string | number | null>(null);

  const [manualUid, setManualUid] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [creditingManual, setCreditingManual] = useState(false);

  // Withdraws
  const [withdraws, setWithdraws] = useState<WithdrawRequest[]>([]);
  const [loadingWithdraws, setLoadingWithdraws] = useState(false);
  const [busyWithdrawId, setBusyWithdrawId] = useState<string | number | null>(null);
  const [rejectReasonDraft, setRejectReasonDraft] = useState<Record<string, string>>({});

  // Players
  const [playerSearchUid, setPlayerSearchUid] = useState('');
  const [playerResult, setPlayerResult] = useState<any>(null);
  const [searchingPlayer, setSearchingPlayer] = useState(false);
  const [playerGameStats, setPlayerGameStats] = useState<any>(null);

  // Password Reset
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [lastResetResult, setLastResetResult] = useState<{ uid: string; password: string } | null>(null);

  // Create Player
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNickname, setNewPlayerNickname] = useState('');
  const [newPlayerEmail, setNewPlayerEmail] = useState('');
  const [newPlayerPassword, setNewPlayerPassword] = useState('');
  const [newPlayerPhone, setNewPlayerPhone] = useState('');
  const [creatingPlayer, setCreatingPlayer] = useState(false);
  const [lastCreatedPlayer, setLastCreatedPlayer] = useState<{
    email: string;
    player_uid: string;
    password: string;
  } | null>(null);

  // Tournaments
  const [tournamentRows, setTournamentRows] = useState<TournamentAdminRow[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const [expandedTournamentId, setExpandedTournamentId] = useState<string | null>(null);

  // Master Management
  const [newMasterName, setNewMasterName] = useState('');
  const [newMasterEmail, setNewMasterEmail] = useState('');
  const [newMasterPhone, setNewMasterPhone] = useState('');
  const [newMasterPassword, setNewMasterPassword] = useState('');
  const [creatingMaster, setCreatingMaster] = useState(false);
  const [lastCreatedMaster, setLastCreatedMaster] = useState<{
    email: string;
    master_code: string;
    password: string;
  } | null>(null);
  const [masterCreditCode, setMasterCreditCode] = useState('');
  const [masterCreditAmount, setMasterCreditAmount] = useState('');
  const [masterCreditNote, setMasterCreditNote] = useState('');
  const [creditingMaster, setCreditingMaster] = useState(false);
  const [mastersList, setMastersList] = useState<any[]>([]);
  const [loadingMasters, setLoadingMasters] = useState(false);

  // Master Panel State
  const [masterProfile, setMasterProfile] = useState<{
    master_code: string;
    email: string;
    full_name: string;
    phone?: string;
    red_diamonds: number;
    player_count: number;
  } | null>(null);
  const [masterTransferUid, setMasterTransferUid] = useState('');
  const [masterTransferAmount, setMasterTransferAmount] = useState('');
  const [masterTransferNote, setMasterTransferNote] = useState('');
  const [masterTransferring, setMasterTransferring] = useState(false);
  const [masterPlayers, setMasterPlayers] = useState<any[]>([]);
  const [loadingMasterPlayers, setLoadingMasterPlayers] = useState(false);
  const [masterDeposits, setMasterDeposits] = useState<DepositRequest[]>([]);
  const [loadingMasterDeposits, setLoadingMasterDeposits] = useState(false);
  const [busyMasterDepositId, setBusyMasterDepositId] = useState<string | number | null>(null);
  const [masterWithdraws, setMasterWithdraws] = useState<WithdrawRequest[]>([]);
  const [loadingMasterWithdraws, setLoadingMasterWithdraws] = useState(false);
  const [busyMasterWithdrawId, setBusyMasterWithdrawId] = useState<string | number | null>(null);
  const [masterRejectReason, setMasterRejectReason] = useState<Record<string, string>>({});

  // 🌟 GAME RECORDS STATE (सभी गेम्स का रिकॉर्ड)
  const [gameRecords, setGameRecords] = useState<GameRecordRow[]>([]);
  const [loadingGameRecords, setLoadingGameRecords] = useState(false);
  const [gameFilter, setGameFilter] = useState('all');
  const [searchGameUid, setSearchGameUid] = useState('');

  // Today Stats
  const [todayStats, setTodayStats] = useState<{
    date?: string;
    deposit_count?: number;
    deposit_amount_npr?: number;
    deposit_diamonds?: number;
    withdraw_count?: number;
    withdraw_amount_npr?: number;
    deposit_pending_count?: number;
    withdraw_processing_count?: number;
  } | null>(null);
  const [loadingTodayStats, setLoadingTodayStats] = useState(false);

  const canSee = (role: string) => roles.includes(role) || roles.includes('owner');

  useEffect(() => {
    initPWA();
    let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    link.href = '/admin.webmanifest';
  }, []);

  const loadRolesForCurrentSession = useCallback(async () => {
    const { data: roleData, error: roleError } = await supabase.rpc('get_my_admin_roles');
    const roleList: string[] = !roleError && Array.isArray(roleData) ? roleData : [];

    if (roleList.length > 0) {
      setRoles(roleList);
      setAccountType('admin');
      setIsLoggedIn(true);
      setMasterProfile(null);

      const isOwner = roleList.includes('owner');
      const has = (r: string) => isOwner || roleList.includes(r);

      const first: Tab | null =
        (isOwner && 'game_records') ||
        (has('deposit') && 'deposits') ||
        (has('withdraw') && 'withdraws') ||
        (has('password_reset') && 'password') ||
        (has('player_search') && 'players') ||
        (has('create_player') && 'create_player') ||
        (has('tournaments') && 'tournaments') ||
        (isOwner && 'create_master') ||
        null;

      setActiveTab(first);
      return true;
    }

    const { data: masterData, error: masterError } = await supabase.rpc('master_get_my_profile');

    if (!masterError && masterData) {
      setRoles([]);
      setAccountType('master');
      setIsLoggedIn(true);
      setMasterProfile(masterData as any);
      setActiveTab('master_home');
      return true;
    }

    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setRoles([]);
    setAccountType(null);
    setMasterProfile(null);
    setActiveTab(null);
    return false;
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          setAdminEmail(session.user.email || '');
          await loadRolesForCurrentSession();
        }
      } catch {
        // show login
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
      const ok = await loadRolesForCurrentSession();
      if (!ok) {
        setLoginError(
          loginMode === 'master'
            ? 'This account is not a Master ID.'
            : 'This account has no admin access.'
        );
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Network error.');
    } finally {
      setLoginBusy(false);
      setLoginPassword('');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setRoles([]);
    setAccountType(null);
    setMasterProfile(null);
    setActiveTab(null);
  };

  const authedFetch = async (path: string, body?: unknown, method: 'POST' | 'GET' = 'POST') => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Session expired. Please log in again.');
    const res = await fetch(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `Request failed (${res.status}).`);
    return json;
  };

  // 🌟 FETCH GAME RECORDS (ओनर और मास्टर दोनों के लिए)
  const fetchGameRecords = useCallback(async () => {
    setLoadingGameRecords(true);
    try {
      if (accountType === 'admin') {
        const { data, error } = await supabase.rpc('owner_get_all_game_records');
        if (!error && Array.isArray(data)) {
          setGameRecords(data);
        } else {
          // फ़ालबैक सीधे टेबल से अगर RPC न चले
          const { data: tblData } = await supabase
            .from('game_records')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(150);
          setGameRecords((tblData || []) as any);
        }
      } else {
        const { data, error } = await supabase.rpc('master_get_my_game_records');
        if (!error && Array.isArray(data)) {
          setGameRecords(data);
        }
      }
    } catch (err: any) {
      console.warn('Game records fetch note:', err?.message);
    } finally {
      setLoadingGameRecords(false);
    }
  }, [accountType]);

  const fetchTodayStats = useCallback(async () => {
    setLoadingTodayStats(true);
    try {
      const { data, error } = await supabase.rpc('owner_today_stats');
      if (error) throw error;
      setTodayStats(data as any);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingTodayStats(false);
    }
  }, []);

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
      notify('Deposit approved.');
      await fetchDeposits();
      if (roles.includes('owner')) void fetchTodayStats();
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
    if (!manualUid.trim() || !Number.isFinite(amount) || amount <= 0) {
      notify('Enter valid UID and amount.', 'error');
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
      notify(`${amount} Red Diamonds credited.`);
      setManualUid('');
      setManualAmount('');
      setManualNote('');
    } catch (err: any) {
      notify(err?.message || 'Credit failed.', 'error');
    } finally {
      setCreditingManual(false);
    }
  };

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
      if (roles.includes('owner')) void fetchTodayStats();
    } catch (err: any) {
      notify(err?.message || 'Approve failed.', 'error');
    } finally {
      setBusyWithdrawId(null);
    }
  };

  const rejectWithdraw = async (id: string | number) => {
    setBusyWithdrawId(id);
    try {
      const { error } = await supabase.rpc('admin_reject_withdraw', {
        p_request_id: id,
        p_reason: rejectReasonDraft[String(id)] || null,
      });
      if (error) throw error;
      notify('Withdrawal rejected.');
      await fetchWithdraws();
    } catch (err: any) {
      notify(err?.message || 'Reject failed.', 'error');
    } finally {
      setBusyWithdrawId(null);
    }
  };

  const searchPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchingPlayer(true);
    setPlayerResult(null);
    setPlayerGameStats(null);
    try {
      const { data, error } = await supabase.rpc('admin_search_player', {
        p_uid: playerSearchUid.trim(),
      });
      if (error) throw error;
      setPlayerResult(data);

      const uid =
        data?.profile?.uid || data?.profile?.user_uid || playerSearchUid.trim();
      if (uid) {
        const { data: games, error: gamesErr } = await supabase.rpc('admin_player_game_stats', {
          p_uid: uid,
        });
        if (!gamesErr) setPlayerGameStats(games);
      }
    } catch (err: any) {
      notify(err?.message || 'Player not found.', 'error');
    } finally {
      setSearchingPlayer(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResettingPassword(true);
    setLastResetResult(null);
    try {
      const result = await authedFetch('/api/admin/reset-password', {
        identifier: resetIdentifier.trim(),
        new_password: resetNewPassword.trim() || undefined,
      });
      setLastResetResult({ uid: result.player_uid, password: result.temp_password });
      setResetIdentifier('');
      setResetNewPassword('');
      notify('Password reset done.');
    } catch (err: any) {
      notify(err?.message || 'Password reset failed.', 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  const createPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim() || !newPlayerNickname.trim() || !newPlayerEmail.trim()) {
      notify('Name, nickname, email required.', 'error');
      return;
    }
    setCreatingPlayer(true);
    setLastCreatedPlayer(null);
    try {
      const path =
        accountType === 'master' ? '/api/admin/master-create-player' : '/api/admin/create-player';
      const result = await authedFetch(path, {
        full_name: newPlayerName.trim(),
        nickname: newPlayerNickname.trim(),
        email: newPlayerEmail.trim(),
        password: newPlayerPassword.trim(),
        phone: newPlayerPhone.trim(),
      });
      setLastCreatedPlayer({
        email: result.email,
        player_uid: result.player_uid,
        password: result.temp_password,
      });
      setNewPlayerName('');
      setNewPlayerNickname('');
      setNewPlayerEmail('');
      setNewPlayerPassword('');
      setNewPlayerPhone('');
      notify('Player created.');
      if (accountType === 'master') {
        const { data } = await supabase.rpc('master_get_my_profile');
        if (data) setMasterProfile(data as any);
      }
    } catch (err: any) {
      notify(err?.message || 'Could not create player.', 'error');
    } finally {
      setCreatingPlayer(false);
    }
  };

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

  const fetchMasters = useCallback(async () => {
    setLoadingMasters(true);
    try {
      const { data, error } = await supabase.rpc('owner_list_masters');
      if (error) throw error;
      setMastersList(Array.isArray(data) ? data : data ? [data] : []);
    } catch (err: any) {
      notify(err?.message || 'Could not load masters.', 'error');
    } finally {
      setLoadingMasters(false);
    }
  }, []);

  // 🌟 MASTER CREATION (सुरक्षित Next.js API रूट से कनेक्टेड)
  const createMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingMaster(true);
    setLastCreatedMaster(null);
    try {
      const result = await authedFetch('/api/admin/create-master', {
        full_name: newMasterName.trim(),
        email: newMasterEmail.trim(),
        phone: newMasterPhone.trim(),
        password: newMasterPassword.trim() || undefined,
      });
      setLastCreatedMaster({
        email: result.email,
        master_code: result.master_code,
        password: result.temp_password,
      });
      setNewMasterName('');
      setNewMasterEmail('');
      setNewMasterPhone('');
      setNewMasterPassword('');
      notify('Master ID created successfully!');
      await fetchMasters();
    } catch (err: any) {
      notify(err?.message || 'Could not create master.', 'error');
    } finally {
      setCreatingMaster(false);
    }
  };

  const creditMasterDiamonds = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(masterCreditAmount);
    if (!masterCreditCode.trim() || !Number.isFinite(amount) || amount <= 0) {
      notify('Enter master code/email and amount.', 'error');
      return;
    }
    setCreditingMaster(true);
    try {
      const { data, error } = await supabase.rpc('owner_credit_master_diamonds', {
        p_master_code: masterCreditCode.trim(),
        p_amount: amount,
        p_note: masterCreditNote.trim() || null,
      });
      if (error) throw error;
      notify(`Credited ${amount} 🔴 to ${(data as any)?.master_code || masterCreditCode}.`);
      setMasterCreditCode('');
      setMasterCreditAmount('');
      setMasterCreditNote('');
      await fetchMasters();
    } catch (err: any) {
      notify(err?.message || 'Credit failed.', 'error');
    } finally {
      setCreditingMaster(false);
    }
  };

  const refreshMasterProfile = useCallback(async () => {
    const { data, error } = await supabase.rpc('master_get_my_profile');
    if (!error && data) setMasterProfile(data as any);
  }, []);

  const fetchMasterPlayers = useCallback(async () => {
    setLoadingMasterPlayers(true);
    try {
      const { data, error } = await supabase.rpc('master_list_my_players');
      if (error) throw error;
      setMasterPlayers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      notify(err?.message || 'Could not load players.', 'error');
    } finally {
      setLoadingMasterPlayers(false);
    }
  }, []);

  const fetchMasterDeposits = useCallback(async () => {
    setLoadingMasterDeposits(true);
    try {
      const { data, error } = await supabase.rpc('master_list_deposits');
      if (error) throw error;
      setMasterDeposits(Array.isArray(data) ? data : []);
    } catch (err: any) {
      notify(err?.message || 'Could not load deposits.', 'error');
    } finally {
      setLoadingMasterDeposits(false);
    }
  }, []);

  const fetchMasterWithdraws = useCallback(async () => {
    setLoadingMasterWithdraws(true);
    try {
      const { data, error } = await supabase.rpc('master_list_withdraws');
      if (error) throw error;
      setMasterWithdraws(Array.isArray(data) ? data : []);
    } catch (err: any) {
      notify(err?.message || 'Could not load withdrawals.', 'error');
    } finally {
      setLoadingMasterWithdraws(false);
    }
  }, []);

  const masterTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(masterTransferAmount);
    if (!masterTransferUid.trim() || !Number.isFinite(amount) || amount <= 0) {
      notify('Enter player UID and amount.', 'error');
      return;
    }
    setMasterTransferring(true);
    try {
      const { error } = await supabase.rpc('master_transfer_red_diamonds', {
        p_player_uid: masterTransferUid.trim(),
        p_amount: amount,
        p_note: masterTransferNote.trim() || null,
      });
      if (error) throw error;
      notify(`Transferred ${amount} 🔴`);
      setMasterTransferUid('');
      setMasterTransferAmount('');
      setMasterTransferNote('');
      await refreshMasterProfile();
    } catch (err: any) {
      notify(err?.message || 'Transfer failed.', 'error');
    } finally {
      setMasterTransferring(false);
    }
  };

  const masterApproveDeposit = async (id: string | number) => {
    setBusyMasterDepositId(id);
    try {
      const { error } = await supabase.rpc('master_approve_deposit', { p_request_id: id });
      if (error) throw error;
      notify('Deposit approved.');
      await fetchMasterDeposits();
    } catch (err: any) {
      notify(err?.message || 'Approve failed.', 'error');
    } finally {
      setBusyMasterDepositId(null);
    }
  };

  const masterRejectDeposit = async (id: string | number) => {
    setBusyMasterDepositId(id);
    try {
      const { error } = await supabase.rpc('master_reject_deposit', {
        p_request_id: id,
        p_reason: null,
      });
      if (error) throw error;
      notify('Deposit rejected.');
      await fetchMasterDeposits();
    } catch (err: any) {
      notify(err?.message || 'Reject failed.', 'error');
    } finally {
      setBusyMasterDepositId(null);
    }
  };

  const masterApproveWithdraw = async (id: string | number) => {
    setBusyMasterWithdrawId(id);
    try {
      const { error } = await supabase.rpc('master_approve_withdraw', { p_request_id: id });
      if (error) throw error;
      notify('Withdraw paid.');
      await fetchMasterWithdraws();
    } catch (err: any) {
      notify(err?.message || 'Approve failed.', 'error');
    } finally {
      setBusyMasterWithdrawId(null);
    }
  };

  const masterRejectWithdraw = async (id: string | number) => {
    setBusyMasterWithdrawId(id);
    try {
      const { error } = await supabase.rpc('master_reject_withdraw', {
        p_request_id: id,
        p_reason: masterRejectReason[String(id)] || null,
      });
      if (error) throw error;
      notify('Withdraw rejected.');
      await fetchMasterWithdraws();
    } catch (err: any) {
      notify(err?.message || 'Reject failed.', 'error');
    } finally {
      setBusyMasterWithdrawId(null);
    }
  };

  // Filtered game records
  const filteredRecords = gameRecords.filter((r) => {
    const matchesGame = gameFilter === 'all' || r.game_id === gameFilter;
    const matchesUid =
      !searchGameUid.trim() ||
      r.player_uid.toLowerCase().includes(searchGameUid.toLowerCase()) ||
      (r.player_name || '').toLowerCase().includes(searchGameUid.toLowerCase()) ||
      (r.master_code || '').toLowerCase().includes(searchGameUid.toLowerCase());
    return matchesGame && matchesUid;
  });

  const totalGameStake = filteredRecords.reduce((acc, r) => acc + Number(r.stake_amount || 0), 0);
  const totalGameWon = filteredRecords.reduce((acc, r) => acc + Number(r.payout_amount || 0), 0);
  const totalGameLost = filteredRecords.reduce((acc, r) => acc + Number(r.loss_amount || 0), 0);
  const totalHouseProfit = totalGameStake - totalGameWon;

  useEffect(() => {
    if (!isLoggedIn || !activeTab) return;
    if (accountType === 'admin') {
      if (roles.includes('owner')) void fetchTodayStats();
      if (activeTab === 'game_records') void fetchGameRecords();
      if (activeTab === 'deposits') void fetchDeposits();
      if (activeTab === 'withdraws') void fetchWithdraws();
      if (activeTab === 'tournaments') void fetchTournamentsAdmin();
      if (activeTab === 'create_master' || activeTab === 'master_deposit') void fetchMasters();
    }
    if (accountType === 'master') {
      if (activeTab === 'master_home') void refreshMasterProfile();
      if (activeTab === 'master_game_records') void fetchGameRecords();
      if (activeTab === 'master_players') void fetchMasterPlayers();
      if (activeTab === 'master_deposits') void fetchMasterDeposits();
      if (activeTab === 'master_withdraws') void fetchMasterWithdraws();
    }
  }, [
    isLoggedIn,
    activeTab,
    accountType,
    roles,
    fetchTodayStats,
    fetchGameRecords,
    fetchDeposits,
    fetchWithdraws,
    fetchTournamentsAdmin,
    fetchMasters,
    refreshMasterProfile,
    fetchMasterPlayers,
    fetchMasterDeposits,
    fetchMasterWithdraws,
  ]);

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07090e]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
      </div>
    );
  }

  // 3D LOGIN SCREEN
  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#07090e] p-4 text-white">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-gradient-to-b from-[#161f30] to-[#0b0f19] p-7 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)]">
          <div className="mb-2 flex justify-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-yellow-400 p-[2px] shadow-lg">
              <div className="w-full h-full bg-[#0b0f19] rounded-[14px] flex items-center justify-center text-xl">
                🛡️
              </div>
            </div>
          </div>
          <h1 className="mb-1 bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400 bg-clip-text text-center text-xl font-black text-transparent">
            {loginMode === 'master' ? '🎫 MASTER ID LOGIN' : '🛡️ ARENA NEPAL 3D'}
          </h1>
          <p className="mb-5 text-center text-xs text-gray-400">
            {loginMode === 'master' ? 'Master Distributor access only.' : 'Owner & Staff access only.'}
          </p>

          {/* 3D Mode Toggle */}
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-black/60 p-1.5 shadow-inner border border-white/5">
            <button
              type="button"
              onClick={() => {
                setLoginMode('admin');
                setLoginError('');
              }}
              className={`rounded-xl py-2.5 text-xs font-black transition-all ${
                loginMode === 'admin'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_3px_0_#831843]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Admin Login
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('master');
                setLoginError('');
              }}
              className={`rounded-xl py-2.5 text-xs font-black transition-all ${
                loginMode === 'master'
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-[0_3px_0_#b45309]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Master Login
            </button>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
            <input
              type="email"
              placeholder="Email address"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
              className="w-full rounded-2xl border border-gray-800 bg-black/70 p-3.5 text-xs text-white outline-none focus:border-cyan-500 shadow-inner"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
              className="w-full rounded-2xl border border-gray-800 bg-black/70 p-3.5 text-xs text-white outline-none focus:border-cyan-500 shadow-inner"
            />
            {loginError && (
              <p className="rounded-xl border border-red-500/40 bg-red-950/60 p-2.5 text-xs text-red-300">
                {loginError}
              </p>
            )}
            <button
              type="submit"
              disabled={loginBusy}
              className="mt-2 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 py-3.5 text-xs font-black text-white shadow-[0_4px_0_#701a75,0_10px_20px_rgba(236,72,153,0.3)] active:translate-y-1 active:shadow-none disabled:opacity-50 transition-all"
            >
              {loginBusy ? 'Authenticating...' : 'Sign In ➔'}
            </button>
          </form>
          <div className="mt-5 flex justify-center">
            <InstallAppCard variant="button" />
          </div>
        </div>
      </div>
    );
  }

  const inputCls =
    'w-full rounded-xl border border-gray-800 bg-black/80 p-3 text-xs text-white outline-none focus:border-cyan-500 shadow-inner';

  // ----------------------------------------------------
  // MASTER PANEL (3D UI)
  // ----------------------------------------------------
  if (accountType === 'master') {
    return (
      <div className="min-h-screen bg-[#07090e] p-4 text-white">
        {toast && (
          <div
            className={`fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-2xl border px-4 py-3 text-sm font-bold shadow-2xl backdrop-blur-md ${
              toast.type === 'success'
                ? 'border-green-500/50 bg-green-950/90 text-green-300'
                : 'border-red-500/50 bg-red-950/90 text-red-300'
            }`}
          >
            {toast.text}
          </div>
        )}
        <div className="mx-auto flex w-full max-w-5xl flex-col">
          {/* Top Master 3D Header */}
          <div className="mb-6 flex flex-col justify-between gap-3 rounded-3xl border border-yellow-500/30 bg-gradient-to-b from-[#1a2333] to-[#0c121d] p-5 shadow-[0_15px_30px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] sm:flex-row sm:items-center">
            <div>
              <h1 className="bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 bg-clip-text text-xl font-black text-transparent">
                🎫 MASTER DISTRIBUTOR PANEL
              </h1>
              <p className="mt-1 text-xs text-gray-400">
                {masterProfile?.full_name || adminEmail} · <span className="font-mono text-yellow-300 font-bold">{masterProfile?.master_code || '—'}</span>
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-2 text-xs font-black text-red-300 shadow-[0_3px_0_#7f1d1d] active:translate-y-1 active:shadow-none transition-all"
            >
              Logout
            </button>
          </div>

          {/* 3D Master Navigation Tabs */}
          <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {(
              [
                ['master_home', 'Home'],
                ['master_game_records', '🎮 Game Records'],
                ['master_transfer', 'Transfer 🔴'],
                ['master_create_player', 'Create Player'],
                ['master_players', 'My Players'],
                ['master_deposits', 'Deposits'],
                ['master_withdraws', 'Withdraws'],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <TabButton key={id} active={activeTab === id} onClick={() => setActiveTab(id)}>
                {label}
              </TabButton>
            ))}
          </div>

          {activeTab === 'master_home' && (
            <section className="rounded-3xl border border-yellow-500/30 bg-gradient-to-b from-[#182030] to-[#0b0f19] p-6 shadow-2xl">
              <h2 className="mb-2 text-xs font-black text-yellow-300 tracking-wider">RED DIAMOND BALANCE</h2>
              <p className="text-4xl font-black text-red-400">🔴 {masterProfile?.red_diamonds?.toLocaleString() ?? 0}</p>
              <p className="mt-3 text-xs text-gray-400">
                Total Players: <b className="text-white font-bold">{masterProfile?.player_count ?? 0}</b>
              </p>
              <button
                onClick={() => void refreshMasterProfile()}
                className="mt-4 rounded-xl border border-gray-700 bg-black/60 px-4 py-2 text-xs font-bold text-gray-200 shadow-md active:translate-y-1"
              >
                Refresh Balance
              </button>
            </section>
          )}

          {/* 🌟 MASTER GAME RECORDS TAB */}
          {activeTab === 'master_game_records' && (
            <section className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-black text-cyan-300">MY PLAYERS GAME RECORDS</h2>
                <button
                  onClick={() => void fetchGameRecords()}
                  className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs font-bold"
                >
                  {loadingGameRecords ? 'Loading…' : 'Refresh'}
                </button>
              </div>

              {/* 3D KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-gray-800 bg-black/40 p-3 shadow-lg">
                  <p className="text-[10px] text-gray-400 font-bold">Total Stake (खेला)</p>
                  <p className="text-base font-black text-white mt-1">{totalGameStake.toLocaleString()} 🔴</p>
                </div>
                <div className="rounded-2xl border border-emerald-500/30 bg-black/40 p-3 shadow-lg">
                  <p className="text-[10px] text-emerald-400 font-bold">Total Won (जीता)</p>
                  <p className="text-base font-black text-emerald-400 mt-1">{totalGameWon.toLocaleString()} 🔴</p>
                </div>
                <div className="rounded-2xl border border-red-500/30 bg-black/40 p-3 shadow-lg">
                  <p className="text-[10px] text-red-400 font-bold">Total Lost (हारा)</p>
                  <p className="text-base font-black text-red-400 mt-1">{totalGameLost.toLocaleString()} 🔴</p>
                </div>
                <div className="rounded-2xl border border-yellow-500/30 bg-black/40 p-3 shadow-lg">
                  <p className="text-[10px] text-yellow-300 font-bold">House Margin</p>
                  <p className="text-base font-black text-yellow-300 mt-1">{totalHouseProfit.toLocaleString()} 🔴</p>
                </div>
              </div>

              {/* Game Records List */}
              <div className="flex flex-col gap-2.5">
                {filteredRecords.length === 0 ? (
                  <p className="text-center text-xs text-gray-500 py-8">कोई गेम रिकॉर्ड नहीं मिला।</p>
                ) : (
                  filteredRecords.map((r) => (
                    <article
                      key={r.id}
                      className="rounded-2xl border border-gray-800 bg-[#0e1422] p-4 text-xs shadow-md flex justify-between items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{r.game_name}</span>
                          <span className="font-mono text-cyan-400 text-[11px]">{r.player_uid}</span>
                        </div>
                        <p className="mt-1 text-gray-400">
                          Stake: <b className="text-white">{r.stake_amount} 🔴</b> · Won:{' '}
                          <b className="text-emerald-400">{r.payout_amount} 🔴</b>
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{formatDate(r.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            r.result === 'won'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-red-500/20 text-red-300 border border-red-500/40'
                          }`}
                        >
                          {r.result === 'won' ? 'WON' : 'LOST'}
                        </span>
                        <div className="mt-1 font-bold text-xs text-yellow-300">
                          Net: {r.net_diamonds > 0 ? '+' : ''}
                          {r.net_diamonds} 🔴
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          )}

          {activeTab === 'master_transfer' && (
            <section className="rounded-3xl border border-gray-800 bg-[#0e1422] p-6 shadow-2xl">
              <h2 className="mb-3 text-sm font-black text-cyan-300">TRANSFER RED DIAMONDS TO PLAYER</h2>
              <p className="mb-4 text-xs text-red-300">Available: 🔴 {masterProfile?.red_diamonds?.toLocaleString() ?? 0}</p>
              <form onSubmit={masterTransfer} className="flex flex-col gap-3.5">
                <input className={inputCls} placeholder="Player UID" value={masterTransferUid} onChange={(e) => setMasterTransferUid(e.target.value)} required />
                <input className={inputCls} type="number" min="1" placeholder="Amount (🔴)" value={masterTransferAmount} onChange={(e) => setMasterTransferAmount(e.target.value)} required />
                <input className={inputCls} placeholder="Note (optional)" value={masterTransferNote} onChange={(e) => setMasterTransferNote(e.target.value)} />
                <button type="submit" disabled={masterTransferring} className="rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 py-3.5 text-xs font-black text-black shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none disabled:opacity-50">
                  {masterTransferring ? 'Sending…' : 'Transfer Diamonds'}
                </button>
              </form>
            </section>
          )}

          {activeTab === 'master_create_player' && (
            <section className="rounded-3xl border border-gray-800 bg-[#0e1422] p-6 shadow-2xl">
              <h2 className="mb-4 text-sm font-black text-cyan-300">CREATE PLAYER</h2>
              <form onSubmit={createPlayer} className="flex flex-col gap-3">
                <input className={inputCls} placeholder="Full name" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} />
                <input className={inputCls} placeholder="Nickname" value={newPlayerNickname} onChange={(e) => setNewPlayerNickname(e.target.value)} />
                <input className={inputCls} type="email" placeholder="Email" value={newPlayerEmail} onChange={(e) => setNewPlayerEmail(e.target.value)} />
                <div className="flex gap-2">
                  <input className={`min-w-0 flex-1 ${inputCls}`} placeholder="Password (optional)" value={newPlayerPassword} onChange={(e) => setNewPlayerPassword(e.target.value)} />
                  <button type="button" onClick={() => setNewPlayerPassword(randomPassword())} className="rounded-xl border border-gray-700 bg-black px-3 text-[11px] font-bold text-gray-200">Generate</button>
                </div>
                <input className={inputCls} placeholder="Phone" value={newPlayerPhone} onChange={(e) => setNewPlayerPhone(e.target.value)} />
                <button type="submit" disabled={creatingPlayer} className="rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 py-3.5 text-xs font-black text-white shadow-[0_4px_0_#701a75] active:translate-y-1 active:shadow-none disabled:opacity-50">
                  {creatingPlayer ? 'Creating…' : 'Create Player'}
                </button>
              </form>
              {lastCreatedPlayer && (
                <div className="mt-4 rounded-2xl border border-green-500/40 bg-green-950/40 p-4 text-xs font-mono">
                  <p className="font-bold text-green-300">Player Created Credentials:</p>
                  <p className="mt-1">Email: <b className="select-all text-white">{lastCreatedPlayer.email}</b></p>
                  <p>UID: <b className="select-all text-yellow-300">{lastCreatedPlayer.player_uid}</b></p>
                  <p className="mt-1 text-base font-black text-white">{lastCreatedPlayer.password}</p>
                </div>
              )}
            </section>
          )}

          {activeTab === 'master_players' && (
            <section className="flex flex-col gap-3">
              <div className="flex justify-between">
                <h2 className="text-sm font-black text-cyan-300">MY PLAYERS</h2>
                <button onClick={() => void fetchMasterPlayers()} className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs font-bold">{loadingMasterPlayers ? '…' : 'Refresh'}</button>
              </div>
              {masterPlayers.map((p) => (
                <article key={p.id} className="rounded-2xl border border-gray-800 bg-[#0e1422] p-4 text-xs shadow-md">
                  <p className="font-black text-cyan-300 text-sm">{p.nickname || p.full_name} · <span className="font-mono text-yellow-300">{p.uid}</span></p>
                  <p className="mt-2 text-gray-300">🔴 {p.red_diamonds} · ⚪ {p.white_diamonds} · 💵 {p.winning_cash}</p>
                  <p className="text-gray-500 text-[11px] mt-1">Dep: {p.deposit_count} · WD: {p.withdraw_count}</p>
                </article>
              ))}
            </section>
          )}

          {activeTab === 'master_deposits' && (
            <section className="flex flex-col gap-3">
              <div className="flex justify-between">
                <h2 className="text-sm font-black text-cyan-300">DEPOSITS</h2>
                <button onClick={() => void fetchMasterDeposits()} className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs font-bold">{loadingMasterDeposits ? '…' : 'Refresh'}</button>
              </div>
              {masterDeposits.map((req) => (
                <article key={req.id} className="rounded-2xl border border-gray-800 bg-[#0e1422] p-4 text-xs shadow-md">
                  <p className="font-black text-cyan-300">{req.user_uid} · {req.status}</p>
                  <p className="mt-1">🔴 {req.package_diamonds} · NPR {req.amount}</p>
                  {(!req.status || req.status === 'Pending') && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button onClick={() => void masterApproveDeposit(req.id)} className="rounded-xl bg-green-600 py-2.5 font-black text-white shadow-[0_3px_0_#14532d] active:translate-y-1">Approve</button>
                      <button onClick={() => void masterRejectDeposit(req.id)} className="rounded-xl border border-red-500/40 bg-red-950/40 py-2.5 font-black text-red-300 shadow-[0_3px_0_#7f1d1d] active:translate-y-1">Reject</button>
                    </div>
                  )}
                </article>
              ))}
            </section>
          )}

          {activeTab === 'master_withdraws' && (
            <section className="flex flex-col gap-3">
              <div className="flex justify-between">
                <h2 className="text-sm font-black text-cyan-300">WITHDRAWS</h2>
                <button onClick={() => void fetchMasterWithdraws()} className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs font-bold">{loadingMasterWithdraws ? '…' : 'Refresh'}</button>
              </div>
              {masterWithdraws.map((req) => (
                <article key={req.id} className="rounded-2xl border border-gray-800 bg-[#0e1422] p-4 text-xs shadow-md">
                  <p className="font-black text-cyan-300">{req.user_uid} · {req.status}</p>
                  <p className="mt-1">NPR {req.amount} · {req.method}</p>
                  {req.status === 'Processing' && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button onClick={() => void masterApproveWithdraw(req.id)} className="rounded-xl bg-green-600 py-2.5 font-black text-white shadow-[0_3px_0_#14532d] active:translate-y-1">Paid</button>
                      <button onClick={() => void masterRejectWithdraw(req.id)} className="rounded-xl border border-red-500/40 bg-red-950/40 py-2.5 font-black text-red-300 shadow-[0_3px_0_#7f1d1d] active:translate-y-1">Reject</button>
                    </div>
                  )}
                </article>
              ))}
            </section>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // ADMIN PANEL (3D UI)
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-[#07090e] p-4 text-white">
      {toast && (
        <div
          className={`fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-2xl border px-4 py-3 text-sm font-bold shadow-2xl backdrop-blur-md ${
            toast.type === 'success'
              ? 'border-green-500/50 bg-green-950/90 text-green-300'
              : 'border-red-500/50 bg-red-950/90 text-red-300'
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="mx-auto flex w-full max-w-5xl flex-col">
        {/* Top 3D Admin Header */}
        <div className="mb-6 flex flex-col justify-between gap-3 rounded-3xl border border-purple-500/30 bg-gradient-to-b from-[#182033] to-[#0c121e] p-5 shadow-[0_15px_35px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.2)] sm:flex-row sm:items-center">
          <div>
            <h1 className="bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400 bg-clip-text text-xl font-black text-transparent">
              🛡️ ARENA NEPAL 3D ADMIN
            </h1>
            <p className="mt-1 text-xs text-gray-400">
              {adminEmail} · <span className="text-yellow-300">{roles.map((r) => ROLE_LABELS[r] || r).join(', ')}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <InstallAppCard variant="button" />
            <button
              onClick={handleLogout}
              className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-2 text-xs font-black text-red-300 shadow-[0_3px_0_#7f1d1d] active:translate-y-1 active:shadow-none transition-all"
            >
              Logout
            </button>
          </div>
        </div>

        {/* TODAY STATS — owner only */}
        {roles.includes('owner') && (
          <section className="mb-6 rounded-3xl border border-yellow-500/30 bg-gradient-to-b from-[#1c1810] to-[#0d0a06] p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black text-yellow-300 tracking-wider">
                TODAY COLLECTION ({todayStats?.date || '—'}) · NEPAL
              </h2>
              <button
                onClick={() => void fetchTodayStats()}
                className="rounded-xl border border-gray-700 bg-black/60 px-3 py-1.5 text-[11px] font-bold text-gray-200 active:translate-y-1"
              >
                {loadingTodayStats ? '…' : 'Refresh'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-green-500/20 bg-black/40 p-3.5 shadow-md">
                <p className="text-[10px] text-gray-400 font-bold">Deposits Approved</p>
                <p className="mt-1 text-lg font-black text-green-300">{todayStats?.deposit_count ?? '—'}</p>
                <p className="text-xs text-gray-300">NPR {todayStats?.deposit_amount_npr ?? 0}</p>
                <p className="text-xs text-red-400 font-bold">🔴 {todayStats?.deposit_diamonds ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-yellow-500/20 bg-black/40 p-3.5 shadow-md">
                <p className="text-[10px] text-gray-400 font-bold">Deposit Pending</p>
                <p className="mt-1 text-lg font-black text-yellow-300">{todayStats?.deposit_pending_count ?? '—'}</p>
              </div>
              <div className="rounded-2xl border border-pink-500/20 bg-black/40 p-3.5 shadow-md">
                <p className="text-[10px] text-gray-400 font-bold">Withdraws Paid</p>
                <p className="mt-1 text-lg font-black text-pink-300">{todayStats?.withdraw_count ?? '—'}</p>
                <p className="text-xs text-gray-300">NPR {todayStats?.withdraw_amount_npr ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-orange-500/20 bg-black/40 p-3.5 shadow-md">
                <p className="text-[10px] text-gray-400 font-bold">Withdraw Processing</p>
                <p className="mt-1 text-lg font-black text-orange-300">{todayStats?.withdraw_processing_count ?? '—'}</p>
              </div>
            </div>
          </section>
        )}

        {/* 3D Navigation Bar */}
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-9">
          {roles.includes('owner') && (
            <TabButton active={activeTab === 'game_records'} onClick={() => setActiveTab('game_records')}>
              🎮 Game Records
            </TabButton>
          )}
          {canSee('deposit') && <TabButton active={activeTab === 'deposits'} onClick={() => setActiveTab('deposits')}>Deposit</TabButton>}
          {canSee('withdraw') && <TabButton active={activeTab === 'withdraws'} onClick={() => setActiveTab('withdraws')}>Withdraw</TabButton>}
          {canSee('password_reset') && <TabButton active={activeTab === 'password'} onClick={() => setActiveTab('password')}>Password</TabButton>}
          {canSee('player_search') && <TabButton active={activeTab === 'players'} onClick={() => setActiveTab('players')}>Player Search</TabButton>}
          {canSee('create_player') && <TabButton active={activeTab === 'create_player'} onClick={() => setActiveTab('create_player')}>Create Player</TabButton>}
          {canSee('tournaments') && <TabButton active={activeTab === 'tournaments'} onClick={() => setActiveTab('tournaments')}>Tournaments</TabButton>}
          {roles.includes('owner') && <TabButton active={activeTab === 'create_master'} onClick={() => setActiveTab('create_master')}>Create Master</TabButton>}
          {roles.includes('owner') && <TabButton active={activeTab === 'master_deposit'} onClick={() => setActiveTab('master_deposit')}>Master Deposit</TabButton>}
        </div>

        {/* 🌟 1. GAME RECORDS TAB (सभी गेम्स का जीत / हार और टर्नओवर) */}
        {activeTab === 'game_records' && roles.includes('owner') && (
          <section className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h2 className="text-base font-black text-cyan-300">🎮 ALL GAMES WIN/LOSS RECORDS</h2>
                <p className="text-xs text-gray-400">खिलाड़ी कौन सा गेम खेला, कितना दांव लगाया, कितना जीता और कितना हारा।</p>
              </div>
              <button
                onClick={() => void fetchGameRecords()}
                className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2 text-xs font-bold active:translate-y-1 self-start sm:self-auto"
              >
                {loadingGameRecords ? 'Refreshing…' : 'Refresh Records'}
              </button>
            </div>

            {/* 4 Big 3D Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-gray-800 bg-[#0e1422] p-4 shadow-xl">
                <p className="text-[11px] text-gray-400 font-bold">Total Stake (खेला गया)</p>
                <p className="text-xl font-black text-white mt-1">{totalGameStake.toLocaleString()} 🔴</p>
              </div>
              <div className="rounded-2xl border border-emerald-500/30 bg-[#0e1422] p-4 shadow-xl">
                <p className="text-[11px] text-emerald-400 font-bold">Total Won (जीता)</p>
                <p className="text-xl font-black text-emerald-400 mt-1">{totalGameWon.toLocaleString()} 🔴</p>
              </div>
              <div className="rounded-2xl border border-red-500/30 bg-[#0e1422] p-4 shadow-xl">
                <p className="text-[11px] text-red-400 font-bold">Total Lost (हारा)</p>
                <p className="text-xl font-black text-red-400 mt-1">{totalGameLost.toLocaleString()} 🔴</p>
              </div>
              <div className="rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-[#1a160d] to-[#0c121e] p-4 shadow-xl">
                <p className="text-[11px] text-yellow-300 font-bold">House Net Profit</p>
                <p className={`text-xl font-black mt-1 ${totalHouseProfit >= 0 ? 'text-yellow-300' : 'text-rose-400'}`}>
                  {totalHouseProfit >= 0 ? '+' : ''}{totalHouseProfit.toLocaleString()} 🔴
                </p>
              </div>
            </div>

            {/* Filter and Search */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className={inputCls}
                placeholder="Search by Player UID or Master Code..."
                value={searchGameUid}
                onChange={(e) => setSearchGameUid(e.target.value)}
              />
              <select
                className={inputCls}
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value)}
              >
                <option value="all">All Games (सभी गेम्स)</option>
                <option value="aviator">Aviator Crash</option>
                <option value="neon_tower">Neon Tower</option>
                <option value="teen_patti">Teen Patti Live</option>
                <option value="color">Color Trading</option>
              </select>
            </div>

            {/* Records List */}
            <div className="flex flex-col gap-2.5">
              {filteredRecords.length === 0 ? (
                <div className="text-center text-xs text-gray-500 py-12 rounded-3xl border border-gray-800 bg-[#0e1422]">
                  अभी कोई गेम रिकॉर्ड नहीं है। खिलाड़ी के खेलते ही रिकॉर्ड यहाँ जुड़ जाएगा।
                </div>
              ) : (
                filteredRecords.map((r) => (
                  <article
                    key={r.id}
                    className="rounded-2xl border border-gray-800 bg-[#0e1422] p-4 text-xs shadow-lg flex flex-col sm:flex-row justify-between sm:items-center gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-sm">{r.game_name}</span>
                        <span className="font-mono text-cyan-300 font-bold">{r.player_uid}</span>
                        {r.master_code && (
                          <span className="font-mono text-yellow-300 text-[10px] bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                            {r.master_code}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-gray-300">
                        Stake: <b className="text-white">{r.stake_amount} 🔴</b> · Payout:{' '}
                        <b className="text-emerald-400">{r.payout_amount} 🔴</b> · Lost:{' '}
                        <b className="text-red-400">{r.loss_amount} 🔴</b>
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{formatDate(r.created_at)}</p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-[10px] font-black ${
                          r.result === 'won'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-red-500/20 text-red-300 border border-red-500/40'
                        }`}
                      >
                        {r.result === 'won' ? 'WON' : 'LOST'}
                      </span>
                      <div className="text-xs font-bold text-yellow-300 mt-1">
                        House: {r.house_profit != null ? `${r.house_profit > 0 ? '+' : ''}${r.house_profit} 🔴` : '—'}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        )}

        {/* 2. DEPOSITS TAB */}
        {activeTab === 'deposits' && canSee('deposit') && (
          <section className="flex flex-col gap-4">
            <div className="rounded-3xl border border-yellow-500/30 bg-[#0e1422] p-5 shadow-2xl">
              <h2 className="mb-3 text-sm font-black text-yellow-300">MANUAL DIAMOND CREDIT</h2>
              <form onSubmit={creditManualDiamonds} className="flex flex-col gap-3">
                <input className={inputCls} placeholder="Player UID" value={manualUid} onChange={(e) => setManualUid(e.target.value)} required />
                <input className={inputCls} type="number" min="1" placeholder="Red Diamonds" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} required />
                <input className={inputCls} placeholder="Note" value={manualNote} onChange={(e) => setManualNote(e.target.value)} />
                <button type="submit" disabled={creditingManual} className="rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 py-3.5 text-xs font-black text-black shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none disabled:opacity-50">
                  {creditingManual ? 'Crediting…' : 'Credit Diamonds'}
                </button>
              </form>
            </div>
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-black text-cyan-300">DEPOSIT REQUESTS</h2>
              <button onClick={() => void fetchDeposits()} className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs font-bold">{loadingDeposits ? '…' : 'Refresh'}</button>
            </div>
            {deposits.map((req) => (
              <article key={req.id} className="rounded-2xl border border-gray-800 bg-[#0e1422] p-4 text-xs shadow-md">
                <p className="font-black text-cyan-300">{req.user_name} · {req.user_uid} · {req.status}</p>
                <p className="mt-1">🔴 {req.package_diamonds} · NPR {req.amount} · {formatDate(req.created_at)}</p>
                {req.proof_url && <a href={req.proof_url} target="_blank" rel="noreferrer" className="text-cyan-300 underline font-bold mt-1 inline-block">View Proof</a>}
                {(!req.status || req.status === 'Pending') && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button onClick={() => void approveDeposit(req.id)} disabled={busyDepositId === req.id} className="rounded-xl bg-green-600 py-2.5 font-black text-white shadow-[0_3px_0_#14532d] active:translate-y-1">Approve</button>
                    <button onClick={() => void rejectDeposit(req.id)} disabled={busyDepositId === req.id} className="rounded-xl border border-red-500/40 bg-red-950/40 py-2.5 font-black text-red-300 shadow-[0_3px_0_#7f1d1d] active:translate-y-1">Reject</button>
                  </div>
                )}
              </article>
            ))}
          </section>
        )}

        {/* 3. WITHDRAWS TAB */}
        {activeTab === 'withdraws' && canSee('withdraw') && (
          <section className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-black text-cyan-300">WITHDRAW REQUESTS</h2>
              <button onClick={() => void fetchWithdraws()} className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs font-bold">{loadingWithdraws ? '…' : 'Refresh'}</button>
            </div>
            {withdraws.map((req) => (
              <article key={req.id} className="rounded-2xl border border-gray-800 bg-[#0e1422] p-4 text-xs shadow-md">
                <p className="font-black text-cyan-300">{req.user_uid} · {req.status}</p>
                <p className="mt-1">NPR {req.amount} · {req.account_name} · {req.account_no}</p>
                {req.status === 'Processing' && (
                  <div className="mt-3 flex flex-col gap-2">
                    <input className={inputCls} placeholder="Reject reason" value={rejectReasonDraft[String(req.id)] || ''} onChange={(e) => setRejectReasonDraft((p) => ({ ...p, [String(req.id)]: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => void approveWithdraw(req.id)} className="rounded-xl bg-green-600 py-2.5 font-black text-white shadow-[0_3px_0_#14532d] active:translate-y-1">Paid</button>
                      <button onClick={() => void rejectWithdraw(req.id)} className="rounded-xl border border-red-500/40 bg-red-950/40 py-2.5 font-black text-red-300 shadow-[0_3px_0_#7f1d1d] active:translate-y-1">Reject</button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </section>
        )}

        {/* 4. PASSWORD RESET */}
        {activeTab === 'password' && canSee('password_reset') && (
          <section className="rounded-3xl border border-gray-800 bg-[#0e1422] p-6 shadow-2xl">
            <h2 className="mb-4 text-sm font-black text-cyan-300">RESET PASSWORD</h2>
            <form onSubmit={resetPassword} className="flex flex-col gap-3">
              <input className={inputCls} placeholder="UID or Gmail" value={resetIdentifier} onChange={(e) => setResetIdentifier(e.target.value)} required />
              <input className={inputCls} placeholder="New password (optional)" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} />
              <button type="submit" disabled={resettingPassword} className="rounded-2xl bg-cyan-500 py-3.5 text-xs font-black text-black shadow-[0_4px_0_#0e7490] active:translate-y-1">Reset Password</button>
            </form>
            {lastResetResult && <p className="mt-4 select-all text-lg font-black text-white font-mono bg-black/60 p-3 rounded-xl border border-gray-800">New Password: {lastResetResult.password}</p>}
          </section>
        )}

        {/* 5. PLAYER SEARCH */}
        {activeTab === 'players' && canSee('player_search') && (
          <section className="flex flex-col gap-4">
            <div className="rounded-3xl border border-gray-800 bg-[#0e1422] p-5 shadow-2xl">
              <h2 className="mb-3 text-sm font-black text-cyan-300">PLAYER SEARCH</h2>
              <form onSubmit={searchPlayer} className="flex flex-col gap-3 sm:flex-row">
                <input className="min-w-0 flex-1 rounded-xl border border-gray-800 bg-black/80 p-3 text-xs text-white outline-none" placeholder="Player UID" value={playerSearchUid} onChange={(e) => setPlayerSearchUid(e.target.value)} required />
                <button type="submit" disabled={searchingPlayer} className="rounded-xl bg-cyan-500 px-6 py-3 text-xs font-black text-black shadow-[0_3px_0_#0e7490] active:translate-y-1">Search</button>
              </form>
            </div>
            {playerResult?.profile && (
              <div className="rounded-3xl border border-cyan-500/20 bg-[#0e1422] p-5 shadow-xl">
                <h3 className="mb-3 text-sm font-black text-cyan-300">{playerResult.profile.nickname || playerResult.profile.full_name}</h3>
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                  <Stat label="Red" value={playerResult.profile.red_diamonds} color="text-red-400" />
                  <Stat label="White" value={playerResult.profile.white_diamonds} color="text-cyan-300" />
                  <Stat label="Cash" value={`NPR ${playerResult.profile.winning_cash}`} color="text-green-300" />
                  <Stat label="Deposits" value={playerResult.deposit_count} color="text-yellow-300" />
                  <Stat label="Withdraws" value={playerResult.withdraw_count} color="text-pink-300" />
                  <Stat label="Phone" value={playerResult.profile.phone || '—'} color="text-gray-300" />
                </div>
              </div>
            )}
          </section>
        )}

        {/* 6. CREATE PLAYER */}
        {activeTab === 'create_player' && canSee('create_player') && (
          <section className="rounded-3xl border border-gray-800 bg-[#0e1422] p-6 shadow-2xl">
            <h2 className="mb-4 text-sm font-black text-cyan-300">CREATE PLAYER</h2>
            <form onSubmit={createPlayer} className="flex flex-col gap-3">
              <input className={inputCls} placeholder="Full name" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} />
              <input className={inputCls} placeholder="Nickname" value={newPlayerNickname} onChange={(e) => setNewPlayerNickname(e.target.value)} />
              <input className={inputCls} type="email" placeholder="Email" value={newPlayerEmail} onChange={(e) => setNewPlayerEmail(e.target.value)} />
              <div className="flex gap-2">
                <input className={`min-w-0 flex-1 ${inputCls}`} placeholder="Password optional" value={newPlayerPassword} onChange={(e) => setNewPlayerPassword(e.target.value)} />
                <button type="button" onClick={() => setNewPlayerPassword(randomPassword())} className="rounded-xl border border-gray-700 bg-black px-3 text-[11px] font-bold">Generate</button>
              </div>
              <input className={inputCls} placeholder="Phone" value={newPlayerPhone} onChange={(e) => setNewPlayerPhone(e.target.value)} />
              <button type="submit" disabled={creatingPlayer} className="rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 py-3.5 text-xs font-black text-white shadow-[0_4px_0_#701a75] active:translate-y-1">Create Player</button>
            </form>
            {lastCreatedPlayer && (
              <div className="mt-4 rounded-2xl border border-green-500/40 bg-green-950/40 p-4 text-xs font-mono">
                <p>Email: <b className="select-all text-white">{lastCreatedPlayer.email}</b></p>
                <p>UID: <b className="select-all text-yellow-300">{lastCreatedPlayer.player_uid}</b></p>
                <p className="mt-1 text-base font-black text-white">{lastCreatedPlayer.password}</p>
              </div>
            )}
          </section>
        )}

        {/* 7. TOURNAMENTS */}
        {activeTab === 'tournaments' && canSee('tournaments') && (
          <section className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-black text-cyan-300">TOURNAMENTS</h2>
              <button onClick={() => void fetchTournamentsAdmin()} className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs font-bold">{loadingTournaments ? '…' : 'Refresh'}</button>
            </div>
            {tournamentRows.map((t) => (
              <article key={t.id} className="rounded-2xl border border-gray-800 bg-[#0e1422] p-4 text-xs shadow-md">
                <p className="font-black text-cyan-300">{t.type_label} · {t.title} · {t.status}</p>
                <p className="mt-1">Joined {t.joined_count} · Played {t.played_count} · Fee {t.entry_fee}</p>
                <button type="button" onClick={() => setExpandedTournamentId((id) => (id === t.id ? null : t.id))} className="mt-2 rounded-xl border border-gray-700 bg-black/40 px-3 py-1.5 font-bold">
                  {expandedTournamentId === t.id ? 'Hide Ranks' : 'Top 10 Ranks'}
                </button>
                {expandedTournamentId === t.id &&
                  t.top_ranks.map((r) => (
                    <p key={r.rank} className="mt-1 text-gray-300 font-mono">
                      #{r.rank} {r.name} ({r.uid}) — {r.score}
                    </p>
                  ))}
              </article>
            ))}
          </section>
        )}

        {/* 8. CREATE MASTER (Connected to Secure Route) */}
        {activeTab === 'create_master' && roles.includes('owner') && (
          <section className="flex flex-col gap-4">
            <div className="rounded-3xl border border-gray-800 bg-[#0e1422] p-6 shadow-2xl">
              <h2 className="mb-4 text-sm font-black text-yellow-300">CREATE MASTER ID</h2>
              <form onSubmit={createMaster} className="flex flex-col gap-3">
                <input className={inputCls} placeholder="Full name (e.g. Rajesh Sharma)" value={newMasterName} onChange={(e) => setNewMasterName(e.target.value)} required />
                <input className={inputCls} type="email" placeholder="Email (e.g. master@arenanepal.com)" value={newMasterEmail} onChange={(e) => setNewMasterEmail(e.target.value)} required />
                <input className={inputCls} placeholder="Phone" value={newMasterPhone} onChange={(e) => setNewMasterPhone(e.target.value)} />
                <div className="flex gap-2">
                  <input className={`min-w-0 flex-1 ${inputCls}`} placeholder="Password optional" value={newMasterPassword} onChange={(e) => setNewMasterPassword(e.target.value)} />
                  <button type="button" onClick={() => setNewMasterPassword(randomPassword())} className="rounded-xl border border-gray-700 bg-black px-3 text-[11px] font-bold">Generate</button>
                </div>
                <button type="submit" disabled={creatingMaster} className="rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 py-3.5 text-xs font-black text-black shadow-[0_4px_0_#b45309] active:translate-y-1">
                  {creatingMaster ? 'Creating Master…' : 'Create Master ID'}
                </button>
              </form>
              {lastCreatedMaster && (
                <div className="mt-4 rounded-2xl border border-green-500/40 bg-green-950/40 p-4 text-xs font-mono">
                  <p className="font-bold text-green-300">Master Credentials:</p>
                  <p className="mt-1">Email: <b className="select-all text-white">{lastCreatedMaster.email}</b></p>
                  <p>Code: <b className="select-all text-yellow-300">{lastCreatedMaster.master_code}</b></p>
                  <p className="mt-1 text-base font-black text-white">{lastCreatedMaster.password}</p>
                </div>
              )}
            </div>
            <div className="rounded-3xl border border-gray-800 bg-[#0e1422] p-6 shadow-2xl">
              <div className="mb-3 flex justify-between items-center">
                <h2 className="text-sm font-black text-cyan-300">ALL MASTERS</h2>
                <button onClick={() => void fetchMasters()} className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs font-bold">{loadingMasters ? '…' : 'Refresh'}</button>
              </div>
              {mastersList.map((m) => (
                <div key={m.id} className="mb-2 rounded-2xl border border-gray-800 bg-black/40 p-3.5 text-xs flex justify-between items-center shadow-md">
                  <div>
                    <p className="font-bold text-white text-sm">{m.full_name}</p>
                    <p className="text-yellow-300 font-mono font-bold">{m.master_code}</p>
                  </div>
                  <p className="text-base font-black text-red-400">🔴 {m.red_diamonds}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 9. MASTER DEPOSIT */}
        {activeTab === 'master_deposit' && roles.includes('owner') && (
          <section className="flex flex-col gap-4">
            <div className="rounded-3xl border border-yellow-500/30 bg-[#0e1422] p-6 shadow-2xl">
              <h2 className="mb-4 text-sm font-black text-yellow-300">MASTER DEPOSIT (CREDIT CHIPS)</h2>
              <form onSubmit={creditMasterDiamonds} className="flex flex-col gap-3">
                <input className={inputCls} placeholder="MASTER-XXX or email" value={masterCreditCode} onChange={(e) => setMasterCreditCode(e.target.value)} required />
                <input className={inputCls} type="number" min="1" placeholder="Red Diamonds (🔴)" value={masterCreditAmount} onChange={(e) => setMasterCreditAmount(e.target.value)} required />
                <input className={inputCls} placeholder="Note (optional)" value={masterCreditNote} onChange={(e) => setMasterCreditNote(e.target.value)} />
                <button type="submit" disabled={creditingMaster} className="rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 py-3.5 text-xs font-black text-black shadow-[0_4px_0_#b45309] active:translate-y-1">
                  {creditingMaster ? 'Crediting…' : 'Send to Master'}
                </button>
              </form>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 3D BUTTON & STAT HELPER COMPONENTS
// ----------------------------------------------------
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
      className={`rounded-2xl py-3 px-3 text-xs font-black transition-all ${
        active
          ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-[0_4px_0_#0e7490,0_8px_16px_rgba(6,182,212,0.3)]'
          : 'border border-gray-800 bg-[#0e1422] text-gray-300 hover:text-white shadow-[0_3px_0_#050811] active:translate-y-1'
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-black/40 p-3 shadow-inner">
      <p className="text-[10px] text-gray-500 font-bold uppercase">{label}</p>
      <p className={`mt-1 text-base font-black ${color}`}>{value ?? '—'}</p>
    </div>
  );
}