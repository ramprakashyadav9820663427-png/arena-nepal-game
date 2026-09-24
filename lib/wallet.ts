/**
 * lib/wallet.ts
 * Single Source of Truth for Red Diamond balance
 * LocalStorage + Custom Event based global sync
 */

const STORAGE_KEY = 'arena_red_diamonds';
const LEGACY_KEYS = ['arena_red_dias', 'arena_diamond', 'arena_cash'];

/**
 * वर्तमान ग्लोबल बैलेंस पढ़ो
 */
export function getGlobalBalance(): number {
  if (typeof window === 'undefined') return 0;

  try {
    const primary = localStorage.getItem(STORAGE_KEY);
    if (primary !== null) {
      return Math.max(0, parseInt(primary, 10) || 0);
    }

    // पुराने keys से migrate करो
    for (const key of LEGACY_KEYS) {
      const val = localStorage.getItem(key);
      if (val !== null) {
        const num = Math.max(0, parseInt(val, 10) || 0);
        localStorage.setItem(STORAGE_KEY, num.toString());
        return num;
      }
    }

    return 0;
  } catch {
    return 0;
  }
}

/**
 * ग्लोबल बैलेंस अपडेट करो और पूरे ऐप को notify करो
 * @param newBalance - नया absolute बैलेंस (delta नहीं)
 */
export function updateGlobalBalance(newBalance: number): void {
  if (typeof window === 'undefined') return;

  const safeBalance = Math.max(0, Math.floor(Number(newBalance) || 0));

  try {
    localStorage.setItem(STORAGE_KEY, safeBalance.toString());
    LEGACY_KEYS.forEach((key) => {
      localStorage.setItem(key, safeBalance.toString());
    });
  } catch {
    // ignore
  }

  // पूरे ऐप को बताओ कि बैलेंस बदल गया
  window.dispatchEvent(
    new CustomEvent('walletUpdated', {
      detail: {
        balance: safeBalance,
        redDiamonds: safeBalance,
      },
    })
  );

  window.dispatchEvent(new Event('walletUpdated'));
  window.dispatchEvent(new Event('storage'));
}

/**
 * पुराने कोड के लिए compatibility
 */
export function getWalletBalance(): number {
  return getGlobalBalance();
}

/**
 * पुराने गेम कंपोनेंट्स के लिए (amount positive = add, negative = deduct)
 */
export function updateWalletBalance(amount: number, _userId?: string): number {
  const current = getGlobalBalance();
  const next =
    amount < 0
      ? Math.max(0, current - Math.abs(amount))
      : current + Math.abs(amount);

  updateGlobalBalance(next);
  return next;
}