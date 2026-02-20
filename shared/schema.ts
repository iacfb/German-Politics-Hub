import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export * from "./models/auth";
export * from "./models/chat";

// === QUIZZES ===
export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  imageurl: text("imageurl"),
});

export const quizquestions = pgTable("quizquestions", {
  id: serial("id").primaryKey(),
  quizid: integer("quizid").notNull(),
  text: text("text").notNull(),
});

export const quizoptions = pgTable("quizoptions", {
  id: serial("id").primaryKey(),
  questionid: integer("questionid").notNull(),
  text: text("text").notNull(),
  partyaffiliation: text("partyaffiliation").notNull(),
 });

export const quizresults = pgTable("quizresults", {
  id: serial("id").primaryKey(),
  userid: text("userid").notNull(),
  quizid: integer("quizid").notNull(),
  matchedparty: text("matchedparty").notNull(),
  partyscores: jsonb("partyscores").notNull(),
  createdat: timestamp("createdat").defaultNow(),
});

// Relations
export const quizzesrelations = relations(quizzes, ({ many }) => ({
  questions: many(quizquestions),
}));

export const quizquestionsrelations = relations(quizquestions, ({ one, many }) => ({
  quiz: one(quizzes, {
    fields: [quizquestions.quizid],
    references: [quizzes.id],
  }),
  options: many(quizoptions),
}));

export const quizoptionsrelations = relations(quizoptions, ({ one }) => ({
  question: one(quizquestions, {
    fields: [quizoptions.questionid],
    references: [quizquestions.id],
  }),
}));

// === POLLS ===
export const polls = pgTable("polls", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  description: text("description"),
  createdat: timestamp("createdat").defaultNow(),
});

export const polloptions = pgTable("polloptions", {
  id: serial("id").primaryKey(),
  pollid: integer("pollid").notNull(),
  text: text("text").notNull(),
});

export const pollvotes = pgTable("pollvotes", {
  id: serial("id").primaryKey(),
  pollid: integer("pollid").notNull(),
  optionid: integer("optionid").notNull(),
  userid: text("userid").notNull(),
});

export const pollsrelations = relations(polls, ({ many }) => ({
  options: many(polloptions),
  votes: many(pollvotes),
}));

export const polloptionsrelations = relations(polloptions, ({ one, many }) => ({
  poll: one(polls, {
    fields: [polloptions.pollid],
    references: [polls.id],
  }),
  votes: many(pollvotes),
}));

export const pollvotesrelations = relations(pollvotes, ({ one }) => ({
  poll: one(polls, {
    fields: [pollvotes.pollid],
    references: [polls.id],
  }),
  option: one(polloptions, {
    fields: [pollvotes.optionid],
    references: [polloptions.id],
  }),
}));

// === ARTICLES ===
export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary"),
  content: text("content").notNull(),
  type: text("type").notNull(),
  imageurl: text("imageurl"),
  source: text("source"),
  sourceurl: text("sourceurl"),
  createdat: timestamp("createdat").defaultNow(),
});

// === SCHEMAS ===
export const insertquizresultschema = createInsertSchema(quizresults).omit({ id: true, createdat: true });
export const insertpollvoteschema = createInsertSchema(pollvotes).omit({ id: true });

export type Quiz = typeof quizzes.$inferSelect;
export type Quizquestion = typeof quizquestions.$inferSelect;
export type Quizoption = typeof quizoptions.$inferSelect;
export type Quizresult = typeof quizresults.$inferSelect;
export type Poll = typeof polls.$inferSelect;
export type Polloption = typeof polloptions.$inferSelect;
export type Article = typeof articles.$inferSelect;

export type Quizwithquestions = Quiz & {
  questions: (Quizquestion & { options: Quizoption[] })[];
};

export type Pollwithdetails = Poll & {
  options: (Polloption & { votes: number })[];
  uservotedoptionid?: number;
};
