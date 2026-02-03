"use client";
import "@/styles/globals.css";
import { AuthProvider } from "@/hooks/useAuth";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Wayvora — Smart Local Explorer</title>
        <meta name="description" content="Discover, explore, and plan your local adventures with AI-powered insights." />
      </head>
      <body className="min-h-screen bg-slate-950 text-white font-body">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
