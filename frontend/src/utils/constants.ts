import { POICategory } from "@/types";

export interface CategoryConfig {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  markerColor: string;
}

export const CATEGORY_CONFIG: Record<POICategory, CategoryConfig> = {
  restaurant: {
    label: "Restaurants",
    emoji: "🍽️",
    color: "text-coral-400",
    bgColor: "bg-coral-500/[0.15]",
    borderColor: "border-coral-500/[0.3]",
    markerColor: "#f97316",
  },
  cafe: {
    label: "Cafes",
    emoji: "☕",
    color: "text-amber-400",
    bgColor: "bg-amber-500/[0.15]",
    borderColor: "border-amber-500/[0.3]",
    markerColor: "#f59e0b",
  },
  attraction: {
    label: "Attractions",
    emoji: "🎭",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/[0.15]",
    borderColor: "border-emerald-500/[0.3]",
    markerColor: "#10b981",
  },
  park: {
    label: "Parks",
    emoji: "🌳",
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/[0.12]",
    borderColor: "border-emerald-400/[0.3]",
    markerColor: "#34d399",
  },
  museum: {
    label: "Museums",
    emoji: "🏛️",
    color: "text-ocean-300",
    bgColor: "bg-ocean-500/[0.15]",
    borderColor: "border-ocean-500/[0.3]",
    markerColor: "#06b6d4",
  },
};

export const TRANSPORT_MODES = [
  { id: "walk" as const, label: "Walking", emoji: "🚶", color: "text-emerald-400" },
  { id: "bike" as const, label: "Cycling", emoji: "🚲", color: "text-ocean-400" },
  { id: "car" as const, label: "Driving", emoji: "🚗", color: "text-coral-400" },
  { id: "transit" as const, label: "Transit", emoji: "🚌", color: "text-amber-400" },
];
