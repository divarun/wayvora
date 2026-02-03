"use client";
import { useState, useCallback } from "react";
import { POI } from "@/types";
import { aiApi } from "@/services/api";
import { CATEGORY_CONFIG } from "@/utils/constants";

interface AIRecommendation {
  name: string;
  category: string;
  reason: string;
}

interface AIRecommendPanelProps {
  selectedPois: POI[];
  onAddToPlanner: (poi: Partial<POI>) => void;
}

export default function AIRecommendPanel({ selectedPois, onAddToPlanner }: AIRecommendPanelProps) {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState("");
  const [fetched, setFetched] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFetched(true);
    try {
      const input = selectedPois.map((p) => ({
        name: p.name,
        category: p.category,
        address: p.address,
      }));
      const result = await aiApi.getRecommendations(input, preferences || undefined);
      setRecommendations(result.recommendations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI service is unavailable.");
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [selectedPois, preferences]);

  const cfg = (cat: string) =>
    CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.attraction;

  return (
    <div className="bg-slate-900/[0.85] backdrop-blur-xl border-l border-white/[0.06] flex flex-col h-full">
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">✨</span>
          <h3 className="text-white font-semibold text-sm">AI Recommendations</h3>
        </div>
        <p className="text-slate-500 text-xs mb-3 leading-relaxed">
          Get personalized place suggestions powered by a local Ollama LLM based on your current route.
        </p>

        <textarea
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
          placeholder="Optional: describe preferences (e.g. 'budget-friendly', 'family-friendly')…"
          rows={2}
          className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-white placeholder-slate-500 text-xs resize-none focus:border-ocean-500 focus:bg-white/[0.1] transition-all"
        />

        <button
          onClick={fetchRecommendations}
          disabled={loading || selectedPois.length === 0}
          className="w-full mt-2 btn-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs"
        >
          {loading ? (
            <>
              <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Generating…
            </>
          ) : (
            "Get AI Suggestions"
          )}
        </button>

        {selectedPois.length === 0 && (
          <p className="text-slate-600 text-xs text-center mt-2">Add at least one stop to your plan first.</p>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {error && (
          <div className="bg-red-500/[0.1] border border-red-500/[0.2] rounded-lg px-3 py-2">
            <p className="text-red-400 text-xs">{error}</p>
            <p className="text-red-500 text-[10px] mt-0.5">Make sure Ollama is running locally.</p>
          </div>
        )}

        {fetched && !loading && !error && recommendations.length === 0 && (
          <p className="text-slate-600 text-xs text-center py-4">No recommendations returned.</p>
        )}

        {recommendations.map((rec, i) => {
          const c = cfg(rec.category);
          return (
            <div
              key={i}
              className="glass glass-card p-3 animate-fade-in"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">{c.emoji}</span>
                  <span className="text-white text-sm font-semibold">{rec.name}</span>
                </div>
                <button
                  onClick={() =>
                    onAddToPlanner({
                      id: `ai-rec-${i}-${Date.now()}`,
                      name: rec.name,
                      category: rec.category as any,
                      address: "Suggested by AI",
                      coordinates: { lat: 0, lng: 0 },
                    })
                  }
                  className="text-ocean-400 text-xs font-semibold hover:text-ocean-300 transition-colors"
                >
                  + Add
                </button>
              </div>
              <span className={`badge ${c.bgColor} ${c.borderColor} border ${c.color} text-[10px]`}>
                {rec.category}
              </span>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">{rec.reason}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
