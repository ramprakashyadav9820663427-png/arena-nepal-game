// lib/wallet.ts

export const getWalletBalance = (): number => {
    if (typeof window === 'undefined') return 1000;
    const saved = localStorage.getItem('arena_red_diamonds');
    return saved ? parseInt(saved, 10) : 1000;
  };
  
  export const updateWalletBalance = (amountChange: number): number => {
    if (typeof window === 'undefined') return 0;
    const current = getWalletBalance();
    const updated = Math.max(0, current + amountChange);
    
    localStorage.setItem('arena_red_diamonds', updated.toString());
    
    // Custom event taaki lobby, header aur saare games ko turant naya balance pata chal jaye
    window.dispatchEvent(new CustomEvent('walletUpdated', { detail: updated }));
    
    return updated;
  };