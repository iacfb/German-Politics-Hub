import type { Express } from "express";
// build trigger 2
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
//import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { db } from "./db";
import { quizzes, quizquestions, quizoptions, polls, polloptions, articles } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth Setup
 // await setupAuth(app);
//  registerAuthRoutes(app);

  // Chat Routes - Updated for CivicChat AI
  registerChatRoutes(app);

  // Allow guest chat
  app.get("/api/conversations", async (req, res) => {
//    const userId = req.isAuthenticated() ? (req.user as any).claims.sub : `guest_${req.ip}`;
    const userid = `guest_${req.ip}`;

    const data = await storage.getConversations(userid);
    res.json(data);
  });

  app.post("/api/conversations", async (req, res) => {
//    const userId = req.isAuthenticated() ? (req.user as any).claims.sub : `guest_${req.ip}`;
    const userid = `guest_${req.ip}`;
    const { title, systemPrompt } = req.body;
    const convo = await storage.createConversation(userid, title || "Neue politische Diskussion", systemPrompt);
    res.json(convo);
  });

  // === Quizzes (Wahl-O-Mat) ===
  app.get(api.quizzes.list.path, async (req, res) => {
    const data = await storage.getQuizzes();
    res.json(data);
  });

  app.get(api.quizzes.get.path, async (req, res) => {
    const data = await storage.getQuiz(Number(req.params.id));
    if (!data) return res.status(404).json({ message: "Quiz nicht gefunden" });
    res.json(data);
  });

  app.post(api.quizzes.submit.path, async (req, res) => {
    const quizid = Number(req.params.id);
    const { answers } = req.body;
  //  const userId = req.isAuthenticated() ? (req.user as any).claims.sub : `guest_${req.ip}`;
    const userid = `guest_${req.ip}`;

    const quiz = await storage.getQuiz(quizid);
    if (!quiz) return res.status(404).json({ message: "Quiz nicht gefunden" });

    const scores: Record<string, number> = {};
    const parties = ["CDU", "GRÜNE", "SPD", "FDP", "AfD", "DIE LINKE", "Freie Wähler", "ÖDP", "Die PARTEI", "Volt", "Tierschutzpartei", "Klimaliste BW"];
    parties.forEach(p => scores[p] = 0);

    for (const q of quiz.questions) {
      const selectedOptionId = answers[String(q.id)];
      if (selectedOptionId) {
        const option = q.options.find(o => o.id === selectedOptionId);
        if (option) {
          // New logic: 2 points for full match, 1 for neutral, 0 for mismatch
          // Actually, let's keep it simple for now based on partyAffiliation
          const weight = option.text === "Stimme zu" ? 2 : (option.text === "Neutral" ? 1 : 0);
          if (option.partyaffiliation && option.partyaffiliation !== "Neutral") {
             scores[option.partyaffiliation] = (scores[option.partyaffiliation] || 0) + weight;
          }
        }
      }
    }

    // Normalize to percentages
    const totalPossible = quiz.questions.length * 2;
    const finalScores: Record<string, number> = {};
    Object.entries(scores).forEach(([party, score]) => {
      finalScores[party] = Math.round((score / totalPossible) * 100);
    });

    let maxScore = 0;
    let matchedParty = "Neutral";
    Object.entries(finalScores).forEach(([party, score]) => {
      if (score > maxScore) {
        maxScore = score;
        matchedParty = party;
      }
    });

    const result = await storage.submitQuizResult({
      userid,
      quizid,
      matchedparty,
      partyscores: finalScores
    });

    res.json(result);
  });

  // === Polls (Meinungscheck) ===
  app.get(api.polls.list.path, async (req, res) => {
  //  const userid = req.isAuthenticated() ? (req.user as any).claims.sub : `guest_${req.ip}`;
    const userid = `guest_${req.ip}`;

    const data = await storage.getPolls(userid);
    res.json(data);
  });

  app.post(api.polls.vote.path, async (req, res) => {
    const pollid = Number(req.params.id);
    const { optionid } = req.body;
   // const userId = req.isAuthenticated() ? (req.user as any).claims.sub : `guest_${req.ip}`;
    const userid = `guest_${req.ip}`;


    const hasVoted = await storage.hasVoted(pollid, userid);
    if (hasVoted) {
      return res.status(400).json({ message: "Bereits abgestimmt" });
    }

    await storage.votePoll(pollid, optionid, userid);
    res.json({ success: true });
  });

  // === Articles ===
  app.get(api.articles.list.path, async (req, res) => {
    const data = await storage.getArticles();
    res.json(data);
  });

  // Re-seed with German data if empty or forced
 // const existingQuizzes = await storage.getQuizzes();
  //if (existingQuizzes.length <= 1) { // Force re-seed to ensure all requested data is present
  //  await seedDatabase();
  //}
  // force new build

  // build trigger 13
  // === Admin: Seed Database ===
  app.post("/admin/seed", async (req, res) => {
    try {
      await seedDatabase();
      res.json({ ok: true, message: "Database seeded successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // === Admin: Create Tables (for Render PostgreSQL) ===
  app.post("/admin/init-db", async (req, res) => {
    try {

      //  GANZ OBEN: Alte Tabellen löschen, damit Render sie neu erstellt
      await db.execute(sql`DROP TABLE IF EXISTS pollvotes CASCADE;`);
      await db.execute(sql`DROP TABLE IF EXISTS polloptions CASCADE;`);
      await db.execute(sql`DROP TABLE IF EXISTS polls CASCADE;`);

      await db.execute(sql`DROP TABLE IF EXISTS quizoptions CASCADE;`);
      await db.execute(sql`DROP TABLE IF EXISTS quizquestions CASCADE;`);
      await db.execute(sql`DROP TABLE IF EXISTS quizzes CASCADE;`);

      await db.execute(sql`DROP TABLE IF EXISTS articles CASCADE;`);

      // Danach: Tabellen NEU erstellen
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS quizzes (
          id SERIAL PRIMARY KEY,
          title TEXT,
          description TEXT,
          category TEXT,
          imageurl TEXT,
          createdat TIMESTAMP DEFAULT NOW()
        );
      `);

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS quizquestions (
          id SERIAL PRIMARY KEY,
          quizid INTEGER REFERENCES quizzes(id),
          text TEXT
        );
      `);

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS quizoptions (
          id SERIAL PRIMARY KEY,
          questionid INTEGER REFERENCES quizquestions(id),
          text TEXT,
          partyaffiliation TEXT
        );
      `);

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS polls (
          id SERIAL PRIMARY KEY,
          question TEXT,
          description TEXT,
         createdat TIMESTAMP DEFAULT NOW()
        );
      `);

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS polloptions (
          id SERIAL PRIMARY KEY,
          pollid INTEGER REFERENCES polls(id),
          text TEXT
        );
      `);

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS quizresults (
          id SERIAL PRIMARY KEY,
          userid TEXT,
          quizid INTEGER REFERENCES quizzes(id),
          matchedparty TEXT,
          partyscores TEXT
        );
      `);


      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS pollvotes (
          id SERIAL PRIMARY KEY,
          pollid INTEGER REFERENCES polls(id),
          optionid INTEGER REFERENCES polloptions(id),
          userid TEXT
        );
      `);

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS articles (
          id SERIAL PRIMARY KEY,
          title TEXT,
          summary TEXT,
          content TEXT,
          type TEXT,
          source TEXT,
          sourceurl TEXT,
          imageurl TEXT,
          createdat TIMESTAMP DEFAULT NOW()
        );
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS conversations (
          id SERIAL PRIMARY KEY,
          userid TEXT,
          title TEXT,
          systemprompt TEXT,
          createdat TIMESTAMP DEFAULT NOW()
        );
      `);


      
      res.json({ ok: true, message: "Tables created correctly" });

    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: String(err) });
    }
  });




  return httpServer;
}

