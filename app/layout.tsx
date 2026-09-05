import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Arena Nepal - Play Games, Tournaments & Win Rewards',
  description: 'Arena Nepal is the ultimate esports and gaming platform in Nepal. Play neon games, join tournaments, and win cash via eSewa.',
  keywords: 'Arena Nepal, play and earn Nepal, eSewa gaming app, Nepal esports, neon games',
  authors: [{ name: 'Arena Nepal' }],
  verification: {
    google: 'Rb4IJZxa0zGgnfx9zJGXsjrNLHHEoBaz1aw6REtTghw',
  },
  openGraph: {
    title: 'Arena Nepal - Play Games & Win Cash',
    description: 'Join tournaments and win exciting cash prizes in Nepal.',
    url: 'https://arena-nepal-game-r7t3.vercel.app',
    siteName: 'Arena Nepal',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}