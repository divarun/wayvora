"use client";
import { Achievement } from "@/types/gamification";
import { useEffect, useState } from "react";

export function AchievementToast({ achievement, onClose }: { achievement: Achievement; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-20 right-3 z-50 glass-card p-4 animate-slide-in-right max-w-sm">
      <div className="flex items-start gap-3">
        <span className="text-4xl">{achievement.iconEmoji}</span>
        <div className="flex-1">
          <p className="text-ocean-300 text-xs font-semibold uppercase mb-1">
            Achievement Unlocked!
          </p>
          <p className="text-white font-semibold text-sm">{achievement.name}</p>
          <p className="text-slate-400 text-xs mt-1">{achievement.description}</p>
          <p className="text-ocean-400 text-xs mt-2">+{achievement.reward.xp} XP</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white">✕</button>
      </div>
    </div>
  );
}