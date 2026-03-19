import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

// Bevorzuge Replit-eigene PostgreSQL-Variablen (PGHOST), falls gesetzt.
// Falls nur DATABASE_URL gesetzt ist, diese verwenden.
const connectionString =
  process.env.PGHOST
    ? `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT ?? "5432"}/${process.env.PGDATABASE}`
    : process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Keine Datenbankverbindung konfiguriert (weder PGHOST noch DATABASE_URL gesetzt).");
}

export const pool = new Pool({ connectionString });

pool.on("error", (err) => {
  console.error("[DB] Verbindungsfehler:", err.message);
});

export const db = drizzle(pool, { schema });
