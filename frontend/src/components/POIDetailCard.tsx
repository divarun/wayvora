"use client";
import { useState } from "react";
import { POI } from "@/types";
import { CATEGORY_CONFIG } from "@/utils/constants";
import { useFavorites } from "@/hooks/useFavorites";
import { aiApi } from "@/services/api";

interface POIDetailCardProps {
  poi: POI;
  onClose: () => void;
  onAddToPlanner: (poi: POI) => void;
}

export default function POIDetailCard({ poi, onClose, onAddToPlanner }: POIDetailCardProps) {
  const cfg = CATEGORY_CONFIG[poi.category];
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const [aiTips, setAiTips] = useState<{ description: string; tips: string[]; localInsights: string } | null>(null);
  const [loadingTips, setLoadingTips] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const toggleFav = async () => {
    if (isFavorite(poi.id)) {
      await removeFavorite(poi.id);
    } else {
      await addFavorite(poi);
    }
  };

  const fetchTips = async () => {
    if (aiTips) return;
    setLoadingTips(true);
    setAiError(null);
    try {
      const result = await aiApi.getTravelTips({
        name: poi.name,
        category: poi.category,
        address: poi.address,
      });
      setAiTips(result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI service unavailable");
    } finally {
      setLoadingTips(false);
    }
  };

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < full ? "text-amber-400" : half && i === full ? "text-amber-400 opacity-60" : "text-slate-600"}>
            ★
          </span>
        ))}
        <span className="text-slate-500 text-xs ml-1.5">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/[0.5] backdrop-blur-sm">
      <div className="glass w-full max-w-md mx-0 sm:mx-4 rounded-t-3xl sm:rounded-3xl border border-white/[0.08] shadow-glass animate-slide-up sm:animate-fade-in max-h-[90vh] overflow-y-auto">
        {/* Color accent strip */}
        <div className="h-1.5 rounded-t-3xl sm:rounded-t-3xl" style={{ background: `linear-gradient(90deg, ${cfg.markerColor}, transparent)` }} />

        <div className="p-5">
          {/* Top row */}
          <div className="flex items-start justify-between mb-3">
            <span className={`badge ${cfg.bgColor} ${cfg.borderColor} border ${cfg.color}`}>
              <span>{cfg.emoji}</span>
              <span>{cfg.label.replace(/s$/, "")}</span>
            </span>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">✕</button>
          </div>

          {/* Name & Rating */}
          <h2 className="font-display text-xl font-semibold text-white mb-1">{poi.name}</h2>
          {poi.rating && <div className="mb-2">{renderStars(poi.rating)}</div>}

          {/* Address */}
          <div className="flex items-start gap-2 text-slate-400 text-sm mb-4">
            <span className="text-slate-500 mt-0.5">📍</span>
            <p>{poi.address}</p>
          </div>

          {/* Opening hours */}
          {poi.openingHours && (
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
              <span className="text-slate-500">⏰</span>
              <p className="italic">{poi.openingHours}</p>
            </div>
          )}

          {/* Tags */}
          {poi.tags && poi.tags.length > 0 && (
            <div className="flex gap-1.5 mb-4">
              {poi.tags.map((tag) => (
                <span key={tag} className="badge bg-white/[0.06] border border-white/[0.08] text-slate-400">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2.5 mb-5">
            <button
              onClick={toggleFav}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                isFavorite(poi.id)
                  ? "bg-coral-500/[0.15] border-coral-500/[0.3] text-coral-400"
                  : "bg-white/[0.06] border-white/[0.1] text-slate-300 hover:text-white hover:bg-white/[0.1]"
              }`}
            >
              <span>{isFavorite(poi.id) ? "♥" : "♡"}</span>
              <span>{isFavorite(poi.id) ? "Saved" : "Save"}</span>
            </button>
            <button
              onClick={() => { onAddToPlanner(poi); onClose(); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-ocean-600/[0.2] border border-ocean-600/[0.3] text-ocean-300 hover:text-white hover:bg-ocean-600/[0.35] text-sm font-semibold transition-all duration-200"
            >
              <span>+</span>
              <span>Add to Plan</span>
            </button>
          </div>

          {/* AI Travel Tips */}
          <div className="border-t border-white/[0.06] pt-4">
            <button
              onClick={fetchTips}
              disabled={loadingTips}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all disabled:opacity-60"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                <span className="text-base">✨</span>
                <span>AI Travel Insights</span>
              </span>
              <span className="text-slate-500 text-xs">{loadingTips ? "..." : aiTips ? "▲" : "▼"}</span>
            </button>

            {aiError && (
              <div className="mt-2 bg-red-500/[0.1] border border-red-500/[0.2] rounded-lg px-3 py-2">
                <p className="text-red-400 text-xs">{aiError}</p>
              </div>
            )}

            {aiTips && (
              <div className="mt-3 space-y-3 animate-fade-in">
                <p className="text-slate-300 text-sm leading-relaxed">{aiTips.description}</p>
                <div className="bg-ocean-500/[0.08] border border-ocean-500/[0.15] rounded-lg p-3">
                  <p className="text-ocean-300 text-xs font-semibold mb-2">💡 Local Insights</p>
                  <p className="text-slate-400 text-xs leading-relaxed">{aiTips.localInsights}</p>
                </div>
                {aiTips.tips.length > 0 && (
                  <div className="bg-white/[0.04] rounded-lg p-3">
                    <p className="text-slate-400 text-xs font-semibold mb-2">📝 Tips</p>
                    <ul className="space-y-1.5">
                      {aiTips.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-ocean-400 text-xs mt-0.5">•</span>
                          <span className="text-slate-400 text-xs">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
