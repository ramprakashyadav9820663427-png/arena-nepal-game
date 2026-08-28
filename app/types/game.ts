export type TabType = 'game' | 'tournament' | 'rank' | 'wallet';

export interface UserWallet {
  redDiamonds: number;
  whiteDiamonds: number;
}

export interface Tournament {
  id: string;
  title: string;
  entryFee: number;
  prizePool: number;
  timeLeft: string;
  participants: number;
}
