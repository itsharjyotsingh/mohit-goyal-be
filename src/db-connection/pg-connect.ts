// pg-connect.ts
import { Pool, types } from "pg";

// Parse JSON/JSONB
types.setTypeParser(114, (value) => JSON.parse(value));
types.setTypeParser(3802, (value) => JSON.parse(value));

const isProd = process.env.NODE_ENV === "PRODUCTION";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProd
    ? { rejectUnauthorized: false }
    : false,
  max: Number(process.env.PG_POOL_MAX || 20),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

pool.on("connect", () => {
  console.log("Connected to the database");
});

export default pool;
