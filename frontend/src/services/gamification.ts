import { POI, POICategory, LatLng } from "@/types";
import {
  ExplorerPassport,
  Stamp,
  Badge,
  Quest,
  Achievement,
  MysteryBox,
  ExplorerTitle,
  PassportStatistics,
  UserProgress,
  TripMemory,
} from "@/types/gamification";
import { reverseGeocode } from "./nominatim";

import COUNTRIES from "@/data/countries.json";
import MAJOR_CITIES from "@/data/majorCities.json";
import TOURIST_HOTSPOTS from "@/data/touristHotspots.json";

/* ============================================
   CONSTANTS
============================================ */

const STORAGE_KEY_PROGRESS = "wayvora_user_progress";
const STORAGE_KEY_VISITED_POIS = "wayvora_visited_pois";
const STORAGE_KEY_TRIP_HISTORY = "wayvora_trip_history";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";

/* ============================================
   ACHIEVEMENT DEFINITIONS
============================================ */

export const ACHIEVEMENT_LIBRARY: Achievement[] = [
  {
    id: "marathon_walker",
    name: "Marathon Walker",
    description: "Walk 26.2 miles in total",
    category: "distance",
    iconEmoji: "🏃",
    requirement: { type: "distance_walked", target: 42195 },
    reward: { xp: 500 },
    tier: "gold",
  },
  {
    id: "century_cyclist",
    name: "Century Cyclist",
    description: "Cycle 100 miles in total",
    category: "distance",
    iconEmoji: "🚴",
    requirement: { type: "distance_cycled", target: 160934 },
    reward: { xp: 750 },
    tier: "platinum",
  },
  {
    id: "first_steps",
    name: "First Steps",
    description: "Visit your first POI",
    category: "pois",
    iconEmoji: "👣",
    requirement: { type: "pois_visited", target: 1 },
    reward: { xp: 10 },
    tier: "bronze",
  },
  {
    id: "explorer_fifty",
    name: "Explorer Fifty",
    description: "Visit 50 POIs",
    category: "pois",
    iconEmoji: "🗺️",
    requirement: { type: "pois_visited", target: 50 },
    reward: { xp: 200 },
    tier: "silver",
  },
  {
    id: "century_club",
    name: "Century Club",
    description: "Visit 100 POIs",
    category: "pois",
    iconEmoji: "💯",
    requirement: { type: "pois_visited", target: 100 },
    reward: { xp: 500 },
    tier: "gold",
  },
];

/* ============================================
   QUEST GENERATORS
============================================ */

export function generateDailyQuests(cityName: string): Quest[] {
  return [
    {
      id: `daily_discovery_${Date.now()}`,
      title: "Daily Discovery",
      description: `Find and visit 3 new places in ${cityName} today`,
      type: "discovery",
      difficulty: "easy",
      requirements: [
        {
          id: "req_1",
          type: "visit_pois",
          target: 3,
          current: 0,
          details: { timeWindow: "today" },
          description: "Visit 3 POIs",
        },
      ],
      reward: { xp: 50, mysteryBox: true },
      progress: 0,
      isActive: true,
      isCompleted: false,
      expiresAt: getEndOfDay(),
      aiGenerated: false,
      cityName,
    },
  ];
}

/* ============================================
   RARITY CALCULATION
============================================ */

function calculateStampRarity(
  cityName: string,
  neighborhoodName: string,
  countryCode: string
): "common" | "rare" | "legendary" {
  const city = cityName.toLowerCase();
  const neighborhood = neighborhoodName.toLowerCase();

  if (!MAJOR_CITIES.some(c => city.includes(c.toLowerCase()))) {
    return "legendary";
  }

  const isMajorCity = MAJOR_CITIES.some(c => city.includes(c.toLowerCase()));
  const isHotspot = TOURIST_HOTSPOTS.some(h =>
    neighborhood.includes(h.toLowerCase())
  );

  if (isMajorCity && isHotspot) return "common";
  return "rare";
}

/* ============================================
   CORE GAMIFICATION SERVICE
============================================ */

class GamificationService {
  private progress: UserProgress | null = null;
  private visitedPOIs: Set<string> = new Set();
  private tripHistory: TripMemory[] = [];

