import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { db } from "./db";
import { quizzes, quizQuestions, quizOptions, polls, pollOptions, articles } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth Setup
  await setupAuth(app);
  registerAuthRoutes(app);

  // Chat Routes - Updated for CivicChat AI
  registerChatRoutes(app);

  // Allow guest chat
  app.get("/api/conversations", async (req, res) => {
    const userId = req.isAuthenticated() ? (req.user as any).claims.sub : `guest_${req.ip}`;
    const data = await storage.getConversations(userId);
    res.json(data);
  });

  app.post("/api/conversations", async (req, res) => {
    const userId = req.isAuthenticated() ? (req.user as any).claims.sub : `guest_${req.ip}`;
    const { title, systemPrompt } = req.body;
    const convo = await storage.createConversation(userId, title || "Neue politische Diskussion", systemPrompt);
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
    const quizId = Number(req.params.id);
    const { answers } = req.body;
    const userId = req.isAuthenticated() ? (req.user as any).claims.sub : `guest_${req.ip}`;

    const quiz = await storage.getQuiz(quizId);
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
          if (option.partyAffiliation && option.partyAffiliation !== "Neutral") {
             scores[option.partyAffiliation] = (scores[option.partyAffiliation] || 0) + weight;
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
      userId,
      quizId,
      matchedParty,
      partyScores: finalScores
    });

    res.json(result);
  });

  // === Polls (Meinungscheck) ===
  app.get(api.polls.list.path, async (req, res) => {
    const userId = req.isAuthenticated() ? (req.user as any).claims.sub : `guest_${req.ip}`;
    const data = await storage.getPolls(userId);
    res.json(data);
  });

  app.post(api.polls.vote.path, async (req, res) => {
    const pollId = Number(req.params.id);
    const { optionId } = req.body;
    const userId = req.isAuthenticated() ? (req.user as any).claims.sub : `guest_${req.ip}`;

    const hasVoted = await storage.hasVoted(pollId, userId);
    if (hasVoted) {
      return res.status(400).json({ message: "Bereits abgestimmt" });
    }

    await storage.votePoll(pollId, optionId, userId);
    res.json({ success: true });
  });

  // === Articles ===
  app.get(api.articles.list.path, async (req, res) => {
    const data = await storage.getArticles();
    res.json(data);
  });

  // Re-seed with German data if empty or forced
  const existingQuizzes = await storage.getQuizzes();
  if (existingQuizzes.length <= 1 || true) { // Force re-seed to ensure all requested data is present
    await seedDatabase();
  }

  return httpServer;
}

async function seedDatabase() {
  console.log("Seeding database with German content...");
  
  // Clear old data to avoid duplicates with old names
  await db.delete(quizOptions);
  await db.delete(quizQuestions);
  await db.delete(quizzes);
  await db.delete(pollOptions);
  await db.delete(polls);
  await db.delete(articles);

  // Wahl-O-Mat Quizzes
  const quizConfigs = [
    {
      title: "Wahlkompass: Landtagswahl BW 2026",
      description: "Der offizielle Wahlkompass für die Landtagswahl in Baden-Württemberg 2026. 38 Fragen zu den wichtigsten Landesthemen.",
      category: "landtag2026",
      imageUrl: "https://copilot.microsoft.com/th/id/BCO.0f3c19a1-dd3d-42ec-9420-939270a672b4.png",
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
      title: "Wahlkompass: Junior",
      description: "Einfach erklärt für Kinder und Jugendliche (25 Fragen).",
      category: "junior",
      imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7",
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
      imageUrl: config.imageUrl
    }).returning();

    for (const q of config.questions) {
      const [question] = await db.insert(quizQuestions).values({
        quizId: quiz.id,
        text: q.text
      }).returning();

      for (const o of q.options) {
        await db.insert(quizOptions).values({
          questionId: question.id,
          text: o.text,
          partyAffiliation: o.party
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

  for (const p of pollData) {
    const [poll] = await db.insert(polls).values({
      question: p.question
    }).returning();
    await db.insert(pollOptions).values(p.options.map(text => ({ pollId: poll.id, text })));
  }

  // Aktuelle Themen (Echte Artikel)
  await db.insert(articles).values([
    {
      title: "Was hat Trump in Deutschland vor?",
      summary: "Zusammenfassung: Die US-Regierung unter Trump plant massive Zolländerungen, die besonders die deutsche Automobilindustrie treffen könnten.",
      content: "Nach seiner Wahl hat Donald Trump angekündigt, den Grenzschutz drastisch zu verschärfen und Importzölle auf europäische Waren zu erheben. Deutsche Autobauer wie Volkswagen und BMW bereiten sich auf schwierige Zeiten vor. Experten warnen vor einem Handelskrieg, der die deutsche Wirtschaft empfindlich treffen könnte.",
      type: "news",
      source: "MSN / WELT",
      sourceUrl: "https://www.msn.com/de-de/finanzen/top-stories/was-hat-trump-jetzt-in-deutschland-vor-ein-plan-wie-eine-bedrohung/ar-AA1UZX9S",
      imageUrl: "https://img-s-msn-com.akamaized.net/tenant/amp/entityid/AA1UZPLh.img"
    },
    {
      title: "Israelischer Botschafter warnt vor AfD-Erfolg",
      summary: "Zusammenfassung: Ron Prosor äußert sich besorgt über den Aufstieg der AfD und deren Verhältnis zum Rechtsextremismus.",
      content: "Der israelische Botschafter in Deutschland, Ron Prosor, hat in einem Interview vor der AfD gewarnt. Er sieht in der Partei eine Gefahr für die demokratische Kultur und weist auf rechtsextreme Tendenzen hin. Die Einstufung einiger Landesverbände als gesichert rechtsextrem durch den Verfassungsschutz sei ein deutliches Signal.",
      type: "news",
      source: "Zeit Online",
      sourceUrl: "https://www.zeit.de/politik/deutschland/2025-02/afd-israel-botschafter-ron-prosor-warnung",
      imageUrl: "https://images.unsplash.com/photo-1529108190281-9a4f620bc2d8"
    }
  ]);

  console.log("Seeding complete.");
}
