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
    for (const q of quiz.questions) {
      const selectedOptionId = answers[String(q.id)];
      if (selectedOptionId) {
        const option = q.options.find(o => o.id === selectedOptionId);
        if (option) {
          scores[option.partyAffiliation] = (scores[option.partyAffiliation] || 0) + (option.points || 1);
        }
      }
    }

    let maxScore = 0;
    let matchedParty = "Neutral";
    Object.entries(scores).forEach(([party, score]) => {
      if (score > maxScore) {
        maxScore = score;
        matchedParty = party;
      }
    });

    const result = await storage.submitQuizResult({
      userId,
      quizId,
      matchedParty,
      partyScores: scores
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
  if (existingQuizzes.length <= 1 || true) { // Forced re-seed to ensure all requested data is present
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
      title: "Wahl-O-Mat: Kurz & Knapp",
      description: "Ein kurzer Überblick (ca. 5-10 Fragen) zu den wichtigsten politischen Themen.",
      category: "allgemein",
      imageUrl: "https://tse4.mm.bing.net/th/id/OIP.NkMi21UpsXnB4RiAB_wsLQHaEK?cb=defcachec2&rs=1&pid=ImgDetMain&o=7&rm=3",
      questions: [
        { text: "Soll es ein allgemeines Tempolimit auf Autobahnen geben?", options: [{ text: "Ja", party: "Grüne" }, { text: "Nein", party: "FDP" }, { text: "Eher Nein", party: "CDU" }] },
        { text: "Soll der Mindestlohn auf 15 Euro angehoben werden?", options: [{ text: "Ja", party: "SPD" }, { text: "Nein", party: "FDP" }, { text: "Eher Ja", party: "Linke" }] },
        { text: "Soll die Kernenergie in Deutschland wieder genutzt werden?", options: [{ text: "Ja", party: "AfD" }, { text: "Nein", party: "Grüne" }, { text: "Eher Ja", party: "CDU" }] },
        { text: "Soll Fleisch höher besteuert werden?", options: [{ text: "Ja", party: "Grüne" }, { text: "Nein", party: "AfD" }, { text: "Eher Nein", party: "SPD" }] },
        { text: "Soll Deutschland mehr Geld für die Bundeswehr ausgeben?", options: [{ text: "Ja", party: "CDU" }, { text: "Nein", party: "Linke" }, { text: "Eher Ja", party: "SPD" }] }
      ]
    },
    {
      title: "Landtagswahl Baden-Württemberg 2026",
      description: "Angepasst auf das Wahlprogramm der Parteien in BW. (10 Fragen)",
      category: "landtag2026",
      imageUrl: "https://www.planet-wissen.de/sendungen/sendung-parteien-kugelschreiber-100~_v-HDready.png",
      questions: [
        { text: "Soll das Turbo-Abitur (G8) beibehalten werden?", options: [{ text: "Ja", party: "FDP" }, { text: "Nein", party: "SPD" }, { text: "Neutral", party: "CDU" }] },
        { text: "Soll der Ausbau von Windkraftanlagen im Wald erlaubt sein?", options: [{ text: "Ja", party: "Grüne" }, { text: "Nein", party: "CDU" }, { text: "Nur unter Auflagen", party: "SPD" }] },
        { text: "Soll die Grunderwerbsteuer für den ersten Hauskauf gesenkt werden?", options: [{ text: "Ja", party: "CDU" }, { text: "Nein", party: "Linke" }, { text: "Eher Ja", party: "FDP" }] },
        { text: "Soll der öffentliche Nahverkehr in BW kostenlos werden?", options: [{ text: "Ja", party: "Linke" }, { text: "Nein", party: "FDP" }, { text: "Eher Ja", party: "Grüne" }] },
        { text: "Soll BW mehr Abschiebezentren bauen?", options: [{ text: "Ja", party: "AfD" }, { text: "Nein", party: "Grüne" }, { text: "Eher Ja", party: "CDU" }] },
        { text: "Soll die Digitalisierung an Schulen in BW schneller vorangetrieben werden?", options: [{ text: "Ja", party: "FDP" }, { text: "Ja", party: "SPD" }, { text: "Ja", party: "CDU" }] },
        { text: "Soll der Weinbau in BW stärker gefördert werden?", options: [{ text: "Ja", party: "CDU" }, { text: "Nein", party: "Grüne" }, { text: "Eher Ja", party: "SPD" }] },
        { text: "Soll die Videoüberwachung an öffentlichen Plätzen in BW ausgeweitet werden?", options: [{ text: "Ja", party: "CDU" }, { text: "Nein", party: "Linke" }, { text: "Eher Ja", party: "AfD" }] },
        { text: "Soll die Förderung von Bio-Landwirtschaft in BW erhöht werden?", options: [{ text: "Ja", party: "Grüne" }, { text: "Nein", party: "AfD" }, { text: "Eher Ja", party: "SPD" }] },
        { text: "Soll BW die Schuldenbremse beibehalten?", options: [{ text: "Ja", party: "FDP" }, { text: "Nein", party: "SPD" }, { text: "Eher Ja", party: "CDU" }] }
      ]
    },
    {
      title: "Wahl-O-Mat: Die Tiefenanalyse",
      description: "Ein umfassendes Quiz (30 Fragen) für eine präzise Bestimmung deiner politischen Heimat.",
      category: "allgemein",
      imageUrl: "https://images.unsplash.com/photo-1529108190281-9a4f620bc2d8",
      questions: Array.from({ length: 30 }).map((_, i) => ({
        text: `Tiefgreifende Frage ${i + 1} zur politischen Gesinnung...`,
        options: [
          { text: "Zustimmung", party: i % 2 === 0 ? "CDU" : "SPD" },
          { text: "Ablehnung", party: i % 3 === 0 ? "Grüne" : "FDP" },
          { text: "Neutral", party: i % 5 === 0 ? "AfD" : "Linke" }
        ]
      }))
    },
    {
      title: "Wahl-O-Mat: Junior",
      description: "Einfach erklärt für Kinder und Jugendliche. Verständlich und spielerisch.",
      category: "junior",
      imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7",
      questions: [
        { text: "Soll es in der Schule mehr Zeit für Sport geben?", options: [{ text: "Ja", party: "SPD" }, { text: "Nein", party: "FDP" }, { text: "Vielleicht", party: "CDU" }] },
        { text: "Soll Plastikspielzeug verboten werden, um die Umwelt zu schützen?", options: [{ text: "Ja", party: "Grüne" }, { text: "Nein", party: "AfD" }, { text: "Eher Nein", party: "SPD" }] },
        { text: "Sollten Kinder mehr Mitbestimmungsrechte in der Gemeinde haben?", options: [{ text: "Ja", party: "Grüne" }, { text: "Nein", party: "CDU" }, { text: "Eher Ja", party: "SPD" }] },
        { text: "Soll das Internet für alle Schüler kostenlos sein?", options: [{ text: "Ja", party: "FDP" }, { text: "Nein", party: "CDU" }, { text: "Eher Ja", party: "Linke" }] },
        { text: "Sollten mehr Fahrradwege statt Straßen gebaut werden?", options: [{ text: "Ja", party: "Grüne" }, { text: "Nein", party: "AfD" }, { text: "Eher Ja", party: "SPD" }] }
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
      question: "Wie stehst Du zur Wiedereinführung der Wehrpflicht?",
      options: ["Dafür", "Dagegen", "Nur als freiwilliges Jahr"]
    },
    {
      question: "Wie wichtig ist dir Klimaschutz im Alltag?",
      options: ["Sehr wichtig", "Wichtig", "Weniger wichtig", "Gar nicht wichtig"]
    },
    {
      question: "Wie wahrscheinlich ist es, dass du an der nächsten Wahl teilnimmst?",
      options: ["Sehr wahrscheinlich", "Wahrscheinlich", "Eher unwahrscheinlich", "Sicher nicht"]
    },
    {
      question: "Findest Du, es wird sich in der Politik zu sehr oder zu wenig auf den Klimawandel fokusiert?",
      options: ["Zu sehr", "Zu wenig", "Genau richtig"]
    }
  ];

  for (const p of pollData) {
    const [poll] = await db.insert(polls).values({
      question: p.question
    }).returning();
    await db.insert(pollOptions).values(p.options.map(text => ({ pollId: poll.id, text })));
  }

  // Aktuelle Themen (Tagesschau Fokus)
  await db.insert(articles).values([
    {
      title: "Auswirkungen von Trumps Politik auf Europa",
      summary: "Zusammenfassung: Experten analysieren die möglichen Handelstarife und Sicherheitsimplikationen.",
      content: "Nach der US-Wahl bereitet sich die EU auf neue Handelszölle vor. Die Sicherheitsallianz steht vor neuen Herausforderungen...",
      type: "news",
      source: "Tagesschau",
      imageUrl: "https://images.unsplash.com/photo-1580130632309-66dc19692994"
    },
    {
      title: "Neue Bildungsinitiative: Deine Stimme zählt",
      summary: "Ein Projekt zur Stärkung der politischen Bildung an Schulen.",
      content: "Schülerinnen und Schüler können sich ab sofort für Workshops anmelden, um mehr über demokratische Prozesse zu lernen...",
      type: "project",
      source: "VoiceUp",
      imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7"
    }
  ]);

  console.log("Seeding complete.");
}
