"use client";
import { useAuth } from "@/hooks/useAuth";

interface NavbarProps {
  mode: "explorer" | "planner";
  onModeChange: (mode: "explorer" | "planner") => void;
  onAuthClick: () => void;
  showPassport: boolean;
  onTogglePassport: () => void;
}

export default function Navbar({ mode, onModeChange, onAuthClick, showPassport, onTogglePassport }: NavbarProps) {
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/[0.7] backdrop-blur-2xl border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-ocean-400 to-ocean-600 flex items-center justify-center shadow-glow">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">
              <span className="text-gradient">Way</span>
              <span className="text-white">vora</span>
            </span>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-1 bg-white/[0.05] rounded-xl p-1 border border-white/[0.06]">
            <button
              onClick={() => onModeChange("explorer")}
              className={`relative px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                mode === "explorer"
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              {mode === "explorer" && (
                <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-ocean-600 to-ocean-500 shadow-glow" />
              )}
              <span className="relative flex items-center gap-1.5">
                <span>🧭</span> Explorer
              </span>
            </button>
            <button
              onClick={() => onModeChange("planner")}
              className={`relative px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                mode === "planner"
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              {mode === "planner" && (
                <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-coral-600 to-coral-500 shadow-glow-coral" />
              )}
              <span className="relative flex items-center gap-1.5">
                <span>🗺️</span> Planner
              </span>
            </button>
          </div>

        <button
          onClick={onTogglePassport}
          className={`glass rounded-full px-3 py-1.5 border transition-all flex items-center gap-2 ${
            showPassport
              ? "border-ocean-500/[0.3] bg-ocean-500/[0.15]"
              : "border-white/[0.08] hover:border-white/[0.15]"
          }`}>
          <span>📖</span>
          <span className={`text-xs font-semibold ${showPassport ? "text-ocean-300" : "text-slate-300"}`}>
            Passport
          </span>
        </button>

          {/* Auth */}
          <button
            onClick={onAuthClick}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border transition-all duration-200 text-sm font-semibold ${
              user
                ? "bg-white/[0.06] border-white/[0.1] text-emerald-400 hover:bg-white/[0.1]"
                : "bg-ocean-600/[0.2] border-ocean-600/[0.3] text-ocean-300 hover:bg-ocean-600/[0.35]"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${user ? "bg-emerald-400" : "bg-slate-500"}`} />
            {user ? user.email.split("@")[0] : "Guest"}
          </button>
        </div>
      </div>
    </nav>
  );
}