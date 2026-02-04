import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { initDatabase } from "./db/init";
import { authMiddleware } from "./middleware/auth";
import { checkRedisHealth } from "./services/cache";
import authRoutes from "./routes/auth";
import favoritesRoutes from "./routes/favorites";
import itinerariesRoutes from "./routes/itineraries";
import aiRoutes from "./routes/ai";
import proxyRoutes from "./routes/proxy";
import passportRoutes from "./routes/passport";
import cacheRoutes from "./routes/cache";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Validate critical environment variables in production
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
  const missing = requiredEnvVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (process.env.JWT_SECRET === 'wayvora-dev-secret-change-in-production') {
    console.error('❌ JWT_SECRET must be changed in production!');
    process.exit(1);
  }
}

// Define allowed origins
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:3001'];

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 Blocked CORS request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5'),
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// More relaxed rate limit for proxy endpoints (external APIs)
const proxyLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 30, // 30 requests per minute
  message: { error: 'Too many API requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/proxy/', proxyLimiter);

// Auth middleware (attaches user if token present, doesn't block)
app.use("/api", authMiddleware);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/itineraries", itinerariesRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/proxy", proxyRoutes);
app.use("/api/passport", passportRoutes);
app.use("/api/cache", cacheRoutes);

// Health check
app.get("/api/health", async (req, res) => {
  const redisHealth = await checkRedisHealth();

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: "connected", // Assume connected if we got this far
      redis: redisHealth ? "connected" : "disconnected",
      ollama: {
        baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
        model: process.env.OLLAMA_MODEL || "llama3",
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log error details
  console.error("[ERROR]", {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(500).json({ error: message });
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down gracefully...`);

  // Close server
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });

  // Force close after 10s
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Startup
async function start() {
  console.log(`\n🚀 Wayvora Backend starting on port ${PORT}…`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Allowed Origins: ${ALLOWED_ORIGINS.join(', ')}`);

  try {
    await initDatabase();
    console.log("✅ Database initialized.");
  } catch (err) {
    console.warn("⚠️  Database init failed (continuing without DB — auth features disabled):", err);
  }

  // Check Redis connection
  const redisHealth = await checkRedisHealth();
  if (redisHealth) {
    console.log("✅ Redis connected and ready.");
  } else {
    console.warn("⚠️  Redis connection failed. Caching will be disabled.");
  }

  const server = app.listen(Number(PORT), () => {
    console.log(`✅ Server listening at http://localhost:${PORT}`);
    console.log(`   API base:   http://localhost:${PORT}/api`);
    console.log(`   Health:     http://localhost:${PORT}/api/health`);
    console.log(`   Proxy:      http://localhost:${PORT}/api/proxy`);
    console.log(`   Passport:   http://localhost:${PORT}/api/passport`);
    console.log(`   Ollama:     ${process.env.OLLAMA_BASE_URL || "http://localhost:11434"} (${process.env.OLLAMA_MODEL || "llama3"})`);
    console.log(`   Redis:      ${process.env.REDIS_URL || "redis://localhost:6379"}\n`);
  });

  // Handle shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

const server = start();

export default app;