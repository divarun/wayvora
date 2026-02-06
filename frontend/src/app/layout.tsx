"use client";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { useEffect, useState } from "react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Prevent hydration mismatch by only rendering after mount
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <title>Wayvora - Smart Local Explorer</title>
        <meta name="description" content="Discover, explore, and plan your local adventures with AI-powered insights." />
      </head>
      <body
        className={`min-h-screen bg-slate-950 text-white font-body ${inter.variable}`}
        suppressHydrationWarning
      >
        {!mounted ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-pulse text-slate-400">Loading...</div>
          </div>
        ) : (
          <AuthProvider>{children}</AuthProvider>
        )}
      </body>
    </html>
  );
}