async function seedDatabase() {
  console.log("Seeding database with German content...");
  
  // Clear old data to avoid duplicates with old names
  await db.delete(quizoptions);
  await db.delete(quizquestions);
  await db.delete(quizzes);
  await db.delete(polloptions);
  await db.delete(polls);
  await db.delete(articles);

  // Wahl-O-Mat Quizzes
  const quizConfigs = [
    {
      title: "Wahlkompass: Landtagswahl BW 2026",
      description: "Der offizielle Wahlkompass für die Landtagswahl in Baden-Württemberg 2026. 38 Fragen zu den wichtigsten Landesthemen.",
      category: "landtag2026",
      imageurl: "https://www.planet-wissen.de/sendungen/sendung-parteien-kugelschreiber-100~_v-HDready.png",
      questions: [
        { text: "Die Landesregierung soll Unternehmen unterstützen, die in Baden-Württemberg Rüstungsgüter herstellen.", options: [{ text: "Stimme zu", party: "CDU" }, { text: "Stimme zu", party: "FDP" }, { text: "Stimme nicht zu", party: "Grüne" }, { text: "Stimme nicht zu", party: "Linke" }] },
        { text: "Die Pflicht zur Errichtung einer Solaranlage bei vollständigen Dachsanierungen soll entfallen.", options: [{ text: "Stimme zu", party: "AfD" }, { text: "Stimme zu", party: "FDP" }, { text: "Stimme nicht zu", party: "Grüne" }, { text: "Stimme nicht zu", party: "SPD" }] },
        { text: "Die Betreuung in Kindertageseinrichtungen soll für alle Kinder beitragsfrei sein.", options: [{ text: "Stimme zu", party: "SPD" }, { text: "Stimme zu", party: "Linke" }, { text: "Stimme nicht zu", party: "CDU" }, { text: "Stimme nicht zu", party: "FDP" }] },
        { text: "Beim Ausbau der Verkehrsinfrastruktur soll die Schiene Vorrang vor der Straße haben.", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "CDU" }, { text: "Stimme nicht zu", party: "FDP" }] },
        { text: "Die Mietpreisbremse in baden-württembergischen Städten und Gemeinden soll abgeschafft werden.", options: [{ text: "Stimme zu", party: "FDP" }, { text: "Stimme zu", party: "CDU" }, { text: "Stimme nicht zu", party: "SPD" }, { text: "Stimme nicht zu", party: "Linke" }] },
        { text: "Baden-Württemberg soll sich für ein Ende der Einreisekontrollen an den Grenzen zu Frankreich und der Schweiz einsetzen.", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme zu", party: "FDP" }, { text: "Stimme nicht zu", party: "AfD" }] },
        { text: "Mehr Krankenhäuser in Baden-Württemberg sollen in öffentlicher Hand sein.", options: [{ text: "Stimme zu", party: "SPD" }, { text: "Stimme zu", party: "Linke" }, { text: "Stimme nicht zu", party: "FDP" }] },
        { text: "Die Videoüberwachung öffentlicher Plätze soll ausgeweitet werden.", options: [{ text: "Stimme zu", party: "CDU" }, { text: "Stimme zu", party: "AfD" }, { text: "Stimme nicht zu", party: "Grüne" }] },
        { text: "Baden-Württemberg soll nur noch die ökologische Landwirtschaft fördern.", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme nicht zu", party: "CDU" }, { text: "Stimme nicht zu", party: "FDP" }] },
        { text: "Das Land soll Gedenkstätten, die an Verbrechen des Nationalsozialismus erinnern, stärker finanziell unterstützen.", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "AfD" }] },
        { text: "Das mehrgliedrige Schulsystem (Werkrealschule/Hauptschule, Realschule, Gemeinschaftsschule, Gymnasium) soll erhalten bleiben.", options: [{ text: "Stimme zu", party: "CDU" }, { text: "Stimme zu", party: "FDP" }, { text: "Stimme nicht zu", party: "Grüne" }] },
        { text: "Aufträge des Landes sollen weiterhin nur an Unternehmen vergeben werden, die Tariflöhne zahlen.", options: [{ text: "Stimme zu", party: "SPD" }, { text: "Stimme zu", party: "Grüne" }, { text: "Stimme nicht zu", party: "FDP" }] },
        { text: "Alle Erstaufnahmeeinrichtungen des Landes sollen psychosoziale Beratung für Asylsuchende anbieten.", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "AfD" }] },
        { text: "Baden-Württemberg soll sich dafür einsetzen, dass die Sanktionen gegen Russland gelockert werden.", options: [{ text: "Stimme zu", party: "AfD" }, { text: "Stimme zu", party: "Linke" }, { text: "Stimme nicht zu", party: "CDU" }] },
        { text: "Schreibweisen, die geschlechtliche Vielfalt mit Sonderzeichen (z. B. Sternchen, Unterstrich oder Doppelpunkt) sprachlich abbilden, sollen an Schulen verwendet werden dürfen.", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "CDU" }, { text: "Stimme nicht zu", party: "AfD" }] },
        { text: "Die Anzahl der Abgeordneten im baden-württembergischen Landtag soll verringert werden.", options: [{ text: "Stimme zu", party: "FDP" }, { text: "Stimme zu", party: "AfD" }, { text: "Stimme nicht zu", party: "CDU" }] },
        { text: "Das Land soll Projekte gegen Rechtsextremismus weiterhin fördern.", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "AfD" }] },
        { text: "Baden-Württemberg soll sich dafür einsetzen, dass die Steuer auf sehr hohe Erbschaften erhöht wird.", options: [{ text: "Stimme zu", party: "SPD" }, { text: "Stimme zu", party: "Linke" }, { text: "Stimme nicht zu", party: "FDP" }] },
        { text: "Beim Wechsel auf die weiterführende Schule soll die Empfehlung der Grundschule verbindlich sein.", options: [{ text: "Stimme zu", party: "CDU" }, { text: "Stimme nicht zu", party: "Grüne" }, { text: "Stimme nicht zu", party: "SPD" }] },
        { text: "Ein größerer Anteil der Fläche Baden-Württembergs soll für den Bau von Windkraftanlagen genutzt werden können.", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "AfD" }] },
        { text: "Führungspositionen in Landesbehörden sollen zu gleichen Teilen mit Frauen und Männern besetzt werden.", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "CDU" }, { text: "Stimme nicht zu", party: "FDP" }] },
        { text: "In großen Betrieben soll zur Kontrolle der Nutztierhaltung Videoüberwachung angeordnet werden können.", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme zu", party: "Tierschutzpartei" }, { text: "Stimme nicht zu", party: "FDP" }] },
        { text: "Baden-Württemberg soll sich dafür einsetzen, dass mehr Flüge vom Stuttgarter Flughafen angeboten werden.", options: [{ text: "Stimme zu", party: "FDP" }, { text: "Stimme zu", party: "CDU" }, { text: "Stimme nicht zu", party: "Grüne" }] },
        { text: "An baden-württembergischen Schulen soll weiterhin konfessioneller Religionsunterricht angeboten werden.", options: [{ text: "Stimme zu", party: "CDU" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "Linke" }] },
        { text: "Länger leerstehende Mietwohnungen sollen ihren Eigentümerinnen und Eigentümern konsequent entzogen und vermietet werden.", options: [{ text: "Stimme zu", party: "Linke" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "CDU" }, { text: "Stimme nicht zu", party: "FDP" }] },
        { text: "Die Polizei in Baden-Württemberg soll flächendeckend mit Elektroschockpistolen („Tasern“) ausgestattet werden.", options: [{ text: "Stimme zu", party: "CDU" }, { text: "Stimme zu", party: "AfD" }, { text: "Stimme nicht zu", party: "Grüne" }] },
        { text: "In Baden-Württemberg soll der öffentliche Personennahverkehr (ÖPNV) für die Nutzerinnen und Nutzer kostenlos sein.", options: [{ text: "Stimme zu", party: "Linke" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "FDP" }] },
        { text: "An Schulen in Baden-Württemberg soll vorrangig das traditionelle Familienbild (Mutter, Vater, Kinder) vermittelt werden.", options: [{ text: "Stimme zu", party: "AfD" }, { text: "Stimme zu", party: "CDU" }, { text: "Stimme nicht zu", party: "Grüne" }] },
        { text: "Für jede neu bebaute Fläche soll eine gleich große Fläche begrünt werden müssen.", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "CDU" }] },
        { text: "Kommunale Kulturangebote sollen von Baden-Württemberg stärker finanziell gefördert werden.", options: [{ text: "Stimme zu", party: "SPD" }, { text: "Stimme zu", party: "Linke" }, { text: "Stimme nicht zu", party: "FDP" }] },
        { text: "Baden-Württemberg soll sicherstellen, dass mehr Kliniken Schwangerschaftsabbrüche anbieten.", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "CDU" }, { text: "Stimme nicht zu", party: "AfD" }] },
        { text: "Die Hochschulen des Landes sollen stärker mit privaten Unternehmen zusammenarbeiten.", options: [{ text: "Stimme zu", party: "FDP" }, { text: "Stimme zu", party: "CDU" }, { text: "Stimme nicht zu", party: "Linke" }] },
        { text: "Der Schutz vor Diskriminierung durch Landesbehörden soll durch ein Gesetz gestärkt werden.", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "AfD" }] },
        { text: "Asylbewerberinnen und -bewerber sollen bis zur Entscheidung über ihren Antrag ausschließlich in Sammelunterkünften untergebracht werden.", options: [{ text: "Stimme zu", party: "AfD" }, { text: "Stimme zu", party: "CDU" }, { text: "Stimme nicht zu", party: "Grüne" }] },
        { text: "Baden-Württemberg soll sich dafür einsetzen, dass auch nach 2035 noch Pkw mit fossilem Verbrennungsmotor neu zugelassen werden dürfen.", options: [{ text: "Stimme zu", party: "FDP" }, { text: "Stimme zu", party: "AfD" }, { text: "Stimme nicht zu", party: "Grüne" }] },
        { text: "Die Bundeswehr soll weiterhin Veranstaltungen an Schulen in Baden-Württemberg durchführen dürfen.", options: [{ text: "Stimme zu", party: "CDU" }, { text: "Stimme zu", party: "FDP" }, { text: "Stimme nicht zu", party: "Linke" }] },
        { text: "Das Land soll verstärkt ausländische Fachkräfte anwerben.", options: [{ text: "Stimme zu", party: "SPD" }, { text: "Stimme zu", party: "FDP" }, { text: "Stimme nicht zu", party: "AfD" }] },
        { text: "Baden-Württemberg soll am Ziel der Klimaneutralität festhalten.", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "AfD" }] }
      ]
    },
    {
      title: "Wahlkompass: Kurz & Knapp",
      description: "Die wichtigsten Themen in 10 schnellen Fragen.",
      category: "quick",
      imageurl: "https://tse4.mm.bing.net/th/id/OIP.NkMi21UpsXnB4RiAB_wsLQHaEK?cb=defcachec2&rs=1&pid=ImgDetMain&o=7&rm=3",
      questions: [
        { text: "Sollte Deutschland mehr Geld für die Bundeswehr ausgeben?", options: [{ text: "Stimme zu", party: "CDU" }, { text: "Stimme nicht zu", party: "Linke" }, { text: "Neutral", party: "SPD" }] },
        { text: "Sollte es ein Tempolimit auf Autobahnen geben?", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme nicht zu", party: "FDP" }, { text: "Stimme nicht zu", party: "CDU" }] },
        { text: "Sollte die Rente mit 67 bleiben?", options: [{ text: "Stimme zu", party: "FDP" }, { text: "Stimme nicht zu", party: "Linke" }, { text: "Stimme nicht zu", party: "SPD" }] },
        { text: "Sollte Fleisch teurer werden (Fleischsteuer)?", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme nicht zu", party: "AfD" }, { text: "Stimme nicht zu", party: "CDU" }] },
        { text: "Sollte Marihuana legal bleiben?", options: [{ text: "Stimme zu", party: "FDP" }, { text: "Stimme zu", party: "Grüne" }, { text: "Stimme nicht zu", party: "CDU" }] },
        { text: "Sollte die Schuldenbremse gelockert werden?", options: [{ text: "Stimme zu", party: "SPD" }, { text: "Stimme zu", party: "Grüne" }, { text: "Stimme nicht zu", party: "FDP" }] },
        { text: "Sollte es mehr Videoüberwachung geben?", options: [{ text: "Stimme zu", party: "CDU" }, { text: "Stimme zu", party: "AfD" }, { text: "Stimme nicht zu", party: "Linke" }] },
        { text: "Sollte Kohlekraft schneller abgeschaltet werden?", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme nicht zu", party: "CDU" }, { text: "Stimme nicht zu", party: "AfD" }] },
        { text: "Sollte das Bürgergeld erhöht werden?", options: [{ text: "Stimme zu", party: "Linke" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "CDU" }] },
        { text: "Sollte Deutschland mehr Fachkräfte aus dem Ausland holen?", options: [{ text: "Stimme zu", party: "FDP" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "AfD" }] }
      ]
    },
    {
      title: "Wahlkompass: Allgemein",
      description: "Allgemeine politische Orientierung (30 Fragen).",
      category: "general",
      imageurl: "https://images.unsplash.com/photo-1540910419892-f0c74b0e8966",
      questions: [
        { text: "Die Steuern für Reiche sollen erhöht werden.", options: [{ text: "Stimme zu", party: "Linke" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "FDP" }] },
        { text: "Atomkraft soll wieder genutzt werden.", options: [{ text: "Stimme zu", party: "AfD" }, { text: "Stimme zu", party: "CDU" }, { text: "Stimme nicht zu", party: "Grüne" }] },
        { text: "Der Mindestlohn soll auf 15 Euro steigen.", options: [{ text: "Stimme zu", party: "SPD" }, { text: "Stimme zu", party: "Linke" }, { text: "Stimme nicht zu", party: "FDP" }] },
        { text: "Es soll eine PKW-Maut auf Autobahnen geben.", options: [{ text: "Stimme zu", party: "CDU" }, { text: "Stimme nicht zu", party: "Grüne" }, { text: "Neutral", party: "SPD" }] },
        { text: "Kirchensteuern sollen abgeschafft werden.", options: [{ text: "Stimme zu", party: "FDP" }, { text: "Stimme zu", party: "Linke" }, { text: "Stimme nicht zu", party: "CDU" }] },
        { text: "Es soll ein bedingungsloses Grundeinkommen geben.", options: [{ text: "Stimme zu", party: "Linke" }, { text: "Neutral", party: "Grüne" }, { text: "Stimme nicht zu", party: "CDU" }] },
        { text: "Die Bundeswehr soll im Inneren eingesetzt werden dürfen.", options: [{ text: "Stimme zu", party: "AfD" }, { text: "Stimme zu", party: "CDU" }, { text: "Stimme nicht zu", party: "Linke" }] },
        { text: "Flugreisen sollen höher besteuert werden.", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "AfD" }] },
        { text: "Das Bargeld soll erhalten bleiben.", options: [{ text: "Stimme zu", party: "AfD" }, { text: "Stimme zu", party: "FDP" }, { text: "Neutral", party: "CDU" }] },
        { text: "Es soll eine allgemeine Dienstpflicht geben.", options: [{ text: "Stimme zu", party: "CDU" }, { text: "Stimme zu", party: "AfD" }, { text: "Stimme nicht zu", party: "FDP" }] }
      ]
    },
    {
      title: "Wahlkompass: Junior",
      description: "Einfach erklärt für Kinder und Jugendliche (25 Fragen).",
      category: "junior",
      imageurl: "https://images.unsplash.com/photo-1509062522246-3755977927d7",
      questions: [
        { text: "Sollte es mehr Spielplätze in deiner Stadt geben?", options: [{ text: "Stimme zu", party: "SPD" }, { text: "Stimme zu", party: "Grüne" }, { text: "Stimme nicht zu", party: "FDP" }] },
        { text: "Sollten Schulen moderner ausgestattet werden (z.B. Tablets für alle)?", options: [{ text: "Stimme zu", party: "FDP" }, { text: "Stimme zu", party: "CDU" }, { text: "Neutral", party: "SPD" }] },
        { text: "Sollten Busse und Bahnen für Schüler kostenlos sein?", options: [{ text: "Stimme zu", party: "Linke" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "FDP" }] },
        { text: "Sollte es in der Schule mehr Sportunterricht geben?", options: [{ text: "Stimme zu", party: "CDU" }, { text: "Stimme zu", party: "SPD" }, { text: "Neutral", party: "FDP" }] },
        { text: "Sollte Plastikspielzeug verboten werden?", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme nicht zu", party: "AfD" }, { text: "Neutral", party: "CDU" }] },
        { text: "Sollten Kinder mehr bei Entscheidungen in der Stadt mitreden dürfen?", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "CDU" }] },
        { text: "Sollte das Internet überall in der Schule funktionieren?", options: [{ text: "Stimme zu", party: "FDP" }, { text: "Stimme zu", party: "CDU" }, { text: "Stimme zu", party: "SPD" }] },
        { text: "Sollte es mehr Fahrradwege geben?", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "AfD" }] },
        { text: "Sollte das Mittagessen in der Schule gesund und kostenlos sein?", options: [{ text: "Stimme zu", party: "SPD" }, { text: "Stimme zu", party: "Linke" }, { text: "Stimme nicht zu", party: "FDP" }] },
        { text: "Sollte man schon mit 16 Jahren wählen dürfen?", options: [{ text: "Stimme zu", party: "SPD" }, { text: "Stimme zu", party: "Grüne" }, { text: "Stimme nicht zu", party: "CDU" }] },
        { text: "Sollten mehr Parks statt Parkplätze gebaut werden?", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme nicht zu", party: "FDP" }, { text: "Neutral", party: "CDU" }] },
        { text: "Sollte es weniger Hausaufgaben geben?", options: [{ text: "Stimme zu", party: "Linke" }, { text: "Neutral", party: "SPD" }, { text: "Stimme nicht zu", party: "CDU" }] },
        { text: "Sollte die Polizei mehr in der Stadt präsent sein?", options: [{ text: "Stimme zu", party: "CDU" }, { text: "Stimme zu", party: "AfD" }, { text: "Stimme nicht zu", party: "Linke" }] },
        { text: "Sollten Museen für Kinder immer kostenlos sein?", options: [{ text: "Stimme zu", party: "SPD" }, { text: "Stimme zu", party: "Linke" }, { text: "Neutral", party: "CDU" }] },
        { text: "Sollte es mehr Graffiti-Wände geben?", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Neutral", party: "SPD" }, { text: "Stimme nicht zu", party: "CDU" }] },
        { text: "Sollten Ferien länger dauern?", options: [{ text: "Stimme zu", party: "Linke" }, { text: "Neutral", party: "SPD" }, { text: "Stimme nicht zu", party: "CDU" }] },
        { text: "Sollte es mehr Jugendzentren geben?", options: [{ text: "Stimme zu", party: "SPD" }, { text: "Stimme zu", party: "Grüne" }, { text: "Neutral", party: "FDP" }] },
        { text: "Sollte das Rauchen in der Öffentlichkeit komplett verboten werden?", options: [{ text: "Stimme zu", party: "CDU" }, { text: "Neutral", party: "SPD" }, { text: "Stimme nicht zu", party: "FDP" }] },
        { text: "Sollten mehr Bäume in der Innenstadt gepflanzt werden?", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme zu", party: "SPD" }, { text: "Neutral", party: "CDU" }] },
        { text: "Sollte es weniger Werbung für ungesundes Essen geben?", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "FDP" }] },
        { text: "Sollte die Bundeswehr an Schulen Werbung machen dürfen?", options: [{ text: "Stimme zu", party: "CDU" }, { text: "Stimme zu", party: "FDP" }, { text: "Stimme nicht zu", party: "Linke" }] },
        { text: "Sollte es mehr Solaranlagen auf Schuldächern geben?", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "AfD" }] },
        { text: "Sollten Schulnoten abgeschafft werden?", options: [{ text: "Stimme zu", party: "Linke" }, { text: "Neutral", party: "Grüne" }, { text: "Stimme nicht zu", party: "CDU" }] },
        { text: "Sollte es mehr Unterstützung für Vereine geben?", options: [{ text: "Stimme zu", party: "CDU" }, { text: "Stimme zu", party: "SPD" }, { text: "Neutral", party: "FDP" }] },
        { text: "Sollte Deutschland mehr Geld für den Umweltschutz ausgeben?", options: [{ text: "Stimme zu", party: "Grüne" }, { text: "Stimme zu", party: "SPD" }, { text: "Stimme nicht zu", party: "AfD" }] }
      ]
    }
  ];

  for (const config of quizConfigs) {
    const [quiz] = await db.insert(quizzes).values({
      title: config.title,
      description: config.description,
      category: config.category,
      imageurl: config.imageurl
    }).returning();

    for (const q of config.questions) {
      const [question] = await db.insert(quizquestions).values({
        quizid: quiz.id,
        text: q.text
      }).returning();

      for (const o of q.options) {
        await db.insert(quizoptions).values({
          questionid: question.id,
          text: o.text,
          partyaffiliation: o.party
        });
      }
    }
  }

  // Meinungscheck (Umfragen)
  const pollData = [
    {
      question: "Wie zufrieden bist du aktuell mit der Bundesregierung?",
      options: ["Sehr zufrieden", "Zufrieden", "Eher unzufrieden", "Sehr unzufrieden"]
    },
    {
      question: "Ist es berechtigt, dass die AfD als rechtsextrem eingestuft wird?",
      options: ["Ja, absolut", "Eher ja", "Eher nein", "Nein, gar nicht", "Keine Meinung"]
    },
    {
      question: "Sollte ein Verbotsverfahren gegen die AfD eingeleitet werden?",
      options: ["Ja", "Nein", "Unentschlossen"]
    },
    {
      question: "Wie stehst Du zur Wiedereinführung der Wehrpflicht?",
      options: ["Dafür", "Dagegen", "Nur als freiwilliges Jahr"]
    },
    {
      question: "Sollten die Rentenbeiträge stabil bleiben, auch wenn das Rentenalter steigen muss?",
      options: ["Ja", "Nein", "Lieber höhere Beiträge"]
    },
    {
      question: "Sollte Deutschland die Ukraine weiterhin militärisch unterstützen?",
      options: ["Ja, uneingeschränkt", "Ja, aber weniger", "Nein, gar nicht"]
    },
    {
      question: "Wie wichtig ist dir Klimaschutz im Alltag?",
      options: ["Sehr wichtig", "Wichtig", "Weniger wichtig", "Gar nicht wichtig"]
    },
    {
      question: "Findest Du, es wird sich in der Politik zu sehr oder zu wenig auf den Klimawandel fokusiert?",
      options: ["Zu sehr", "Zu wenig", "Genau richtig"]
    },
    {
      question: "Sollte das Gendern in öffentlichen Behörden verboten werden?",
      options: ["Ja", "Nein", "Egal"]
    },
    {
      question: "Wie wahrscheinlich ist es, dass du an der nächsten Wahl teilnimmst?",
      options: ["Sehr wahrscheinlich", "Wahrscheinlich", "Eher unwahrscheinlich", "Sicher nicht"]
    }
  ];
  const pollData = [
    ...
  ];

  // HIER kommt der neue Code rein:

  for (const p of pollData) {
    const [savedPoll] = await db.insert(polls).values({
      question: p.question,
      description: null
    }).returning();

    for (const opt of p.options) {
      await db.insert(polloptions).values({
        pollid: savedPoll.id,
        text: opt
      });
    }
  }


  // Aktuelle Themen (Echte Artikel)
  await db.insert(articles).values([
    {
      title: "Vorstoß der SPD: TikTok und Instagram erst ab 14 Jahren",
      summary: "Die SPD fordert strengere Altersgrenzen für soziale Medien, um Kinder und Jugendliche besser vor schädlichen Inhalten zu schützen.",
      content: "Ein neuer Vorstoß der SPD-Bundestagsfraktion sorgt für Diskussionen: Die Partei fordert, dass Plattformen wie TikTok und Instagram erst ab einem Alter von 14 Jahren genutzt werden dürfen. Ziel ist es, die psychische Gesundheit junger Menschen zu schützen und Cybermobbing sowie die Verbreitung von Fake News einzudämmen.",
      type: "news",
      source: "MSN / SPD",
      sourceurl: "https://www.msn.com/de-de/nachrichten/other/vorsto%C3%9F-der-spd-tiktok-und-instagram-erst-von-14-jahren-an/ar-AA1WsSpu",
      imageurl: "https://img-s-msn-com.akamaized.net/tenant/amp/entityid/AA1WsSpu.img"
    },
    {
      title: "US-Außenminister Blinken besucht Ungarn",
      summary: "Erster Besuch seit sieben Jahren: Blinken reist nach Budapest, um über die transatlantische Zusammenarbeit zu sprechen.",
      content: "US-Außenminister Antony Blinken besucht erstmals seit sieben Jahren wieder Ungarn. In Budapest stehen Gespräche über die NATO-Zusammenarbeit, die Unterstützung der Ukraine und die Rechtsstaatlichkeit in Ungarn auf der Agenda. Der Besuch gilt als wichtiges Signal für die Beziehungen zwischen den USA und der Regierung von Viktor Orbán.",
      type: "news",
      source: "MSN / AFP",
      sourceurl: "https://www.msn.com/de-de/nachrichten/other/us-au%C3%9Fenminister-erster-ungarn-besuch-seit-sieben-jahren/ar-AA1WsUWB",
      imageurl: "https://img-s-msn-com.akamaized.net/tenant/amp/entityid/AA1WsUWB.img"
    },
    {
      title: "Prozess gegen Deutschland: Harald Martensteins Plädoyer gegen ein AfD-Verbot",
      summary: "Kolumnist Harald Martenstein warnt vor den Folgen eines Verbotsverfahrens und plädiert für die politische Auseinandersetzung.",
      content: "In seinem ausführlichen Plädoyer setzt sich Harald Martenstein kritisch mit der Forderung nach einem AfD-Verbot auseinander. Er argumentiert, dass ein solches Verfahren die Polarisierung in der Gesellschaft weiter verschärfen könnte und die demokratische Auseinandersetzung nicht ersetzen kann. Martenstein warnt davor, die Wähler der Partei durch ein Verbot weiter zu radikalisieren.",
      type: "news",
      source: "MSN / WELT",
      sourceurl: "https://www.msn.com/de-de/nachrichten/politik/prozess-gegen-deutschland-harald-martensteins-pl%C3%A4doyer-gegen-ein-afd-verbot-im-wortlaut/ar-AA1WrGvF",
      imageurl: "https://img-s-msn-com.akamaized.net/tenant/amp/entityid/AA1WrGvF.img"
    },
    {
      title: "AfD-Politiker beschäftigen Familienmitglieder",
      summary: "Kritik an der Personalpolitik: Warum einige AfD-Abgeordnete Verwandte in ihren Büros einstellen.",
      content: "Berichte über die Beschäftigung von Familienmitgliedern durch AfD-Politiker sorgen für Kritik. Während die Partei oft Nepotismus bei anderen Parteien anprangert, sehen sich einige ihrer Abgeordneten gezwungen, auf Verwandte zurückzugreifen, da es schwierig sei, loyale und qualifizierte Mitarbeiter auf dem freien Markt zu finden, die keine beruflichen Nachteile durch eine Tätigkeit für die AfD befürchten.",
      type: "news",
      source: "MSN / Politik",
      sourceurl: "https://www.msn.com/de-de/nachrichten/politik/afd-politiker-besch%C3%A4ftigen-familienmitglieder-warum-sie-oft-keine-andere-m%C3%B6glichkeit-sehen/ar-AA1WsMQ2",
      imageurl: "https://img-s-msn-com.akamaized.net/tenant/amp/entityid/AA1WsMQ2.img"
    },
    {
      title: "Baden-Württemberg: Was eine neue Regierung in Stuttgart erwartet",
      summary: "Herausforderungen für die nächste Landesregierung: Wirtschaft, Bildung und Infrastruktur stehen im Fokus.",
      content: "Vor der kommenden Landtagswahl in Baden-Württemberg rücken die großen Herausforderungen für Stuttgart in den Mittelpunkt. Eine neue Regierung wird sich mit der Transformation der Automobilindustrie, dem Lehrermangel und dem maroden Zustand vieler Landesstraßen auseinandersetzen müssen. Experten betonen die Notwendigkeit schneller Investitionen und Reformen.",
      type: "news",
      source: "MSN / Finanzen",
      sourceurl: "https://www.msn.com/de-de/finanzen/top-stories/baden-w%C3%BCrttemberg-was-eine-neue-regierung-in-stuttgart-erwartet/ar-AA1WsnaR",
      imageurl: "https://img-s-msn-com.akamaized.net/tenant/amp/entityid/AA1WsnaR.img"
    }
  ]);

  console.log("Seeding complete.");
}
