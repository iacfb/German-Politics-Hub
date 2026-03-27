import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { supabase } from "./supabase-client";

async function ensureTables(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_KEY!;

  const setupSql = `
CREATE TABLE IF NOT EXISTS quizzes (id SERIAL PRIMARY KEY, title TEXT, description TEXT, category TEXT, imageurl TEXT, createdat TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS quizquestions (id SERIAL PRIMARY KEY, quizid INTEGER REFERENCES quizzes(id) ON DELETE CASCADE, text TEXT);
CREATE TABLE IF NOT EXISTS quizoptions (id SERIAL PRIMARY KEY, questionid INTEGER REFERENCES quizquestions(id) ON DELETE CASCADE, text TEXT, partyaffiliation TEXT);
CREATE TABLE IF NOT EXISTS quizresults (id SERIAL PRIMARY KEY, userid TEXT, quizid INTEGER REFERENCES quizzes(id) ON DELETE CASCADE, matchedparty TEXT, partyscores JSONB);
CREATE TABLE IF NOT EXISTS polls (id SERIAL PRIMARY KEY, question TEXT, description TEXT, createdat TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS polloptions (id SERIAL PRIMARY KEY, pollid INTEGER REFERENCES polls(id) ON DELETE CASCADE, text TEXT);
CREATE TABLE IF NOT EXISTS pollvotes (id SERIAL PRIMARY KEY, pollid INTEGER REFERENCES polls(id) ON DELETE CASCADE, optionid INTEGER REFERENCES polloptions(id) ON DELETE CASCADE, userid TEXT);
CREATE TABLE IF NOT EXISTS articles (id SERIAL PRIMARY KEY, title TEXT, summary TEXT, content TEXT, type TEXT, source TEXT, sourceurl TEXT UNIQUE, imageurl TEXT, createdat TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS conversations (id SERIAL PRIMARY KEY, userid TEXT, title TEXT, systemprompt TEXT, createdat TIMESTAMP DEFAULT NOW());
CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, conversationid INTEGER REFERENCES conversations(id) ON DELETE CASCADE, role TEXT, content TEXT, createdat TIMESTAMP DEFAULT NOW());
  `.trim();

  // Try Supabase pg query endpoint (available with service role key)
  const endpoints = [
    `${supabaseUrl}/pg/query`,
    `${supabaseUrl}/rest/v1/rpc/query`,
  ];

  for (const endpoint of endpoints) {
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "apikey": supabaseKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: setupSql }),
      });
      if (resp.ok) {
        console.log("[DB] Tabellen erfolgreich erstellt via", endpoint);
        return;
      }
    } catch (_e) {
      // try next
    }
  }

  // Check if tables already exist
  const { error } = await supabase.from("quizzes").select("id").limit(1);
  if (!error) {
    console.log("[DB] Tabellen existieren bereits in Supabase ✓");
    return;
  }

  console.log("=".repeat(60));
  console.log("[DB] SETUP ERFORDERLICH: Tabellen in Supabase fehlen!");
  console.log("[DB] Bitte einmalig in deinem Supabase SQL-Editor ausführen:");
  console.log("[DB] → https://supabase.com/dashboard → SQL Editor");
  console.log("[DB] SQL-Script abrufen: GET /admin/setup-sql");
  console.log("=".repeat(60));
}

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await ensureTables();
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
