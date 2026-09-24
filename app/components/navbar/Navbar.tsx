'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AuthModal from '../AuthModal';
import { translations } from '../../lib/translations';

type TabType = 'game' | 'tournament' | 'rank' | 'wallet';

interface UserWallet {
  redDiamonds?: number;
  whiteDiamonds?: number;
  [key: string]: any;
}

interface NavbarProps {
  wallet: UserWallet;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

interface UserProfile {
  id: string;
  uid?: string | null;
  email?: string | null;
  full_name?: string | null;
  nickname?: string | null;
  phone?: string | null;
  red_diamonds?: number | null;
  white_diamonds?: number | null;
}

function generateArenaUid(): string {
  const randomPart = Math.floor(10000000 + Math.random() * 90000000);
  return `AN${randomPart}`;
}

export default function Navbar({
  wallet,
  activeTab,
  setActiveTab,
}: NavbarProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentLang] = useState<'en' | 'ne'>('en');

  const [sessionLoading, setSessionLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const hasInitializedAuth = useRef(false);
  const lastUserId = useRef<string | null>(null);

  const t = translations[currentLang];

  const createUniqueUid = async (): Promise<string> => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const newUid = generateArenaUid();

      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('uid', newUid)
        .maybeSingle();

      if (error) {
        console.error('UID check error:', error);
        continue;
      }

      if (!data) {
        return newUid;
      }
    }

