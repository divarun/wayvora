"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { POI, LatLng, RouteSegment } from "@/types";
import { CATEGORY_CONFIG } from "@/utils/constants";

let L: typeof import("leaflet");

if (typeof window !== "undefined") {
  // Only import Leaflet on the client
  L = require("leaflet");
}

interface WayvMapProps {
  pois: POI[];
  selectedPoi: POI | null;
  plannerPois: POI[];
  routeSegments: RouteSegment[];
  onPoiClick: (poi: POI) => void;
  onMapMoved: (center: LatLng) => void;
  loading: boolean;
}

// … keep all your marker creation functions as-is …

export default function WayvMap({
  pois,
  selectedPoi,
  plannerPois,
  routeSegments,
  onPoiClick,
  onMapMoved,
  loading,
}: WayvMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const plannerMarkersRef = useRef<L.Marker[]>([]);
  const routeLinesRef = useRef<L.Polyline[]>([]);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || !L) return;
    if (mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [48.8566, 2.3522],
      zoom: 13,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // … keep all marker and polyline rendering useEffects as-is …

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {loading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
          <div className="glass rounded-full px-4 py-1.5 flex items-center gap-2 shadow-glass">
            <div className="w-3 h-3 rounded-full border-2 border-ocean-400 border-t-transparent animate-spin" />
            <span className="text-slate-300 text-xs font-semibold">
              Loading places…
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
