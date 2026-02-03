import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const config = {
  connectionString: process.env.DATABASE_URL || "postgresql://wayvora:wayvora@localhost:5432/wayvora",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(config);

pool.on("error", (err) => {
  console.error("Idle client error:", err);
});

export async function query(text: string, params?: unknown[]) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 200) {
    console.warn(`Slow query (${duration}ms): ${text.slice(0, 100)}`);
  }
  return result;
}

export default pool;
