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

const STORAGE_KEY_PROGRESS = "wayvora_user_progress";
const STORAGE_KEY_VISITED_POIS = "wayvora_visited_pois";
const STORAGE_KEY_TRIP_HISTORY = "wayvora_trip_history";

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
      this.progress = JSON.parse(stored);
    } else {
      this.progress = this.createNewProgress();
      this.saveProgress();
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

  /* ========== POI VISITS ========== */

  visitPOI(poi: POI): {
    isNew: boolean;
    xpGained: number;
    achievements: Achievement[];
    leveledUp: boolean;
    newLevel?: ExplorerTitle;
    mysteryBox?: MysteryBox;
  } {
    if (!this.progress) return { isNew: false, xpGained: 0, achievements: [], leveledUp: false };

    const isNew = !this.visitedPOIs.has(poi.id);

    if (isNew) {
      this.visitedPOIs.add(poi.id);
      this.saveVisitedPOIs();

      // Update statistics
      this.progress.passport.statistics.poisVisited++;
      this.updateStreak();

      // Award XP
      const xpGained = 10;
      const leveledUp = this.addXP(xpGained);

      // Check for achievements
      const newAchievements = this.checkAchievements();

      // Update quest progress
      this.updateQuestProgress({ type: "visit_poi", poi });

      // Check for mystery box
      const mysteryBox = this.checkMysteryBox();

      this.saveProgress();

      return {
        isNew,
        xpGained,
        achievements: newAchievements,
        leveledUp,
        newLevel: leveledUp ? this.progress.passport.level.title : undefined,
        mysteryBox,
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