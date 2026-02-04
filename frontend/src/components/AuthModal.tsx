"use client";
import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const { user, login, register, logout } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    setError(null);
    if (!email.includes("@") || password.length < 4) {
      setError("Please enter a valid email and password (min 4 chars).");
      return;
    }
    setLoading(true);
    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/[0.6]" onClick={onClose}>
        <div className="glass glass-card w-full max-w-sm mx-4 p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-lg font-semibold text-white">Your Account</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
          </div>
          <div className="flex items-center gap-3 bg-white/[0.05] rounded-xl p-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-ocean-500 flex items-center justify-center text-white font-bold text-sm">
              {user.email[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-white text-sm font-semibold">{user.email.split("@")[0]}</p>
              <p className="text-slate-500 text-xs">{user.email}</p>
            </div>
          </div>
          <div className="bg-ocean-500/[0.1] border border-ocean-500/[0.2] rounded-lg p-3 mb-5">
            <p className="text-ocean-300 text-xs">
              ✓ Your favorites and itineraries are synced to your account.
            </p>
          </div>
          <button
            onClick={() => { logout(); onClose(); }}
            className="w-full py-2.5 rounded-xl bg-slate-800 border border-white/[0.1] text-slate-300 hover:text-white hover:bg-slate-700 transition-all text-sm font-semibold"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/[0.6]" onClick={onClose}>
      <div className="glass glass-card w-full max-w-sm mx-4 p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-lg font-semibold text-white">
            {tab === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>
        <p className="text-slate-500 text-xs mb-5">
          {tab === "login"
            ? "Sign in to sync your data across devices"
            : "Create an account to persist your favorites and plans"}
        </p>

        {/* Tab Switch */}
        <div className="flex gap-1 bg-white/[0.04] rounded-lg p-1 mb-5">
          <button
            onClick={() => { setTab("login"); setError(null); }}
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
              tab === "login"
                ? "bg-white/[0.1] text-white"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab("register"); setError(null); }}
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
              tab === "register"
                ? "bg-white/[0.1] text-white"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-glass"
            disabled={loading}
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-glass"
            disabled={loading}
            autoComplete={tab === "login" ? "current-password" : "new-password"}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />

          {error && (
            <div className="bg-red-500/[0.1] border border-red-500/[0.2] rounded-lg px-3 py-2">
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full btn-primary py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : tab === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>

        <p className="text-slate-600 text-xs text-center mt-4">
          An account is entirely optional. All features work without one.
        </p>
      </div>
    </div>
  );
}
