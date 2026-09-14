'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

export default function AuthModal({
  isOpen,
  onClose,
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [robotChecked, setRobotChecked] = useState(false);

  const [isNewUserSetup, setIsNewUserSetup] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<
    'error' | 'success' | 'info'
  >('info');

  // ============================================================
  // AUTH STATE / PASSWORD RECOVERY
  // ============================================================

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        setIsNewUserSetup(false);
        setMode('forgot');
        setPassword('');
        setConfirmPassword('');
        setMessage('');
      }

      if (
        event === 'SIGNED_OUT' &&
        !isRecoveryMode
      ) {
        setCurrentUser(null);
      }

      if (
        event === 'SIGNED_IN' &&
        session?.user &&
        !isRecoveryMode
      ) {
        // OAuth/session handling is performed separately.
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isRecoveryMode]);

  if (!isOpen) return null;

  // ============================================================
  // HELPERS
  // ============================================================

  const showMessage = (
    text: string,
    type: 'error' | 'success' | 'info' = 'info'
  ) => {
    setMessage(text);
    setMessageType(type);
  };

  const clearMessage = () => {
    setMessage('');
  };

  const getDeviceId = () => {
    let devId = localStorage.getItem('arena_device_id');

    if (!devId) {
      devId =
        'dev_' +
        Math.random().toString(36).substring(2) +
        Date.now().toString(36);

      localStorage.setItem('arena_device_id', devId);
    }

    return devId;
  };

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value.trim()
    );
  };

  const validatePhone = (value: string) => {
    const cleaned = value.replace(/[\s\-()+]/g, '');
    return /^\d{8,15}$/.test(cleaned);
  };

  const generateUidCandidate = () => {
    return (
      'AN-' +
      Math.floor(10000 + Math.random() * 90000)
    );
  };

  const generateUniqueUid = async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generateUidCandidate();

      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('uid', candidate)
        .maybeSingle();

      if (error) {
        console.warn(
          'UID uniqueness check:',
          error.message
        );
      }

      if (!data) {
        return candidate;
      }
    }

    throw new Error(
      'Unable to generate a unique player ID. Please try again.'
    );
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setNickname('');
    setPhone('');
    setReferralCode('');
    setAcceptedTerms(false);
    setRobotChecked(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setCurrentUser(null);
    setIsNewUserSetup(false);
    setIsRecoveryMode(false);
    setMessage('');
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setIsNewUserSetup(false);
    clearMessage();

    if (newMode !== 'forgot') {
      setIsRecoveryMode(false);
      setPassword('');
      setConfirmPassword('');
    }
  };

  // ============================================================
  // DEVICE + PROFILE SECURITY
  // ============================================================

  const checkProfileDetails = async (
    userId: string,
    userEmail: string
  ) => {
    try {
      const deviceId = getDeviceId();

      const {
        data: existingDeviceUsers,
        error: deviceError,
      } = await supabase
        .from('profiles')
        .select('id')
        .eq('device_id', deviceId);

      if (deviceError) {
        console.warn(
          'Device security check:',
          deviceError.message
        );
      }

      // Another account already belongs to this device.
      if (
        existingDeviceUsers &&
        existingDeviceUsers.length > 0
      ) {
        const matchingUser = existingDeviceUsers.find(
          (user: { id: string }) =>
            user.id === userId
        );

        if (!matchingUser) {
          await supabase.auth.signOut();

          showMessage(
            'Security Alert: This device is already linked to another Arena Nepal account.',
            'error'
          );

          setLoading(false);
          return false;
        }
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.warn(
          'Profile lookup:',
          profileError.message
        );
      }

      // No profile found.
      if (!profile) {
        setCurrentUser({
          id: userId,
          email: userEmail,
        });

        setEmail(userEmail);
        setIsNewUserSetup(true);
        setLoading(false);

        return true;
      }

      /*
       * If the profile already has a device assigned,
       * the account must return from that same device.
       */
      if (
        profile.device_id &&
        profile.device_id !== deviceId
      ) {
        await supabase.auth.signOut();

        showMessage(
          'This account is already linked to another device.',
          'error'
        );

        setLoading(false);
        return false;
      }

      /*
       * Existing account but incomplete profile.
       */
      if (
        !profile.nickname ||
        !profile.phone ||
        !profile.full_name
      ) {
        setCurrentUser({
          id: userId,
          email: userEmail,
        });

        setEmail(userEmail);
        setFullName(profile.full_name || '');
        setNickname(profile.nickname || '');
        setPhone(profile.phone || '');

        setIsNewUserSetup(true);
        setLoading(false);

        return true;
      }

      showMessage(
        'Login successful! Welcome back to Arena Nepal.',
        'success'
      );

      setTimeout(() => {
        window.location.reload();
      }, 900);

      return true;
    } catch (error) {
      console.error(
        'Profile/security error:',
        error
      );

      showMessage(
        'We could not verify your account. Please try again.',
        'error'
      );

      setLoading(false);

      return false;
    }
  };

  // ============================================================
  // COMPLETE PROFILE
  // ============================================================

  const handleSaveProfile = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    clearMessage();

    if (!fullName.trim()) {
      showMessage(
        'Please enter your full name.',
        'error'
      );
      return;
    }

    if (fullName.trim().length < 2) {
      showMessage(
        'Full name must be at least 2 characters.',
        'error'
      );
      return;
    }

    if (!nickname.trim()) {
      showMessage(
        'Please enter your gaming nickname.',
        'error'
      );
      return;
    }

    if (nickname.trim().length < 3) {
      showMessage(
        'Gaming nickname must be at least 3 characters.',
        'error'
      );
      return;
    }

    if (!phone.trim() || !validatePhone(phone)) {
      showMessage(
        'Please enter a valid mobile number.',
        'error'
      );
      return;
    }

    if (!currentUser) {
      showMessage(
        'Your session expired. Please login again.',
        'error'
      );
      return;
    }

    setLoading(true);

    try {
      const deviceId = getDeviceId();

      /*
       * Only generate UID if the profile does not
       * already have one.
       */
      const { data: existingProfile } =
        await supabase
          .from('profiles')
          .select('uid')
          .eq('id', currentUser.id)
          .maybeSingle();

      const uid =
        existingProfile?.uid ||
        (await generateUniqueUid());

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          nickname: nickname.trim(),
          phone: phone.trim(),
          uid,
          device_id: deviceId,
        })
        .eq('id', currentUser.id);

      if (error) {
        throw error;
      }

      showMessage(
        'Profile setup complete! Welcome to Arena Nepal.',
        'success'
      );

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error(
        'Profile save error:',
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unable to save your profile.';

      showMessage(
        `Profile setup failed: ${errorMessage}`,
        'error'
      );

      setLoading(false);
    }
  };

  // ============================================================
  // LOGIN VALIDATION
  // ============================================================

  const validateLoginFields = () => {
    if (!email.trim()) {
      showMessage(
        'Please enter your email address.',
        'error'
      );
      return false;
    }

    if (!validateEmail(email)) {
      showMessage(
        'Please enter a valid email address.',
        'error'
      );
      return false;
    }

    if (!password) {
      showMessage(
        'Please enter your password.',
        'error'
      );
      return false;
    }

    if (!robotChecked) {
      showMessage(
        'Please confirm the robot verification.',
        'error'
      );
      return false;
    }

    if (!acceptedTerms) {
      showMessage(
        'Please accept the Terms & Conditions.',
        'error'
      );
      return false;
    }

    return true;
  };

  // ============================================================
  // REGISTER VALIDATION
  // ============================================================

  const validateRegisterFields = () => {
    if (!fullName.trim()) {
      showMessage(
        'Please enter your full name.',
        'error'
      );
      return false;
    }

    if (fullName.trim().length < 2) {
      showMessage(
        'Full name must be at least 2 characters.',
        'error'
      );
      return false;
    }

    if (!nickname.trim()) {
      showMessage(
        'Please enter your gaming nickname.',
        'error'
      );
      return false;
    }

    if (nickname.trim().length < 3) {
      showMessage(
        'Gaming nickname must be at least 3 characters.',
        'error'
      );
      return false;
    }

    if (!email.trim() || !validateEmail(email)) {
      showMessage(
        'Please enter a valid email address.',
        'error'
      );
      return false;
    }

    if (!phone.trim() || !validatePhone(phone)) {
      showMessage(
        'Please enter a valid mobile number.',
        'error'
      );
      return false;
    }

    if (!password) {
      showMessage(
        'Please create a password.',
        'error'
      );
      return false;
    }

    if (password.length < 8) {
      showMessage(
        'Password must contain at least 8 characters.',
        'error'
      );
      return false;
    }

    if (password !== confirmPassword) {
      showMessage(
        'Passwords do not match.',
        'error'
      );
      return false;
    }

    if (!robotChecked) {
      showMessage(
        'Please confirm the robot verification.',
        'error'
      );
      return false;
    }

    if (!acceptedTerms) {
      showMessage(
        'Please accept the Terms & Conditions.',
        'error'
      );
      return false;
    }

    return true;
  };

  // ============================================================
  // SIGN UP
  // ============================================================

  const handleSignUp = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    clearMessage();

    if (!validateRegisterFields()) {
      return;
    }

    setLoading(true);

    try {
      const deviceId = getDeviceId();

      /*
       * One device = one account.
       */
      const {
        data: existingDeviceUsers,
        error: deviceError,
      } = await supabase
        .from('profiles')
        .select('id')
        .eq('device_id', deviceId);

      if (deviceError) {
        console.warn(
          'Signup device check:',
          deviceError.message
        );
      }

      if (
        existingDeviceUsers &&
        existingDeviceUsers.length > 0
      ) {
        showMessage(
          'This device is already linked to an Arena Nepal account.',
          'error'
        );

        setLoading(false);
        return;
      }

      /*
       * Validate referral code before creating the
       * authentication account.
       *
       * This prevents an obvious invalid referral
       * from creating an account first.
       */
      if (referralCode.trim()) {
        const {
          data: referralProfile,
          error: referralLookupError,
        } = await supabase
          .from('profiles')
          .select('id')
          .eq(
            'uid',
            referralCode.trim().toUpperCase()
          )
          .maybeSingle();

        if (referralLookupError) {
          throw new Error(
            'Unable to verify the referral code. Please try again.'
          );
        }

        if (!referralProfile) {
          showMessage(
            'Invalid referral code. Please check the code and try again.',
            'error'
          );

          setLoading(false);
          return;
        }
      }

      const {
        data,
        error,
      } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            nickname: nickname.trim(),
            phone: phone.trim(),
            referral_code:
              referralCode.trim().toUpperCase() || null,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error(
          'Registration could not be completed.'
        );
      }

      /*
       * Update profile created by database trigger.
       */
      const uid = await generateUniqueUid();

      const {
        error: profileError,
      } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          nickname: nickname.trim(),
          phone: phone.trim(),
          uid,
          device_id: deviceId,
        })
        .eq('id', data.user.id);

      if (profileError) {
        throw new Error(
          `Profile setup failed: ${profileError.message}`
        );
      }

      /*
       * IMPORTANT:
       * Create referral through the secure RPC.
       * The RPC uses auth.uid() as referred_user_id,
       * so the browser cannot choose another user ID.
       */
      if (referralCode.trim()) {
        const {
          error: referralError,
        } = await supabase.rpc(
          'create_referral',
          {
            p_referral_code:
              referralCode.trim().toUpperCase(),
          }
        );

        if (referralError) {
          console.error(
            'Referral creation error:',
            referralError
          );

          /*
           * Account itself is already created.
           * We do not delete the account from the browser.
           * Instead, clearly tell the player what happened.
           */
          showMessage(
            'Account created, but the referral could not be linked. Please contact support before making a deposit.',
            'error'
          );

          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
      }

      /*
       * Registration completed.
       * Player must login normally.
       */
      await supabase.auth.signOut();

      setPassword('');
      setConfirmPassword('');
      setAcceptedTerms(false);
      setRobotChecked(false);

      showMessage(
        'Account created successfully! Please login to enter Arena Nepal.',
        'success'
      );

      setTimeout(() => {
        setMode('login');
        setMessage(
          'Your Arena Nepal account is ready. Login to continue.'
        );
        setMessageType('success');
      }, 1300);
    } catch (error) {
      console.error(
        'Signup error:',
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Registration failed.';

      showMessage(
        errorMessage,
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // SIGN IN
  // ============================================================

  const handleSignIn = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    clearMessage();

    if (!validateLoginFields()) {
      return;
    }

    setLoading(true);

    try {
      const {
        data,
        error,
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error(
          'Login could not be completed.'
        );
      }

      await checkProfileDetails(
        data.user.id,
        data.user.email || email.trim()
      );
    } catch (error) {
      console.error(
        'Login error:',
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Login failed.';

      showMessage(
        errorMessage,
        'error'
      );

      setLoading(false);
    }
  };

  // ============================================================
  // SEND PASSWORD RESET EMAIL
  // ============================================================

  const handleForgotPassword = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    clearMessage();

    if (isRecoveryMode) {
      await handleUpdatePassword();
      return;
    }

    if (!email.trim()) {
      showMessage(
        'Enter your email address first.',
        'error'
      );
      return;
    }

    if (!validateEmail(email)) {
      showMessage(
        'Please enter a valid email address.',
        'error'
      );
      return;
    }

    setLoading(true);

    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? window.location.origin
          : undefined;

      const {
        error,
      } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo,
        }
      );

      if (error) {
        throw error;
      }

      showMessage(
        'Password reset instructions have been sent to your email.',
        'success'
      );
    } catch (error) {
      console.error(
        'Password reset error:',
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unable to send password reset email.';

      showMessage(
        errorMessage,
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // UPDATE PASSWORD AFTER RECOVERY
  // ============================================================

  const handleUpdatePassword = async () => {
    clearMessage();

    if (!password) {
      showMessage(
        'Please enter your new password.',
        'error'
      );
      return;
    }

    if (password.length < 8) {
      showMessage(
        'New password must contain at least 8 characters.',
        'error'
      );
      return;
    }

    if (password !== confirmPassword) {
      showMessage(
        'Passwords do not match.',
        'error'
      );
      return;
    }

    setLoading(true);

    try {
      const {
        error,
      } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw error;
      }

      showMessage(
        'Password updated successfully. You can now login with your new password.',
        'success'
      );

      setPassword('');
      setConfirmPassword('');
      setIsRecoveryMode(false);

      setTimeout(() => {
        setMode('login');
        setMessage(
          'Password changed successfully. Please login.'
        );
        setMessageType('success');
      }, 1200);
    } catch (error) {
      console.error(
        'Update password error:',
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unable to update your password.';

      showMessage(
        errorMessage,
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // GOOGLE LOGIN
  // ============================================================

  const handleGoogleSignIn = async () => {
    setLoading(true);
    clearMessage();

    try {
      const {
        data,
        error,
      } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.url) {
        throw new Error(
          'Google login could not be started.'
        );
      }

      const width = 500;
      const height = 650;

      const left =
        window.screenX +
        (window.outerWidth - width) / 2;

      const top =
        window.screenY +
        (window.outerHeight - height) / 2;

      const popup = window.open(
        data.url,
        'ArenaNepalGoogleLogin',
        `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${width},height=${height},top=${top},left=${left}`
      );

      if (!popup) {
        throw new Error(
          'Google login popup was blocked. Please allow popups for Arena Nepal.'
        );
      }

      const checkPopup =
        window.setInterval(async () => {
          if (popup.closed) {
            window.clearInterval(checkPopup);

            const {
              data: sessionData,
            } =
              await supabase.auth.getSession();

            if (
              sessionData.session?.user
            ) {
              await checkProfileDetails(
                sessionData.session.user.id,
                sessionData.session.user
                  .email || ''
              );
            } else {
              setLoading(false);
            }
          }
        }, 1000);
    } catch (error) {
      console.error(
        'Google login error:',
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Google sign-in failed.';

      showMessage(
        errorMessage,
        'error'
      );

      setLoading(false);
    }
  };

  // ============================================================
  // UI CLASSES
  // ============================================================

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-[#08080d]/80 px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none transition-all duration-300 focus:border-yellow-400/70 focus:bg-black focus:ring-2 focus:ring-yellow-400/10';

  const labelClass =
    'mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-gray-400';

  const primaryButtonClass =
    'relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-500 py-3.5 text-xs font-black uppercase tracking-[0.12em] text-black shadow-[0_0_25px_rgba(250,204,21,0.18)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_35px_rgba(250,204,21,0.35)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50';

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="relative w-full">
      <div
        className="
          relative
          mx-auto
          flex
          max-h-[90vh]
          w-full
          max-w-md
          flex-col
          overflow-hidden
          rounded-[24px]
          border
          border-yellow-400/20
          bg-[#050507]
          text-white
          shadow-[0_0_60px_rgba(250,180,0,0.10)]
        "
      >
        {/* BACKGROUND EFFECTS */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="
              absolute
              -left-24
              -top-24
              h-64
              w-64
              animate-pulse
              rounded-full
              bg-yellow-400/10
              blur-[80px]
            "
          />

          <div
            className="
              absolute
              -right-24
              top-1/3
              h-64
              w-64
              animate-pulse
              rounded-full
              bg-cyan-400/10
              blur-[90px]
            "
          />

          <div
            className="
              absolute
              -bottom-32
              left-1/3
              h-64
              w-64
              animate-pulse
              rounded-full
              bg-purple-500/10
              blur-[90px]
            "
          />

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,215,0,0.05),transparent_40%)]" />
        </div>

        {/* HEADER */}

        <div className="relative shrink-0 border-b border-white/[0.06] bg-black/40 px-5 pb-4 pt-5 backdrop-blur-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="
              absolute
              right-3
              top-3
              z-20
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-full
              border
              border-white/10
              bg-white/[0.04]
              text-gray-500
              transition
              hover:border-yellow-400/40
              hover:bg-yellow-400/10
              hover:text-yellow-300
            "
          >
            ×
          </button>

          <div className="mb-3 flex items-center gap-3">
            <div
              className="
                relative
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                border
                border-yellow-400/30
                bg-gradient-to-br
                from-yellow-400/20
                to-orange-500/10
                shadow-[0_0_20px_rgba(250,204,21,0.12)]
              "
            >
              <span className="text-xl">
                ♛
              </span>

              <span className="absolute -right-1 -top-1 h-2 w-2 animate-ping rounded-full bg-cyan-400" />
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-cyan-400" />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-400">
                ARENA NEPAL
              </p>

              <p className="text-[9px] font-medium uppercase tracking-wider text-gray-600">
                Premium Gaming Arena
              </p>
            </div>
          </div>

          <h3 className="pr-8 text-xl font-black tracking-tight text-white">
            {isNewUserSetup
              ? 'Complete Your Profile'
              : isRecoveryMode
              ? 'Create New Password'
              : mode === 'login'
              ? 'Welcome Back, Player'
              : mode === 'register'
              ? 'Create Your Arena'
              : 'Reset Password'}
          </h3>

          <p className="mt-1 pr-8 text-[10px] leading-relaxed text-gray-500">
            {isNewUserSetup
              ? 'Complete your player profile before entering the arena.'
              : isRecoveryMode
              ? 'Choose a new secure password for your Arena Nepal account.'
              : mode === 'login'
              ? 'Secure access to your Arena Nepal gaming account.'
              : mode === 'register'
              ? 'Create your player account and enter the arena.'
              : 'Recover access to your Arena Nepal account.'}
          </p>

          <div className="mt-4 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>

            <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-gray-600">
              Arena servers online
            </span>
          </div>
        </div>

        {/* SCROLLABLE BODY */}

        <div
          className="
            relative
            min-h-0
            flex-1
            overflow-y-auto
            overflow-x-hidden
            overscroll-contain
            px-5
            py-5
            [scrollbar-color:rgba(250,204,21,0.35)_transparent]
            [scrollbar-width:thin]
          "
        >
          {/* MESSAGE */}

          {message && (
            <div
              className={`
                mb-4
                rounded-xl
                border
                px-3.5
                py-3
                text-center
                text-[10px]
                leading-relaxed
                backdrop-blur-md
                ${
                  messageType === 'error'
                    ? 'border-red-500/20 bg-red-500/[0.07] text-red-300'
                    : messageType === 'success'
                    ? 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300'
                    : 'border-yellow-500/20 bg-yellow-500/[0.06] text-yellow-200'
                }
              `}
            >
              {message}
            </div>
          )}

          {/* PROFILE SETUP */}

          {isNewUserSetup ? (
            <form
              onSubmit={handleSaveProfile}
              className="space-y-4"
            >
              <div>
                <label className={labelClass}>
                  Full Name
                </label>

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                  className={inputClass}
                  placeholder="Your full name"
                  autoComplete="name"
                  disabled={loading}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Gaming Nickname
                </label>

                <input
                  type="text"
                  value={nickname}
                  onChange={(e) =>
                    setNickname(e.target.value)
                  }
                  className={inputClass}
                  placeholder="e.g. NeonKing99"
                  autoComplete="nickname"
                  disabled={loading}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Mobile Number
                </label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  className={inputClass}
                  placeholder="+977 98XXXXXXXX"
                  autoComplete="tel"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={primaryButtonClass}
              >
                {loading
                  ? 'Saving Profile...'
                  : 'Enter Arena →'}
              </button>
            </form>
          ) : isRecoveryMode ? (
            /* RECOVERY NEW PASSWORD */

            <form
              onSubmit={handleForgotPassword}
              className="space-y-4"
            >
              <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/[0.03] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-cyan-400">
                    ✦
                  </span>

                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">
                    Secure Password Recovery
                  </span>
                </div>

                <p className="text-[10px] leading-relaxed text-gray-500">
                  Enter your new password below. Your
                  password must contain at least 8
                  characters.
                </p>
              </div>

              <div>
                <label className={labelClass}>
                  New Password
                </label>

                <div className="relative">
                  <input
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    value={password}
                    onChange={(e) =>
                      setPassword(
                        e.target.value
                      )
                    }
                    className={`${inputClass} pr-16`}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-wider text-gray-600 transition hover:text-yellow-300"
                  >
                    {showPassword
                      ? 'Hide'
                      : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Confirm New Password
                </label>

                <div className="relative">
                  <input
                    type={
                      showConfirmPassword
                        ? 'text'
                        : 'password'
                    }
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(
                        e.target.value
                      )
                    }
                    className={`${inputClass} pr-16`}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-wider text-gray-600 transition hover:text-yellow-300"
                  >
                    {showConfirmPassword
                      ? 'Hide'
                      : 'Show'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={primaryButtonClass}
              >
                {loading
                  ? 'Updating Password...'
                  : 'Update Password'}
              </button>
            </form>
          ) : mode === 'forgot' ? (
            /* FORGOT PASSWORD */

            <form
              onSubmit={handleForgotPassword}
              className="space-y-4"
            >
              <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/[0.03] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-cyan-400">
                    ✦
                  </span>

                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">
                    Account Recovery
                  </span>
                </div>

                <p className="text-[10px] leading-relaxed text-gray-500">
                  Enter the email connected to your
                  Arena Nepal account. We&apos;ll send
                  you a secure password reset link.
                </p>
              </div>

              <div>
                <label className={labelClass}>
                  Email Address
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  className={inputClass}
                  placeholder="player@example.com"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={primaryButtonClass}
              >
                {loading
                  ? 'Sending Reset Link...'
                  : 'Send Reset Link'}
              </button>

              <button
                type="button"
                onClick={() =>
                  switchMode('login')
                }
                disabled={loading}
                className="w-full py-2 text-[10px] font-black uppercase tracking-wider text-gray-600 transition hover:text-yellow-300"
              >
                ← Back to Login
              </button>
            </form>
          ) : (
            <>
              {/* MODE TABS */}

              <div className="mb-5 grid grid-cols-2 rounded-xl border border-white/[0.06] bg-black/40 p-1">
                <button
                  type="button"
                  onClick={() =>
                    switchMode('login')
                  }
                  disabled={loading}
                  className={`
                    rounded-lg
                    py-3
                    text-[10px]
                    font-black
                    uppercase
                    tracking-[0.14em]
                    transition-all
                    ${
                      mode === 'login'
                        ? 'bg-gradient-to-r from-yellow-300 to-orange-400 text-black shadow-[0_0_20px_rgba(250,204,21,0.20)]'
                        : 'text-gray-600 hover:text-white'
                    }
                  `}
                >
                  Login
                </button>

                <button
                  type="button"
                  onClick={() =>
                    switchMode('register')
                  }
                  disabled={loading}
                  className={`
                    rounded-lg
                    py-3
                    text-[10px]
                    font-black
                    uppercase
                    tracking-[0.14em]
                    transition-all
                    ${
                      mode === 'register'
                        ? 'bg-gradient-to-r from-cyan-300 to-blue-400 text-black shadow-[0_0_20px_rgba(34,211,238,0.18)]'
                        : 'text-gray-600 hover:text-white'
                    }
                  `}
                >
                  Register
                </button>
              </div>

              {/* GOOGLE */}

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="
                  group
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-3
                  rounded-xl
                  border
                  border-white/10
                  bg-white
                  py-3.5
                  text-xs
                  font-black
                  text-black
                  shadow-lg
                  transition-all
                  duration-300
                  hover:bg-gray-100
                  hover:shadow-[0_0_25px_rgba(255,255,255,0.12)]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <svg
                  className="h-4 w-4 transition-transform duration-300 group-hover:scale-110"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />

                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />

                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />

                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>

                {loading
                  ? 'Connecting...'
                  : 'Continue with Google'}
              </button>

              {/* DIVIDER */}

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[0.06]" />

                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-700">
                  or email
                </span>

                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>

              {/* REGISTER */}

              {mode === 'register' && (
                <form
                  onSubmit={handleSignUp}
                  className="space-y-4"
                >
                  <div>
                    <label className={labelClass}>
                      Full Name
                    </label>

                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) =>
                        setFullName(e.target.value)
                      }
                      className={inputClass}
                      placeholder="Your full name"
                      autoComplete="name"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Gaming Nickname
                    </label>

                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) =>
                        setNickname(e.target.value)
                      }
                      className={inputClass}
                      placeholder="e.g. NeonKing99"
                      autoComplete="nickname"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Email Address
                    </label>

                    <input
                      type="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      className={inputClass}
                      placeholder="player@example.com"
                      autoComplete="email"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Mobile Number
                    </label>

                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) =>
                        setPhone(e.target.value)
                      }
                      className={inputClass}
                      placeholder="+977 98XXXXXXXX"
                      autoComplete="tel"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Password
                    </label>

                    <div className="relative">
                      <input
                        type={
                          showPassword
                            ? 'text'
                            : 'password'
                        }
                        value={password}
                        onChange={(e) =>
                          setPassword(
                            e.target.value
                          )
                        }
                        className={`${inputClass} pr-16`}
                        placeholder="Minimum 8 characters"
                        autoComplete="new-password"
                        disabled={loading}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            !showPassword
                          )
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-wider text-gray-600 transition hover:text-yellow-300"
                      >
                        {showPassword
                          ? 'Hide'
                          : 'Show'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Confirm Password
                    </label>

                    <div className="relative">
                      <input
                        type={
                          showConfirmPassword
                            ? 'text'
                            : 'password'
                        }
                        value={confirmPassword}
                        onChange={(e) =>
                          setConfirmPassword(
                            e.target.value
                          )
                        }
                        className={`${inputClass} pr-16`}
                        placeholder="Repeat your password"
                        autoComplete="new-password"
                        disabled={loading}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(
                            !showConfirmPassword
                          )
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-wider text-gray-600 transition hover:text-yellow-300"
                      >
                        {showConfirmPassword
                          ? 'Hide'
                          : 'Show'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Referral Code
                      <span className="ml-1 normal-case tracking-normal text-gray-700">
                        optional
                      </span>
                    </label>

                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) =>
                        setReferralCode(
                          e.target.value.toUpperCase()
                        )
                      }
                      className={inputClass}
                      placeholder="Enter referral code"
                      disabled={loading}
                    />
                  </div>

                  {/* ROBOT */}

                  <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/[0.025] p-3.5">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={robotChecked}
                        onChange={(e) =>
                          setRobotChecked(
                            e.target.checked
                          )
                        }
                        disabled={loading}
                        className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-yellow-400 focus:ring-yellow-400"
                      />

                      <span className="text-[10px] font-semibold text-gray-300">
                        I&apos;m not a robot
                      </span>

                      <span className="ml-auto rounded-md border border-cyan-400/10 px-2 py-1 text-[7px] font-black uppercase tracking-wider text-cyan-500/70">
                        Verify
                      </span>
                    </label>
                  </div>

                  {/* TERMS */}

                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) =>
                        setAcceptedTerms(
                          e.target.checked
                        )
                      }
                      disabled={loading}
                      className="mt-0.5 h-4 w-4 rounded border-gray-700 bg-gray-900 text-yellow-400 focus:ring-yellow-400"
                    />

                    <span className="text-[9px] leading-relaxed text-gray-600">
                      I agree to Arena Nepal&apos;s{' '}
                      <span className="font-bold text-yellow-500">
                        Terms &amp; Conditions
                      </span>{' '}
                      and platform rules.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className={primaryButtonClass}
                  >
                    {loading
                      ? 'Creating Account...'
                      : 'Create Arena Account'}
                  </button>
                </form>
              )}

              {/* LOGIN */}

              {mode === 'login' && (
                <form
                  onSubmit={handleSignIn}
                  className="space-y-4"
                >
                  <div>
                    <label className={labelClass}>
                      Email Address
                    </label>

                    <input
                      type="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      className={inputClass}
                      placeholder="player@example.com"
                      autoComplete="email"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">
                        Password
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          switchMode('forgot')
                        }
                        disabled={loading}
                        className="text-[9px] font-black uppercase tracking-wider text-yellow-500 transition hover:text-yellow-300"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={
                          showPassword
                            ? 'text'
                            : 'password'
                        }
                        value={password}
                        onChange={(e) =>
                          setPassword(
                            e.target.value
                          )
                        }
                        className={`${inputClass} pr-16`}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        disabled={loading}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            !showPassword
                          )
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-wider text-gray-600 transition hover:text-yellow-300"
                      >
                        {showPassword
                          ? 'Hide'
                          : 'Show'}
                      </button>
                    </div>
                  </div>

                  {/* ROBOT */}

                  <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/[0.025] p-3.5">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={robotChecked}
                        onChange={(e) =>
                          setRobotChecked(
                            e.target.checked
                          )
                        }
                        disabled={loading}
                        className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-yellow-400 focus:ring-yellow-400"
                      />

                      <span className="text-[10px] font-semibold text-gray-300">
                        I&apos;m not a robot
                      </span>

                      <span className="ml-auto rounded-md border border-cyan-400/10 px-2 py-1 text-[7px] font-black uppercase tracking-wider text-cyan-500/70">
                        Verify
                      </span>
                    </label>
                  </div>

                  {/* TERMS */}

                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) =>
                        setAcceptedTerms(
                          e.target.checked
                        )
                      }
                      disabled={loading}
                      className="mt-0.5 h-4 w-4 rounded border-gray-700 bg-gray-900 text-yellow-400 focus:ring-yellow-400"
                    />

                    <span className="text-[9px] leading-relaxed text-gray-600">
                      I agree to Arena Nepal&apos;s{' '}
                      <span className="font-bold text-yellow-500">
                        Terms &amp; Conditions
                      </span>{' '}
                      and platform rules.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className={primaryButtonClass}
                  >
                    {loading
                      ? 'Authenticating...'
                      : 'Enter Arena →'}
                  </button>
                </form>
              )}

              {/* BOTTOM SWITCH */}

              <div className="mt-6 border-t border-white/[0.05] pt-5 text-center">
                {mode === 'login' ? (
                  <p className="text-[10px] text-gray-600">
                    New to Arena Nepal?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        clearMessage();
                      }}
                      disabled={loading}
                      className="font-black uppercase tracking-wider text-cyan-400 transition hover:text-cyan-300"
                    >
                      Create Account
                    </button>
                  </p>
                ) : (
                  <p className="text-[10px] text-gray-600">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        clearMessage();
                        setIsRecoveryMode(false);
                      }}
                      disabled={loading}
                      className="font-black uppercase tracking-wider text-yellow-400 transition hover:text-yellow-300"
                    >
                      Login
                    </button>
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}

        <div className="relative shrink-0 border-t border-white/[0.05] bg-black/40 px-5 py-3 text-center backdrop-blur-xl">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[9px] text-gray-700">
              🔒
            </span>

            <p className="text-[7px] font-black uppercase tracking-[0.18em] text-gray-700">
              Secure Arena Access
            </p>

            <span className="text-gray-800">
              •
            </span>

            <p className="text-[7px] font-black uppercase tracking-[0.18em] text-gray-700">
              Arena Nepal
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}