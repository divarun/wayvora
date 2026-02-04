import { Router, Request, Response } from "express";
import { getCache, setCache, CACHE_TTL } from "../services/cache";
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

    // Create a better cache key using full query hash
    const queryHash = crypto.createHash('md5').update(query).digest('hex');
    const cacheKey = getCacheKey('overpass', queryHash);

    const cachedData = await getCache(cacheKey);

    if (cachedData) {
      console.log('[CACHE HIT] Overpass query:', queryHash.substring(0, 8));
      return res.json(cachedData);
    }

    console.log('[CACHE MISS] Overpass query - fetching from API:', queryHash.substring(0, 8));
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
        console.log(`[CACHE] Storing ${data.elements.length} POIs for query ${queryHash.substring(0, 8)}`);
        await setCache(cacheKey, data, CACHE_TTL.OVERPASS);
      } else {
        console.log(`[NO CACHE] Empty result for query ${queryHash.substring(0, 8)} - not caching`);
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