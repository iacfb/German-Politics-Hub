import { supabase } from "./supabase-client";
import type {
  Quiz, Quizquestion, Quizoption, Quizresult,
  Poll, Polloption, Article,
  Quizwithquestions, Pollwithdetails
} from "@shared/schema";

export interface IStorage {
  getQuizzes(): Promise<Quiz[]>;
  getQuiz(id: number): Promise<Quizwithquestions | undefined>;
  submitQuizResult(result: any): Promise<Quizresult>;

  getPolls(userid?: string): Promise<Pollwithdetails[]>;
  votePoll(pollid: number, optionid: number, userid: string): Promise<void>;
  hasVoted(pollid: number, userid: string): Promise<boolean>;

  getConversations(userid: string): Promise<any[]>;
  createConversation(userid: string, title: string, systemprompt?: string): Promise<any>;
  getConversation(id: number): Promise<any>;
  getMessages(conversationid: number): Promise<any[]>;
  addMessage(conversationid: number, role: string, content: string): Promise<any>;

  getArticles(): Promise<Article[]>;
  addArticle(article: {
    title: string;
    summary?: string | null;
    content: string;
    type: string;
    source?: string | null;
    sourceurl?: string | null;
    imageurl?: string | null;
  }): Promise<Article>;
  articleExists(sourceurl: string): Promise<boolean>;
}

function supaErr(label: string, error: any): never {
  throw new Error(`[Supabase ${label}] ${error?.message ?? JSON.stringify(error)}`);
}

export class DatabaseStorage implements IStorage {

  // =====================
  //   CONVERSATIONS
  // =====================
  async getConversations(userid: string): Promise<any[]> {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("userid", userid)
      .order("createdat", { ascending: false });
    if (error) supaErr("getConversations", error);
    return data ?? [];
  }

  async createConversation(userid: string, title: string, systemprompt?: string): Promise<any> {
    const { data, error } = await supabase
      .from("conversations")
      .insert({ userid, title, systemprompt: systemprompt ?? null })
      .select()
      .single();
    if (error) supaErr("createConversation", error);
    return data;
  }

  async getConversation(id: number): Promise<any> {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .single();
    if (error && error.code !== "PGRST116") supaErr("getConversation", error);
    return data ?? null;
  }

  async getMessages(conversationid: number): Promise<any[]> {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversationid", conversationid)
      .order("createdat", { ascending: true });
    if (error) supaErr("getMessages", error);
    return data ?? [];
  }

  async addMessage(conversationid: number, role: string, content: string): Promise<any> {
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversationid, role, content })
      .select()
      .single();
    if (error) supaErr("addMessage", error);
    return data;
  }

  // =====================
  //   QUIZZES
  // =====================
  async getQuizzes(): Promise<Quiz[]> {
    const { data, error } = await supabase
      .from("quizzes")
      .select("*");
    if (error) supaErr("getQuizzes", error);
    return (data ?? []) as Quiz[];
  }

  async getQuiz(id: number): Promise<Quizwithquestions | undefined> {
    const { data: quiz, error: quizErr } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", id)
      .single();
    if (quizErr) return undefined;
    if (!quiz) return undefined;

    const { data: questions, error: qErr } = await supabase
      .from("quizquestions")
      .select("*")
      .eq("quizid", id);
    if (qErr) supaErr("getQuiz questions", qErr);

    const questionIds = (questions ?? []).map((q: any) => q.id);

    let options: any[] = [];
    if (questionIds.length > 0) {
      const { data: opts, error: oErr } = await supabase
        .from("quizoptions")
        .select("*")
        .in("questionid", questionIds);
      if (oErr) supaErr("getQuiz options", oErr);
      options = opts ?? [];
    }

    const questionsWithOptions = (questions ?? []).map((q: any) => ({
      ...q,
      options: options.filter((o: any) => o.questionid === q.id),
    }));

    return { ...quiz, questions: questionsWithOptions } as Quizwithquestions;
  }

  async submitQuizResult(result: any): Promise<Quizresult> {
    const { data, error } = await supabase
      .from("quizresults")
      .insert({
        userid: result.userid,
        quizid: result.quizid,
        matchedparty: result.matchedparty,
        partyscores: result.partyscores,
      })
      .select()
      .single();
    if (error) supaErr("submitQuizResult", error);
    return data as Quizresult;
  }

  // =====================
  //   POLLS
  // =====================
  async getPolls(userid?: string): Promise<Pollwithdetails[]> {
    const { data: pollsRows, error: pollErr } = await supabase
      .from("polls")
      .select("*")
      .order("createdat", { ascending: false });
    if (pollErr) supaErr("getPolls", pollErr);
    if (!pollsRows || pollsRows.length === 0) return [];

    const pollIds = pollsRows.map((p: any) => p.id);

    const { data: optionsRows, error: optErr } = await supabase
      .from("polloptions")
      .select("*")
      .in("pollid", pollIds);
    if (optErr) supaErr("getPolls options", optErr);

    const { data: votesRows, error: voteErr } = await supabase
      .from("pollvotes")
      .select("*")
      .in("pollid", pollIds);
    if (voteErr) supaErr("getPolls votes", voteErr);

    return pollsRows.map((poll: any) => {
      const optionsForPoll = (optionsRows ?? []).filter((o: any) => o.pollid === poll.id);
      let uservotedoptionid: number | undefined = undefined;

      const optionsWithCounts = optionsForPoll.map((opt: any) => {
        const votesForOption = (votesRows ?? []).filter((v: any) => v.optionid === opt.id);
        if (userid) {
          const userVote = votesForOption.find((v: any) => v.userid === userid);
          if (userVote) uservotedoptionid = opt.id;
        }
        return { ...opt, votes: votesForOption.length };
      });

      return { ...poll, options: optionsWithCounts, uservotedoptionid };
    });
  }

  async votePoll(pollid: number, optionid: number, userid: string): Promise<void> {
    const { error } = await supabase
      .from("pollvotes")
      .insert({ pollid, optionid, userid });
    if (error) supaErr("votePoll", error);
  }

  async hasVoted(pollid: number, userid: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("pollvotes")
      .select("id")
      .eq("pollid", pollid)
      .eq("userid", userid)
      .limit(1);
    if (error) supaErr("hasVoted", error);
    return (data ?? []).length > 0;
  }

  // =====================
  //   ARTICLES
  // =====================
  async getArticles(): Promise<Article[]> {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .order("createdat", { ascending: false });
    if (error) supaErr("getArticles", error);
    return (data ?? []) as Article[];
  }

  async addArticle(article: {
    title: string;
    summary?: string | null;
    content: string;
    type: string;
    source?: string | null;
    sourceurl?: string | null;
    imageurl?: string | null;
  }): Promise<Article> {
    const { data, error } = await supabase
      .from("articles")
      .insert(article)
      .select()
      .single();
    if (error) supaErr("addArticle", error);
    return data as Article;
  }

  async articleExists(sourceurl: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("articles")
      .select("id")
      .eq("sourceurl", sourceurl)
      .limit(1);
    if (error) supaErr("articleExists", error);
    return (data ?? []).length > 0;
  }
}

export const storage = new DatabaseStorage();
