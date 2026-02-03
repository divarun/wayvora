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

  // During SSR and before hydration, render a minimal shell
  if (!mounted) {
    return (
      <html lang="en" className="dark">
        <head>
          <title>Wayvora - Smart Local Explorer</title>
          <meta name="description" content="Discover, explore, and plan your local adventures with AI-powered insights." />
        </head>
        <body className="min-h-screen bg-slate-950 text-white font-body">
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-pulse text-slate-400">Loading...</div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" className="dark">
      <head>
        <title>Wayvora - Smart Local Explorer</title>
        <meta name="description" content="Discover, explore, and plan your local adventures with AI-powered insights." />
      </head>
      <body className={`min-h-screen bg-slate-950 text-white font-body ${inter.variable}`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
