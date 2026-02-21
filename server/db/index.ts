import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

// Deine Render-Datenbank-URL
const connectionString = "postgresql://german_politics_db_user:yBX1zLkw5xgDDDLblP4EDTPtlRSqmPYp@dpg-d6ab3qcr85hc73b7hqeg-a/german_politics_db";

// PostgreSQL Client erstellen
const client = new Client({
  connectionString,
});

// Verbindung herstellen
client.connect();

// Drizzle-DB exportieren
export const db = drizzle(client);