  constructor() {
    this.loadProgress();
    this.loadVisitedPOIs();
    this.loadTripHistory();
  }

  getProgress(): UserProgress | null {
      return this.progress;
    }

  /* ---------- COUNTRY DETECTION ---------- */

  private detectCountryCode(
    address?: string,
    countryFromGeocode?: string
  ): string {
    if (countryFromGeocode && COUNTRIES.countries[countryFromGeocode]) {
      return countryFromGeocode;
    }

    if (!address) return COUNTRIES.defaultCountryCode;

    const addressLower = address.toLowerCase();

    for (const [code, country] of Object.entries(COUNTRIES.countries)) {
      if (country.aliases?.some(alias => addressLower.includes(alias))) {
        return code;
      }
    }

    return COUNTRIES.defaultCountryCode;
  }

  /* ---------- LOCATION PARSING ---------- */

  private parseLocation(
    locationString: string,
    poi: POI
  ): { neighborhood: string; city: string; countryCode: string } {
    const parts = locationString.split(",").map(p => p.trim());

    let neighborhood = parts[0] || "";
    let city = parts[1] || parts[0] || "";
    let countryCode = COUNTRIES.defaultCountryCode;

    const countryPart = parts[parts.length - 1]?.toLowerCase();
    let countryFromGeocode: string | undefined;

    for (const [code, country] of Object.entries(COUNTRIES.countries)) {
      if (
        country.name.toLowerCase() === countryPart ||
        country.aliases?.includes(countryPart)
      ) {
        countryFromGeocode = code;
        break;
      }
    }

    countryCode = this.detectCountryCode(poi.address, countryFromGeocode);
    return { neighborhood, city, countryCode };
  }

  /* ---------- STAMP CREATION ---------- */

  private async createStamp(poi: POI): Promise<Stamp | null> {
    if (!this.progress) return null;

    const locationString = await reverseGeocode(poi.coordinates);
    const { neighborhood, city, countryCode } = this.parseLocation(
      locationString,
      poi
    );

    if (!neighborhood || !city) return null;

    const rarity = calculateStampRarity(city, neighborhood, countryCode);

    return {
      id: `stamp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      neighborhoodName: neighborhood,
      cityName: city,
      countryCode,
      coordinates: poi.coordinates,
      earnedAt: new Date(),
      uniquePOIsVisited: 1,
      rarity,
      aiDescription: `${neighborhood} is a distinctive part of ${city}.`,
    };
  }

  /* ---------- STORAGE ---------- */

  private loadProgress(): void {
    const stored = localStorage.getItem(STORAGE_KEY_PROGRESS);
    this.progress = stored ? JSON.parse(stored) : this.createNewProgress();
  }

  private createNewProgress(): UserProgress {
    return {
      passport: {
        userId: "local_user",
        stamps: [],
        badges: [],
        statistics: {
          citiesVisited: 0,
          neighborhoodsExplored: 0,
          poisVisited: 0,
          totalDistance: 0,
          totalDuration: 0,
          countriesExplored: 0,
          routesCompleted: 0,
          questsCompleted: 0,
          longestRoute: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastActiveDate: new Date(),
        },
        level: {
          level: 1,
          title: "Tourist",
          xp: 0,
          xpToNextLevel: 100,
          cityLevels: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      activeQuests: [],
      completedQuests: [],
      achievements: [],
      mysteryBoxes: [],
      preferences: {
        enableViktor: true,
        enableNotifications: true,
        enableSounds: true,
        privacyMode: false,
      },
    };
  }

  private loadVisitedPOIs(): void {
    const stored = localStorage.getItem(STORAGE_KEY_VISITED_POIS);
    if (stored) this.visitedPOIs = new Set(JSON.parse(stored));
  }

  private loadTripHistory(): void {
    const stored = localStorage.getItem(STORAGE_KEY_TRIP_HISTORY);
    if (stored) this.tripHistory = JSON.parse(stored);
  }
}

/* ============================================
   HELPERS
============================================ */

function getEndOfDay(): Date {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end;
}

/* ============================================
   EXPORT SINGLETON
============================================ */

export const gamificationService = new GamificationService();
