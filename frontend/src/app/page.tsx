"use client";
import { useState, useCallback, useEffect } from "react";
import { POI, TransportMode, RouteSegment, LatLng } from "@/types";
import { usePOIs } from "@/hooks/usePOIs";
import { computeRoute } from "@/services/routing";

import Navbar from "@/components/Navbar";
import AuthModal from "@/components/AuthModal";
import CategoryFilter from "@/components/CategoryFilter";
import ExplorerSidebar from "@/components/ExplorerSidebar";
import PlannerSidebar from "@/components/PlannerSidebar";
import AIRecommendPanel from "@/components/AIRecommendPanel";
import POIDetailCard from "@/components/POIDetailCard";
import WayvMap from "@/components/WayvMap";

export default function Home() {
  const [mode, setMode] = useState<"explorer" | "planner">("explorer");
  const [authOpen, setAuthOpen] = useState(false);
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
  const [plannerPois, setPlannerPois] = useState<POI[]>([]);
  const [transportMode, setTransportMode] = useState<TransportMode>("walk");
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [mapCenter, setMapCenter] = useState<LatLng>({ lat: 48.8566, lng: 2.3522 });
  const [mapKey, setMapKey] = useState(0); // force remount if needed

  const { pois, loading, error, activeCategories, toggleCategory, load } = usePOIs();

  // Load POIs when center changes
  useEffect(() => {
    load(mapCenter);
  }, [mapCenter, load]);

  // Clear route when planner pois change
  useEffect(() => {
    setRouteSegments([]);
    setTotalDistance(0);
    setTotalDuration(0);
    setRouteError(null);
  }, [plannerPois]);

  const handleMapMoved = useCallback((center: LatLng) => {
    setMapCenter(center);
  }, []);

  const handleSearchResult = useCallback((lat: number, lng: number) => {
    setMapCenter({ lat, lng });
  }, []);

  const addToPlanner = useCallback((poi: POI) => {
    setPlannerPois((prev) => {
      if (prev.some((p) => p.id === poi.id)) return prev;
      return [...prev, poi];
    });
  }, []);

  const removeFromPlanner = useCallback((id: string) => {
    setPlannerPois((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const reorderPlannerPois = useCallback((from: number, to: number) => {
    setPlannerPois((prev) => {
      const updated = [...prev];
      const [item] = updated.splice(from, 1);
      updated.splice(to, 0, item);
      return updated;
    });
  }, []);

  const computeTheRoute = useCallback(async () => {
    if (plannerPois.length < 2) return;
    // Filter out AI-suggested POIs without real coordinates
    const validPois = plannerPois.filter((p) => p.coordinates.lat !== 0 && p.coordinates.lng !== 0);
    if (validPois.length < 2) {
      setRouteError("Need at least 2 POIs with real coordinates. AI-suggested places cannot be routed.");
      return;
    }
    setRouteLoading(true);
    setRouteError(null);
    try {
      const result = await computeRoute(validPois, transportMode);
      setRouteSegments(result.segments);
      setTotalDistance(result.totalDistance);
      setTotalDuration(result.totalDuration);
    } catch (err) {
      setRouteError(err instanceof Error ? err.message : "Routing failed.");
    } finally {
      setRouteLoading(false);
    }
  }, [plannerPois, transportMode]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Background mesh */}
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none" />

      {/* Navbar */}
      <Navbar mode={mode} onModeChange={setMode} onAuthClick={() => setAuthOpen(true)} />

      {/* Auth Modal */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* POI Detail Modal */}
      {selectedPoi && (
        <POIDetailCard
          poi={selectedPoi}
          onClose={() => setSelectedPoi(null)}
          onAddToPlanner={addToPlanner}
        />
      )}

      {/* Main layout */}
      <div className="flex flex-1 pt-16 relative">
        {/* Left Sidebar */}
        <div className="w-80 flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-slate-900/[0.6] relative z-10">
          {/* Category Filter */}
          <div className="p-3 border-b border-white/[0.06] bg-slate-900/[0.7]">
            <CategoryFilter active={activeCategories} onToggle={toggleCategory} />
          </div>

          {/* Conditional sidebar content */}
          <div className="flex-1 min-h-0">
            {mode === "explorer" ? (
              <ExplorerSidebar
                pois={pois}
                loading={loading}
                error={error}
                onPoiClick={setSelectedPoi}
                onSearchResult={handleSearchResult}
                onAddToPlanner={addToPlanner}
              />
            ) : (
              <PlannerSidebar
                plannerPois={plannerPois}
                transportMode={transportMode}
                onModeChange={setTransportMode}
                onRemovePoi={removeFromPlanner}
                onReorder={reorderPlannerPois}
                onComputeRoute={computeTheRoute}
                routeSegments={routeSegments}
                totalDistance={totalDistance}
                totalDuration={totalDuration}
                routeLoading={routeLoading}
                routeError={routeError}
                onClear={() => setPlannerPois([])}
              />
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {/* Planner badge */}
          {plannerPois.length > 0 && mode === "explorer" && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
              <button
                onClick={() => setMode("planner")}
                className="glass rounded-full px-4 py-1.5 border border-ocean-500/[0.3] bg-ocean-500/[0.15] shadow-glow flex items-center gap-2 hover:bg-ocean-500/[0.25] transition-all"
              >
                <span className="w-2 h-2 rounded-full bg-ocean-400 animate-pulse" />
                <span className="text-ocean-300 text-xs font-semibold">
                  {plannerPois.length} stop{plannerPois.length !== 1 ? "s" : ""} in planner → View Route
                </span>
              </button>
            </div>
          )}

          {/* AI toggle in planner mode */}
          {mode === "planner" && (
            <div className="absolute top-3 right-3 z-10">
              <button
                onClick={() => setShowAI(!showAI)}
                className={`glass rounded-full px-3 py-1.5 border shadow-glass flex items-center gap-1.5 transition-all ${
                  showAI
                    ? "border-ocean-500/[0.4] bg-ocean-500/[0.2]"
                    : "border-white/[0.08] hover:border-white/[0.15]"
                }`}
              >
                <span>✨</span>
                <span className={`text-xs font-semibold ${showAI ? "text-ocean-300" : "text-slate-300"}`}>
                  AI Assist
                </span>
              </button>
            </div>
          )}

          <WayvMap
            key={mapKey}
            pois={pois}
            selectedPoi={selectedPoi}
            plannerPois={plannerPois}
            routeSegments={routeSegments}
            onPoiClick={setSelectedPoi}
            onMapMoved={handleMapMoved}
            loading={loading}
          />
        </div>

        {/* Right sidebar — AI panel */}
        {mode === "planner" && showAI && (
          <div className="w-72 flex-shrink-0 relative z-10">
            <AIRecommendPanel selectedPois={plannerPois} onAddToPlanner={addToPlanner} />
          </div>
        )}
      </div>
    </div>
  );
}
