import { db } from "./db";
import {
  quizzes, quizquestions, quizoptions, quizresults,
  polls, polloptions, pollvotes,
  articles, conversations,
  type Quiz, type Quizwithquestions, type Quizresult,
  type Poll, type Pollwithdetails, type Article
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface IStorage {
  getQuizzes(): Promise<Quiz[]>;
  getQuiz(id: number): Promise<Quizwithquestions | undefined>;
  submitQuizResult(result: any): Promise<Quizresult>;

  getPolls(userid?: string): Promise<Pollwithdetails[]>;
  votePoll(pollid: number, optionid: number, userid: string): Promise<void>;
  hasVoted(pollid: number, userid: string): Promise<boolean>;

  getConversations(userid: string): Promise<any[]>;
  createConversation(userid: string, title: string, systemprompt?: string): Promise<any>;

  getArticles(): Promise<Article[]>;
}

export class DatabaseStorage implements IStorage {

  // === Conversations ===
  async getConversations(userid: string): Promise<any[]> {
    return await db.query.conversations.findMany({
      where: eq(conversations.userid, userid),
      orderBy: (conversations, { desc }) => [desc(conversations.createdAt)]
    });
  }

  async createConversation(userid: string, title: string, systemprompt?: string): Promise<any> {
    const [saved] = await db.insert(conversations).values({
      userid,
      title,
      systemprompt: systemprompt || null
    }).returning();
    return saved;
  }

  // === Quizzes ===
  async getQuizzes(): Promise<Quiz[]> {
    return await db.select().from(quizzes);
  }

  async getQuiz(id: number): Promise<Quizwithquestions | undefined> {
    return await db.query.quizzes.findFirst({
      where: eq(quizzes.id, id),
      with: {
        questions: {
          with: {
            options: true
          }
        }
      }
    });
  }

  async submitQuizResult(result: typeof quizresults.$inferInsert): Promise<Quizresult> {
    const [saved] = await db.insert(quizresults).values(result).returning();
    return saved;
  }

  // === Polls ===
  async getPolls(userid?: string): Promise<Pollwithdetails[]> {
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

    return Promise.all(
      allPolls.map(async (poll) => {
        let userVotedOptionId = undefined;

        const optionsWithCounts = poll.options.map(opt => {
          const votes = opt.votes.length;

          if (userid) {
            const userVote = opt.votes.find(v => v.userid === userid);
            if (userVote) userVotedOptionId = opt.id;
          }

          return { ...opt, votes };
        });

        return {
          ...poll,
          options: optionsWithCounts,
          userVotedOptionId
        };
      })
    );
  }

  async votePoll(pollid: number, optionid: number, userid: string): Promise<void> {
    await db.insert(pollvotes).values({
      pollid,
      optionid,
      userid
    });
  }

  async hasVoted(pollid: number, userid: string): Promise<boolean> {
    const [vote] = await db.select().from(pollvotes)
      .where(sql`${pollvotes.pollid} = ${pollid} AND ${pollvotes.userid} = ${userid}`);
    return !!vote;
  }

  // === Articles ===
  async getArticles(): Promise<Article[]> {
    return await db.select().from(articles).orderBy(sql`${articles.createdAt} DESC`);
  }
}

export const storage = new DatabaseStorage();
