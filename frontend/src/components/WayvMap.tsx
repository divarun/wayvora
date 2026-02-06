"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { POI, LatLng, RouteSegment } from "@/types";
import { CATEGORY_CONFIG } from "@/utils/constants";

let L: typeof import("leaflet");

if (typeof window !== "undefined") {
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
  center?: LatLng;
}

export default function WayvMap({
  pois,
  selectedPoi,
  plannerPois,
  routeSegments,
  onPoiClick,
  onMapMoved,
  loading,
  center,
}: WayvMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const plannerMarkersRef = useRef<L.Marker[]>([]);
  const routeLinesRef = useRef<L.Polyline[]>([]);
  const moveEndHandlerRef = useRef<boolean>(false);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || !L) return;
    if (mapRef.current) return;

    // Use provided center or default to New York
    const initialCenter = center || { lat: 40.7128, lng: -74.0060 };

    const map = L.map(containerRef.current, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: 13,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    map.on("moveend", () => {
      if (moveEndHandlerRef.current) {
        const center = map.getCenter();
        onMapMoved({ lat: center.lat, lng: center.lng });
      }
    });

    mapRef.current = map;

    setTimeout(() => {
      moveEndHandlerRef.current = true;
    }, 500);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onMapMoved]);

  // Update map center when center prop changes
  useEffect(() => {
    if (!mapRef.current || !center) return;

    const map = mapRef.current;
    const currentCenter = map.getCenter();

    const distance = Math.sqrt(
      Math.pow(currentCenter.lat - center.lat, 2) +
      Math.pow(currentCenter.lng - center.lng, 2)
    );

    if (distance > 0.001) {
      moveEndHandlerRef.current = false;
      map.setView([center.lat, center.lng], 13);
      setTimeout(() => {
        moveEndHandlerRef.current = true;
      }, 500);
    }
  }, [center]);

  // Render POI markers
  useEffect(() => {
    if (!mapRef.current || !L) return;

    const map = mapRef.current;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    pois.forEach((poi) => {
      const cfg = CATEGORY_CONFIG[poi.category];

      const icon = L.divIcon({
        html: `
          <div style="
            background: ${cfg.markerColor};
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            border: 2px solid white;
          ">
            ${cfg.emoji}
          </div>
        `,
        className: "poi-marker",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([poi.coordinates.lat, poi.coordinates.lng], { icon })
        .addTo(map)
        .on("click", () => onPoiClick(poi));

      markersRef.current.push(marker);
    });
  }, [pois, onPoiClick]);

  // Render planner POI markers
  useEffect(() => {
    if (!mapRef.current || !L) return;

    const map = mapRef.current;
    plannerMarkersRef.current.forEach((m) => m.remove());
    plannerMarkersRef.current = [];

    plannerPois.forEach((poi, index) => {
      const icon = L.divIcon({
        html: `
          <div style="
            background: linear-gradient(135deg, #06b6d4, #0891b2);
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(6,182,212,0.4);
            border: 3px solid white;
            font-weight: bold;
            color: white;
          ">
            ${index + 1}
          </div>
        `,
        className: "planner-marker",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([poi.coordinates.lat, poi.coordinates.lng], { icon })
        .addTo(map)
        .on("click", () => onPoiClick(poi));

      plannerMarkersRef.current.push(marker);
    });
  }, [plannerPois, onPoiClick]);

  // Render route polylines
  useEffect(() => {
    if (!mapRef.current || !L) return;

    const map = mapRef.current;
    routeLinesRef.current.forEach((line) => line.remove());
    routeLinesRef.current = [];

    routeSegments.forEach((segment) => {
      const coords: L.LatLngExpression[] = segment.coordinates.map((c) => [c.lat, c.lng]);

      const polyline = L.polyline(coords, {
        color: "#06b6d4",
        weight: 4,
        opacity: 0.8,
      }).addTo(map);

      routeLinesRef.current.push(polyline);
    });

    if (routeSegments.length > 0 && plannerPois.length > 0) {
      const allCoords: L.LatLngExpression[] = [];
      routeSegments.forEach((seg) => {
        seg.coordinates.forEach((c) => allCoords.push([c.lat, c.lng]));
      });
      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [routeSegments, plannerPois]);

  // Highlight selected POI
  useEffect(() => {
    if (!mapRef.current || !L || !selectedPoi) return;
    const map = mapRef.current;
    map.panTo([selectedPoi.coordinates.lat, selectedPoi.coordinates.lng]);
  }, [selectedPoi]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full relative z-0" />

      {loading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[5] pointer-events-none">
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