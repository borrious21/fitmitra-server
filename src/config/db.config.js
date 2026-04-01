import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Check your .env file.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false, sslmode: "require" },
  max:                     10,
  min:                     2,
  idleTimeoutMillis:       30_000,
  connectionTimeoutMillis: 3_000,
  allowExitOnIdle:         false,
});

pool.on("error", (err) => {
  console.error("[pg pool] unexpected error:", err.message);
});

export async function connectDB() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      "SELECT current_database() AS db, NOW() AS time"
    );
    console.log(`[pg] connected → db: ${rows[0].db}  at: ${rows[0].time}`);
  } finally {
    client.release();
  }
}

export async function disconnectDB() {
  await pool.end();
  console.log("[pg] pool closed");
}

export default pool;