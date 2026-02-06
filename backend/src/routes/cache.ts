import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { deleteCachePattern, checkRedisHealth } from "../services/cache";
import { warmGeocodingCache } from "../scripts/warmGeocoding";
import { warmMajorCities, warmTopCities } from "../scripts/warmCache";

const router = Router();

/**
 * GET /cache/health - Check Redis health
 */
router.get("/health", async (req: Request, res: Response) => {
  try {
    const isHealthy = await checkRedisHealth();
    if (isHealthy) {
      return res.json({ status: "healthy", message: "Redis is connected and responding" });
    } else {
      return res.status(503).json({ status: "unhealthy", message: "Redis is not responding" });
    }
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /cache/warm - Trigger cache warming (admin only)
 * Body options:
 * - { mode: 'top' } - Warm top 25 cities with geocoding (default, recommended)
 * - { mode: 'geocoding' } - Only warm Nominatim geocoding cache
 * - { mode: 'poi' } - Only warm POI cache (requires geocoding cache to exist)
 * - { cities: ['Paris, France', 'London, UK'] } - Warm specific cities
 * - { skipExisting: true } - Skip cities that are already cached (for resume)
 * - { retryFailed: true } - Retry only cities that failed in previous run
 */
router.post("/warm", requireAuth, async (req: Request, res: Response) => {
  try {
    const { mode, cities, skipExisting, retryFailed } = req.body;
    const warmingMode = mode ?? 'top';
    const targetCities = Array.isArray(cities) ? cities : undefined;
    const skip = skipExisting ?? false;
    const retry = retryFailed ?? false;

    res.json({
      status: "started",
      message: "Cache warming started in background. Check server logs for progress.",
      mode: warmingMode,
      cities: targetCities ?? (retry ? 'failed cities only' : 'top 25 cities'),
      skipExisting: skip,
      retryFailed: retry,
      note: skip ? 'Will skip already cached cities' :
            retry ? 'Will retry only previously failed cities' :
            'Full warmup - may take 10-20 minutes'
    });

    const run = async () => {
      // Handle retry failed cities
      if (retry) {
        const fs = require('fs');
        const path = require('path');
        const failedFile = path.join(__dirname, '../data/failed_cities.json');

        if (!fs.existsSync(failedFile)) {
          console.log('❌ No failed cities file found. Nothing to retry.');
          return;
        }

        const data = JSON.parse(fs.readFileSync(failedFile, 'utf-8'));
        const citiesToRetry = data.failures.map((f: any) => f.name);

        console.log(`🔄 Retrying ${citiesToRetry.length} failed cities...`);
        await warmMajorCities(citiesToRetry, { skipExisting: false, saveFailures: true });
        return;
      }

      // Handle normal warming modes
      switch (warmingMode) {
        case 'geocoding':
          await warmGeocodingCache(targetCities);
          break;
        case 'poi':
        case 'legacy':
        case 'top':
        default:
          if (targetCities) {
            await warmMajorCities(targetCities, { skipExisting: skip });
          } else {
            await warmMajorCities(undefined, { skipExisting: skip });
          }
      }
    };

    run().catch(err => console.error(`[CACHE WARM:${warmingMode}] Error:`, err));
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /cache/failed - Get list of failed cities from last warmup
 */
router.get("/failed", requireAuth, async (req: Request, res: Response) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const failedFile = path.join(__dirname, '../data/failed_cities.json');

    if (!fs.existsSync(failedFile)) {
      return res.json({
        failures: [],
        message: "No failed cities - all successful or no warmup run yet"
      });
    }

    const data = JSON.parse(fs.readFileSync(failedFile, 'utf-8'));

    return res.json({
      timestamp: data.timestamp,
      count: data.failures.length,
      failures: data.failures,
      message: `${data.failures.length} cities failed in last warmup`
    });
  } catch (error) {
    console.error('[CACHE] Error reading failed cities:', error);
    return res.status(500).json({ error: 'Failed to read failed cities file' });
  }
});

/**
 * DELETE /cache/clear
 * Clear all caches (admin endpoint - requires auth)
 * Query params:
 * - pattern: Optional pattern to clear (e.g., 'overpass', 'nominatim')
 */
router.delete("/clear", requireAuth, async (req: Request, res: Response) => {
  try {
    const { pattern } = req.query;

    let deletedCount = 0;

    if (pattern && typeof pattern === 'string') {
      // Clear specific pattern
      deletedCount = await deleteCachePattern(`wayvora:${pattern}:*`);
      console.log(`[CACHE] Cleared ${deletedCount} keys matching pattern: ${pattern}`);
    } else {
      // Clear all wayvora caches
      deletedCount = await deleteCachePattern('wayvora:*');
      console.log(`[CACHE] Cleared all cache (${deletedCount} keys)`);
    }

    res.json({
      success: true,
      deletedCount,
      pattern: pattern || 'all',
      message: `Cleared ${deletedCount} cached entries`
    });
  } catch (err) {
    console.error('[CACHE] Error clearing cache:', err);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

/**
 * GET /cache/stats
 * Get cache statistics (admin endpoint - requires auth)
 */
router.get("/stats", requireAuth, async (req: Request, res: Response) => {
  try {
    const redis = require("../services/cache").default;

    // Get total keys
    const overpassKeys = await redis.keys('wayvora:overpass:*');
    const nominatimKeys = await redis.keys('wayvora:nominatim:*');
    const aiKeys = await redis.keys('wayvora:ai:*');
    const passportKeys = await redis.keys('wayvora:passport:*');
    const stampKeys = await redis.keys('wayvora:stamps:*');

    // Get sample of overpass keys to show grid-based format
    const sampleOverpassKeys = overpassKeys.slice(0, 5);

    res.json({
      total: overpassKeys.length + nominatimKeys.length + aiKeys.length + passportKeys.length + stampKeys.length,
      breakdown: {
        overpass: overpassKeys.length,
        nominatim: nominatimKeys.length,
        ai: aiKeys.length,
        passport: passportKeys.length,
        stamps: stampKeys.length
      },
      sampleKeys: {
        overpass: sampleOverpassKeys
      },
      note: "Overpass keys use grid-based caching for better hit rates"
    });
  } catch (err) {
    console.error('[CACHE] Error getting cache stats:', err);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

export default router;