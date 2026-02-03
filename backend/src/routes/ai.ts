import { Router, Response, Request } from "express";
import { generateRecommendations, generateTravelTips } from "../services/ollama";

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

export default router;
