
import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "./context/LanguageContext";

export const metadata: Metadata = {
  metadataBase: new URL("https://arenanepal.xyz"),

  title: {
    default: "Arena Nepal",
    template: "%s | Arena Nepal",
  },

  description:
    "Welcome to Arena Nepal. Explore games, tournaments, rewards, and your gaming experience in one place.",

  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },

  openGraph: {
    title: "Arena Nepal",
    description:
      "Explore games, tournaments, rewards, and your gaming experience with Arena Nepal.",
    url: "https://arenanepal.xyz",
    siteName: "Arena Nepal",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "Arena Nepal",
      },
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Arena Nepal",
    description:
      "Explore games, tournaments, and rewards with Arena Nepal.",
    images: ["/icon.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Arena Nepal",
  url: "https://arenanepal.xyz",
  potentialAction: [
    {
      "@type": "ViewAction",
      name: "Download App",
      target: "https://arenanepal.xyz/#download",
    },
    {
      "@type": "ViewAction",
      name: "Login / Register",
      target: "https://arenanepal.xyz/login",
    },
    {
      "@type": "ViewAction",
      name: "About Us",
      target: "https://arenanepal.xyz/about",
    },
    {
      "@type": "ViewAction",
      name: "Help Center",
      target: "https://arenanepal.xyz/help",
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
        <link rel="icon" href="/icon.png" />
        <link rel="shortcut icon" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
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