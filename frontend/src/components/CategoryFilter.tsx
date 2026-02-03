"use client";
import { POICategory } from "@/types";
import { CATEGORY_CONFIG } from "@/utils/constants";

interface CategoryFilterProps {
  active: POICategory[];
  onToggle: (category: POICategory) => void;
}

const ALL_CATEGORIES: POICategory[] = ["restaurant", "cafe", "attraction", "park", "museum"];

export default function CategoryFilter({ active, onToggle }: CategoryFilterProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {ALL_CATEGORIES.map((cat) => {
        const cfg = CATEGORY_CONFIG[cat];
        const isActive = active.includes(cat);
        return (
          <button
            key={cat}
            onClick={() => onToggle(cat)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-300 ${
              isActive
                ? `${cfg.bgColor} ${cfg.borderColor} ${cfg.color}`
                : "bg-white/[0.04] border-white/[0.08] text-slate-500 hover:text-slate-300 hover:border-white/[0.15]"
            }`}
          >
            <span>{cfg.emoji}</span>
            <span>{cfg.label}</span>
            {isActive && (
              <span className="ml-0.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.markerColor }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
