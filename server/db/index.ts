import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL ist nicht gesetzt.");
}

export const pool = new Pool({ connectionString });

pool.on("error", (err) => {
  console.error("[DB] Verbindungsfehler:", err.message);
});

export const db = drizzle(pool, { schema });

