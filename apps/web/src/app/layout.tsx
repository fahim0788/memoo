import "./globals.css";
import { PwaBoot } from "../lib/pwa-boot";
import { AuthProvider } from "../contexts/AuthContext";

export const metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "Memoo",
  description: "MVP learning platform (offline-first) with spaced repetition.",
  icons: {
    icon: "/favicon.png",
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0b0f17" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Memoo" />
      </head>
      <body>
        <AuthProvider>
          <PwaBoot />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
