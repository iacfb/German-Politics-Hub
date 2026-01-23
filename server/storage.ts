import { db } from "./db";
import {
  quizzes, quizQuestions, quizOptions, quizResults,
  polls, pollOptions, pollVotes,
  articles,
  type Quiz, type QuizWithQuestions, type QuizResult,
  type Poll, type PollWithDetails, type Article
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface IStorage {
  // Quizzes
  getQuizzes(): Promise<Quiz[]>;
  getQuiz(id: number): Promise<QuizWithQuestions | undefined>;
  submitQuizResult(result: any): Promise<QuizResult>; // Type properly
  
  // Polls
  getPolls(userId?: string): Promise<PollWithDetails[]>;
  votePoll(pollId: number, optionId: number, userId: string): Promise<void>;
  hasVoted(pollId: number, userId: string): Promise<boolean>;

  // Articles
  getArticles(): Promise<Article[]>;
}

export class DatabaseStorage implements IStorage {
  // Quizzes
  async getQuizzes(): Promise<Quiz[]> {
    return await db.select().from(quizzes);
  }

  async getQuiz(id: number): Promise<QuizWithQuestions | undefined> {
    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, id),
      with: {
        questions: {
          with: {
            options: true
          }
        }
      }
    });
    return quiz;
  }

  async submitQuizResult(result: typeof quizResults.$inferInsert): Promise<QuizResult> {
    const [saved] = await db.insert(quizResults).values(result).returning();
    return saved;
  }

  // Polls
  async getPolls(userId?: string): Promise<PollWithDetails[]> {
    const allPolls = await db.query.polls.findMany({
      with: {
        options: {
          with: {
            votes: true
          }
        }
      },
      orderBy: (polls, { desc }) => [desc(polls.createdAt)]
    });

    // Transform to include vote counts and user status
    return Promise.all(allPolls.map(async (poll) => {
      let userVotedOptionId = undefined;
      
      const optionsWithCounts = poll.options.map(opt => {
        const votes = opt.votes.length;
        if (userId) {
          const userVote = opt.votes.find(v => v.userId === userId);
          if (userVote) userVotedOptionId = opt.id;
        }
        return { ...opt, votes };
      });

      return {
        ...poll,
        options: optionsWithCounts,
        userVotedOptionId
      };
    }));
  }

  async votePoll(pollId: number, optionId: number, userId: string): Promise<void> {
    await db.insert(pollVotes).values({
      pollId,
      optionId,
      userId
    });
  }

  async hasVoted(pollId: number, userId: string): Promise<boolean> {
    const [vote] = await db.select().from(pollVotes)
      .where(sql`${pollVotes.pollId} = ${pollId} AND ${pollVotes.userId} = ${userId}`);
    return !!vote;
  }

  // Articles
  async getArticles(): Promise<Article[]> {
    return await db.select().from(articles).orderBy(sql`${articles.createdAt} DESC`);
  }
}

export const storage = new DatabaseStorage();
