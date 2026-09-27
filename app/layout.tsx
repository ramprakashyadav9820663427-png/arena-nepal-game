import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from './context/LanguageContext';

export const metadata: Metadata = {
  metadataBase: new URL('https://arenanepal.xyz'),

  title: {
    default: 'Arena Nepal',
    template: '%s | Arena Nepal',
  },

  description:
    'Welcome to Arena Nepal. Explore games, tournaments, rewards, and your gaming experience in one place.',

  manifest: '/manifest.json',

  icons: {
    icon: [{ url: '/arena-nepal-logo.jpg', type: 'image/jpeg' }],
    shortcut: '/arena-nepal-logo.jpg',
    apple: '/arena-nepal-logo.jpg',
  },

  openGraph: {
    title: 'Arena Nepal',
    description:
      'Explore games, tournaments, rewards, and your gaming experience with Arena Nepal.',
    url: 'https://arenanepal.xyz',
    siteName: 'Arena Nepal',
    images: [
      {
        url: '/arena-nepal-logo.jpg',
        width: 512,
        height: 512,
        alt: 'Arena Nepal',
      },
    ],
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Arena Nepal',
    description:
      'Explore games, tournaments, and rewards with Arena Nepal.',
    images: ['/arena-nepal-logo.jpg'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Arena Nepal',
  url: 'https://arenanepal.xyz',
  potentialAction: [
    {
      '@type': 'ViewAction',
      name: 'Download App',
      target: 'https://arenanepal.xyz/#download',
    },
    {
      '@type': 'ViewAction',
      name: 'Login / Register',
      target: 'https://arenanepal.xyz',
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#050508" />
        <link rel="icon" href="/arena-nepal-logo.jpg" type="image/jpeg" />
        <link rel="shortcut icon" href="/arena-nepal-logo.jpg" />
        <link rel="apple-touch-icon" href="/arena-nepal-logo.jpg" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />
      </head>

      <body>
        <LanguageProvider>
          <div>{children}</div>
        </LanguageProvider>
      </body>
    </html>
  );
}