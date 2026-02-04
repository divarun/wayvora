"use client";
import { ExplorerTitle } from "@/types/gamification";

export function LevelUpModal({
  newLevel,
  level,
  onClose
}: {
  newLevel: ExplorerTitle;
  level: number;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/[0.7]" onClick={onClose}>
      <div
        className="glass-card p-8 max-w-md mx-4 text-center animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-6xl mb-4 animate-float">🎉</div>
        <h2 className="text-gradient font-display text-3xl font-bold mb-2">
          Level Up!
        </h2>
        <p className="text-white text-xl font-semibold mb-4">
          You're now a {newLevel}!
        </p>
        <p className="text-slate-400 text-sm mb-6">
          Level {level} • Keep exploring to unlock more features
        </p>
        <button onClick={onClose} className="btn-primary w-full">
          Continue Exploring
        </button>
      </div>
    </div>
  );
}