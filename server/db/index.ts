import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

// Ensure the connection string is correctly formatted for the local Replit environment
const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });
