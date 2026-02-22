import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

// === Quizzes ===
export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  title: text("title"),
  description: text("description"),
  category: text("category"),
  imageurl: text("imageurl"),
  createdat: timestamp("createdat").defaultNow()
});

export const quizquestions = pgTable("quizquestions", {
  id: serial("id").primaryKey(),
  quizid: integer("quizid").references(() => quizzes.id),
  text: text("text")
});

export const quizoptions = pgTable("quizoptions", {
  id: serial("id").primaryKey(),
  questionid: integer("questionid").references(() => quizquestions.id),
  text: text("text"),
  partyaffiliation: text("partyaffiliation")
});

export const quizresults = pgTable("quizresults", {
  id: serial("id").primaryKey(),
  userid: text("userid"),
  quizid: integer("quizid").references(() => quizzes.id),
  matchedparty: text("matchedparty"),
  partyscores: text("partyscores")
});

// === Polls ===
export const polls = pgTable("polls", {
  id: serial("id").primaryKey(),
  question: text("question"),
  description: text("description"),
  createdat: timestamp("createdat").defaultNow()
});

export const polloptions = pgTable("polloptions", {
  id: serial("id").primaryKey(),
  pollid: integer("pollid").references(() => polls.id),
  text: text("text")
});

export const pollvotes = pgTable("pollvotes", {
  id: serial("id").primaryKey(),
  pollid: integer("pollid").references(() => polls.id),
  optionid: integer("optionid").references(() => polloptions.id),
  userid: text("userid")
});

// === Articles ===
export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  title: text("title"),
  summary: text("summary"),
  content: text("content"),
  type: text("type"),
  source: text("source"),
  sourceurl: text("sourceurl"),
  imageurl: text("imageurl"),
  createdat: timestamp("createdat").defaultNow()
});

// === Conversations ===
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userid: text("userid"),
  title: text("title"),
  systemprompt: text("systemprompt"),
  createdat: timestamp("createdat").defaultNow()
});
