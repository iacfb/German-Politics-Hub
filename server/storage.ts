import { 
  users, type User, type InsertUser,
  quizzes, quizquestions, quizoptions, quizresults,
  polls, polloptions, pollvotes,
  articles, messages, conversations,
  type Quiz, type Quizquestion, type Quizoption, type Quizresult,
  type Poll, type Polloption, type Article,
  type Quizwithquestions, type Pollwithdetails
} from "@shared/schema";
import { db } from "./db/index";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { conversations, messages } from "@shared/schema";


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
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userid))
      .orderBy(desc(conversations.createdAt));
  }

  async createConversation(userid: string, title: string, systemprompt?: string): Promise<any> {
    const [saved] = await db
      .insert(conversations)
      .values({
        userId: userid,
        title,
        systemPrompt: systemprompt || null
      })
      .returning();
    return saved;
  }

  async getMessages(conversationid: number): Promise<any[]> {
    return await db.select().from(messages)
      .where(eq(messages.conversationId, conversationid))
      .orderBy(sql`${messages.createdAt} ASC`);
  }

  async addMessage(conversationid: number, role: string, content: string): Promise<any> {
    const [msg] = await db.insert(messages).values({
      conversationId: conversationid,
      role,
      content
    }).returning();
    return msg;
  }


  // === Quizzes ===
  async getQuizzes(): Promise<Quiz[]> {
    return await db.select().from(quizzes);
  }

  async getQuiz(id: number): Promise<Quizwithquestions | undefined> {
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, id));

    if (!quiz) return undefined;

    const questions = await db
      .select()
      .from(quizquestions)
      .where(eq(quizquestions.quizid, id));

    const questionIds = questions.map(q => q.id);

    const options =
      questionIds.length > 0
        ? await db
            .select()
            .from(quizoptions)
            .where(inArray(quizoptions.questionid, questionIds))
        : [];

    const questionsWithOptions = questions.map(q => ({
      ...q,
      options: options.filter(o => o.questionid === q.id)
    }));

    return {
      ...quiz,
      questions: questionsWithOptions
    } as Quizwithquestions;
  }

  async submitQuizResult(result: any): Promise<Quizresult> {
    const [saved] = await db.insert(quizresults).values({
      userid: result.userid,
      quizid: result.quizid,
      matchedparty: result.matchedparty,
      partyscores: result.partyscores
    }).returning();
    return saved;
  }

  // === Polls ===
  async getPolls(userid?: string): Promise<Pollwithdetails[]> {
    const pollsRows = await db
      .select()
      .from(polls)
      .orderBy(desc(polls.createdat));

    if (pollsRows.length === 0) return [];

    const pollIds = pollsRows.map(p => p.id);

    const optionsRows = await db
      .select()
      .from(polloptions)
      .where(inArray(polloptions.pollid, pollIds));

    const votesRows = await db
      .select()
      .from(pollvotes)
      .where(inArray(pollvotes.pollid, pollIds));

    return pollsRows.map(poll => {
      const optionsForPoll = optionsRows.filter(o => o.pollid === poll.id);

      let uservotedoptionid: number | undefined = undefined;

      const optionsWithCounts = optionsForPoll.map(opt => {
        const votesForOption = votesRows.filter(v => v.optionid === opt.id);

        if (userid) {
          const userVote = votesForOption.find(v => v.userid === userid);
          if (userVote) uservotedoptionid = opt.id;
        }

        return {
          ...opt,
          votes: votesForOption.length
        };
      });

      return {
        ...poll,
        options: optionsWithCounts,
        uservotedoptionid: uservotedoptionid
      };
    });
  }

  async votePoll(pollid: number, optionid: number, userid: string): Promise<void> {
    await db.insert(pollvotes).values({
      pollid,
      optionid,
      userid
    });
  }

  async hasVoted(pollid: number, userid: string): Promise<boolean> {
    const [vote] = await db
      .select()
      .from(pollvotes)
      .where(sql`${pollvotes.pollid} = ${pollid} AND ${pollvotes.userid} = ${userid}`);
    return !!vote;
  }

  // === Articles ===
  async getArticles(): Promise<Article[]> {
    return await db
      .select()
      .from(articles)
      .orderBy(desc(articles.createdat));
  }
}

export const storage = new DatabaseStorage();
