import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../db/pool";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "wayvora-dev-secret-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function generateToken(id: string, email: string): string {
  return jwt.sign({ id, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// POST /auth/register
router.post("/register", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    if (!email.includes("@")) {
      res.status(400).json({ error: "Invalid email format." });
      return;
    }

    if (password.length < 4) {
      res.status(400).json({ error: "Password must be at least 4 characters." });
      return;
    }

    const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rowCount && existing.rowCount > 0) {
      res.status(409).json({ error: "Email already registered." });
      return;
    }

    const hashed = await bcrypt.hash(password, 12);
    const result = await query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, created_at",
      [email, hashed]
    );

    const user = result.rows[0];
    const token = generateToken(user.id, user.email);

    res.status(201).json({ token, user: { id: user.id, email: user.email, createdAt: user.created_at } });
  } catch (err) {
    console.error("[AUTH] Register error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// POST /auth/login
router.post("/login", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    const result = await query("SELECT id, email, password FROM users WHERE email = $1", [email]);
    if (!result.rows[0]) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const token = generateToken(user.id, user.email);
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error("[AUTH] Login error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// GET /auth/me
router.get("/me", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query("SELECT id, email, created_at FROM users WHERE id = $1", [req.userId]);
    if (!result.rows[0]) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    res.json({ id: result.rows[0].id, email: result.rows[0].email, createdAt: result.rows[0].created_at });
  } catch (err) {
    console.error("[AUTH] Me error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
