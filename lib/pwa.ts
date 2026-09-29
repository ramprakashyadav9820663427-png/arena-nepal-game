// Shared PWA helpers: service-worker registration + the "Install App" prompt.

type InstallEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  };
  
  let deferred: InstallEvent | null = null;
  let started = false;
  const listeners = new Set<() => void>();
  
  const notify = () => listeners.forEach((l) => l());
  
  export function initPWA() {
    if (typeof window === 'undefined' || started) return;
    started = true;
  
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferred = e as InstallEvent;
      notify();
    });
  
    window.addEventListener('appinstalled', () => {
      deferred = null;
      notify();
    });
  
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/arena-sw.js').catch(() => {
        // registration problems must never break the app
      });
    }
  }
  
  export function subscribeInstall(cb: () => void) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }
  
  export function canInstallNow() {
    return deferred !== null;
  }
  
  export function isStandalone() {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
    );
  }
  
  export function isIOS() {
    if (typeof navigator === 'undefined') return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }
  
  export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!deferred) return 'unavailable';
    const ev = deferred;
    deferred = null;
    notify();
    try {
      await ev.prompt();
      const choice = await ev.userChoice;
      return choice.outcome;
    } catch {
      return 'unavailable';
    }
  }
  
  export function installHint() {
    return isIOS()
      ? 'iPhone: Safari mein Share (⬆️) dabao, phir "Add to Home Screen" chuno.'
      : 'Chrome ke menu (⋮) mein "Install app" ya "Add to Home screen" chuno.';
  }