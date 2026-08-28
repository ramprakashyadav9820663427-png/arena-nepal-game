'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminPanel() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [diamondsToAdd, setDiamondsToAdd] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkAdmin();
  }, []);

  // Check if the logged-in user is an admin
  const async function checkAdmin() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/'); // अगर लॉगिन नहीं है तो होमपेज भेज दो
        return;
      }

      // profiles टेबल से चेक करो कि is_admin true है या नहीं
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (error || !data?.is_admin) {
        setMessage('Access Denied: You are not an admin!');
        setIsAdmin(false);
      } else {
        setIsAdmin(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Diamond Top-up Logic for Admin
  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!userEmail || !diamondsToAdd) {
      setMessage('Please enter both email and diamond amount.');
      return;
    }

    try {
      // 1. उस यूजर को ढूंढो जिसका ईमेल डाला गया है
      const { data: targetUser, error: fetchError } = await supabase
        .from('profiles')
        .select('id, diamonds')
        .eq('email', userEmail)
        .single();

      if (fetchError || !targetUser) {
        setMessage('User not found with this email in profiles table.');
        return;
      }

      // 2. पुराने डायमंड में नए डायमंड जोड़ो
      const newTotalDiamonds = (targetUser.diamonds || 0) + parseInt(diamondsToAdd);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ diamonds: newTotalDiamonds })
        .eq('id', targetUser.id);

      if (updateError) {
        setMessage(`Error: ${updateError.message}`);
      } else {
        setMessage(`Successfully added ${diamondsToAdd} diamonds to ${userEmail}!`);
        setUserEmail('');
        setDiamondsToAdd('');
      }
    } catch (err) {
      setMessage('Something went wrong.');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Admin Panel...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black text-red-500 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-4">403 - Access Denied</h1>
        <p className="text-gray-400">{message || "You do not have permission to view this page."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-xl mx-auto bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-2xl">
        <h1 className="text-3xl font-bold text-yellow-400 mb-6 text-center">Arena Nepal - Admin Panel</h1>

        {message && (
          <div className="mb-4 p-3 bg-gray-800 border border-yellow-500/40 rounded text-sm text-center text-yellow-200">
            {message}
          </div>
        )}

        <form onSubmit={handleTopUp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">User Email</label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Diamonds to Add</label>
            <input
              type="number"
              value={diamondsToAdd}
              onChange={(e) => setDiamondsToAdd(e.target.value)}
              placeholder="e.g. 500"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-400"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition"
          >
            Send Diamonds
          </button>
        </form>
      </div>
    </div>
  );
}