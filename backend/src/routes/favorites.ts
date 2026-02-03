import { Router, Response } from "express";
import { query } from "../db/pool";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth";

const router = Router();

// All routes require auth
router.use(requireAuth);

// GET /favorites
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query(
      "SELECT poi_id, poi_data, saved_at FROM favorites WHERE user_id = $1 ORDER BY saved_at DESC",
      [req.userId]
    );
    const favorites = result.rows.map((row) => ({
      ...row.poi_data,
      id: row.poi_id,
      savedAt: row.saved_at,
    }));
    res.json(favorites);
  } catch (err) {
    console.error("[FAV] Get error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// POST /favorites
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const poi = req.body;
    if (!poi || !poi.id) {
      res.status(400).json({ error: "POI data with id is required." });
      return;
    }

    const poiId = poi.id;
    const poiData = { ...poi };
    delete poiData.id;
    delete poiData.savedAt;

    await query(
      `INSERT INTO favorites (user_id, poi_id, poi_data, saved_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, poi_id) DO NOTHING`,
      [req.userId, poiId, poiData, poi.savedAt || Date.now()]
    );

    res.status(201).json({ ...poi, savedAt: poi.savedAt || Date.now() });
  } catch (err) {
    console.error("[FAV] Add error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// DELETE /favorites/:poiId
router.delete("/:poiId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    await query("DELETE FROM favorites WHERE user_id = $1 AND poi_id = $2", [
      req.userId,
      req.params.poiId,
    ]);
    res.status(204).send();
  } catch (err) {
    console.error("[FAV] Delete error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// POST /favorites/sync — bulk upsert from guest data
router.post("/sync", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { pois } = req.body;
    if (!Array.isArray(pois)) {
      res.status(400).json({ error: "pois array is required." });
      return;
    }

    const inserted: unknown[] = [];

    for (const poi of pois) {
      if (!poi.id) continue;
      const poiData = { ...poi };
      delete poiData.id;
      delete poiData.savedAt;

      const result = await query(
        `INSERT INTO favorites (user_id, poi_id, poi_data, saved_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, poi_id) DO NOTHING
         RETURNING poi_id`,
        [req.userId, poi.id, poiData, poi.savedAt || Date.now()]
      );

      if (result.rows.length > 0) {
        inserted.push(poi);
      }
    }

    res.json(inserted);
  } catch (err) {
    console.error("[FAV] Sync error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
