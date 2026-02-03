"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { POI, POICategory, LatLng } from "@/types";
import { fetchPOIs } from "@/services/overpass";

export function usePOIs() {
  const [pois, setPois] = useState<POI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategories, setActiveCategories] = useState<POICategory[]>([
    "restaurant",
    "cafe",
    "attraction",
    "park",
    "museum",
  ]);
  const abortRef = useRef<AbortController | null>(null);
  const lastCenterRef = useRef<LatLng | null>(null);

  const load = useCallback(async (center: LatLng, radius: number = 2500) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    lastCenterRef.current = center;

    setLoading(true);
    setError(null);
    try {
      const results = await fetchPOIs(center, radius, activeCategories);
      setPois(results);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [activeCategories]);

  const toggleCategory = useCallback((cat: POICategory) => {
    setActiveCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }, []);

  const filteredPois = pois.filter((poi) => activeCategories.includes(poi.category));

  // Re-fetch when categories change and we already have a center
  useEffect(() => {
    if (lastCenterRef.current) {
      load(lastCenterRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategories]);

  return {
    pois: filteredPois,
    allPois: pois,
    loading,
    error,
    activeCategories,
    toggleCategory,
    load,
  };
}
