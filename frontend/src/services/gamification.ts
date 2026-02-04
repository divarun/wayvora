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

const STORAGE_KEY_PROGRESS = "wayvora_user_progress";
const STORAGE_KEY_VISITED_POIS = "wayvora_visited_pois";
const STORAGE_KEY_TRIP_HISTORY = "wayvora_trip_history";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";

/* ============================================
   ACHIEVEMENT DEFINITIONS
============================================ */

export const ACHIEVEMENT_LIBRARY: Achievement[] = [
  // Distance Achievements
  {
    id: "marathon_walker",
    name: "Marathon Walker",
    description: "Walk 26.2 miles in total",
    category: "distance",
    iconEmoji: "🏃",
    requirement: { type: "distance_walked", target: 42195 }, // meters
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

  // POI Achievements
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

  // Category Achievements
  {
    id: "foodie",
    name: "Foodie",
    description: "Visit 25 restaurants",
    category: "category",
    iconEmoji: "🍽️",
    requirement: { type: "category_restaurant", target: 25 },
    reward: { xp: 150 },
    tier: "silver",
  },
  {
    id: "coffee_connoisseur",
    name: "Coffee Connoisseur",
    description: "Visit 20 cafes",
    category: "category",
    iconEmoji: "☕",
    requirement: { type: "category_cafe", target: 20 },
    reward: { xp: 150 },
    tier: "silver",
  },
  {
    id: "culture_vulture",
    name: "Culture Vulture",
    description: "Visit 25 museums",
    category: "category",
    iconEmoji: "🎨",
    requirement: { type: "category_museum", target: 25 },
    reward: { xp: 200 },
    tier: "gold",
  },

  // Streak Achievements
  {
    id: "week_warrior",
    name: "Week Warrior",
    description: "Use app for 7 days straight",
    category: "streak",
    iconEmoji: "📅",
    requirement: { type: "streak_days", target: 7 },
    reward: { xp: 100 },
    tier: "bronze",
  },
  {
    id: "monthly_marathoner",
    name: "Monthly Marathoner",
    description: "Use app for 30 days straight",
    category: "streak",
    iconEmoji: "🔥",
    requirement: { type: "streak_days", target: 30 },
    reward: { xp: 500 },
    tier: "platinum",
  },

  // Special Achievements
  {
    id: "night_owl",
    name: "Night Owl",
    description: "Visit 5 POIs after 10 PM",
    category: "special",
    iconEmoji: "🦉",
    requirement: { type: "late_night_visits", target: 5 },
    reward: { xp: 100 },
    tier: "silver",
  },
  {
    id: "early_bird",
    name: "Early Bird",
    description: "Visit 5 POIs before 7 AM",
    category: "special",
    iconEmoji: "🌅",
    requirement: { type: "early_morning_visits", target: 5 },
    reward: { xp: 100 },
    tier: "silver",
  },
  {
    id: "globe_trotter",
    name: "Globe Trotter",
    description: "Visit 10 different cities",
    category: "special",
    iconEmoji: "🌍",
    requirement: { type: "cities_visited", target: 10 },
    reward: { xp: 1000 },
    tier: "platinum",
  },
  {
    id: "neighborhood_navigator",
    name: "Neighborhood Navigator",
    description: "Collect 10 neighborhood stamps",
    category: "special",
    iconEmoji: "🏘️",
    requirement: { type: "stamps_collected", target: 10 },
    reward: { xp: 300 },
    tier: "gold",
  },
  {
    id: "stamp_collector",
    name: "Stamp Collector",
    description: "Collect 25 neighborhood stamps",
    category: "special",
    iconEmoji: "📮",
    requirement: { type: "stamps_collected", target: 25 },
    reward: { xp: 750 },
    tier: "platinum",
  },
];

/* ============================================
   QUEST GENERATORS
============================================ */

export function generateDailyQuests(cityName: string): Quest[] {
  const quests: Quest[] = [
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
    {
      id: `category_explorer_${Date.now()}`,
      title: "Category Explorer",
      description: "Visit at least 2 different types of places today",
      type: "category",
      difficulty: "easy",
      requirements: [
        {
          id: "req_1",
          type: "visit_categories",
          target: 2,
          current: 0,
          details: {},
          description: "Visit 2 different categories",
        },
      ],
      reward: { xp: 30 },
      progress: 0,
      isActive: true,
      isCompleted: false,
      expiresAt: getEndOfDay(),
      aiGenerated: false,
      cityName,
    },
  ];

  return quests;
}

export function generateThemeQuests(cityName: string): Quest[] {
  return [
    {
      id: `coffee_culture_${Date.now()}`,
      title: "Coffee Culture",
      description: "Discover the local coffee scene by visiting 5 unique cafes",
      type: "theme",
      difficulty: "medium",
      requirements: [
        {
          id: "req_1",
          type: "visit_categories",
          target: 5,
          current: 0,
          details: { category: "cafe" },
          description: "Visit 5 cafes",
        },
      ],
      reward: { xp: 100, badge: createBadge("Coffee Connoisseur", "cafe") },
      progress: 0,
      isActive: false,
      isCompleted: false,
      aiGenerated: false,
      cityName,
    },
    {
      id: `art_enthusiast_${Date.now()}`,
      title: "Art Enthusiast",
      description: "Immerse yourself in art by visiting 5 museums",
      type: "theme",
      difficulty: "medium",
      requirements: [
        {
          id: "req_1",
          type: "visit_categories",
          target: 5,
          current: 0,
          details: { category: "museum" },
          description: "Visit 5 museums",
        },
      ],
      reward: { xp: 120, badge: createBadge("Culture Vulture", "museum") },
      progress: 0,
      isActive: false,
      isCompleted: false,
      aiGenerated: false,
      cityName,
    },
  ];
}

/* ============================================
   RARITY & LOCATION DATA
============================================ */

const MAJOR_CITIES = [
  "Paris", "London", "New York", "Tokyo", "Los Angeles", "Chicago",
  "San Francisco", "Barcelona", "Rome", "Berlin", "Madrid", "Amsterdam",
  "Dubai", "Singapore", "Hong Kong", "Sydney", "Melbourne", "Toronto",
  "Vancouver", "Montreal", "Boston", "Washington", "Miami", "Las Vegas",
  "Seattle", "Austin", "Denver", "Portland", "Philadelphia", "San Diego"
];

const TOURIST_HOTSPOTS = [
  "Latin Quarter", "Montmartre", "Shibuya", "Shinjuku", "Times Square",
  "Manhattan", "Brooklyn", "Westminster", "Camden", "Soho", "Chelsea",
  "Greenwich Village", "Hollywood", "Beverly Hills", "Santa Monica",
  "Downtown", "City Center", "Old Town", "Historic District"
];

function calculateStampRarity(
  cityName: string,
  neighborhoodName: string,
  countryCode: string
): "common" | "rare" | "legendary" {
  const city = cityName.toLowerCase();
  const neighborhood = neighborhoodName.toLowerCase();

  // Legendary: Remote locations, small towns, or very specific cultural areas
  if (!MAJOR_CITIES.some(c => city.includes(c.toLowerCase()))) {
    // Small cities/towns are legendary
    return "legendary";
  }

  // Common: Major city + tourist hotspot
  const isMajorCity = MAJOR_CITIES.some(c => city.includes(c.toLowerCase()));
  const isHotspot = TOURIST_HOTSPOTS.some(h => neighborhood.includes(h.toLowerCase()));

  if (isMajorCity && isHotspot) {
    return "common";
  }

  // Rare: Major city but non-tourist neighborhood, or vice versa
  if (isMajorCity && !isHotspot) {
    return "rare";
  }

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

  /* ========== INITIALIZATION ========== */

  private loadProgress(): void {
    const stored = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (stored) {
      try {
        this.progress = JSON.parse(stored);
      } catch {
        this.progress = this.createNewProgress();
      }
    } else {
      this.progress = this.createNewProgress();
    }
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

  private saveProgress(): void {
    if (this.progress) {
      this.progress.passport.updatedAt = new Date();
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(this.progress));
    }
  }

  private loadVisitedPOIs(): void {
    const stored = localStorage.getItem(STORAGE_KEY_VISITED_POIS);
    if (stored) {
      this.visitedPOIs = new Set(JSON.parse(stored));
    }
  }

  private saveVisitedPOIs(): void {
    localStorage.setItem(
      STORAGE_KEY_VISITED_POIS,
      JSON.stringify(Array.from(this.visitedPOIs))
    );
  }

  private loadTripHistory(): void {
    const stored = localStorage.getItem(STORAGE_KEY_TRIP_HISTORY);
    if (stored) {
      this.tripHistory = JSON.parse(stored);
    }
  }

  private saveTripHistory(): void {
    localStorage.setItem(STORAGE_KEY_TRIP_HISTORY, JSON.stringify(this.tripHistory));
  }

  /* ========== STAMP SYSTEM ========== */

  private async createStamp(poi: POI): Promise<Stamp | null> {
    if (!this.progress) return null;

    try {
      // Get location details via reverse geocoding
      const locationString = await reverseGeocode(poi.coordinates);

      // Extract neighborhood and city from location string
      const { neighborhood, city, countryCode } = this.parseLocation(locationString, poi);

      if (!neighborhood || !city) {
        console.warn("Could not determine neighborhood or city for stamp");
        return null;
      }

      // Check if we already have a stamp for this neighborhood
      const existingStamp = this.progress.passport.stamps.find(
        (s) =>
          s.neighborhoodName.toLowerCase() === neighborhood.toLowerCase() &&
          s.cityName.toLowerCase() === city.toLowerCase()
      );

      if (existingStamp) {
        // Update the existing stamp
        existingStamp.uniquePOIsVisited++;
        this.saveProgress();
        return null; // Return null since it's not a new stamp
      }

      // Calculate rarity
      const rarity = calculateStampRarity(city, neighborhood, countryCode);

      // Generate AI description (async - will be populated later)
      const aiDescription = await this.generateNeighborhoodFact(neighborhood, city);

      // Create new stamp
      const newStamp: Stamp = {
        id: `stamp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        neighborhoodName: neighborhood,
        cityName: city,
        countryCode: countryCode,
        coordinates: poi.coordinates,
        earnedAt: new Date(),
        uniquePOIsVisited: 1,
        rarity,
        aiDescription,
      };

      // Add stamp to collection
      this.progress.passport.stamps.push(newStamp);

      // Update statistics
      this.progress.passport.statistics.neighborhoodsExplored++;
      this.updateCitiesAndCountries();

      return newStamp;
    } catch (error) {
      console.error("Error creating stamp:", error);
      return null;
    }
  }

  private parseLocation(
    locationString: string,
    poi: POI
  ): { neighborhood: string; city: string; countryCode: string } {
    // Location string format is typically: "Street, Neighborhood, City, Country"
    // We'll try to parse it intelligently

    const parts = locationString.split(",").map((p) => p.trim());

    let neighborhood = "";
    let city = "";
    let countryCode = "US"; // Default

    if (parts.length >= 3) {
      // Typical case: [Street, Neighborhood, City, State/Country]
      neighborhood = parts[1] || parts[0]; // Use street if no neighborhood
      city = parts[2] || parts[1];
    } else if (parts.length === 2) {
      neighborhood = parts[0];
      city = parts[1];
    } else if (parts.length === 1) {
      neighborhood = parts[0];
      city = parts[0];
    }

    // Try to extract country code from address if available
    if (poi.address) {
      const addressLower = poi.address.toLowerCase();
      if (addressLower.includes("france") || addressLower.includes("paris")) {
        countryCode = "FR";
      } else if (addressLower.includes("japan") || addressLower.includes("tokyo")) {
        countryCode = "JP";
      } else if (addressLower.includes("uk") || addressLower.includes("london")) {
        countryCode = "GB";
      } else if (addressLower.includes("spain")) {
        countryCode = "ES";
      } else if (addressLower.includes("italy")) {
        countryCode = "IT";
      } else if (addressLower.includes("germany")) {
        countryCode = "DE";
      }
    }

    return { neighborhood, city, countryCode };
  }

  private async generateNeighborhoodFact(
    neighborhood: string,
    city: string
  ): Promise<string> {
    try {
      // Call backend API to generate neighborhood fact
    const response = await fetch(`${BASE_URL}/ai/neighborhood-fact`, {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ neighborhood, city }),
   });


      if (!response.ok) {
        throw new Error("Failed to generate neighborhood fact");
      }

      const data = await response.json();
      return data.fact || this.getFallbackFact(neighborhood, city);
    } catch (error) {
      console.error("Error generating neighborhood fact:", error);
      return this.getFallbackFact(neighborhood, city);
    }
  }

  private getFallbackFact(neighborhood: string, city: string): string {
    const fallbackFacts = [
      `${neighborhood} is a vibrant area in ${city} known for its unique character and local culture.`,
      `Exploring ${neighborhood} offers a authentic glimpse into life in ${city}.`,
      `${neighborhood} has been a cherished part of ${city}'s identity for generations.`,
      `Visitors to ${neighborhood} discover one of ${city}'s most distinctive districts.`,
      `The ${neighborhood} area showcases the diverse spirit of ${city}.`,
    ];
    return fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)];
  }

  private updateCitiesAndCountries(): void {
    if (!this.progress) return;

    // Count unique cities
    const uniqueCities = new Set(
      this.progress.passport.stamps.map((s) => s.cityName.toLowerCase())
    );
    this.progress.passport.statistics.citiesVisited = uniqueCities.size;

    // Count unique countries
    const uniqueCountries = new Set(
      this.progress.passport.stamps.map((s) => s.countryCode)
    );
    this.progress.passport.statistics.countriesExplored = uniqueCountries.size;
  }

  /* ========== BADGE SYSTEM ========== */

  private checkCityBadges(): Badge[] {
    if (!this.progress) return [];

    const newBadges: Badge[] = [];

    // Group stamps by city
    const cityStampCounts = new Map<string, number>();
    for (const stamp of this.progress.passport.stamps) {
      const count = cityStampCounts.get(stamp.cityName) || 0;
      cityStampCounts.set(stamp.cityName, count + 1);
    }

    // Award city badges for 5+ stamps
    for (const [city, count] of cityStampCounts) {
      if (count >= 5) {
        const badgeId = `city_${city.toLowerCase().replace(/\s+/g, "_")}`;
        const badgeExists = this.progress.passport.badges.some((b) => b.id === badgeId);

        if (!badgeExists) {
          const badge: Badge = {
            id: badgeId,
            name: `${city} Explorer`,
            description: `Explored 5+ neighborhoods in ${city}`,
            category: "special",
            iconEmoji: "🏙️",
            earnedAt: new Date(),
            rarity: "gold",
          };
          this.progress.passport.badges.push(badge);
          newBadges.push(badge);
        }
      }
    }

    return newBadges;
  }

  private checkCountryBadges(): Badge[] {
    if (!this.progress) return [];

    const newBadges: Badge[] = [];

    // Group cities by country
    const countryCityCounts = new Map<string, Set<string>>();
    for (const stamp of this.progress.passport.stamps) {
      if (!countryCityCounts.has(stamp.countryCode)) {
        countryCityCounts.set(stamp.countryCode, new Set());
      }
      countryCityCounts.get(stamp.countryCode)!.add(stamp.cityName);
    }

    // Award country badges for 3+ cities
    for (const [countryCode, cities] of countryCityCounts) {
      if (cities.size >= 3) {
        const badgeId = `country_${countryCode.toLowerCase()}`;
        const badgeExists = this.progress.passport.badges.some((b) => b.id === badgeId);

        if (!badgeExists) {
          const countryName = this.getCountryName(countryCode);
          const badge: Badge = {
            id: badgeId,
            name: `${countryName} Explorer`,
            description: `Visited 3+ cities in ${countryName}`,
            category: "special",
            iconEmoji: "🌍",
            earnedAt: new Date(),
            rarity: "platinum",
          };
          this.progress.passport.badges.push(badge);
          newBadges.push(badge);
        }
      }
    }

    return newBadges;
  }

  private getCountryName(countryCode: string): string {
    const countryNames: Record<string, string> = {
      US: "United States",
      FR: "France",
      GB: "United Kingdom",
      JP: "Japan",
      ES: "Spain",
      IT: "Italy",
      DE: "Germany",
      CA: "Canada",
      AU: "Australia",
      NL: "Netherlands",
      BE: "Belgium",
      CH: "Switzerland",
      AT: "Austria",
      SE: "Sweden",
      NO: "Norway",
      DK: "Denmark",
      FI: "Finland",
      IE: "Ireland",
      PT: "Portugal",
      GR: "Greece",
      CZ: "Czech Republic",
      PL: "Poland",
      HU: "Hungary",
      RO: "Romania",
      BG: "Bulgaria",
      HR: "Croatia",
      SI: "Slovenia",
      SK: "Slovakia",
    };
    return countryNames[countryCode] || countryCode;
  }

  /* ========== POI VISITS ========== */

  async visitPOI(poi: POI): Promise<{
    isNew: boolean;
    xpGained: number;
    achievements: Achievement[];
    leveledUp: boolean;
    newLevel?: ExplorerTitle;
    mysteryBox?: MysteryBox;
    newStamp?: Stamp;
    newBadges?: Badge[];
  }> {
    if (!this.progress) return { isNew: false, xpGained: 0, achievements: [], leveledUp: false };

    const isNew = !this.visitedPOIs.has(poi.id);

    if (isNew) {
      this.visitedPOIs.add(poi.id);
      this.saveVisitedPOIs();

      // Update statistics
      this.progress.passport.statistics.poisVisited++;
      this.updateStreak();

      // Award XP for POI visit
      let totalXP = 10;
      let leveledUp = this.addXP(totalXP);

      // Try to create a stamp
      const newStamp = await this.createStamp(poi);

      // Award bonus XP for new stamp
      if (newStamp) {
        const stampXP = newStamp.rarity === "legendary" ? 50 : newStamp.rarity === "rare" ? 25 : 15;
        totalXP += stampXP;
        leveledUp = this.addXP(stampXP) || leveledUp;
      }

      // Check for achievements
      const newAchievements = this.checkAchievements();

      // Check for city and country badges
      const cityBadges = this.checkCityBadges();
      const countryBadges = this.checkCountryBadges();
      const newBadges = [...cityBadges, ...countryBadges];

      // Update quest progress
      this.updateQuestProgress({ type: "visit_poi", poi });

      // Check for mystery box
      const mysteryBox = this.checkMysteryBox();

      this.saveProgress();

      return {
        isNew,
        xpGained: totalXP,
        achievements: newAchievements,
        leveledUp,
        newLevel: leveledUp ? this.progress.passport.level.title : undefined,
        mysteryBox,
        newStamp: newStamp || undefined,
        newBadges: newBadges.length > 0 ? newBadges : undefined,
      };
    }

    return { isNew: false, xpGained: 0, achievements: [], leveledUp: false };
  }

  /* ========== XP & LEVELING ========== */

  private addXP(amount: number): boolean {
    if (!this.progress) return false;

    this.progress.passport.level.xp += amount;

    // Check for level up
    while (this.progress.passport.level.xp >= this.progress.passport.level.xpToNextLevel) {
      this.progress.passport.level.xp -= this.progress.passport.level.xpToNextLevel;
      this.progress.passport.level.level++;
      this.progress.passport.level.xpToNextLevel = this.calculateXPForNextLevel(
        this.progress.passport.level.level
      );
      this.progress.passport.level.title = this.getTitleForLevel(
        this.progress.passport.level.level
      );
      return true;
    }

    return false;
  }

  private calculateXPForNextLevel(level: number): number {
    return Math.floor(100 * Math.pow(1.5, level - 1));
  }

  private getTitleForLevel(level: number): ExplorerTitle {
    if (level >= 20) return "Legend";
    if (level >= 15) return "City Expert";
    if (level >= 10) return "Local Guide";
    if (level >= 6) return "Explorer";
    if (level >= 3) return "Traveler";
    return "Tourist";
  }

  /* ========== ACHIEVEMENTS ========== */

  private checkAchievements(): Achievement[] {
    if (!this.progress) return [];

    const newAchievements: Achievement[] = [];

    for (const achievement of ACHIEVEMENT_LIBRARY) {
      const alreadyEarned = this.progress.achievements.some((a) => a.id === achievement.id);
      if (alreadyEarned) continue;

      const earned = this.checkAchievementRequirement(achievement);
      if (earned) {
        this.progress.achievements.push(achievement);
        this.addXP(achievement.reward.xp);
        newAchievements.push(achievement);
      }
    }

    return newAchievements;
  }

  private checkAchievementRequirement(achievement: Achievement): boolean {
    if (!this.progress) return false;

    const stats = this.progress.passport.statistics;
    const { type, target } = achievement.requirement;

    switch (type) {
      case "pois_visited":
        return stats.poisVisited >= target;
      case "cities_visited":
        return stats.citiesVisited >= target;
      case "distance_walked":
        return stats.totalDistance >= target;
      case "streak_days":
        return stats.currentStreak >= target;
      case "stamps_collected":
        return this.progress.passport.stamps.length >= target;
      default:
        return false;
    }
  }

  /* ========== QUESTS ========== */

  private updateQuestProgress(event: { type: string; poi?: POI }): void {
    if (!this.progress) return;

    for (const quest of this.progress.activeQuests) {
      if (quest.isCompleted) continue;

      for (const req of quest.requirements) {
        if (event.type === "visit_poi" && req.type === "visit_pois") {
          req.current++;
        }
        if (event.type === "visit_poi" && req.type === "visit_categories" && event.poi) {
          if (!req.details.category || req.details.category === event.poi.category) {
            req.current++;
          }
        }
      }

      // Calculate progress
      const totalProgress = quest.requirements.reduce((sum, req) => {
        return sum + (req.current / req.target) * 100;
      }, 0);
      quest.progress = totalProgress / quest.requirements.length;

      // Check completion
      const allComplete = quest.requirements.every((req) => req.current >= req.target);
      if (allComplete) {
        this.completeQuest(quest);
      }
    }
  }

  private completeQuest(quest: Quest): void {
    if (!this.progress) return;

    quest.isCompleted = true;
    quest.isActive = false;
    quest.progress = 100;

    this.progress.completedQuests.push(quest);
    this.progress.activeQuests = this.progress.activeQuests.filter((q) => q.id !== quest.id);

    // Award rewards
    this.addXP(quest.reward.xp);
    if (quest.reward.badge) {
      this.progress.passport.badges.push(quest.reward.badge);
    }
    if (quest.reward.mysteryBox) {
      const box = this.generateMysteryBox();
      this.progress.mysteryBoxes.push(box);
    }

    this.progress.passport.statistics.questsCompleted++;
  }

  /* ========== MYSTERY BOXES ========== */

  private checkMysteryBox(): MysteryBox | undefined {
    if (!this.progress) return undefined;

    // 10% chance on every 10th POI
    if (this.progress.passport.statistics.poisVisited % 10 === 0 && Math.random() < 0.1) {
      const box = this.generateMysteryBox();
      this.progress.mysteryBoxes.push(box);
      return box;
    }

    return undefined;
  }

  private generateMysteryBox(): MysteryBox {
    const rarities: Array<"common" | "rare" | "epic" | "legendary"> = [
      "common",
      "common",
      "common",
      "rare",
      "rare",
      "epic",
      "legendary",
    ];
    const rarity = rarities[Math.floor(Math.random() * rarities.length)];

    return {
      id: `mystery_${Date.now()}_${Math.random()}`,
      rarity,
      reward: {
        type: "fact",
        content: "You found a mystery box! Open it to discover your reward.",
      },
      earnedAt: new Date(),
      opened: false,
    };
  }

  /* ========== STREAK TRACKING ========== */

  private updateStreak(): void {
    if (!this.progress) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActive = new Date(this.progress.passport.statistics.lastActiveDate);
    lastActive.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      // Same day, no change
      return;
    } else if (daysDiff === 1) {
      // Consecutive day
      this.progress.passport.statistics.currentStreak++;
      this.progress.passport.statistics.longestStreak = Math.max(
        this.progress.passport.statistics.longestStreak,
        this.progress.passport.statistics.currentStreak
      );
    } else {
      // Streak broken
      this.progress.passport.statistics.currentStreak = 1;
    }

    this.progress.passport.statistics.lastActiveDate = new Date();
  }

  /* ========== PUBLIC GETTERS ========== */

  getProgress(): UserProgress | null {
    return this.progress;
  }

  getActiveQuests(): Quest[] {
    return this.progress?.activeQuests || [];
  }

  getAchievements(): Achievement[] {
    return this.progress?.achievements || [];
  }

  hasVisited(poiId: string): boolean {
    return this.visitedPOIs.has(poiId);
  }

  getStamps(): Stamp[] {
    return this.progress?.passport.stamps || [];
  }

  getStampsByCity(): Map<string, Stamp[]> {
    const stampsByCity = new Map<string, Stamp[]>();
    for (const stamp of this.getStamps()) {
      if (!stampsByCity.has(stamp.cityName)) {
        stampsByCity.set(stamp.cityName, []);
      }
      stampsByCity.get(stamp.cityName)!.push(stamp);
    }
    return stampsByCity;
  }

  getBadges(): Badge[] {
    return this.progress?.passport.badges || [];
  }
}

/* ============================================
   HELPER FUNCTIONS
============================================ */

function getEndOfDay(): Date {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end;
}

function createBadge(name: string, category: string): Badge {
  return {
    id: `badge_${name.toLowerCase().replace(/\s+/g, "_")}`,
    name,
    description: `Earned by exploring ${category}s`,
    category: "category",
    iconEmoji: getCategoryEmoji(category),
    earnedAt: new Date(),
    rarity: "silver",
  };
}

function getCategoryEmoji(category: string): string {
  const emojiMap: Record<string, string> = {
    restaurant: "🍽️",
    cafe: "☕",
    museum: "🎨",
    park: "🌳",
    attraction: "⭐",
  };
  return emojiMap[category] || "🏆";
}

/* ============================================
   EXPORT SINGLETON INSTANCE
============================================ */

export const gamificationService = new GamificationService();