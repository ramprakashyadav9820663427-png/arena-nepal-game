'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Profile = {
  id: string;
  user_uid: string | null;
  username: string | null;
  email: string | null;
  red_diamonds: number | null;
  white_diamonds: number | null;
  balance: number | null;
  created_at: string | null;
};

export default function AdminPage() {
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  const [targetUid, setTargetUid] = useState('');
  const [addDiamonds, setAddDiamonds] = useState('100');
  const [removeDiamonds, setRemoveDiamonds] = useState('0');

  const [profile, setProfile] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  /*
   * IMPORTANT:
   * Change this password before production.
   * Client-side passwords are NOT secure for a real production admin.
   * This is only a temporary admin UI.
   */
  const ADMIN_PASSWORD = 'admin123';

  useEffect(() => {
    const saved = sessionStorage.getItem('arena_admin_logged_in');

    if (saved === 'true') {
      setAdminLoggedIn(true);
    }
  }, []);

  const showMessage = (text: string) => {
    setMessage(text);
    setErrorMessage('');
  };

  const showError = (text: string) => {
    setErrorMessage(text);
    setMessage('');
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (adminPassword !== ADMIN_PASSWORD) {
      showError('Invalid admin password.');
      return;
    }

    sessionStorage.setItem('arena_admin_logged_in', 'true');
    setAdminLoggedIn(true);
    setAdminPassword('');
    showMessage('Admin login successful.');
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('arena_admin_logged_in');
    setAdminLoggedIn(false);
    setProfile(null);
    setUsers([]);
    setTargetUid('');
    showMessage('');
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, user_uid, username, email, red_diamonds, white_diamonds, balance, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Load users error:', error);
      showError('Failed to load users.');
      setLoadingUsers(false);
      return;
    }

    setUsers((data || []) as Profile[]);
    setLoadingUsers(false);
  };

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const uid = targetUid.trim();

    if (!uid) {
      showError('Please enter a valid User UID.');
      return;
    }

    setLoading(true);
    setProfile(null);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, user_uid, username, email, red_diamonds, white_diamonds, balance, created_at'
      )
      .eq('user_uid', uid)
      .maybeSingle();

    if (error) {
      console.error('Search user error:', error);
      showError('Failed to search user.');
      setLoading(false);
      return;
    }

    if (!data) {
      showError('User not found. Please check the Game UID.');
      setLoading(false);
      return;
    }

    setProfile(data as Profile);
    showMessage('User found successfully.');
    setLoading(false);
  };

  const handleAddDiamonds = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) {
      showError('Search for a user first.');
      return;
    }

    const amount = Number(addDiamonds);

    if (!Number.isFinite(amount) || amount <= 0) {
      showError('Please enter a valid Red Diamond amount.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const currentBalance = Number(profile.red_diamonds || 0);
    const newBalance = currentBalance + amount;

    const { data, error } = await supabase
      .from('profiles')
      .update({
        red_diamonds: newBalance,
      })
      .eq('id', profile.id)
      .select(
        'id, user_uid, username, email, red_diamonds, white_diamonds, balance, created_at'
      )
      .single();

    if (error) {
      console.error('Add diamonds error:', error);
      showError('Failed to add Red Diamonds.');
      setLoading(false);
      return;
    }

    setProfile(data as Profile);

    showMessage(
      `Top-up successful. Added ${amount.toLocaleString()} Red Diamonds.`
    );

    setAddDiamonds('100');
    setLoading(false);

    await loadUsers();
  };

  const handleRemoveDiamonds = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) {
      showError('Search for a user first.');
      return;
    }

    const amount = Number(removeDiamonds);

    if (!Number.isFinite(amount) || amount <= 0) {
      showError('Please enter a valid Red Diamond amount.');
      return;
    }

    const currentBalance = Number(profile.red_diamonds || 0);

    if (amount > currentBalance) {
      showError('User does not have enough Red Diamonds.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const newBalance = currentBalance - amount;

    const { data, error } = await supabase
      .from('profiles')
      .update({
        red_diamonds: newBalance,
      })
      .eq('id', profile.id)
      .select(
        'id, user_uid, username, email, red_diamonds, white_diamonds, balance, created_at'
      )
      .single();

    if (error) {
      console.error('Remove diamonds error:', error);
      showError('Failed to remove Red Diamonds.');
      setLoading(false);
      return;
    }

    setProfile(data as Profile);

    showMessage(
      `Successfully removed ${amount.toLocaleString()} Red Diamonds.`
    );

    setRemoveDiamonds('0');
    setLoading(false);

    await loadUsers();
  };

  if (!adminLoggedIn) {
    return (
      <main className="min-h-screen bg-black px-4 py-10 text-white">
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
          <div className="w-full rounded-3xl border border-cyan-500/30 bg-zinc-950 p-6 shadow-2xl">
            <div className="mb-8 text-center">
              <div className="mb-3 text-5xl">🛡️</div>

              <h1 className="text-3xl font-black">
                Arena Nepal
              </h1>

              <p className="mt-2 text-sm text-zinc-400">
                Admin Control Panel
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-300">
                  Admin Password
                </label>

                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                />
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-black text-black transition hover:bg-cyan-400 active:scale-[0.98]"
              >
                Login to Admin
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">
              Arena Nepal
            </p>

            <h1 className="mt-1 text-2xl font-black sm:text-3xl">
              Admin Dashboard
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Manage users and Red Diamond balances
            </p>
          </div>

          <button
            type="button"
            onClick={handleAdminLogout}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-black text-red-300 transition hover:bg-red-500/20"
          >
            Logout
          </button>
        </header>

        {/* MESSAGES */}
        {message && (
          <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-300">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* SEARCH USER */}
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="mb-5">
              <h2 className="text-xl font-black">
                🔎 Find User
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Search using the user's Game UID.
              </p>
            </div>

            <form onSubmit={handleSearchUser} className="space-y-3">
              <input
                type="text"
                value={targetUid}
                onChange={(e) => setTargetUid(e.target.value)}
                placeholder="Enter Game UID"
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-black text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search User'}
              </button>
            </form>

            {profile && (
              <div className="mt-5 rounded-2xl border border-zinc-800 bg-black p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-black">
                    User Details
                  </h3>

                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                    Found
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-zinc-500">UID</span>
                    <span className="font-bold">
                      {profile.user_uid || 'N/A'}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-zinc-500">Username</span>
                    <span className="font-bold">
                      {profile.username || 'N/A'}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-zinc-500">Email</span>
                    <span className="max-w-[60%] break-all text-right font-bold">
                      {profile.email || 'N/A'}
                    </span>
                  </div>

                  <div className="mt-4 border-t border-zinc-800 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">
                        Red Diamonds
                      </span>

                      <span className="text-xl font-black text-red-400">
                        💎{' '}
                        {Number(
                          profile.red_diamonds || 0
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">
                      White Diamonds
                    </span>

                    <span className="font-black text-white">
                      🤍{' '}
                      {Number(
                        profile.white_diamonds || 0
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* RED DIAMOND MANAGEMENT */}
          <section className="space-y-6">
            {/* ADD */}
            <div className="rounded-3xl border border-emerald-500/20 bg-zinc-950 p-5">
              <div className="mb-5">
                <h2 className="text-xl font-black text-emerald-300">
                  💎 Add Red Diamonds
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Add Red Diamonds to the selected user.
                </p>
              </div>

              <form onSubmit={handleAddDiamonds} className="space-y-3">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={addDiamonds}
                  onChange={(e) => setAddDiamonds(e.target.value)}
                  placeholder="Amount"
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-emerald-400"
                />

                <button
                  type="submit"
                  disabled={loading || !profile}
                  className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-black text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? 'Processing...' : 'Add Red Diamonds'}
                </button>
              </form>
            </div>

            {/* REMOVE */}
            <div className="rounded-3xl border border-red-500/20 bg-zinc-950 p-5">
              <div className="mb-5">
                <h2 className="text-xl font-black text-red-300">
                  ➖ Remove Red Diamonds
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Remove Red Diamonds from the selected user.
                </p>
              </div>

              <form
                onSubmit={handleRemoveDiamonds}
                className="space-y-3"
              >
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={removeDiamonds}
                  onChange={(e) =>
                    setRemoveDiamonds(e.target.value)
                  }
                  placeholder="Amount"
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-red-400"
                />

                <button
                  type="submit"
                  disabled={loading || !profile}
                  className="w-full rounded-xl bg-red-500 px-4 py-3 font-black text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading
                    ? 'Processing...'
                    : 'Remove Red Diamonds'}
                </button>
              </form>
            </div>
          </section>
        </div>

        {/* USERS */}
        <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black">
                👥 Users
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Recently created users.
              </p>
            </div>

            <button
              type="button"
              onClick={loadUsers}
              disabled={loadingUsers}
              className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-black text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-50"
            >
              {loadingUsers ? 'Loading...' : 'Refresh Users'}
            </button>
          </div>

          {users.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
              Click “Refresh Users” to load users.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-zinc-800">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-black">
                  <tr className="border-b border-zinc-800">
                    <th className="px-4 py-3 text-zinc-500">
                      UID
                    </th>
                    <th className="px-4 py-3 text-zinc-500">
                      Username
                    </th>
                    <th className="px-4 py-3 text-zinc-500">
                      Email
                    </th>
                    <th className="px-4 py-3 text-zinc-500">
                      Red Diamonds
                    </th>
                    <th className="px-4 py-3 text-zinc-500">
                      White Diamonds
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-zinc-900 last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 font-bold">
                        {user.user_uid || 'N/A'}
                      </td>

                      <td className="px-4 py-3">
                        {user.username || 'N/A'}
                      </td>

                      <td className="max-w-[250px] break-all px-4 py-3 text-zinc-400">
                        {user.email || 'N/A'}
                      </td>

                      <td className="px-4 py-3 font-black text-red-400">
                        💎{' '}
                        {Number(
                          user.red_diamonds || 0
                        ).toLocaleString()}
                      </td>

                      <td className="px-4 py-3 font-black">
                        🤍{' '}
                        {Number(
                          user.white_diamonds || 0
                        ).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer className="py-8 text-center text-xs text-zinc-600">
          Arena Nepal Admin Panel
        </footer>
      </div>
    </main>
  );
}