import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import pool from "../db/pool";
import { getCache, setCache, deleteCache, CACHE_TTL, CacheKeys, invalidateUserCache } from "../services/cache";
import { generateNeighborhoodFact } from "../services/ollama";

const router = Router();

// All passport routes require authentication
router.use(requireAuth);

/**
 * GET /passport/me
 * Get current user's passport with full statistics
 */
router.get("/me", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Check cache first
    const cacheKey = CacheKeys.userPassport(userId);
    const cachedPassport = await getCache(cacheKey);

    if (cachedPassport) {
      console.log('[CACHE HIT] User passport');
      return res.json(cachedPassport);
    }

    console.log('[CACHE MISS] User passport - fetching from DB');

    // Get or create passport
    let passport = await pool.query(
      'SELECT * FROM explorer_passports WHERE user_id = $1',
      [userId]
    );

    if (passport.rows.length === 0) {
      // Create new passport
      passport = await pool.query(
        `INSERT INTO explorer_passports (user_id, statistics)
         VALUES ($1, $2)
         RETURNING *`,
        [userId, JSON.stringify({
          citiesVisited: 0,
          poisVisited: 0,
          distanceTraveled: 0,
          countriesExplored: 0
        })]
      );
    }

    // Get summary data
    const summary = await pool.query(
      'SELECT * FROM get_passport_summary($1)',
      [userId]
    );

    const result = {
      ...passport.rows[0],
      summary: summary.rows[0]
    };

    // Cache the result
    await setCache(cacheKey, result, CACHE_TTL.PASSPORT);

    res.json(result);
  } catch (err) {
    console.error('[PASSPORT] Error getting passport:', err);
    res.status(500).json({ error: 'Failed to fetch passport data' });
  }
});

/**
 * GET /passport/stamps
 * Get all user's stamps grouped by city
 */
router.get("/stamps", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Check cache first
    const cacheKey = CacheKeys.userStamps(userId);
    const cachedStamps = await getCache(cacheKey);

    if (cachedStamps) {
      console.log('[CACHE HIT] User stamps');
      return res.json(cachedStamps);
    }

    console.log('[CACHE MISS] User stamps - fetching from DB');

    const result = await pool.query(
      'SELECT * FROM get_stamps_by_city($1)',
      [userId]
    );

    const stamps = result.rows;

    // Cache the result
    await setCache(cacheKey, stamps, CACHE_TTL.STAMPS);

    res.json(stamps);
  } catch (err) {
    console.error('[PASSPORT] Error getting stamps:', err);
    res.status(500).json({ error: 'Failed to fetch stamps' });
  }
});

/**
 * POST /passport/stamps
 * Award a stamp for visiting a neighborhood
 */
router.post("/stamps", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { neighborhoodName, cityName, countryCode, coordinates, uniquePOIsVisited } = req.body;

    if (!neighborhoodName || !cityName || !countryCode || !coordinates) {
      return res.status(400).json({
        error: 'Missing required fields: neighborhoodName, cityName, countryCode, coordinates'
      });
    }

    // Determine rarity based on city name (simplified logic)
    const rarity = determineRarity(cityName);

    // Generate AI description for the neighborhood
    let aiDescription: string | null = null;
    try {
      aiDescription = await generateNeighborhoodFact(neighborhoodName, cityName);
    } catch (err) {
      console.warn('Failed to generate AI description, using fallback');
      aiDescription = `${neighborhoodName} is a vibrant area in ${cityName} with unique character.`;
    }

    // Insert or update stamp
    const result = await pool.query(
      `INSERT INTO stamps (
        user_id, neighborhood_name, city_name, country_code,
        coordinates, rarity, unique_pois_visited, ai_description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id, neighborhood_name, city_name)
      DO UPDATE SET
        unique_pois_visited = stamps.unique_pois_visited + EXCLUDED.unique_pois_visited,
        earned_at = NOW()
      RETURNING *`,
      [userId, neighborhoodName, cityName, countryCode,
       JSON.stringify(coordinates), rarity, uniquePOIsVisited || 1, aiDescription]
    );

    const stamp = result.rows[0];

    // Check for city badge (5+ neighborhoods in city)
    await pool.query('SELECT check_city_badge($1, $2)', [userId, cityName]);

    // Check for country badge (3+ cities in country)
    await pool.query('SELECT check_country_badge($1, $2)', [userId, countryCode]);

    // Award XP (base 10 XP + rarity bonus)
    const xpGain = 10 + (rarity === 'legendary' ? 50 : rarity === 'rare' ? 20 : 10);
    await awardXP(userId, xpGain);

    // Invalidate caches
    await invalidateUserCache(userId);

    res.json({
      stamp,
      xpGained: xpGain,
      aiDescription
    });
  } catch (err) {
    console.error('[PASSPORT] Error awarding stamp:', err);
    res.status(500).json({ error: 'Failed to award stamp' });
  }
});

/**
 * GET /passport/badges
 * Get all user's badges
 */
