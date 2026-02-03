import { Router, Request, Response } from "express";

const router = Router();

const OVERPASS_URL = process.env.OVERPASS_URL || "https://overpass-api.de/api";
const NOMINATIM_URL = process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org";

// Increase timeout for slow APIs (60 seconds)
const API_TIMEOUT = 60000;

// POST /proxy/overpass - Proxy requests to Overpass API
router.post("/overpass", async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: "Query string is required" });
    }

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
          details: errorText.substring(0, 200) // Limit error message size
        });
      }

      const data = await response.json();
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

// GET /proxy/nominatim/search - Proxy requests to Nominatim API
router.get("/nominatim/search", async (req: Request, res: Response) => {
  try {
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    const url = `${NOMINATIM_URL}/search?${queryParams}`;

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

// GET /proxy/nominatim/reverse - Proxy reverse geocoding requests
router.get("/nominatim/reverse", async (req: Request, res: Response) => {
  try {
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    const url = `${NOMINATIM_URL}/reverse?${queryParams}`;

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