    throw new Error('Unable to generate a unique Arena UID.');
  };

  const loadOrCreateProfile = async (
    userId: string,
    email: string | null | undefined,
    userMetadata: Record<string, any> | undefined
  ): Promise<UserProfile | null> => {
    try {
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select(
          'id, uid, email, full_name, nickname, phone, red_diamonds, white_diamonds'
        )
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return null;
      }

      if (existingProfile) {
        return existingProfile as UserProfile;
      }

      const fullName =
        userMetadata?.full_name ||
        userMetadata?.name ||
        userMetadata?.display_name ||
        '';

      const nickname =
        userMetadata?.nickname ||
        userMetadata?.user_name ||
        userMetadata?.preferred_username ||
        '';

      const phone = userMetadata?.phone || '';

      const newUid = await createUniqueUid();

      const newProfile = {
        id: userId,
        uid: newUid,
        email: email || null,
        full_name: fullName,
        nickname: nickname,
        phone: phone,
        red_diamonds: 0,
        white_diamonds: 0,
      };

      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select(
          'id, uid, email, full_name, nickname, phone, red_diamonds, white_diamonds'
        )
        .single();

      if (createError) {
        console.error('Profile creation error:', createError);

        // Another auth/profile process may have created the profile
        // at almost the same time. Try fetching it one more time.
        const { data: retryProfile } = await supabase
          .from('profiles')
          .select(
            'id, uid, email, full_name, nickname, phone, red_diamonds, white_diamonds'
          )
          .eq('id', userId)
          .maybeSingle();

        return (retryProfile as UserProfile | null) || null;
      }

      return (createdProfile as UserProfile) || null;
    } catch (error) {
      console.error('Profile initialization error:', error);
      return null;
    }
  };

  const handleAuthenticatedUser = async (
    user: {
      id: string;
      email?: string | null;
      user_metadata?: Record<string, any>;
    },
    moveToWallet: boolean
  ) => {
    const isNewAuthenticatedUser = lastUserId.current !== user.id;

    lastUserId.current = user.id;
    setIsLoggedIn(true);

    const loadedProfile = await loadOrCreateProfile(
      user.id,
      user.email,
      user.user_metadata
    );

    if (loadedProfile) {
      setProfile(loadedProfile);
    }

    /*
     * Move to Wallet only when a new authentication session is detected.
     * This prevents every normal React re-render from changing the user's tab.
     */
    if (moveToWallet && isNewAuthenticatedUser) {
      setActiveTab('wallet');
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('Session check error:', error);
        }

        if (!mounted) return;

        if (session?.user) {
          await handleAuthenticatedUser(session.user, false);
        } else {
          setIsLoggedIn(false);
          setProfile(null);
          lastUserId.current = null;
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) {
          setSessionLoading(false);
          hasInitializedAuth.current = true;
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session?.user) {
        /*
         * Google OAuth commonly reaches this listener after the browser
         * returns from Google's authorization page.
         */
        const shouldMoveToWallet =
          event === 'SIGNED_IN' ||
          event === 'INITIAL_SESSION';

        /*
         * Supabase may call INITIAL_SESSION during first load.
         * We don't force the Wallet tab during an ordinary page refresh.
         */
        await handleAuthenticatedUser(
          session.user,
          shouldMoveToWallet && hasInitializedAuth.current
        );

        setSessionLoading(false);
      } else {
        setIsLoggedIn(false);
        setProfile(null);
        lastUserId.current = null;
        setSessionLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setActiveTab]);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Logout error:', error);
        alert('Logout failed. Please try again.');
        return;
      }

      setIsLoggedIn(false);
      setProfile(null);
      lastUserId.current = null;

      localStorage.removeItem('arena_user_token');
      localStorage.removeItem('arena_referred_by');

      setActiveTab('game');
    } catch (error) {
      console.error('Unexpected logout error:', error);
      alert('Logout failed. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayName =
    profile?.nickname?.trim() ||
    profile?.full_name?.trim() ||
    profile?.email?.split('@')[0] ||
    'Player';

  const displayUid = profile?.uid || 'Loading...';

  return (
    <>
      <header className="w-full bg-gray-900 border-b border-gray-800 text-white p-3 md:p-4 flex flex-col md:flex-row justify-between items-center gap-3 shadow-md">
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpg"
              alt="Arena Nepal Logo"
              className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
            />

            <div className="min-w-0">
              <div className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-purple-500">
                ARENA NEPAL
              </div>

              {isLoggedIn && !sessionLoading && (
                <div className="flex items-center gap-2 text-[10px] mt-0.5">
                  <span className="text-cyan-300 font-bold truncate max-w-[130px]">
                    {displayName}
                  </span>

                  <span className="text-gray-600">•</span>

                  <span className="text-gray-400 font-mono">
                    {displayUid}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className="flex gap-2 bg-gray-800 p-1 rounded-xl overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('game')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'game'
                ? 'bg-yellow-500 text-gray-950'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            {t.sports}
          </button>

          <button
            onClick={() => setActiveTab('tournament')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'tournament'
                ? 'bg-yellow-500 text-gray-950'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            {t.casino}
          </button>

          <button
            onClick={() => setActiveTab('rank')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'rank'
                ? 'bg-yellow-500 text-gray-950'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            {t.esports}
          </button>

          <button
            onClick={() => setActiveTab('wallet')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'wallet'
                ? 'bg-yellow-500 text-gray-950'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            {t.live}
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-700 text-sm font-bold">
            <span className="text-red-400">
              🔴 {wallet?.redDiamonds ?? 0}
            </span>

            <span className="text-gray-600">|</span>

            <span className="text-cyan-300">
              💎 {wallet?.whiteDiamonds ?? 0}
            </span>
          </div>

          {sessionLoading ? (
            <div className="px-4 py-2 bg-gray-800 text-gray-400 font-bold rounded-xl text-sm whitespace-nowrap border border-gray-700">
              Loading...
            </div>
          ) : isLoggedIn ? (
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex flex-col items-end leading-tight">
                <span className="text-xs font-bold text-white">
                  {displayName}
                </span>

                <span className="text-[9px] text-cyan-400 font-mono">
                  {displayUid}
                </span>
              </div>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-4 py-2 bg-red-500 text-white font-bold rounded-xl text-sm hover:bg-red-400 transition disabled:opacity-50 whitespace-nowrap"
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-4 py-2 bg-yellow-500 text-gray-950 font-bold rounded-xl text-sm hover:bg-yellow-400 transition whitespace-nowrap"
            >
              {t.login} / {t.register}
            </button>
          )}
        </div>
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
}