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

  app.post(api.quizzes.submit.path, isAuthenticated, async (req, res) => {
    const quizId = Number(req.params.id);
    const { answers } = req.body;
    const userId = (req.user as any).claims.sub;

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
    const userId = req.isAuthenticated() ? (req.user as any).claims.sub : undefined;
    const data = await storage.getPolls(userId);
    res.json(data);
  });

  app.post(api.polls.vote.path, isAuthenticated, async (req, res) => {
    const pollId = Number(req.params.id);
    const { optionId } = req.body;
    const userId = (req.user as any).claims.sub;

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
  if (existingQuizzes.length <= 1) { // Forced re-seed for better content
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
  const [quiz] = await db.insert(quizzes).values({
    title: "Wahl-O-Mat: Landtagswahl 2026",
    description: "Finde heraus, welche Partei deine Interessen bei der Landtagswahl 2026 am besten vertritt.",
    category: "landtag2026",
    imageUrl: "https://images.unsplash.com/photo-1529108190281-9a4f620bc2d8"
  }).returning();

  const questions = [
    { text: "Soll das Turbo-Abitur (G8) beibehalten werden?", 
      options: [
        { text: "Ja", party: "FDP" },
        { text: "Nein", party: "SPD" },
        { text: "Neutral", party: "CDU" }
      ]
    },
    { text: "Soll der Ausbau von Windkraftanlagen im Wald erlaubt sein?", 
      options: [
        { text: "Ja", party: "Grüne" },
        { text: "Nein", party: "CDU" },
        { text: "Nur unter Auflagen", party: "SPD" }
      ]
    },
    { text: "Soll die Grunderwerbsteuer für den ersten Hauskauf gesenkt werden?", 
      options: [
        { text: "Ja", party: "CDU" },
        { text: "Nein", party: "Linke" },
        { text: "Eher Ja", party: "FDP" }
      ]
    }
    // More questions could be added here for a longer quiz
  ];

  for (const q of questions) {
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
