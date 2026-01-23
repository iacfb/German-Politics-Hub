import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { db } from "./db";
import { quizzes, quizQuestions, quizOptions, polls, pollOptions, articles } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth Setup
  await setupAuth(app);
  registerAuthRoutes(app);

  // Chat Routes
  registerChatRoutes(app);

  // === Quizzes ===
  app.get(api.quizzes.list.path, async (req, res) => {
    const data = await storage.getQuizzes();
    res.json(data);
  });

  app.get(api.quizzes.get.path, async (req, res) => {
    const data = await storage.getQuiz(Number(req.params.id));
    if (!data) return res.status(404).json({ message: "Quiz not found" });
    res.json(data);
  });

  app.post(api.quizzes.submit.path, isAuthenticated, async (req, res) => {
    const quizId = Number(req.params.id);
    const { answers } = req.body; // Record<questionId, optionId>
    const userId = (req.user as any).claims.sub;

    const quiz = await storage.getQuiz(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    // Calculate result
    const scores: Record<string, number> = {};
    
    // Iterate over questions to find selected options and sum points
    for (const q of quiz.questions) {
      const selectedOptionId = answers[String(q.id)];
      if (selectedOptionId) {
        const option = q.options.find(o => o.id === selectedOptionId);
        if (option) {
          scores[option.partyAffiliation] = (scores[option.partyAffiliation] || 0) + (option.points || 1);
        }
      }
    }

    // Find max score
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

  // === Polls ===
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
      return res.status(400).json({ message: "Already voted" });
    }

    await storage.votePoll(pollId, optionId, userId);
    res.json({ success: true });
  });

  // === Articles ===
  app.get(api.articles.list.path, async (req, res) => {
    const data = await storage.getArticles();
    res.json(data);
  });

  // === Seed Data (Simple check) ===
  const existingQuizzes = await storage.getQuizzes();
  if (existingQuizzes.length === 0) {
    await seedDatabase();
  }

  return httpServer;
}

async function seedDatabase() {
  console.log("Seeding database...");
  
  // Quiz
  const [quiz] = await db.insert(quizzes).values({
    title: "Political Compass Germany",
    description: "Find out which German political party aligns best with your views.",
    category: "general",
    imageUrl: "https://images.unsplash.com/photo-1529108190281-9a4f620bc2d8"
  }).returning();

  const questions = [
    { text: "Environmental protection should take precedence over economic growth.", 
      options: [
        { text: "Agree", party: "Grüne" },
        { text: "Disagree", party: "FDP" },
        { text: "Neutral", party: "SPD" }
      ]
    },
    { text: "Germany should increase its military spending.", 
      options: [
        { text: "Agree", party: "CDU" },
        { text: "Disagree", party: "Linke" },
        { text: "Neutral", party: "SPD" }
      ]
    },
    { text: "Immigration laws should be stricter.", 
      options: [
        { text: "Agree", party: "AfD" },
        { text: "Disagree", party: "Grüne" },
        { text: "Neutral", party: "FDP" }
      ]
    },
     { text: "Wealth tax should be reintroduced.", 
      options: [
        { text: "Agree", party: "SPD" },
        { text: "Disagree", party: "CDU" },
        { text: "Strongly Agree", party: "Linke" }
      ]
    }
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

  // Polls
  const [poll] = await db.insert(polls).values({
    question: "Should the voting age be lowered to 16 for federal elections?",
    description: "Currently, the voting age is 18."
  }).returning();

  await db.insert(pollOptions).values([
    { pollId: poll.id, text: "Yes, definitely" },
    { pollId: poll.id, text: "No, keep it at 18" },
    { pollId: poll.id, text: "Only for local elections" }
  ]);

  // Articles
  await db.insert(articles).values([
    {
      title: "New Energy Policy Announced",
      content: "The government has unveiled a new plan to transition to 80% renewable energy by 2030...",
      type: "news",
      imageUrl: "https://images.unsplash.com/photo-1466611653911-95081537e5b7"
    },
    {
      title: "Community Garden Project Berlin",
      content: "Join us this weekend for the urban gardening initiative in Kreuzberg...",
      type: "project",
      imageUrl: "https://images.unsplash.com/photo-1591857177580-dc82b9e4e11c"
    },
    {
      title: "Debate on Digital Infrastructure",
      content: "Parliament is debating the new budget for digital infrastructure expansion in rural areas...",
      type: "news",
      imageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c"
    }
  ]);

  console.log("Seeding complete.");
}
