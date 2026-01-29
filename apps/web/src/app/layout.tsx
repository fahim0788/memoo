import "./globals.css";
import { PwaBoot } from "../lib/pwa-boot";

export const metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "MemoList",
  description: "MVP learning platform (offline-first) with spaced repetition."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0b0f17" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MemoList" />
      </head>
      <body>
        <PwaBoot />
        {children}
      </body>
    </html>
  );
}
