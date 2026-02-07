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
import PassportPanel from "@/components/PassportPanel";
import { gamificationService } from "@/services/gamification";
import { generateDailyQuests } from "@/services/gamification";

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
  const [mapCenter, setMapCenter] = useState<LatLng>({ lat: 40.7128, lng: -74.0060 }); // Default to New York
  const [showPassport, setShowPassport] = useState(true);

  const { pois, loading, error, activeCategories, toggleCategory, load } = usePOIs();

  // Get user's location on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setMapCenter(userLocation);
          // Immediately load POIs for user's location
          load(userLocation);
        },
        (error) => {
          console.log('Geolocation error:', error.message, '- Using default location (New York)');
          // Load POIs for default location
          load(mapCenter);
        },
        {
          timeout: 5000,
          maximumAge: 300000, // 5 minutes
        }
      );
    } else {
      // No geolocation, load default
      load(mapCenter);
    }
  }, []); // Only run once on mount

  const handlePoiClick = useCallback((poi: POI) => {
    setSelectedPoi(poi);

    // Track visit and check for rewards
    const result = gamificationService.visitPOI(poi);

    if (result.isNew) {
      console.log(`🎉 New POI visited! +${result.xpGained} XP`);

      if (result.leveledUp) {
        console.log(`📈 Level Up! You're now a ${result.newLevel}!`);
        // TODO: Show celebration modal
      }

      if (result.achievements.length > 0) {
        console.log(`🏆 New achievements:`, result.achievements);
        // TODO: Show achievement toast
      }

      if (result.mysteryBox) {
        console.log(`🎁 Mystery Box earned!`);
        // TODO: Show mystery box animation
      }
    }
  }, []);

  // Initialize daily quests on mount
  useEffect(() => {
    const progress = gamificationService.getProgress();
    if (progress && progress.activeQuests.length === 0) {
      const cityName = "Paris"; // or get from current location
      const dailyQuests = generateDailyQuests(cityName);
      // Note: You'll need to add a method to add quests to the service
      // For now, quests are automatically created
    }
  }, []);

  /**
   * Handle map movements (user panning the map)
   * This is called when the user manually drags/pans the map
   */
  const handleMapMoved = useCallback((center: LatLng) => {
    console.log('🗺️ [page.tsx] Map manually moved to:', center);
    setMapCenter(center);
    // Load POIs for the new center
    load(center);
  }, [load]);

  /**
   * Handle search result (city search from sidebar)
   * This is called when user selects a city from the search dropdown
   */
  const handleSearchResult = useCallback((lat: number, lng: number) => {
    console.log('🔍 [page.tsx] City search result:', lat, lng);
    const newCenter = { lat, lng };

    // Update map center (this will trigger map to move)
    setMapCenter(newCenter);

    // CRITICAL: Immediately load POIs for the new location
    // This ensures the POI list updates even if map events are delayed
    load(newCenter);
  }, [load]);

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

  // Clear route when planner pois change
  useEffect(() => {
    setRouteSegments([]);
    setTotalDistance(0);
    setTotalDuration(0);
    setRouteError(null);
  }, [plannerPois]);

  return (
    <div className="min-h-screen h-screen overflow-hidden bg-slate-950 flex flex-col">
      {/* Background mesh */}
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none" />

      {/* Navbar */}
      <Navbar
        mode={mode}
        onModeChange={setMode}
        onAuthClick={() => setAuthOpen(true)}
        showPassport={showPassport}
        onTogglePassport={() => setShowPassport(!showPassport)}
      />

      {/* Auth Modal */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Passport Panel */}
      {showPassport && <PassportPanel />}

      {/* POI Detail Modal */}
      {selectedPoi && (
        <POIDetailCard
          poi={selectedPoi}
          onClose={() => setSelectedPoi(null)}
          onAddToPlanner={addToPlanner}
        />
      )}

      {/* Main layout - pt-16 to account for fixed navbar */}
      <div className="flex flex-1 pt-16 overflow-hidden relative">
        {/* Left Sidebar */}
        <div className="w-80 flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-slate-900/[0.6] relative z-10 overflow-hidden">
          {/* Category Filter */}
          <div className="p-3 border-b border-white/[0.06] bg-slate-900/[0.7] flex-shrink-0">
            <CategoryFilter active={activeCategories} onToggle={toggleCategory} />
          </div>

          {/* Conditional sidebar content - scrollable */}
          <div className="flex-1 overflow-y-auto">
            {mode === "explorer" ? (
              <ExplorerSidebar
                pois={pois}
                loading={loading}
                error={error}
                onPoiClick={handlePoiClick}
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

        {/* Map - fills remaining space */}
        <div className="flex-1 relative overflow-hidden">
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
            pois={pois}
            selectedPoi={selectedPoi}
            plannerPois={plannerPois}
            routeSegments={routeSegments}
            onPoiClick={handlePoiClick}
            onMapMoved={handleMapMoved}
            loading={loading}
            center={mapCenter}
          />
        </div>

        {/* Right sidebar – AI panel */}
        {mode === "planner" && showAI && (
          <div className="w-72 flex-shrink-0 relative z-10 overflow-y-auto">
            <AIRecommendPanel selectedPois={plannerPois} onAddToPlanner={addToPlanner} />
          </div>
        )}
      </div>
    </div>
  );
}