router.get("/badges", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Check cache first
    const cacheKey = CacheKeys.userBadges(userId);
    const cachedBadges = await getCache(cacheKey);

    if (cachedBadges) {
      console.log('[CACHE HIT] User badges');
      return res.json(cachedBadges);
    }

    console.log('[CACHE MISS] User badges - fetching from DB');

    const result = await pool.query(
      `SELECT * FROM badges
       WHERE user_id = $1
       ORDER BY earned_at DESC`,
      [userId]
    );

    const badges = result.rows;

    // Cache the result
    await setCache(cacheKey, badges, CACHE_TTL.STAMPS);

    res.json(badges);
  } catch (err) {
    console.error('[PASSPORT] Error getting badges:', err);
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

/**
 * GET /passport/achievements
 * Get all user's achievements
 */
router.get("/achievements", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await pool.query(
      `SELECT * FROM achievements
       WHERE user_id = $1
       ORDER BY earned_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('[PASSPORT] Error getting achievements:', err);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

/**
 * GET /passport/statistics
 * Get detailed user statistics
 */
router.get("/statistics", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get comprehensive stats
    const stats = await pool.query(
      `SELECT
        COUNT(DISTINCT s.city_name) as cities_visited,
        COUNT(DISTINCT s.country_code) as countries_explored,
        COUNT(s.id) as total_stamps,
        SUM(s.unique_pois_visited) as total_pois_visited,
        COUNT(DISTINCT CASE WHEN s.rarity = 'legendary' THEN s.id END) as legendary_stamps,
        COUNT(DISTINCT CASE WHEN s.rarity = 'rare' THEN s.id END) as rare_stamps,
        COUNT(DISTINCT CASE WHEN s.rarity = 'common' THEN s.id END) as common_stamps,
        (SELECT COUNT(*) FROM badges WHERE user_id = $1) as total_badges,
        (SELECT COUNT(*) FROM achievements WHERE user_id = $1) as total_achievements,
        (SELECT level FROM explorer_passports WHERE user_id = $1) as level,
        (SELECT xp FROM explorer_passports WHERE user_id = $1) as xp
      FROM stamps s
      WHERE s.user_id = $1`,
      [userId]
    );

    res.json(stats.rows[0]);
  } catch (err) {
    console.error('[PASSPORT] Error getting statistics:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * Helper function to determine stamp rarity
 */
function determineRarity(cityName: string): 'common' | 'rare' | 'legendary' {
  const majorCities = [
    'Paris', 'London', 'New York', 'Tokyo', 'Berlin', 'Rome',
    'Madrid', 'Barcelona', 'Amsterdam', 'Vienna', 'Prague', 'Budapest'
  ];

  const rareCities = [
    'Lisbon', 'Dublin', 'Copenhagen', 'Stockholm', 'Helsinki',
    'Oslo', 'Krakow', 'Warsaw', 'Athens', 'Istanbul'
  ];

  if (majorCities.some(city => cityName.toLowerCase().includes(city.toLowerCase()))) {
    return 'common';
  } else if (rareCities.some(city => cityName.toLowerCase().includes(city.toLowerCase()))) {
    return 'rare';
  }

  return 'legendary'; // Small cities and remote locations
}

/**
 * Helper function to award XP and handle level ups
 */
async function awardXP(userId: string, xp: number): Promise<void> {
  const result = await pool.query(
    `UPDATE explorer_passports
     SET xp = xp + $2
     WHERE user_id = $1
     RETURNING *`,
    [userId, xp]
  );

  if (result.rows.length === 0) {
    // Create passport if it doesn't exist
    await pool.query(
      `INSERT INTO explorer_passports (user_id, xp, statistics)
       VALUES ($1, $2, $3)`,
      [userId, xp, JSON.stringify({
        citiesVisited: 0,
        poisVisited: 0,
        distanceTraveled: 0,
        countriesExplored: 0
      })]
    );
    return;
  }

  const passport = result.rows[0];

  // Check for level up
  if (passport.xp >= passport.xp_to_next) {
    const newLevel = passport.level + 1;
    const newXpToNext = calculateXPForNextLevel(newLevel);
    const newTitle = getTitleForLevel(newLevel);

    await pool.query(
      `UPDATE explorer_passports
       SET level = $2, title = $3, xp_to_next = $4
       WHERE user_id = $1`,
      [userId, newLevel, newTitle, newXpToNext]
    );
  }
}

/**
 * Helper function to calculate XP needed for next level
 */
function calculateXPForNextLevel(level: number): number {
  // Exponential scaling: 100 * 1.5^level
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

/**
 * Helper function to get title for level
 */
function getTitleForLevel(level: number): string {
  if (level >= 50) return 'Legendary Explorer';
  if (level >= 40) return 'Master Navigator';
  if (level >= 30) return 'World Wanderer';
  if (level >= 20) return 'Globe Trotter';
  if (level >= 15) return 'Seasoned Traveler';
  if (level >= 10) return 'Explorer';
  if (level >= 5) return 'Adventurer';
  return 'Tourist';
}

export default router;