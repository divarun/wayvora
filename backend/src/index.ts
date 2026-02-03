import express from "express";
import dotenv from "dotenv";
import { initDatabase } from "./db/init";
import { authMiddleware } from "./middleware/auth";
import authRoutes from "./routes/auth";
import favoritesRoutes from "./routes/favorites";
import itinerariesRoutes from "./routes/itineraries";
import aiRoutes from "./routes/ai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.status(204).send();
    return;
  }
  next();
});

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth middleware (attaches user if token present, doesn't block)
app.use("/api", authMiddleware);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/itineraries", itinerariesRoutes);
app.use("/api/ai", aiRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      model: process.env.OLLAMA_MODEL || "llama3",
    },
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[UNHANDLED]", err);
  res.status(500).json({ error: "Internal server error." });
});

// Startup
async function start() {
  console.log(`\n🚀 Wayvora Backend starting on port ${PORT}…`);

  try {
    await initDatabase();
    console.log("✅ Database initialized.");
  } catch (err) {
    console.warn("⚠️  Database init failed (continuing without DB — auth features disabled):", err);
  }

  app.listen(Number(PORT), () => {
    console.log(`✅ Server listening at http://localhost:${PORT}`);
    console.log(`   API base: http://localhost:${PORT}/api`);
    console.log(`   Health:   http://localhost:${PORT}/api/health`);
    console.log(`   Ollama:   ${process.env.OLLAMA_BASE_URL || "http://localhost:11434"} (${process.env.OLLAMA_MODEL || "llama3"})\n`);
  });
}

start();

export default app;
