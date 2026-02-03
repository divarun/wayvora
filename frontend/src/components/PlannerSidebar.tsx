"use client";
import { useState } from "react";
import { POI, TransportMode, RouteSegment, Itinerary, Route } from "@/types";
import { TRANSPORT_MODES } from "@/utils/constants";
import { formatDistance, formatDuration } from "@/services/routing";
import { exportItineraryJSON, exportItineraryPDF } from "@/utils/export";

interface PlannerSidebarProps {
  plannerPois: POI[];
  transportMode: TransportMode;
  onModeChange: (mode: TransportMode) => void;
  onRemovePoi: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onComputeRoute: () => void;
  routeSegments: RouteSegment[];
  totalDistance: number;
  totalDuration: number;
  routeLoading: boolean;
  routeError: string | null;
  onClear: () => void;
}

export default function PlannerSidebar({
  plannerPois,
  transportMode,
  onModeChange,
  onRemovePoi,
  onReorder,
  onComputeRoute,
  routeSegments,
  totalDistance,
  totalDuration,
  routeLoading,
  routeError,
  onClear,
}: PlannerSidebarProps) {
  const [itineraryName, setItineraryName] = useState("My Trip");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    onReorder(dragIdx, targetIdx);
    setDragIdx(null);
  };

  const doExportJSON = () => {
    const route: Route = {
      id: Date.now().toString(),
      segments: routeSegments,
      totalDistance,
      totalDuration,
      transportMode,
      createdAt: Date.now(),
      pois: plannerPois,
    };
    const itinerary: Itinerary = {
      id: Date.now().toString(),
      name: itineraryName,
      route,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    exportItineraryJSON(itinerary);
  };

  const doExportPDF = () => {
    const route: Route = {
      id: Date.now().toString(),
      segments: routeSegments,
      totalDistance,
      totalDuration,
      transportMode,
      createdAt: Date.now(),
      pois: plannerPois,
    };
    const itinerary: Itinerary = {
      id: Date.now().toString(),
      name: itineraryName,
      route,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    exportItineraryPDF(itinerary);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/[0.85] backdrop-blur-xl border-r border-white/[0.06]">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-sm">Route Planner</h3>
          {plannerPois.length > 0 && (
            <button onClick={onClear} className="text-slate-500 hover:text-red-400 text-xs transition-colors">
              Clear all
            </button>
          )}
        </div>

        {/* Itinerary name */}
        <input
          type="text"
          value={itineraryName}
          onChange={(e) => setItineraryName(e.target.value)}
          className="input-glass py-2 text-sm mb-3"
          placeholder="Trip name…"
        />

        {/* Transport mode */}
        <div className="grid grid-cols-4 gap-1">
          {TRANSPORT_MODES.map((tm) => (
            <button
              key={tm.id}
              onClick={() => onModeChange(tm.id)}
              className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200 ${
                transportMode === tm.id
                  ? "bg-ocean-600/[0.25] border-ocean-600/[0.4] text-ocean-300"
                  : "bg-white/[0.04] border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-white/[0.12]"
              }`}
            >
              <span className="text-sm">{tm.emoji}</span>
              <span>{tm.label.slice(0, 4)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stop List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {plannerPois.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-600 text-xs">
              Tap <strong className="text-ocean-400">+ Add to Plan</strong> on any POI to start building your route.
            </p>
          </div>
        )}

        {plannerPois.map((poi, idx) => (
          <div
            key={poi.id}
            draggable
            onDragStart={() => setDragIdx(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(idx)}
            className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all duration-200 cursor-grab active:cursor-grabbing ${
              dragIdx === idx
                ? "opacity-40 border-ocean-500/[0.4] bg-ocean-500/[0.08]"
                : "bg-white/[0.04] border-white/[0.06] hover:border-white/[0.12]"
            }`}
          >
            {/* Number badge */}
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-ocean-400 to-ocean-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{idx + 1}</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{poi.name}</p>
              <p className="text-slate-500 text-[10px] truncate capitalize">{poi.category}</p>
            </div>

            {/* Segment distance */}
            {routeSegments[idx - 1] && idx > 0 && (
              <span className="text-ocean-400 text-[10px] font-semibold">
                {formatDistance(routeSegments[idx - 1].distance)}
              </span>
            )}

            {/* Remove */}
            <button
              onClick={() => onRemovePoi(poi.id)}
              className="text-slate-600 hover:text-red-400 transition-colors p-0.5 rounded"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Route stats & actions */}
      <div className="border-t border-white/[0.06] p-4 space-y-3">
        {/* Route stats */}
        {totalDistance > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.04] rounded-xl p-2.5 text-center border border-white/[0.06]">
              <p className="text-slate-500 text-[10px] uppercase tracking-wide">Distance</p>
              <p className="text-ocean-300 font-bold text-sm mt-0.5">{formatDistance(totalDistance)}</p>
            </div>
            <div className="bg-white/[0.04] rounded-xl p-2.5 text-center border border-white/[0.06]">
              <p className="text-slate-500 text-[10px] uppercase tracking-wide">Duration</p>
              <p className="text-ocean-300 font-bold text-sm mt-0.5">{formatDuration(totalDuration)}</p>
            </div>
          </div>
        )}

        {/* Error */}
        {routeError && (
          <div className="bg-red-500/[0.1] border border-red-500/[0.2] rounded-lg px-3 py-2">
            <p className="text-red-400 text-xs">{routeError}</p>
          </div>
        )}

        {/* Compute route */}
        {plannerPois.length >= 2 && (
          <button
            onClick={onComputeRoute}
            disabled={routeLoading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {routeLoading ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Computing…
              </>
            ) : (
              <>{routeSegments.length > 0 ? "🔄 Recompute Route" : "🗺️ Compute Route"}</>
            )}
          </button>
        )}

        {/* Export buttons */}
        {routeSegments.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={doExportJSON}
              className="py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-slate-300 hover:text-white hover:bg-white/[0.1] text-xs font-semibold transition-all text-center"
            >
              📄 Export JSON
            </button>
            <button
              onClick={doExportPDF}
              className="py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-slate-300 hover:text-white hover:bg-white/[0.1] text-xs font-semibold transition-all text-center"
            >
              📑 Export PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
