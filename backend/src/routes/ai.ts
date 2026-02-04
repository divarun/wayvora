import { Router, Response, Request } from "express";
import { generateRecommendations, generateTravelTips } from "../services/ollama";
import { generateNeighborhoodFact, generateCitySummary, generateHistoricalContext } from "../services/ollama";

const router = Router();

// POST /ai/recommendations — no auth required
router.post("/recommendations", async (req: Request, res: Response) => {
  try {
    const { selectedPois, userPreferences } = req.body;

    if (!Array.isArray(selectedPois) || selectedPois.length === 0) {
      res.status(400).json({ error: "selectedPois array with at least one item is required." });
      return;
    }

    const recommendations = await generateRecommendations(selectedPois, userPreferences);
    res.json({ recommendations });
  } catch (err) {
    console.error("[AI] Recommendations error:", err);
    const message = err instanceof Error ? err.message : "AI service error.";
    res.status(503).json({ error: `AI service unavailable: ${message}. Make sure Ollama is running.` });
  }
});

// POST /ai/travel-tips — no auth required
router.post("/travel-tips", async (req: Request, res: Response) => {
  try {
    const { poi } = req.body;

    if (!poi || !poi.name) {
      res.status(400).json({ error: "POI object with name is required." });
      return;
    }

    const tips = await generateTravelTips(poi);
    res.json(tips);
  } catch (err) {
    console.error("[AI] Travel tips error:", err);
    const message = err instanceof Error ? err.message : "AI service error.";
    res.status(503).json({ error: `AI service unavailable: ${message}. Make sure Ollama is running.` });
  }
});

/**
 * POST /ai/neighborhood-fact
 * Generate a unique fact about a neighborhood for stamp collection
 */
router.post("/neighborhood-fact", async (req: Request, res: Response) => {
  try {
    const { neighborhood, city } = req.body;

    if (!neighborhood || !city) {
      return res.status(400).json({
        error: "Missing required fields: neighborhood and city"
      });
    }

    const fact = await generateNeighborhoodFact(neighborhood, city);

    res.json({
      fact,
      neighborhood,
      city,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error generating neighborhood fact:", error);
    res.status(500).json({
      error: "Failed to generate neighborhood fact",
      fallback: `${req.body.neighborhood} is a vibrant area in ${req.body.city} with unique character.`
    });
  }
});

/**
 * POST /ai/city-summary
 * Generate a personalized city exploration summary
 */
router.post("/city-summary", async (req: Request, res: Response) => {
  try {
    const { cityName, neighborhoodsVisited, poisVisited } = req.body;

    if (!cityName || !Array.isArray(neighborhoodsVisited) || typeof poisVisited !== 'number') {
      return res.status(400).json({
        error: "Missing required fields: cityName, neighborhoodsVisited (array), poisVisited (number)"
      });
    }

    const summary = await generateCitySummary(cityName, neighborhoodsVisited, poisVisited);

    res.json({
      summary,
      cityName,
      neighborhoodsVisited: neighborhoodsVisited.length,
      poisVisited,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error generating city summary:", error);
    res.status(500).json({
      error: "Failed to generate city summary",
      fallback: `You've explored ${req.body.neighborhoodsVisited?.length || 0} neighborhoods in ${req.body.cityName}!`
    });
  }
});

/**
 * POST /ai/historical-context
 * Generate historical context for a POI
 */
router.post("/historical-context", async (req: Request, res: Response) => {
  try {
    const { name, category, address } = req.body;

    if (!name || !category || !address) {
      return res.status(400).json({
        error: "Missing required fields: name, category, address"
      });
    }

    const context = await generateHistoricalContext({ name, category, address });

    res.json({
      context,
      poi: { name, category, address },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error generating historical context:", error);
    res.status(500).json({
      error: "Failed to generate historical context",
      fallback: `${req.body.name} is a notable ${req.body.category} in this area.`
    });
  }
});



export default router;
