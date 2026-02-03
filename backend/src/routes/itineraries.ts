import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { query } from "../db/pool";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

// GET /itineraries
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query(
      "SELECT id, name, route_data, notes, created_at, updated_at FROM itineraries WHERE user_id = $1 ORDER BY created_at DESC",
      [req.userId]
    );

    const items = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      route: row.route_data,
      notes: row.notes,
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    }));

    res.json(items);
  } catch (err) {
    console.error("[ITIN] Get error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// POST /itineraries
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, route, notes } = req.body;

    const result = await query(
      `INSERT INTO itineraries (user_id, name, route_data, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, route_data, notes, created_at, updated_at`,
      [req.userId, name || "My Trip", route || {}, notes || null]
    );

    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      name: row.name,
      route: row.route_data,
      notes: row.notes,
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    });
  } catch (err) {
    console.error("[ITIN] Create error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// PUT /itineraries/:id
router.put("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, route, notes } = req.body;

    // Verify ownership
    const check = await query("SELECT id FROM itineraries WHERE id = $1 AND user_id = $2", [id, req.userId]);
    if (!check.rows[0]) {
      res.status(404).json({ error: "Itinerary not found." });
      return;
    }

    const setClauses: string[] = ["updated_at = NOW()"];
    const values: unknown[] = [];
    let idx = 1;

    if (name !== undefined) { setClauses.push(`name = $${idx}`); values.push(name); idx++; }
    if (route !== undefined) { setClauses.push(`route_data = $${idx}`); values.push(route); idx++; }
    if (notes !== undefined) { setClauses.push(`notes = $${idx}`); values.push(notes); idx++; }

    values.push(id);
    const result = await query(
      `UPDATE itineraries SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING id, name, route_data, notes, created_at, updated_at`,
      values
    );

    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      route: row.route_data,
      notes: row.notes,
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    });
  } catch (err) {
    console.error("[ITIN] Update error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// DELETE /itineraries/:id
router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query(
      "DELETE FROM itineraries WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId]
    );
    if (!result.rowCount || result.rowCount === 0) {
      res.status(404).json({ error: "Itinerary not found." });
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error("[ITIN] Delete error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// POST /itineraries/sync — bulk upsert from guest
router.post("/sync", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itineraries } = req.body;
    if (!Array.isArray(itineraries)) {
      res.status(400).json({ error: "itineraries array is required." });
      return;
    }

    const synced: unknown[] = [];

    for (const it of itineraries) {
      const id = uuidv4();
      const result = await query(
        `INSERT INTO itineraries (id, user_id, name, route_data, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, route_data, notes, created_at, updated_at`,
        [id, req.userId, it.name || "My Trip", it.route || {}, it.notes || null]
      );
      if (result.rows[0]) {
        const row = result.rows[0];
        synced.push({
          id: row.id,
          name: row.name,
          route: row.route_data,
          notes: row.notes,
          createdAt: new Date(row.created_at).getTime(),
          updatedAt: new Date(row.updated_at).getTime(),
        });
      }
    }

    res.json(synced);
  } catch (err) {
    console.error("[ITIN] Sync error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
