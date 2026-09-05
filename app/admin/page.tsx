'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminPage() {
  // Password Protection States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const ADMIN_SECRET_PASSWORD = 'RamPrakash@2026#RPY'; // 👈 यह रहा तेरा नया और स्ट्रॉन्ग पासवर्ड

  const [activeTab, setActiveTab] = useState<'withdraws' | 'diamonds'>(
    'withdraws'
  );
  const [withdrawRequests, setWithdrawRequests] = useState<any[]>([]);

  // Diamond Top-up States
  const [targetUid, setTargetUid] = useState('');
  const [addDiamonds, setAddDiamonds] = useState('100');

  // Web Audio API helper for crisp 'Tak-Tak' sound effect on button press
  const playClickSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.04);
      
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {
      // Ignore audio context errors if browser blocks autoplay
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchWithdrawRequests();
    }
  }, [isAuthenticated]);

  // Handle Login Password Submit
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    if (inputPassword === ADMIN_SECRET_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      alert('Incorrect Password! Access Denied.');
      setInputPassword('');
    }
  };

  // Fetch all pending withdraw requests from Supabase
  const fetchWithdrawRequests = async () => {
    const { data, error } = await supabase
      .from('withdraw_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setWithdrawRequests(data);
    } else if (error) {
      console.error('Error fetching requests:', error);
    }
  };

  // Approve/Success Withdraw Request
  const handleApproveWithdraw = async (id: number) => {
    playClickSound();
    const { error } = await supabase
      .from('withdraw_requests')
      .update({ status: 'Success' })
      .eq('id', id);

    if (!error) {
      alert('Withdraw request marked as Success!');
      fetchWithdrawRequests();
    } else {
      alert('Error updating status');
    }
  };

  // Add Red Diamonds to User Profile
  const handleAddDiamondsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    if (!targetUid) {
      alert('Please enter a valid User UID');
      return;
    }

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_uid', targetUid)
      .single();

    if (fetchError || !profile) {
      const { error: insertError } = await supabase.from('profiles').insert([
        {
          user_uid: targetUid,
          username: 'Player',
          red_diamonds: Number(addDiamonds),
          winning_cash: 0,
        },
      ]);

      if (insertError) {
        alert('Failed to create profile and add diamonds.');
        return;
      }
    } else {
      const updatedDiamonds = (profile.red_diamonds || 0) + Number(addDiamonds);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ red_diamonds: updatedDiamonds })
        .eq('user_uid', targetUid);

      if (updateError) {
        alert('Failed to update diamonds.');
        return;
      }
    }

    alert(
      `Successfully added ${addDiamonds} Red Diamonds to UID: ${targetUid}`
    );
    setTargetUid('');
  };

  // 1. अगर एडमिन लॉग-इन नहीं है, तो पासवर्ड बॉक्स दिखेगा
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-gray-900 border border-purple-500/30 p-6 rounded-2xl shadow-2xl">
          <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 text-center mb-2">
            🛡️ ADMIN LOGIN
          </h1>
          <p className="text-[11px] text-gray-400 text-center mb-6">
            Enter admin password to access Arena Nepal panel.
          </p>
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              placeholder="Enter Admin Password"
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              className="w-full bg-black border border-gray-800 text-white p-3 rounded-xl text-xs"
              required
            />
            <button
              type="submit"
              onClick={playClickSound}
              className="py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl text-xs shadow-lg hover:opacity-90 transition-all cursor-pointer"
            >
              Login to Admin Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. पासवर्ड सही होने के बाद असली एडमिन पैनल खुलेगा
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-4 flex flex-col items-center select-none">
      <div className="w-full max-w-2xl bg-gray-900 border border-purple-500/30 p-4 rounded-2xl mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400">
            🛡️ ARENA NEPAL ADMIN PANEL
          </h1>
          <p className="text-xs text-gray-400">
            Manage Red Diamond Top-ups & eSewa Withdraw Approvals
          </p>
        </div>
        <button
          onClick={() => {
            playClickSound();
            setIsAuthenticated(false);
          }}
          className="px-3 py-1.5 bg-red-600/25 border border-red-500/40 text-red-400 text-xs font-bold rounded-xl hover:bg-red-600 hover:text-white transition-all cursor-pointer"
        >
          Logout
        </button>
      </div>

      {/* Admin Tabs */}
      <div className="w-full max-w-2xl grid grid-cols-2 gap-2 mb-6">
        <button
          onClick={() => {
            playClickSound();
            setActiveTab('withdraws');
          }}
          className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'withdraws'
              ? 'bg-cyan-500 text-black shadow'
              : 'bg-gray-900 text-gray-400 border border-gray-800'
          }`}
        >
          Withdraw Requests ({withdrawRequests.length})
        </button>
        <button
          onClick={() => {
            playClickSound();
            setActiveTab('diamonds');
          }}
          className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'diamonds'
              ? 'bg-cyan-500 text-black shadow'
              : 'bg-gray-900 text-gray-400 border border-gray-800'
          }`}
        >
          Add Red Diamonds (Top-Up)
        </button>
      </div>

      {/* SECTION 1: WITHDRAW REQUESTS */}
      {activeTab === 'withdraws' && (
        <div className="w-full max-w-2xl flex flex-col gap-3">
          <h2 className="text-xs font-bold text-gray-400">
            ALL WITHDRAW REQUESTS
          </h2>
          {withdrawRequests.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-8 bg-gray-900 rounded-2xl">
              No withdraw requests found.
            </p>
          ) : (
            withdrawRequests.map((req) => (
              <div
                key={req.id}
                className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex flex-col gap-2 text-xs"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-cyan-400">
                    {req.username} ({req.user_uid})
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      req.status === 'Success'
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
                <div className="text-gray-300 text-[11px] space-y-1">
                  <p>
                    💰 Amount: <b className="text-green-400">NPR {req.amount}</b>
                  </p>
                  <p>📱 eSewa Number: {req.esewa_id}</p>
                  <p>👤 Holder Name: {req.esewa_name}</p>
                  <p className="text-[10px] text-gray-500">
                    Requested on: {new Date(req.created_at).toLocaleString()}
                  </p>
                </div>
                {req.status === 'Processing' && (
                  <button
                    onClick={() => handleApproveWithdraw(req.id)}
                    className="mt-2 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg text-xs transition-all shadow cursor-pointer"
                  >
                    Mark as Success (Payment Sent)
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* SECTION 2: ADD RED DIAMONDS */}
      {activeTab === 'diamonds' && (
        <div className="w-full max-w-2xl bg-gray-900 border border-gray-800 p-5 rounded-2xl flex flex-col gap-4">
          <h2 className="text-xs font-bold text-pink-400">
            TOP-UP RED DIAMONDS TO USER ACCOUNT
          </h2>
          <form
            onSubmit={handleAddDiamondsSubmit}
            className="flex flex-col gap-3"
          >
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block">
                User Game UID
              </label>
              <input
                type="text"
                placeholder="e.g. #AN-123456"
                value={targetUid}
                onChange={(e) => setTargetUid(e.target.value)}
                className="w-full bg-black border border-gray-800 text-white p-2.5 rounded-xl text-xs"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block">
                Red Diamonds Quantity
              </label>
              <input
                type="number"
                value={addDiamonds}
                onChange={(e) => setAddDiamonds(e.target.value)}
                className="w-full bg-black border border-gray-800 text-white p-2.5 rounded-xl text-xs"
                required
              />
            </div>
            <button
              type="submit"
              className="mt-2 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl text-xs shadow-lg hover:opacity-90 transition-all cursor-pointer"
            >
              Add Red Diamonds to User
            </button>
          </form>
        </div>
      )}
    </div>
  );
}