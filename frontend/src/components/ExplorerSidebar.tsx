"use client";
import { useState } from "react";
import { POI } from "@/types";
import { CATEGORY_CONFIG } from "@/utils/constants";
import { useFavorites } from "@/hooks/useFavorites";
import { geocodeSearch } from "@/services/nominatim";

interface ExplorerSidebarProps {
  pois: POI[];
  loading: boolean;
  error: string | null;
  onPoiClick: (poi: POI) => void;
  onSearchResult: (lat: number, lng: number) => void;
  onAddToPlanner: (poi: POI) => void;
}

export default function ExplorerSidebar({
  pois,
  loading,
  error,
  onPoiClick,
  onSearchResult,
  onAddToPlanner,
}: ExplorerSidebarProps) {
  const [search, setSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<{ displayName: string; lat: number; lng: number }[]>([]);
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearchLoading(true);
    setSearchResults([]);
    try {
      const results = await geocodeSearch(search, 5);
      setSearchResults(
        results.map((r) => ({
          displayName: r.displayName.split(",").slice(0, 3).join(","),
          lat: r.coordinates.lat,
          lng: r.coordinates.lng,
        }))
      );
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const filteredPois = search.trim()
    ? pois.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : pois;

  return (
    <div className="flex flex-col h-full bg-slate-900/[0.85] backdrop-blur-xl border-r border-white/[0.06]">
      {/* Search */}
      <div className="p-3 border-b border-white/[0.06]">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (!e.target.value.trim()) setSearchResults([]); }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search places…"
            className="input-glass flex-1 py-2"
          />
          <button
            onClick={handleSearch}
            disabled={searchLoading || !search.trim()}
            className="px-3 rounded-xl bg-ocean-600/[0.25] border border-ocean-600/[0.3] text-ocean-300 hover:bg-ocean-600/[0.4] disabled:opacity-40 transition-all"
          >
            {searchLoading ? "…" : "🔍"}
          </button>
        </div>

        {/* Geocode dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-slate-900 border border-white/[0.08] rounded-xl overflow-hidden shadow-glass">
            {searchResults.map((r, i) => (
              <button
                key={i}
                onClick={() => { onSearchResult(r.lat, r.lng); setSearchResults([]); }}
                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.08] transition-colors border-b border-white/[0.04] last:border-0"
              >
                📍 {r.displayName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* POI List */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-3">
            <div className="bg-red-500/[0.1] border border-red-500/[0.2] rounded-lg px-3 py-2">
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="p-6 text-center">
            <div className="w-6 h-6 rounded-full border-2 border-ocean-400 border-t-transparent animate-spin mx-auto mb-2" />
            <p className="text-slate-500 text-xs">Fetching places…</p>
          </div>
        )}

        {!loading && filteredPois.length === 0 && !error && (
          <div className="p-6 text-center">
            <p className="text-slate-500 text-xs">No places found. Try adjusting filters or searching a different area.</p>
          </div>
        )}

        <div className="divide-y divide-white/[0.04]">
          {filteredPois.map((poi) => {
            const cfg = CATEGORY_CONFIG[poi.category];
            const fav = isFavorite(poi.id);
            return (
              <div
                key={poi.id}
                className="group flex items-start gap-3 px-3 py-2.5 hover:bg-white/[0.04] transition-colors cursor-pointer"
                onClick={() => onPoiClick(poi)}
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm mt-0.5"
                  style={{ background: `${cfg.markerColor}22` }}
                >
                  {cfg.emoji}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{poi.name}</p>
                  <p className="text-slate-500 text-xs truncate">{poi.address}</p>
                </div>

                {/* Actions on hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); fav ? removeFavorite(poi.id) : addFavorite(poi); }}
                    className={`p-1.5 rounded-lg text-sm transition-colors ${fav ? "text-coral-400" : "text-slate-500 hover:text-coral-400"}`}
                  >
                    {fav ? "♥" : "♡"}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddToPlanner(poi); }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-ocean-400 text-sm transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer count */}
      <div className="p-3 border-t border-white/[0.06]">
        <p className="text-slate-600 text-xs text-center">
          {filteredPois.length} place{filteredPois.length !== 1 ? "s" : ""} found
        </p>
      </div>
    </div>
  );
}
