import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { deleteCachePattern } from "../services/cache";

const router = Router();

/**
 * DELETE /cache/clear
 * Clear all caches (admin endpoint - requires auth)
 * Use this if you have cached bad data
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

    res.json({
      total: overpassKeys.length + nominatimKeys.length + aiKeys.length + passportKeys.length + stampKeys.length,
      breakdown: {
        overpass: overpassKeys.length,
        nominatim: nominatimKeys.length,
        ai: aiKeys.length,
        passport: passportKeys.length,
        stamps: stampKeys.length
      }
    });
  } catch (err) {
    console.error('[CACHE] Error getting cache stats:', err);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

export default router;