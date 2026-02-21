import { db } from "./db";
import {
  quizzes, quizquestions, quizoptions, quizresults,
  polls, polloptions, pollvotes,
  articles,
  type Quiz, type Quizwithquestions, type Quizresult,
  type Poll, type Pollwithdetails, type Article
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface istorage {
  getquizzes(): Promise<Quiz[]>;
  getquiz(id: number): Promise<Quizwithquestions | undefined>;
  submitquizresult(result: any): Promise<Quizresult>;

  getpolls(userid?: string): Promise<Pollwithdetails[]>;
  votepoll(pollid: number, optionid: number, userid: string): Promise<void>;
  hasvoted(pollid: number, userid: string): Promise<boolean>;

  getconversations(userid: string): Promise<any[]>;
  createconversation(userid: string, title: string, systemprompt?: string): Promise<any>;

  getarticles(): Promise<Article[]>;
}

export class databasestorage implements istorage {

  // === conversations ===
  async getconversations(userid: string): Promise<any[]> {
    return await db.query.conversations.findmany({
      where: eq(conversations.userid, userid),
      orderby: (conversations, { desc }) => [desc(conversations.createdat)]
    });
  }

  async createconversation(userid: string, title: string, systemprompt?: string): Promise<any> {
    const [saved] = await db.insert(conversations).values({
      userid,
      title,
      systemprompt: systemprompt || null
    }).returning();
    return saved;
  }

  // === quizzes ===
  async getquizzes(): Promise<Quiz[]> {
    return await db.select().from(quizzes);
  }

  async getquiz(id: number): Promise<Quizwithquestions | undefined> {
    return await db.query.quizzes.findfirst({
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

  async submitquizresult(result: typeof quizresults.$inferinsert): Promise<Quizresult> {
    const [saved] = await db.insert(quizresults).values(result).returning();
    return saved;
  }

  // === polls ===
  async getpolls(userid?: string): Promise<Pollwithdetails[]> {
    const allpolls = await db.query.polls.findmany({
      with: {
        options: {
          with: {
            votes: true
          }
        }
      },
      orderby: (polls, { desc }) => [desc(polls.createdat)]
    });

    return Promise.all(
      allpolls.map(async (poll) => {
        let uservotedoptionid = undefined;

        const optionswithcounts = poll.options.map(opt => {
          const votes = opt.votes.length;

          if (userid) {
            const uservote = opt.votes.find(v => v.userid === userid);
            if (uservote) uservotedoptionid = opt.id;
          }

          return { ...opt, votes };
        });

        return {
          ...poll,
          options: optionswithcounts,
          uservotedoptionid
        };
      })
    );
  }

  async votepoll(pollid: number, optionid: number, userid: string): Promise<void> {
    await db.insert(pollvotes).values({
      pollid,
      optionid,
      userid
    });
  }

  async hasvoted(pollid: number, userid: string): Promise<boolean> {
    const [vote] = await db.select().from(pollvotes)
      .where(sql`${pollvotes.pollid} = ${pollid} AND ${pollvotes.userid} = ${userid}`);
    return !!vote;
  }

  // === articles ===
  async getarticles(): Promise<Article[]> {
    return await db.select().from(articles).orderby(sql`${articles.createdat} DESC`);
  }
}

export const storage = new databasestorage();
