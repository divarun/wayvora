import { Router, Request, Response } from "express";
import { getCache, setCache, CACHE_TTL, getGridCacheKey } from "../services/cache";
import crypto from "crypto";

const router = Router();

const OVERPASS_URL = process.env.OVERPASS_URL || "https://overpass-api.de/api";
const NOMINATIM_URL = process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org";

// Increase timeout for slow APIs (60 seconds)
const API_TIMEOUT = 60000;

/**
 * Generate cache key with prefix
 */
function getCacheKey(prefix: string, ...parts: string[]): string {
  return `wayvora:${prefix}:${parts.join(':')}`;
}

// POST /proxy/overpass - Proxy requests to Overpass API with smart caching
router.post("/overpass", async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: "Query string is required" });
    }

    // Extract coordinates, radius, and categories from query for grid-based caching
    const cacheKey = extractGridCacheKey(query);

    // If we can't extract grid info, fall back to hash-based caching
    const fallbackHash = crypto.createHash('md5').update(query).digest('hex');
    const finalCacheKey = cacheKey || getCacheKey('overpass', fallbackHash);

    const cachedData = await getCache(finalCacheKey);

    if (cachedData) {
      console.log('[CACHE HIT] Overpass query:', finalCacheKey);
      return res.json(cachedData);
    }

    console.log('[CACHE MISS] Overpass query - fetching from API:', finalCacheKey);
    const url = `${OVERPASS_URL}/interpreter`;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Wayvora/1.0"
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[PROXY] Overpass API error ${response.status}:`, errorText);
        return res.status(response.status).json({
          error: `Overpass API error: ${response.status}`,
          details: errorText.substring(0, 200)
        });
      }

      const data = await response.json();

      // Only cache if we got meaningful results
      const hasResults = data.elements && Array.isArray(data.elements) && data.elements.length > 0;

      if (hasResults) {
        console.log(`[CACHE] Storing ${data.elements.length} POIs for key ${finalCacheKey}`);
        await setCache(finalCacheKey, data, CACHE_TTL.OVERPASS);
      } else {
        console.log(`[NO CACHE] Empty result for query - not caching`);
      }

      return res.json(data);
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('[PROXY] Overpass request timeout');
        return res.status(504).json({
          error: 'Overpass API timeout. The query took too long to execute. Try a smaller search area or fewer categories.'
        });
      }
      throw fetchError;
    }
  } catch (err) {
    console.error("[PROXY] Overpass error:", err);
    const message = err instanceof Error ? err.message : "Proxy error";
    return res.status(503).json({
      error: `Overpass API unavailable: ${message}`,
      suggestion: 'The Overpass API may be overloaded. Please try again in a moment.'
    });
  }
});

/**
 * Extract grid cache key from Overpass query
 * Parses the query to get coordinates, radius, and categories
 */
function extractGridCacheKey(query: string): string | null {
  try {
    // Match radius, lat, lng with optional spaces
    const aroundMatch = query.match(/around:\s*(\d+)\s*,\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
    if (!aroundMatch) return null;

    const radius = Number(aroundMatch[1]);
    const lat = Number(aroundMatch[2]);
    const lng = Number(aroundMatch[3]);

    const categories: string[] = [];
    if (/node\[\s*"amenity"\s*=\s*"restaurant"\s*\]/.test(query)) categories.push('restaurant');
    if (/node\[\s*"amenity"\s*=\s*"cafe"\s*\]/.test(query)) categories.push('cafe');
    if (/node\[\s*"tourism"\s*=\s*"museum"\s*\]/.test(query) || /way\[\s*"tourism"\s*=\s*"museum"\s*\]/.test(query)) categories.push('museum');
    if (/node\[\s*"leisure"\s*=\s*"park"\s*\]/.test(query) || /way\[\s*"leisure"\s*=\s*"park"\s*\]/.test(query)) categories.push('park');
    if (/node\[\s*"tourism"\s*=\s*"attraction"\s*\]/.test(query) || /node\[\s*"tourism"\s*=\s*"viewpoint"\s*\]/.test(query)) categories.push('attraction');

    categories.sort();

    return getGridCacheKey(lat, lng, radius, categories);
  } catch (err) {
    console.error('[CACHE] Error extracting grid key:', err);
    return null;
  }
}

// GET /proxy/nominatim/search - Proxy requests to Nominatim API with smart caching
router.get("/nominatim/search", async (req: Request, res: Response) => {
  try {
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    const paramsString = queryParams.toString();

    // Check cache first
    const cacheKey = getCacheKey('nominatim', 'search', paramsString);
    const cachedData = await getCache(cacheKey);

    if (cachedData) {
      console.log('[CACHE HIT] Nominatim search:', paramsString.substring(0, 50));
      return res.json(cachedData);
    }

    console.log('[CACHE MISS] Nominatim search - fetching from API:', paramsString.substring(0, 50));
    const url = `${NOMINATIM_URL}/search?${paramsString}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Wayvora/1.0",
          "Accept": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[PROXY] Nominatim search error ${response.status}:`, errorText);
        return res.status(response.status).json({
          error: `Nominatim API error: ${response.status}`
        });
      }

      const data = await response.json();

      // Only cache if we got results
      const hasResults = Array.isArray(data) && data.length > 0;

      if (hasResults) {
        console.log(`[CACHE] Storing ${data.length} Nominatim results`);
        await setCache(cacheKey, data, CACHE_TTL.NOMINATIM);
      } else {
        console.log('[NO CACHE] Empty Nominatim result - not caching');
      }

      return res.json(data);
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return res.status(504).json({ error: 'Nominatim search timeout' });
      }
      throw fetchError;
    }
  } catch (err) {
    console.error("[PROXY] Nominatim search error:", err);
    const message = err instanceof Error ? err.message : "Proxy error";
    return res.status(503).json({ error: `Nominatim API unavailable: ${message}` });
  }
});

// GET /proxy/nominatim/reverse - Proxy reverse geocoding requests with caching
router.get("/nominatim/reverse", async (req: Request, res: Response) => {
  try {
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    const paramsString = queryParams.toString();

    // Check cache first
    const cacheKey = getCacheKey('nominatim', 'reverse', paramsString);
    const cachedData = await getCache(cacheKey);

    if (cachedData) {
      console.log('[CACHE HIT] Nominatim reverse:', paramsString.substring(0, 50));
      return res.json(cachedData);
    }

    console.log('[CACHE MISS] Nominatim reverse - fetching from API:', paramsString.substring(0, 50));
    const url = `${NOMINATIM_URL}/reverse?${paramsString}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Wayvora/1.0",
          "Accept": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[PROXY] Nominatim reverse error ${response.status}:`, errorText);
        return res.status(response.status).json({
          error: `Nominatim API error: ${response.status}`
        });
      }

      const data = await response.json();

      // Only cache if we got a valid result (has display_name or address)
      const hasResults = data && (data.display_name || data.address);

      if (hasResults) {
        console.log('[CACHE] Storing Nominatim reverse result');
        await setCache(cacheKey, data, CACHE_TTL.NOMINATIM);
      } else {
        console.log('[NO CACHE] Empty/invalid Nominatim reverse result - not caching');
      }

      return res.json(data);
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return res.status(504).json({ error: 'Nominatim reverse timeout' });
      }
      throw fetchError;
    }
  } catch (err) {
    console.error("[PROXY] Nominatim reverse error:", err);
    const message = err instanceof Error ? err.message : "Proxy error";
    return res.status(503).json({ error: `Nominatim API unavailable: ${message}` });
  }
});

export default router;